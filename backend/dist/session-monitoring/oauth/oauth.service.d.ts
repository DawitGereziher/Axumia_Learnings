import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
export declare function detectPlatform(link: string): 'zoom' | 'google' | null;
export declare function extractZoomMeetingId(link: string): string | null;
export declare function extractGoogleMeetCode(link: string): string | null;
export declare class OAuthService {
    private config;
    private prisma;
    private http;
    private readonly logger;
    constructor(config: ConfigService, prisma: PrismaService, http: HttpService);
    private get encKey();
    getZoomAuthUrl(instructorId: string): string;
    handleZoomCallback(code: string, state: string): Promise<void>;
    refreshZoomToken(accountId: string): Promise<string>;
    private getGoogleOAuth2Client;
    getGoogleAuthUrl(instructorId: string): string;
    handleGoogleCallback(code: string, state: string): Promise<void>;
    getValidAccessToken(instructorProfileId: string, platform: 'zoom' | 'google'): Promise<string>;
    getConnectionStatus(instructorUserId: string): Promise<{
        zoom: boolean;
        google: boolean;
    }>;
    disconnectPlatform(instructorUserId: string, platform: 'zoom' | 'google'): Promise<void>;
    getVideoAccounts(instructorUserId: string): Promise<{
        id: string;
        created_at: Date;
        platform: string;
        platform_user_id: string;
    }[]>;
    deleteVideoAccount(accountId: string, instructorUserId: string): Promise<void>;
    createZoomMeeting(instructorUserId: string, topic: string, startTime: Date, durationMinutes: number): Promise<{
        meetingUrl: string;
        meetingId: string;
        platformMeetingId: string;
    }>;
    createGoogleMeetEvent(instructorUserId: string, title: string, startTime: Date, durationMinutes: number): Promise<{
        meetingUrl: string;
        meetingId: string;
        platformMeetingId: string;
    }>;
    hasConnectedAccount(instructorUserId: string, platform: 'zoom' | 'google'): Promise<boolean>;
}
