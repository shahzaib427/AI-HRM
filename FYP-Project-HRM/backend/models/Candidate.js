const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required']
  },
  location: String,
  currentCompany: String,
  currentPosition: String,
  totalExperience: {
    years: Number,
    months: Number
  },
  currentSalary: Number,
  expectedSalary: Number,
  noticePeriod: {
    type: String,
    enum: ['Immediate', '15 days', '30 days', '60 days', '90 days', 'More than 90 days']
  },
  resume: {
    url: String,
    filename: String,
    uploadedAt: Date
  },
  coverLetter: String,
  status: {
    type: String,
    enum: ['Applied', 'Under Review', 'Shortlisted', 'Interview Scheduled', 
           'Interviewed', 'Rejected', 'Offer Sent', 'Offer Accepted', 'Hired'],
    default: 'Applied'
  },
  interviewScheduled: {
    date: Date,
    time: String,
    interviewer: String,
    interviewType: {
      type: String,
      enum: ['Phone', 'Video', 'In-person']
    },
    meetingLink: String,
    notes: String
  },
  interviewHistory: [{
    round: Number,
    date: Date,
    interviewer: String,
    feedback: String,
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Completed', 'Cancelled']
    }
  }],
  skills: [String],
  education: [{
    degree: String,
    institution: String,
    year: Number,
    grade: String
  }],
  workExperience: [{
    company: String,
    position: String,
    startDate: Date,
    endDate: Date,
    current: Boolean,
    description: String
  }],
  source: {
    type: String,
    enum: ['LinkedIn', 'Indeed', 'Company Website', 'Referral', 'Other']
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  notes: [{
    content: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    isPrivate: {
      type: Boolean,
      default: false
    }
  }],
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastContacted: Date
}, {
  timestamps: true
});

candidateSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

candidateSchema.index({ email: 1, jobId: 1 }, { unique: true });
candidateSchema.index({ status: 1, jobId: 1 });
candidateSchema.index({ 'skills': 'text', 'firstName': 'text', 'lastName': 'text' });

const Candidate = mongoose.model('Candidate', candidateSchema);
module.exports = Candidate;