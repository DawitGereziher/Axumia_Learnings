import { StorageService, StorageBucket } from './storage.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
export declare class StorageController {
    private readonly storage;
    constructor(storage: StorageService);
    getUploadUrl(user: AuthUser, body: {
        bucket: StorageBucket;
        contentType: string;
        folder: 'thumbnail' | 'profile' | 'cover' | 'kyc' | 'pdf' | 'certificate' | 'resource' | 'material';
        fileName: string;
    }): Promise<Record<string, string>>;
    uploadFile(user: AuthUser, file: any, body: {
        bucket?: StorageBucket;
        folder?: any;
        fileName?: string;
    }): Promise<Record<string, any>>;
}
