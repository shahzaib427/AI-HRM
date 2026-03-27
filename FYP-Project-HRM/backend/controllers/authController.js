const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

console.log('✅✅✅ authController.js LOADED ✅✅✅');

// Email transporter
const getEmailTransporter = () => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('⚠️ Email credentials not configured in .env file');
      return null;
    }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  } catch (error) {
    console.error('❌ Email transporter creation failed:', error.message);
    return null;
  }
};

// ===== REGISTER =====
exports.register = async (req, res) => {
  try {
    let { fullName, username, email, password, role } = req.body;
    const name = fullName;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ success: false, error: 'Full name, username, email, and password are required' });
    }

    role = role || 'employee';
    if (!['admin', 'hr', 'employee'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email or username already exists' });
    }

    const user = await User.create({
      employeeId: uuidv4(),
      name,
      username,
      email,
      password,
      role
    });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { id: user._id, employeeId: user.employeeId, name, username, email, role },
      token
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error during registration' });
  }
};

// ===== LOGIN =====
// ===== LOGIN ===== (REPLACE your entire login function)
exports.login = async (req, res) => {
  try {
    let { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, error: 'Email and password are required' });

    email = email.toLowerCase().trim();
    const user = await User.findOne({ email }).select('+password');

    if (!user) return res.status(401).json({ success: false, error: 'Invalid email or password' });
    if (!user.isActive) return res.status(403).json({ success: false, error: 'Account is deactivated' });

    // ✅ FIXED: Direct bcrypt.compare instead of user.matchPassword
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, error: 'Invalid email or password' });

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

    // ✅ Save to localStorage on frontend
    res.json({
      success: true,
      token,
      user: { 
        id: user._id, 
        employeeId: user.employeeId,
        name: user.name, 
        username: user.username, 
        email: user.email, 
        role: user.role
      }
    });
  } catch (err) {
    console.error('💥 LOGIN ERROR:', err.stack);
    res.status(500).json({ success: false, error: err.message });
  }
};


// ===== FORGOT PASSWORD (Generate new temporary password) =====
exports.forgotPassword = async (req, res) => {
  console.log('🔐 FORGOT PASSWORD ENDPOINT CALLED');
  
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // For security, don't reveal if user exists or not
      return res.status(200).json({
        success: true,
        message: 'If your email exists in our system, you will receive a temporary password'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    // Generate a new temporary password (name-based + numbers)
    const temporaryPassword = generateNameBasedPassword(user.name, user.email);
    
    console.log(`🔑 Generated temp password for ${user.email}: ${temporaryPassword}`);
    
    // Save the new password (will be hashed by pre-save middleware)
    user.password = temporaryPassword;
    user.temporaryPassword = true;
    user.passwordChanged = false;
    user.lastPasswordChange = new Date();
    
    // Reset password expiry to 7 days from now
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);
    user.passwordExpiryDate = expiry;
    
    // Reset login attempts
    user.loginAttempts = 0;
    user.lockUntil = null;
    
    await user.save();
    
    // Send email with the new temporary password
    const emailSent = await sendTemporaryPasswordEmail(
      user.email,
      user.name,
      temporaryPassword
    );
    
    if (!emailSent) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send email. Please try again later.'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'A temporary password has been sent to your email'
    });
    
  } catch (err) {
    console.error('❌ Forgot password error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server error processing request'
    });
  }
};

// ===== GENERATE NAME-BASED PASSWORD =====
function generateNameBasedPassword(name, email) {
  // Extract first name
  const firstName = name.split(' ')[0].toLowerCase();
  
  // Get first 3-4 letters of first name
  const namePart = firstName.slice(0, Math.min(4, firstName.length));
  
  // Get first part of email (before @)
  const emailPart = email.split('@')[0].slice(0, 3).toLowerCase();
  
  // Generate random 4-digit number
  const randomNumbers = Math.floor(1000 + Math.random() * 9000);
  
  // Add a special character
  const specialChars = '!@#$%&*';
  const specialChar = specialChars[Math.floor(Math.random() * specialChars.length)];
  
  // Combine: First letter uppercase, rest lowercase, email part, numbers, special char
  const password = `${namePart.charAt(0).toUpperCase()}${namePart.slice(1)}${emailPart}${randomNumbers}${specialChar}`;
  
  return password;
}

