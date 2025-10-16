"use client"
export interface ProfileCustomization {
  userId: string;
  theme: "default" | "gold" | "platinum" | "diamond";
  badge: string;
  frame: string;
  title: string;
  background: string;
  effects: string[];
}

export type ProfileCustomizationType = ProfileCustomization;

export interface UserLevel {
  level: number;
  name: string;
  minPoints: number;
  color: string;
  nextLevelPoints: number;
  progress: number;
}

export interface UserPoints {
  userId: string;
  totalPoints: number;
  availablePoints: number;
  pointsHistory: PointsTransaction[];
  level: number;
  levelName: string;
  nextLevelPoints: number;
  progress: number;
  color: string;
}

export interface PointsTransaction {
  id: string;
  type: "earned" | "spent";
  amount: number;
  source: string;
  description: string;
  date: string;
  relatedId?: string;
}

export interface Reward {
  id: string;
  userId: string;
  rewardId: string;
  isActive: boolean;
  createdAt: Date; // เปลี่ยนจาก string เป็น Date
  expiresAt?: Date; // ถ้ามีการเพิ่ม expiresAt
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  bio?: string;
  avatar?: string;
  createdAt: string;
  joinDate: string;
  totalDonated: number;
  donationCount: number;
  preferredCategories: string[];
  interests: string[];
  role: "DONOR" | "ORGANIZER" | "ADMIN";
  customization?: ProfileCustomizationType;
  organizationName?: string;
  organizationType?: string;
  isVerified: boolean;
  isEmailVerified: boolean;
  documentsVerified?: boolean;
  donations: Array<{
    id: string;
    requestId: string;
    requestTitle: string;
    status: "pending" | "completed" | "cancelled" | "refunded" | "shipped" | "received";
    date: string;
    type: "money" | "item" | "volunteer";
    amount?: number;
    paymentMethod?: string;
    items?: Array<{ name: string; quantity: number; status?: "shipped" | "received" | "pending" }>;
    trackingNumber?: string;
  }>;
  token?: string;
}

export const POINTS_CONFIG = {
  MONEY_DONATION: 10,
  ITEM_DONATION: 50,
  VOLUNTEER_HOURS: 20,
  STORY_SHARE: 25,
  REFERRAL: 100,
  DAILY_LOGIN: 5,
  PROFILE_COMPLETE: 50,
  ADD_AVATAR: 30,
};

export const USER_LEVELS = [
  { level: 1, name: "ผู้เริ่มต้น", minPoints: 0, color: "#94a3b8" },
  { level: 2, name: "ผู้ช่วยเหลือ", minPoints: 100, color: "#10b981" },
  { level: 3, name: "ผู้มีจิตใจดี", minPoints: 500, color: "#3b82f6" },
  { level: 4, name: "นักบุญแห่งการให้", minPoints: 1000, color: "#8b5cf6" },
  { level: 5, name: "ทูตแห่งความดี", minPoints: 2500, color: "#f59e0b" },
  { level: 6, name: "ตำนานแห่งการบริจาค", minPoints: 5000, color: "#ef4444" },
];