const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const NotificationService = require('../services/notificationService');

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

// UPDATE MY PROFILE - WITH NOTIFICATION
exports.updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;

    // Get old user data before update
    const oldUser = await User.findById(userId).select('name department position phone email');

    const allowedFields = {
      name: updateData.name,
      fatherName: updateData.fatherName,
      gender: updateData.gender,
      dateOfBirth: updateData.dateOfBirth,
      bloodGroup: updateData.bloodGroup,
      maritalStatus: updateData.maritalStatus,
      idCardNumber: updateData.idCardNumber,
      idCardIssueDate: updateData.idCardIssueDate,
      idCardExpiryDate: updateData.idCardExpiryDate,
      phone: updateData.phone,
      alternatePhone: updateData.alternatePhone,
      presentAddress: updateData.presentAddress,
      permanentAddress: updateData.permanentAddress,
      city: updateData.city,
      state: updateData.state,
      country: updateData.country,
      postalCode: updateData.postalCode,
      emergencyContacts: updateData.emergencyContacts || [],
      bankName: updateData.bankName,
      bankAccountNumber: updateData.bankAccountNumber,
      bankAccountTitle: updateData.bankAccountTitle,
      bankBranchCode: updateData.bankBranchCode,
      ibanNumber: updateData.ibanNumber,
      qualifications: updateData.qualifications,
      experiences: updateData.experiences || [],
      skills: updateData.skills || [],
      previousExperience: updateData.previousExperience,
      profilePicture: updateData.profilePicture
    };

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

    // ✅ SEND NOTIFICATION to HR/Admin about profile update
    const io = req.app.get('io');
    const notificationService = new NotificationService(io);
    
    const hrUsers = await User.find({ role: { $in: ['hr', 'admin'] } });
    
    // Check what changed
    let changeDescription = '';
    if (oldUser.phone !== updateData.phone) {
      changeDescription = `Phone number changed from ${oldUser.phone} to ${updateData.phone}`;
    } else if (oldUser.name !== updateData.name) {
      changeDescription = `Name changed from ${oldUser.name} to ${updateData.name}`;
    } else {
      changeDescription = 'Profile information updated';
    }
    
    for (const hr of hrUsers) {
      await notificationService.createNotification({
        recipient: {
          userId: hr._id,
          userModel: 'User',
          role: hr.role
        },
        type: 'employee_updated',
        title: 'Employee Profile Updated 📝',
        message: `${updatedUser.name} has updated their profile. ${changeDescription}`,
        data: {
          userId: userId,
          userName: updatedUser.name,
          employeeId: updatedUser.employeeId,
          changes: changeDescription
        },
        priority: 'medium'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully with notification to HR',
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
    
    // ✅ SEND NOTIFICATION to HR/Admin about new employee (without account creation)
    const io = req.app.get('io');
    const notificationService = new NotificationService(io);
    
    const hrUsers = await User.find({ role: { $in: ['hr', 'admin'] } });
    for (const hr of hrUsers) {
      await notificationService.createNotification({
        recipient: {
          userId: hr._id,
          userModel: 'User',
          role: hr.role
        },
        type: 'employee_onboarded',
        title: 'New Employee Added 👤',
        message: `${newEmployee.name} has been added as ${newEmployee.position || 'Employee'}`,
        data: {
          employeeId: newEmployee._id,
          employeeName: newEmployee.name,
          position: newEmployee.position,
          department: newEmployee.department
        },
        priority: 'high'
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Employee created successfully with notification',
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
    const oldEmployee = await User.findById(req.params.id).select('name department position');
    
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

    // ✅ SEND NOTIFICATION to HR/Admin about employee update
    const io = req.app.get('io');
    const notificationService = new NotificationService(io);
    
    const hrUsers = await User.find({ role: { $in: ['hr', 'admin'] } });
    for (const hr of hrUsers) {
      await notificationService.createNotification({
        recipient: {
          userId: hr._id,
          userModel: 'User',
          role: hr.role
        },
        type: 'employee_updated',
        title: 'Employee Information Updated 📝',
        message: `${updatedEmployee.name}'s profile has been updated by ${req.user.name}`,
        data: {
          employeeId: updatedEmployee._id,
          employeeName: updatedEmployee.name,
          updatedBy: req.user.name
        },
        priority: 'medium'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Employee updated successfully with notification',
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
    
    // ✅ SEND NOTIFICATION to HR/Admin about employee deletion
    const io = req.app.get('io');
    const notificationService = new NotificationService(io);
    
    const hrUsers = await User.find({ role: { $in: ['hr', 'admin'] } });
    for (const hr of hrUsers) {
      await notificationService.createNotification({
        recipient: {
          userId: hr._id,
          userModel: 'User',
          role: hr.role
        },
        type: 'employee_deleted',
        title: 'Employee Deleted ❌',
        message: `${employee.name} (${employee.employeeId}) has been removed from the system by ${req.user.name}`,
        data: {
          employeeId: employee._id,
          employeeName: employee.name,
          employeeCode: employee.employeeId,
          deletedBy: req.user.name
        },
        priority: 'high'
      });
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Employee deleted successfully with notification' 
    });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// CREATE EMPLOYEE WITH ACCOUNT - WITH NOTIFICATION
exports.createEmployeeWithAccount = async (req, res) => {
  try {
    console.log('🚀 createEmployeeWithAccount called');
    console.log('Request body:', req.body);

    const { 
      userAccount, 
      employeeProfile 
    } = req.body;

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

    const existingUser = await User.findOne({ 
      $or: [{ email }, { username: username || email.split('@')[0] }] 
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email or username already exists'
      });
    }

    const employeeId = await generateEmployeeId();
    console.log('✅ Generated employee ID:', employeeId);

    const user = await User.create({
      employeeId,
      name: userAccount.name,
      username: username || email.split('@')[0],
      email: email.toLowerCase(),
      password: password,
      role: role || 'employee',
      
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
      
      employeeType: employeeProfile.employeeType,
      department: employeeProfile.department,
      position: employeeProfile.position,
      joiningDate: employeeProfile.joiningDate,
      probationPeriod: employeeProfile.probationPeriod,
      reportingManager: employeeProfile.reportingManager,
      systemRole: employeeProfile.role || employeeProfile.systemRole,
      isActive: employeeProfile.isActive !== false,
      hasSystemAccess: employeeProfile.hasSystemAccess !== false,
      
      presentAddress: employeeProfile.presentAddress,
      permanentAddress: employeeProfile.permanentAddress,
      city: employeeProfile.city,
      state: employeeProfile.state,
      country: employeeProfile.country,
      postalCode: employeeProfile.postalCode,
      
      emergencyContacts: employeeProfile.emergencyContacts || [],
      
      salary: employeeProfile.salary || 0,
      fuelAllowance: employeeProfile.fuelAllowance || 0,
      medicalAllowance: employeeProfile.medicalAllowance || 0,
      specialAllowance: employeeProfile.specialAllowance || 0,
      otherAllowance: employeeProfile.otherAllowance || 0,
      currency: employeeProfile.currency || 'PKR',
      salaryFrequency: employeeProfile.salaryFrequency || 'monthly',
      
      bankName: employeeProfile.bankName,
      bankAccountNumber: employeeProfile.bankAccountNumber,
      bankAccountTitle: employeeProfile.bankAccountTitle,
      bankBranchCode: employeeProfile.bankBranchCode,
      ibanNumber: employeeProfile.ibanNumber,
      
      qualifications: employeeProfile.qualifications,
      previousExperience: employeeProfile.previousExperience || 0,
      experiences: employeeProfile.experiences || [],
      skills: employeeProfile.skills || [],
      
      profilePicture: employeeProfile.profilePicture,
      
      temporaryPassword: true,
      passwordChanged: false
    });

    console.log('✅ User created successfully:', user.employeeId);

    // ✅ SEND NOTIFICATION to HR/Admin about new employee onboarded
    const io = req.app.get('io');
    const notificationService = new NotificationService(io);
    
    const hrUsers = await User.find({ role: { $in: ['hr', 'admin'] } });
    for (const hr of hrUsers) {
      await notificationService.createNotification({
        recipient: {
          userId: hr._id,
          userModel: 'User',
          role: hr.role
        },
        type: 'employee_onboarded',
        title: 'New Employee Onboarded 🎉',
        message: `${user.name} has joined as ${user.position || 'Employee'} in ${user.department || 'General'} department`,
        data: {
          employeeId: user._id,
          employeeName: user.name,
          employeeCode: user.employeeId,
          position: user.position,
          department: user.department,
          email: user.email
        },
        priority: 'high'
      });
    }

    // Send welcome email
    let emailSent = false;
    try {
      const authController = require('./authController');
      
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
        
        authController.sendWelcomeEmail(mockReq, mockRes);
      });
      
    } catch (emailError) {
      console.warn('⚠️ Email sending error:', emailError.message);
    }

    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.passwordHistory;

    res.status(201).json({
      success: true,
      message: 'Employee created successfully with notifications sent',
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
    return `EMP${Date.now().toString().slice(-6)}`;
  }
}

// UPLOAD PROFILE PICTURE - WITH NOTIFICATION
exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const profilePictureUrl = `/uploads/profile-pictures/${req.file.filename}`;
    
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

    // ✅ SEND NOTIFICATION to HR/Admin about profile picture update
    const io = req.app.get('io');
    const notificationService = new NotificationService(io);
    
    const hrUsers = await User.find({ role: { $in: ['hr', 'admin'] } });
    for (const hr of hrUsers) {
      await notificationService.createNotification({
        recipient: {
          userId: hr._id,
          userModel: 'User',
          role: hr.role
        },
        type: 'employee_updated',
        title: 'Profile Picture Updated 🖼️',
        message: `${user.name} has updated their profile picture`,
        data: {
          userId: user._id,
          userName: user.name,
          employeeId: user.employeeId
        },
        priority: 'low'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile picture uploaded successfully with notification',
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

    if (user.profilePicture) {
      const filePath = path.join(__dirname, '..', user.profilePicture);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

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