// ===== SEND TEMPORARY PASSWORD EMAIL =====
const sendTemporaryPasswordEmail = async (email, name, temporaryPassword) => {
  try {
    const transporter = getEmailTransporter();
    
    if (!transporter) {
      console.error('❌ Email transporter not available');
      return false;
    }

    await transporter.verify();
    console.log('✅ Email server connection verified');
    
    const mailOptions = {
      from: `"HR System Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Temporary Password - HR System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .password-box { background: white; border: 2px solid #dbeafe; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .password { font-family: monospace; font-size: 20px; letter-spacing: 2px; background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .instructions { background: #ecfdf5; border: 1px solid #10b981; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${name}</strong>,</p>
              
              <p>We received a request to reset your password for the HR System account.</p>
              
              <p>Here is your new temporary password:</p>
              
              <div class="password-box">
                <p><strong>Temporary Password:</strong></p>
                <div class="password">${temporaryPassword}</div>
                <p><small>This password will expire in 7 days</small></p>
              </div>
              
              <div class="instructions">
                <p><strong>📝 How to use this password:</strong></p>
                <ol>
                  <li>Go to the login page: <strong>${process.env.FRONTEND_URL || 'http://localhost:3000'}/login</strong></li>
                  <li>Enter your email: <strong>${email}</strong></li>
                  <li>Enter the temporary password shown above</li>
                  <li>After login, you'll be prompted to change your password</li>
                </ol>
              </div>
              
              <div class="warning">
                <p><strong>⚠️ Important Security Information:</strong></p>
                <ul>
                  <li>This is a temporary password - change it immediately after login</li>
                  <li>Never share your password with anyone</li>
                  <li>This email contains sensitive information</li>
                  <li>If you didn't request this, please contact HR immediately</li>
                </ul>
              </div>
              
              <p><strong>Login URL:</strong> ${process.env.FRONTEND_URL || 'http://localhost:3000'}/login</p>
              
              <p>Best regards,<br>
              <strong>HR System Support Team</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
              <p>If you need assistance, contact your HR department.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Temporary password email sent to ${email}, Message ID: ${info.messageId}`);
    return true;
    
  } catch (error) {
    console.error('❌ Email sending error:', error.message);
    return false;
  }
};

// ===== CHANGE PASSWORD (After login) =====
exports.changePassword = async (req, res) => {
  console.log('🔐 CHANGE PASSWORD ENDPOINT CALLED');
  
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters'
      });
    }
    
    const user = await User.findById(userId).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Verify current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }
    
    // Check if new password was previously used
    const wasPreviouslyUsed = await user.wasPasswordPreviouslyUsed(newPassword);
    if (wasPreviouslyUsed) {
      return res.status(400).json({
        success: false,
        error: 'You cannot use a previously used password'
      });
    }
    
    // Update password
    user.password = newPassword;
    user.temporaryPassword = false;
    user.passwordChanged = true;
    
    await user.save();
    
    // Send password change confirmation email
    await sendPasswordChangeConfirmationEmail(user.email, user.name);
    
    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (err) {
    console.error('❌ Change password error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server error changing password'
    });
  }
};

// ===== SEND PASSWORD CHANGE CONFIRMATION EMAIL =====
const sendPasswordChangeConfirmationEmail = async (email, name) => {
  try {
    const transporter = getEmailTransporter();
    
    if (!transporter) {
      console.error('❌ Email transporter not available');
      return false;
    }

    const mailOptions = {
      from: `"HR System Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Successfully Changed - HR System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Changed Successfully</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${name}</strong>,</p>
              
              <p>Your password has been successfully changed for your HR System account.</p>
              
              <p><strong>Account Details:</strong></p>
              <ul>
                <li>Email: ${email}</li>
                <li>Password Changed: ${new Date().toLocaleString()}</li>
              </ul>
              
              <div class="warning">
                <p><strong>⚠️ Security Alert:</strong></p>
                <ul>
                  <li>If you did not change your password, please contact HR immediately</li>
                  <li>Never share your password with anyone</li>
                  <li>Use a strong, unique password that you don't use elsewhere</li>
                </ul>
              </div>
              
              <p>You can now login with your new password at:</p>
              <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login">
                ${process.env.FRONTEND_URL || 'http://localhost:3000'}/login
              </a></p>
              
              <p>Best regards,<br>
              <strong>HR System Support Team</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Password change confirmation sent to ${email}, Message ID: ${info.messageId}`);
    return true;
    
  } catch (error) {
    console.error('❌ Confirmation email error:', error.message);
    return false;
  }
};

