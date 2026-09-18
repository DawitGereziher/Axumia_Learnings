import { ContentType } from '../../content/content.service';
export declare class AddLessonDto {
    title: string;
    description?: string;
    position?: number;
    is_free_preview?: boolean;
    content_type?: ContentType;
    storage_type?: string;
    youtube_url?: string;
    video_key?: string;
    external_url?: string;
    embed_code?: string;
    section_id?: string;
    duration_s?: number;
    requires_progress?: boolean;
}
