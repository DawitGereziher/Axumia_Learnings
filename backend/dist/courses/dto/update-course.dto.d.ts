import { CourseStatus } from '../../common/enums';
export declare class UpdateCourseDto {
    title?: string;
    description?: string;
    price?: number;
    status?: CourseStatus;
    is_published?: boolean;
    level?: string;
    language?: string;
    tags?: string[];
    thumbnail?: string;
    thumbnail_url?: string;
    estimated_hours?: number;
    prerequisites?: string[];
    learning_objectives?: string[];
}
