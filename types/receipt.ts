"use client"
// @/types/receipt.ts
export interface Receipt {
  id: string;
  donationId: string;
  requestId: string;
  requestTitle: string;
  donorId: string;
  donorName?: string; // Optional สำหรับ isAnonymous
  amount: number;
  type: "money" | "items" | "volunteer"; // สอดคล้องกับ DonationType
  status: "pending" | "completed" | "cancelled" | "refunded";
  receiptNumber: string;
  issuedAt: Date;
  paymentMethod?: string;
  transactionId?: string;
  items?: {
    name: string;
    quantity: number;
    status: "pending" | "delivered" | "received";
  }[];
  deliveryMethod?: "send-to-address" | "drop-off";
  trackingNumber?: string;
  volunteerHours?: number;
  volunteerSkills?: string[];
  message?: string;
  isAnonymous: boolean;
  pointsEarned: number;
  organizerId?: string; // เปลี่ยนเป็น optional เพื่อรับ undefined ได้
  organizerName?: string; // เปลี่ยนเป็น optional เพื่อรับ undefined ได้
  createdAt: Date;
  updatedAt: Date;
  attachments?: {
    id: string;
    url: string;
    filename: string;
    fileType: string;
    fileSize: number;
    uploadedAt: Date;
  }[];
}

export interface DonationHistory {
  id: string
  requestId: string
  requestTitle: string
  organizerId: string
  organizerName: string

  // Summary stats
  totalAmount: number
  totalDonations: number
  totalVolunteers: number
  totalItems: number

  // Recent donations
  recentDonations: Receipt[]

  // Status tracking
  status: "active" | "completed" | "cancelled"

  // Timestamps
  createdAt: Date
  updatedAt: Date
}

export interface ReceiptFilter {
  type?: "money" | "items" | "volunteer"
  status?: "pending" | "completed" | "cancelled" | "refunded"
  dateFrom?: Date
  dateTo?: Date
  requestId?: string
  donorId?: string
}
