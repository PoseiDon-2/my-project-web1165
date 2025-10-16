import { RewardsClient } from '@/components/RewardsClient';

interface SystemReward {
    id: string;
    name: string;
    description: string;
    category: 'profile' | 'badge' | 'feature' | 'physical';
    pointsCost: number;
    image: string;
    isActive: boolean;
    isLimited: boolean;
    limitQuantity?: number;
    remainingQuantity?: number;
    createdBy: string;
    createdAt: string;
    requirements: {
        minLevel?: number;
        minDonations?: number;
    };
}

async function getInitialRewards(): Promise<SystemReward[]> {
    // คุณสามารถแทนที่ด้วยการดึงข้อมูลจาก server-side storage เช่น Prisma/MySQL
    return [
        {
            id: 'theme_gold',
            name: 'ธีมทอง',
            description: 'เปลี่ยนธีมโปรไฟล์เป็นสีทองหรูหรา',
            category: 'profile',
            pointsCost: 500,
            image: '/placeholder.svg',
            isActive: true,
            isLimited: false,
            createdBy: 'admin',
            createdAt: new Date().toISOString(),
            requirements: {},
        },
        {
            id: 'badge_heart',
            name: 'ตราหัวใจทอง',
            description: 'ตราสัญลักษณ์หัวใจทองคำ',
            category: 'badge',
            pointsCost: 300,
            image: '/placeholder.svg',
            isActive: true,
            isLimited: false,
            createdBy: 'admin',
            createdAt: new Date().toISOString(),
            requirements: {},
        },
    ];
}

export default async function AdminRewardsPage() {
    const initialRewards = await getInitialRewards();
    return <RewardsClient initialRewards={initialRewards} />;
}