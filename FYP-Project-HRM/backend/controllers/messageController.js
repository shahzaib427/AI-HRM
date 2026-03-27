const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');

// ✅ EXISTING EMPLOYEE FUNCTIONS (KEEP)
// ✅ FIXED: Use the actual user ID, don't create a new one
const sendEmployeeMessage = async (req, res) => {
  try {
    const user = req.user;
    console.log('🔥 SENDING as:', user?.name || 'GUEST');
    console.log('🔥 User ID:', user?._id?.toString() || user?.id?.toString());
    
    // ✅ FIX: Use the actual ID directly, don't create a new ObjectId
    const senderId = user?._id || user?.id;
    
    if (!senderId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { recipientId, subject, message, category = 'general', priority = 'normal' } = req.body;

    if (!recipientId || !subject?.trim() || !message?.trim()) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const recipient = await User.findById(recipientId).select('name email role');
    if (!recipient || !['hr', 'admin'].includes(recipient.role)) {
      return res.status(403).json({ success: false, message: 'HR/Admin only' });
    }

    const newMessage = await Message.create({
      sender: {
        id: senderId,  // ✅ Now using the actual user ID, not a new ObjectId
        name: user?.name || 'Guest Employee',
        email: user?.email || 'guest@company.com',
        employeeId: user?.employeeId || 'GUEST001',
        role: 'employee'
      },
      recipientType: 'hr',
      recipient: recipient.name,
      recipientId: new mongoose.Types.ObjectId(recipientId),
      subject: subject.trim(),
      message: message.trim(),
      category,
      priority,
      status: 'sent'
    });

    console.log('✅ MESSAGE CREATED:', newMessage._id);
    console.log('✅ Sender ID stored:', newMessage.sender.id.toString());
    
    res.status(201).json({ success: true, message: 'Sent!', data: { id: newMessage._id } });
  } catch (error) {
    console.error('❌ SEND ERROR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ HR SEND MESSAGE FUNCTION (NEW - MISSING!)
// Updated sendHRMessage function in messageController.js
const sendHRMessage = async (req, res) => {
  try {
    const user = req.user;
    console.log('👑 ADMIN/HR SENDING as:', user?.name || 'GUEST');
    console.log('📥 RAW req.body:', req.body);
    
    const { 
      subject, 
      message: messageContent,
      recipientId, 
      recipientIds,
      recipientType = 'individual',
      department,
      broadcast,
      priority = 'normal', 
      category = 'general',
      confidential = false 
    } = req.body;

    // ✅ VALIDATE BASIC INPUTS
    if (!subject?.trim()) return res.status(400).json({ success: false, message: 'Subject required' });
    if (!messageContent?.trim()) return res.status(400).json({ success: false, message: 'Message required' });
    
    let recipients = [];
    let recipientTypeFinal = recipientType;
    
    // ✅ DETERMINE RECIPIENTS BASED ON TYPE
    if (recipientType === 'individual' || !recipientType) {
      if (!recipientId) return res.status(400).json({ success: false, message: 'Recipient required' });
      if (!mongoose.Types.ObjectId.isValid(recipientId)) {
        return res.status(400).json({ success: false, message: 'Invalid recipient ID' });
      }
      
      const recipient = await User.findById(recipientId).select('name email role employeeId department');
      if (!recipient) {
        return res.status(400).json({ success: false, message: 'Recipient not found' });
      }
      recipients = [recipient];
      recipientTypeFinal = 'individual';
    } 
    else if (recipientType === 'multiple') {
      if (!recipientIds || recipientIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Select at least one recipient' });
      }
      
      const validIds = recipientIds.filter(id => mongoose.Types.ObjectId.isValid(id));
      if (validIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid recipient IDs' });
      }
      
      recipients = await User.find({ 
        _id: { $in: validIds },
        isActive: true 
      }).select('name email role employeeId department');
      
      if (recipients.length === 0) {
        return res.status(400).json({ success: false, message: 'No valid recipients found' });
      }
    }
    else if (recipientType === 'department') {
      if (!department) {
        return res.status(400).json({ success: false, message: 'Department required' });
      }
      
      recipients = await User.find({ 
        department: department,
        isActive: true,
        role: { $nin: ['hr', 'admin'] }
      }).select('name email role employeeId department');
      
      if (recipients.length === 0) {
        return res.status(400).json({ success: false, message: `No active employees found in ${department} department` });
      }
      recipientTypeFinal = 'department';
    }
    else if (recipientType === 'all' || broadcast) {
      recipients = await User.find({ 
        isActive: true,
        role: { $nin: ['hr', 'admin'] }
      }).select('name email role employeeId department');
      
      if (recipients.length === 0) {
        return res.status(400).json({ success: false, message: 'No active employees found' });
      }
      recipientTypeFinal = 'all';
    }
    else {
      return res.status(400).json({ success: false, message: 'Invalid recipient type' });
    }

    console.log(`📤 Sending to ${recipients.length} recipients (type: ${recipientTypeFinal})`);

    // ✅ SENDER INFO
    const senderId = new mongoose.Types.ObjectId(user?._id || user?.id);
    
    // ✅ GET CURRENT MONTH'S MESSAGE COUNT BEFORE CREATION
    const date = new Date();
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    
    const currentCount = await Message.countDocuments({
      createdAt: {
        $gte: startOfMonth,
        $lt: endOfMonth
      }
    });
    
    console.log(`📊 Current message count for this month: ${currentCount}`);
    
    // ✅ CREATE MESSAGES SEQUENTIALLY WITH MANUAL REFERENCE NUMBERS
    const createdMessages = [];
    
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      
      // Generate unique reference number for this message
      const prefix = 'MSG';
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const sequenceNumber = (currentCount + i + 1).toString().padStart(4, '0');
      const referenceNumber = `${prefix}-${year}${month}-${sequenceNumber}`;
      
      console.log(`📝 Creating message ${i + 1}/${recipients.length}: ${referenceNumber}`);
      
      // Create message object
      const messageData = {
        sender: {
          id: senderId,
          name: user.name || 'Admin Team',
          email: user.email || 'admin@company.com',
          employeeId: user.employeeId || 'ADMIN001',
          role: user.role || 'admin'
        },
        referenceNumber: referenceNumber,
        recipientType: recipientTypeFinal,
        recipient: recipient.name,
        recipientId: new mongoose.Types.ObjectId(recipient._id),
        recipientEmail: recipient.email,
        recipientEmployeeId: recipient.employeeId,
        recipientDepartment: recipient.department,
        recipientRole: recipient.role,
        subject: subject.trim(),
        message: messageContent.trim(),
        priority,
        category,
        confidential: confidential === true || confidential === 'true',
        status: 'sent',
        isBroadcast: ['department', 'all', 'multiple'].includes(recipientTypeFinal),
        broadcastInfo: recipientTypeFinal !== 'individual' ? {
          type: recipientTypeFinal,
          count: recipients.length,
          department: recipientTypeFinal === 'department' ? department : null
        } : null,
        sentAt: new Date(),
        lastUpdated: new Date()
      };
      
      try {
        // Create the message with explicit reference number
        const newMessage = await Message.create(messageData);
        createdMessages.push(newMessage);
        
        console.log(`✅ Created message for ${recipient.name}: ${referenceNumber}`);
      } catch (createError) {
        console.error(`❌ Failed to create message for ${recipient.name}:`, createError.message);
        
        // If duplicate key error, try with next sequence
        if (createError.code === 11000 && createError.keyPattern?.referenceNumber) {
          console.log(`🔄 Retrying with next sequence number...`);
          
          // Try with incremented sequence
          const retrySequence = (currentCount + i + 2).toString().padStart(4, '0');
          const retryReferenceNumber = `${prefix}-${year}${month}-${retrySequence}`;
          messageData.referenceNumber = retryReferenceNumber;
          
          try {
            const retryMessage = await Message.create(messageData);
            createdMessages.push(retryMessage);
            console.log(`✅ Created message (retry) for ${recipient.name}: ${retryReferenceNumber}`);
          } catch (retryError) {
            console.error(`❌ Retry also failed for ${recipient.name}:`, retryError.message);
            // Continue with next recipient
          }
        }
      }
    }
    
    console.log(`🎉 Successfully created ${createdMessages.length} out of ${recipients.length} messages`);

    // ✅ RESPONSE
    res.status(201).json({ 
      success: true, 
      message: `Message sent to ${createdMessages.length} recipient(s)`,
      data: {
        count: createdMessages.length,
        recipients: recipients.length,
        type: recipientTypeFinal,
        department: recipientTypeFinal === 'department' ? department : null,
        isBroadcast: ['department', 'all', 'multiple'].includes(recipientTypeFinal)
      }
    });
    
  } catch (error) {
    console.error('❌ ADMIN SEND ERROR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};



// ✅ ULTIMATE getAllMessages - HR sees ALL, Employee sees own
const getAllMessages = async (req, res) => {
  try {
    const user = req.user;
    
    // ✅ NEW: Handle ALL query params
    const {
      excludeDeleted = 'true',
      page = 1,
      limit = 15,
      status,
      priority,
      category,
      search,
      startDate
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // ✅ Build query
    let query = {};
    
    if (excludeDeleted === 'true') {
      query.status = { $ne: 'deleted' };
    }

    // ✅ Filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
        { 'sender.name': { $regex: search, $options: 'i' } }
      ];
    }
    if (startDate) {
      query.createdAt = { $gte: new Date(startDate) };
    }

    // ✅ User filtering
    if (user?._id) {
      const userRole = user.role || user.systemRole;
      if (!['hr', 'admin'].includes(userRole)) {
        const userId = new mongoose.Types.ObjectId(user._id);
        query.$or = [{ 'sender.id': userId }, { 'recipientId': userId }];
      }
    }

    // ✅ Execute with pagination
    const total = await Message.countDocuments(query);
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    console.log(`📨 Found ${messages.length}/${total} messages (page ${pageNum})`);

    res.json({ 
      success: true, 
      count: messages.length,
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
      data: messages 
    });
  } catch (error) {
    console.error('❌ Query error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch' });
  }
};


// ✅ SHOW ALL USERS FOR HR COMPOSE (Not just HR/Admin)
const getEmployeeMessageUsers = async (req, res) => {
  try {
    const users = await User.find({ 
      isActive: true  // ALL active users (employees + HR + admin)
    })
    .select('name email role employeeId department')
    .sort({ name: 1 });
    
    console.log('👥 Loaded:', users.length, 'users for compose');
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error('❌ Users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

// ✅ HR STATS
const getMessageStats = async (req, res) => {
  try {
    const total = await Message.countDocuments({ status: { $ne: 'deleted' } });
    const unread = await Message.countDocuments({ status: { $in: ['new', 'sent'] } });
    const highPriority = await Message.countDocuments({ priority: { $in: ['high', 'urgent'] } });
    
    res.json({
      success: true,
      data: { total, unread, highPriority, pending: total - unread }
    });
  } catch (error) {
    console.error('❌ Stats error:', error);
    res.status(500).json({ success: false, message: 'Stats failed' });
  }
};

// In messageController.js - REPLACE getEmployeeReceivedMessages with this:


// ✅ DEBUG VERSION - Add this temporarily
const getEmployeeReceivedMessages = async (req, res) => {
  try {
    const user = req.user;
    
    console.log('🔍 DEBUG - Full user object:', JSON.stringify(user, null, 2));
    
    const userId = user?.id || user?._id;
    console.log('🔍 DEBUG - Using userId:', userId);
    
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    // Check all non-deleted messages
    const allMessages = await Message.find({ status: { $ne: 'deleted' } }).lean();
    console.log('🔍 DEBUG - All messages in DB:', allMessages.length);
    
    // Log each message's participants
    allMessages.forEach((msg, index) => {
      console.log(`Message ${index + 1}:`, {
        id: msg._id,
        subject: msg.subject,
        senderId: msg.sender?.id?.toString(),
        recipientId: msg.recipientId?.toString(),
        currentUserId: userId.toString()
      });
    });
    
    // Now find messages for this user
    const messages = await Message.find({
      $or: [
        { 'sender.id': userObjectId },
        { recipientId: userObjectId }
      ],
      status: { $ne: 'deleted' }
    })
      .sort({ createdAt: -1 })
      .lean();

    console.log(`✅ Found ${messages.length} messages for user`);
    
    res.json({ success: true, data: messages });
    
  } catch (error) {
    console.error('💥 Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};



const deleteEmployeeMessage = async (req, res) => {
  try {
    const messageId = req.params.id;
    const result = await Message.updateOne(
      { _id: messageId, status: { $ne: 'deleted' } },
      { status: 'deleted', deletedAt: new Date() }
    );
    
    console.log('🗑️ DELETE RESULT:', { matched: result.matchedCount, modified: result.modifiedCount });
    
    res.json({ 
      success: true, 
      message: result.modifiedCount ? 'Deleted successfully' : 'Already deleted',
      deletedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('❌ DELETE ERROR:', error);
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
};
const getMessageById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // ✅ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid message ID' });
    }

    // ✅ Build query - exclude deleted
    let query = { _id: new mongoose.Types.ObjectId(id), status: { $ne: 'deleted' } };

    // ✅ HR/Admin sees all, others see only their messages
    if (user?._id && !['hr', 'admin'].includes(user.role || user.systemRole)) {
      const userId = new mongoose.Types.ObjectId(user._id);
      query.$or = [{ 'sender.id': userId }, { 'recipientId': userId }];
    }

    const message = await Message.findOne(query).lean();

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found or deleted' });
    }

    console.log('📨 Message found:', message.subject);
    
    res.json({ success: true, data: message });
  } catch (error) {
    console.error('❌ Get message error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch message' });
  }
};

const replyToMessage = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { message, status } = req.body;

    console.log('📨 REPLYING to:', id, 'by:', user.name);

    // Validate message ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid message ID' });
    }

    // Find original message
    const originalMessage = await Message.findById(id);
    if (!originalMessage) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Add reply to responses array
    const reply = {
      sender: {
        id: new mongoose.Types.ObjectId(user.id || user._id),
        name: user.name || 'Admin',
        role: user.role || 'admin'
      },
      message: message.trim(),
      respondedAt: new Date()
    };

    originalMessage.responses.push(reply);
    
    // Update status if provided
    if (status) {
      originalMessage.status = status;
      originalMessage.lastUpdated = new Date();
    }

    await originalMessage.save();

    console.log('✅ REPLY ADDED:', originalMessage._id);
    res.json({ 
      success: true, 
      message: 'Reply sent successfully!',
      data: originalMessage 
    });

  } catch (error) {
    console.error('❌ REPLY ERROR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
// ✅ BULK MESSAGE SEND (Alternative approach)
const sendBulkHRMessages = async (req, res) => {
  try {
    const user = req.user;
    console.log('👑 BULK SENDING as:', user?.name);
    
    const { 
      subject, 
      message, 
      recipientIds = [], 
      department,
      sendToAll = false,
      priority = 'normal', 
      category = 'general',
      confidential = false 
    } = req.body;

    // Validate inputs
    if (!subject?.trim()) return res.status(400).json({ success: false, message: 'Subject required' });
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Message required' });

    let recipients = [];
    
    if (sendToAll) {
      // Send to all active employees (excluding HR/Admin)
      recipients = await User.find({ 
        isActive: true,
        role: { $nin: ['hr', 'admin'] }
      }).select('name email role employeeId department');
    } 
    else if (department) {
      // Send to specific department
      recipients = await User.find({ 
        department: department,
        isActive: true
      }).select('name email role employeeId department');
    }
    else if (recipientIds.length > 0) {
      // Send to specific recipients
      const validIds = recipientIds.filter(id => mongoose.Types.ObjectId.isValid(id));
      recipients = await User.find({ 
        _id: { $in: validIds },
        isActive: true 
      }).select('name email role employeeId department');
    }
    else {
      return res.status(400).json({ success: false, message: 'No recipients specified' });
    }

    if (recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'No recipients found' });
    }

    console.log(`📤 Bulk sending to ${recipients.length} recipients`);

    // Use bulk insert for better performance
    const messagesToInsert = recipients.map(recipient => ({
      sender: {
        id: new mongoose.Types.ObjectId(user.id || user._id),
        name: user.name || 'Admin Team',
        email: user.email || 'admin@company.com',
        employeeId: user.employeeId || 'ADMIN001',
        role: user.role || 'admin'
      },
      recipientType: sendToAll ? 'all' : (department ? 'department' : 'multiple'),
      recipient: recipient.name,
      recipientId: new mongoose.Types.ObjectId(recipient._id),
      recipientEmail: recipient.email,
      recipientEmployeeId: recipient.employeeId,
      recipientDepartment: recipient.department,
      subject: subject.trim(),
      message: message.trim(),
      priority,
      category,
      confidential: confidential === true || confidential === 'true',
      status: 'sent',
      isBroadcast: true,
      broadcastInfo: {
        type: sendToAll ? 'all' : (department ? 'department' : 'multiple'),
        count: recipients.length,
        department: department || null
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const result = await Message.insertMany(messagesToInsert);

    console.log(`✅ Bulk created ${result.length} messages`);
    
    res.status(201).json({ 
      success: true, 
      message: `Bulk message sent to ${recipients.length} recipient(s)`,
      data: {
        count: result.length,
        recipients: recipients.length,
        type: sendToAll ? 'all' : (department ? 'department' : 'multiple'),
        department: department || null
      }
    });
    
  } catch (error) {
    console.error('❌ BULK SEND ERROR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
const bulkDeleteMessages = async (req, res) => {
  try {
    // ✅ Support both messageIds and ids
    const messageIds = req.body.messageIds || req.body.ids || [];
    
    if (!messageIds || messageIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No message IDs provided' });
    }
    
    // Soft delete (ignore 'action' for now - always soft delete)
    const result = await Message.updateMany(
      { 
        _id: { $in: messageIds.map(id => new mongoose.Types.ObjectId(id)) },
        status: { $ne: 'deleted' }
      },
      { 
        status: 'deleted',
        deletedAt: new Date()
      }
    );
    
    console.log(`🗑️ HR BULK DELETE: ${result.modifiedCount}/${messageIds.length} messages`);
    
    res.json({
      success: true,
      message: `Deleted ${result.modifiedCount} messages`,
      deletedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('❌ Bulk delete error:', error);
    res.status(500).json({ success: false, message: 'Bulk delete failed' });
  }
};
// ✅ ADD THIS NEW FUNCTION (before module.exports)
const deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.id;
    const result = await Message.updateOne(
      { _id: messageId, status: { $ne: 'deleted' } },
      { status: 'deleted', deletedAt: new Date() }
    );
    
    console.log('🗑️ ADMIN DELETE:', { matched: result.matchedCount, modified: result.modifiedCount });
    
    res.json({ 
      success: true, 
      message: result.modifiedCount ? 'Deleted successfully' : 'Already deleted',
      deletedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('❌ DELETE ERROR:', error);
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
};





// ✅ ALL FUNCTIONS EXPORTED
module.exports = {
  sendEmployeeMessage,
  sendHRMessage,        // ✅ FIXED - NOW EXPORTED
  getAllMessages,
  getEmployeeMessageUsers,
  getEmployeeReceivedMessages,
  deleteEmployeeMessage,
  getMessageStats,
  getMessageById,
  replyToMessage,
  sendBulkHRMessages,
  bulkDeleteMessages,
   deleteMessage
  
};
