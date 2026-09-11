import { MonitorService } from '../monitor/monitor.service';
export declare class ZoomWebhookController {
    private readonly monitorService;
    private readonly logger;
    constructor(monitorService: MonitorService);
    handleZoomWebhook(body: any, _sig: string): Promise<any>;
}
