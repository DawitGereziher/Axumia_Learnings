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
exports.AddLessonDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
const content_service_1 = require("../../content/content.service");
class AddLessonDto {
    title;
    description;
    position;
    is_free_preview;
    content_type;
    storage_type;
    youtube_url;
    video_key;
    external_url;
    embed_code;
    section_id;
    duration_s;
    requires_progress;
}
exports.AddLessonDto = AddLessonDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], AddLessonDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddLessonDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ minimum: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], AddLessonDto.prototype, "position", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], AddLessonDto.prototype, "is_free_preview", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: content_service_1.ContentType, default: content_service_1.ContentType.YOUTUBE }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(Object.values(content_service_1.ContentType)),
    __metadata("design:type", String)
], AddLessonDto.prototype, "content_type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'youtube' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddLessonDto.prototype, "storage_type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'https://youtu.be/abc123' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddLessonDto.prototype, "youtube_url", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'S3 key for uploaded video' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddLessonDto.prototype, "video_key", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddLessonDto.prototype, "external_url", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddLessonDto.prototype, "embed_code", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Section UUID to nest lesson under' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], AddLessonDto.prototype, "section_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Lesson duration in seconds' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], AddLessonDto.prototype, "duration_s", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'If false, lesson completes immediately on open (for reading/text)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], AddLessonDto.prototype, "requires_progress", void 0);
//# sourceMappingURL=add-lesson.dto.js.map