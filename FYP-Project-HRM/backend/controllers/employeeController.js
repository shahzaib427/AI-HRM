const User = require('../models/User');
const fs = require('fs');
const path = require('path');

exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -passwordHistory -passwordResetToken')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

exports.updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;

    // Define allowed fields for employee to update
    const allowedFields = {
      // Personal Information
      name: updateData.name,
      fatherName: updateData.fatherName,
      gender: updateData.gender,
      dateOfBirth: updateData.dateOfBirth,
      bloodGroup: updateData.bloodGroup,
      maritalStatus: updateData.maritalStatus,
      idCardNumber: updateData.idCardNumber,
      idCardIssueDate: updateData.idCardIssueDate,
      idCardExpiryDate: updateData.idCardExpiryDate,
      
      // Contact Information
      phone: updateData.phone,
      alternatePhone: updateData.alternatePhone,
      
      // Address Information
      presentAddress: updateData.presentAddress,
      permanentAddress: updateData.permanentAddress,
      city: updateData.city,
      state: updateData.state,
      country: updateData.country,
      postalCode: updateData.postalCode,
      
      // Emergency Contacts
      emergencyContacts: updateData.emergencyContacts || [],
      
      // Bank Information
      bankName: updateData.bankName,
      bankAccountNumber: updateData.bankAccountNumber,
      bankAccountTitle: updateData.bankAccountTitle,
      bankBranchCode: updateData.bankBranchCode,
      ibanNumber: updateData.ibanNumber,
      
      // Qualifications & Skills
      qualifications: updateData.qualifications,
      experiences: updateData.experiences || [],
      skills: updateData.skills || [],
      previousExperience: updateData.previousExperience,
      
      // Profile
      profilePicture: updateData.profilePicture
    };

    // Remove undefined values
    Object.keys(allowedFields).forEach(key => {
      if (allowedFields[key] === undefined) {
        delete allowedFields[key];
      }
    });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      allowedFields,
      { 
        new: true, 
        runValidators: true,
        context: 'query'
      }
    ).select('-password -passwordHistory');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        error: `${field} already exists`,
        field: field
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('name employeeId department position leaveBalance')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const dashboardData = {
      employeeInfo: {
        name: user.name,
        employeeId: user.employeeId,
        department: user.department,
        position: user.position
      },
      leaveBalance: user.leaveBalance || {
        annual: 12,
        casual: 7,
        sick: 10
      },
      upcomingEvents: [
        { title: 'Team Meeting', date: new Date().toISOString().split('T')[0], type: 'meeting' }
      ]
    };

    res.status(200).json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

exports.getLeaveBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('leaveBalance')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user.leaveBalance || {
        annual: 12,
        casual: 7,
        sick: 10,
        earned: 5,
        maternity: 180,
        paternity: 15
      }
    });
  } catch (error) {
    console.error('Error fetching leave balance:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

exports.getAllEmployees = async (req, res) => {
  try {
    const { page = 1, limit = 10, department, role } = req.query;
    const query = { role: { $ne: 'admin' } };
    
    if (department) query.department = department;
    if (role && role !== 'all') query.role = role;

    const employees = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })
      .lean();

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: employees.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: employees
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await User.findById(req.params.id)
      .select('-password -passwordHistory')
      .lean();

    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        error: 'Employee not found' 
      });
    }

    res.status(200).json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.createEmployee = async (req, res) => {
  try {
    const newEmployee = new User({
      ...req.body,
      role: req.body.role || 'employee'
    });

    await newEmployee.save();
    
    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: newEmployee
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const updatedEmployee = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { 
        new: true, 
        runValidators: true,
        context: 'query'
      }
    ).select('-password -passwordHistory');

    if (!updatedEmployee) {
      return res.status(404).json({ 
        success: false, 
        error: 'Employee not found' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      data: updatedEmployee
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        error: 'Employee not found' 
      });
    }

    await User.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ 
      success: true, 
      message: 'Employee deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
// Add this to employeeController.js
exports.createEmployeeWithAccount = async (req, res) => {
  try {
    console.log('🚀 createEmployeeWithAccount called');
    console.log('Request body:', req.body);

    const { 
      userAccount, 
      employeeProfile 
    } = req.body;

    // Validate required data
    if (!userAccount || !employeeProfile) {
      return res.status(400).json({
        success: false,
        error: 'User account and employee profile data are required'
      });
    }

    const { name, username, email, password, role } = userAccount;
    
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username: username || email.split('@')[0] }] 
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email or username already exists'
      });
    }

    // Generate employee ID
    const employeeId = await generateEmployeeId();
    console.log('✅ Generated employee ID:', employeeId);

    // Create user account
    const user = await User.create({
      employeeId,
      name: userAccount.name,
      username: username || email.split('@')[0],
      email: email.toLowerCase(),
      password: password,
      role: role || 'employee',
      
      // Employee profile data
      fatherName: employeeProfile.fatherName,
      phone: employeeProfile.phone,
      alternatePhone: employeeProfile.alternatePhone,
      idCardNumber: employeeProfile.idCardNumber,
      idCardIssueDate: employeeProfile.idCardIssueDate,
      idCardExpiryDate: employeeProfile.idCardExpiryDate,
      dateOfBirth: employeeProfile.dateOfBirth,
      gender: employeeProfile.gender,
      bloodGroup: employeeProfile.bloodGroup,
      maritalStatus: employeeProfile.maritalStatus,
      
      // Employment info
      employeeType: employeeProfile.employeeType,
      department: employeeProfile.department,
      position: employeeProfile.position,
      joiningDate: employeeProfile.joiningDate,
      probationPeriod: employeeProfile.probationPeriod,
      reportingManager: employeeProfile.reportingManager,
      systemRole: employeeProfile.role || employeeProfile.systemRole,
      isActive: employeeProfile.isActive !== false,
      hasSystemAccess: employeeProfile.hasSystemAccess !== false,
      
      // Address
      presentAddress: employeeProfile.presentAddress,
      permanentAddress: employeeProfile.permanentAddress,
      city: employeeProfile.city,
      state: employeeProfile.state,
      country: employeeProfile.country,
      postalCode: employeeProfile.postalCode,
      
      // Emergency contacts
      emergencyContacts: employeeProfile.emergencyContacts || [],
      
      // Salary
      salary: employeeProfile.salary || 0,
      fuelAllowance: employeeProfile.fuelAllowance || 0,
      medicalAllowance: employeeProfile.medicalAllowance || 0,
      specialAllowance: employeeProfile.specialAllowance || 0,
      otherAllowance: employeeProfile.otherAllowance || 0,
      currency: employeeProfile.currency || 'PKR',
      salaryFrequency: employeeProfile.salaryFrequency || 'monthly',
      
      // Bank
      bankName: employeeProfile.bankName,
      bankAccountNumber: employeeProfile.bankAccountNumber,
      bankAccountTitle: employeeProfile.bankAccountTitle,
      bankBranchCode: employeeProfile.bankBranchCode,
      ibanNumber: employeeProfile.ibanNumber,
      
      // Qualifications & Skills
      qualifications: employeeProfile.qualifications,
      previousExperience: employeeProfile.previousExperience || 0,
      experiences: employeeProfile.experiences || [],
      skills: employeeProfile.skills || [],
      
      // Profile picture
      profilePicture: employeeProfile.profilePicture,
      
      // System flags
      temporaryPassword: true,
      passwordChanged: false
    });

    console.log('✅ User created successfully:', user.employeeId);

    // Send welcome email
    let emailSent = false;
    try {
      const authController = require('./authController');
      
      // Call the existing sendWelcomeEmail function
      emailSent = await new Promise((resolve) => {
        const mockRes = {
          status: () => ({
            json: (data) => {
              console.log('Email sending response:', data);
              resolve(data.success === true);
            }
          })
        };
        
        const mockReq = {
          body: {
            email: user.email,
            name: user.name,
            employeeId: user.employeeId,
            temporaryPassword: password
          }
        };
        
        // Call the sendWelcomeEmail function
        authController.sendWelcomeEmail(mockReq, mockRes);
      });
      
    } catch (emailError) {
      console.warn('⚠️ Email sending error:', emailError.message);
    }

    // Prepare response without sensitive data
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.passwordHistory;

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      employeeId: user.employeeId,
      emailSent: emailSent,
      data: {
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        department: user.department,
        position: user.position
      }
    });

  } catch (error) {
    console.error('❌ createEmployeeWithAccount error:', error);
    
    // Handle specific errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        error: `${field} already exists`,
        field: field
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error creating employee',
      message: error.message
    });
  }
};

// Helper function to generate employee ID
async function generateEmployeeId() {
  try {
    // Get the latest employee
    const latestEmployee = await User.findOne({ 
      employeeId: { $regex: /^EMP\d+$/ } 
    }).sort({ createdAt: -1 });
    
    let nextNumber = 1;
    
    if (latestEmployee && latestEmployee.employeeId) {
      const match = latestEmployee.employeeId.match(/EMP(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
    
    return `EMP${nextNumber.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating employee ID:', error);
    // Fallback to timestamp-based ID
    return `EMP${Date.now().toString().slice(-6)}`;
  }
}
exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Get the file URL
    const profilePictureUrl = `/uploads/profile-pictures/${req.file.filename}`;
    
    // Update user's profile picture in database
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePicture: profilePictureUrl },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: {
        profilePicture: profilePictureUrl
      }
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload profile picture'
    });
  }
};

// Delete Profile Picture
exports.deleteProfilePicture = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Delete the file if it exists
    if (user.profilePicture) {
      const filePath = path.join(__dirname, '..', user.profilePicture);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Remove profile picture reference from database
    user.profilePicture = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture removed successfully'
    });
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete profile picture'
    });
  }
};

// 👇 ADD THIS EXACTLY AT THE BOTTOM (CRITICAL!)
module.exports = {
  getMyProfile: exports.getMyProfile,
  updateMyProfile: exports.updateMyProfile,
  getDashboard: exports.getDashboard,
  getLeaveBalance: exports.getLeaveBalance,
  getAllEmployees: exports.getAllEmployees,
  getEmployeeById: exports.getEmployeeById,
  createEmployee: exports.createEmployee,
  updateEmployee: exports.updateEmployee,
  deleteEmployee: exports.deleteEmployee,
  createEmployeeWithAccount: exports.createEmployeeWithAccount,
   uploadProfilePicture: exports.uploadProfilePicture, 
  deleteProfilePicture: exports.deleteProfilePicture 

};