// ===== CHECK IF PASSWORD NEEDS TO BE CHANGED =====
exports.checkPasswordStatus = async (req, res) => {
  console.log('🔐 CHECK PASSWORD STATUS ENDPOINT CALLED');
  
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const needsPasswordChange = user.temporaryPassword || user.isPasswordExpired;
    
    res.status(200).json({
      success: true,
      data: {
        needsPasswordChange,
        isTemporaryPassword: user.temporaryPassword,
        isPasswordExpired: user.isPasswordExpired,
        passwordExpiryDate: user.passwordExpiryDate
      }
    });
    
  } catch (err) {
    console.error('❌ Check password status error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server error checking password status'
    });
  }
};

// ===== SEND WELCOME EMAIL (For new employees) =====
exports.sendWelcomeEmail = async (req, res) => {
  console.log('📧 SEND WELCOME EMAIL ENDPOINT CALLED');
  
  try {
    const { email, name, employeeId, temporaryPassword } = req.body;
    
    if (!email || !name || !temporaryPassword) {
      return res.status(400).json({
        success: false,
        error: 'Email, name, and temporary password are required'
      });
    }
    
    const transporter = getEmailTransporter();
    
    if (!transporter) {
      return res.status(500).json({
        success: false,
        error: 'Email service not configured'
      });
    }
    
    await transporter.verify();
    console.log('✅ Email server connection verified for welcome email');
    
    const mailOptions = {
      from: `"HR System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to HR System - Your Account Credentials',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
            .credentials-box { background: #f8fafc; border: 2px solid #dbeafe; border-radius: 8px; padding: 25px; margin: 25px 0; }
            .credential-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .credential-item:last-child { border-bottom: none; }
            .label { font-weight: 600; color: #4b5563; }
            .value { font-family: 'Courier New', monospace; font-weight: bold; color: #1f2937; }
            .password { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; font-size: 20px; letter-spacing: 2px; text-align: center; font-weight: bold; }
            .instructions { background: #ecfdf5; border: 1px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .action-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to HR System</h1>
              <p>Your account has been successfully created</p>
            </div>
            <div class="content">
              <p>Dear <strong>${name}</strong>,</p>
              
              <p>Welcome to the HR System! Your account has been created by the HR department.</p>
              
              <div class="credentials-box">
                <h3>Your Login Credentials:</h3>
                <div class="credential-item">
                  <span class="label">Employee ID:</span>
                  <span class="value">${employeeId || 'Will be assigned'}</span>
                </div>
                <div class="credential-item">
                  <span class="label">Email Address:</span>
                  <span class="value">${email}</span>
                </div>
                <div class="credential-item">
                  <span class="label">Temporary Password:</span>
                </div>
                <div class="password">${temporaryPassword}</div>
                <p><small><em>This is a temporary password. You must change it on first login.</em></small></p>
              </div>
              
              <div class="instructions">
                <h3>📝 How to Get Started:</h3>
                <ol>
                  <li>Go to the login page: <strong>${process.env.FRONTEND_URL || 'http://localhost:3000'}/login</strong></li>
                  <li>Enter your email address: <strong>${email}</strong></li>
                  <li>Enter the temporary password provided above</li>
                  <li>You will be prompted to change your password immediately</li>
                  <li>Complete your profile after login</li>
                </ol>
                <center>
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="action-button">
                    Login to Your Account
                  </a>
                </center>
              </div>
              
              <div class="warning">
                <h3>⚠️ Important Security Notes:</h3>
                <ul>
                  <li>This is a <strong>temporary password</strong> - you must change it on first login</li>
                  <li>Never share your password with anyone</li>
                  <li>This password will expire in 7 days</li>
                  <li>For security reasons, do not use this password for other accounts</li>
                  <li>If you didn't request this account, please contact HR immediately</li>
                </ul>
              </div>
              
              <p><strong>Login URL:</strong> <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login">${process.env.FRONTEND_URL || 'http://localhost:3000'}/login</a></p>
              
              <p>Best regards,<br>
              <strong>HR Department</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
              <p>For assistance, contact your HR department or system administrator.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${email}, Message ID: ${info.messageId}`);
    
    res.status(200).json({
      success: true,
      message: 'Welcome email sent successfully',
      emailId: info.messageId
    });
    
  } catch (err) {
    console.error('❌ Send welcome email error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to send welcome email'
    });
  }
};