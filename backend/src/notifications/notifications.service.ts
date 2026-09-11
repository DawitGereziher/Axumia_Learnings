import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export interface SmsOptions {
  phone: string;
  message: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transport: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transport = nodemailer.createTransport({
      host: config.get('SMTP_HOST') || 'smtp.gmail.com',
      port: parseInt(config.get('SMTP_PORT') || '587'),
      secure: config.get('SMTP_SECURE') === 'true',
      auth: {
        user: config.get('SMTP_USER') || '',
        pass: config.get('SMTP_PASS') || '',
      },
    });
  }

  private from() {
    return `"EthioLearn Platform" <${this.config.get('SMTP_FROM') || this.config.get('SMTP_USER') || 'noreply@ethiolearn.com'}>`;
  }

  private wrapHtmlTemplate(title: string, bodyHtml: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Segoe UI', Helvetica, Arial, sans-serif; color: #f8fafc;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
                <!-- Header Banner -->
                <tr>
                  <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">
                      EthioLearn <span style="font-weight: 300; opacity: 0.9;">ኢትዮ-learn</span>
                    </h1>
                    <p style="margin: 6px 0 0; color: rgba(255, 255, 255, 0.85); font-size: 14px;">Ethiopia's Premier Digital Learning Platform</p>
                  </td>
                </tr>
                <!-- Content Body -->
                <tr>
                  <td style="padding: 36px 32px; color: #e2e8f0; font-size: 15px; line-height: 1.6;">
                    ${bodyHtml}
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color: #0f172a; padding: 24px 32px; text-align: center; border-top: 1px solid #334155; color: #64748b; font-size: 12px;">
                    <p style="margin: 0 0 8px;">© ${new Date().getFullYear()} EthioLearn Platform. All rights reserved.</p>
                    <p style="margin: 0;">Addis Ababa, Ethiopia · Live Interactive Education</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  // ── Send Raw Email ──────────────────────────────────────────────────────────
  async sendEmail(to: string, subject: string, html: string) {
    try {
      const fullHtml = this.wrapHtmlTemplate(subject, html);
      if (!this.config.get('SMTP_USER')) {
        this.logger.warn(`[SMTP Mock] Email to ${to} | Subject: ${subject}`);
        return;
      }
      await this.transport.sendMail({ from: this.from(), to, subject, html: fullHtml });
      this.logger.log(`[Email Sent] To: ${to} | Subject: ${subject}`);
    } catch (err: any) {
      this.logger.error(`[Email Failed] To: ${to} | Error: ${err.message}`);
    }
  }

  // ── Send SMS via AfroMessage ────────────────────────────────────────────────
  async sendSms(phone: string, message: string) {
    const token = this.config.get<string>('AFROMESSAGE_TOKEN') || this.config.get<string>('AFROMESSAGE_API_KEY');
    const senderId = this.config.get<string>('AFROMESSAGE_SENDER_ID');

    if (!token) {
      this.logger.log(`[AfroMessage Mock SMS] To: ${phone} | Text: "${message}"`);
      return;
    }

    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+251${phone.replace(/^0/, '')}`;
      const response = await fetch('https://api.afromessage.com/api/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: formattedPhone,
          message: message,
          sender: senderId || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.acknowledge !== 'success') {
        throw new Error(data.response?.errors?.[0] || data.message || 'AfroMessage API error');
      }

      this.logger.log(`[AfroMessage SMS Sent] To: ${formattedPhone}`);
    } catch (err: any) {
      this.logger.error(`[AfroMessage SMS Failed] To: ${phone} | Error: ${err.message}`);
    }
  }

  // ── Standard Notification Templates ────────────────────────────────────────

  async sendWelcomeEmail(to: string, name: string) {
    const html = `
      <h2 style="color: #ffffff; font-size: 20px; margin-top: 0;">Welcome to EthioLearn, ${name}! 👋</h2>
      <p>We're thrilled to have you join Ethiopia's fastest-growing online learning community.</p>
      <p>Here is what you can do right away:</p>
      <ul style="padding-left: 20px; color: #cbd5e1;">
        <li><strong>Browse Courses:</strong> Explore top-tier technology, business, and language courses taught in Amharic & English.</li>
        <li><strong>Book Live Sessions:</strong> Schedule 1-on-1 or group live tutoring sessions with verified instructors.</li>
        <li><strong>Earn Certificates:</strong> Complete courses and get verified digital certificates.</li>
      </ul>
      <div style="margin: 28px 0; text-align: center;">
        <a href="${this.config.get('FRONTEND_URL') || 'http://localhost:3000'}/courses" style="background: #4f46e5; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block;">Explore Courses Now</a>
      </div>
    `;
    await this.sendEmail(to, 'Welcome to EthioLearn! 🎉', html);
  }

  async notifyInstructorNewBooking(instructorEmail: string, bookingId: string, studentName?: string) {
    const html = `
      <h2 style="color: #ffffff; font-size: 20px; margin-top: 0;">New Booking Request Received 📅</h2>
      <p>Hello! A student (${studentName || 'Student'}) has requested a live tutoring session with you on EthioLearn.</p>
      <p>Please log into your instructor dashboard to confirm the session and provide your Google Meet or Zoom link.</p>
      <div style="margin: 28px 0; text-align: center;">
        <a href="${this.config.get('FRONTEND_URL') || 'http://localhost:3000'}/dashboard" style="background: #10b981; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block;">Confirm Booking</a>
      </div>
    `;
    await this.sendEmail(instructorEmail, 'New Live Tutoring Booking Request', html);
  }

  async notifyStudentBookingConfirmed(studentEmail: string, meetingLink: string, slotTime?: string, studentPhone?: string) {
    const html = `
      <h2 style="color: #ffffff; font-size: 20px; margin-top: 0;">Your Session is Confirmed! 🎉</h2>
      <p>Great news! Your instructor has confirmed your live tutoring session.</p>
      <div style="background-color: #0f172a; border-left: 4px solid #10b981; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0; font-weight: 600; color: #f8fafc;">Session Time: ${slotTime || 'Scheduled Slot'}</p>
        <p style="margin: 6px 0 0; color: #94a3b8; font-size: 14px;">Please join 5 minutes before the start time.</p>
      </div>
      <div style="margin: 28px 0; text-align: center;">
        <a href="${meetingLink}" style="background: #10b981; color: #ffffff; padding: 14px 32px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block;">Join Live Session 📹</a>
      </div>
    `;
    await this.sendEmail(studentEmail, 'Booking Confirmed — Live Session Link Inside', html);

    if (studentPhone) {
      const smsText = `EthioLearn: Your live session is confirmed! Join link: ${meetingLink}`;
      await this.sendSms(studentPhone, smsText);
    }
  }

  async notifySessionReminder(email: string, meetingLink: string, timeLabel: string, phone?: string) {
    const html = `
      <h2 style="color: #ffffff; font-size: 20px; margin-top: 0;">Session Reminder (${timeLabel}) ⏰</h2>
      <p>Your upcoming live tutoring session starts <strong>${timeLabel}</strong>!</p>
      <div style="margin: 28px 0; text-align: center;">
        <a href="${meetingLink}" style="background: #4f46e5; color: #ffffff; padding: 14px 32px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block;">Join Live Session</a>
      </div>
    `;
    await this.sendEmail(email, `Session Reminder: Starting ${timeLabel}`, html);

    if (phone) {
      await this.sendSms(phone, `EthioLearn Reminder: Your session starts ${timeLabel}! Join: ${meetingLink}`);
    }
  }

  async notifyPaymentReceived(email: string, amount: number, currency: string, itemTitle?: string, phone?: string) {
    const html = `
      <h2 style="color: #ffffff; font-size: 20px; margin-top: 0;">Payment Confirmation ✅</h2>
      <p>Thank you! Your payment has been processed successfully via Chapa.</p>
      <div style="background-color: #0f172a; border: 1px solid #334155; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #94a3b8; font-size: 13px;">ITEM / COURSE</p>
        <p style="margin: 4px 0 12px; font-weight: 700; color: #ffffff; font-size: 16px;">${itemTitle || 'EthioLearn Purchase'}</p>
        <p style="margin: 0; color: #94a3b8; font-size: 13px;">AMOUNT PAID</p>
        <p style="margin: 4px 0 0; font-weight: 800; color: #34d399; font-size: 20px;">${amount} ${currency}</p>
      </div>
      <div style="margin: 28px 0; text-align: center;">
        <a href="${this.config.get('FRONTEND_URL') || 'http://localhost:3000'}/dashboard" style="background: #4f46e5; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block;">Go to My Dashboard</a>
      </div>
    `;
    await this.sendEmail(email, `Payment Receipt — ${amount} ${currency}`, html);

    if (phone) {
      await this.sendSms(phone, `EthioLearn: Payment of ${amount} ${currency} received for ${itemTitle || 'your purchase'}. Thank you!`);
    }
  }

  async notifyInstructorPayout(email: string, amount: number, currency: string, phone?: string) {
    const html = `
      <h2 style="color: #ffffff; font-size: 20px; margin-top: 0;">Instructor Payout Released 💸</h2>
      <p>Great news! Your payout of <strong>${amount} ${currency}</strong> has been processed and transferred.</p>
    `;
    await this.sendEmail(email, `Payout Released — ${amount} ${currency}`, html);

    if (phone) {
      await this.sendSms(phone, `EthioLearn: Payout of ${amount} ${currency} has been transferred to your account.`);
    }
  }

  async notifyCoursePublished(instructorEmail: string, courseTitle: string) {
    const html = `
      <h2 style="color: #ffffff; font-size: 20px; margin-top: 0;">Course Live on EthioLearn! 🚀</h2>
      <p>Congratulations! Your course <strong>${courseTitle}</strong> is now officially published and accessible to students across Ethiopia.</p>
    `;
    await this.sendEmail(instructorEmail, `Course Published: ${courseTitle}`, html);
  }

  async notifyBidAccepted(email: string, requestTitle: string) {
    const html = `
      <h2 style="color: #ffffff; font-size: 20px; margin-top: 0;">Tutoring Proposal Accepted! 🎉</h2>
      <p>Great news! A student has accepted your bid for <strong>${requestTitle}</strong>.</p>
    `;
    await this.sendEmail(email, `Bid Accepted: ${requestTitle}`, html);
  }
}
