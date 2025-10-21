// prisma/seed.ts
import { user_role, user_status, DonationRequestStatus, organization_type, Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 เริ่มต้นการ seed ข้อมูลสำหรับแอดมิน...');

    try {
        // ปิดการตรวจสอบ foreign key ชั่วคราว
        await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 0`;

        // ลบข้อมูลเก่า (ถ้ามีตาราง)
        await prisma.donationRequest.deleteMany().catch(() => console.log('No donation_requests to delete'));
        await prisma.userinterest.deleteMany().catch(() => console.log('No userinterest to delete'));
        await prisma.relatedcategory.deleteMany().catch(() => console.log('No relatedcategory to delete'));
        await prisma.interest.deleteMany().catch(() => console.log('No interest to delete'));
        await prisma.category.deleteMany().catch(() => console.log('No category to delete'));
        await prisma.user.deleteMany({ where: { role: user_role.ADMIN } }).catch(() => console.log('No admin users to delete'));
        await prisma.systemSettings.deleteMany().catch(() => console.log('No system_settings to delete'));
        console.log('ล้างข้อมูลเก่าเรียบร้อย');

        // ตรวจสอบจำนวนแอดมิน
        const userCount = await prisma.user.count({ where: { role: user_role.ADMIN } });
        console.log(`จำนวน admin ในตารางหลังลบ: ${userCount}`);

        // Seed Admin User
        const hashedPassword = await hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
        const admin = {
            id: 'admin1',
            email: 'admin@example.com',
            password: hashedPassword,
            firstName: 'แอดมิน',
            lastName: 'ระบบ',
            role: user_role.ADMIN,
            status: user_status.ACTIVE,
            location: 'กรุงเทพมหานคร',
            latitude: 13.7563,
            longitude: 100.5018,
            organizationId: null,
            isEmailVerified: true,
            documentsVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await prisma.user.create({ data: admin });
        console.log(`สร้างแอดมิน ${admin.id} สำเร็จ (email: ${admin.email})`);

        // ตรวจสอบแอดมินที่ถูกสร้าง
        const createdAdmin = await prisma.user.findFirst({
            where: { role: user_role.ADMIN },
            select: { id: true, email: true, role: true },
        });
        console.log('แอดมินที่ถูกสร้าง:', createdAdmin);

        // Seed Categories
        const categories = [
            { id: 'cat1', name: 'ภัยพิบัติ' },
            { id: 'cat2', name: 'การแพทย์' },
            { id: 'cat3', name: 'การศึกษา' },
        ];
        await prisma.category.createMany({ data: categories });
        console.log('สร้างหมวดหมู่เรียบร้อย');

        // Seed Interests
        const interests = [
            { id: 'int1', label: 'ช่วยเหลือภัยพิบัติ', description: 'น้ำท่วม แผ่นดินไหว', icon: '🌊', category: 'ภัยพิบัติ' },
            { id: 'int2', label: 'การแพทย์และสุขภาพ', description: 'โรงพยาบาล อุปกรณ์การแพทย์', icon: '🏥', category: 'การแพทย์' },
            { id: 'int3', label: 'การศึกษาและการเรียนรู้', description: 'โรงเรียน ทุนการศึกษา', icon: '📚', category: 'การศึกษา' },
        ];
        await prisma.interest.createMany({ data: interests });
        console.log('สร้างความสนใจเรียบร้อย');

        // Seed UserInterest (สำหรับ admin)
        const userInterests = [
            { userId: 'admin1', interestId: 'int1', categoryId: 'cat1' },
            { userId: 'admin1', interestId: 'int2', categoryId: 'cat2' },
            { userId: 'admin1', interestId: 'int3', categoryId: 'cat3' },
        ];
        await prisma.userinterest.createMany({ data: userInterests });
        console.log('สร้าง userinterest สำหรับแอดมินเรียบร้อย');

        // Seed RelatedCategory
        const relatedCategories = [
            { id: 'rc1', categoryId: 'cat1', relatedCategoryId: 'cat2', similarity: 0.6 },
            { id: 'rc2', categoryId: 'cat2', relatedCategoryId: 'cat3', similarity: 0.7 },
        ];
        await prisma.relatedcategory.createMany({ data: relatedCategories });
        console.log('สร้างความสัมพันธ์หมวดหมู่เรียบร้อย');

        // Seed System Settings
        const systemSettings = [
            { id: 'set1', key: 'max_donation_amount', value: '1000000' },
            { id: 'set2', key: 'min_volunteer_hours', value: '10' },
        ];
        await prisma.systemSettings.createMany({ data: systemSettings });
        console.log('สร้างการตั้งค่าระบบเรียบร้อย');

        // Seed DonationRequest
        const donationRequests = [
            {
                id: 'req10',
                title: 'ช่วยเหลือครอบครัวประสบภัยน้ำท่วม',
                description: 'ช่วยเหลือครอบครัวที่ได้รับผลกระทบจากน้ำท่วม',
                slug: 'flood-relief-2025-' + Date.now(),
                images: JSON.stringify(['/placeholder.svg?height=600&width=400']),
                categoryId: 'cat1',
                acceptsMoney: true,
                acceptsItems: true,
                acceptsVolunteer: true,
                targetAmount: new Prisma.Decimal(100000),
                currentAmount: new Prisma.Decimal(0),
                itemsNeeded: JSON.stringify(['อาหารแห้ง', 'เสื้อผ้า', 'น้ำดื่ม']),
                volunteerDetails: JSON.stringify(['ช่วยซ่อมแซมบ้าน', 'ขนย้ายสิ่งของ']),
                volunteersNeeded: 10,
                volunteersReceived: 0,
                location: 'กรุงเทพมหานคร',
                latitude: 13.7563,
                longitude: 100.5018,
                organizerId: 'admin1',
                status: DonationRequestStatus.APPROVED,
                createdAt: new Date(),
                expiresAt: new Date('2025-11-16T23:59:59.999Z'), // 30 วันจาก 17 ตค. 2025
                recommendationScore: 1.0,
            },
            {
                id: 'cmgifbhma0000v6osefljl6ou',
                title: 'ทดสอบที่ 1',
                description: 'คำอธิบายสำหรับการทดสอบ',
                slug: 'test-1-' + Date.now(),
                images: JSON.stringify(['/images/test.jpg']),
                categoryId: 'cat3',
                acceptsMoney: true,
                acceptsItems: false,
                acceptsVolunteer: false,
                targetAmount: new Prisma.Decimal(10000),
                currentAmount: new Prisma.Decimal(0),
                itemsNeeded: null,
                volunteerDetails: null,
                volunteersNeeded: 0,
                volunteersReceived: 0,
                location: 'กรุงเทพมหานคร',
                latitude: 13.7563,
                longitude: 100.5018,
                organizerId: 'admin1',
                status: DonationRequestStatus.APPROVED,
                createdAt: new Date(),
                expiresAt: new Date('2025-11-16T23:59:59.999Z'),
                recommendationScore: 1.0,
            },
        ];
        await prisma.donationRequest.createMany({ data: donationRequests });
        console.log('สร้างคำขอรับบริจาคเรียบร้อย');

        // เปิด foreign key checks
        await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 1`;

        console.log('✅ Seed ข้อมูลสำหรับแอดมินสำเร็จ!');
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการ seed:', error);
        throw error;
    }
}

main()
    .catch((e) => {
        console.error('❌ เกิดข้อผิดพลาด:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });