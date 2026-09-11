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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const chapa_service_1 = require("./chapa.service");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const queue_constants_1 = require("../queue/queue.constants");
let PaymentsService = PaymentsService_1 = class PaymentsService {
    prisma;
    chapa;
    config;
    notificationsQueue;
    logger = new common_1.Logger(PaymentsService_1.name);
    commissionPct;
    constructor(prisma, chapa, config, notificationsQueue) {
        this.prisma = prisma;
        this.chapa = chapa;
        this.config = config;
        this.notificationsQueue = notificationsQueue;
        this.commissionPct = parseInt(config.get('PLATFORM_COMMISSION_PERCENT') || '15', 10);
    }
    async checkExistingPaidTransaction(userId, entityType, entityId) {
        const existing = await this.prisma.transaction.findFirst({
            where: {
                user_id: userId,
                status: 'paid',
                metadata: {
                    path: ['entity_type'],
                    equals: entityType,
                },
                AND: {
                    metadata: {
                        path: ['entity_id'],
                        equals: entityId,
                    },
                },
            },
        });
        return !!existing;
    }
    generateTxRef(entityType) {
        const prefix = entityType.charAt(0);
        return `${prefix}${Date.now().toString(36)}${(0, crypto_1.randomUUID)().slice(0, 4)}`;
    }
    parseUserName(userName) {
        const [fn, ...ln] = userName.split(' ');
        return { firstName: fn || 'Student', lastName: ln.join(' ') || '' };
    }
    isMockMode() {
        const chapaKey = this.config.get('CHAPA_SECRET_KEY');
        return (!chapaKey ||
            chapaKey.includes('mock') ||
            chapaKey.includes('change-me') ||
            chapaKey === '');
    }
    getApiUrls() {
        return {
            frontendUrl: this.config.get('FRONTEND_URL') || 'http://localhost:3002',
            apiUrl: `http://localhost:${this.config.get('PORT') || 3000}`,
        };
    }
    async initiatePaymentCommon(entityType, entityId, userId, userEmail, userName, options) {
        if (options.validateOwnership) {
            await options.validateOwnership(userId, entityId);
        }
        const alreadyPaid = await this.checkExistingPaidTransaction(userId, entityType, entityId);
        if (alreadyPaid) {
            throw new common_1.ForbiddenException(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} already paid`);
        }
        const existingPendingTransaction = await this.prisma.transaction.findFirst({
            where: {
                user_id: userId,
                status: 'pending',
                metadata: {
                    path: ['entity_type'],
                    equals: entityType,
                },
                AND: {
                    metadata: {
                        path: ['entity_id'],
                        equals: entityId,
                    },
                },
            },
        });
        if (existingPendingTransaction) {
            await this.prisma.transaction.delete({
                where: { id: existingPendingTransaction.id },
            });
            this.logger.log(`Deleted existing pending transaction for retry`);
        }
        const txRef = this.generateTxRef(entityType);
        const fee = +((options.amount * this.commissionPct) / 100).toFixed(2);
        const { firstName, lastName } = this.parseUserName(userName);
        const { frontendUrl, apiUrl } = this.getApiUrls();
        await this.prisma.transaction.create({
            data: {
                user_id: userId,
                amount: options.amount,
                platform_fee: fee,
                provider_tx_ref: txRef,
                status: 'pending',
                metadata: {
                    entity_type: entityType,
                    entity_id: entityId,
                    ...(options.extraMetadata || {}),
                },
            },
        });
        if (this.isMockMode()) {
            this.logger.log(`[PaymentsService] Mocking Chapa ${entityType} checkout for txRef: ${txRef}`);
            if (options.mockPaymentHandler) {
                await options.mockPaymentHandler(txRef);
            }
            return {
                checkoutUrl: `${frontendUrl}/payment-success?ref=${txRef}`,
                txRef,
            };
        }
        const chapaRes = await this.chapa.initiatePayment({
            amount: options.amount,
            email: userEmail,
            first_name: firstName,
            last_name: lastName,
            tx_ref: txRef,
            callback_url: `${apiUrl}/payments/webhook/chapa`,
            return_url: `${frontendUrl}/payment-success?ref=${txRef}`,
            description: options.description,
        });
        return { checkoutUrl: chapaRes.data.checkout_url, txRef };
    }
    async initiateCoursePayment(userId, courseId, userEmail, userName) {
        const course = await this.prisma.course.findUnique({
            where: { id: courseId },
        });
        if (!course)
            throw new common_1.NotFoundException('Course not found');
        return this.initiatePaymentCommon('course', courseId, userId, userEmail, userName, {
            amount: Number(course.price),
            description: `Course: ${course.title}`,
            extraMetadata: { course_slug: course.slug },
            mockPaymentHandler: async (txRef) => {
                const purchase = await this.prisma.coursePurchase.create({
                    data: {
                        user_id: userId,
                        course_id: courseId,
                        amount_paid: Number(course.price),
                    },
                });
                await this.prisma.transaction.updateMany({
                    where: { provider_tx_ref: txRef },
                    data: { status: 'paid', purchase_id: purchase.id },
                });
            },
        });
    }
    async initiateBookingPayment(userId, bookingId, userEmail, userName) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { instructor: true },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        return this.initiatePaymentCommon('booking', bookingId, userId, userEmail, userName, {
            amount: Number(booking.price_paid || booking.instructor.hourly_rate),
            description: `Live tutoring session (${booking.session_type || '1-on-1'})`,
            validateOwnership: async (userId, bookingId) => {
                const booking = await this.prisma.booking.findUnique({
                    where: { id: bookingId },
                });
                if (booking?.student_id !== userId)
                    throw new common_1.ForbiddenException();
            },
            mockPaymentHandler: async (txRef) => {
                await this.prisma.transaction.updateMany({
                    where: { provider_tx_ref: txRef },
                    data: { status: 'paid', booking_id: bookingId },
                });
            },
        });
    }
    async initiateHelpSessionPayment(userId, sessionId, userEmail, userName) {
        const session = await this.prisma.helpSession.findUnique({
            where: { id: sessionId },
            include: { bid: true, request: true },
        });
        if (!session)
            throw new common_1.NotFoundException('Help session not found');
        return this.initiatePaymentCommon('help_session', sessionId, userId, userEmail, userName, {
            amount: Number(session.bid.quoted_rate) * Number(session.bid.estimated_hours),
            description: `Help session: ${session.request.title}`,
            validateOwnership: async (userId, sessionId) => {
                const session = await this.prisma.helpSession.findUnique({
                    where: { id: sessionId },
                });
                if (session?.student_id !== userId)
                    throw new common_1.ForbiddenException();
            },
            mockPaymentHandler: async (txRef) => {
                await this.prisma.transaction.updateMany({
                    where: { provider_tx_ref: txRef },
                    data: { status: 'paid', help_session_id: sessionId },
                });
            },
        });
    }
    async linkTransactionToEntity(transaction, entityType, entityId, txRef) {
        try {
            if (entityType === 'course') {
                let purchase = await this.prisma.coursePurchase.findUnique({
                    where: {
                        user_id_course_id: {
                            user_id: transaction.user_id,
                            course_id: entityId,
                        },
                    },
                });
                if (!purchase) {
                    purchase = await this.prisma.coursePurchase.create({
                        data: {
                            user_id: transaction.user_id,
                            course_id: entityId,
                            amount_paid: transaction.amount,
                        },
                    });
                    this.logger.log(`Created purchase record for course ${entityId} and transaction ${txRef}`);
                }
                if (transaction.purchase_id !== purchase.id) {
                    await this.prisma.transaction.update({
                        where: { id: transaction.id },
                        data: { purchase_id: purchase.id },
                    });
                    this.logger.log(`Linked transaction ${txRef} to purchase ${purchase.id}`);
                }
            }
            if (entityType === 'booking') {
                if (transaction.booking_id !== entityId) {
                    await this.prisma.transaction.update({
                        where: { id: transaction.id },
                        data: { booking_id: entityId },
                    });
                    this.logger.log(`Linked transaction to booking ${entityId} for ${txRef}`);
                }
            }
            if (entityType === 'help_session') {
                if (transaction.help_session_id !== entityId) {
                    await this.prisma.transaction.update({
                        where: { id: transaction.id },
                        data: { help_session_id: entityId },
                    });
                    this.logger.log(`Linked transaction to help session ${entityId} for ${txRef}`);
                }
            }
        }
        catch (error) {
            this.logger.error(`Failed to link transaction to entity for ${txRef}:`, error);
        }
    }
    async updateTransactionStatus(transaction, txRef) {
        try {
            const verified = await this.chapa.verifyTransaction(txRef);
            const chapaStatus = verified.data?.status;
            if (chapaStatus === 'success') {
                const metadata = transaction.metadata;
                if (metadata?.entity_type && metadata?.entity_id) {
                    await this.linkTransactionToEntity(transaction, metadata.entity_type, metadata.entity_id, txRef);
                }
                if (transaction.status !== 'paid') {
                    await this.prisma.transaction.update({
                        where: { id: transaction.id },
                        data: { status: 'paid' },
                    });
                    try {
                        const user = await this.prisma.user.findUnique({
                            where: { id: transaction.user_id },
                        });
                        if (user?.email) {
                            await this.notificationsQueue.add(queue_constants_1.JOB_PAYMENT_RECEIVED, {
                                email: user.email,
                                amount: transaction.amount,
                                currency: transaction.currency || 'ETB',
                                itemTitle: metadata?.entity_type || 'EthioLearn Purchase',
                                phone: user.phone || undefined,
                            });
                        }
                    }
                    catch (qErr) {
                        this.logger.error('Failed to queue payment notification job', qErr);
                    }
                }
                return 'paid';
            }
            else if (chapaStatus === 'failed' && transaction.status !== 'failed') {
                await this.prisma.transaction.update({
                    where: { id: transaction.id },
                    data: { status: 'failed' },
                });
                return 'failed';
            }
        }
        catch (error) {
            this.logger.error(`Failed to verify transaction status for ${txRef}:`, error);
        }
        return transaction.status;
    }
    async handleChapaWebhook(rawBody, signature) {
        const isValid = this.chapa.verifyWebhookSignature(rawBody, signature);
        if (!isValid) {
            this.logger.warn('Invalid Chapa webhook signature received');
            return { received: false };
        }
        const payload = JSON.parse(rawBody);
        const txRef = payload.tx_ref;
        const transaction = await this.prisma.transaction.findFirst({
            where: { provider_tx_ref: txRef },
        });
        if (!transaction) {
            this.logger.warn(`Transaction not found for tx_ref: ${txRef}`);
            return { received: true, status: 'not_found' };
        }
        const status = await this.updateTransactionStatus(transaction, txRef);
        this.logger.log(`Payment webhook processed for tx_ref: ${txRef} with status: ${status}`);
        return { received: true, status };
    }
    async verifyPaymentStatus(txRef) {
        const transaction = await this.prisma.transaction.findFirst({
            where: { provider_tx_ref: txRef },
            include: { purchase: true },
        });
        if (!transaction) {
            return { status: 'not_found', txRef };
        }
        const status = await this.updateTransactionStatus(transaction, txRef);
        const verified = status !== transaction.status;
        const meta = transaction.metadata;
        return {
            status,
            txRef,
            verified,
            entityType: meta?.entity_type ?? null,
            courseSlug: meta?.course_slug ?? null,
        };
    }
    async cleanupAbandonedTransactions() {
        const threshold = new Date(Date.now() - 30 * 60 * 1000);
        const abandonedTransactions = await this.prisma.transaction.findMany({
            where: {
                status: 'pending',
                created_at: { lt: threshold },
            },
        });
        for (const transaction of abandonedTransactions) {
            this.logger.log(`Cleaning up abandoned transaction: ${transaction.provider_tx_ref}`);
            await this.prisma.transaction.delete({ where: { id: transaction.id } });
        }
        return { cleaned: abandonedTransactions.length };
    }
    async getMyTransactions(userId) {
        return this.prisma.transaction.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' },
        });
    }
    async getInstructorEarnings(instructorUserId) {
        const profile = await this.prisma.instructorProfile.findUnique({
            where: { user_id: instructorUserId },
        });
        if (!profile)
            throw new common_1.ForbiddenException('Not an instructor profile');
        const payouts = await this.prisma.payout.findMany({
            where: { instructor_id: profile.id },
            orderBy: { created_at: 'desc' },
        });
        const totalPaidOut = payouts
            .filter((p) => p.status === 'paid')
            .reduce((sum, p) => sum + Number(p.amount), 0);
        const totalPendingPayouts = payouts
            .filter((p) => p.status === 'pending' || p.status === 'processing')
            .reduce((sum, p) => sum + Number(p.amount), 0);
        const coursePurchases = await this.prisma.coursePurchase.findMany({
            where: { course: { instructor_id: profile.id } },
            include: {
                course: true,
                user: { select: { email: true, first_name: true, last_name: true } },
            },
        });
        const grossFromCourses = coursePurchases.reduce((sum, cp) => sum + Number(cp.amount_paid), 0);
        const bookings = await this.prisma.booking.findMany({
            where: {
                instructor_id: profile.id,
                status: { in: ['confirmed', 'completed'] },
            },
            include: {
                student: { select: { email: true, first_name: true, last_name: true } },
            },
        });
        const grossFromBookings = bookings.reduce((sum, b) => sum + Number(b.price_paid), 0);
        const grossEarned = grossFromCourses + grossFromBookings;
        const platformFees = +(grossEarned * (this.commissionPct / 100)).toFixed(2);
        const netEarned = +(grossEarned - platformFees).toFixed(2);
        const availableBalance = Math.max(0, +(netEarned - totalPaidOut - totalPendingPayouts).toFixed(2));
        return {
            grossEarned,
            platformFees,
            netEarned,
            totalPaidOut,
            totalPendingPayouts,
            availableBalance,
            payouts,
            earningsLedger: [
                ...coursePurchases.map((cp) => ({
                    id: cp.id,
                    type: 'course_purchase',
                    title: cp.course.title,
                    student: cp.user.email,
                    amount: Number(cp.amount_paid),
                    net: +(Number(cp.amount_paid) *
                        (1 - this.commissionPct / 100)).toFixed(2),
                    date: cp.created_at,
                })),
                ...bookings.map((b) => ({
                    id: b.id,
                    type: 'booking',
                    title: `Tutoring Session (${b.session_type})`,
                    student: b.student.email,
                    amount: Number(b.price_paid),
                    net: +(Number(b.price_paid) *
                        (1 - this.commissionPct / 100)).toFixed(2),
                    date: b.created_at,
                })),
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        };
    }
    async requestInstructorPayout(instructorUserId, dto) {
        const profile = await this.prisma.instructorProfile.findUnique({
            where: { user_id: instructorUserId },
            include: { user: true },
        });
        if (!profile)
            throw new common_1.ForbiddenException('Instructor profile not found');
        const earnings = await this.getInstructorEarnings(instructorUserId);
        if (dto.amount <= 0) {
            throw new common_1.BadRequestException('Payout amount must be greater than zero');
        }
        if (dto.amount > earnings.availableBalance) {
            throw new common_1.BadRequestException(`Requested amount (${dto.amount} ETB) exceeds available balance (${earnings.availableBalance} ETB)`);
        }
        const payout = await this.prisma.payout.create({
            data: {
                instructor_id: profile.id,
                amount: dto.amount,
                currency: 'ETB',
                status: 'pending',
                method: dto.method || 'telebirr',
                account_details: dto.account_details,
            },
        });
        try {
            if (profile.user?.email) {
                await this.notificationsQueue.add(queue_constants_1.JOB_PAYMENT_RECEIVED, {
                    email: profile.user.email,
                    amount: dto.amount,
                    currency: 'ETB',
                    itemTitle: `Payout Request (${dto.method})`,
                });
            }
        }
        catch { }
        return payout;
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, bullmq_1.InjectQueue)(queue_constants_1.QUEUE_NOTIFICATIONS)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        chapa_service_1.ChapaService,
        config_1.ConfigService,
        bullmq_2.Queue])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map