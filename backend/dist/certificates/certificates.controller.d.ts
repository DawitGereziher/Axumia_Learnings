import { CertificatesService } from './certificates.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
export declare class CertificatesController {
    private readonly certificatesService;
    constructor(certificatesService: CertificatesService);
    getOrCreateCertificate(courseId: string, user: AuthUser): Promise<any>;
    verifyCertificate(certNumber: string): Promise<{
        certificate_number: any;
        issued_at: any;
        student_name: string;
        course_title: string;
        valid: boolean;
    }>;
}
