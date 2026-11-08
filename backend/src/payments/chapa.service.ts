import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

export interface ChapaInitResponse {
  status: string;
  message: string;
  data: { checkout_url: string; tx_ref: string };
}

/**
 * ChapaService — wraps the Chapa payment gateway API.
 * Chapa handles Telebirr, CBE Birr, HelloCash, and cards under one integration.
 * Docs: https://developer.chapa.co
 */
@Injectable()
export class ChapaService {
  private readonly logger = new Logger(ChapaService.name);
  private readonly baseUrl: string;
  private readonly secretKey: string;

  constructor(private config: ConfigService) {
    this.baseUrl = config.get('CHAPA_BASE_URL') || 'https://api.chapa.co/v1';
    this.secretKey = config.get('CHAPA_SECRET_KEY') || '';
  }

  /** Initiate a Chapa checkout. Returns the URL to redirect the user to. */
  async initiatePayment(dto: {
    amount: number;
    currency?: string;
    email: string;
    first_name: string;
    last_name: string;
    tx_ref: string; // Your unique transaction reference
    callback_url: string; // Where Chapa POSTs after payment
    return_url: string; // Where to redirect the browser after payment
    description?: string;
  }): Promise<ChapaInitResponse> {
    const body = {
      amount: dto.amount.toString(),
      currency: dto.currency || 'ETB',
      email: dto.email,
      first_name: dto.first_name,
      last_name: dto.last_name,
      tx_ref: dto.tx_ref,
      callback_url: dto.callback_url,
      return_url: dto.return_url,
      description: dto.description || 'Axumia Learning payment',
    };

    const res = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.secretKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Chapa initiate failed: ${err}`);
      throw new Error(`Chapa payment initiation failed: ${res.status}`);
    }

    return res.json() as Promise<ChapaInitResponse>;
  }

  /** Verify a transaction by tx_ref — call this inside your webhook handler */
  async verifyTransaction(txRef: string): Promise<{ status: string; data: any }> {
    const res = await fetch(`${this.baseUrl}/transaction/verify/${txRef}`, {
      headers: { Authorization: `Bearer ${this.secretKey}` },
    });
    if (!res.ok) throw new Error(`Chapa verify failed: ${res.status}`);
    return res.json();
  }

  /**
   * Refund a transaction via Chapa's refund API.
   * `amount` is optional — omitting it issues a full refund.
   * Returns the Chapa API response (status + message).
   */
  async refundTransaction(
    txRef: string,
    amount?: number,
    reason = 'Customer requested refund',
  ): Promise<{ status: string; message: string }> {
    const body: Record<string, any> = { tx_ref: txRef, reason };
    if (amount !== undefined) body.amount = amount.toString();

    const res = await fetch(`${this.baseUrl}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.secretKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Chapa refund failed for ${txRef}: ${err}`);
      throw new Error(`Chapa refund failed: ${res.status}`);
    }
    return res.json();
  }

  /** Verify webhook signature using timing-safe HMAC comparison */
  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    const secret =
      this.config.get<string>('CHAPA_WEBHOOK_SECRET') ||
      this.config.get<string>('CHAPA_SECRET_KEY') ||
      this.secretKey;

    if (!secret) {
      this.logger.error('Neither CHAPA_WEBHOOK_SECRET nor CHAPA_SECRET_KEY is configured. Webhook verification failed.');
      return false;
    }
    if (!signature) {
      this.logger.warn('Webhook received with missing signature header');
      return false;
    }

    try {
      const cleanSig = signature.trim();

      // 1. Standard x-chapa-signature check: HMAC SHA256 of payload signed with secret
      const payloadHmac = createHmac('sha256', secret);
      payloadHmac.update(payload);
      const expectedPayloadHex = payloadHmac.digest('hex');

      const expectedPayloadBuf = Buffer.from(expectedPayloadHex, 'utf8');
      const signatureBuf = Buffer.from(cleanSig, 'utf8');

      if (
        expectedPayloadBuf.length === signatureBuf.length &&
        timingSafeEqual(expectedPayloadBuf, signatureBuf)
      ) {
        return true;
      }

      // 2. Chapa-signature specification: HMAC SHA256 of secret key itself
      const secretHmac = createHmac('sha256', secret);
      secretHmac.update(secret);
      const expectedSecretHex = secretHmac.digest('hex');
      const expectedSecretBuf = Buffer.from(expectedSecretHex, 'utf8');

      if (
        expectedSecretBuf.length === signatureBuf.length &&
        timingSafeEqual(expectedSecretBuf, signatureBuf)
      ) {
        return true;
      }

      // 3. Dev/test mock fallback (NEVER in production)
      const isProd = this.config.get('NODE_ENV') === 'production';
      if (!isProd && (secret.includes('mock') || secret.includes('change-me'))) {
        this.logger.debug('[Dev-Mock] Permitting webhook verification in mock mode');
        return true;
      }

      return false;
    } catch (err) {
      this.logger.error('Error during webhook signature verification:', err);
      return false;
    }
  }
}
