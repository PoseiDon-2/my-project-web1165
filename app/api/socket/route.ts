// app/api/socket/route.ts
import { Server } from 'http';
import { NextRequest, NextResponse } from 'next/server';
import { initializeWebSocket } from '@/lib/websocket';

export async function GET(req: NextRequest) {
    const server = (req as any).nextRequest.server as Server; // ใช้ server จาก Next.js
    if (!server) {
        return NextResponse.json({ error: 'Server not available' }, { status: 500 });
    }

    initializeWebSocket(server);
    return NextResponse.json({ message: 'WebSocket initialized' });
}

// ทำให้เป็น dynamic route
export const dynamic = 'force-dynamic';