import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { google } from 'googleapis';

const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Output format: iv:authTag:ciphertext (all hex-encoded).
 */
function encrypt(text: string, key: string): string {
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

/**
 * Decrypt an AES-256-GCM encrypted string produced by `encrypt()`.
 */
function decrypt(ciphertext: string, key: string): string {
  const [ivHex, authTagHex, encHex] = ciphertext.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const enc = Buffer.from(encHex, 'hex');
  const keyBuf = Buffer.from(key, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuf, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString(
    'utf8',
  );
}

/** Detect platform from a meeting link URL. */
export function detectPlatform(link: string): 'zoom' | 'google' | null {
  if (link.includes('zoom.us')) return 'zoom';
  if (link.includes('meet.google.com')) return 'google';
  return null;
}

/** Extract Zoom meeting ID from a Zoom meeting URL. */
export function extractZoomMeetingId(link: string): string | null {
  const m = link.match(/zoom\.us\/j\/(\d+)/);
  return m ? m[1] : null;
}

/** Extract Google Meet room code from a Google Meet URL. */
export function extractGoogleMeetCode(link: string): string | null {
  const m = link.match(/meet\.google\.com\/([a-z0-9\-]+)/i);
  return m ? m[1] : null;
}

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private http: HttpService,
  ) {}

  private get encKey(): string {
    const k = this.config.get<string>('ENCRYPTION_KEY');
    if (!k || k.length !== 64)
      throw new InternalServerErrorException(
        'ENCRYPTION_KEY must be a 32-byte hex string (64 chars)',
      );
    return k;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Zoom OAuth
  // ─────────────────────────────────────────────────────────────────────────────

  getZoomAuthUrl(instructorId: string): string {
    const clientId = this.config.getOrThrow('ZOOM_CLIENT_ID');
    let redirectUri = this.config.getOrThrow('ZOOM_REDIRECT_URI');
    // Ensure redirect URI includes /api prefix
    if (!redirectUri.includes('/api/')) {
      redirectUri = redirectUri.replace(
        '/session-monitoring/',
        '/api/session-monitoring/',
      );
    }
    const state = Buffer.from(
      JSON.stringify({ instructorId, platform: 'zoom' }),
    ).toString('base64url');
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      scope: 'meeting:write:meeting meeting:read:meeting user:read:user',
    });
    return `https://zoom.us/oauth/authorize?${params.toString()}`;
  }

  async handleZoomCallback(code: string, state: string): Promise<void> {
    let instructorId: string;
    try {
      ({ instructorId } = JSON.parse(
        Buffer.from(state, 'base64url').toString('utf8'),
      ));
    } catch {
      throw new BadRequestException('Invalid OAuth state');
    }

    const clientId = this.config.getOrThrow('ZOOM_CLIENT_ID');
    const clientSecret = this.config.getOrThrow('ZOOM_CLIENT_SECRET');
    let redirectUri = this.config.getOrThrow('ZOOM_REDIRECT_URI');
    // Ensure redirect URI includes /api prefix
    if (!redirectUri.includes('/api/')) {
      redirectUri = redirectUri.replace(
        '/session-monitoring/',
        '/api/session-monitoring/',
      );
    }

    // Exchange code for tokens
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64',
    );
    const { data: tokenData } = await firstValueFrom(
      this.http.post(
        'https://zoom.us/oauth/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      ),
    );

    // Get Zoom user info to store platform_user_id
    const { data: userInfo } = await firstValueFrom(
      this.http.get('https://api.zoom.us/v2/users/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }),
    );

    const profile = await this.prisma.instructorProfile.findUnique({
      where: { user_id: instructorId },
    });
    if (!profile) throw new BadRequestException('Instructor profile not found');

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

  async refreshZoomToken(accountId: string): Promise<string> {
    const account = await this.prisma.instructorVideoAccount.findUniqueOrThrow({
      where: { id: accountId },
    });
    if (!account.refresh_token)
      throw new InternalServerErrorException('No refresh token stored');

    const refreshToken = decrypt(account.refresh_token, this.encKey);
    const clientId = this.config.getOrThrow('ZOOM_CLIENT_ID');
    const clientSecret = this.config.getOrThrow('ZOOM_CLIENT_SECRET');
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64',
    );

    const { data } = await firstValueFrom(
      this.http.post(
        'https://zoom.us/oauth/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      ),
    );

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

  // ─────────────────────────────────────────────────────────────────────────────
  // Google OAuth
  // ─────────────────────────────────────────────────────────────────────────────

  private getGoogleOAuth2Client() {
    let redirectUri = this.config.getOrThrow('GOOGLE_MEET_REDIRECT_URI');
    // Ensure redirect URI includes /api prefix
    if (!redirectUri.includes('/api/')) {
      redirectUri = redirectUri.replace(
        '/session-monitoring/',
        '/api/session-monitoring/',
      );
    }
    return new google.auth.OAuth2(
      this.config.getOrThrow('GOOGLE_CLIENT_ID'),
      this.config.getOrThrow('GOOGLE_CLIENT_SECRET'),
      redirectUri,
    );
  }

  getGoogleAuthUrl(instructorId: string): string {
    const oauth2 = this.getGoogleOAuth2Client();
    const state = Buffer.from(
      JSON.stringify({ instructorId, platform: 'google' }),
    ).toString('base64url');
    return oauth2.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // force refresh_token every time
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'openid',
        'email',
      ],
      state,
    });
  }

  async handleGoogleCallback(code: string, state: string): Promise<void> {
    let instructorId: string;
    try {
      ({ instructorId } = JSON.parse(
        Buffer.from(state, 'base64url').toString('utf8'),
      ));
    } catch {
      throw new BadRequestException('Invalid OAuth state');
    }

    // Ensure the redirect URI matches what was used in the auth URL
    let redirectUri = this.config.getOrThrow('GOOGLE_MEET_REDIRECT_URI');
    if (!redirectUri.includes('/api/')) {
      redirectUri = redirectUri.replace(
        '/session-monitoring/',
        '/api/session-monitoring/',
      );
    }

    // Create a new OAuth2Client with the correct redirect URI
    const oauth2 = new google.auth.OAuth2(
      this.config.getOrThrow('GOOGLE_CLIENT_ID'),
      this.config.getOrThrow('GOOGLE_CLIENT_SECRET'),
      redirectUri,
    );

    const { tokens } = await oauth2.getToken(code);
    oauth2.setCredentials(tokens);

    // Get Google user ID
    const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2 });
    const { data: userInfo } = await oauth2Api.userinfo.get();

    const profile = await this.prisma.instructorProfile.findUnique({
      where: { user_id: instructorId },
    });
    if (!profile) throw new BadRequestException('Instructor profile not found');

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
        platform_user_id: userInfo.id!,
        access_token: encrypt(tokens.access_token!, this.encKey),
        refresh_token: tokens.refresh_token
          ? encrypt(tokens.refresh_token, this.encKey)
          : null,
        token_expires_at: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
        scope: tokens.scope,
      },
      update: {
        platform_user_id: userInfo.id!,
        access_token: encrypt(tokens.access_token!, this.encKey),
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Shared helpers
  // ─────────────────────────────────────────────────────────────────────────────

  /** Get decrypted access token, refreshing if needed. */
  async getValidAccessToken(
    instructorProfileId: string,
    platform: 'zoom' | 'google',
  ): Promise<string> {
    const account = await this.prisma.instructorVideoAccount.findUnique({
      where: {
        instructor_id_platform: {
          instructor_id: instructorProfileId,
          platform,
        },
      },
    });
    if (!account)
      throw new BadRequestException(
        `No ${platform} account linked for this instructor`,
      );

    const isExpired =
      account.token_expires_at && account.token_expires_at < new Date();
    if (isExpired && platform === 'zoom') {
      return this.refreshZoomToken(account.id);
    }

    return decrypt(account.access_token, this.encKey);
  }

  async getConnectionStatus(
    instructorUserId: string,
  ): Promise<{ zoom: boolean; google: boolean }> {
    const profile = await this.prisma.instructorProfile.findUnique({
      where: { user_id: instructorUserId },
    });
    if (!profile) return { zoom: false, google: false };

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

  async disconnectPlatform(
    instructorUserId: string,
    platform: 'zoom' | 'google',
  ): Promise<void> {
    const profile = await this.prisma.instructorProfile.findUnique({
      where: { user_id: instructorUserId },
    });
    if (!profile) return;

    await this.prisma.instructorVideoAccount.deleteMany({
      where: { instructor_id: profile.id, platform },
    });
    this.logger.log(`${platform} disconnected for instructor ${profile.id}`);
  }

  async getVideoAccounts(instructorUserId: string) {
    const profile = await this.prisma.instructorProfile.findUnique({
      where: { user_id: instructorUserId },
    });
    if (!profile) return [];

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

  async deleteVideoAccount(accountId: string, instructorUserId: string) {
    const profile = await this.prisma.instructorProfile.findUnique({
      where: { user_id: instructorUserId },
    });
    if (!profile) throw new BadRequestException('Instructor profile not found');

    const account = await this.prisma.instructorVideoAccount.findFirst({
      where: { id: accountId, instructor_id: profile.id },
    });

    if (!account) throw new BadRequestException('Video account not found');

    await this.prisma.instructorVideoAccount.delete({
      where: { id: accountId },
    });
    this.logger.log(
      `Video account ${accountId} disconnected for instructor ${profile.id}`,
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Meeting Creation Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a Zoom meeting using the instructor's connected Zoom account
   */
  async createZoomMeeting(
    instructorUserId: string,
    topic: string,
    startTime: Date,
    durationMinutes: number,
  ): Promise<{
    meetingUrl: string;
    meetingId: string;
    platformMeetingId: string;
  }> {
    const profile = await this.prisma.instructorProfile.findUnique({
      where: { user_id: instructorUserId },
    });
    if (!profile) throw new BadRequestException('Instructor profile not found');

    const account = await this.prisma.instructorVideoAccount.findFirst({
      where: { instructor_id: profile.id, platform: 'zoom' },
    });

    if (!account)
      throw new BadRequestException(
        'No Zoom account connected. Please connect your Zoom account first.',
      );

    const accessToken = await this.getValidAccessToken(profile.id, 'zoom');

    try {
      const { data } = await firstValueFrom(
        this.http.post(
          'https://api.zoom.us/v2/users/me/meetings',
          {
            topic,
            type: 2, // Scheduled meeting
            start_time: startTime.toISOString(),
            duration: durationMinutes,
            settings: {
              host_video: true,
              participant_video: true,
              join_before_host: false,
              mute_upon_entry: false,
              watermark: false,
              use_pmi: false,
              approval_type: 2, // No approval required
              audio: 'both',
              auto_recording: 'none',
              waiting_room: true,
            },
          },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        ),
      );

      const meetingUrl = data.join_url;
      const meetingId = String(data.id);
      const platformMeetingId = meetingId;

      this.logger.log(
        `Zoom meeting created: ${meetingId} for instructor ${profile.id}`,
      );

      return { meetingUrl, meetingId, platformMeetingId };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create Zoom meeting: ${errorMessage}`);
      throw new InternalServerErrorException(
        'Failed to create Zoom meeting. Please try again.',
      );
    }
  }

  /**
   * Create a Google Meet event using the instructor's connected Google account
   */
  async createGoogleMeetEvent(
    instructorUserId: string,
    title: string,
    startTime: Date,
    durationMinutes: number,
  ): Promise<{
    meetingUrl: string;
    meetingId: string;
    platformMeetingId: string;
  }> {
    const profile = await this.prisma.instructorProfile.findUnique({
      where: { user_id: instructorUserId },
    });
    if (!profile) throw new BadRequestException('Instructor profile not found');

    const account = await this.prisma.instructorVideoAccount.findFirst({
      where: { instructor_id: profile.id, platform: 'google' },
    });

    if (!account)
      throw new BadRequestException(
        'No Google account connected. Please connect your Google account first.',
      );

    try {
      const accessToken = await this.getValidAccessToken(profile.id, 'google');

      let redirectUri = this.config.getOrThrow('GOOGLE_MEET_REDIRECT_URI');
      if (!redirectUri.includes('/api/')) {
        redirectUri = redirectUri.replace(
          '/session-monitoring/',
          '/api/session-monitoring/',
        );
      }

      const oauth2 = new google.auth.OAuth2(
        this.config.getOrThrow('GOOGLE_CLIENT_ID'),
        this.config.getOrThrow('GOOGLE_CLIENT_SECRET'),
        redirectUri,
      );
      oauth2.setCredentials({ access_token: accessToken });

      const calendar = google.calendar({ version: 'v3', auth: oauth2 });

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
      const platformMeetingId = meetingId; // Google Meet uses event ID

      if (!meetingUrl || !meetingId) {
        throw new InternalServerErrorException(
          'Failed to create Google Meet event: No meeting URL or ID returned',
        );
      }

      this.logger.log(
        `Google Meet event created: ${meetingId} for instructor ${profile.id}`,
      );

      return { meetingUrl, meetingId, platformMeetingId };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create Google Meet event: ${errorMessage}`);
      throw new InternalServerErrorException(
        'Failed to create Google Meet event. Please try again.',
      );
    }
  }

  /**
   * Check if instructor has a connected account for a specific platform
   */
  async hasConnectedAccount(
    instructorUserId: string,
    platform: 'zoom' | 'google',
  ): Promise<boolean> {
    const profile = await this.prisma.instructorProfile.findUnique({
      where: { user_id: instructorUserId },
    });
    if (!profile) return false;

    const account = await this.prisma.instructorVideoAccount.findFirst({
      where: { instructor_id: profile.id, platform },
    });

    return !!account;
  }
}
