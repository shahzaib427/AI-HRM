const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
// ✅ CHANGED: no more nodemailer/SMTP here — all email now goes through
// utils/sendEmail.js, which calls Brevo's HTTPS API (port 443) instead of
// raw SMTP (port 587/2525), which Render was blocking at the platform level.
// Adjust this path if sendEmail.js lives somewhere other than ../utils/sendEmail
const sendEmail = require('../utils/sendEmail');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

console.log('✅✅✅ authController.js LOADED ✅✅✅');

// ===== SHARED: role-based employee ID generator (EMP001 / HR001 / ADM001) =====
// Used by register() and by userController's createEmployeeWithAccount.
const PREFIX_MAP = { hr: 'HR', admin: 'ADM', employee: 'EMP' };

async function generateEmployeeId(role) {
  const normalizedRole = (role || '').toString().toLowerCase();
  const prefix = PREFIX_MAP[normalizedRole] || 'EMP';

  try {
    const employees = await User.find({
      employeeId: { $regex: new RegExp(`^${prefix}\\d+$`) }
    }).select('employeeId').lean();

    let maxNumber = 0;
    employees.forEach(emp => {
      const match = emp.employeeId.match(new RegExp(`^${prefix}(\\d+)$`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });

    return `${prefix}${(maxNumber + 1).toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating employee ID:', error);
    // even the fallback keeps the prefix — never returns a bare long number
    return `${prefix}${Date.now().toString().slice(-6)}`;
  }
}

// ===== SHARED: strong random password (letters + digits + symbols) =====
// Used by register (indirectly via signup elsewhere), forgotPassword, and
// userController's createEmployeeWithAccount — ONE generator everywhere,
// so "reset password" emails are never weaker than "new account" emails.
function generateRandomPassword(length) {
  const len = [6, 7, 8].includes(length) ? length : 8;

  const lower = 'abcdefghijkmnpqrstuvwxyz';       // no l/o to avoid confusion
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';       // no I/O to avoid confusion
  const digits = '123456789';                      // no 0 to avoid confusion with O
  const symbols = '@&#$!%*';

  const allChars = lower + upper + digits + symbols;
  const pick = (charset) => charset[Math.floor(Math.random() * charset.length)];

  let passwordChars = [pick(lower), pick(upper), pick(digits), pick(symbols)];
  while (passwordChars.length < len) {
    passwordChars.push(pick(allChars));
  }

  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join('');
}

// ===== NEW: password generator that embeds the employee's CNIC last-5-digits =====
// Makes the temporary password easier for the employee to remember (their own
// CNIC digits), while still mixing in a random letter + symbol so it isn't
// 100% guessable by anyone who happens to know the employee's CNIC number.
// Falls back to the fully-random generator if no valid CNIC digits are found.
function generatePasswordFromCnic(cnicNumber) {
  const digitsOnly = (cnicNumber || '').toString().replace(/[^0-9]/g, '');
  const last5 = digitsOnly.slice(-5);

  if (last5.length < 5) {
    // No usable CNIC — fall back to the plain random generator
    return generateRandomPassword(8);
  }

  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';  // no I/O to avoid confusion
  const symbols = '@&#$!%*';
  const pick = (charset) => charset[Math.floor(Math.random() * charset.length)];

  // 5 CNIC digits + 1 random uppercase letter + 1 random symbol = 7 chars,
  // shuffled so the CNIC digits aren't just sitting in a predictable block.
  let passwordChars = [...last5.split(''), pick(upper), pick(symbols)];

  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join('');
}

// ❌ REMOVED: getEmailTransporter() — this created a nodemailer SMTP
// transporter (SMTP_HOST/PORT/USER/PASS) which is what was hanging with
// "Connection timeout" on Render. All three email functions below now call
// sendEmail() from utils/sendEmail.js instead, which uses Brevo's HTTP API.

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

    // ✅ FIXED: was `employeeId: uuidv4()` — that produced a long UUID
    // (e.g. "550e8400-e29b-...") instead of EMP001/HR001/ADM001.
    const employeeId = await generateEmployeeId(role);

    const user = await User.create({
      employeeId,
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
exports.login = async (req, res) => {
  try {
    let { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, error: 'Email and password are required' });

    email = email.toLowerCase().trim();
    const user = await User.findOne({ email }).select('+password');

    if (!user) return res.status(401).json({ success: false, error: 'Invalid email or password' });
    if (!user.isActive) return res.status(403).json({ success: false, error: 'Account is deactivated' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, error: 'Invalid email or password' });

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

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
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // For security, don't reveal if user exists or not
      return res.status(200).json({
        success: true,
        message: 'If your email exists in our system, you will receive a temporary password'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, error: 'Account is deactivated' });
    }

    // ✅ FIXED: was `generateNameBasedPassword(user.name, user.email)` which produced
    // weak passwords like "john123" — no symbols, guessable from the person's name/email.
    // Now uses the same strong generator as new-account creation (letters + digits + @#$ etc).
    const temporaryPassword = generateRandomPassword(8);

    console.log(`🔑 Generated temp password for ${user.email}`);

    user.password = temporaryPassword;
    user.temporaryPassword = true;
    user.passwordChanged = false;
    user.lastPasswordChange = new Date();

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);
    user.passwordExpiryDate = expiry;

    user.loginAttempts = 0;
    user.lockUntil = null;

    await user.save();

    // ✅ FIXED: respond to the user immediately instead of waiting on the email
    // round trip. If email delivery fails, it's logged — it no longer blocks
    // or fails the whole request.
    res.status(200).json({
      success: true,
      message: 'A temporary password has been sent to your email'
    });

    sendTemporaryPasswordEmail(user.email, user.name, temporaryPassword)
      .then((sent) => {
        if (!sent) console.error(`⚠️ Failed to deliver temp password email to ${user.email}`);
      });

  } catch (err) {
    console.error('❌ Forgot password error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server error processing request'
    });
  }
};

// ===== SEND TEMPORARY PASSWORD EMAIL =====
// ✅ CHANGED: now calls sendEmail() (Brevo HTTP API) instead of
// nodemailer transporter.sendMail() over SMTP.
const sendTemporaryPasswordEmail = async (email, name, temporaryPassword) => {
  try {
    const html = `
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
            <p>Best regards,<br><strong>HR System Support Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
            <p>If you need assistance, contact your HR department.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: email,
      subject: 'Your Temporary Password - HR System',
      html
    });

    console.log(`✅ Temporary password email sent to ${email}`);
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
      return res.status(400).json({ success: false, error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(userId).select('+password');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }

    const wasPreviouslyUsed = await user.wasPasswordPreviouslyUsed(newPassword);
    if (wasPreviouslyUsed) {
      return res.status(400).json({ success: false, error: 'You cannot use a previously used password' });
    }

    user.password = newPassword;
    user.temporaryPassword = false;
    user.passwordChanged = true;

    await user.save();

    // ✅ FIXED: respond immediately, don't make the user wait on the confirmation email
    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

    sendPasswordChangeConfirmationEmail(user.email, user.name)
      .then((sent) => {
        if (!sent) console.error(`⚠️ Failed to deliver password-change confirmation to ${user.email}`);
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
// ✅ CHANGED: now calls sendEmail() (Brevo HTTP API) instead of
// nodemailer transporter.sendMail() over SMTP.
const sendPasswordChangeConfirmationEmail = async (email, name) => {
  try {
    const html = `
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
            <p>Best regards,<br><strong>HR System Support Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: email,
      subject: 'Password Successfully Changed - HR System',
      html
    });

    console.log(`✅ Password change confirmation sent to ${email}`);
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
      return res.status(404).json({ success: false, error: 'User not found' });
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
// ✅ CHANGED: now calls sendEmail() (Brevo HTTP API) instead of
// nodemailer transporter.sendMail() over SMTP — this is the function that
// was silently failing with "Connection timeout" before, since it was
// still using the old getEmailTransporter()/nodemailer path even after
// utils/sendEmail.js was fixed elsewhere.
const sendWelcomeEmailInternal = async (email, name, employeeId, temporaryPassword) => {
  try {
    const html = `
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
            <p>Best regards,<br><strong>HR Department</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
            <p>For assistance, contact your HR department or system administrator.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: email,
      subject: 'Welcome to HR System - Your Account Credentials',
      html
    });

    console.log(`✅ Welcome email sent to ${email}`);
    return true;

  } catch (error) {
    console.error('❌ Welcome email error:', error.message);
    return false;
  }
};

// Thin HTTP wrapper around the internal function — kept for any direct
// route calls, but userController now calls sendWelcomeEmailInternal directly
// instead of faking req/res objects.
exports.sendWelcomeEmail = async (req, res) => {
  console.log('📧 SEND WELCOME EMAIL ENDPOINT CALLED');

  const { email, name, employeeId, temporaryPassword } = req.body;

  if (!email || !name || !temporaryPassword) {
    return res.status(400).json({
      success: false,
      error: 'Email, name, and temporary password are required'
    });
  }

  const sent = await sendWelcomeEmailInternal(email, name, employeeId, temporaryPassword);

  if (sent) {
    res.status(200).json({ success: true, message: 'Welcome email sent successfully' });
  } else {
    res.status(500).json({ success: false, error: 'Failed to send welcome email' });
  }
};

// ✅ Exported for internal use by userController — no HTTP mocking needed
exports.sendWelcomeEmailInternal = sendWelcomeEmailInternal;

// ✅ Exported so userController can use the SAME id/password generators
// instead of keeping duplicate copies that could drift out of sync
exports.generateEmployeeId = generateEmployeeId;
exports.generateRandomPassword = generateRandomPassword;
exports.generatePasswordFromCnic = generatePasswordFromCnic;