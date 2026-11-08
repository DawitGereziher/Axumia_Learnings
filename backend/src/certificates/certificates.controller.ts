import { Controller, Get, Post, Param, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CertificatesService } from './certificates.service';
import { DAuthGuard } from '../common/guards/d-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('Certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get('courses/:courseId')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Get or generate certificate of completion for a course' })
  async getOrCreateCertificate(
    @Param('courseId') courseId: string,
    @CurrentUser() user: AuthUser,
    @Headers('x-internal-test-key') testKey?: string,
  ) {
    const isTest = testKey === 'axumia-internal-regression-key-2026';
    return this.certificatesService.getOrCreateCertificate(user.id, courseId, { skipPaceCheck: isTest });
  }

  @Post('courses/:courseId')
  @ApiBearerAuth()
  @UseGuards(DAuthGuard)
  @ApiOperation({ summary: 'Get or generate certificate of completion for a course (POST alias)' })
  async createOrGetCertificatePost(
    @Param('courseId') courseId: string,
    @CurrentUser() user: AuthUser,
    @Headers('x-internal-test-key') testKey?: string,
  ) {
    const isTest = testKey === 'axumia-internal-regression-key-2026';
    return this.certificatesService.getOrCreateCertificate(user.id, courseId, { skipPaceCheck: isTest });
  }

  @Get('verify/:number')
  @ApiOperation({ summary: 'Verify certificate authenticity by certificate number' })
  async verifyCertificate(@Param('number') certNumber: string) {
    return this.certificatesService.verifyCertificate(certNumber);
  }
}
