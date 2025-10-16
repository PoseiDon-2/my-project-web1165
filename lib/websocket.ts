// lib/websocket.ts
import { Server } from 'socket.io';
import type { Server as HTTPServer } from 'http';

let io: Server | null = null;

// อินเทอร์เฟซสำหรับ client
interface Client {
    socketId: string;
    userId: string;
}

const clients: Client[] = [];

// ฟังก์ชันเริ่มต้น WebSocket server
export function initializeWebSocket(server: HTTPServer) {
    if (!io) {
        io = new Server(server, {
            cors: {
                origin: '*', // ปรับตามความต้องการ (เช่น ระบุ frontend URL)
                methods: ['GET', 'POST'],
            },
        });

        io.on('connection', (socket) => {
            console.log('Client connected:', socket.id);

            socket.on('register', (data: { userId: string }) => {
                if (data.userId) {
                    clients.push({ socketId: socket.id, userId: data.userId });
                    console.log(`User ${data.userId} registered to WebSocket`);
                }
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
                const index = clients.findIndex((client) => client.socketId === socket.id);
                if (index > -1) {
                    clients.splice(index, 1);
                }
            });
        });
    }
    return io;
}

// ฟังก์ชัน broadcast recommendations
export function broadcastRecommendations(userId: string, recommendations: any[]) {
    if (!io) {
        console.error('WebSocket server not initialized');
        return;
    }
    const targetClients = clients.filter((client) => client.userId === userId);
    targetClients.forEach((client) => {
        io!.to(client.socketId).emit('recommendations-update', {
            type: 'recommendations-update',
            userId,
            recommendations,
        });
    });
    console.log(`Broadcasted recommendations to user ${userId}`);
}

export default io;