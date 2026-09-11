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
exports.ResourcesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ResourcesService = class ResourcesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
        const { search = '', category, language, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;
        const where = { is_active: true };
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (category && category !== 'all')
            where.category = category;
        if (language)
            where.language = language;
        const [data, total] = await Promise.all([
            this.prisma.resource.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip,
                take: Number(limit),
            }),
            this.prisma.resource.count({ where }),
        ]);
        return {
            data,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / limit),
            },
        };
    }
    async incrementDownload(id) {
        const resource = await this.prisma.resource.findUnique({ where: { id } });
        if (!resource || !resource.is_active)
            return null;
        await this.prisma.resource.update({
            where: { id },
            data: { downloads: { increment: 1 } },
        });
        return resource;
    }
    async create(dto) {
        return this.prisma.resource.create({ data: dto });
    }
    async remove(id) {
        return this.prisma.resource.update({
            where: { id },
            data: { is_active: false },
        });
    }
    async seed() {
        const count = await this.prisma.resource.count();
        if (count > 0)
            return;
        const items = [
            {
                title: 'Amharic Grammar Complete Guide (አማርኛ ሰዋስው)',
                description: 'Comprehensive Amharic grammar reference for all levels',
                category: 'amharic',
                file_url: '#',
                file_size: 2400000,
                file_type: 'pdf',
                language: 'am',
            },
            {
                title: 'Afaan Oromoo Beginner Vocabulary Workbook',
                description: 'Essential vocabulary and phrases for Afaan Oromoo beginners',
                category: 'oromiffa',
                file_url: '#',
                file_size: 1800000,
                file_type: 'pdf',
                language: 'om',
            },
            {
                title: 'Ethiopian Grade 12 Mathematics Past Papers (2015–2023)',
                description: '9 years of national exam past papers with full solutions',
                category: 'grade12',
                file_url: '#',
                file_size: 5600000,
                file_type: 'pdf',
                language: 'en',
            },
            {
                title: 'English for Academic Purposes — Writing Skills',
                description: 'Academic writing guide for university students',
                category: 'english',
                file_url: '#',
                file_size: 3100000,
                file_type: 'pdf',
                language: 'en',
            },
            {
                title: 'Tigrinya Language Learning Starter Pack (ትግርኛ)',
                description: 'Audio + text introduction to Tigrinya',
                category: 'tigrinya',
                file_url: '#',
                file_size: 4200000,
                file_type: 'zip',
                language: 'ti',
            },
            {
                title: 'SAT Math Full Practice Test 2024',
                description: 'Official-style SAT Math practice with answer explanations',
                category: 'sat',
                file_url: '#',
                file_size: 2900000,
                file_type: 'pdf',
                language: 'en',
            },
            {
                title: 'Python Programming — Complete Beginner Notes',
                description: 'From variables to OOP: compact Python notes',
                category: 'it',
                file_url: '#',
                file_size: 1500000,
                file_type: 'pdf',
                language: 'en',
            },
            {
                title: 'Business Plan Template — Ethiopian Market',
                description: 'Ready-to-fill business plan template with local examples',
                category: 'business',
                file_url: '#',
                file_size: 890000,
                file_type: 'docx',
                language: 'en',
            },
            {
                title: 'Ethiopian Grade 12 Physics Notes — All Units',
                description: 'Concise physics notes covering the full national curriculum',
                category: 'grade12',
                file_url: '#',
                file_size: 3800000,
                file_type: 'pdf',
                language: 'en',
            },
            {
                title: 'Web Development Roadmap 2024 (አማርኛ)',
                description: 'Step-by-step guide to becoming a fullstack developer, in Amharic',
                category: 'it',
                file_url: '#',
                file_size: 1200000,
                file_type: 'pdf',
                language: 'am',
            },
            {
                title: 'SAT Vocabulary 1000 Words — Flashcard Pack',
                description: 'High-frequency SAT vocabulary with definitions and examples',
                category: 'sat',
                file_url: '#',
                file_size: 750000,
                file_type: 'pdf',
                language: 'en',
            },
            {
                title: "Amharic Children's Stories Collection (ለህጻናት)",
                description: '10 illustrated short stories for young Amharic learners',
                category: 'amharic',
                file_url: '#',
                file_size: 6100000,
                file_type: 'pdf',
                language: 'am',
            },
        ];
        await this.prisma.resource.createMany({ data: items });
    }
};
exports.ResourcesService = ResourcesService;
exports.ResourcesService = ResourcesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ResourcesService);
//# sourceMappingURL=resources.service.js.map