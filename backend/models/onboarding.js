const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  dueDate: Date,
  completed: { type: Boolean, default: false },
  completedAt: Date,
  assignedTo: String
});

const documentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['cv', 'cnic', 'degree', 'experience', 'other'] },
  fileUrl: String,
  uploaded: { type: Boolean, default: false },
  uploadDate: Date,
  verified: { type: Boolean, default: false }
});

const onboardingSchema = new mongoose.Schema({
  candidateName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  position: { type: String, required: true },
  department: { type: String, required: true },
  joiningDate: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'in-progress', 'completed', 'rejected', 'on-hold'],
    default: 'pending'
  },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  tasks: [taskSchema],
  documents: [documentSchema],
  assignedHR: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedHRName: String,
  offerLetterSent: { type: Boolean, default: false },
  offerLetterAccepted: { type: Boolean, default: false },
  onboardingDate: { type: Date, default: Date.now },
  completedDate: Date,
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Onboarding', onboardingSchema);