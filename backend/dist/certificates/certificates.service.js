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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertificatesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const storage_service_1 = require("../storage/storage.service");
const pdfkit_1 = __importDefault(require("pdfkit"));
let CertificatesService = class CertificatesService {
    prisma;
    storage;
    constructor(prisma, storage) {
        this.prisma = prisma;
        this.storage = storage;
    }
    async buildCertificatePdfBuffer(data) {
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({
                layout: 'landscape',
                size: 'A4',
                margin: 0,
            });
            const buffers = [];
            doc.on('data', (chunk) => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', (err) => reject(err));
            const width = doc.page.width;
            const height = doc.page.height;
            doc.rect(0, 0, width, height).fill('#080a0f');
            doc
                .rect(20, 20, width - 40, height - 40)
                .lineWidth(3)
                .stroke('#d4af37');
            doc
                .rect(28, 28, width - 56, height - 56)
                .lineWidth(1)
                .stroke('rgba(212,175,55,0.4)');
            doc.fillColor('#d4af37').fontSize(14).text('AXUMIA LEARNINGS', 0, 75, {
                align: 'center',
                characterSpacing: 3,
            });
            doc.fillColor('#f8fafc').fontSize(28).text('CERTIFICATE OF COMPLETION', 0, 105, {
                align: 'center',
                characterSpacing: 2,
            });
            doc.fillColor('#94a3b8').fontSize(13).text('This is to certify that', 0, 160, {
                align: 'center',
            });
            doc.fillColor('#6366f1').fontSize(32).text(data.studentName, 0, 195, {
                align: 'center',
            });
            doc.fillColor('#94a3b8').fontSize(13).text('has successfully completed the online course', 0, 250, {
                align: 'center',
            });
            doc.fillColor('#f8fafc').fontSize(22).text(data.courseTitle, 0, 285, {
                align: 'center',
            });
            const yOffset = 370;
            doc.fillColor('#94a3b8').fontSize(11).text('Date Issued', 100, yOffset);
            doc.fillColor('#f8fafc').fontSize(12).text(data.dateStr, 100, yOffset + 18);
            doc.fillColor('#94a3b8').fontSize(11).text('Certificate ID', width / 2 - 80, yOffset, { align: 'center', width: 160 });
            doc.fillColor('#d4af37').fontSize(12).text(data.certificateNumber, width / 2 - 100, yOffset + 18, { align: 'center', width: 200 });
            doc.fillColor('#94a3b8').fontSize(11).text('Instructor Signature', width - 250, yOffset, { align: 'right', width: 150 });
            doc.fillColor('#f8fafc').fontSize(12).text(data.instructorName, width - 250, yOffset + 18, { align: 'right', width: 150 });
            doc.fillColor('rgba(212,175,55,0.6)').fontSize(10).text('VERIFIED & SECURED BY AXUMIA R2 SYSTEM', 0, height - 55, {
                align: 'center',
            });
            doc.end();
        });
    }
    async getOrCreateCertificate(userId, courseId) {
        const purchase = await this.prisma.coursePurchase.findUnique({
            where: { user_id_course_id: { user_id: userId, course_id: courseId } },
            include: {
                user: true,
                course: { include: { instructor: { include: { user: true } }, lessons: { where: { is_published: true } } } },
            },
        });
        if (!purchase) {
            throw new common_1.ForbiddenException('You must be enrolled in this course to claim a certificate');
        }
        const publishedLessons = purchase.course.lessons;
        if (publishedLessons.length > 0) {
            const completedRows = await this.prisma.lessonProgress.findMany({
                where: { purchase_id: purchase.id, completed: true },
            });
            const completedIds = new Set(completedRows.map((r) => r.lesson_id));
            const allComplete = publishedLessons.every((l) => completedIds.has(l.id));
            if (!allComplete) {
                const completedCount = completedIds.size;
                throw new common_1.ForbiddenException(`You must complete all lessons first. (${completedCount}/${publishedLessons.length} completed)`);
            }
            const enrolledAt = purchase.created_at;
            const minElapsedMs = publishedLessons.length * 2 * 60 * 1000;
            if (Date.now() - new Date(enrolledAt).getTime() < minElapsedMs) {
                throw new common_1.ForbiddenException('Course completed too quickly. Please take more time with the material.');
            }
        }
        let cert = await this.prisma.certificate.findUnique({
            where: { user_id_course_id: { user_id: userId, course_id: courseId } },
        });
        if (!cert) {
            const certNum = `AXM-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
            const studentName = `${purchase.user.first_name || ''} ${purchase.user.last_name || ''}`.trim() || purchase.user.email;
            const instructorName = `${purchase.course.instructor.user.first_name || ''} ${purchase.course.instructor.user.last_name || ''}`.trim() || 'AXumia Instructor';
            const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            const pdfBuffer = await this.buildCertificatePdfBuffer({
                studentName,
                courseTitle: purchase.course.title,
                instructorName,
                certificateNumber: certNum,
                dateStr,
            });
            const pdfKey = `certificates/${certNum}.pdf`;
            await this.storage.uploadBuffer(pdfBuffer, 'private', pdfKey, 'application/pdf');
            cert = await this.prisma.certificate.create({
                data: {
                    certificate_number: certNum,
                    user_id: userId,
                    course_id: courseId,
                    pdf_key: pdfKey,
                },
            });
        }
        let downloadUrl = null;
        if (cert.pdf_key) {
            downloadUrl = await this.storage.getSignedUrl(cert.pdf_key);
        }
        return { ...cert, downloadUrl };
    }
    async verifyCertificate(certificateNumber) {
        const cert = await this.prisma.certificate.findUnique({
            where: { certificate_number: certificateNumber },
        });
        if (!cert)
            throw new common_1.NotFoundException('Certificate not found');
        const user = await this.prisma.user.findUnique({ where: { id: cert.user_id }, select: { first_name: true, last_name: true } });
        const course = await this.prisma.course.findUnique({ where: { id: cert.course_id }, select: { title: true } });
        return {
            certificate_number: cert.certificate_number,
            issued_at: cert.issued_at,
            student_name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
            course_title: course?.title || 'Course',
            valid: true,
        };
    }
};
exports.CertificatesService = CertificatesService;
exports.CertificatesService = CertificatesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        storage_service_1.StorageService])
], CertificatesService);
//# sourceMappingURL=certificates.service.js.map