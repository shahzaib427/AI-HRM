// backend/services/notificationService.js
const Notification = require('../models/Notification');

class NotificationService {
  constructor(io) {
    this.io = io;
  }

  async createNotification(notificationData) {
    try {
      const notification = new Notification(notificationData);
      await notification.save();

      if (this.io) {
        // ✅ FIX: Always stringify the ObjectId — Mongoose ObjectId !== plain string
        // socket.join() uses `user_${socket.user._id}` in server.js
        // so we must match that exactly here
        const recipientId = notificationData.recipient.userId.toString();
        const room = `user_${recipientId}`;

        console.log(`📤 Emitting new_notification to room: ${room}`);

        this.io.to(room).emit('new_notification', {
          _id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          createdAt: notification.createdAt,
          isRead: notification.isRead,
          priority: notification.priority,
          data: notification.data
        });

        console.log(`✅ Notification sent to user ${recipientId}`);
      }

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // ── Message notifications ──────────────────────────────────────────────────
  async notifyNewMessage(message, sender, recipient) {
    // ✅ FIX: Log who the notification is going to so you can verify in console
    console.log(`📨 notifyNewMessage → recipient: ${recipient._id} (${recipient.role}), sender: ${sender._id} (${sender.name})`);

    return await this.createNotification({
      recipient: {
        userId: recipient._id,
        userModel: recipient.role === 'employee' ? 'Employee' : 'User',
        role: recipient.role
      },
      sender: {
        userId: sender._id,
        userModel: sender.role === 'employee' ? 'Employee' : 'User',
        name: sender.name
      },
      type: 'message_received',
      title: 'New Message 💬',
      message: `${sender.name} sent you a message`,
      data: {
        messageId: message._id,
        senderId: sender._id,
        senderName: sender.name,
        content: message.content
      },
      priority: 'medium'
    });
  }

  // ── Payroll notifications ──────────────────────────────────────────────────
  async notifyPayrollGenerated(payroll, employee) {
    console.log(`💰 notifyPayrollGenerated → employee: ${employee._id}`);
    return await this.createNotification({
      recipient: {
        userId: employee._id,
        userModel: 'Employee',
        role: 'employee'
      },
      type: 'payroll_processed',
      title: 'Payslip Generated 💰',
      message: `Your payslip for ${payroll.month} ${payroll.year} has been generated. Amount: $${payroll.netSalary?.toLocaleString() || 0}`,
      data: {
        payrollId: payroll._id,
        month: payroll.month,
        year: payroll.year,
        amount: payroll.netSalary
      },
      priority: 'high'
    });
  }

  // ── Leave notifications ────────────────────────────────────────────────────
  async notifyLeaveRequest(leave, employee, hrUsers) {
    console.log(`📅 notifyLeaveRequest → notifying ${hrUsers.length} HR/admin user(s)`);
    const notifications = [];
    for (const hr of hrUsers) {
      const notification = await this.createNotification({
        recipient: {
          userId: hr._id,
          userModel: 'User',
          role: hr.role
        },
        sender: {
          userId: employee._id,
          userModel: 'Employee',
          name: employee.name
        },
        type: 'leave_request',
        title: 'New Leave Request 📅',
        message: `${employee.name} requested ${leave.type} leave from ${new Date(leave.startDate).toLocaleDateString()}`,
        data: {
          leaveId: leave._id,
          employeeId: employee._id,
          employeeName: employee.name,
          leaveType: leave.type
        },
        priority: 'high'
      });
      notifications.push(notification);
    }
    return notifications;
  }

  async notifyLeaveApproved(leave, employee) {
    console.log(`✅ notifyLeaveApproved → employee: ${employee._id}`);
    return await this.createNotification({
      recipient: {
        userId: employee._id,
        userModel: 'Employee',
        role: 'employee'
      },
      type: 'leave_approved',
      title: 'Leave Approved ✅',
      message: `Your ${leave.type} leave request has been approved`,
      data: { leaveId: leave._id, leaveType: leave.type },
      priority: 'medium'
    });
  }

  async notifyLeaveRejected(leave, employee, reason) {
    console.log(`❌ notifyLeaveRejected → employee: ${employee._id}`);
    return await this.createNotification({
      recipient: {
        userId: employee._id,
        userModel: 'Employee',
        role: 'employee'
      },
      type: 'leave_rejected',
      title: 'Leave Rejected ❌',
      message: `Your ${leave.type} leave request was rejected. Reason: ${reason || 'Not specified'}`,
      data: { leaveId: leave._id, leaveType: leave.type, reason },
      priority: 'high'
    });
  }

  // ── Employee notifications ─────────────────────────────────────────────────
  async notifyNewEmployee(employee, adminUsers) {
    console.log(`🎉 notifyNewEmployee → notifying ${adminUsers.length} admin(s)`);
    const notifications = [];
    for (const admin of adminUsers) {
      const notification = await this.createNotification({
        recipient: {
          userId: admin._id,
          userModel: 'User',
          role: admin.role
        },
        type: 'employee_onboarded',
        title: 'New Employee Onboarded 🎉',
        message: `${employee.name} joined as ${employee.position}`,
        data: {
          employeeId: employee._id,
          employeeName: employee.name,
          position: employee.position
        },
        priority: 'medium'
      });
      notifications.push(notification);
    }
    return notifications;
  }

  // ── Contract notifications ─────────────────────────────────────────────────
  async notifyContractCreated(contract, employee, hrUsers) {
    console.log(`📄 notifyContractCreated → notifying ${hrUsers.length} HR user(s)`);
    const notifications = [];
    for (const hr of hrUsers) {
      const notification = await this.createNotification({
        recipient: {
          userId: hr._id,
          userModel: 'User',
          role: hr.role
        },
        type: 'contract_signed',
        title: 'New Contract Created 📄',
        message: `Contract created for ${contract.employeeName}`,
        data: { contractId: contract._id, employeeName: contract.employeeName },
        priority: 'medium'
      });
      notifications.push(notification);
    }
    return notifications;
  }

  async notifyContractSigned(contract, employee) {
    console.log(`✍️ notifyContractSigned → employee: ${employee._id}`);
    return await this.createNotification({
      recipient: {
        userId: employee._id,
        userModel: 'Employee',
        role: 'employee'
      },
      type: 'contract_signed',
      title: 'Contract Signed ✍️',
      message: `Your contract has been signed and is now active`,
      data: { contractId: contract._id },
      priority: 'high'
    });
  }

  // ── Attendance notifications ───────────────────────────────────────────────
  async notifyAttendanceMarked(attendance, employee) {
    console.log(`📍 notifyAttendanceMarked → employee: ${employee._id}`);
    return await this.createNotification({
      recipient: {
        userId: employee._id,
        userModel: 'Employee',
        role: 'employee'
      },
      type: 'attendance_marked',
      title: 'Attendance Marked 📍',
      message: `Your attendance for ${new Date(attendance.date).toLocaleDateString()} has been marked`,
      data: {
        attendanceId: attendance._id,
        date: attendance.date,
        status: attendance.status
      },
      priority: 'low'
    });
  }

  async notifyAttendanceApproved(attendance, employee, type) {
    console.log(`✅ notifyAttendanceApproved → employee: ${employee._id}, type: ${type}`);
    return await this.createNotification({
      recipient: {
        userId: employee._id,
        userModel: 'Employee',
        role: 'employee'
      },
      type: 'attendance_updated',
      title: `${type} Approved ✅`,
      message: `Your ${type} request for ${new Date(attendance.date).toLocaleDateString()} has been approved`,
      data: { attendanceId: attendance._id, date: attendance.date, type },
      priority: 'medium'
    });
  }
}

module.exports = NotificationService;