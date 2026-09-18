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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LessonsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const storage_service_1 = require("../storage/storage.service");
const content_service_1 = require("../content/content.service");
const content_security_service_1 = require("../content/content-security.service");
const rate_limit_service_1 = require("../common/services/rate-limit.service");
const access_log_service_1 = require("../common/services/access-log.service");
let LessonsService = class LessonsService {
    prisma;
    storage;
    contentService;
    contentSecurity;
    rateLimit;
    accessLog;
    constructor(prisma, storage, contentService, contentSecurity, rateLimit, accessLog) {
        this.prisma = prisma;
        this.storage = storage;
        this.contentService = contentService;
        this.contentSecurity = contentSecurity;
        this.rateLimit = rateLimit;
        this.accessLog = accessLog;
    }
    async addLesson(courseId, instructorUserId, dto) {
        const course = await this.prisma.course.findUnique({
            where: { id: courseId },
            include: { instructor: true },
        });
        const user = await this.prisma.user.findUnique({
            where: { id: instructorUserId },
            select: { role: true },
        });
        if (!course || (course.instructor.user_id !== instructorUserId && user?.role !== 'admin')) {
            throw new common_1.ForbiddenException('Not authorised');
        }
        const sectionId = dto.section_id ?? undefined;
        let lessonData = {
            course_id: courseId,
            title: dto.title,
            description: dto.description,
            position: dto.position ?? 1,
            is_free_preview: dto.is_free_preview ?? false,
            content_type: dto.content_type ?? content_service_1.ContentType.YOUTUBE,
            storage_type: dto.storage_type ?? 'youtube',
            section_id: sectionId,
            duration_s: dto.duration_s ?? null,
            requires_progress: dto.requires_progress ?? true,
            is_published: true,
        };
        if (dto.youtube_url) {
            lessonData.content_type = content_service_1.ContentType.YOUTUBE;
            lessonData.storage_type = 'youtube';
            lessonData.external_url = dto.youtube_url;
            if (this.contentService.isValidYouTubeUrl(dto.youtube_url)) {
                const processed = this.contentService.processYouTubeUrl(dto.youtube_url);
                if (processed) {
                    lessonData.youtube_video_id = processed.encryptedId;
                }
            }
        }
        if (dto.video_key) {
            lessonData.video_key = dto.video_key;
            lessonData.content_type = content_service_1.ContentType.VIDEO;
            lessonData.storage_type = 's3';
        }
        if (dto.external_url) {
            lessonData.external_url = dto.external_url;
            if (dto.content_type === content_service_1.ContentType.PDF) {
                lessonData.content_type = content_service_1.ContentType.PDF;
                lessonData.storage_type = 's3';
            }
            else if (dto.content_type === content_service_1.ContentType.TEXT) {
                lessonData.content_type = content_service_1.ContentType.TEXT;
                lessonData.storage_type = 'external';
            }
            else if (!lessonData.storage_type) {
                lessonData.storage_type = 'external';
            }
        }
        if (dto.embed_code) {
            lessonData.embed_code = dto.embed_code;
            lessonData.content_type = content_service_1.ContentType.EMBEDDED;
            lessonData.storage_type = 'embedded';
        }
        const lesson = await this.prisma.courseLesson.create({ data: lessonData });
        await this.prisma.course.update({
            where: { id: courseId },
            data: { total_lessons: { increment: 1 } },
        });
        return lesson;
    }
    async updateLesson(lessonId, instructorUserId, dto) {
        const lesson = await this.prisma.courseLesson.findUnique({
            where: { id: lessonId },
            include: { course: { include: { instructor: true } } },
        });
        if (!lesson || lesson.course.instructor.user_id !== instructorUserId) {
            throw new common_1.ForbiddenException('Not authorized to edit this lesson');
        }
        return this.prisma.courseLesson.update({ where: { id: lessonId }, data: dto });
    }
    async deleteLesson(lessonId, instructorUserId) {
        const lesson = await this.prisma.courseLesson.findUnique({
            where: { id: lessonId },
            include: { course: { include: { instructor: true } } },
        });
        if (!lesson || lesson.course.instructor.user_id !== instructorUserId) {
            throw new common_1.ForbiddenException('Not authorized to delete this lesson');
        }
        return this.prisma.courseLesson.delete({ where: { id: lessonId } });
    }
    async addSection(courseId, instructorUserId, dto) {
        const course = await this.prisma.course.findUnique({
            where: { id: courseId },
            include: { instructor: true },
        });
        if (!course || course.instructor.user_id !== instructorUserId) {
            throw new common_1.ForbiddenException('Not authorised');
        }
        return this.prisma.courseSection.create({
            data: {
                course_id: courseId,
                title: dto.title,
                description: dto.description,
                position: dto.position ?? 1,
            },
        });
    }
    async deleteSection(sectionId, instructorUserId) {
        const section = await this.prisma.courseSection.findUnique({
            where: { id: sectionId },
            include: { course: { include: { instructor: true } } },
        });
        if (!section)
            throw new common_1.NotFoundException('Section not found');
        const user = await this.prisma.user.findUnique({
            where: { id: instructorUserId },
            select: { role: true },
        });
        const isOwner = section.course.instructor.user_id === instructorUserId;
        const isAdmin = user?.role === 'admin';
        if (!isOwner && !isAdmin)
            throw new common_1.ForbiddenException('Not authorised');
        await this.prisma.courseLesson.updateMany({
            where: { section_id: sectionId },
            data: { section_id: null },
        });
        await this.prisma.courseSection.delete({ where: { id: sectionId } });
    }
    async getCourseSections(courseId) {
        return this.prisma.courseSection.findMany({
            where: { course_id: courseId },
            orderBy: { position: 'asc' },
            include: { lessons: { orderBy: { position: 'asc' } } },
        });
    }
    async addMaterial(lessonId, instructorUserId, dto) {
        const lesson = await this.prisma.courseLesson.findUnique({
            where: { id: lessonId },
            include: { course: true },
        });
        if (!lesson)
            throw new common_1.NotFoundException('Lesson not found');
        if (lesson.course.instructor_id !== instructorUserId) {
            throw new common_1.ForbiddenException('Not authorised');
        }
        const material = await this.prisma.lessonMaterial.create({
            data: {
                lesson_id: lessonId,
                title: dto.title,
                description: dto.description,
                material_type: dto.material_type,
                file_url: dto.file_url,
                file_name: dto.file_name,
                file_size: dto.file_size,
                is_downloadable: dto.is_downloadable !== false,
                is_free_preview: dto.is_free_preview ?? false,
                position: 1,
            },
        });
        await this.prisma.course.update({
            where: { id: lesson.course_id },
            data: { total_materials: { increment: 1 } },
        });
        return material;
    }
    async deleteMaterial(materialId, instructorUserId) {
        const material = await this.prisma.lessonMaterial.findUnique({
            where: { id: materialId },
            include: { lesson: { include: { course: true } } },
        });
        if (!material)
            throw new common_1.NotFoundException('Material not found');
        if (material.lesson.course.instructor_id !== instructorUserId) {
            throw new common_1.ForbiddenException('Not authorised');
        }
        await this.prisma.lessonMaterial.delete({ where: { id: materialId } });
        await this.prisma.course.update({
            where: { id: material.lesson.course_id },
            data: { total_materials: { decrement: 1 } },
        });
    }
    async getMaterialDownloadUrl(materialId, userId) {
        const material = await this.prisma.lessonMaterial.findUnique({
            where: { id: materialId },
            include: { lesson: { include: { course: { include: { instructor: true } } } } },
        });
        if (!material)
            throw new common_1.NotFoundException('Material not found');
        const lesson = material.lesson;
        const isFree = material.is_free_preview || lesson.is_free_preview;
        if (!isFree) {
            const isInstructor = lesson.course.instructor.user_id === userId;
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { role: true },
            });
            const isAdmin = user?.role === 'admin';
            if (!isInstructor && !isAdmin) {
                const purchase = await this.prisma.coursePurchase.findUnique({
                    where: { user_id_course_id: { user_id: userId, course_id: lesson.course_id } },
                });
                if (!purchase)
                    throw new common_1.ForbiddenException('Purchase this course to download materials');
            }
        }
        if (!material.file_url)
            throw new common_1.NotFoundException('No file key found for material');
        if (material.file_url.startsWith('http://') || material.file_url.startsWith('https://')) {
            return { url: material.file_url, fileName: material.file_name || material.title };
        }
        const signedUrl = await this.storage.getSignedUrl(material.file_url);
        return { url: signedUrl, fileName: material.file_name || material.title };
    }
    async getLessonVideoUrl(lessonId, userId, requestIp, userAgent, referrer) {
        const lesson = await this.prisma.courseLesson.findUnique({
            where: { id: lessonId },
            include: { course: true },
        });
        if (!lesson)
            throw new common_1.NotFoundException('Lesson not found');
        await this.rateLimit.checkRateLimit({ userId, ip: requestIp, resourceType: 'video' });
        let accessSuccess = true;
        try {
            if (!lesson.is_free_preview) {
                const isInstructor = lesson.course?.instructor_id &&
                    (await this.prisma.instructorProfile.findUnique({
                        where: { id: lesson.course.instructor_id },
                        select: { user_id: true },
                    }))?.user_id === userId;
                const user = await this.prisma.user.findUnique({
                    where: { id: userId },
                    select: { role: true },
                });
                const isAdmin = user?.role === 'admin';
                if (!isInstructor && !isAdmin) {
                    const purchase = await this.prisma.coursePurchase.findUnique({
                        where: { user_id_course_id: { user_id: userId, course_id: lesson.course_id } },
                    });
                    if (!purchase) {
                        accessSuccess = false;
                        throw new common_1.ForbiddenException('Purchase this course to watch');
                    }
                }
            }
            const contentUrl = await this.contentService.generateContentUrl(lesson, userId);
            let signedUrl = contentUrl;
            if (contentUrl && !contentUrl.includes('X-Amz-Signature')) {
                signedUrl = this.contentSecurity.generateSignedUrl(contentUrl, {
                    userId,
                    lessonId,
                    courseId: lesson.course_id,
                    ip: requestIp,
                });
            }
            await this.accessLog.logAccess({
                userId,
                lessonId,
                courseId: lesson.course_id,
                accessType: 'video',
                ipAddress: requestIp,
                userAgent,
                referrer,
                success: true,
            });
            return { url: signedUrl, content_type: lesson.content_type ?? 'youtube' };
        }
        catch (error) {
            await this.accessLog.logAccess({
                userId,
                lessonId,
                courseId: lesson.course_id,
                accessType: 'video',
                ipAddress: requestIp,
                userAgent,
                referrer,
                success: false,
            });
            throw error;
        }
    }
};
exports.LessonsService = LessonsService;
exports.LessonsService = LessonsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        storage_service_1.StorageService,
        content_service_1.ContentService,
        content_security_service_1.ContentSecurityService,
        rate_limit_service_1.RateLimitService,
        access_log_service_1.AccessLogService])
], LessonsService);
//# sourceMappingURL=lessons.service.js.map