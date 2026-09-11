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
export declare class NotificationsService {
    private config;
    private readonly logger;
    private transport;
    constructor(config: ConfigService);
    private from;
    private wrapHtmlTemplate;
    sendEmail(to: string, subject: string, html: string): Promise<void>;
    sendSms(phone: string, message: string): Promise<void>;
    sendWelcomeEmail(to: string, name: string): Promise<void>;
    notifyInstructorNewBooking(instructorEmail: string, bookingId: string, studentName?: string): Promise<void>;
    notifyStudentBookingConfirmed(studentEmail: string, meetingLink: string, slotTime?: string, studentPhone?: string): Promise<void>;
    notifySessionReminder(email: string, meetingLink: string, timeLabel: string, phone?: string): Promise<void>;
    notifyPaymentReceived(email: string, amount: number, currency: string, itemTitle?: string, phone?: string): Promise<void>;
    notifyInstructorPayout(email: string, amount: number, currency: string, phone?: string): Promise<void>;
    notifyCoursePublished(instructorEmail: string, courseTitle: string): Promise<void>;
    notifyBidAccepted(email: string, requestTitle: string): Promise<void>;
}
