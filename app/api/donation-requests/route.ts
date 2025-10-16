// /app/api/donation-requests/route.ts
import { NextRequest, NextResponse } from "next/server";
import { donationRequestSchema } from "@/lib/validations";
import prisma from "@/lib/prisma";
import { authenticateUser } from "@/lib/middleware";
import { DonationRequestStatus, organization_type } from "@prisma/client";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  const user = await authenticateUser(request);
  console.log("Headers:", [...request.headers.entries()]);
  console.log("Authenticated user:", user);

  try {
    if (!user) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลผู้ใช้หรือ token ไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    // ตรวจสอบ role
    if (!["ORGANIZER", "ADMIN"].includes(user.role as string)) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    }

    const body = await request.json();
    console.log("Received body:", JSON.stringify(body, null, 2));
    const validatedData = donationRequestSchema.parse(body);

    // หา categoryId
    let categoryId: string | undefined;
    if (validatedData.category) {
      const category = await prisma.category.findFirst({
        where: { name: validatedData.category },
      });
      console.log("Category searched:", validatedData.category, "Found:", category);
      if (!category) {
        return NextResponse.json(
          { error: `ไม่พบหมวดหมู่: ${validatedData.category}` },
          { status: 400 }
        );
      }
      categoryId = category.id;
    }

    // สร้าง slug
    const slug = validatedData.title
      .toLowerCase()
      .replace(/[^a-z0-9ก-๙\s]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 50) + "-" + Date.now();

    // แปลง documents เป็นสตริงและจัดการ organizationType
    let documentsString: string | null = null;
    if (validatedData.documents) {
      if (validatedData.documents.organizationDetails?.organizationType) {
        const validOrgTypes = Object.values(organization_type) as string[];
        let orgType: organization_type = organization_type.OTHER; // ค่าเริ่มต้น
        const inputOrgType = validatedData.documents.organizationDetails.organizationType;

        if (inputOrgType === "school") {
          orgType = organization_type.OTHER;
        } else if (validOrgTypes.includes(inputOrgType)) {
          orgType = inputOrgType as organization_type;
        } else {
          return NextResponse.json(
            { error: `Invalid organization type: ${inputOrgType}` },
            { status: 400 }
          );
        }

        validatedData.documents.organizationDetails.organizationType = orgType;
      }
      documentsString = JSON.stringify(validatedData.documents);
    }

    // สร้าง data object
    const data: any = {
      title: validatedData.title,
      description: validatedData.description,
      slug,
      organizer: { connect: { id: user.id } },
      status: validatedData.status || DonationRequestStatus.PENDING,
      documents: documentsString,
      images: validatedData.images ? JSON.stringify(validatedData.images) : null,
      urgency: validatedData.urgency || "LOW",
      acceptsMoney: validatedData.acceptsMoney || false,
      acceptsItems: validatedData.acceptsItems || false,
      acceptsVolunteer: validatedData.acceptsVolunteer || false,
      targetAmount: validatedData.targetAmount || 0,
      itemsNeeded: validatedData.itemsNeeded ? JSON.stringify(validatedData.itemsNeeded) : null,
      volunteersNeeded: validatedData.volunteersNeeded || 0,
      volunteerSkills: validatedData.volunteerSkills ? JSON.stringify(validatedData.volunteerSkills) : null,
      volunteerDuration: validatedData.volunteerDuration || null,
      location: validatedData.location || null,
    };

    if (categoryId) {
      data.category = { connect: { id: categoryId } };
    }

    const donationRequest = await prisma.donationRequest.create({ data });

    // บันทึก Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: `CREATE_DONATION_REQUEST: ${validatedData.title}`,
        entityType: "DONATION_REQUEST",
        entityId: donationRequest.id,
      },
    });

    return NextResponse.json({
      message: "สร้างคำขอสำเร็จ รอการอนุมัติจากผู้ดูแลระบบ",
      request: donationRequest,
    });
  } catch (error: any) {
    console.error("Create donation request error:", error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ถูกต้อง", details: error.errors },
        { status: 400 }
      );
    }
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Slug หรือข้อมูลที่ต้องไม่ซ้ำกันมีอยู่ในระบบแล้ว" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาดในการสร้างคำขอ" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    let user = null;
    try {
      user = await authenticateUser(request);
    } catch (e) {
      console.log("No token provided, showing public donation requests");
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10")));
    const status = searchParams.get("status");
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const urgency = searchParams.get("urgency") ?? undefined;
    const search = searchParams.get("search") ?? undefined;
    const acceptsMoney = searchParams.get("acceptsMoney");
    const acceptsItems = searchParams.get("acceptsItems");
    const acceptsVolunteer = searchParams.get("acceptsVolunteer");

    const validStatus =
      status && Object.values(DonationRequestStatus).includes(status as DonationRequestStatus)
        ? (status as DonationRequestStatus)
        : undefined;

    const validUrgencyValues = ["LOW", "MEDIUM", "HIGH"] as const;
    const validUrgency = urgency && validUrgencyValues.includes(urgency as any) ? urgency : undefined;

    const acceptsMoneyValue =
      acceptsMoney === "true" ? true : acceptsMoney === "false" ? false : undefined;
    const acceptsItemsValue =
      acceptsItems === "true" ? true : acceptsItems === "false" ? false : undefined;
    const acceptsVolunteerValue =
      acceptsVolunteer === "true" ? true : acceptsVolunteer === "false" ? false : undefined;

    const whereClause: any = {
      categoryId: categoryId || undefined,
      urgency: validUrgency as any,
      title: search ? { contains: search } : undefined,
      acceptsMoney: acceptsMoneyValue,
      acceptsItems: acceptsItemsValue,
      acceptsVolunteer: acceptsVolunteerValue,
    };

    // สำหรับ organizer, แสดง requests ทั้งหมดของเขา (ไม่กรอง status ถ้าไม่มี query param)
    if (user?.role === "ORGANIZER") {
      whereClause.organizerId = user.id;
      if (validStatus) {
        whereClause.status = validStatus;
      }
    } else {
      // สำหรับ guest หรือผู้ใช้ทั่วไป, แสดงเฉพาะ APPROVED
      whereClause.status = validStatus ?? DonationRequestStatus.APPROVED;
    }

    console.log("Query whereClause:", whereClause); // Debug where clause

    const result = await prisma.donationRequest.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        targetAmount: true,
        currentAmount: true,
        createdAt: true,
        expiresAt: true,
        images: true,
        category: { select: { name: true } },
        donations: { select: { id: true } },
        volunteerApplications: { select: { id: true } },
        organizer: { select: { firstName: true, lastName: true } },
      },
    });

    console.log("Query result count:", result.length); // Debug result count

    // แปลงข้อมูลให้ตรงกับ interface DonationRequest
    const formattedResult = result.map((request) => {
      const supporters = request.donations.length + request.volunteerApplications.length;
      const daysLeft = request.expiresAt
        ? Math.max(
          0,
          Math.ceil(
            (new Date(request.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          )
        )
        : 0;

      // Parse images จาก Json เป็น string[]
      let images: string[] = [];
      if (request.images) {
        try {
          images = Array.isArray(request.images) ? request.images : JSON.parse(request.images as any);
        } catch (e) {
          console.error(`Failed to parse images for request ${request.id}:`, e);
        }
      }

      return {
        id: request.id,
        title: request.title,
        description: request.description,
        category: request.category.name,
        goalAmount: Number(request.targetAmount),
        currentAmount: Number(request.currentAmount),
        supporters,
        status: request.status, // คงค่า status เป็น uppercase เพื่อให้สอดคล้องกับ backend
        createdDate: request.createdAt.toISOString(),
        daysLeft,
        images,
      };
    });

    return NextResponse.json(formattedResult);
  } catch (error) {
    console.error("Get donation requests error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูลคำขอ" },
      { status: 500 }
    );
  }
}