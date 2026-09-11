import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { OAuthService } from './oauth.service';
export declare class OAuthController {
    private readonly oauthService;
    private readonly config;
    constructor(oauthService: OAuthService, config: ConfigService);
    connectZoom(req: Request, res: Response): void;
    zoomCallback(code: string, state: string, res: Response): Promise<void>;
    connectGoogle(req: Request, res: Response): void;
    googleCallback(code: string, state: string, res: Response): Promise<void>;
    getAuthUrl(platform: 'zoom' | 'google', req: Request): {
        authUrl: string;
    };
    getVideoAccounts(req: Request): Promise<{
        accounts: {
            id: string;
            created_at: Date;
            platform: string;
            platform_user_id: string;
        }[];
    }>;
    deleteVideoAccount(id: string, req: Request): Promise<{
        success: boolean;
    }>;
    getStatus(req: Request): Promise<{
        zoom: boolean;
        google: boolean;
    }>;
    disconnect(platform: 'zoom' | 'google', req: Request): Promise<void>;
    createZoomMeeting(req: Request, body: {
        topic: string;
        startTime: string;
        durationMinutes: number;
    }): Promise<{
        meetingUrl: string;
        meetingId: string;
        platformMeetingId: string;
    }>;
    createGoogleMeetEvent(req: Request, body: {
        title: string;
        startTime: string;
        durationMinutes: number;
    }): Promise<{
        meetingUrl: string;
        meetingId: string;
        platformMeetingId: string;
    }>;
    checkAccountConnection(platform: 'zoom' | 'google', req: Request): Promise<{
        connected: boolean;
    }>;
}
