import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

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
      console.log(`Admin ${userId} joined admins room`);
    }
  }

  notifyAgentAndAdmins(agentId: string, bookingData: any) {
    const payload = {
      message: 'New Shortlet Booking Received!',
      ...bookingData,
      timestamp: new Date(),
    };

    // Notify the specific agent
    this.server.to(`agent:${agentId}`).emit('new_booking_alert', payload);

    // Notify all admins
    this.server.to('admins').emit('new_booking_alert', payload);
    
    console.log(`Notification sent for booking ${bookingData.bookingId}`);
  }
}
