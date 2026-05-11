/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import emailjs from '@emailjs/nodejs';

@Injectable()
export class MailService {
  private readonly serviceID: string;
  private readonly templateID: string;
  private readonly privateKey: string;
  private readonly publicKey: string;

  constructor(private config: ConfigService) {
    // It is best practice to use the public key as well with EmailJS
    this.serviceID = this.getEnv('EMAILJS_SERVICE_ID');
    this.templateID = this.getEnv('EMAILJS_TEMPLATE_ID');
    this.privateKey = this.getEnv('EMAILJS_PRIVATE_KEY');
    this.publicKey = this.getEnv('EMAILJS_PUBLIC_KEY');
  }

  private getEnv(key: string): string {
    const value = this.config.get<string>(key);
    if (!value) {
      throw new Error(`Missing environment variable ${key}`);
    }
    return value;
  }

  async sendVerificationCode(email: string, code: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const formattedTime = expiresAt.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    try {
      await emailjs.send(
        this.serviceID,
        this.templateID,
        {
          email: email,
          passcode: code,
          time: formattedTime,
        },
        {
          publicKey: this.publicKey,
          privateKey: this.privateKey,
        },
      );
    } catch (error: unknown) {
      console.error('EmailJS error:', error);
      throw new InternalServerErrorException(
        'Failed to send verification email',
      );
    }
  }

  async sendSupportNotification(ticket: { name: string, email: string, subject: string, message: string }): Promise<void> {
    try {
      await emailjs.send(
        this.serviceID,
        this.templateID, // Note: You might want a different template for support
        {
          from_name: ticket.name,
          from_email: ticket.email,
          subject: ticket.subject,
          message: ticket.message,
        },
        {
          publicKey: this.publicKey,
          privateKey: this.privateKey,
        },
      );
    } catch (error: unknown) {
      console.error('EmailJS Support Notification error:', error);
      // We don't throw here to avoid failing the ticket creation if email fails
    }
  }
}
