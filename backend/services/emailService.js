import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create reusable transporter
let transporter = null;

const createTransporter = () => {
  // If transporter already exists, return it
  if (transporter) {
    return transporter;
  }

  // Email configuration from environment variables
  const emailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  };

  // If no SMTP credentials are provided, create a test account
  if (!emailConfig.auth.user || !emailConfig.auth.pass) {
    console.warn('⚠️  SMTP credentials not configured. Email notifications will not be sent.');
    console.warn('   Set SMTP_USER and SMTP_PASSWORD in your .env file to enable emails.');
    return null;
  }

  transporter = nodemailer.createTransport(emailConfig);
  return transporter;
};

/**
 * Send email notification when a user is tagged in a comment
 * @param {Object} options - Email options
 * @param {String} options.to - Recipient email
 * @param {String} options.toName - Recipient name
 * @param {String} options.fromName - Sender name
 * @param {String} options.commentText - The comment text
 * @param {String} options.projectName - Project name
 * @param {String} options.projectUrl - URL to view the project
 * @param {String} options.commentUrl - Direct URL to the comment
 */
export const sendTagNotification = async ({
  to,
  toName,
  fromName,
  commentText,
  projectName,
  projectUrl,
  commentUrl,
  isReply = false,
}) => {
  try {
    const emailTransporter = createTransporter();
    
    if (!emailTransporter) {
      console.log('Email transporter not available, skipping email notification');
      return { success: false, error: 'Email service not configured' };
    }

    const subject = isReply 
      ? `${fromName} mentioned you in a reply on ${projectName || 'a project'}`
      : `${fromName} mentioned you in a comment on ${projectName || 'a project'}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .comment-box {
              background: white;
              border-left: 4px solid #667eea;
              padding: 20px;
              margin: 20px 0;
              border-radius: 4px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .button {
              display: inline-block;
              background: #667eea;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
              font-weight: 600;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #6b7280;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>You've been mentioned!</h1>
          </div>
          <div class="content">
            <p>Hi ${toName},</p>
            <p><strong>${fromName}</strong> mentioned you in ${isReply ? 'a reply' : 'a comment'} on <strong>${projectName || 'a project'}</strong>.</p>
            
            <div class="comment-box">
              <p style="margin: 0; white-space: pre-wrap;">${commentText}</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${commentUrl || projectUrl}" class="button">View Comment</a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${commentUrl || projectUrl}" style="color: #667eea; word-break: break-all;">${commentUrl || projectUrl}</a>
            </p>
          </div>
          <div class="footer">
            <p>This is an automated notification from ReviewOnly.</p>
            <p>You're receiving this because you were mentioned in a comment.</p>
          </div>
        </body>
      </html>
    `;

    const textContent = `
Hi ${toName},

${fromName} mentioned you in ${isReply ? 'a reply' : 'a comment'} on ${projectName || 'a project'}.

Comment:
${commentText}

View the comment: ${commentUrl || projectUrl}
    `;

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'ReviewOnly'}" <${process.env.SMTP_USER}>`,
      to: to,
      subject: subject,
      text: textContent,
      html: htmlContent,
    };

    const info = await emailTransporter.sendMail(mailOptions);
    console.log('✅ Tag notification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending tag notification email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Verify email configuration
 */
export const verifyEmailConfig = async () => {
  try {
    const emailTransporter = createTransporter();
    if (!emailTransporter) {
      return { valid: false, message: 'Email service not configured' };
    }
    await emailTransporter.verify();
    return { valid: true, message: 'Email configuration is valid' };
  } catch (error) {
    return { valid: false, message: error.message };
  }
};

