const User = require('../models/User');
const Leave = require('../models/Leave');

exports.getHRProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -passwordHistory -passwordResetToken')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'HR profile not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching HR profile:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

exports.updateHRProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;

    // Define allowed fields for update
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
      
      // Employment Information
      employeeType: updateData.employeeType,
      customEmployeeType: updateData.customEmployeeType,
      department: updateData.department,
      customDepartment: updateData.customDepartment,
      position: updateData.position,
      customPosition: updateData.customPosition,
      reportingManager: updateData.reportingManager,
      probationPeriod: updateData.probationPeriod,
      customProbationPeriod: updateData.customProbationPeriod,
      
      // HR Specific Fields
      hrSpecialization: updateData.hrSpecialization,
      hrExperience: updateData.hrExperience,
      employeeCountManaged: updateData.employeeCountManaged,
      payrollAccess: updateData.payrollAccess,
      recruitmentAccess: updateData.recruitmentAccess,
      leaveManagementAccess: updateData.leaveManagementAccess,
      contractManagementAccess: updateData.contractManagementAccess,
      hrAllowance: updateData.hrAllowance,
      
      // Emergency Contacts
      emergencyContacts: updateData.emergencyContacts || [],
      
      // Salary Information
      salary: updateData.salary,
      fuelAllowance: updateData.fuelAllowance,
      medicalAllowance: updateData.medicalAllowance,
      specialAllowance: updateData.specialAllowance,
      otherAllowance: updateData.otherAllowance,
      currency: updateData.currency,
      salaryFrequency: updateData.salaryFrequency,
      
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
      certifications: updateData.certifications || [],
      
      // Profile
      profilePicture: updateData.profilePicture,
      
      // Security & Preferences
      twoFactorEnabled: updateData.twoFactorEnabled,
      notificationPreferences: updateData.notificationPreferences || {}
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
      message: 'HR profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating HR profile:', error);
    
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

exports.getHRStats = async (req, res) => {
  try {
    const [
      totalEmployees,
      activeRecruitments,
      pendingLeaves,
      contractsExpiring,
      departmentStats
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ employmentStatus: 'active', role: { $in: ['employee', 'manager'] } }),
      Leave.countDocuments({ status: 'pending' }),
      User.countDocuments({ 
        contractEndDate: { 
          $gte: new Date(),
          $lte: new Date(new Date().setDate(new Date().getDate() + 30))
        }
      }),
      getDepartmentStats()
    ]);

    const stats = {
      totalEmployees,
      activeRecruitments,
      pendingLeaves,
      contractsExpiring,
      totalDepartments: departmentStats.length,
      employeeChange: '+12%',
      leaveChange: '+3',
      recruitmentChange: '-2',
      departmentDistribution: departmentStats
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching HR stats:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// Helper function to get department stats
async function getDepartmentStats() {
  try {
    const departmentStats = await User.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $project: {
          name: '$_id',
          value: '$count',
          _id: 0
        }
      }
    ]);

    const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6366F1'];
    
    return departmentStats.map((dept, index) => ({
      ...dept,
      color: colors[index % colors.length]
    }));
  } catch (error) {
    console.error('Error getting department stats:', error);
    return [];
  }
}