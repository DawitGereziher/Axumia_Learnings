import { MonitorService } from '../monitor/monitor.service';
export declare class GoogleWebhookController {
    private readonly monitorService;
    private readonly logger;
    constructor(monitorService: MonitorService);
    handleGoogleWebhook(body: any, resourceState: string, channelId: string, resourceId: string, messageNumber: string): Promise<any>;
}
