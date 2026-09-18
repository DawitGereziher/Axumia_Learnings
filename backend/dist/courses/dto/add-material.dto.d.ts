import { MaterialType } from '../../common/enums';
export declare class AddMaterialDto {
    title: string;
    description?: string;
    material_type: MaterialType;
    file_url?: string;
    file_name?: string;
    file_size?: number;
    is_downloadable?: boolean;
    is_free_preview?: boolean;
}
