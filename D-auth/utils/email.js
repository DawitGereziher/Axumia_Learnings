/**
 * D-auth Email Service — Nodemailer-based
 * Configure via environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM
 *
 * Works with any SMTP provider: SendGrid, Postmark, Gmail, self-hosted, etc.
 * Replace `.env` values before deploying.
 */
const nodemailer = require('nodemailer');

function createTransport() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.example.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER || 'your-email@example.com',
            pass: process.env.SMTP_PASS || 'your-smtp-password',
        },
    });
}

function fromAddress(appName) {
    return `"${appName || 'D-auth'}" <${process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com'}>`;
}

async function sendVerificationEmail(to, { name, code, appName }) {
    const transport = createTransport();
    await transport.sendMail({
        from: fromAddress(appName),
        to,
        subject: `Verify your email — ${appName || 'D-auth'}`,
        html: `
            <div style="font-family:sans-serif;max-width:480px;margin:auto;">
                <h2>Hello ${name || 'there'},</h2>
                <p>Your email verification code is:</p>
                <div style="font-size:40px;font-weight:bold;letter-spacing:8px;color:#4F46E5;margin:24px 0;">${code}</div>
                <p style="color:#666;">This code expires in <strong>24 hours</strong>.</p>
                <p style="color:#999;font-size:12px;">If you didn't create an account, you can ignore this email.</p>
            </div>
        `,
    });
}

async function sendPasswordResetEmail(to, { name, resetUrl, appName }) {
    const transport = createTransport();
    await transport.sendMail({
        from: fromAddress(appName),
        to,
        subject: `Reset your password — ${appName || 'D-auth'}`,
        html: `
            <div style="font-family:sans-serif;max-width:480px;margin:auto;">
                <h2>Hello ${name || 'there'},</h2>
                <p>We received a request to reset your password.</p>
                <a href="${resetUrl}"
                   style="display:inline-block;padding:12px 28px;background:#4F46E5;color:#fff;
                          border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">
                    Reset Password
                </a>
                <p style="color:#666;">This link expires in <strong>1 hour</strong>.</p>
                <p style="color:#999;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
        `,
    });
}

async function sendWelcomeEmail(to, { name, appName }) {
    const transport = createTransport();
    await transport.sendMail({
        from: fromAddress(appName),
        to,
        subject: `Welcome to ${appName || 'D-auth'}!`,
        html: `
            <div style="font-family:sans-serif;max-width:480px;margin:auto;">
                <h2>Welcome, ${name || 'there'}! 🎉</h2>
                <p>Your account has been created successfully. We're glad to have you on board.</p>
            </div>
        `,
    });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail };
