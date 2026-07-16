import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "../index";

if (!process.env.JWT_SECRET) {
  console.error("[Auth] FATAL: JWT_SECRET environment variable is not set. Set it in backend/.env");
}
const JWT_SECRET = process.env.JWT_SECRET || "browser-auto-jwt-secret-change-in-production";
const JWT_EXPIRES_IN = "7d";

export interface JwtPayload {
  userId: string;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export async function createUser(email: string, name: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Email already registered");
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, name, passwordHash },
  });

  const token = generateToken({ userId: user.id, email: user.email });
  return {
    user: { id: user.id, email: user.email, name: user.name },
    token,
  };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error("Invalid email or password");
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw new Error("Invalid email or password");
  }

  const token = generateToken({ userId: user.id, email: user.email });
  return {
    user: { id: user.id, email: user.email, name: user.name },
    token,
  };
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, notifyEmail: true, createdAt: true },
  });
}
