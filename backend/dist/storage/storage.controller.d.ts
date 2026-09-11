import { StorageService, StorageBucket } from './storage.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
export declare class StorageController {
    private readonly storage;
    constructor(storage: StorageService);
    getUploadUrl(user: AuthUser, body: {
        bucket: StorageBucket;
        contentType: string;
        folder: 'thumbnail' | 'profile' | 'cover' | 'kyc' | 'pdf' | 'certificate' | 'resource';
        fileName: string;
    }): Promise<Record<string, string>>;
}
