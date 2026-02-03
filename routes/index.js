// Location: ./routes/index.js
const express = require("express");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const Story = require("../models/Story");
const Goal = require("../models/Goal");
const AuditLog = require("../models/AuditLog");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ============ CONFIGURATION ============
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000;
const loginAttempts = {};

// ============ HELPER FUNCTIONS ============
const getTodayKey = () => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
};

const getWeekKey = () => {
  const today = new Date();
  const target = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((target - yearStart) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
};

// ============ SECURITY FUNCTIONS ============
const isAccountLocked = (identifier) => {
  const attempts = loginAttempts[identifier];
  if (!attempts) return false;
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    if (Date.now() - attempts.lastAttempt < LOCK_TIME) return true;
    delete loginAttempts[identifier];
    return false;
  }
  return false;
};

const recordFailedAttempt = (identifier) => {
  if (!loginAttempts[identifier]) {
    loginAttempts[identifier] = { count: 0, lastAttempt: Date.now() };
  }
  loginAttempts[identifier].count++;
  loginAttempts[identifier].lastAttempt = Date.now();
};

const resetLoginAttempts = (identifier) => {
  delete loginAttempts[identifier];
};

const getClientIp = (req) => {
  return req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
};

// ============ INPUT SANITIZATION ============
const sanitizeHtml = (text) => {
  if (!text) return '';
  // Remove HTML tags and script content to prevent XSS
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
};

const validateStoryInput = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title must be 200 characters or less')
    .customSanitizer(sanitizeHtml),
  body('content')
    .optional()
    .trim()
    .isLength({ max: 50000 }).withMessage('Content must be 50000 characters or less')
    .customSanitizer(sanitizeHtml)
];

const validatePasswordInput = [
  body('password')
    .trim()
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 1, max: 100 }).withMessage('Invalid password length')
];

const validateGoalInput = [
  body('goal')
    .trim()
    .notEmpty().withMessage('Goal is required')
    .isLength({ max: 5000 }).withMessage('Goal must be 5000 characters or less')
    .customSanitizer(sanitizeHtml)
];

const validateFitnessMessage = [
  body('message')
    .trim()
    .notEmpty().withMessage('Message is required')
    .isLength({ max: 500 }).withMessage('Message must be 500 characters or less')
    .customSanitizer(sanitizeHtml)
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    return res.status(400).render('error', { 
      message: firstError.msg, 
      error: {} 
    });
  }
  next();
};

