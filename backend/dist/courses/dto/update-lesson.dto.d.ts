import { ContentType } from '../../content/content.service';
export declare class UpdateLessonDto {
    title?: string;
    description?: string;
    position?: number;
    is_free_preview?: boolean;
    is_published?: boolean;
    content_type?: ContentType;
    youtube_url?: string;
    video_key?: string;
    external_url?: string;
    embed_code?: string;
    duration_s?: number;
    requires_progress?: boolean;
    section_id?: string;
}
