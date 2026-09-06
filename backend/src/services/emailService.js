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
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                    <h2 style="color: #2563eb;">Password Reset Request</h2>
                    <p>You requested a password reset. Please click the button below to reset your password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
                    </div>
                    <p>If you did not request this, you can safely ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #666;">This link will expire in 1 hour.</p>
                </div>
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
