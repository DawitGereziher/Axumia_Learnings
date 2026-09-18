import { SortOrder, PriceRange } from '../../common/enums';
export declare class QueryCoursesDto {
    search?: string;
    category?: string;
    level?: string;
    language?: string;
    priceRange?: PriceRange;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    sort?: SortOrder;
    page?: number;
    limit?: number;
}
