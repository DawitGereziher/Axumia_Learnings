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
const enums_1 = require("../common/enums");
let PaymentsService = PaymentsService_1 = class PaymentsService {
    prisma;
    chapa;
    config;
    notificationsQueue;
    payoutsQueue;
    logger = new common_1.Logger(PaymentsService_1.name);
    commissionPct;
    constructor(prisma, chapa, config, notificationsQueue, payoutsQueue) {
        this.prisma = prisma;
        this.chapa = chapa;
        this.config = config;
        this.notificationsQueue = notificationsQueue;
        this.payoutsQueue = payoutsQueue;
        this.commissionPct = parseInt(config.get('PLATFORM_COMMISSION_PERCENT') || '15', 10);
    }
    async onModuleInit() {
        try {
            await this.payoutsQueue.add('cleanup_abandoned_transactions', {}, {
                repeat: { every: 30 * 60 * 1000 },
                jobId: 'cleanup_abandoned_singleton',
                removeOnComplete: { count: 1 },
                removeOnFail: { count: 5 },
            });
            this.logger.log('Registered abandoned transaction cleanup job (every 30 min)');
        }
        catch (err) {
            this.logger.warn('Could not register cleanup job — Redis may not be available yet');
        }
    }
    async checkExistingPaidTransaction(userId, entityType, entityId) {
        const existing = await this.prisma.transaction.findFirst({
            where: {
                user_id: userId,
                status: enums_1.TransactionStatus.PAID,
                metadata: { path: ['entity_type'], equals: entityType },
                AND: { metadata: { path: ['entity_id'], equals: entityId } },
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
        return !chapaKey || chapaKey.includes('mock') || chapaKey.includes('change-me') || chapaKey === '';
    }
    getApiUrls() {
        return {
            frontendUrl: this.config.get('FRONTEND_URL') || 'http://localhost:3002',
            apiUrl: this.config.get('API_PUBLIC_URL') ||
                `http://localhost:${this.config.get('PORT') || 3000}`,
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
        const existingPending = await this.prisma.transaction.findFirst({
            where: {
                user_id: userId,
                status: enums_1.TransactionStatus.PENDING,
                metadata: { path: ['entity_type'], equals: entityType },
                AND: { metadata: { path: ['entity_id'], equals: entityId } },
            },
        });
        if (existingPending) {
            await this.prisma.transaction.update({
                where: { id: existingPending.id },
                data: { status: 'abandoned' },
            });
            this.logger.log(`Marked stale pending transaction as abandoned: ${existingPending.provider_tx_ref}`);
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
                status: enums_1.TransactionStatus.PENDING,
                metadata: {
                    entity_type: entityType,
                    entity_id: entityId,
                    ...(options.extraMetadata || {}),
                },
            },
        });
        if (this.isMockMode()) {
            this.logger.log(`[Mock] Chapa ${entityType} checkout for txRef: ${txRef}`);
            if (options.mockPaymentHandler) {
                await options.mockPaymentHandler(txRef);
            }
            return { checkoutUrl: `${frontendUrl}/payment-success?ref=${txRef}`, txRef };
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
        const course = await this.prisma.course.findUnique({ where: { id: courseId } });
        if (!course)
            throw new common_1.NotFoundException('Course not found');
        return this.initiatePaymentCommon('course', courseId, userId, userEmail, userName, {
            amount: Number(course.price),
            description: `Course: ${course.title}`,
            extraMetadata: { course_slug: course.slug },
            mockPaymentHandler: async (txRef) => {
                const purchase = await this.prisma.coursePurchase.upsert({
                    where: { user_id_course_id: { user_id: userId, course_id: courseId } },
                    create: { user_id: userId, course_id: courseId, amount_paid: Number(course.price) },
                    update: {},
                });
                await this.prisma.transaction.updateMany({
                    where: { provider_tx_ref: txRef, status: enums_1.TransactionStatus.PENDING },
                    data: { status: enums_1.TransactionStatus.PAID, purchase_id: purchase.id },
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
            validateOwnership: async (uid, bid) => {
                const b = await this.prisma.booking.findUnique({ where: { id: bid } });
                if (b?.student_id !== uid)
                    throw new common_1.ForbiddenException('This booking does not belong to you');
            },
            mockPaymentHandler: async (txRef) => {
                await this.prisma.transaction.updateMany({
                    where: { provider_tx_ref: txRef, status: enums_1.TransactionStatus.PENDING },
                    data: { status: enums_1.TransactionStatus.PAID, booking_id: bookingId },
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
            validateOwnership: async (uid, sid) => {
                const s = await this.prisma.helpSession.findUnique({ where: { id: sid } });
                if (s?.student_id !== uid)
                    throw new common_1.ForbiddenException('This session does not belong to you');
            },
            mockPaymentHandler: async (txRef) => {
                await this.prisma.transaction.updateMany({
                    where: { provider_tx_ref: txRef, status: enums_1.TransactionStatus.PENDING },
                    data: { status: enums_1.TransactionStatus.PAID, help_session_id: sessionId },
                });
            },
        });
    }
    async handleChapaWebhook(rawBody, signature) {
        const isValid = this.chapa.verifyWebhookSignature(rawBody, signature);
        if (!isValid) {
            this.logger.warn('Invalid Chapa webhook signature — ignoring');
            return { received: true, status: 'invalid_signature' };
        }
        try {
            const payload = JSON.parse(rawBody);
            const txRef = payload.tx_ref;
            const transaction = await this.prisma.transaction.findFirst({
                where: { provider_tx_ref: txRef },
            });
            if (!transaction) {
                this.logger.warn(`Webhook: transaction not found for tx_ref: ${txRef}`);
                return { received: true, status: 'not_found' };
            }
            if (transaction.status === enums_1.TransactionStatus.PAID) {
                this.logger.log(`Webhook: tx_ref ${txRef} already paid — skipping`);
                return { received: true, status: 'already_paid' };
            }
            const status = await this.updateTransactionStatus(transaction, txRef);
            this.logger.log(`Webhook: tx_ref ${txRef} → ${status}`);
            return { received: true, status };
        }
        catch (err) {
            this.logger.error('Webhook processing error (will not retry):', err);
            return { received: true, status: 'processing_error' };
        }
    }
    async verifyPaymentStatus(txRef, userId) {
        const transaction = await this.prisma.transaction.findFirst({
            where: {
                provider_tx_ref: txRef,
                user_id: userId,
            },
            include: { purchase: true },
        });
        if (!transaction) {
            return { status: 'not_found', txRef };
        }
        if (transaction.status === enums_1.TransactionStatus.PAID ||
            transaction.status === enums_1.TransactionStatus.FAILED) {
            const meta = transaction.metadata;
            return {
                status: transaction.status,
                txRef,
                verified: true,
                entityType: meta?.entity_type ?? null,
                courseSlug: meta?.course_slug ?? null,
            };
        }
        const status = await this.updateTransactionStatus(transaction, txRef);
        const meta = transaction.metadata;
        return {
            status,
            txRef,
            verified: status !== transaction.status,
            entityType: meta?.entity_type ?? null,
            courseSlug: meta?.course_slug ?? null,
        };
    }
    async linkTransactionToEntity(transaction, entityType, entityId, txRef) {
        if (entityType === 'course') {
            const purchase = await this.prisma.coursePurchase.upsert({
                where: { user_id_course_id: { user_id: transaction.user_id, course_id: entityId } },
                create: { user_id: transaction.user_id, course_id: entityId, amount_paid: transaction.amount },
                update: {},
            });
            if (transaction.purchase_id !== purchase.id) {
                await this.prisma.transaction.update({
                    where: { id: transaction.id },
                    data: { purchase_id: purchase.id },
                });
                this.logger.log(`Linked tx ${txRef} → course purchase ${purchase.id}`);
            }
        }
        if (entityType === 'booking') {
            if (transaction.booking_id !== entityId) {
                await this.prisma.transaction.update({
                    where: { id: transaction.id },
                    data: { booking_id: entityId },
                });
            }
            const updated = await this.prisma.booking.updateMany({
                where: { id: entityId, status: 'awaiting_payment' },
                data: { status: 'pending' },
            });
            if (updated.count > 0) {
                this.logger.log(`Booking ${entityId}: awaiting_payment → pending (tx ${txRef})`);
                try {
                    const booking = await this.prisma.booking.findUnique({
                        where: { id: entityId },
                        include: {
                            instructor: { include: { user: true } },
                            student: { select: { first_name: true, last_name: true } },
                        },
                    });
                    if (booking?.instructor.user.email) {
                        await this.notificationsQueue.add('booking_new', {
                            instructorEmail: booking.instructor.user.email,
                            bookingId: entityId,
                            studentName: `${booking.student.first_name || ''} ${booking.student.last_name || ''}`.trim() || 'Student',
                        });
                    }
                }
                catch (notifErr) {
                    this.logger.error(`Failed to notify instructor for booking ${entityId}:`, notifErr);
                }
            }
        }
        if (entityType === 'help_session') {
            if (transaction.help_session_id !== entityId) {
                await this.prisma.transaction.update({
                    where: { id: transaction.id },
                    data: { help_session_id: entityId },
                });
            }
            const updated = await this.prisma.helpSession.updateMany({
                where: { id: entityId, status: 'awaiting_payment' },
                data: { status: 'scheduled' },
            });
            if (updated.count > 0) {
                this.logger.log(`HelpSession ${entityId}: awaiting_payment → scheduled (tx ${txRef})`);
                try {
                    const session = await this.prisma.helpSession.findUnique({
                        where: { id: entityId },
                        include: {
                            helper: { include: { user: true } },
                            request: { select: { title: true } },
                        },
                    });
                    if (session?.helper.user.email) {
                        await this.notificationsQueue.add(queue_constants_1.JOB_PAYMENT_RECEIVED, {
                            email: session.helper.user.email,
                            amount: transaction.amount,
                            currency: 'ETB',
                            itemTitle: `Help Session: ${session.request.title}`,
                        });
                    }
                }
                catch (notifErr) {
                    this.logger.error(`Failed to notify helper for session ${entityId}:`, notifErr);
                }
            }
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
                if (transaction.status !== enums_1.TransactionStatus.PAID) {
                    await this.prisma.transaction.updateMany({
                        where: { id: transaction.id, status: { not: enums_1.TransactionStatus.PAID } },
                        data: { status: enums_1.TransactionStatus.PAID },
                    });
                    try {
                        const user = await this.prisma.user.findUnique({ where: { id: transaction.user_id } });
                        if (user?.email) {
                            await this.notificationsQueue.add(queue_constants_1.JOB_PAYMENT_RECEIVED, {
                                email: user.email,
                                amount: transaction.amount,
                                currency: transaction.currency || 'ETB',
                                itemTitle: metadata?.entity_type || 'Axumia Purchase',
                                phone: user.phone ?? undefined,
                            });
                        }
                    }
                    catch (qErr) {
                        this.logger.error('Failed to queue payment notification:', qErr);
                    }
                }
                return enums_1.TransactionStatus.PAID;
            }
            if (chapaStatus === 'failed' && transaction.status !== enums_1.TransactionStatus.FAILED) {
                await this.prisma.transaction.updateMany({
                    where: { id: transaction.id, status: { not: enums_1.TransactionStatus.FAILED } },
                    data: { status: enums_1.TransactionStatus.FAILED },
                });
                return enums_1.TransactionStatus.FAILED;
            }
        }
        catch (err) {
            this.logger.error(`Failed to verify tx ${txRef} with Chapa:`, err);
        }
        return transaction.status;
    }
    async cleanupAbandonedTransactions() {
        const threshold = new Date(Date.now() - 30 * 60 * 1000);
        const result = await this.prisma.transaction.updateMany({
            where: {
                status: enums_1.TransactionStatus.PENDING,
                created_at: { lt: threshold },
            },
            data: { status: 'abandoned' },
        });
        const abandonedBookingTxs = await this.prisma.transaction.findMany({
            where: { status: 'abandoned', booking_id: { not: null } },
            select: { booking_id: true },
        });
        for (const { booking_id } of abandonedBookingTxs) {
            if (!booking_id)
                continue;
            const booking = await this.prisma.booking.findUnique({ where: { id: booking_id } });
            if (booking?.status === 'awaiting_payment') {
                await this.prisma.$transaction([
                    this.prisma.booking.update({ where: { id: booking_id }, data: { status: 'cancelled' } }),
                    this.prisma.availabilitySlot.update({
                        where: { id: booking.slot_id },
                        data: { current_participants: { decrement: 1 }, is_booked: false },
                    }),
                ]);
                this.logger.log(`Cancelled abandoned booking ${booking_id} and freed slot ${booking.slot_id}`);
            }
        }
        this.logger.log(`Cleanup: marked ${result.count} transactions as abandoned`);
        return { abandoned: result.count };
    }
    async refundTransaction(txRef, requestedByUserId, amount, reason = 'Customer requested refund') {
        const transaction = await this.prisma.transaction.findFirst({
            where: { provider_tx_ref: txRef },
        });
        if (!transaction)
            throw new common_1.NotFoundException(`Transaction not found: ${txRef}`);
        if (transaction.status !== enums_1.TransactionStatus.PAID) {
            throw new common_1.BadRequestException(`Only paid transactions can be refunded. Current status: ${transaction.status}`);
        }
        const refundAmount = amount ?? Number(transaction.amount);
        if (refundAmount <= 0 || refundAmount > Number(transaction.amount)) {
            throw new common_1.BadRequestException(`Refund amount must be between 1 and ${transaction.amount} ETB`);
        }
        if (this.isMockMode()) {
            this.logger.log(`[Mock] Refund ${refundAmount} ETB for tx ${txRef}`);
            await this.prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: 'refunded' },
            });
            return { status: 'success', message: '[Mock] Refund processed', txRef, amount: refundAmount };
        }
        const chapaResult = await this.chapa.refundTransaction(txRef, refundAmount, reason);
        await this.prisma.transaction.update({
            where: { id: transaction.id },
            data: { status: 'refunded' },
        });
        if (transaction.booking_id) {
            const booking = await this.prisma.booking.findUnique({ where: { id: transaction.booking_id } });
            if (booking && !['completed', 'cancelled'].includes(booking.status)) {
                await this.prisma.$transaction([
                    this.prisma.booking.update({ where: { id: booking.id }, data: { status: 'cancelled' } }),
                    this.prisma.availabilitySlot.update({
                        where: { id: booking.slot_id },
                        data: { current_participants: { decrement: 1 }, is_booked: false },
                    }),
                ]);
                this.logger.log(`Booking ${booking.id} cancelled after refund`);
            }
        }
        if (transaction.help_session_id) {
            await this.prisma.helpSession.updateMany({
                where: { id: transaction.help_session_id, status: { not: 'completed' } },
                data: { status: 'cancelled' },
            });
            this.logger.log(`HelpSession ${transaction.help_session_id} cancelled after refund`);
        }
        this.logger.log(`Refund issued: ${refundAmount} ETB for tx ${txRef} (Chapa: ${chapaResult.status})`);
        return { status: chapaResult.status, message: chapaResult.message, txRef, amount: refundAmount };
    }
    async getMyTransactions(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [data, total] = await this.prisma.$transaction([
            this.prisma.transaction.findMany({
                where: { user_id: userId },
                select: {
                    id: true,
                    amount: true,
                    platform_fee: true,
                    status: true,
                    provider_tx_ref: true,
                    created_at: true,
                    currency: true,
                    purchase_id: true,
                    booking_id: true,
                    help_session_id: true,
                },
                orderBy: { created_at: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.transaction.count({ where: { user_id: userId } }),
        ]);
        return { data, total, page, limit };
    }
    async getInstructorEarnings(instructorUserId) {
        const profile = await this.prisma.instructorProfile.findUnique({
            where: { user_id: instructorUserId },
        });
        if (!profile)
            throw new common_1.ForbiddenException('Instructor profile not found');
        const payouts = await this.prisma.payout.findMany({
            where: { instructor_id: profile.id },
            orderBy: { created_at: 'desc' },
        });
        const totalPaidOut = payouts
            .filter((p) => p.status === enums_1.PayoutStatus.PAID)
            .reduce((sum, p) => sum + Number(p.amount), 0);
        const totalPendingPayouts = payouts
            .filter((p) => p.status === enums_1.PayoutStatus.PENDING || p.status === enums_1.PayoutStatus.PROCESSING)
            .reduce((sum, p) => sum + Number(p.amount), 0);
        const coursePurchases = await this.prisma.coursePurchase.findMany({
            where: { course: { instructor_id: profile.id } },
            include: {
                course: true,
                user: { select: { email: true, first_name: true, last_name: true } },
            },
        });
        const grossFromCourses = coursePurchases.reduce((sum, cp) => sum + Number(cp.amount_paid), 0);
        const paidBookingIds = (await this.prisma.transaction.findMany({
            where: {
                status: enums_1.TransactionStatus.PAID,
                booking_id: { not: null },
            },
            select: { booking_id: true },
        }))
            .map((t) => t.booking_id)
            .filter(Boolean);
        const bookings = await this.prisma.booking.findMany({
            where: {
                instructor_id: profile.id,
                status: { in: [enums_1.BookingStatus.CONFIRMED, enums_1.BookingStatus.COMPLETED] },
                id: { in: paidBookingIds },
            },
            include: {
                student: { select: { email: true, first_name: true, last_name: true } },
            },
        });
        const grossFromBookings = bookings.reduce((sum, b) => sum + Number(b.price_paid), 0);
        const grossEarned = grossFromCourses + grossFromBookings;
        const platformFees = +((grossEarned * this.commissionPct) / 100).toFixed(2);
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
                    net: +(Number(cp.amount_paid) * (1 - this.commissionPct / 100)).toFixed(2),
                    date: cp.created_at,
                })),
                ...bookings.map((b) => ({
                    id: b.id,
                    type: 'booking',
                    title: `Tutoring Session (${b.session_type})`,
                    student: b.student.email,
                    amount: Number(b.price_paid),
                    net: +(Number(b.price_paid) * (1 - this.commissionPct / 100)).toFixed(2),
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
        if (!dto.amount || dto.amount <= 0) {
            throw new common_1.BadRequestException('Payout amount must be greater than zero');
        }
        const earnings = await this.getInstructorEarnings(instructorUserId);
        if (dto.amount > earnings.availableBalance) {
            throw new common_1.BadRequestException(`Requested amount (${dto.amount} ETB) exceeds available balance (${earnings.availableBalance} ETB)`);
        }
        const payout = await this.prisma.payout.create({
            data: {
                instructor_id: profile.id,
                amount: dto.amount,
                currency: 'ETB',
                status: enums_1.PayoutStatus.PENDING,
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
        catch {
        }
        return payout;
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, bullmq_1.InjectQueue)(queue_constants_1.QUEUE_NOTIFICATIONS)),
    __param(4, (0, bullmq_1.InjectQueue)(queue_constants_1.QUEUE_PAYOUTS)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        chapa_service_1.ChapaService,
        config_1.ConfigService,
        bullmq_2.Queue,
        bullmq_2.Queue])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map