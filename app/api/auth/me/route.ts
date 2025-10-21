// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { userService } from "@/lib/database";

interface DecodedToken {
    id: string;
    email: string;
    role: string;
}

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get("authorization");
        console.log('Authorization header:', authHeader);
        if (!authHeader) {
            return NextResponse.json({ message: "ไม่มี token" }, { status: 401 });
        }

        const token = authHeader.replace("Bearer ", "");
        console.log('Token:', token);

        const decoded = jwt.verify(token, process.env.JWT_SECRET || "another_new_random_secret_here") as DecodedToken;
        console.log('Decoded token:', decoded);

        const user = await userService.findById(decoded.id);
        console.log('User fetched:', user);
        if (!user) {
            return NextResponse.json({ message: "ไม่พบผู้ใช้" }, { status: 404 });
        }

        return NextResponse.json({ user });
    } catch (error: any) {
        console.error("Error in /api/auth/me:", {
            message: error.message,
            stack: error.stack,
            name: error.name,
        });
        if (error.name === "TokenExpiredError") {
            return NextResponse.json({ message: "Token หมดอายุ" }, { status: 401 });
        }
        if (error.name === "JsonWebTokenError") {
            return NextResponse.json({ message: "Token ไม่ถูกต้อง" }, { status: 401 });
        }
        return NextResponse.json({ message: `เกิดข้อผิดพลาด: ${error.message}` }, { status: 500 });
    }
}