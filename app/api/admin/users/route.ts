import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { hash } from 'bcryptjs';

export async function GET(request: NextRequest) {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
        return NextResponse.json({ error: 'No token provided', status: 401 }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized', status: 401 }, { status: 401 });
    }

    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                createdAt: true,
                status: true,
                _count: { select: { donationRequests: true } },
                donations: { select: { amount: true }, where: { type: 'MONEY', status: 'COMPLETED' } },
            },
            orderBy: { createdAt: 'desc' },
        });

        const formatted = users.map(user => ({
            id: user.id,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            email: user.email,
            role: user.role as 'DONOR' | 'ORGANIZER' | 'ADMIN',
            joinDate: user.createdAt.toISOString(),
            isVerified: user.status === 'ACTIVE',
            requestsCreated: user.role === 'ORGANIZER' ? user._count.donationRequests : undefined,
            totalDonated: user.role === 'DONOR' ? user.donations.reduce((sum, d) => sum + Number(d.amount), 0) : undefined,
        }));

        return NextResponse.json({ data: formatted, status: 200 });
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Failed to fetch users', status: 500 }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
        return NextResponse.json({ error: 'No token provided', status: 401 }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized', status: 401 }, { status: 401 });
    }

    try {
        const body = await req.json();
        const {
            email,
            password,
            firstName,
            lastName,
            phone,
            role,
            organization,
            documentsVerified,
            userInterests,
        } = body;

        // --- ตรวจสอบข้อมูลที่จำเป็น ---
        if (!email || !password || !firstName || !lastName || !phone) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // --- ตรวจสอบรูปแบบอีเมล ---
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
        }

        // --- ตรวจสอบ email ซ้ำ ---
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' }, { status: 400 });
        }

        // --- ตรวจสอบ role ---
        const validRoles = ['DONOR', 'ORGANIZER', 'ADMIN'];
        if (!validRoles.includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        // --- เข้ารหัสรหัสผ่าน ---
        const hashedPassword = await hash(password, 10);

        // --- สร้าง User payload ---
        const createData: any = {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            phone,
            role,
            status: 'ACTIVE',
        };

        // --- สำหรับ Organizer: เชื่อม Organization ---
        if (role === 'ORGANIZER' && organization) {
            const validOrgTypes = ['NGO', 'CHARITY', 'FOUNDATION', 'GOVERNMENT', 'TEMPLE', 'OTHER'];
            if (organization.connect) {
                const orgExists = await prisma.organization.findUnique({ where: { id: organization.connect.id } });
                if (!orgExists) {
                    return NextResponse.json({ error: `Organization with ID ${organization.connect.id} not found` }, { status: 400 });
                }
                createData.organization = { connect: organization.connect };
            } else if (organization.create) {
                // ตรวจสอบ type และแปลง school เป็น OTHER
                const orgType = organization.create.type === 'school' ? 'OTHER' : organization.create.type;
                if (!validOrgTypes.includes(orgType)) {
                    return NextResponse.json({ error: `Invalid organization type: ${orgType}` }, { status: 400 });
                }
                createData.organization = {
                    create: {
                        name: organization.create.name,
                        type: orgType,
                    },
                };
            }
            createData.documentsVerified = documentsVerified || false;
        }

        // --- สำหรับ User: เชื่อม Interests ---
        if ((role === 'USER' || role === 'DONOR') && userInterests?.length) {
            for (const ui of userInterests) {
                const interestExists = await prisma.interest.findUnique({ where: { id: ui.interestId } });
                if (!interestExists) {
                    return NextResponse.json({ error: `Interest with ID ${ui.interestId} not found` }, { status: 400 });
                }
            }
            createData.userinterest = {
                create: userInterests.map((ui: any) => ({
                    interest: { connect: { id: ui.interestId } },
                })),
            };
        }

        // --- สร้างผู้ใช้ ---
        const newUser = await prisma.user.create({
            data: createData,
            include: { organization: true, userinterest: { include: { interest: true } } },
        });
        await prisma.auditLog.create({
            data: {
                userId: decoded.id, // ID ของ admin ที่ทำการสร้าง
                action: 'CREATE_USER',
                entityType: 'USER',
                entityId: newUser.id,
            },
        });
        return NextResponse.json(newUser);
    } catch (err: any) {
        console.error(err);
        return NextResponse.json({ error: err.message || 'เกิดข้อผิดพลาด' }, { status: 500 });
    }
}
