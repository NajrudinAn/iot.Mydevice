const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'localhost',
            port: process.env.SMTP_PORT || 1025,
            secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
            auth: process.env.SMTP_USER ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            } : undefined,
            // Allow self-signed certs for local development/testing
            tls: {
                rejectUnauthorized: false
            },
            // Force IPv4 to prevent connection timeouts when Node defaults to IPv6
            family: 4
        });
        this.fromAddress = process.env.SMTP_FROM || 'noreply@MyDevice.in';
    }

    async sendPasswordResetEmail(toEmail, resetUrl) {
        const mailOptions = {
            from: `"MyDevice Platform" <${this.fromAddress}>`,
            to: toEmail,
            subject: 'Password Reset Request - MyDevice',
            text: `You requested a password reset. Please click the following link to reset your password: \n\n${resetUrl}\n\nIf you did not request this, please ignore this email.`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0; }
                        .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 24px; text-align: center; }
                        .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
                        .content { padding: 40px 32px; color: #334155; line-height: 1.6; }
                        .content p { margin: 0 0 16px 0; font-size: 16px; }
                        .button-wrap { text-align: center; margin: 32px 0; }
                        .button { display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2); }
                        .footer { background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 13px; }
                        .muted { color: #64748b; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>MyDevice</h1>
                        </div>
                        <div class="content">
                            <p>Hello,</p>
                            <p>We received a request to reset your password for your MyDevice account. Click the button below to set a new password.</p>
                            
                            <div class="button-wrap">
                                <a href="${resetUrl}" class="button">Reset Password</a>
                            </div>
                            
                            <p class="muted">If you did not request a password reset, no further action is required. This link will expire in 1 hour.</p>
                        </div>
                        <div class="footer">
                            <p style="margin:0;">&copy; ${new Date().getFullYear()} MyDevice IoT Platform. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('Password reset email sent: %s', info.messageId);
            return info;
        } catch (error) {
            console.error('Error sending password reset email:', error);
            throw error;
        }
    }
}

module.exports = new EmailService();
