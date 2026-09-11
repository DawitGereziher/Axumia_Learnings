"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationsProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const notifications_service_1 = require("./notifications.service");
const queue_constants_1 = require("../queue/queue.constants");
let NotificationsProcessor = NotificationsProcessor_1 = class NotificationsProcessor extends bullmq_1.WorkerHost {
    notificationsService;
    logger = new common_1.Logger(NotificationsProcessor_1.name);
    constructor(notificationsService) {
        super();
        this.notificationsService = notificationsService;
    }
    async process(job) {
        this.logger.log(`Processing notification job: ${job.name} [id=${job.id}]`);
        switch (job.name) {
            case queue_constants_1.JOB_BOOKING_NEW: {
                const { instructorEmail, bookingId, studentName } = job.data;
                await this.notificationsService.notifyInstructorNewBooking(instructorEmail, bookingId, studentName);
                break;
            }
            case queue_constants_1.JOB_BOOKING_CONFIRMED: {
                const { studentEmail, meetingLink, slotTime, studentPhone } = job.data;
                await this.notificationsService.notifyStudentBookingConfirmed(studentEmail, meetingLink, slotTime, studentPhone);
                break;
            }
            case queue_constants_1.JOB_BOOKING_REMINDER_24H: {
                const { email, meetingLink, phone } = job.data;
                await this.notificationsService.notifySessionReminder(email, meetingLink, 'in 24 hours', phone);
                break;
            }
            case queue_constants_1.JOB_BOOKING_REMINDER_1H: {
                const { email, meetingLink, phone } = job.data;
                await this.notificationsService.notifySessionReminder(email, meetingLink, 'in 1 hour', phone);
                break;
            }
            case queue_constants_1.JOB_PAYMENT_RECEIVED: {
                const { email, amount, currency, itemTitle, phone } = job.data;
                await this.notificationsService.notifyPaymentReceived(email, amount, currency || 'ETB', itemTitle, phone);
                break;
            }
            case queue_constants_1.JOB_PAYOUT_PROCESSED: {
                const { email, amount, currency, phone } = job.data;
                await this.notificationsService.notifyInstructorPayout(email, amount, currency || 'ETB', phone);
                break;
            }
            case queue_constants_1.JOB_EMAIL: {
                const { to, subject, html } = job.data;
                await this.notificationsService.sendEmail(to, subject, html);
                break;
            }
            case queue_constants_1.JOB_SMS: {
                const { phone, message } = job.data;
                await this.notificationsService.sendSms(phone, message);
                break;
            }
            default:
                this.logger.warn(`Unknown job type in notifications queue: ${job.name}`);
        }
    }
};
exports.NotificationsProcessor = NotificationsProcessor;
exports.NotificationsProcessor = NotificationsProcessor = NotificationsProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(queue_constants_1.QUEUE_NOTIFICATIONS),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService])
], NotificationsProcessor);
//# sourceMappingURL=notifications.processor.js.map