// models/Contest.js
const mongoose = require('mongoose');
const { platforms } = require('../config/platforms');

const ContestSchema = new mongoose.Schema({
  platformId: {
    type: Number,
    required: true,
    validate: {
      validator: function(v) {
        return Object.values(platforms).some(p => p.id === v);
      },
      message: props => `${props.value} is not a valid platform ID!`
    }
  },
  platform: {
    type: String,
    required: true,
    enum: Object.values(platforms).map(p => p.name)
  },
  contestId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  url: {
    type: String
  },
  youtubeLink: {
    type: String
  },
  calendarEventId: {
    type: String,
    sparse: true  // Allow null/undefined values
  },
  questions: [{
    questionId: { 
      type: String, 
      required: true,
      default: () => `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    },
    title: { type: String, required: true },
    filePath: { type: String },
    s3Key: { type: String },
    answerPath: { type: String },
    answerS3Key: { type: String },
  }],
  videoId: {
    type: String,
    default: null
  },
  videoTitle: {
    type: String,
    default: null
  },
  videoThumbnail: {
    type: String,
    default: null
  },
  channelTitle: {
    type: String,
    default: null
  },
  videoChecked: {
    type: Boolean,
    default: false
  },
  // Add fields for storing multiple videos
  videos: [{
    id: String,
    title: String,
    channelId: String,
    channelTitle: String,
    publishedAt: String,
    thumbnail: String,
    platformExpert: Boolean,
    score: Number,
    fromOfficialPlaylist: Boolean
  }],
  videosChecked: {
    type: Boolean,
    default: false
  },
  videosLastChecked: {
    type: Date,
    default: null
  }
});

// Compound index to ensure uniqueness of contests
ContestSchema.index({ platformId: 1, contestId: 1 }, { unique: true });

module.exports = mongoose.model('Contest', ContestSchema);