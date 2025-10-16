'use client';
import { useEffect } from 'react';

interface ErrorProps {
    error: Error; // กำหนดประเภทของ error เป็น Error
    reset: () => void; // กำหนดประเภทของ reset เป็นฟังก์ชัน
}

export default function Error({ error, reset }: ErrorProps) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-red-600">เกิดข้อผิดพลาด</h2>
                <p className="text-gray-600">{error.message}</p>
                <button
                    onClick={reset}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    ลองใหม่
                </button>
            </div>
        </div>
    );
}