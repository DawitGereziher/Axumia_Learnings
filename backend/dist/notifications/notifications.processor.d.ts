import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationsService } from './notifications.service';
export declare class NotificationsProcessor extends WorkerHost {
    private readonly notificationsService;
    private readonly logger;
    constructor(notificationsService: NotificationsService);
    process(job: Job): Promise<void>;
}
