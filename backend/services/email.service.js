const nodemailer = require('nodemailer');
const { logger } = require('../utils/logger');

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
    this.logoUrl = process.env.LOGO_URL || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/echo5-logo.png`;
  }

  /**
   * Get email header HTML
   */
  getEmailHeader() {
    return `
      <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
        <tr>
          <td style="padding: 40px 30px; text-align: center;">
            <img src="${this.logoUrl}" alt="Echo5 Digital" style="height: 60px; margin-bottom: 20px;" />
            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              Echo5 SEO Operations
            </h1>
            <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
              Professional SEO Management Platform
            </p>
          </td>
        </tr>
      </table>
    `;
  }

  /**
   * Get email footer HTML
   */
  getEmailFooter() {
    return `
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
        <tr>
          <td style="padding: 30px; text-align: center;">
            <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <strong>Echo5 Digital - SEO Operations Platform</strong>
            </p>
            <p style="margin: 0 0 15px; color: #9ca3af; font-size: 12px;">
              This is an automated notification. Please do not reply to this email.
            </p>
            <div style="margin: 20px 0;">
              <a href="https://echo5digital.com" style="color: #667eea; text-decoration: none; font-size: 12px; margin: 0 10px;">Website</a>
              <span style="color: #d1d5db;">|</span>
              <a href="mailto:support@echo5digital.com" style="color: #667eea; text-decoration: none; font-size: 12px; margin: 0 10px;">Support</a>
              <span style="color: #d1d5db;">|</span>
              <a href="#" style="color: #667eea; text-decoration: none; font-size: 12px; margin: 0 10px;">Privacy Policy</a>
            </div>
            <p style="margin: 15px 0 0; color: #9ca3af; font-size: 11px;">
              © ${new Date().getFullYear()} Echo5 Digital. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    `;
  }

  /**
   * Get base email wrapper
   */
  getEmailWrapper(content) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Echo5 SEO Operations</title>
        <!--[if mso]>
        <style type="text/css">
          body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
        </style>
        <![endif]-->
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 800px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                ${this.getEmailHeader()}
                ${content}
                ${this.getEmailFooter()}
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
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
    const subject = `🎯 New Task Assigned: ${task.title}`;
    
    const priorityColors = {
      'Critical': { bg: '#fee2e2', color: '#991b1b', icon: '🔴' },
      'High': { bg: '#fed7aa', color: '#9a3412', icon: '🟠' },
      'Medium': { bg: '#fef3c7', color: '#92400e', icon: '🟡' },
      'Low': { bg: '#dbeafe', color: '#1e40af', icon: '🟢' }
    };
    
    const priority = task.priority || 'Low';
    const priorityStyle = priorityColors[priority];

    const content = `
      <tr>
        <td style="padding: 40px 30px;">
          <div style="background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); border-left: 4px solid #667eea; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="margin: 0 0 10px; color: #1f2937; font-size: 24px; font-weight: 700;">
              🎯 New Task Assigned
            </h2>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              You have a new task from <strong style="color: #667eea;">${assignedBy.name}</strong>
            </p>
          </div>

          <p style="margin: 0 0 25px; color: #374151; font-size: 16px; line-height: 1.6;">
            Hi <strong>${staff.name}</strong>,
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin: 25px 0;">
            <tr>
              <td style="padding: 25px;">
                <h3 style="margin: 0 0 20px; color: #667eea; font-size: 20px; font-weight: 700; border-bottom: 2px solid #e5e7eb; padding-bottom: 15px;">
                  ${task.title}
                </h3>
                
                <table width="100%" cellpadding="8" cellspacing="0" style="margin-bottom: 15px;">
                  <tr>
                    <td style="width: 140px; color: #6b7280; font-size: 14px; font-weight: 600;">📋 Client:</td>
                    <td style="color: #1f2937; font-size: 14px; font-weight: 500;">${task.clientId?.name || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="width: 140px; color: #6b7280; font-size: 14px; font-weight: 600;">🎯 Priority:</td>
                    <td>
                      <span style="display: inline-block; padding: 6px 14px; background: ${priorityStyle.bg}; color: ${priorityStyle.color}; border-radius: 20px; font-size: 12px; font-weight: 700;">
                        ${priorityStyle.icon} ${priority}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="width: 140px; color: #6b7280; font-size: 14px; font-weight: 600;">📅 Due Date:</td>
                    <td style="color: #1f2937; font-size: 14px; font-weight: 500;">
                      ${task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Not set'}
                    </td>
                  </tr>
                  ${task.description ? `
                  <tr>
                    <td colspan="2" style="padding-top: 15px;">
                      <div style="background: white; padding: 15px; border-radius: 8px; border-left: 3px solid #667eea;">
                        <p style="margin: 0 0 5px; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Description</p>
                        <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">${task.description}</p>
                      </div>
                    </td>
                  </tr>
                  ` : ''}
                </table>

                <div style="text-align: center; margin-top: 25px;">
                  <a href="${process.env.FRONTEND_URL}/tasks" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(102, 126, 234, 0.3);">
                    📂 View Task Details
                  </a>
                </div>
              </td>
            </tr>
          </table>

          <p style="margin: 30px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
            Please log in to the SEO Operations platform to view complete details and update the task status as you progress.
          </p>

          <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #374151; font-size: 14px; font-weight: 600;">Best regards,</p>
            <p style="margin: 5px 0 0; color: #667eea; font-size: 14px; font-weight: 700;">Echo5 SEO Operations Team</p>
          </div>
        </td>
      </tr>
    `;

    const html = this.getEmailWrapper(content);

    const text = `
Hi ${staff.name},

You have been assigned a new task by ${assignedBy.name}.

Task: ${task.title}
Client: ${task.clientId?.name || 'N/A'}
Priority: ${priority}
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
    const subject = `📝 Task Update: ${task.title}`;
    
    const changesHtml = changes.map(change => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <strong style="color: #667eea;">${change.field}</strong>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
          <span style="color: #ef4444; text-decoration: line-through;">${change.from}</span>
          <span style="margin: 0 8px; color: #9ca3af;">→</span>
          <span style="color: #10b981; font-weight: 600;">${change.to}</span>
        </td>
      </tr>
    `).join('');

    const content = `
      <tr>
        <td style="padding: 40px 30px;">
          <div style="background: linear-gradient(135deg, #10b98115 0%, #05966915 100%); border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="margin: 0 0 10px; color: #1f2937; font-size: 24px; font-weight: 700;">
              📝 Task Updated
            </h2>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              <strong style="color: #10b981;">${updatedBy.name}</strong> has made changes to a task
            </p>
          </div>

          <p style="margin: 0 0 25px; color: #374151; font-size: 16px; line-height: 1.6;">
            Hi <strong>${admin.name}</strong>,
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin: 25px 0;">
            <tr>
              <td style="padding: 25px;">
                <h3 style="margin: 0 0 20px; color: #10b981; font-size: 20px; font-weight: 700; border-bottom: 2px solid #e5e7eb; padding-bottom: 15px;">
                  ${task.title}
                </h3>
                
                <table width="100%" cellpadding="8" cellspacing="0" style="margin-bottom: 20px;">
                  <tr>
                    <td style="width: 140px; color: #6b7280; font-size: 14px; font-weight: 600;">📋 Client:</td>
                    <td style="color: #1f2937; font-size: 14px; font-weight: 500;">${task.clientId?.name || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="width: 140px; color: #6b7280; font-size: 14px; font-weight: 600;">👤 Assigned to:</td>
                    <td style="color: #1f2937; font-size: 14px; font-weight: 500;">${task.assignedTo?.name || 'Unassigned'}</td>
                  </tr>
                  <tr>
                    <td style="width: 140px; color: #6b7280; font-size: 14px; font-weight: 600;">📊 Status:</td>
                    <td>
                      <span style="display: inline-block; padding: 6px 14px; background: #dbeafe; color: #1e40af; border-radius: 20px; font-size: 12px; font-weight: 700;">
                        ${task.status || 'Pending'}
                      </span>
                    </td>
                  </tr>
                </table>

                ${changes.length > 0 ? `
                  <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0 0 15px; color: #92400e; font-size: 14px; font-weight: 700;">
                      🔄 Changes Made:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: white; border-radius: 6px; overflow: hidden;">
                      ${changesHtml}
                    </table>
                  </div>
                ` : ''}

                <div style="text-align: center; margin-top: 25px;">
                  <a href="${process.env.FRONTEND_URL}/tasks" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.3);">
                    📂 View Task Details
                  </a>
                </div>
              </td>
            </tr>
          </table>

          <p style="margin: 30px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
            Log in to the platform to view complete task details and history.
          </p>

          <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #374151; font-size: 14px; font-weight: 600;">Best regards,</p>
            <p style="margin: 5px 0 0; color: #10b981; font-size: 14px; font-weight: 700;">Echo5 SEO Operations Team</p>
          </div>
        </td>
      </tr>
    `;

    const html = this.getEmailWrapper(content);

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
    const subject = `🔄 Task Status Changed: ${task.title}`;
    
    const statusStyles = {
      'Pending': { bg: '#fef3c7', color: '#92400e', icon: '⏳', gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' },
      'In Progress': { bg: '#dbeafe', color: '#1e40af', icon: '⚙️', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' },
      'Completed': { bg: '#d1fae5', color: '#065f46', icon: '✅', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
      'On Hold': { bg: '#fed7aa', color: '#9a3412', icon: '⏸️', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
      'Cancelled': { bg: '#fee2e2', color: '#991b1b', icon: '❌', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }
    };

    const oldStyle = statusStyles[oldStatus] || statusStyles['Pending'];
    const newStyle = statusStyles[newStatus] || statusStyles['Pending'];

    const content = `
      <tr>
        <td style="padding: 40px 30px;">
          <div style="background: ${newStyle.gradient}; padding: 3px; border-radius: 12px; margin-bottom: 30px;">
            <div style="background: white; padding: 25px; border-radius: 10px;">
              <h2 style="margin: 0 0 10px; color: #1f2937; font-size: 24px; font-weight: 700; text-align: center;">
                🔄 Status Updated
              </h2>
              <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
                <strong style="color: ${newStyle.color};">${changedBy.name}</strong> changed the task status
              </p>
            </div>
          </div>

          <p style="margin: 0 0 25px; color: #374151; font-size: 16px; line-height: 1.6;">
            Hi <strong>${recipient.name}</strong>,
          </p>

          <p style="margin: 0 0 30px; color: #6b7280; font-size: 15px; line-height: 1.6;">
            The status of task <strong style="color: #1f2937;">"${task.title}"</strong> has been updated.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
            <tr>
              <td align="center">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 20px; background: ${oldStyle.bg}; border-radius: 12px; min-width: 140px;">
                      <div style="text-align: center;">
                        <div style="font-size: 32px; margin-bottom: 8px;">${oldStyle.icon}</div>
                        <div style="color: ${oldStyle.color}; font-weight: 700; font-size: 16px;">${oldStatus}</div>
                      </div>
                    </td>
                    <td style="padding: 0 20px;">
                      <div style="font-size: 32px; color: #9ca3af;">→</div>
                    </td>
                    <td style="padding: 20px; background: ${newStyle.bg}; border-radius: 12px; min-width: 140px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                      <div style="text-align: center;">
                        <div style="font-size: 32px; margin-bottom: 8px;">${newStyle.icon}</div>
                        <div style="color: ${newStyle.color}; font-weight: 700; font-size: 16px;">${newStatus}</div>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px; margin: 30px 0;">
            <tr>
              <td style="padding: 25px;">
                <h3 style="margin: 0 0 20px; color: #1f2937; font-size: 18px; font-weight: 700; border-bottom: 2px solid #e5e7eb; padding-bottom: 15px;">
                  Task Details
                </h3>
                
                <table width="100%" cellpadding="8" cellspacing="0">
                  <tr>
                    <td style="width: 140px; color: #6b7280; font-size: 14px; font-weight: 600;">📋 Task:</td>
                    <td style="color: #1f2937; font-size: 14px; font-weight: 500;">${task.title}</td>
                  </tr>
                  <tr>
                    <td style="width: 140px; color: #6b7280; font-size: 14px; font-weight: 600;">🏢 Client:</td>
                    <td style="color: #1f2937; font-size: 14px; font-weight: 500;">${task.clientId?.name || 'N/A'}</td>
                  </tr>
                  ${task.dueDate ? `
                  <tr>
                    <td style="width: 140px; color: #6b7280; font-size: 14px; font-weight: 600;">📅 Due Date:</td>
                    <td style="color: #1f2937; font-size: 14px; font-weight: 500;">
                      ${new Date(task.dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </td>
                  </tr>
                  ` : ''}
                </table>

                <div style="text-align: center; margin-top: 25px;">
                  <a href="${process.env.FRONTEND_URL}/tasks" style="display: inline-block; padding: 14px 32px; background: ${newStyle.gradient}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);">
                    📂 View Task
                  </a>
                </div>
              </td>
            </tr>
          </table>

          <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #374151; font-size: 14px; font-weight: 600;">Best regards,</p>
            <p style="margin: 5px 0 0; background: ${newStyle.gradient}; -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 14px; font-weight: 700;">Echo5 SEO Operations Team</p>
          </div>
        </td>
      </tr>
    `;

    const html = this.getEmailWrapper(content);

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
