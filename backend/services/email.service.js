const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    this.fromEmail = process.env.SMTP_USER;
    this.fromName = process.env.SMTP_FROM_NAME || 'Echo5 SEO Operations';
  }

  /**
   * Send email notification
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.text - Plain text content
   * @param {string} options.html - HTML content
   */
  async sendEmail({ to, subject, text, html }) {
    try {
      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to,
        subject,
        text,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error(`Failed to send email to ${to}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send task assignment notification to staff
   */
  async sendTaskAssignedEmail(staff, task, assignedBy) {
    const subject = `New Task Assigned: ${task.title}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .task-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .priority { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; }
          .priority-high { background: #fee2e2; color: #991b1b; }
          .priority-medium { background: #fef3c7; color: #92400e; }
          .priority-low { background: #dbeafe; color: #1e40af; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🎯 New Task Assigned</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${staff.name}</strong>,</p>
            <p>You have been assigned a new task by <strong>${assignedBy.name}</strong>.</p>
            
            <div class="task-details">
              <h2 style="margin-top: 0; color: #667eea;">${task.title}</h2>
              <p><strong>Client:</strong> ${task.clientId?.name || 'N/A'}</p>
              <p><strong>Priority:</strong> <span class="priority priority-${task.priority?.toLowerCase() || 'low'}">${task.priority || 'Low'}</span></p>
              <p><strong>Due Date:</strong> ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'}</p>
              ${task.description ? `<p><strong>Description:</strong><br>${task.description}</p>` : ''}
            </div>
            
            <p>Please log in to the SEO Operations platform to view more details and update the task status.</p>
            
            <p style="margin-top: 30px;">
              <strong>Best regards,</strong><br>
              Echo5 SEO Operations Team
            </p>
          </div>
          <div class="footer">
            <p>This is an automated notification from Echo5 SEO Operations Platform.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Hi ${staff.name},

You have been assigned a new task by ${assignedBy.name}.

Task: ${task.title}
Client: ${task.clientId?.name || 'N/A'}
Priority: ${task.priority || 'Low'}
Due Date: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'}
${task.description ? `Description: ${task.description}` : ''}

Please log in to the SEO Operations platform to view more details.

Best regards,
Echo5 SEO Operations Team
    `;

    return this.sendEmail({
      to: staff.email,
      subject,
      text,
      html,
    });
  }

  /**
   * Send task update notification to admins
   */
  async sendTaskUpdateEmail(admin, task, updatedBy, changes) {
    const subject = `Task Update: ${task.title}`;
    const changesHtml = changes.map(change => 
      `<li><strong>${change.field}:</strong> ${change.from} → ${change.to}</li>`
    ).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .task-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10b981; }
          .changes { background: #fef3c7; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">📝 Task Updated</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${admin.name}</strong>,</p>
            <p><strong>${updatedBy.name}</strong> has updated a task.</p>
            
            <div class="task-details">
              <h2 style="margin-top: 0; color: #10b981;">${task.title}</h2>
              <p><strong>Client:</strong> ${task.clientId?.name || 'N/A'}</p>
              <p><strong>Assigned to:</strong> ${task.assignedTo?.name || 'Unassigned'}</p>
              <p><strong>Status:</strong> ${task.status || 'Pending'}</p>
              
              ${changes.length > 0 ? `
                <div class="changes">
                  <p style="margin-top: 0;"><strong>Changes:</strong></p>
                  <ul style="margin-bottom: 0;">
                    ${changesHtml}
                  </ul>
                </div>
              ` : ''}
            </div>
            
            <p>Log in to the platform to view full task details.</p>
            
            <p style="margin-top: 30px;">
              <strong>Best regards,</strong><br>
              Echo5 SEO Operations Team
            </p>
          </div>
          <div class="footer">
            <p>This is an automated notification from Echo5 SEO Operations Platform.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const changesText = changes.map(change => 
      `${change.field}: ${change.from} → ${change.to}`
    ).join('\n');

    const text = `
Hi ${admin.name},

${updatedBy.name} has updated a task.

Task: ${task.title}
Client: ${task.clientId?.name || 'N/A'}
Assigned to: ${task.assignedTo?.name || 'Unassigned'}
Status: ${task.status || 'Pending'}

${changes.length > 0 ? `Changes:\n${changesText}` : ''}

Best regards,
Echo5 SEO Operations Team
    `;

    return this.sendEmail({
      to: admin.email,
      subject,
      text,
      html,
    });
  }

  /**
   * Send notification about task status change
   */
  async sendTaskStatusChangeEmail(recipient, task, oldStatus, newStatus, changedBy) {
    const subject = `Task Status Changed: ${task.title}`;
    const statusColors = {
      'Pending': '#fbbf24',
      'In Progress': '#3b82f6',
      'Completed': '#10b981',
      'On Hold': '#f59e0b',
      'Cancelled': '#ef4444'
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .status-change { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center; }
          .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 0 10px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🔄 Task Status Updated</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${recipient.name}</strong>,</p>
            <p>The status of task <strong>"${task.title}"</strong> has been updated by <strong>${changedBy.name}</strong>.</p>
            
            <div class="status-change">
              <p style="font-size: 18px; margin: 20px 0;">
                <span class="status-badge" style="background: ${statusColors[oldStatus] || '#6b7280'}; color: white;">${oldStatus}</span>
                <span style="font-size: 24px;">→</span>
                <span class="status-badge" style="background: ${statusColors[newStatus] || '#6b7280'}; color: white;">${newStatus}</span>
              </p>
            </div>
            
            <p><strong>Client:</strong> ${task.clientId?.name || 'N/A'}</p>
            ${task.dueDate ? `<p><strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleDateString()}</p>` : ''}
            
            <p style="margin-top: 30px;">
              <strong>Best regards,</strong><br>
              Echo5 SEO Operations Team
            </p>
          </div>
          <div class="footer">
            <p>This is an automated notification from Echo5 SEO Operations Platform.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Hi ${recipient.name},

The status of task "${task.title}" has been updated by ${changedBy.name}.

Status: ${oldStatus} → ${newStatus}
Client: ${task.clientId?.name || 'N/A'}
${task.dueDate ? `Due Date: ${new Date(task.dueDate).toLocaleDateString()}` : ''}

Best regards,
Echo5 SEO Operations Team
    `;

    return this.sendEmail({
      to: recipient.email,
      subject,
      text,
      html,
    });
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('SMTP connection verified successfully');
      return true;
    } catch (error) {
      logger.error('SMTP connection verification failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
