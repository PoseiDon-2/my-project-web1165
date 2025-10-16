// /lib/auth.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
  organizationId?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(user: AuthUser): string {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    organizationId: user.organizationId,
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  console.log("Generated token payload:", payload); // Debug
  console.log("Generated token:", token); // Debug
  return token;
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    console.log("Decoded token:", decoded); // Debug
    return decoded;
  } catch (error: any) {
    console.error("Token verification failed:", error.message);
    return null;
  }
}