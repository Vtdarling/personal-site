// Location: ./server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const session = require("express-session");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const csrf = require("csurf");
const morgan = require("morgan");
const Sentry = require("@sentry/node");
const mongoSanitize = require("./middleware/mongo-sanitize-express5");
const { body, validationResult } = require("express-validator");
const indexRoutes = require("./routes/index");

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// ============ TRUST PROXY (FOR RENDER & REVERSE PROXIES) ============
app.set('trust proxy', 1);

// ============ SENTRY ERROR MONITORING ============
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: isProduction ? 0.1 : 1.0,
  });
  app.use(Sentry.Handlers.requestHandler());
}

// ============ HTTPS REDIRECT (PRODUCTION) ============
if (isProduction) {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(301, `https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// ============ CORS CONFIGURATION ============
const cors = require('cors');
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

// ============ REQUEST LOGGING ============
app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms'));

// ============ SECURITY: HELMET ============
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true
}));

// ============ RATE LIMITING ============
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per IP
  message: "Too many login attempts. Please try again after 15 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !isProduction && req.hostname === 'localhost',
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/login", loginLimiter);
app.use("/archive-login", loginLimiter);
app.use(generalLimiter);

// ============ VIEW ENGINE ============
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ============ MIDDLEWARE ============
app.use(bodyParser.urlencoded({ extended: false, limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, "public")));

// ============ SECURITY: INPUT SANITIZATION ============
// Protect against MongoDB injection attacks
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Sanitized request from ${req.ip}: ${key}`);
  }
}));

// ============ SESSION MIDDLEWARE ============
app.use(session({
  secret: process.env.SESSION_SECRET || "veeran-secret-key-2026-change-in-production",
  resave: false,
  saveUninitialized: false,
  name: 'sessionId',
  cookie: { 
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict'
  }
}));

// ============ CSRF PROTECTION ============
app.use(csrf({ cookie: false }));

// Pass CSRF token to all views
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

// ============ ROUTES ============
app.use("/", indexRoutes);

// ============ CSRF ERROR HANDLER ============
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    res.status(403).render('error', { 
      title: 'CSRF Error',
      message: 'Invalid form submission. Please try again.',
      error: isProduction ? {} : err 
    });
  } else {
    next(err);
  }
});

// ============ SENTRY ERROR HANDLER ============
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

// ============ GLOBAL ERROR HANDLER ============
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (isProduction) {
    return res.status(500).render('error', { 
      title: 'Error',
      message: 'An error occurred. Please try again later.',
      error: {}
    });
  }
  
  res.status(500).render('error', { 
    title: 'Error',
    message: err.message,
    error: err
  });
});

// ============ MONGODB CONNECTION ============
const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/fitnessDB";
const port = process.env.PORT || 3000;

mongoose
  .connect(mongoUri)
  .then(() => {
    app.listen(port, () => {
      console.log(`🔒 Server running on http://localhost:${port}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🛡️  Security features enabled: HTTPS redirect, CORS, CSRF, rate limiting`);
    });
  })
  .catch((error) => {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  });