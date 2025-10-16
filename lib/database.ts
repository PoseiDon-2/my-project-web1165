import prisma from './prisma';
import { Prisma, DonationRequestStatus, user_role, DonationType, DonationStatus, VolunteerStatus, StoryStatus, UrgencyLevel, organization_type } from '@prisma/client';
import { z } from 'zod';
import { donationRequestUpdateSchema } from "./validations";

interface ProfileCustomization {
  theme?: string;
  notifications?: {
    email: boolean;
    sms: boolean;
  };
}

interface UserResponse {
  id: string;
  email: string;
  firstName: string | null; // ปรับให้ตรงกับ schema (nullable)
  lastName: string | null; // ปรับให้ตรงกับ schema (nullable)
  phone?: string;
  avatar?: string;
  bio?: string;
  joinDate: string;
  totalDonated: number;
  donationCount: number;
  preferredCategories: string[];
  favoriteCategories: string[];
  interests: string[];
  role: user_role;
  organizationId?: string;
  customization?: ProfileCustomization;
  organizationName?: string;
  organizationType?: organization_type;
  isVerified: boolean;
  isEmailVerified: boolean;
  documentsVerified?: boolean;
  donations: {
    id: string;
    requestId: string;
    requestTitle: string; // ใช้จาก request.title
    type: DonationType;
    date: string; // ใช้ createdAt
    status: DonationStatus;
    amount?: number;
    items?: { name: string; quantity: number; status?: "shipped" | "received" | "pending" }[];
  }[];
  createdAt: string;
}

interface DonationRequestResponse {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryId: string;
  goalAmount: number;
  currentAmount: number;
  donors: number;
  status: DonationRequestStatus;
  urgency: UrgencyLevel;
  createdDate: string;
  endDate: string | null;
  daysLeft: number;
  images: { url: string; publicId: string }[];
  itemsNeeded: { name: string; quantity: number; received: number }[];
  volunteerSkills: string[];
  volunteerDuration: string | null;
  volunteersNeeded: number;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  organizerId: string;
  organizationName: string | null;
  organizer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
  };
  donations: {
    id: string;
    requestId: string;
    requestTitle: string;
    type: DonationType;
    date: string;
    status: DonationStatus;
    amount?: number;
    items?: { name: string; quantity: number; status?: 'shipped' | 'received' | 'pending' }[];
  }[];
  volunteerApplications: {
    id: string;
    userId: string;
    status: VolunteerStatus;
    appliedAt: string;
  }[];
  story: {
    id: string;
    content: string;
    status: StoryStatus;
    createdAt: string;
  } | null;
  viewCount: number;
}

