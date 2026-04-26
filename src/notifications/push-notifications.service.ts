import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as webpush from "web-push";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PushNotificationsService {
  private readonly logger = new Logger(PushNotificationsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const publicKey = this.configService.get<string>("VAPID_PUBLIC_KEY");
    const privateKey = this.configService.get<string>("VAPID_PRIVATE_KEY");
    const email = this.configService.get<string>("VAPID_EMAIL") || "mailto:support@rent-app.com";

    if (publicKey && privateKey) {
      webpush.setVapidDetails(email, publicKey, privateKey);
      this.logger.log("VAPID details set successfully.");
    } else {
      this.logger.warn("VAPID keys not found in environment variables. Push notifications will fail if triggered.");
    }
  }

  /**
   * Send a push notification to all subscriptions of a specific user.
   */
  async sendNotification(userId: string, title: string, body: string, url: string = "/") {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      this.logger.debug(`No push subscriptions found for user: ${userId}`);
      return;
    }

    const payload = JSON.stringify({
      notification: {
        title,
        body,
        icon: "/icons/icon-192x192.png",
        data: { url },
      },
    });

    const tasks = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
      } catch (error) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Subscription expired or no longer valid
          this.logger.warn(`Removing invalid subscription for user ${userId}: ${sub.endpoint}`);
          await this.prisma.pushSubscription.delete({ where: { id: sub.id } });
        } else {
          this.logger.error(`Error sending push notification: ${error.message}`, error.stack);
        }
      }
    });

    await Promise.allSettled(tasks);
  }
}
