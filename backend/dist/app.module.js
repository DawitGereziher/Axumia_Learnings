"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("./prisma/prisma.module");
const users_module_1 = require("./users/users.module");
const courses_module_1 = require("./courses/courses.module");
const bookings_module_1 = require("./bookings/bookings.module");
const payments_module_1 = require("./payments/payments.module");
const reviews_module_1 = require("./reviews/reviews.module");
const notifications_module_1 = require("./notifications/notifications.module");
const storage_module_1 = require("./storage/storage.module");
const queue_module_1 = require("./queue/queue.module");
const admin_module_1 = require("./admin/admin.module");
const health_module_1 = require("./health/health.module");
const resources_module_1 = require("./resources/resources.module");
const session_monitoring_module_1 = require("./session-monitoring/session-monitoring.module");
const help_requests_module_1 = require("./help-requests/help-requests.module");
const content_module_1 = require("./content/content.module");
const common_module_1 = require("./common/common.module");
const certificates_module_1 = require("./certificates/certificates.module");
const throttler_1 = require("@nestjs/throttler");
const core_1 = require("@nestjs/core");
const custom_throttler_guard_1 = require("./common/guards/custom-throttler.guard");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    name: 'short',
                    ttl: 1000,
                    limit: 10,
                },
                {
                    name: 'medium',
                    ttl: 10000,
                    limit: 30,
                },
                {
                    name: 'long',
                    ttl: 60000,
                    limit: 100,
                },
            ]),
            queue_module_1.QueueModule,
            prisma_module_1.PrismaModule,
            common_module_1.CommonModule,
            users_module_1.UsersModule,
            courses_module_1.CoursesModule,
            bookings_module_1.BookingsModule,
            payments_module_1.PaymentsModule,
            reviews_module_1.CourseReviewsModule,
            notifications_module_1.NotificationsModule,
            storage_module_1.StorageModule,
            content_module_1.ContentModule,
            certificates_module_1.CertificatesModule,
            admin_module_1.AdminModule,
            resources_module_1.ResourcesModule,
            help_requests_module_1.HelpRequestsModule,
            session_monitoring_module_1.SessionMonitoringModule,
            health_module_1.HealthModule,
        ],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: custom_throttler_guard_1.CustomThrottlerGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map