export const userService = {
  async create(data: Prisma.userCreateInput): Promise<UserResponse> {
    try {
      const user = await prisma.user.create({
        data,
        include: {
          organization: {
            select: { id: true, name: true, type: true }, // เพิ่ม id
          },
          userinterest: {
            select: { interestId: true },
          },
          donations: {
            select: {
              id: true,
              requestId: true,
              type: true,
              createdAt: true, // ใช้ createdAt แทน date
              status: true,
              amount: true,
              itemDetails: true, // ใช้ itemDetails แทน items
            },
            include: {
              request: {
                select: {
                  title: true, // ดึง title จาก DonationRequest
                },
              },
            },
          },
          donationRequests: true,
          volunteerApplications: true,
        },
      });
      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName, // Nullable ตาม schema
        lastName: user.lastName, // Nullable ตาม schema
        phone: user.phone || undefined,
        avatar: user.avatar || undefined,
        bio: user.bio || undefined,
        joinDate: user.createdAt.toISOString(),
        totalDonated: user.donations.reduce((sum: number, d) => sum + Number(d.amount || 0), 0), // เพิ่ม type number และแปลง Decimal
        donationCount: user.donations.length,
        preferredCategories: user.userinterest.map((ui) => ui.interestId),
        favoriteCategories: user.userinterest.map((ui) => ui.interestId),
        interests: user.userinterest.map((ui) => ui.interestId),
        role: user.role,
        organizationId: user.organization?.id,
        organizationName: user.organization?.name,
        organizationType: user.organization?.type,
        isVerified: user.isEmailVerified && (user.documentsVerified || user.role !== "ORGANIZER"),
        isEmailVerified: user.isEmailVerified,
        documentsVerified: user.documentsVerified,
        donations: user.donations.map((d) => ({
          id: d.id,
          requestId: d.requestId,
          requestTitle: d.request.title, // ใช้ title จาก relation
          type: d.type,
          date: d.createdAt.toISOString(), // ใช้ createdAt
          status: d.status,
          amount: d.amount ? Number(d.amount) : undefined, // แปลง Decimal
          items: d.itemDetails ? (typeof d.itemDetails === "string" ? JSON.parse(d.itemDetails) : d.itemDetails) : undefined,
        })),
        createdAt: user.createdAt.toISOString(),
      };
    } catch (error: any) {
      console.error("Error in userService.create:", error);
      throw new Error(`Failed to create user: ${error.message}`);
    }
  },

  async findByEmail(email: string): Promise<UserResponse | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          organization: {
            select: { id: true, name: true, type: true },
          },
          userinterest: {
            select: { interestId: true },
          },
          donations: {
            select: {
              id: true,
              requestId: true,
              type: true,
              createdAt: true,
              status: true,
              amount: true,
              itemDetails: true,
            },
            include: {
              request: {
                select: {
                  title: true,
                },
              },
            },
          },
          donationRequests: true,
          volunteerApplications: true,
        },
      });
      if (!user) return null;
      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || undefined,
        avatar: user.avatar || undefined,
        bio: user.bio || undefined,
        joinDate: user.createdAt.toISOString(),
        totalDonated: user.donations.reduce((sum: number, d) => sum + Number(d.amount || 0), 0),
        donationCount: user.donations.length,
        preferredCategories: user.userinterest.map((ui) => ui.interestId),
        favoriteCategories: user.userinterest.map((ui) => ui.interestId),
        interests: user.userinterest.map((ui) => ui.interestId),
        role: user.role,
        organizationId: user.organization?.id,
        organizationName: user.organization?.name,
        organizationType: user.organization?.type,
        isVerified: user.isEmailVerified && (user.documentsVerified || user.role !== "ORGANIZER"),
        isEmailVerified: user.isEmailVerified,
        documentsVerified: user.documentsVerified,
        donations: user.donations.map((d) => ({
          id: d.id,
          requestId: d.requestId,
          requestTitle: d.request.title,
          type: d.type,
          date: d.createdAt.toISOString(),
          status: d.status,
          amount: d.amount ? Number(d.amount) : undefined,
          items: d.itemDetails ? (typeof d.itemDetails === "string" ? JSON.parse(d.itemDetails) : d.itemDetails) : undefined,
        })),
        createdAt: user.createdAt.toISOString(),
      };
    } catch (error: any) {
      console.error("Error in userService.findByEmail:", error);
      throw new Error(`Failed to find user by email: ${error.message}`);
    }
  },

  async findById(id: string): Promise<UserResponse | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          organization: {
            select: { id: true, name: true, type: true },
          },
          userinterest: {
            select: { interestId: true },
          },
          donations: {
            select: {
              id: true,
              requestId: true,
              type: true,
              createdAt: true,
              status: true,
              amount: true,
              itemDetails: true,
            },
            include: {
              request: {
                select: {
                  title: true,
                },
              },
            },
          },
          donationRequests: { include: { donations: true, volunteerApplications: true } },
          volunteerApplications: { include: { request: true } },
        },
      });
      if (!user) return null;
      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || undefined,
        avatar: user.avatar || undefined,
        bio: user.bio || undefined,
        joinDate: user.createdAt.toISOString(),
        totalDonated: user.donations.reduce((sum: number, d) => sum + Number(d.amount || 0), 0),
        donationCount: user.donations.length,
        preferredCategories: user.userinterest.map((ui) => ui.interestId),
        favoriteCategories: user.userinterest.map((ui) => ui.interestId),
        interests: user.userinterest.map((ui) => ui.interestId),
        role: user.role,
        organizationId: user.organization?.id,
        organizationName: user.organization?.name,
        organizationType: user.organization?.type,
        isVerified: user.isEmailVerified && (user.documentsVerified || user.role !== "ORGANIZER"),
        isEmailVerified: user.isEmailVerified,
        documentsVerified: user.documentsVerified,
        donations: user.donations.map((d) => ({
          id: d.id,
          requestId: d.requestId,
          requestTitle: d.request.title,
          type: d.type,
          date: d.createdAt.toISOString(),
          status: d.status,
          amount: d.amount ? Number(d.amount) : undefined,
          items: d.itemDetails ? (typeof d.itemDetails === "string" ? JSON.parse(d.itemDetails) : d.itemDetails) : undefined,
        })),
        createdAt: user.createdAt.toISOString(),
      };
    } catch (error: any) {
      console.error("Error in userService.findById:", error);
      throw new Error(`Failed to find user by id: ${error.message}`);
    }
  },

  async update(id: string, data: Prisma.userUpdateInput): Promise<UserResponse | null> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data,
        include: {
          organization: {
            select: { id: true, name: true, type: true },
          },
          userinterest: {
            select: { interestId: true },
          },
          donations: {
            select: {
              id: true,
              requestId: true,
              type: true,
              createdAt: true,
              status: true,
              amount: true,
              itemDetails: true,
            },
            include: {
              request: {
                select: {
                  title: true,
                },
              },
            },
          },
          donationRequests: true,
          volunteerApplications: true,
        },
      });
      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || undefined,
        avatar: user.avatar || undefined,
        bio: user.bio || undefined,
        joinDate: user.createdAt.toISOString(),
        totalDonated: user.donations.reduce((sum: number, d) => sum + Number(d.amount || 0), 0),
        donationCount: user.donations.length,
        preferredCategories: user.userinterest.map((ui) => ui.interestId),
        favoriteCategories: user.userinterest.map((ui) => ui.interestId),
        interests: user.userinterest.map((ui) => ui.interestId),
        role: user.role,
        organizationId: user.organization?.id,
        organizationName: user.organization?.name,
        organizationType: user.organization?.type,
        isVerified: user.isEmailVerified && (user.documentsVerified || user.role !== "ORGANIZER"),
        isEmailVerified: user.isEmailVerified,
        documentsVerified: user.documentsVerified,
        donations: user.donations.map((d) => ({
          id: d.id,
          requestId: d.requestId,
          requestTitle: d.request.title,
          type: d.type,
          date: d.createdAt.toISOString(),
          status: d.status,
          amount: d.amount ? Number(d.amount) : undefined,
          items: d.itemDetails ? (typeof d.itemDetails === "string" ? JSON.parse(d.itemDetails) : d.itemDetails) : undefined,
        })),
        createdAt: user.createdAt.toISOString(),
      };
    } catch (error: any) {
      console.error("Error in userService.update:", error);
      throw new Error(`Failed to update user: ${error.message}`);
    }
  },

  async getAll(page = 1, limit = 10, role?: user_role): Promise<{ users: UserResponse[], pagination: { page: number, limit: number, total: number, pages: number } }> {
    try {
      const skip = (page - 1) * limit;
      const where = role ? { role } : {};

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            organization: {
              select: { id: true, name: true, type: true },
            },
            userinterest: {
              select: { interestId: true },
            },
            donations: {
              select: {
                id: true,
                requestId: true,
                type: true,
                createdAt: true,
                status: true,
                amount: true,
                itemDetails: true,
              },
              include: {
                request: {
                  select: {
                    title: true,
                  },
                },
              },
            },
            donationRequests: true,
            volunteerApplications: true,
          },
        }),
        prisma.user.count({ where }),
      ]);

      const mappedUsers = users.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || undefined,
        avatar: user.avatar || undefined,
        bio: user.bio || undefined,
        joinDate: user.createdAt.toISOString(),
        totalDonated: user.donations.reduce((sum: number, d) => sum + Number(d.amount || 0), 0),
        donationCount: user.donations.length,
        preferredCategories: user.userinterest.map((ui) => ui.interestId),
        favoriteCategories: user.userinterest.map((ui) => ui.interestId),
        interests: user.userinterest.map((ui) => ui.interestId),
        role: user.role,
        organizationId: user.organization?.id,
        organizationName: user.organization?.name,
        organizationType: user.organization?.type,
        isVerified: user.isEmailVerified && (user.documentsVerified || user.role !== "ORGANIZER"),
        isEmailVerified: user.isEmailVerified,
        documentsVerified: user.documentsVerified,
        donations: user.donations.map((d) => ({
          id: d.id,
          requestId: d.requestId,
          requestTitle: d.request.title,
          type: d.type,
          date: d.createdAt.toISOString(),
          status: d.status,
          amount: d.amount ? Number(d.amount) : undefined,
          items: d.itemDetails ? (typeof d.itemDetails === "string" ? JSON.parse(d.itemDetails) : d.itemDetails) : undefined,
        })),
        createdAt: user.createdAt.toISOString(),
      }));

      return {
        users: mappedUsers,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      };
    } catch (error: any) {
      console.error("Error in userService.getAll:", error);
      throw new Error(`Failed to get users: ${error.message}`);
    }
  },
};

