// components/auth-context.tsx
"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import axios from "axios";
import type { ProfileCustomization } from "@/types/rewards";

interface Donation {
  id: string;
  requestId: number;
  requestTitle: string;
  type: "money" | "item";
  date: string;
  status: "completed" | "pending" | "shipped" | "received" | "cancelled";
  amount?: number;
  items?: { name: string; quantity: number; status?: "shipped" | "received" | "pending" }[];
  paymentMethod?: string;
  trackingNumber?: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  joinDate: string;
  totalDonated: number;
  donationCount: number;
  preferredCategories: string[];
  favoriteCategories: string[];
  interests: string[];
  role: "DONOR" | "ORGANIZER" | "ADMIN";
  customization?: ProfileCustomization;
  organizationName?: string;
  organizationType?: string;
  isVerified: boolean;
  isEmailVerified: boolean;
  documentsVerified?: boolean;
  donations: Donation[];
  token?: string;
  createdAt: string;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: "DONOR" | "ORGANIZER" | "ADMIN";
  organizationId?: string;
  newOrganizationName?: string;
  organizationType?: string;
  registrationNumber?: string;
  templeId?: string;
  interests?: string[];
  documents?: {
    idCard: File | null;
    organizationCert: File | null;
  };
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (userData: RegisterData) => Promise<{ success: boolean; message?: string }>;
  sendOTP: (email: string) => Promise<{ success: boolean; message?: string }>;
  verifyOTP: (email: string, otp: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  setUser: (user: User | null) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ตั้งค่า base URL สำหรับ axios
axios.defaults.baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      axios
        .get<{ user: User }>("/api/auth/me")
        .then((res) => {
          console.log("Fetched user data:", res.data.user);
          setUser({ ...res.data.user, token });
        })
        .catch((error) => {
          console.error("Failed to fetch user data:", error.response?.data?.message || error.message);
          if (error.response?.status === 401) {
            localStorage.removeItem("token");
            delete axios.defaults.headers.common["Authorization"];
          }
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    try {
      const res = await axios.post("/api/auth/login", { email, password });
      const token = res.data.token;
      if (!token) throw new Error("Token not received");

      localStorage.setItem("token", token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setUser({ ...res.data.user, token });
      console.log("Login successful, user:", res.data.user);
      setIsLoading(false);
      return { success: true, message: "เข้าสู่ระบบสำเร็จ" };
    } catch (error: any) {
      console.error("Login error:", error.response?.data?.message || error.message);
      setIsLoading(false);
      return {
        success: false,
        message: error.response?.data?.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ",
      };
    }
  };

  const register = async (userData: RegisterData): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("email", userData.email);
      formData.append("password", userData.password);
      formData.append("firstName", userData.firstName);
      formData.append("lastName", userData.lastName);
      formData.append("phone", userData.phone);
      formData.append("role", userData.role);
      if (userData.organizationId) formData.append("organizationId", userData.organizationId);
      if (userData.newOrganizationName) formData.append("newOrganizationName", userData.newOrganizationName);
      if (userData.organizationType) formData.append("organizationType", userData.organizationType);
      if (userData.registrationNumber) formData.append("registrationNumber", userData.registrationNumber);
      if (userData.templeId) formData.append("templeId", userData.templeId);
      if (userData.interests) formData.append("interests", JSON.stringify(userData.interests));
      if (userData.documents?.idCard) formData.append("idCard", userData.documents.idCard);
      if (userData.documents?.organizationCert) formData.append("organizationCert", userData.documents.organizationCert);

      const res = await axios.post("/api/register", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const token = res.data.token;
      if (!token) throw new Error("Token not received");

      localStorage.setItem("token", token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setUser({ ...res.data.user, token });
      console.log("Register successful, user:", res.data.user);
      setIsLoading(false);
      return { success: true, message: "สมัครสมาชิกสำเร็จ" };
    } catch (error: any) {
      console.error("Register error:", error.response?.data?.message || error.message);
      setIsLoading(false);
      return {
        success: false,
        message: error.response?.data?.message || "เกิดข้อผิดพลาดในการสมัครสมาชิก",
      };
    }
  };

  const sendOTP = async (email: string): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    try {
      const res = await axios.post("/api/otp/send", { email });
      console.log("OTP sent to:", email);
      setIsLoading(false);
      return { success: true, message: "ส่ง OTP สำเร็จ" };
    } catch (error: any) {
      console.error("Send OTP error:", error.response?.data?.message || error.message);
      setIsLoading(false);
      return {
        success: false,
        message: error.response?.data?.message || "เกิดข้อผิดพลาดในการส่ง OTP",
      };
    }
  };

  const verifyOTP = async (email: string, otp: string): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    try {
      const res = await axios.post("/api/otp/verify", { email, otp });
      console.log("OTP verification result:", res.data.success);
      setIsLoading(false);
      return { success: res.data.success, message: res.data.message || "ยืนยัน OTP สำเร็จ" };
    } catch (error: any) {
      console.error("Verify OTP error:", error.response?.data?.message || error.message);
      setIsLoading(false);
      return {
        success: false,
        message: error.response?.data?.message || "รหัส OTP ไม่ถูกต้อง",
      };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
    console.log("User logged out");
  };

  return (
    <AuthContext.Provider value={{ user, login, register, sendOTP, verifyOTP, logout, setUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}