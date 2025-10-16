"use client"
// /hooks/useAdminStats.ts
import { useState, useEffect } from "react";

export interface AdminStats {
    totalUsers: number;
    totalOrganizers: number;
    totalRequests: number;
    pendingRequests: number;
    activeRequests: number;
    totalRaised: number;
}

export const useAdminStats = (token: string | null) => {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;

        const fetchStats = async () => {
            setLoading(true);
            try {
                const res = await fetch("/api/admin/stats", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const json = await res.json();

                // ตรวจสอบว่ามี data มาจริงไหม
                if (json.data) {
                    setStats(json.data);
                } else {
                    setError("No data received");
                }
            } catch (err: any) {
                setError(err.message || "Failed to fetch stats");
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [token]);

    return { stats, loading, error };
};

