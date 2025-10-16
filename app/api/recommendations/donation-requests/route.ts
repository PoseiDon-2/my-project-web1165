import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastRecommendations } from '@/lib/websocket';

// ทำให้เป็น dynamic route
export const dynamic = 'force-dynamic';

// Cache สำหรับ recommendations (TTL 10 วินาที)
const recommendationCache = new Map<string, { data: DonationRequestWithScore[]; timestamp: number }>();

interface DonationRequestWithScore {
    id: string;
    title: string;
    description: string;
    category: { name: string };
    organizer: { firstName: string | null; lastName: string | null };
    urgency: string | null;
    supporters: number;
    score: number;
    latitude: number | null;
    longitude: number | null;
    targetAmount: string | null; // Changed from goalAmount to targetAmount
    currentAmount: string;
    daysLeft?: number;
    images: string[] | null;
}

// ฟังก์ชันคำนวณระยะทาง (Haversine formula)
function calculateDistance(coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }): number {
    const R = 6371; // รัศมีโลก (กม.)
    const dLat = (coord2.lat - coord1.lat) * (Math.PI / 180);
    const dLng = (coord2.lng - coord1.lng) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(coord1.lat * (Math.PI / 180)) * Math.cos(coord2.lat * (Math.PI / 180)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // ระยะทางในกิโลเมตร
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    try {
        // ตรวจสอบ cache (TTL 10 วินาที)
        if (userId) {
            const cacheKey = `recommendations:${userId}`;
            const cached = recommendationCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < 10000) {
                console.log(`Returning cached recommendations for user ${userId}`);
                return NextResponse.json(cached.data);
            }
        }

        // Fallback สำหรับไม่มี userId
        if (!userId) {
            console.log('No userId provided, using fallback recommendations');
            const fallback = await prisma.donationRequest.findMany({
                where: { status: 'APPROVED', expiresAt: { gt: new Date() } },
                orderBy: [
                    { recommendationScore: 'desc' },
                    { supporters: 'desc' },
                    { urgency: 'desc' },
                    { createdAt: 'desc' },
                ],
                take: 10,
                select: {
                    id: true,
                    title: true,
                    description: true,
                    category: { select: { name: true } },
                    organizer: { select: { firstName: true, lastName: true } },
                    urgency: true,
                    supporters: true,
                    latitude: true,
                    longitude: true,
                    targetAmount: true, // Changed from goalAmount
                    currentAmount: true,
                    images: true,
                    expiresAt: true,
                    createdAt: true,
                    recommendationScore: true,
                },
            });

            const fallbackWithDaysLeft = fallback.map((req) => ({
                ...req,
                currentAmount: req.currentAmount.toString(),
                targetAmount: req.targetAmount ? req.targetAmount.toString() : null, // Convert Decimal to string
                supporters: req.supporters ?? 0,
                latitude: req.latitude ?? null,
                longitude: req.longitude ?? null,
                daysLeft: req.expiresAt
                    ? Math.max(Math.ceil((req.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 0)
                    : undefined,
                images: req.images ? JSON.parse(req.images) as string[] : null,
            }));

            return NextResponse.json(fallbackWithDaysLeft);
        }

        // ดึงข้อมูลผู้ใช้
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                userinterest: { include: { category: true } },
                userinteraction: { where: { entityType: { in: ['DonationRequest', 'Story'] } } }, // Changed from interactions to userinteraction
                donations: { include: { request: { include: { category: true } } } },
                volunteerApplications: { include: { request: { include: { category: true } } } },
                favorites: { include: { request: { include: { category: true } } } },
            },
        });

        if (!user) {
            console.error('User not found for ID:', userId);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // ดึงหมวดหมู่จาก UserInterest และ Favorites
        const userCategories = user.userinterest
            .filter((ui) => ui.category)
            .map((ui) => ui.category!.name);
        const favoriteCategories = user.favorites.map((f) => f.request.category.name);
        const favoriteRequestIds = user.favorites.map((f) => f.requestId);
        const donationCategories = user.donations.map((d) => d.request.category.name);
        const volunteerCategories = user.volunteerApplications.map((v) => v.request.category.name);
        const userCoordinates = user.latitude && user.longitude ? { lat: user.latitude, lng: user.longitude } : null;

        // ดึงหมวดหมู่ที่เกี่ยวข้องจาก relatedcategory
        const relatedCategories = await prisma.relatedcategory.findMany({
            where: {
                categoryId: {
                    in: await prisma.category.findMany({
                        where: { name: { in: userCategories } },
                        select: { id: true },
                    }).then(categories => categories.map(c => c.id))
                }
            },
            include: { category_relatedcategory_relatedCategoryIdTocategory: true },
        });
        const relatedCategoryNames = relatedCategories.map((rc) => rc.category_relatedcategory_relatedCategoryIdTocategory.name);

        // รวมหมวดหมู่ทั้งหมด
        const allCategories = [...new Set([...userCategories, ...favoriteCategories, ...donationCategories, ...volunteerCategories, ...relatedCategoryNames])];

        // Collaborative: หา users ที่คล้ายกัน
        const similarUsers = await prisma.user.findMany({
            where: {
                id: { not: userId },
                userinterest: { some: { category: { name: { in: userCategories } } } }, // Changed from userInterests to userinterest
            },
            include: { favorites: { select: { requestId: true } } },
            take: 20,
        });
        const similarUserFavorites = [...new Set(similarUsers.flatMap((u) => u.favorites.map((f) => f.requestId)))];

        // ดึง donation requests
        const allRequests = await prisma.donationRequest.findMany({
            where: {
                status: 'APPROVED',
                id: { notIn: favoriteRequestIds },
                expiresAt: { gt: new Date() },
                OR: [
                    { category: { name: { in: allCategories } } },
                    { id: { in: similarUserFavorites } },
                ],
            },
            select: {
                id: true,
                title: true,
                description: true,
                category: { select: { name: true } },
                organizer: { select: { firstName: true, lastName: true } },
                urgency: true,
                supporters: true,
                latitude: true,
                longitude: true,
                targetAmount: true, // Changed from goalAmount
                currentAmount: true,
                images: true,
                expiresAt: true,
                createdAt: true,
                recommendationScore: true,
            },
            take: 50,
        });

        // คำนวณ score
        const recommendations: DonationRequestWithScore[] = allRequests
            .map((req) => {
                let score = req.recommendationScore || 0;

                // Content-based Filtering
                if (userCategories.includes(req.category.name)) {
                    score += 0.5;
                }
                if (favoriteCategories.includes(req.category.name)) {
                    score += 0.4;
                }
                if (donationCategories.includes(req.category.name) || volunteerCategories.includes(req.category.name)) {
                    score += 0.3;
                }

                // Location-based
                let locationBonus = 0;
                if (userCoordinates && req.latitude && req.longitude) {
                    const distance = calculateDistance(userCoordinates, { lat: req.latitude, lng: req.longitude });
                    if (distance < 50) locationBonus = 0.3;
                    else if (distance < 100) locationBonus = 0.1;
                    score += locationBonus;
                }

                // Collaborative Filtering
                if (similarUserFavorites.includes(req.id)) {
                    score += 0.25;
                }

                // Engagement
                const totalInteractions = user.userinteraction.filter((i) => i.entityId === req.id && i.entityType === 'DonationRequest'); // Changed from interactions to userinteraction
                const interactionScore = totalInteractions.reduce((sum, i) => sum + (i.weight || 0), 0);
                score += interactionScore;

                // Urgency & Popularity
                const urgencyBonus = req.urgency === 'HIGH' ? 0.3 : req.urgency === 'MEDIUM' ? 0.1 : 0;
                score += urgencyBonus;
                const popularityBonus = Math.min((req.supporters || 0) / 50, 0.2);
                score += popularityBonus;

                // Bonus for new requests
                const daysSinceCreation = Math.ceil((Date.now() - req.createdAt.getTime()) / (1000 * 60 * 60 * 24));
                const newnessBonus = daysSinceCreation < 7 ? 0.1 : 0;
                score += newnessBonus;

                // Log score breakdown
                console.log(`Score breakdown for ${req.id}:`, {
                    baseScore: req.recommendationScore,
                    categoryMatch: userCategories.includes(req.category.name) ? 0.5 : 0,
                    favoriteMatch: favoriteCategories.includes(req.category.name) ? 0.4 : 0,
                    locationBonus,
                    interactionScore,
                    urgencyBonus,
                    popularityBonus,
                    newnessBonus,
                    totalScore: score,
                });

                return {
                    ...req,
                    score,
                    currentAmount: req.currentAmount.toString(),
                    targetAmount: req.targetAmount ? req.targetAmount.toString() : null, // Convert Decimal to string
                    supporters: req.supporters ?? 0,
                    latitude: req.latitude ?? null,
                    longitude: req.longitude ?? null,
                    daysLeft: req.expiresAt
                        ? Math.max(Math.ceil((req.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 0)
                        : undefined,
                    images: req.images ? JSON.parse(req.images) as string[] : null,
                };
            })
            .filter((r) => r.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

        // เก็บใน cache
        if (userId) {
            recommendationCache.set(`recommendations:${userId}`, { data: recommendations, timestamp: Date.now() });
            setTimeout(() => recommendationCache.delete(`recommendations:${userId}`), 10000);
        }

        // Logging สำหรับ debug
        console.log(`Recommendations for user ${userId}:`, recommendations.map((r) => ({ id: r.id, title: r.title, score: r.score })));

        // Fallback ถ้าไม่มี recommendations
        if (recommendations.length === 0) {
            console.log('No recommendations found, using fallback');
            const popularCategories = await prisma.category.findMany({
                orderBy: { donationRequests: { _count: 'desc' } },
                take: 3,
                select: { name: true },
            });
            const fallback = await prisma.donationRequest.findMany({
                where: {
                    status: 'APPROVED',
                    id: { notIn: favoriteRequestIds },
                    expiresAt: { gt: new Date() },
                    category: { name: { in: popularCategories.map((c) => c.name) } },
                },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    category: { select: { name: true } },
                    organizer: { select: { firstName: true, lastName: true } },
                    urgency: true,
                    supporters: true,
                    latitude: true,
                    longitude: true,
                    targetAmount: true, // Changed from goalAmount
                    currentAmount: true,
                    images: true,
                    expiresAt: true,
                    createdAt: true,
                    recommendationScore: true,
                },
                orderBy: [
                    { recommendationScore: 'desc' },
                    { supporters: 'desc' },
                    { urgency: 'desc' },
                    { createdAt: 'desc' },
                ],
                take: 10,
            });

            const fallbackWithDaysLeft = fallback.map((req) => ({
                ...req,
                currentAmount: req.currentAmount.toString(),
                targetAmount: req.targetAmount ? req.targetAmount.toString() : null, // Convert Decimal to string
                supporters: req.supporters ?? 0,
                latitude: req.latitude ?? null,
                longitude: req.longitude ?? null,
                daysLeft: req.expiresAt
                    ? Math.max(Math.ceil((req.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 0)
                    : undefined,
                images: req.images ? JSON.parse(req.images) as string[] : null,
            }));

            return NextResponse.json(fallbackWithDaysLeft);
        }

        // Broadcast ผ่าน WebSocket
        if (userId) {
            broadcastRecommendations(userId, recommendations);
        }

        return NextResponse.json(recommendations);
    } catch (err) {
        console.error('Recommendation error:', err);
        return NextResponse.json(
            { error: 'Failed to load recommendations', details: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 }
        );
    }
}