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
  }
});

// Compound index to ensure uniqueness of contests
ContestSchema.index({ platformId: 1, contestId: 1 }, { unique: true });

module.exports = mongoose.model('Contest', ContestSchema);