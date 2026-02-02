const mongoose = require("mongoose");

const storySchema = new mongoose.Schema(
  {
    formattedDate: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: "",
    },
    content: {
      type: String,
      trim: true,
      default: "",
    },
    mood: {
      type: String,
      trim: true,
      default: "Reflective",
    },
    category: {
      type: String,
      enum: ["daily", "love"],
      default: "daily",
    },
  },
  { timestamps: true }
);

// Create compound unique index for daily stories only
storySchema.index({ formattedDate: 1, category: 1 }, { unique: true, partialFilterExpression: { category: "daily" } });

module.exports = mongoose.model("Story", storySchema);
