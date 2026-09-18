export declare class CreateCourseDto {
    title: string;
    description?: string;
    price: number;
    category_id?: string;
    level?: string;
    language?: string;
    tags?: string[];
    thumbnail?: string;
    thumbnail_url?: string;
    estimated_hours?: number;
    prerequisites?: string[];
    learning_objectives?: string[];
}
