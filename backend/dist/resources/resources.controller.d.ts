import { Response } from 'express';
import { ResourcesService } from './resources.service';
export declare class ResourcesController {
    private readonly svc;
    constructor(svc: ResourcesService);
    list(search?: string, category?: string, language?: string, page?: string, limit?: string): Promise<{
        data: {
            category: string;
            id: string;
            created_at: Date;
            updated_at: Date;
            is_active: boolean;
            title: string;
            description: string | null;
            language: string;
            file_size: number | null;
            file_url: string;
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
    download(id: string, res: Response): Promise<void | Response<any, Record<string, any>>>;
    create(body: {
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
        created_at: Date;
        updated_at: Date;
        is_active: boolean;
        title: string;
        description: string | null;
        language: string;
        file_size: number | null;
        file_url: string;
        file_type: string | null;
        downloads: number;
    }>;
    remove(id: string): Promise<{
        category: string;
        id: string;
        created_at: Date;
        updated_at: Date;
        is_active: boolean;
        title: string;
        description: string | null;
        language: string;
        file_size: number | null;
        file_url: string;
        file_type: string | null;
        downloads: number;
    }>;
}
