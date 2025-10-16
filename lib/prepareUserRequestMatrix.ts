import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getUserRequestMatrix() {
    // ดึงข้อมูล interaction ทั้งหมดที่มี entityType เป็น "request"
    const interactions = await prisma.userinteraction.findMany({
        where: {
            entityType: 'request', // กรองเฉพาะ interaction ที่เกี่ยวข้องกับ request
        },
    });

    // สร้าง Map สำหรับเก็บเมทริกซ์
    const matrix = new Map<string, Map<string, number>>();

    // สร้าง Set เก็บ userIds และ entityIds (แทน requestIds)
    const userSet = new Set<string>();
    const requestSet = new Set<string>();

    // กรองข้อมูลและสร้าง matrix
    interactions.forEach(({ userId, entityId, interactionValue }) => {
        userSet.add(userId);
        requestSet.add(entityId);

        if (!matrix.has(userId)) {
            matrix.set(userId, new Map());
        }
        matrix.get(userId)!.set(entityId, interactionValue);
    });

    // แปลง Set เป็น Array สำหรับ index
    const users = Array.from(userSet);
    const requests = Array.from(requestSet);

    // สร้าง 2D Array สำหรับ user x request เติม 0 ถ้าไม่มี interaction
    const matrixArray = users.map(userId => {
        return requests.map(requestId => {
            return matrix.get(userId)?.get(requestId) || 0;
        });
    });

    return {
        users,
        requests,
        matrixArray,
    };
}

// ทดลองเรียกฟังก์ชัน
getUserRequestMatrix().then(({ users, requests, matrixArray }) => {
    console.log('Users:', users);
    console.log('Requests:', requests);
    console.log('Matrix:', matrixArray);
}).catch(error => {
    console.error('Error:', error);
}).finally(() => {
    prisma.$disconnect(); // ปิดการเชื่อมต่อ Prisma
});