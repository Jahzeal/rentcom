import { Controller, Post, Body, UseGuards, Request, Delete } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JwtGuard } from "../auth/guard/jwt.guard";

@Controller("notifications/subscriptions")
export class PushSubscriptionsController {
  constructor(private readonly prisma: PrismaService) {}

  @UseGuards(JwtGuard)
  @Post()
  async subscribe(@Request() req, @Body() body: any) {
    const userId = req.user.id;
    const { endpoint, keys } = body;

    // Check if subscription already exists for this endpoint
    const existing = await this.prisma.pushSubscription.findUnique({
      where: { endpoint },
    });

    if (existing) {
      if (existing.userId === userId) {
        // Just update keys if needed
        return await this.prisma.pushSubscription.update({
          where: { id: existing.id },
          data: {
            p256dh: keys.p256dh,
            auth: keys.auth,
          },
        });
      }
      // Reassign to new user
      return await this.prisma.pushSubscription.update({
        where: { id: existing.id },
        data: { userId, p256dh: keys.p256dh, auth: keys.auth },
      });
    }

    return await this.prisma.pushSubscription.create({
      data: {
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });
  }

  @UseGuards(JwtGuard)
  @Delete()
  async unsubscribe(@Request() req, @Body("endpoint") endpoint: string) {
    const userId = req.user.id;

    const subscription = await this.prisma.pushSubscription.findFirst({
      where: { userId, endpoint },
    });

    if (subscription) {
      return await this.prisma.pushSubscription.delete({
        where: { id: subscription.id },
      });
    }

    return { message: "Subscription not found" };
  }
}
