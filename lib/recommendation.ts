"use client"
import prisma from "@/lib/prisma"

type RecommendationItem = {
    id: string
    title: string
    description: string
    images: any
    score: number
}

export async function getRecommendationsForUser(userId: string, limit: number = 10) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            donations: {
                include: {
                    request: { select: { categoryId: true } }  // เปลี่ยนจาก category เป็น categoryId (scalar string)
                }
            }
        }
    })

    if (!user) throw new Error("User not found")

    // เอา categoryId ทั้งหมดที่ user เคยบริจาค (filter null ออก)
    const categoryIds = [
        ...new Set(
            user.donations
                .map(d => d.request.categoryId)
                .filter(id => id !== null)  // Filter null เพื่อป้องกัน error ใน query
        )
    ] as string[]  // Cast เป็น string[] เพื่อช่วย TypeScript

    // หาคำขอบริจาคในหมวดหมู่เหล่านี้ (ใช้ categoryId)
    const contentBasedItems = await prisma.donationRequest.findMany({
        where: { categoryId: { in: categoryIds } },  // เปลี่ยนจาก category เป็น categoryId
        select: { id: true, title: true, description: true, images: true }
    })

    // หา users อื่นที่เคยบริจาคใน category เดียวกัน (ใช้ categoryId)
    const similarUsers = await prisma.user.findMany({
        where: {
            id: { not: userId },
            donations: {
                some: {
                    request: { categoryId: { in: categoryIds } }  // เปลี่ยนจาก category เป็น categoryId
                }
            }
        },
        include: { donations: true }
    })

    // คำนวณคะแนน (ส่วนนี้ไม่เปลี่ยน)
    const scoredItems: RecommendationItem[] = contentBasedItems.map(item => {
        let score = 10 // base score
        const matchCount = similarUsers.filter(u =>
            u.donations.some(d => d.requestId === item.id)
        ).length
        score += matchCount * 5
        return { ...item, score }
    })

    return scoredItems.sort((a, b) => b.score - a.score).slice(0, limit)
}