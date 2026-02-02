const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        "login_attempt",
        "login_success",
        "login_failed",
        "account_locked",
        "logout",
        "story_created",
        "story_edited",
        "story_deleted",
        "story_downloaded",
        "all_stories_downloaded",
        "archive_accessed",
        "password_changed",
        "session_expired",
        "suspicious_activity"
      ],
    },
    status: {
      type: String,
      enum: ["success", "failure", "warning"],
      default: "success",
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      default: "",
    },
    details: {
      type: String,
      default: "",
    },
    storyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Story",
      default: null,
    },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "info",
    },
  },
  { timestamps: true }
);

// Index for efficient querying
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ ipAddress: 1, createdAt: -1 });
auditLogSchema.index({ severity: 1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
