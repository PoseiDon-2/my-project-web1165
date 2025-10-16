// /lib/auth-server.ts
import prisma from './prisma';
import { verifyToken, AuthUser } from './auth';

export async function getUserFromToken(token: string): Promise<AuthUser | null> {
    try {
        const decoded = verifyToken(token);
        if (!decoded || !decoded.id) {
            console.log("No id in decoded token:", decoded);
            return null;
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
        });
        console.log("Found user:", user); // Debug
        if (!user) return null;
        // Ensure firstName and other required AuthUser fields are not null
        return {
            ...user,
            firstName: user.firstName ?? "",
            lastName: user.lastName ?? "",
            // Add similar conversions for other AuthUser fields if needed
        } as AuthUser;
    } catch (error: any) {
        console.error("Error getting user from token:", error.message);
        return null;
    }
}