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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const d_auth_guard_1 = require("../common/guards/d-auth.guard");
const storage_service_1 = require("./storage.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const ALLOWED_PUBLIC_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
];
const ALLOWED_PRIVATE_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
];
let StorageController = class StorageController {
    storage;
    constructor(storage) {
        this.storage = storage;
    }
    async getUploadUrl(user, body) {
        const { bucket, contentType, folder, fileName } = body;
        if (!['public', 'private'].includes(bucket)) {
            throw new common_1.BadRequestException('bucket must be "public" or "private"');
        }
        const allowed = bucket === 'public' ? ALLOWED_PUBLIC_TYPES : ALLOWED_PRIVATE_TYPES;
        if (!allowed.includes(contentType)) {
            throw new common_1.BadRequestException(`contentType "${contentType}" is not allowed for the ${bucket} bucket. ` +
                `Allowed: ${allowed.join(', ')}`);
        }
        const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
        const key = `${folder}/${user.id}/${Date.now()}-${safeName}`;
        const uploadUrl = await this.storage.getUploadUrl(bucket, key, contentType);
        const response = { uploadUrl, key };
        if (bucket === 'public') {
            response.publicUrl = this.storage.getPublicUrl(key);
        }
        return response;
    }
};
exports.StorageController = StorageController;
__decorate([
    (0, common_1.Post)('upload-url'),
    (0, common_1.UseGuards)(d_auth_guard_1.DAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: 'Get a pre-signed R2 upload URL for direct browser-to-R2 upload',
        description: `
      bucket: 'public'  → for profile photos, thumbnails, cover images
      bucket: 'private' → for KYC docs, lesson PDFs, certificates
      
      Returns a pre-signed PUT URL valid for 10 minutes.
      After upload, use the returned 'key' to update the relevant record.
    `,
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "getUploadUrl", null);
exports.StorageController = StorageController = __decorate([
    (0, swagger_1.ApiTags)('Storage'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('storage'),
    __metadata("design:paramtypes", [storage_service_1.StorageService])
], StorageController);
//# sourceMappingURL=storage.controller.js.map