const mongoose = require("mongoose");

const goalSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["daily", "weekly"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Completed"],
      default: "Pending",
      index: true,
    },
    dateKey: {
      type: String,
      index: true,
    },
    weekKey: {
      type: String,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

goalSchema.index({ type: 1, dateKey: 1 });
goalSchema.index({ type: 1, weekKey: 1 });

module.exports = mongoose.model("Goal", goalSchema);
