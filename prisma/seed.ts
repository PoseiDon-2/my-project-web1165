// prisma/seed.ts
import { user_role, user_status, DonationRequestStatus, Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();


async function main() {
    console.log('🌱 เริ่มต้นการ seed ข้อมูลสำหรับแอดมิน...');

    try {
        // ล้างข้อมูลในตารางที่มี foreign key อ้างถึง category ก่อน
        await prisma.donationRequest.deleteMany();
        await prisma.userinterest.deleteMany();
        await prisma.relatedcategory.deleteMany();
        await prisma.interest.deleteMany();
        await prisma.category.deleteMany();
        await prisma.user.deleteMany({ where: { role: user_role.ADMIN } });
        await prisma.systemSettings.deleteMany();
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
                slug: 'flood-relief-2025',
                images: JSON.stringify(['/placeholder.svg?height=600&width=400']),
                categoryId: 'cat1',
                acceptsMoney: true,
                acceptsItems: true,
                acceptsVolunteer: true,
                targetAmount: new Prisma.Decimal(100000),
                currentAmount: new Prisma.Decimal(0),
                itemsNeeded: 'อาหารแห้ง, เสื้อผ้า, น้ำดื่ม',
                volunteerDetails: 'ช่วยซ่อมแซมบ้าน, ขนย้ายสิ่งของ',
                volunteersNeeded: 10,
                volunteersReceived: 0,
                location: 'กรุงเทพมหานคร',
                latitude: 13.7563,
                longitude: 100.5018,
                organizerId: 'admin1',
                status: DonationRequestStatus.APPROVED,
                createdAt: new Date(),
                expiresAt: new Date('2025-12-31'),
            },
        ];
        await prisma.donationRequest.createMany({ data: donationRequests });
        console.log('สร้างคำขอรับบริจาคเรียบร้อย');

        console.log('✅ Seed ข้อมูลสำหรับแอดมินสำเร็จ!');
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการ seed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((e) => {
    console.error('❌ เกิดข้อผิดพลาด:', e);
    process.exit(1);
});
