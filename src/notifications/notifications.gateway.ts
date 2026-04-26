import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PushNotificationsService } from './push-notifications.service';
import { Injectable } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly pushNotificationsService: PushNotificationsService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, payload: { userId: string; role: string }) {
    const { userId, role } = payload;
    
    // Agents join their own specific room
    if (role === 'AGENT') {
      client.join(`agent:${userId}`);
      console.log(`Agent ${userId} joined room agent:${userId}`);
    }

    // Admins join the global admins room
    if (role === 'ADMIN') {
      client.join('admins');
      client.join('global:admins'); // Added for push targeting
      console.log(`Admin ${userId} joined admins room`);
    }
  }

  async notifyAgentAndAdmins(agentId: string, bookingData: any) {
    const payload = {
      message: 'New Shortlet Booking Received!',
      ...bookingData,
      timestamp: new Date(),
    };

    // 1. WebSocket (Live UI)
    this.server.to(`agent:${agentId}`).emit('new_booking_alert', payload);
    this.server.to('admins').emit('new_booking_alert', payload);
    
    // 2. Push Notification (Background/Lock Screen)
    // Notify the specific agent
    await this.pushNotificationsService.sendNotification(
      agentId,
      "New Booking Received!",
      `A new booking for ${bookingData.propertyTitle || "your property"} has arrived.`,
      "/admin/bookings"
    );

    // Note: To notify all admins via push, we would need to query for all users with ADMIN role 
    // and their push subscriptions. For now, we focus on the primary agent.
    
    console.log(`Notification sent for booking ${bookingData.bookingId}`);
  }
}
