const express = require('express');
const router = express.Router();
const Onboarding = require('../models/Onboarding');
const { protect, authorize } = require('../utils/authMiddleware');

// Get all onboarding candidates
router.get('/', protect, authorize(['hr', 'admin']), async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { candidateName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const candidates = await Onboarding.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Onboarding.countDocuments(query);
    
    res.json({
      success: true,
      data: candidates,
      pagination: { 
        page: parseInt(page), 
        limit: parseInt(limit), 
        total, 
        pages: Math.ceil(total / parseInt(limit)) 
      }
    });
  } catch (error) {
    console.error('Error fetching onboarding candidates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get onboarding statistics
router.get('/stats', protect, authorize(['hr', 'admin']), async (req, res) => {
  try {
    const total = await Onboarding.countDocuments();
    const pending = await Onboarding.countDocuments({ status: 'pending' });
    const inProgress = await Onboarding.countDocuments({ status: 'in-progress' });
    const completed = await Onboarding.countDocuments({ status: 'completed' });
    
    res.json({
      total,
      pending,
      inProgress,
      completed
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single onboarding candidate
router.get('/:id', protect, authorize(['hr', 'admin']), async (req, res) => {
  try {
    const candidate = await Onboarding.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }
    res.json({ success: true, data: candidate });
  } catch (error) {
    console.error('Error fetching candidate:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new onboarding candidate
router.post('/', protect, authorize(['hr', 'admin']), async (req, res) => {
  try {
    const candidate = new Onboarding({
      ...req.body,
      assignedHR: req.user.id,
      assignedHRName: req.user.name,
      status: 'pending',
      progress: 0,
      tasks: [],
      documents: []
    });
    await candidate.save();
    res.status(201).json({ success: true, data: candidate });
  } catch (error) {
    console.error('Error creating candidate:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Update onboarding candidate
router.put('/:id', protect, authorize(['hr', 'admin']), async (req, res) => {
  try {
    const candidate = await Onboarding.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }
    res.json({ success: true, data: candidate });
  } catch (error) {
    console.error('Error updating candidate:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Add task to onboarding
router.post('/:id/tasks', protect, authorize(['hr', 'admin']), async (req, res) => {
  try {
    const candidate = await Onboarding.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }
    
    candidate.tasks.push({
      ...req.body,
      completed: false,
      createdAt: new Date()
    });
    candidate.updatedAt = Date.now();
    
    // Update progress based on completed tasks
    const completedTasks = candidate.tasks.filter(t => t.completed).length;
    candidate.progress = (completedTasks / candidate.tasks.length) * 100;
    
    await candidate.save();
    res.json({ success: true, data: candidate });
  } catch (error) {
    console.error('Error adding task:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Update task status
router.patch('/:id/tasks/:taskId', protect, authorize(['hr', 'admin']), async (req, res) => {
  try {
    const candidate = await Onboarding.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }
    
    const task = candidate.tasks.id(req.params.taskId);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    
    task.completed = req.body.completed;
    if (req.body.completed) {
      task.completedAt = new Date();
    }
    candidate.updatedAt = Date.now();
    
    // Update progress
    const completedTasks = candidate.tasks.filter(t => t.completed).length;
    candidate.progress = (completedTasks / candidate.tasks.length) * 100;
    
    // Check if all tasks completed
    if (candidate.progress === 100 && candidate.status !== 'completed') {
      candidate.status = 'completed';
      candidate.completedDate = new Date();
    }
    
    await candidate.save();
    res.json({ success: true, data: candidate });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Send offer letter
router.post('/:id/send-offer', protect, authorize(['hr', 'admin']), async (req, res) => {
  try {
    const candidate = await Onboarding.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }
    
    candidate.offerLetterSent = true;
    candidate.status = 'in-progress';
    await candidate.save();
    
    // Here you would integrate email sending service
    // For now, just return success
    res.json({ success: true, message: 'Offer letter sent successfully' });
  } catch (error) {
    console.error('Error sending offer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete onboarding candidate
router.delete('/:id', protect, authorize(['hr', 'admin']), async (req, res) => {
  try {
    const candidate = await Onboarding.findByIdAndDelete(req.params.id);
    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }
    res.json({ success: true, message: 'Candidate deleted successfully' });
  } catch (error) {
    console.error('Error deleting candidate:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;