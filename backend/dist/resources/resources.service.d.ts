import { PrismaService } from '../prisma/prisma.service';
export interface ResourceQuery {
    search?: string;
    category?: string;
    language?: string;
    page?: number;
    limit?: number;
}
export declare class ResourcesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(query: ResourceQuery): Promise<{
        data: {
            category: string;
            id: string;
            description: string | null;
            title: string;
            created_at: Date;
            updated_at: Date;
            is_active: boolean;
            language: string;
            file_url: string;
            file_size: number | null;
            file_type: string | null;
            downloads: number;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    incrementDownload(id: string): Promise<{
        category: string;
        id: string;
        description: string | null;
        title: string;
        created_at: Date;
        updated_at: Date;
        is_active: boolean;
        language: string;
        file_url: string;
        file_size: number | null;
        file_type: string | null;
        downloads: number;
    } | null>;
    create(dto: {
        title: string;
        description?: string;
        category: string;
        file_url: string;
        file_size?: number;
        file_type?: string;
        language?: string;
    }): Promise<{
        category: string;
        id: string;
        description: string | null;
        title: string;
        created_at: Date;
        updated_at: Date;
        is_active: boolean;
        language: string;
        file_url: string;
        file_size: number | null;
        file_type: string | null;
        downloads: number;
    }>;
    remove(id: string): Promise<{
        category: string;
        id: string;
        description: string | null;
        title: string;
        created_at: Date;
        updated_at: Date;
        is_active: boolean;
        language: string;
        file_url: string;
        file_size: number | null;
        file_type: string | null;
        downloads: number;
    }>;
    seed(): Promise<void>;
}
