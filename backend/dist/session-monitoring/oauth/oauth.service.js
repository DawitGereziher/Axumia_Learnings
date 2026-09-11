"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var OAuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthService = void 0;
exports.detectPlatform = detectPlatform;
exports.extractZoomMeetingId = extractZoomMeetingId;
exports.extractGoogleMeetCode = extractGoogleMeetCode;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../prisma/prisma.service");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const crypto = __importStar(require("crypto"));
const googleapis_1 = require("googleapis");
const ALGORITHM = 'aes-256-gcm';
function encrypt(text, key) {
    const iv = crypto.randomBytes(12);
    const keyBuf = Buffer.from(key, 'hex');
    const cipher = crypto.createCipheriv(ALGORITHM, keyBuf, iv);
    const encrypted = Buffer.concat([
        cipher.update(text, 'utf8'),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}
function decrypt(ciphertext, key) {
    const [ivHex, authTagHex, encHex] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const enc = Buffer.from(encHex, 'hex');
    const keyBuf = Buffer.from(key, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuf, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
function detectPlatform(link) {
    if (link.includes('zoom.us'))
        return 'zoom';
    if (link.includes('meet.google.com'))
        return 'google';
    return null;
}
function extractZoomMeetingId(link) {
    const m = link.match(/zoom\.us\/j\/(\d+)/);
    return m ? m[1] : null;
}
function extractGoogleMeetCode(link) {
    const m = link.match(/meet\.google\.com\/([a-z0-9\-]+)/i);
    return m ? m[1] : null;
}
let OAuthService = OAuthService_1 = class OAuthService {
    config;
    prisma;
    http;
    logger = new common_1.Logger(OAuthService_1.name);
    constructor(config, prisma, http) {
        this.config = config;
        this.prisma = prisma;
        this.http = http;
    }
    get encKey() {
        const k = this.config.get('ENCRYPTION_KEY');
        if (!k || k.length !== 64)
            throw new common_1.InternalServerErrorException('ENCRYPTION_KEY must be a 32-byte hex string (64 chars)');
        return k;
    }
    getZoomAuthUrl(instructorId) {
        const clientId = this.config.getOrThrow('ZOOM_CLIENT_ID');
        let redirectUri = this.config.getOrThrow('ZOOM_REDIRECT_URI');
        if (!redirectUri.includes('/api/')) {
            redirectUri = redirectUri.replace('/session-monitoring/', '/api/session-monitoring/');
        }
        const state = Buffer.from(JSON.stringify({ instructorId, platform: 'zoom' })).toString('base64url');
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: clientId,
            redirect_uri: redirectUri,
            state,
            scope: 'meeting:write:meeting meeting:read:meeting user:read:user',
        });
        return `https://zoom.us/oauth/authorize?${params.toString()}`;
    }
    async handleZoomCallback(code, state) {
        let instructorId;
        try {
            ({ instructorId } = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')));
        }
        catch {
            throw new common_1.BadRequestException('Invalid OAuth state');
        }
        const clientId = this.config.getOrThrow('ZOOM_CLIENT_ID');
        const clientSecret = this.config.getOrThrow('ZOOM_CLIENT_SECRET');
        let redirectUri = this.config.getOrThrow('ZOOM_REDIRECT_URI');
        if (!redirectUri.includes('/api/')) {
            redirectUri = redirectUri.replace('/session-monitoring/', '/api/session-monitoring/');
        }
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const { data: tokenData } = await (0, rxjs_1.firstValueFrom)(this.http.post('https://zoom.us/oauth/token', new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
        }), {
            headers: {
                Authorization: `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        }));
        const { data: userInfo } = await (0, rxjs_1.firstValueFrom)(this.http.get('https://api.zoom.us/v2/users/me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        }));
        const profile = await this.prisma.instructorProfile.findUnique({
            where: { user_id: instructorId },
        });
        if (!profile)
            throw new common_1.BadRequestException('Instructor profile not found');
        await this.prisma.instructorVideoAccount.upsert({
            where: {
                instructor_id_platform: { instructor_id: profile.id, platform: 'zoom' },
            },
            create: {
                instructor_id: profile.id,
                platform: 'zoom',
                platform_user_id: userInfo.id,
                access_token: encrypt(tokenData.access_token, this.encKey),
                refresh_token: tokenData.refresh_token
                    ? encrypt(tokenData.refresh_token, this.encKey)
                    : null,
                token_expires_at: tokenData.expires_in
                    ? new Date(Date.now() + tokenData.expires_in * 1000)
                    : null,
                scope: tokenData.scope,
            },
            update: {
                platform_user_id: userInfo.id,
                access_token: encrypt(tokenData.access_token, this.encKey),
                refresh_token: tokenData.refresh_token
                    ? encrypt(tokenData.refresh_token, this.encKey)
                    : null,
                token_expires_at: tokenData.expires_in
                    ? new Date(Date.now() + tokenData.expires_in * 1000)
                    : null,
                scope: tokenData.scope,
            },
        });
        this.logger.log(`Zoom account linked for instructor ${profile.id}`);
    }
    async refreshZoomToken(accountId) {
        const account = await this.prisma.instructorVideoAccount.findUniqueOrThrow({
            where: { id: accountId },
        });
        if (!account.refresh_token)
            throw new common_1.InternalServerErrorException('No refresh token stored');
        const refreshToken = decrypt(account.refresh_token, this.encKey);
        const clientId = this.config.getOrThrow('ZOOM_CLIENT_ID');
        const clientSecret = this.config.getOrThrow('ZOOM_CLIENT_SECRET');
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const { data } = await (0, rxjs_1.firstValueFrom)(this.http.post('https://zoom.us/oauth/token', new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }), {
            headers: {
                Authorization: `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        }));
        await this.prisma.instructorVideoAccount.update({
            where: { id: accountId },
            data: {
                access_token: encrypt(data.access_token, this.encKey),
                refresh_token: data.refresh_token
                    ? encrypt(data.refresh_token, this.encKey)
                    : account.refresh_token,
                token_expires_at: data.expires_in
                    ? new Date(Date.now() + data.expires_in * 1000)
                    : null,
            },
        });
        return data.access_token;
    }
    getGoogleOAuth2Client() {
        let redirectUri = this.config.getOrThrow('GOOGLE_MEET_REDIRECT_URI');
        if (!redirectUri.includes('/api/')) {
            redirectUri = redirectUri.replace('/session-monitoring/', '/api/session-monitoring/');
        }
        return new googleapis_1.google.auth.OAuth2(this.config.getOrThrow('GOOGLE_CLIENT_ID'), this.config.getOrThrow('GOOGLE_CLIENT_SECRET'), redirectUri);
    }
    getGoogleAuthUrl(instructorId) {
        const oauth2 = this.getGoogleOAuth2Client();
        const state = Buffer.from(JSON.stringify({ instructorId, platform: 'google' })).toString('base64url');
        return oauth2.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: [
                'https://www.googleapis.com/auth/calendar',
                'https://www.googleapis.com/auth/calendar.events',
                'openid',
                'email',
            ],
            state,
        });
    }
    async handleGoogleCallback(code, state) {
        let instructorId;
        try {
            ({ instructorId } = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')));
        }
        catch {
            throw new common_1.BadRequestException('Invalid OAuth state');
        }
        let redirectUri = this.config.getOrThrow('GOOGLE_MEET_REDIRECT_URI');
        if (!redirectUri.includes('/api/')) {
            redirectUri = redirectUri.replace('/session-monitoring/', '/api/session-monitoring/');
        }
        const oauth2 = new googleapis_1.google.auth.OAuth2(this.config.getOrThrow('GOOGLE_CLIENT_ID'), this.config.getOrThrow('GOOGLE_CLIENT_SECRET'), redirectUri);
        const { tokens } = await oauth2.getToken(code);
        oauth2.setCredentials(tokens);
        const oauth2Api = googleapis_1.google.oauth2({ version: 'v2', auth: oauth2 });
        const { data: userInfo } = await oauth2Api.userinfo.get();
        const profile = await this.prisma.instructorProfile.findUnique({
            where: { user_id: instructorId },
        });
        if (!profile)
            throw new common_1.BadRequestException('Instructor profile not found');
        await this.prisma.instructorVideoAccount.upsert({
            where: {
                instructor_id_platform: {
                    instructor_id: profile.id,
                    platform: 'google',
                },
            },
            create: {
                instructor_id: profile.id,
                platform: 'google',
                platform_user_id: userInfo.id,
                access_token: encrypt(tokens.access_token, this.encKey),
                refresh_token: tokens.refresh_token
                    ? encrypt(tokens.refresh_token, this.encKey)
                    : null,
                token_expires_at: tokens.expiry_date
                    ? new Date(tokens.expiry_date)
                    : null,
                scope: tokens.scope,
            },
            update: {
                platform_user_id: userInfo.id,
                access_token: encrypt(tokens.access_token, this.encKey),
                refresh_token: tokens.refresh_token
                    ? encrypt(tokens.refresh_token, this.encKey)
                    : undefined,
                token_expires_at: tokens.expiry_date
                    ? new Date(tokens.expiry_date)
                    : null,
                scope: tokens.scope,
            },
        });
        this.logger.log(`Google account linked for instructor ${profile.id}`);
    }
    async getValidAccessToken(instructorProfileId, platform) {
        const account = await this.prisma.instructorVideoAccount.findUnique({
            where: {
                instructor_id_platform: {
                    instructor_id: instructorProfileId,
                    platform,
                },
            },
        });
        if (!account)
            throw new common_1.BadRequestException(`No ${platform} account linked for this instructor`);
        const isExpired = account.token_expires_at && account.token_expires_at < new Date();
        if (isExpired && platform === 'zoom') {
            return this.refreshZoomToken(account.id);
        }
        return decrypt(account.access_token, this.encKey);
    }
    async getConnectionStatus(instructorUserId) {
        const profile = await this.prisma.instructorProfile.findUnique({
            where: { user_id: instructorUserId },
        });
        if (!profile)
            return { zoom: false, google: false };
        const accounts = await this.prisma.instructorVideoAccount.findMany({
            where: { instructor_id: profile.id },
            select: { platform: true },
        });
        const platforms = accounts.map((a) => a.platform);
        return {
            zoom: platforms.includes('zoom'),
            google: platforms.includes('google'),
        };
    }
    async disconnectPlatform(instructorUserId, platform) {
        const profile = await this.prisma.instructorProfile.findUnique({
            where: { user_id: instructorUserId },
        });
        if (!profile)
            return;
        await this.prisma.instructorVideoAccount.deleteMany({
            where: { instructor_id: profile.id, platform },
        });
        this.logger.log(`${platform} disconnected for instructor ${profile.id}`);
    }
    async getVideoAccounts(instructorUserId) {
        const profile = await this.prisma.instructorProfile.findUnique({
            where: { user_id: instructorUserId },
        });
        if (!profile)
            return [];
        return this.prisma.instructorVideoAccount.findMany({
            where: { instructor_id: profile.id },
            select: {
                id: true,
                platform: true,
                platform_user_id: true,
                created_at: true,
            },
        });
    }
    async deleteVideoAccount(accountId, instructorUserId) {
        const profile = await this.prisma.instructorProfile.findUnique({
            where: { user_id: instructorUserId },
        });
        if (!profile)
            throw new common_1.BadRequestException('Instructor profile not found');
        const account = await this.prisma.instructorVideoAccount.findFirst({
            where: { id: accountId, instructor_id: profile.id },
        });
        if (!account)
            throw new common_1.BadRequestException('Video account not found');
        await this.prisma.instructorVideoAccount.delete({
            where: { id: accountId },
        });
        this.logger.log(`Video account ${accountId} disconnected for instructor ${profile.id}`);
    }
    async createZoomMeeting(instructorUserId, topic, startTime, durationMinutes) {
        const profile = await this.prisma.instructorProfile.findUnique({
            where: { user_id: instructorUserId },
        });
        if (!profile)
            throw new common_1.BadRequestException('Instructor profile not found');
        const account = await this.prisma.instructorVideoAccount.findFirst({
            where: { instructor_id: profile.id, platform: 'zoom' },
        });
        if (!account)
            throw new common_1.BadRequestException('No Zoom account connected. Please connect your Zoom account first.');
        const accessToken = await this.getValidAccessToken(profile.id, 'zoom');
        try {
            const { data } = await (0, rxjs_1.firstValueFrom)(this.http.post('https://api.zoom.us/v2/users/me/meetings', {
                topic,
                type: 2,
                start_time: startTime.toISOString(),
                duration: durationMinutes,
                settings: {
                    host_video: true,
                    participant_video: true,
                    join_before_host: false,
                    mute_upon_entry: false,
                    watermark: false,
                    use_pmi: false,
                    approval_type: 2,
                    audio: 'both',
                    auto_recording: 'none',
                    waiting_room: true,
                },
            }, { headers: { Authorization: `Bearer ${accessToken}` } }));
            const meetingUrl = data.join_url;
            const meetingId = String(data.id);
            const platformMeetingId = meetingId;
            this.logger.log(`Zoom meeting created: ${meetingId} for instructor ${profile.id}`);
            return { meetingUrl, meetingId, platformMeetingId };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to create Zoom meeting: ${errorMessage}`);
            throw new common_1.InternalServerErrorException('Failed to create Zoom meeting. Please try again.');
        }
    }
    async createGoogleMeetEvent(instructorUserId, title, startTime, durationMinutes) {
        const profile = await this.prisma.instructorProfile.findUnique({
            where: { user_id: instructorUserId },
        });
        if (!profile)
            throw new common_1.BadRequestException('Instructor profile not found');
        const account = await this.prisma.instructorVideoAccount.findFirst({
            where: { instructor_id: profile.id, platform: 'google' },
        });
        if (!account)
            throw new common_1.BadRequestException('No Google account connected. Please connect your Google account first.');
        try {
            const accessToken = await this.getValidAccessToken(profile.id, 'google');
            let redirectUri = this.config.getOrThrow('GOOGLE_MEET_REDIRECT_URI');
            if (!redirectUri.includes('/api/')) {
                redirectUri = redirectUri.replace('/session-monitoring/', '/api/session-monitoring/');
            }
            const oauth2 = new googleapis_1.google.auth.OAuth2(this.config.getOrThrow('GOOGLE_CLIENT_ID'), this.config.getOrThrow('GOOGLE_CLIENT_SECRET'), redirectUri);
            oauth2.setCredentials({ access_token: accessToken });
            const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2 });
            const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
            const response = await calendar.events.insert({
                calendarId: 'primary',
                conferenceDataVersion: 1,
                requestBody: {
                    summary: title,
                    start: {
                        dateTime: startTime.toISOString(),
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    },
                    end: {
                        dateTime: endTime.toISOString(),
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    },
                    conferenceData: {
                        createRequest: {
                            requestId: `help-session-${Date.now()}`,
                            conferenceSolutionKey: {
                                type: 'hangoutsMeet',
                            },
                        },
                    },
                    description: 'Help session created via Axumia Learning Platform',
                },
            });
            const meetingUrl = response.data.hangoutLink || '';
            const meetingId = response.data.id || '';
            const platformMeetingId = meetingId;
            if (!meetingUrl || !meetingId) {
                throw new common_1.InternalServerErrorException('Failed to create Google Meet event: No meeting URL or ID returned');
            }
            this.logger.log(`Google Meet event created: ${meetingId} for instructor ${profile.id}`);
            return { meetingUrl, meetingId, platformMeetingId };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to create Google Meet event: ${errorMessage}`);
            throw new common_1.InternalServerErrorException('Failed to create Google Meet event. Please try again.');
        }
    }
    async hasConnectedAccount(instructorUserId, platform) {
        const profile = await this.prisma.instructorProfile.findUnique({
            where: { user_id: instructorUserId },
        });
        if (!profile)
            return false;
        const account = await this.prisma.instructorVideoAccount.findFirst({
            where: { instructor_id: profile.id, platform },
        });
        return !!account;
    }
};
exports.OAuthService = OAuthService;
exports.OAuthService = OAuthService = OAuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        axios_1.HttpService])
], OAuthService);
//# sourceMappingURL=oauth.service.js.map