const Contact = require('../models/Contact');
const User = require('../models/User');

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
const submitContactForm = async (req, res) => {
  try {
    const { fullName, email, companyName, phone, message } = req.body;

    // Validate required fields
    if (!fullName || !email) {
      return res.status(400).json({
        success: false,
        error: 'Please provide full name and email address'
      });
    }

    // Validate email format
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address'
      });
    }

    // Create new contact submission
    const contact = await Contact.create({
      fullName,
      email,
      companyName: companyName || '',
      phone: phone || '',
      message: message || '',
      status: 'pending',
      isRead: false
    });

    // Optional: Send email notification to admin/HR
    // await sendContactNotificationEmail(contact);

    res.status(201).json({
      success: true,
      message: 'Thank you! Your request has been submitted successfully.',
      data: {
        id: contact._id,
        fullName: contact.fullName,
        email: contact.email,
        createdAt: contact.createdAt
      }
    });
  } catch (error) {
    console.error('Contact form submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit your request. Please try again later.'
    });
  }
};

// @desc    Get all contact submissions (Admin/HR only)
// @route   GET /api/contact
// @access  Private (Admin, HR)
const getContactSubmissions = async (req, res) => {
  try {
    const { status, page = 1, limit = 10, isRead } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (isRead !== undefined) query.isRead = isRead === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const submissions = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('assignedTo', 'name email role')
      .populate('notes.addedBy', 'name email role');

    const total = await Contact.countDocuments(query);

    res.status(200).json({
      success: true,
      data: submissions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get contact submissions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contact submissions'
    });
  }
};

// @desc    Get single contact submission
// @route   GET /api/contact/:id
// @access  Private (Admin, HR)
const getContactSubmission = async (req, res) => {
  try {
    const submission = await Contact.findById(req.params.id)
      .populate('assignedTo', 'name email role')
      .populate('notes.addedBy', 'name email role');

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Contact submission not found'
      });
    }

    // Mark as read when viewed
    if (!submission.isRead) {
      submission.isRead = true;
      await submission.save();
    }

    res.status(200).json({
      success: true,
      data: submission
    });
  } catch (error) {
    console.error('Get contact submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contact submission'
    });
  }
};

// @desc    Update contact submission status
// @route   PUT /api/contact/:id/status
// @access  Private (Admin, HR)
const updateContactStatus = async (req, res) => {
  try {
    const { status, assignedTo } = req.body;
    
    const submission = await Contact.findById(req.params.id);
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Contact submission not found'
      });
    }

    if (status) submission.status = status;
    if (assignedTo) submission.assignedTo = assignedTo;
    
    await submission.save();

    res.status(200).json({
      success: true,
      message: 'Contact submission updated successfully',
      data: submission
    });
  } catch (error) {
    console.error('Update contact status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update contact submission'
    });
  }
};

// @desc    Add note to contact submission
// @route   POST /api/contact/:id/notes
// @access  Private (Admin, HR)
const addContactNote = async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Note text is required'
      });
    }

    const submission = await Contact.findById(req.params.id);
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Contact submission not found'
      });
    }

    submission.notes.push({
      text,
      addedBy: req.user._id,
      addedAt: new Date()
    });
    
    await submission.save();

    res.status(200).json({
      success: true,
      message: 'Note added successfully',
      data: submission.notes[submission.notes.length - 1]
    });
  } catch (error) {
    console.error('Add contact note error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add note'
    });
  }
};

// @desc    Delete contact submission
// @route   DELETE /api/contact/:id
// @access  Private (Admin only)
const deleteContactSubmission = async (req, res) => {
  try {
    const submission = await Contact.findById(req.params.id);
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Contact submission not found'
      });
    }

    await submission.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Contact submission deleted successfully'
    });
  } catch (error) {
    console.error('Delete contact submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete contact submission'
    });
  }
};

// @desc    Get contact statistics
// @route   GET /api/contact/stats/summary
// @access  Private (Admin, HR)
const getContactStats = async (req, res) => {
  try {
    const total = await Contact.countDocuments();
    const pending = await Contact.countDocuments({ status: 'pending' });
    const contacted = await Contact.countDocuments({ status: 'contacted' });
    const resolved = await Contact.countDocuments({ status: 'resolved' });
    const unread = await Contact.countDocuments({ isRead: false });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySubmissions = await Contact.countDocuments({
      createdAt: { $gte: today }
    });

    res.status(200).json({
      success: true,
      data: {
        total,
        pending,
        contacted,
        resolved,
        unread,
        todaySubmissions
      }
    });
  } catch (error) {
    console.error('Get contact stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contact statistics'
    });
  }
};

module.exports = {
  submitContactForm,
  getContactSubmissions,
  getContactSubmission,
  updateContactStatus,
  addContactNote,
  deleteContactSubmission,
  getContactStats
};