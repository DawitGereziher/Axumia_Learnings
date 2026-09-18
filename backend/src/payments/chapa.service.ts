import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
      description: dto.description || 'Ethio Learn payment',
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

  /** Verify webhook signature — Chapa sends x-chapa-signature header */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = require('crypto');
    const secret = this.config.get('CHAPA_WEBHOOK_SECRET') || '';
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return expected === signature;
  }
}
