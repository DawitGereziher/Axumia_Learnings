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
var InstructorResponseService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstructorResponseService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let InstructorResponseService = InstructorResponseService_1 = class InstructorResponseService {
    prisma;
    logger = new common_1.Logger(InstructorResponseService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createInstructorResponse(instructorId, courseId, reviewId, response) {
        try {
            const course = await this.prisma.course.findUnique({
                where: { id: courseId },
            });
            if (!course) {
                throw new common_1.NotFoundException('Course not found');
            }
            if (course.instructor_id !== instructorId) {
                throw new common_1.ForbiddenException('You can only respond to reviews of your own courses');
            }
            const review = await this.prisma.courseReview.findUnique({
                where: { id: reviewId },
            });
            if (!review) {
                throw new common_1.NotFoundException('Review not found');
            }
            if (review.course_id !== courseId) {
                throw new common_1.ForbiddenException('Review does not belong to this course');
            }
            const existingResponse = await this.prisma.instructorResponse.findUnique({
                where: { courseReviewId: reviewId },
            });
            if (existingResponse) {
                const updatedResponse = await this.prisma.instructorResponse.update({
                    where: { id: existingResponse.id },
                    data: { response },
                });
                this.logger.log(`Updated instructor response for review ${reviewId}`);
                return updatedResponse;
            }
            const newResponse = await this.prisma.instructorResponse.create({
                data: {
                    courseReviewId: reviewId,
                    instructor_id: instructorId,
                    response,
                },
            });
            this.logger.log(`Created instructor response for review ${reviewId}`);
            return newResponse;
        }
        catch (error) {
            this.logger.error('Error creating instructor response:', error);
            throw new Error('Failed to create instructor response');
        }
    }
    async updateInstructorResponse(responseId, instructorId, response) {
        try {
            const existingResponse = await this.prisma.instructorResponse.findUnique({
                where: { id: responseId },
            });
            if (!existingResponse) {
                throw new common_1.NotFoundException('Response not found');
            }
            if (existingResponse.instructor_id !== instructorId) {
                throw new common_1.ForbiddenException('You can only update your own responses');
            }
            const updatedResponse = await this.prisma.instructorResponse.update({
                where: { id: responseId },
                data: { response },
            });
            this.logger.log(`Updated instructor response ${responseId}`);
            return updatedResponse;
        }
        catch (error) {
            this.logger.error('Error updating instructor response:', error);
            throw new Error('Failed to update instructor response');
        }
    }
    async deleteInstructorResponse(responseId, instructorId) {
        try {
            const existingResponse = await this.prisma.instructorResponse.findUnique({
                where: { id: responseId },
            });
            if (!existingResponse) {
                throw new common_1.NotFoundException('Response not found');
            }
            if (existingResponse.instructor_id !== instructorId) {
                throw new common_1.ForbiddenException('You can only delete your own responses');
            }
            await this.prisma.instructorResponse.delete({
                where: { id: responseId },
            });
            this.logger.log(`Deleted instructor response ${responseId}`);
        }
        catch (error) {
            this.logger.error('Error deleting instructor response:', error);
            throw new Error('Failed to delete instructor response');
        }
    }
    async toggleResponseVisibility(responseId, instructorId) {
        try {
            const existingResponse = await this.prisma.instructorResponse.findUnique({
                where: { id: responseId },
            });
            if (!existingResponse) {
                throw new common_1.NotFoundException('Response not found');
            }
            if (existingResponse.instructor_id !== instructorId) {
                throw new common_1.ForbiddenException('You can only manage your own responses');
            }
            const updatedResponse = await this.prisma.instructorResponse.update({
                where: { id: responseId },
                data: {
                    is_public: !existingResponse.is_public,
                },
            });
            this.logger.log(`Toggled visibility for instructor response ${responseId}`);
            return updatedResponse;
        }
        catch (error) {
            this.logger.error('Error toggling response visibility:', error);
            throw new Error('Failed to toggle response visibility');
        }
    }
    async getInstructorResponses(instructorId, courseId) {
        try {
            const where = {
                instructor_id: instructorId,
            };
            if (courseId) {
                where.courseReview = {
                    course_id: courseId,
                };
            }
            const responses = await this.prisma.instructorResponse.findMany({
                where,
                orderBy: { created_at: 'desc' },
            });
            return responses;
        }
        catch (error) {
            this.logger.error('Error getting instructor responses:', error);
            throw new Error('Failed to get instructor responses');
        }
    }
};
exports.InstructorResponseService = InstructorResponseService;
exports.InstructorResponseService = InstructorResponseService = InstructorResponseService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InstructorResponseService);
//# sourceMappingURL=instructor-response.service.js.map