const logAuditEvent = async (action, status, details, req, severity = 'info') => {
  try {
    await AuditLog.create({
      action,
      status,
      ipAddress: getClientIp(req),
      userAgent: req.get('User-Agent') || 'Unknown',
      details,
      severity
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

const verifyPassword = async (input, stored) => {
  try {
    if (stored && stored.startsWith('$2')) {
      return await bcrypt.compare(input, stored);
    }
    return input === stored;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
};

// ============ MIDDLEWARE ============
const checkAuth = (req, res, next) => {
  if (req.session && req.session.authenticated) return next();
  res.redirect("/login");
};

const checkArchiveAuth = (req, res, next) => {
  if (req.session && req.session.archiveAccess) return next();
  res.redirect("/archive-login");
};

// ============ ROUTES: AUTHENTICATION ============
router.get("/login", (req, res) => {
  if (req.session && req.session.authenticated) return res.redirect("/");
  const isLocked = isAccountLocked(getClientIp(req));
  res.render("login", { title: "Login", error: null, isLocked, csrfToken: req.csrfToken() });
});

router.post("/login", validatePasswordInput, handleValidationErrors, async (req, res) => {
  const { password } = req.body;
  const ip = getClientIp(req);

  try {
    if (isAccountLocked(ip)) {
      await logAuditEvent('login_failed', 'warning', 'Account locked - max attempts', req, 'warning');
      return res.status(429).render("login", {
        title: "Login",
        error: "Too many failed attempts. Try again in 15 minutes.",
        isLocked: true,
        csrfToken: req.csrfToken()
      });
    }

    const correctPassword = process.env.MAIN_PASSWORD || "veeran";
    const match = await verifyPassword(password, correctPassword);

    if (match) {
      resetLoginAttempts(ip);
      req.session.authenticated = true;
      await logAuditEvent('login_success', 'success', 'Main login successful', req);
      req.session.save((err) => {
        if (err) return res.status(500).render("error", { message: "Session error", error: {} });
        res.redirect("/");
      });
    } else {
      recordFailedAttempt(ip);
      const remaining = MAX_LOGIN_ATTEMPTS - loginAttempts[ip].count;
      await logAuditEvent('login_failed', 'failure', `Failed attempt ${loginAttempts[ip].count}/${MAX_LOGIN_ATTEMPTS}`, req, 'warning');
      res.render("login", {
        title: "Login",
        error: `Incorrect password. ${remaining > 0 ? `${remaining} attempts left.` : 'Account locked.'}`,
        isLocked: false,
        csrfToken: req.csrfToken()
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    await logAuditEvent('login_failed', 'failure', `Login error: ${error.message}`, req, 'critical');
    res.status(500).render("error", { message: "Login error", error: {} });
  }
});

router.get("/logout", async (req, res) => {
  await logAuditEvent('logout', 'success', 'User logged out', req);
  req.session.authenticated = false;
  req.session.archiveAccess = false;
  req.session.save(() => res.redirect("/login"));
});

router.get("/archive-login", (req, res) => {
  if (req.session && req.session.authenticated) {
    res.render("archive-login", { title: "Archive Access", error: null, csrfToken: req.csrfToken() });
  } else {
    res.redirect("/login");
  }
});

router.post("/archive-login", validatePasswordInput, handleValidationErrors, async (req, res) => {
  const { password } = req.body;
  const ip = `archive-${getClientIp(req)}`;

  try {
    if (isAccountLocked(ip)) {
      await logAuditEvent('login_failed', 'warning', 'Archive locked - max attempts', req, 'warning');
      return res.status(429).render("archive-login", {
        title: "Archive Access",
        error: "Too many failed attempts. Try again in 15 minutes.",
        csrfToken: req.csrfToken()
      });
    }

    const correctPassword = process.env.ARCHIVE_PASSWORD || "veeran";
    const match = await verifyPassword(password, correctPassword);

    if (match) {
      resetLoginAttempts(ip);
      req.session.archiveAccess = true;
      await logAuditEvent('archive_accessed', 'success', 'Archive accessed', req);
      req.session.save((err) => {
        if (err) return res.status(500).send("Session error");
        res.redirect("/archive");
      });
    } else {
      recordFailedAttempt(ip);
      const remaining = MAX_LOGIN_ATTEMPTS - (loginAttempts[ip]?.count || 0);
      await logAuditEvent('login_failed', 'failure', `Archive attempt ${loginAttempts[ip]?.count}/${MAX_LOGIN_ATTEMPTS}`, req, 'warning');
      res.render("archive-login", {
        title: "Archive Access",
        error: `Incorrect password. ${remaining > 0 ? `${remaining} attempts left.` : 'Access locked.'}`,
        csrfToken: req.csrfToken()
      });
    }
  } catch (error) {
    console.error('Archive login error:', error);
    await logAuditEvent('login_failed', 'failure', `Archive login error: ${error.message}`, req, 'critical');
    res.status(500).render("error", { message: "Archive access error", error: {} });
  }
});

// ============ ROUTES: STORIES ============
router.get("/", checkAuth, async (req, res) => {
  try {
    const formattedDate = getTodayKey();
    const story = await Story.findOne({ formattedDate }).lean();
    res.render("index", {
      title: "Today's Story",
      story: story || null,
      formattedDate,
      saved: req.query.saved === "1",
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Story load error:', error);
    await logAuditEvent('story_view_failed', 'failure', `Error: ${error.message}`, req, 'critical');
    res.status(500).render("error", { message: "Unable to load story", error: {} });
  }
});

router.post("/", checkAuth, validateStoryInput, handleValidationErrors, async (req, res) => {
  try {
    const formattedDate = getTodayKey();
    const { title, content } = req.body;

    await Story.findOneAndUpdate(
      { formattedDate, category: "daily" },
      { formattedDate, title, content, category: "daily" },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await logAuditEvent('story_created', 'success', `Daily story saved for ${formattedDate}`, req);
    res.redirect("/?saved=1");
  } catch (error) {
    console.error('Story save error:', error);
    await logAuditEvent('story_save_failed', 'failure', `Error: ${error.message}`, req, 'critical');
    res.status(500).render("error", { message: "Unable to save story", error: {} });
  }
});

router.get("/archive", checkAuth, checkArchiveAuth, async (req, res) => {
  try {
    const stories = await Story.find().sort({ formattedDate: -1 }).lean();
    const dailyStories = stories.filter(s => s.category === "daily");
    const loveStories = stories.filter(s => s.category === "love");

    await logAuditEvent('archive_viewed', 'success', `${dailyStories.length} daily, ${loveStories.length} love stories`, req);

    res.render("archive", {
      title: "Archive",
      stories,
      dailyStories,
      loveStories,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Archive load error:', error);
    await logAuditEvent('archive_load_failed', 'failure', `Error: ${error.message}`, req, 'critical');
    res.status(500).render("error", { message: "Unable to load archive", error: {} });
  }
});

router.get("/story/:id", checkAuth, checkArchiveAuth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id).lean();
    if (!story) return res.status(404).render("error", { message: "Story not found", error: {} });

    const canEdit = story.formattedDate === getTodayKey();
    await logAuditEvent('story_viewed', 'success', `Story viewed: ${story.title}`, req);

    res.render("story", {
      title: story.title || "Story",
      story,
      canEdit,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Story view error:', error);
    await logAuditEvent('story_view_failed', 'failure', `Error: ${error.message}`, req, 'critical');
    res.status(500).render("error", { message: "Unable to load story", error: {} });
  }
});

router.post("/story/:id", checkAuth, checkArchiveAuth, validateStoryInput, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  try {
    const story = await Story.findById(req.params.id);
    if (!story || story.formattedDate !== getTodayKey()) {
      return res.status(403).json({ error: "Cannot edit old stories" });
    }

    story.title = req.body.title;
    story.content = req.body.content;
    story.mood = req.body.mood || story.mood;
    await story.save();

    await logAuditEvent('story_edited', 'success', `Story edited: ${story.title}`, req);
    res.json({ success: true });
  } catch (error) {
    console.error('Story edit error:', error);
    await logAuditEvent('story_edit_failed', 'failure', `Error: ${error.message}`, req, 'critical');
    res.status(500).json({ error: "Unable to update story" });
  }
});

router.delete("/story/:id", checkAuth, checkArchiveAuth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story || story.formattedDate !== getTodayKey()) {
      return res.status(403).json({ error: "Cannot delete old stories" });
    }

    await Story.deleteOne({ _id: req.params.id });
    await logAuditEvent('story_deleted', 'success', `Story deleted: ${story.title}`, req);
    res.json({ success: true });
  } catch (error) {
    console.error('Story delete error:', error);
    await logAuditEvent('story_delete_failed', 'failure', `Error: ${error.message}`, req, 'critical');
    res.status(500).json({ error: "Unable to delete story" });
  }
});

router.get("/add-love-story", checkAuth, checkArchiveAuth, (req, res) => {
  res.render("love-story-form", { title: "Add Love Story", csrfToken: req.csrfToken() });
});

router.post("/add-love-story", checkAuth, checkArchiveAuth, validateStoryInput, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  try {
    const { title, formattedDate, content } = req.body;

    const storyDate = formattedDate || getTodayKey();
    const newStory = await Story.create({
      formattedDate: storyDate,
      title,
      content,
      category: "love"
    });

    await logAuditEvent('story_created', 'success', `Love story created: ${title}`, req);
    res.json({ success: true, storyId: newStory._id });
  } catch (error) {
    console.error('Love story creation error:', error);
    await logAuditEvent('story_create_failed', 'failure', `Error: ${error.message}`, req, 'critical');
    res.status(500).json({ error: "Unable to create love story" });
  }
});

// ============ ROUTES: DOWNLOADS ============
router.get("/download-all", checkAuth, checkArchiveAuth, async (req, res) => {
  try {
    const stories = await Story.find({ category: "daily" }).sort({ formattedDate: -1 }).lean();
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="all-stories.pdf"');

    doc.pipe(res);
    doc.fontSize(20).text('My Daily Stories', { underline: true });
    doc.moveDown();

    stories.forEach((story) => {
      doc.fontSize(14).text(story.title, { underline: true });
      doc.fontSize(10).text(`Date: ${story.formattedDate}`);
      doc.fontSize(10).text(story.content);
      doc.moveDown();
    });

    await logAuditEvent('all_stories_downloaded', 'success', `Downloaded ${stories.length} daily stories`, req);
    doc.end();
  } catch (error) {
    console.error('Download error:', error);
    await logAuditEvent('download_failed', 'failure', `Error: ${error.message}`, req, 'critical');
    res.status(500).json({ error: "Unable to download stories" });
  }
});

router.get("/download-love-stories", checkAuth, checkArchiveAuth, async (req, res) => {
  try {
    const stories = await Story.find({ category: "love" }).sort({ formattedDate: -1 }).lean();
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="love-stories.pdf"');

    doc.pipe(res);
    doc.fontSize(20).text('💕 My Love Stories 💕', { underline: true });
    doc.moveDown();

    stories.forEach((story) => {
      doc.fontSize(14).text(story.title, { underline: true });
      doc.fontSize(10).text(`Date: ${story.formattedDate}`);
      doc.fontSize(10).text(story.content);
      doc.moveDown();
    });

    await logAuditEvent('love_stories_downloaded', 'success', `Downloaded ${stories.length} love stories`, req);
    doc.end();
  } catch (error) {
    console.error('Download error:', error);
    await logAuditEvent('download_failed', 'failure', `Error: ${error.message}`, req, 'critical');
    res.status(500).json({ error: "Unable to download love stories" });
  }
});

router.get("/story/:id/download", checkAuth, checkArchiveAuth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id).lean();
    if (!story) return res.status(404).json({ error: "Story not found" });

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${story.title}.pdf"`);

    doc.pipe(res);
    doc.fontSize(16).text(story.title, { underline: true });
    doc.fontSize(10).text(`Date: ${story.formattedDate}`);
    doc.moveDown();
    doc.fontSize(12).text(story.content);

    await logAuditEvent('story_downloaded', 'success', `Downloaded: ${story.title}`, req);
    doc.end();
  } catch (error) {
    console.error('Download error:', error);
    await logAuditEvent('download_failed', 'failure', `Error: ${error.message}`, req, 'critical');
    res.status(500).json({ error: "Unable to download story" });
  }
});

// ============ ROUTES: GOALS ============
router.get("/goals", checkAuth, async (req, res) => {
  try {
    const weekKey = getWeekKey();
    let goal = await Goal.findOne({ weekKey }).lean();

    res.render("goals", {
      title: "Weekly Goals",
      goal: goal || null,
      weekKey,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Goals load error:', error);
    res.status(500).render("error", { message: "Unable to load goals", error: {} });
  }
});

router.post("/goals", checkAuth, validateGoalInput, handleValidationErrors, async (req, res) => {
  try {
    const weekKey = getWeekKey();
    const { goal } = req.body;

    await Goal.findOneAndUpdate(
      { weekKey },
      { weekKey, goal },
      { upsert: true, new: true }
    );

    res.redirect("/goals?saved=1");
  } catch (error) {
    console.error('Goals save error:', error);
    res.status(500).render("error", { message: "Unable to save goal", error: {} });
  }
});

// ============ ROUTES: FITNESS ============
router.get("/fitness", checkAuth, (req, res) => {
  res.render("fitness", { title: "Fitness Coach", csrfToken: req.csrfToken() });
});

router.post("/fitness/chat", checkAuth, validateFitnessMessage, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, response: errors.array()[0].msg });
  }

  const { message } = req.body;

  const allowedTopics = /(exercise|workout|fitness|yoga|stretch|cardio|strength|health|wellness|nutrition|diet|calorie|protein|hydration|sleep|run|walk|jog|gym|muscle|weight|training|abs|core|legs|arms|chest|back|shoulder|squat|plank|pushup|pullup|lunge|jumping|aerobic|pilates|meditation|breathing|posture|flexibility|endurance|stamina)/i;
  if (!allowedTopics.test(message)) {
    return res.json({
      success: true,
      response: "I can only answer fitness questions. Ask for workouts or wellness tips."
    });
  }

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    return res.json({
      success: true,
      response: "⚠️ API Key not configured. Please add GEMINI_API_KEY to .env"
    });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: "You are a friendly fitness coach. Answer only fitness questions. Refuse other topics. Use simple English. Respond with 3-5 bullet points. Keep it brief."
    });

    const result = await model.generateContent(message);
    const response = await result.response.text();
    res.json({ success: true, response: response });
  } catch (error) {
    console.error("Fitness AI error:", error);
    res.status(500).json({
      success: false,
      response: "Coach is busy. Error: " + (error.message || "Unknown error")
    });
  }
});

// ============ ROUTES: GOALS HISTORY ============
router.get("/goals-history", checkAuth, async (req, res) => {
  try {
    const goals = await Goal.find().sort({ weekKey: -1 }).lean();
    res.render("goals-history", {
      title: "Goals History",
      goals,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Goals history error:', error);
    res.status(500).render("error", { message: "Unable to load goals history", error: {} });
  }
});

module.exports = router;
