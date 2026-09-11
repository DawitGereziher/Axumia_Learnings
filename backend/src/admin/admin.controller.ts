import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from '../common/guards/admin.guard';

@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Users ─────────────────────────────────────────────────────────────────
  @Get('users')
  listUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('role') role?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listUsers({
      page: +page,
      limit: +limit,
      role,
      search,
    });
  }

  @Patch('users/:id/role')
  updateUserRole(@Param('id') id: string, @Body() body: { role: string }) {
    return this.adminService.updateUserRole(id, body.role);
  }

  @Patch('users/:id/verify-email')
  verifyUserEmail(
    @Param('id') id: string,
    @Body() body: { is_email_verified: boolean },
  ) {
    return this.adminService.verifyUserEmail(
      id,
      body.is_email_verified ?? true,
    );
  }

  // ── KYC ───────────────────────────────────────────────────────────────────
  @Get('kyc/pending')
  pendingKyc() {
    return this.adminService.getPendingKyc();
  }

  @Patch('kyc/:profileId')
  updateKyc(
    @Param('profileId') profileId: string,
    @Body() body: { status: 'approved' | 'rejected'; notes?: string },
  ) {
    return this.adminService.updateKycStatus(
      profileId,
      body.status,
      body.notes,
    );
  }

  // ── Payouts ───────────────────────────────────────────────────────────────
  // ── Courses Management ───────────────────────────────────────────────────
  @Get('courses')
  listCourses(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listCourses({
      page: +page,
      limit: +limit,
      status,
      search,
    });
  }

  @Patch('courses/:id/status')
  updateCourseStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.adminService.updateCourseStatus(id, body.status);
  }

  @Post('courses/:id/delete')
  deleteCourse(@Param('id') id: string) {
    return this.adminService.deleteCourse(id);
  }

  // ── Financial Ledger & CSV Export ──────────────────────────────────────────
  @Get('transactions')
  listTransactions(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('search') search?: string,
  ) {
    return this.adminService.listTransactions({
      page: +page,
      limit: +limit,
      search,
    });
  }

  @Get('transactions/export-csv')
  async exportTransactionsCsv() {
    return this.adminService.exportTransactionsCsv();
  }

  // ── Categories Management ──────────────────────────────────────────────────
  @Get('categories')
  listCategories() {
    return this.adminService.listCategories();
  }

  @Post('categories')
  createCategory(@Body() body: { name: string; slug?: string; icon?: string }) {
    return this.adminService.createCategory(body);
  }

  @Patch('categories/:id')
  updateCategory(
    @Param('id') id: string,
    @Body() body: { name?: string; slug?: string; icon?: string },
  ) {
    return this.adminService.updateCategory(id, body);
  }

  @Post('categories/:id/delete')
  deleteCategory(@Param('id') id: string) {
    return this.adminService.deleteCategory(id);
  }

  // ── Payouts ───────────────────────────────────────────────────────────────
  @Get('payouts/all')
  getAllPayouts() {
    return this.adminService.getAllPayouts();
  }

  @Get('payouts/pending')
  pendingPayouts() {
    return this.adminService.getPendingPayouts();
  }

  @Patch('payouts/:id')
  updatePayout(
    @Param('id') id: string,
    @Body() body: { status: 'paid' | 'failed'; notes?: string },
  ) {
    return this.adminService.updatePayoutStatus(id, body.status, body.notes);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  @Get('stats')
  getStats() {
    return this.adminService.getPlatformStats();
  }

  // ── Queue Monitoring ──────────────────────────────────────────────────────
  @Get('queues/status')
  getQueueStatus() {
    return this.adminService.getQueueStatus();
  }

  @Post('queues/:queueName/retry-failed')
  retryFailedJobs(@Param('queueName') queueName: string) {
    return this.adminService.retryFailedJobs(queueName);
  }
}
