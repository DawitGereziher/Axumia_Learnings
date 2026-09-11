import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import PDFDocument from 'pdfkit';

@Injectable()
export class CertificatesService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  private async buildCertificatePdfBuffer(data: {
    studentName: string;
    courseTitle: string;
    instructorName: string;
    certificateNumber: string;
    dateStr: string;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        layout: 'landscape',
        size: 'A4',
        margin: 0,
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const width = doc.page.width;
      const height = doc.page.height;

      // Dark background
      doc.rect(0, 0, width, height).fill('#080a0f');

      // Outer Gold Border
      doc
        .rect(20, 20, width - 40, height - 40)
        .lineWidth(3)
        .stroke('#d4af37');

      // Inner Accent Border
      doc
        .rect(28, 28, width - 56, height - 56)
        .lineWidth(1)
        .stroke('rgba(212,175,55,0.4)');

      // Top Title Banner
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

      // Student Name
      doc.fillColor('#6366f1').fontSize(32).text(data.studentName, 0, 195, {
        align: 'center',
      });

      doc.fillColor('#94a3b8').fontSize(13).text('has successfully completed the online course', 0, 250, {
        align: 'center',
      });

      // Course Title
      doc.fillColor('#f8fafc').fontSize(22).text(data.courseTitle, 0, 285, {
        align: 'center',
      });

      // Details Footer
      const yOffset = 370;

      // Date Left
      doc.fillColor('#94a3b8').fontSize(11).text('Date Issued', 100, yOffset);
      doc.fillColor('#f8fafc').fontSize(12).text(data.dateStr, 100, yOffset + 18);

      // Certificate Number Center
      doc.fillColor('#94a3b8').fontSize(11).text('Certificate ID', width / 2 - 80, yOffset, { align: 'center', width: 160 });
      doc.fillColor('#d4af37').fontSize(12).text(data.certificateNumber, width / 2 - 100, yOffset + 18, { align: 'center', width: 200 });

      // Instructor Right
      doc.fillColor('#94a3b8').fontSize(11).text('Instructor Signature', width - 250, yOffset, { align: 'right', width: 150 });
      doc.fillColor('#f8fafc').fontSize(12).text(data.instructorName, width - 250, yOffset + 18, { align: 'right', width: 150 });

      // Seal / Badge Icon Text
      doc.fillColor('rgba(212,175,55,0.6)').fontSize(10).text('VERIFIED & SECURED BY AXUMIA R2 SYSTEM', 0, height - 55, {
        align: 'center',
      });

      doc.end();
    });
  }

  async getOrCreateCertificate(userId: string, courseId: string) {
    // Check purchase/enrollment
    const purchase = await this.prisma.coursePurchase.findUnique({
      where: { user_id_course_id: { user_id: userId, course_id: courseId } },
      include: {
        user: true,
        course: { include: { instructor: { include: { user: true } }, lessons: { where: { is_published: true } } } },
      },
    });

    if (!purchase) {
      throw new ForbiddenException('You must be enrolled in this course to claim a certificate');
    }

    // ── Anti-cheat gate ────────────────────────────────────────────────────────
    const publishedLessons = (purchase.course as any).lessons as any[];
    if (publishedLessons.length > 0) {
      // Require that every published lesson has a completed progress record
      const completedRows = await this.prisma.lessonProgress.findMany({
        where: { purchase_id: purchase.id, completed: true },
      });
      const completedIds = new Set(completedRows.map((r) => r.lesson_id));
      const allComplete = publishedLessons.every((l: any) => completedIds.has(l.id));

      if (!allComplete) {
        const completedCount = completedIds.size;
        throw new ForbiddenException(
          `You must complete all lessons first. (${completedCount}/${publishedLessons.length} completed)`
        );
      }

      // Pace check: must have taken at least (lessons × 2) minutes total since enrollment
      const enrolledAt = purchase.created_at;
      const minElapsedMs = publishedLessons.length * 2 * 60 * 1000; // 2 min per lesson
      if (Date.now() - new Date(enrolledAt).getTime() < minElapsedMs) {
        throw new ForbiddenException(
          'Course completed too quickly. Please take more time with the material.'
        );
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Check existing certificate (idempotent)
    let cert = await (this.prisma as any).certificate.findUnique({
      where: { user_id_course_id: { user_id: userId, course_id: courseId } },
    });

    if (!cert) {
      const certNum = `AXM-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const studentName = `${purchase.user.first_name || ''} ${purchase.user.last_name || ''}`.trim() || purchase.user.email;
      const instructorName = `${purchase.course.instructor.user.first_name || ''} ${purchase.course.instructor.user.last_name || ''}`.trim() || 'AXumia Instructor';
      const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      // Generate PDF
      const pdfBuffer = await this.buildCertificatePdfBuffer({
        studentName,
        courseTitle: purchase.course.title,
        instructorName,
        certificateNumber: certNum,
        dateStr,
      });

      // Upload to R2 Private Bucket
      const pdfKey = `certificates/${certNum}.pdf`;
      await this.storage.uploadBuffer(pdfBuffer, 'private', pdfKey, 'application/pdf');

      // Save in DB
      cert = await (this.prisma as any).certificate.create({
        data: {
          certificate_number: certNum,
          user_id: userId,
          course_id: courseId,
          pdf_key: pdfKey,
        },
      });
    }

    let downloadUrl: string | null = null;
    if (cert.pdf_key) {
      downloadUrl = await this.storage.getSignedUrl(cert.pdf_key);
    }

    return { ...cert, downloadUrl };
  }

  async verifyCertificate(certificateNumber: string) {
    const cert = await (this.prisma as any).certificate.findUnique({
      where: { certificate_number: certificateNumber },
    });
    if (!cert) throw new NotFoundException('Certificate not found');

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
}
