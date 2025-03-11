const mongoose = require('mongoose');

const userPerformanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  totalQuestions: {
    type: Number,
    required: true,
    min: 0
  },
  correctAnswers: {
    type: Number,
    required: true,
    min: 0
  },
  incorrectAnswers: {
    type: Number,
    required: true,
    min: 0
  },
  timeTaken: {
    type: Number, // in seconds
    required: true,
    min: 0
  },
  completedAt: {
    type: Date,
    default: Date.now
  },
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    selectedOption: {
      type: String,
      required: true
    },
    isCorrect: {
      type: Boolean,
      required: true
    },
    timeSpent: {
      type: Number, // in seconds
      required: true,
      min: 0
    }
  }],
  category: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for percentage score
userPerformanceSchema.virtual('percentageScore').get(function() {
  return (this.correctAnswers / this.totalQuestions) * 100;
});

// Index for efficient queries
userPerformanceSchema.index({ user: 1, completedAt: -1 });
userPerformanceSchema.index({ user: 1, category: 1 });
userPerformanceSchema.index({ user: 1, testId: 1 }, { unique: true });

// Pre-save middleware to ensure counts are correct
userPerformanceSchema.pre('save', function(next) {
  if (this.isModified('answers')) {
    this.totalQuestions = this.answers.length;
    this.correctAnswers = this.answers.filter(answer => answer.isCorrect).length;
    this.incorrectAnswers = this.totalQuestions - this.correctAnswers;
    this.score = (this.correctAnswers / this.totalQuestions) * 100;
  }
  next();
});

const UserPerformance = mongoose.model('UserPerformance', userPerformanceSchema);

module.exports = UserPerformance; 