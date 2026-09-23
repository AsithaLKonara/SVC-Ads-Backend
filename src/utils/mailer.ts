import nodemailer from 'nodemailer';

// Configure the email transport using SMTP credentials from environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendPasswordResetEmail = async (to: string, resetToken: string) => {
  // If no SMTP_USER is configured, fallback to console log for development
  if (!process.env.SMTP_USER) {
    console.warn('⚠️ SMTP_USER is not configured. Mocking email delivery.');
    console.log(`[Email Mock] To: ${to}, Reset Token: ${resetToken}`);
    return;
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: `"Lakland Reality" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto;">
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your Lakland Reality account.</p>
        <p>Click the button below to set a new password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; color: white; background-color: #2563eb; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
        <p style="margin-top: 20px; font-size: 14px; color: #666;">If you didn't request this, you can safely ignore this email.</p>
        <p style="font-size: 14px; color: #666;">This link is valid for 1 hour.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${to}: ${info.messageId}`);
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw new Error('Could not send reset email');
  }
};
