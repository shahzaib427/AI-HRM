const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: ['Engineering', 'Design', 'Product', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations']
  },
  jobType: {
    type: String,
    required: [true, 'Job type is required'],
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote']
  },
  location: {
    type: String,
    required: [true, 'Location is required']
  },
  salaryRange: {
    min: { type: Number, required: [true, 'Minimum salary is required'] },
    max: { type: Number, required: [true, 'Maximum salary is required'] }
  },
  description: {
    type: String,
    required: [true, 'Job description is required']
  },
  requirements: [{
    type: String,
    required: [true, 'At least one requirement is needed']
  }],
  responsibilities: [{
    type: String,
    required: [true, 'At least one responsibility is needed']
  }],
  benefits: [String],
  experienceLevel: {
    type: String,
    enum: ['Entry', 'Mid', 'Senior', 'Lead'],
    default: 'Mid'
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['Draft', 'Open', 'Closed', 'On Hold'],
    default: 'Draft'
  },
  applicantsCount: {
    type: Number,
    default: 0
  },
  viewsCount: {
    type: Number,
    default: 0
  },
  deadline: {
    type: Date,
    required: [true, 'Application deadline is required']
  },
  publishedAt: Date,
  tags: [String],
  skillsRequired: [String]
}, {
  timestamps: true
});

jobSchema.index({ title: 'text', description: 'text', requirements: 'text' });
jobSchema.index({ department: 1, jobType: 1, location: 1, status: 1 });

const Job = mongoose.model('Job', jobSchema);
module.exports = Job;