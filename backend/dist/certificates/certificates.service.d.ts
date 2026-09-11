import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
export declare class CertificatesService {
    private prisma;
    private storage;
    constructor(prisma: PrismaService, storage: StorageService);
    private buildCertificatePdfBuffer;
    getOrCreateCertificate(userId: string, courseId: string): Promise<any>;
    verifyCertificate(certificateNumber: string): Promise<{
        certificate_number: any;
        issued_at: any;
        student_name: string;
        course_title: string;
        valid: boolean;
    }>;
}
