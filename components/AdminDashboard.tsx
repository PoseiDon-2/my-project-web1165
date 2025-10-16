// /components/AdminDashboard.tsx
"use client";

import React from "react";
import { useAdminStats } from "@/hooks/useAdminStats";

interface Props {
    token: string;
}

const AdminDashboard: React.FC<Props> = ({ token }) => {
    const { stats, loading, error } = useAdminStats(token);

    if (loading) return <p>Loading stats...</p>;
    if (error) return <p>Error: {error}</p>;
    if (!stats) return <p>No stats available</p>;

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="card">
                <h3>Total Users</h3>
                <p>{stats?.totalUsers?.toLocaleString() ?? 0}</p>
            </div>
            <div className="card">
                <h3>Total Organizers</h3>
                <p>{stats?.totalOrganizers?.toLocaleString() ?? 0}</p>
            </div>
            <div className="card">
                <h3>Total Donation Requests</h3>
                <p>{stats?.totalRequests?.toLocaleString() ?? 0}</p>
            </div>
            <div className="card">
                <h3>Pending Requests</h3>
                <p>{stats?.pendingRequests?.toLocaleString() ?? 0}</p>
            </div>
            <div className="card">
                <h3>Active Requests</h3>
                <p>{stats?.activeRequests?.toLocaleString() ?? 0}</p>
            </div>
            <div className="card">
                <h3>Total Raised</h3>
                <p>฿{stats?.totalRaised?.toLocaleString() ?? 0}</p>
            </div>
        </div>

    );
};

export default AdminDashboard;