// ------------------ Donation Request Operations ------------------
export const donationRequestService = {
  async findById(id: string) {
    const request = await prisma.donationRequest.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        category: { select: { id: true, name: true } },
        targetAmount: true,
        currentAmount: true,
        supporters: true,
        status: true,
        createdAt: true,
        expiresAt: true,
        images: true,
        itemsNeeded: true,
        volunteersNeeded: true,
        volunteerSkills: true,
        volunteerDuration: true,
        organizer: {
          select: {
            id: true,
            phone: true,
            firstName: true,
            lastName: true,
            organization: {
              select: {
                name: true,
              },
            },
          },
        },
        organizerId: true,
        donations: {
          select: {
            id: true,
            amount: true,
            itemDetails: true,
            type: true,
            status: true,
            createdAt: true,
            donor: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        viewCount: true,
        acceptsMoney: true,
        acceptsItems: true,
        acceptsVolunteer: true,
        location: true,
        urgency: true,
        documents: true,
      },
    });

    if (!request) return null;

    const safeParseJson = (data: any, field: string) => {
      if (!data) return [];
      if (Array.isArray(data)) return data;
      if (typeof data !== "string") {
        console.warn(`Invalid ${field} format in request ${id}: Expected string or array, got ${typeof data}`);
        return [];
      }
      try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.error(`Failed to parse ${field} for request ${id}:`, error);
        return [];
      }
    };

    let donationType: "MONEY" | "ITEMS" | "VOLUNTEER" | undefined;
    if (request.acceptsMoney) donationType = "MONEY";
    else if (request.acceptsItems) donationType = "ITEMS";
    else if (request.acceptsVolunteer) donationType = "VOLUNTEER";

    let itemDetails: any = undefined;
    if (request.acceptsItems && request.itemsNeeded) {
      const itemsNeeded = safeParseJson(request.itemsNeeded, "itemsNeeded");
      let documents: any = {};
      if (request.documents) {
        try {
          documents = typeof request.documents === "string" ? JSON.parse(request.documents) : request.documents;
        } catch (error) {
          console.error(`Failed to parse documents for request ${id}:`, error);
        }
      }
      itemDetails = {
        type: itemsNeeded.join(", ") || "N/A",
        condition: "N/A",
        quantity: itemsNeeded.length || 0,
        images: safeParseJson(request.images, "images"),
        deliveryAddress: documents.detailedAddress || request.location || "N/A",
        deliveryContact: documents.contactPhone || request.organizer?.phone || "N/A",
      };
    }

    let volunteerDetails: any = undefined;
    if (request.acceptsVolunteer && request.volunteerSkills) {
      const skillsNeeded = safeParseJson(request.volunteerSkills, "volunteerSkills");
      let documents: any = {};
      if (request.documents) {
        try {
          documents = typeof request.documents === "string" ? JSON.parse(request.documents) : request.documents;
        } catch (error) {
          console.error(`Failed to parse documents for request ${id}:`, error);
        }
      }
      volunteerDetails = {
        skillsNeeded,
        address: request.location || documents.detailedAddress || "N/A",
        contact: documents.contactPhone || request.organizer?.phone || "N/A",
      };
    }

    return {
      ...request,
      category: request.category?.name || "N/A",
      categoryId: request.category?.id,
      createdDate: request.createdAt.toISOString(),
      daysLeft: request.expiresAt
        ? Math.max(0, Math.ceil((request.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0,
      images: safeParseJson(request.images, "images"),
      itemsNeeded: safeParseJson(request.itemsNeeded, "itemsNeeded"),
      volunteerSkills: safeParseJson(request.volunteerSkills, "volunteerSkills"),
      volunteerDuration: request.volunteerDuration || null,
      documents: request.documents ? (typeof request.documents === "string" ? JSON.parse(request.documents) : request.documents) : {},
      donationType,
      itemDetails,
      volunteerDetails,
      donations: request.donations.map((donation) => ({
        id: donation.id,
        donorName: donation.donor ? `${donation.donor.firstName || ""} ${donation.donor.lastName || ""}`.trim() : "N/A",
        donorPhone: donation.donor?.phone || "N/A",
        donorEmail: donation.donor?.email || undefined,
        isAnonymous: !donation.donor?.firstName && !donation.donor?.lastName,
        itemDetails: donation.itemDetails
          ? (typeof donation.itemDetails === "string" ? JSON.parse(donation.itemDetails) : donation.itemDetails)
          : null,
        donationDate: donation.createdAt.toISOString(),
        status: donation.status,
      })),
      organizer: {
        id: request.organizerId,
        phone: request.organizer?.phone || null,
        organizationName: request.organizer?.organization?.name || null,
        firstName: request.organizer?.firstName || null,
        lastName: request.organizer?.lastName || null,
      },
    };
  },

  // เพิ่มเมธอด incrementViewCount
  async incrementViewCount(id: string) {
    try {
      const updatedRequest = await prisma.donationRequest.update({
        where: { id },
        data: {
          viewCount: { increment: 1 },
        },
        select: { viewCount: true },
      });
      return updatedRequest.viewCount;
    } catch (error) {
      console.error(`Failed to increment view count for request ${id}:`, error);
      throw new Error("Failed to increment view count");
    }
  },
  async update(id: string, data: Partial<DonationRequestResponse>) {
    try {
      const validatedData = donationRequestUpdateSchema.parse(data);
      const updatedRequest = await prisma.donationRequest.update({
        where: { id },
        data: {
          title: validatedData.title,
          description: validatedData.description,
          targetAmount: validatedData.targetAmount,
          status: validatedData.status,
          urgency: validatedData.urgency,
          expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
          images: validatedData.images ? JSON.stringify(validatedData.images) : undefined,
          itemsNeeded: validatedData.itemsNeeded ? JSON.stringify(validatedData.itemsNeeded) : undefined,
          volunteerSkills: validatedData.volunteerSkills ? JSON.stringify(validatedData.volunteerSkills) : undefined,
          volunteerDuration: validatedData.volunteerDuration,
          volunteersNeeded: validatedData.volunteersNeeded,
          location: validatedData.location,
          acceptsMoney: validatedData.acceptsMoney,
          acceptsItems: validatedData.acceptsItems,
          acceptsVolunteer: validatedData.acceptsVolunteer,
        },
        select: {
          id: true,
          title: true,
          description: true,
          category: { select: { id: true, name: true } },
          targetAmount: true,
          currentAmount: true,
          supporters: true,
          status: true,
          createdAt: true,
          expiresAt: true,
          images: true,
          itemsNeeded: true,
          volunteersNeeded: true,
          volunteerSkills: true,
          volunteerDuration: true,
          organizer: {
            select: {
              id: true,
              phone: true,
              firstName: true,
              lastName: true,
              organization: { select: { name: true } },
            },
          },
          organizerId: true,
          donations: {
            select: {
              id: true,
              amount: true,
              itemDetails: true,
              type: true,
              status: true,
              createdAt: true,
              donor: {
                select: { firstName: true, lastName: true, phone: true, email: true },
              },
            },
          },
          viewCount: true,
          acceptsMoney: true,
          acceptsItems: true,
          acceptsVolunteer: true,
          location: true,
          urgency: true,
          documents: true,
        },
      });

      if (!updatedRequest) {
        throw new Error('Donation request not found');
      }

      const safeParseJson = (data: any, field: string) => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (typeof data !== "string") {
          console.warn(`Invalid ${field} format in request ${id}: Expected string or array, got ${typeof data}`);
          return [];
        }
        try {
          const parsed = JSON.parse(data);
          return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
          console.error(`Failed to parse ${field} for request ${id}:`, error);
          return [];
        }
      };

      let donationType: "MONEY" | "ITEMS" | "VOLUNTEER" | undefined;
      if (updatedRequest.acceptsMoney) donationType = "MONEY";
      else if (updatedRequest.acceptsItems) donationType = "ITEMS";
      else if (updatedRequest.acceptsVolunteer) donationType = "VOLUNTEER";

      let itemDetails: any = undefined;
      if (updatedRequest.acceptsItems && updatedRequest.itemsNeeded) {
        const itemsNeeded = safeParseJson(updatedRequest.itemsNeeded, "itemsNeeded");
        let documents: any = {};
        if (updatedRequest.documents) {
          try {
            documents = typeof updatedRequest.documents === "string" ? JSON.parse(updatedRequest.documents) : updatedRequest.documents;
          } catch (error) {
            console.error(`Failed to parse documents for request ${id}:`, error);
          }
        }
        itemDetails = {
          type: itemsNeeded.join(", ") || "N/A",
          condition: "N/A",
          quantity: itemsNeeded.length || 0,
          images: safeParseJson(updatedRequest.images, "images"),
          deliveryAddress: documents.detailedAddress || updatedRequest.location || "N/A",
          deliveryContact: documents.contactPhone || updatedRequest.organizer?.phone || "N/A",
        };
      }

      let volunteerDetails: any = undefined;
      if (updatedRequest.acceptsVolunteer && updatedRequest.volunteerSkills) {
        const skillsNeeded = safeParseJson(updatedRequest.volunteerSkills, "volunteerSkills");
        let documents: any = {};
        if (updatedRequest.documents) {
          try {
            documents = typeof updatedRequest.documents === "string" ? JSON.parse(updatedRequest.documents) : updatedRequest.documents;
          } catch (error) {
            console.error(`Failed to parse documents for request ${id}:`, error);
          }
        }
        volunteerDetails = {
          skillsNeeded,
          address: updatedRequest.location || documents.detailedAddress || "N/A",
          contact: documents.contactPhone || updatedRequest.organizer?.phone || "N/A",
        };
      }

      return {
        ...updatedRequest,
        category: updatedRequest.category?.name || "N/A",
        categoryId: updatedRequest.category?.id,
        createdDate: updatedRequest.createdAt.toISOString(),
        daysLeft: updatedRequest.expiresAt
          ? Math.max(0, Math.ceil((updatedRequest.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : 0,
        images: safeParseJson(updatedRequest.images, "images"),
        itemsNeeded: safeParseJson(updatedRequest.itemsNeeded, "itemsNeeded"),
        volunteerSkills: safeParseJson(updatedRequest.volunteerSkills, "volunteerSkills"),
        volunteerDuration: updatedRequest.volunteerDuration || null,
        documents: updatedRequest.documents ? (typeof updatedRequest.documents === "string" ? JSON.parse(updatedRequest.documents) : updatedRequest.documents) : {},
        donationType,
        itemDetails,
        volunteerDetails,
        donations: updatedRequest.donations.map((donation) => ({
          id: donation.id,
          donorName: donation.donor ? `${donation.donor.firstName || ""} ${donation.donor.lastName || ""}`.trim() : "N/A",
          donorPhone: donation.donor?.phone || "N/A",
          donorEmail: donation.donor?.email || undefined,
          isAnonymous: !donation.donor?.firstName && !donation.donor?.lastName,
          itemDetails: donation.itemDetails
            ? (typeof donation.itemDetails === "string" ? JSON.parse(donation.itemDetails) : donation.itemDetails)
            : null,
          donationDate: donation.createdAt.toISOString(),
          status: donation.status,
        })),
        organizer: {
          id: updatedRequest.organizerId,
          phone: updatedRequest.organizer?.phone || null,
          organizationName: updatedRequest.organizer?.organization?.name || null,
          firstName: updatedRequest.organizer?.firstName || null,
          lastName: updatedRequest.organizer?.lastName || null,
        },
      };
    } catch (error: any) {
      console.error(`Failed to update donation request ${id}:`, error);
      throw new Error(`Failed to update donation request: ${error.message}`);
    }
  },

  async delete(id: string) {
    try {
      await prisma.donationRequest.delete({
        where: { id },
      });
      return { message: 'ลบคำขอบริจาคสำเร็จ' };
    } catch (error: any) {
      console.error(`Failed to delete donation request ${id}:`, error);
      throw new Error(`Failed to delete donation request: ${error.message}`);
    }
  },
};

// ------------------ Donation Operations ------------------
export const donationService = {
  async create(data: Prisma.DonationCreateInput) {
    return prisma.$transaction(async (tx) => {
      // Validate itemDetails for items donation
      if (data.type === DonationType.ITEMS && data.itemDetails) {
        try {
          if (typeof data.itemDetails === 'string') {
            JSON.parse(data.itemDetails); // ตรวจสอบว่าเป็น JSON string ที่ถูกต้อง
          } else {
            data.itemDetails = JSON.stringify(data.itemDetails); // แปลง object เป็น JSON string
          }
        } catch (error: unknown) {
          console.error(`Invalid itemDetails format for donation creation:`, error, `Raw data:`, data.itemDetails);
          throw new Error('itemDetails must be a valid JSON string or object');
        }
      }

      const donation = await tx.donation.create({
        data,
        include: {
          donor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          request: {
            select: {
              id: true,
              title: true,
              organizerId: true,
            },
          },
        },
      });

      if (data.type === DonationType.MONEY && typeof data.amount === 'number') {
        await tx.donationRequest.update({
          where: { id: donation.requestId },
          data: {
            currentAmount: {
              increment: data.amount,
            },
          },
        });
      }

      return donation;
    });
  },

  async findById(id: string) {
    const donation = await prisma.donation.findUnique({
      where: { id },
      include: {
        donor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        request: {
          select: {
            id: true,
            title: true,
            organizer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!donation) return null;

    const safeParseJson = (data: any, field: string) => {
      if (!data || typeof data !== 'string') return data;
      try {
        return JSON.parse(data);
      } catch (error: unknown) {
        console.error(`Failed to parse ${field} for donation ${id}:`, error, `Raw data:`, data);
        return data; // คืน string เดิม
      }
    };

    return {
      ...donation,
      itemDetails: safeParseJson(donation.itemDetails, 'itemDetails'),
    };
  },

  async getByUser(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [donations, total] = await Promise.all([
      prisma.donation.findMany({
        where: { donorId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          request: {
            select: {
              id: true,
              title: true,
              categoryId: true,
              images: true,
            },
          },
        },
      }),
      prisma.donation.count({
        where: { donorId: userId },
      }),
    ]);

    const safeParseJson = (data: any, field: string, donationId: string) => {
      if (!data || typeof data !== 'string') return data;
      try {
        return JSON.parse(data);
      } catch (error: unknown) {
        console.error(`Failed to parse ${field} for donation ${donationId}:`, error, `Raw data:`, data);
        return data;
      }
    };

    return {
      donations: donations.map((donation) => ({
        ...donation,
        itemDetails: safeParseJson(donation.itemDetails, 'itemDetails', donation.id),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  },

  async updateStatus(id: string, status: DonationStatus) {
    return prisma.donation.update({
      where: { id },
      data: {
        status,
        completedAt: status === DonationStatus.COMPLETED ? new Date() : null,
      },
    });
  },
};

// ------------------ Volunteer Operations ------------------
export const volunteerService = {
  async create(data: Prisma.VolunteerApplicationCreateInput) {
    return prisma.$transaction(async (tx) => {
      const application = await tx.volunteerApplication.create({
        data,
        include: { volunteer: { select: { id: true, firstName: true, lastName: true, avatar: true } }, request: { select: { id: true, title: true, organizerId: true } } },
      });
      await tx.donationRequest.update({ where: { id: application.requestId }, data: { volunteersReceived: { increment: 1 } } });
      return application;
    });
  },

  async findById(id: string) {
    return prisma.volunteerApplication.findUnique({
      where: { id },
      include: { volunteer: { select: { id: true, firstName: true, lastName: true, avatar: true, phone: true, bio: true } }, request: { select: { id: true, title: true, organizer: { select: { id: true, firstName: true, lastName: true } } } } },
    });
  },

  async getByRequest(requestId: string) {
    return prisma.volunteerApplication.findMany({
      where: { requestId },
      orderBy: { createdAt: 'desc' },
      include: { volunteer: { select: { id: true, firstName: true, lastName: true, avatar: true, phone: true, bio: true } } },
    });
  },

  async updateStatus(id: string, status: VolunteerStatus) {
    return prisma.volunteerApplication.update({
      where: { id },
      data: { status, approvedAt: status === VolunteerStatus.APPROVED ? new Date() : null, completedAt: status === VolunteerStatus.COMPLETED ? new Date() : null },
    });
  },
};

// ------------------ Story Operations ------------------
export const storyService = {
  async create(data: Prisma.StoryCreateInput) {
    return prisma.story.create({
      data,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });
  },

  async getAll(page = 1, limit = 10, status: StoryStatus = StoryStatus.DRAFT) {
    const skip = (page - 1) * limit;

    const [stories, total] = await Promise.all([
      prisma.story.findMany({
        where: { status },
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.story.count({ where: { status } }),
    ]);

    return {
      stories,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  },

  async findById(id: string) {
    return prisma.story.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });
  },

  async incrementViews(id: string) {
    return prisma.story.update({
      where: { id },
      data: {
        views: { increment: 1 },
      },
    });
  },
};

// ------------------ Favorite Operations ------------------
export const favoriteService = {
  async toggle(userId: string, requestId: string) {
    const existing = await prisma.favorite.findUnique({
      where: { userId_requestId: { userId, requestId } },
    });

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      return { action: 'removed' };
    } else {
      await prisma.favorite.create({
        data: { userId, requestId },
      });
      return { action: 'added' };
    }
  },

  async getByUser(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          request: {
            include: {
              organizer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
              _count: {
                select: {
                  donations: true,
                  volunteerApplications: true,
                },
              },
            },
          },
        },
      }),
      prisma.favorite.count({ where: { userId } }),
    ]);

    return {
      favorites: favorites.map(f => f.request),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  },
};

// ------------------ Organization Operations ------------------
export const organizationService = {
  async findById(id: string) {
    return prisma.organization.findUnique({
      where: { id },
    });
  },

  async create(data: {
    name: string;
    type: organization_type;
    registrationNumber?: string | null;
    templeId?: string | null;
    phone?: string | null;
    address?: string | null;
    website?: string | null;
  }) {
    return prisma.organization.create({
      data: {
        ...data,
        id: crypto.randomUUID(),
        updatedAt: new Date(),
      },
    });
  },

  async update(id: string, data: {
    registrationNumber?: string | null;
    templeId?: string | null;
    phone?: string | null;
    address?: string | null;
    website?: string | null;
  }) {
    return prisma.organization.update({
      where: { id },
      data,
    });
  },
};