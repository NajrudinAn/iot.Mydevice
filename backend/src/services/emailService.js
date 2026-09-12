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
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                            background-color: #f1f5f9; 
                            margin: 0; 
                            padding: 40px 20px; 
                        }
                        .container { 
                            max-width: 520px; 
                            margin: 0 auto; 
                            background-color: #ffffff; 
                            border-radius: 24px; 
                            overflow: hidden; 
                            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); 
                            border: 1px solid #e2e8f0; 
                        }
                        .header { 
                            background-color: #ffffff; 
                            padding: 40px 40px 20px 40px; 
                            text-align: center; 
                            border-bottom: 1px solid #f1f5f9;
                        }
                        .header h1 { 
                            margin: 0; 
                            color: #0f172a; 
                            font-size: 22px; 
                            font-weight: 800; 
                            letter-spacing: -0.5px; 
                        }
                        .content { 
                            padding: 30px 40px 40px 40px; 
                            color: #334155; 
                            line-height: 1.7; 
                        }
                        .content p { 
                            margin: 0 0 20px 0; 
                            font-size: 15px; 
                            color: #475569;
                        }
                        .content p.greeting {
                            font-size: 18px;
                            font-weight: 700;
                            color: #0f172a;
                            margin-bottom: 16px;
                        }
                        .button-wrap { 
                            text-align: center; 
                            margin: 36px 0; 
                        }
                        .button { 
                            display: inline-block; 
                            background-color: #0f172a; 
                            color: #ffffff; 
                            padding: 14px 32px; 
                            text-decoration: none; 
                            border-radius: 9999px; 
                            font-weight: 600; 
                            font-size: 15px; 
                            letter-spacing: 0.3px;
                            box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.2); 
                            transition: all 0.2s;
                        }
                        .footer { 
                            background-color: #f8fafc; 
                            padding: 30px 40px; 
                            text-align: center; 
                            border-top: 1px solid #e2e8f0; 
                        }
                        .muted { 
                            color: #64748b; 
                            font-size: 13px; 
                            margin: 0;
                            line-height: 1.5;
                        }
                        .footer-links {
                            margin-top: 16px;
                        }
                        .footer-links a {
                            color: #94a3b8;
                            text-decoration: none;
                            font-size: 12px;
                            margin: 0 8px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <img src="cid:logo" alt="MyDevice Logo" style="width: 56px; height: 56px; border-radius: 12px; margin-bottom: 16px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);" />
                            <h1>MyDevice Platform</h1>
                        </div>
                        <div class="content">
                            <p class="greeting">Hi there,</p>
                            <p>We received a request to reset your password for your MyDevice account. If you initiated this request, you can set a new password by clicking the button below.</p>
                            
                            <div class="button-wrap">
                                <a href="${resetUrl}" class="button">Reset Password</a>
                            </div>
                            
                            <p class="muted">If you didn't request a password reset, you can safely ignore this email. Your password won't change until you create a new one.</p>
                            <p class="muted" style="margin-top: 8px;">This secure link will expire in 1 hour.</p>
                        </div>
                        <div class="footer">
                            <p class="muted">&copy; ${new Date().getFullYear()} MyDevice IoT Platform. All rights reserved.</p>
                            <div class="footer-links">
                                <a href="#">Security</a>
                                <a href="#">Privacy</a>
                                <a href="#">Terms</a>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `,
            attachments: [{
                filename: 'logo.png',
                path: require('path').join(__dirname, '../../../../frontend/public/logo.png'),
                cid: 'logo' // same cid value as in the html img src
            }]
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
