"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  FileText,
  BarChart3,
  Settings,
  Shield,
  Eye,
  Check,
  X,
  Edit,
  Trash2,
  ArrowLeft,
  AlertTriangle,
  UserPlus,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "../../components/auth-context";

interface AdminStats {
  totalUsers: number;
  totalOrganizers: number;
  totalRequests: number;
  pendingRequests: number;
  activeRequests: number;
  totalRaised: number;
}

interface PendingRequest {
  id: string;
  title: string;
  organizer: string;
  category: string;
  goalAmount: number;
  submittedDate: string;
  status: "PENDING";
}

interface UserManagement {
  id: string;
  name: string;
  email: string;
  role: "DONOR" | "ORGANIZER" | "ADMIN";
  joinDate: string;
  isVerified: boolean;
  totalDonated?: number;
  requestsCreated?: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "requests" | "users" | "settings" | "rewards">("overview");
  const [adminStats, setAdminStats] = useState<AdminStats>({
    totalUsers: 0,
    totalOrganizers: 0,
    totalRequests: 0,
    pendingRequests: 0,
    activeRequests: 0,
    totalRaised: 0,
  });
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [users, setUsers] = useState<UserManagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== "ADMIN") {
      router.push("/");
    }
  }, [user, router]);

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!user?.token) throw new Error("No user token");
        const statsRes = await fetch("/api/admin/stats", {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (!statsRes.ok) throw new Error("Failed to fetch stats");
        const statsData = await statsRes.json();
        setAdminStats(statsData);

        const requestsRes = await fetch("/api/admin/requests/pending", {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (!requestsRes.ok) throw new Error("Failed to fetch pending requests");
        const requestsJson = await requestsRes.json();
        let requests: PendingRequest[] = [];
        if (Array.isArray(requestsJson.data)) {
          requests = requestsJson.data;
        } else if (Array.isArray(requestsJson)) {
          requests = requestsJson;
        } else {
          console.warn("Pending requests response format unknown:", requestsJson);
        }
        setPendingRequests(requests);

        const usersRes = await fetch("/api/admin/users", {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (!usersRes.ok) throw new Error("Failed to fetch users");
        const usersJson = await usersRes.json();
        setUsers(Array.isArray(usersJson.data) ? usersJson.data : []);
      } catch (err) {
        console.error("Error fetching admin data:", err);
        setError("เกิดข้อผิดพลาดในการดึงข้อมูล");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.token]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("th-TH").format(amount);
  };

  const getRoleColor = (role: string) => {
    const colors = {
      DONOR: "bg-blue-100 text-blue-700",
      ORGANIZER: "bg-green-100 text-green-700",
      ADMIN: "bg-purple-100 text-purple-700",
    };
    return colors[role as keyof typeof colors] || "bg-gray-100 text-gray-700";
  };

  const getRoleText = (role: string) => {
    const texts = {
      DONOR: "ผู้บริจาค",
      ORGANIZER: "ผู้จัดการ",
      ADMIN: "ผู้ดูแลระบบ",
    };
    return texts[role as keyof typeof texts] || role;
  };

  const handleApproveRequest = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/requests/${id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ approvedBy: user.id }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      const requestsRes = await fetch("/api/admin/requests/pending", {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const requestsData = await requestsRes.json();
      setPendingRequests(Array.isArray(requestsData) ? requestsData : []);
      const statsRes = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const statsData = await statsRes.json();
      setAdminStats(statsData);
    } catch (err) {
      console.error("Error approving request:", err);
      setError("ไม่สามารถอนุมัติคำขอได้");
    }
  };

  const handleRejectRequest = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/requests/${id}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) throw new Error("Failed to reject");
      const requestsRes = await fetch("/api/admin/requests/pending", {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const requestsData = await requestsRes.json();
      setPendingRequests(Array.isArray(requestsData) ? requestsData : []);
      const statsRes = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const statsData = await statsRes.json();
      setAdminStats(statsData);
    } catch (err) {
      console.error("Error rejecting request:", err);
      setError("ไม่สามารถปฏิเสธคำขอได้");
    }
  };

  const handleViewRequest = (id: string) => {
    router.push(`/requests/${id}`);
  };

  const handleViewUser = (id: string) => {
    router.push(`/admin/users/${id}`);
  };

  const handleEditUser = (id: string) => {
    router.push(`/admin/users/edit/${id}`);
  };

  const handleDeleteUser = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) throw new Error("Failed to delete");
      const usersRes = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const usersData = await usersRes.json();
      setUsers(Array.isArray(usersData.data) ? usersData.data : []);
    } catch (err) {
      console.error("Error deleting user:", err);
      setError("ไม่สามารถลบผู้ใช้ได้");
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">กำลังโหลดข้อมูล...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/")}
                className="hover:bg-pink-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                กลับหน้าหลัก
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Shield className="w-6 h-6 text-purple-500" />
                  แดชบอร์ดผู้ดูแลระบบ
                </h1>
                <p className="text-sm text-gray-600">จัดการระบบและตรวจสอบคำขอบริจาค</p>
              </div>
            </div>
            <Badge className="bg-purple-100 text-purple-700">
              <Shield className="w-3 h-3 mr-1" />
              ผู้ดูแลระบบ
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Tab Navigation */}
        <Card className="mb-6">
          <CardContent className="p-0">
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab("overview")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === "overview"
                    ? "border-b-2 border-purple-500 text-purple-600 bg-purple-50"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                  }`}
              >
                <BarChart3 className="w-4 h-4 mr-2 inline" />
                ภาพรวม
              </button>
              <button
                onClick={() => setActiveTab("requests")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === "requests"
                    ? "border-b-2 border-purple-500 text-purple-600 bg-purple-50"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                  }`}
              >
                <FileText className="w-4 h-4 mr-2 inline" />
                คำขอรออนุมัติ
                {pendingRequests.length > 0 && (
                  <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1 min-w-[20px] h-5">
                    {pendingRequests.length}
                  </Badge>
                )}
              </button>
              <button
                onClick={() => setActiveTab("users")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === "users"
                    ? "border-b-2 border-purple-500 text-purple-600 bg-purple-50"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                  }`}
              >
                <Users className="w-4 h-4 mr-2 inline" />
                จัดการผู้ใช้
              </button>
              <button
                onClick={() => router.push("/admin/rewards")}
                className="flex-1 px-4 py-3 text-sm font-medium transition-colors text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              >
                <Gift className="w-4 h-4 mr-2 inline" />
                จัดการรางวัล
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === "settings"
                    ? "border-b-2 border-purple-500 text-purple-600 bg-purple-50"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                  }`}
              >
                <Settings className="w-4 h-4 mr-2 inline" />
                ตั้งค่าระบบ
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">ผู้ใช้ทั้งหมด</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {adminStats.totalUsers.toLocaleString()}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">ผู้จัดการ</p>
                      <p className="text-2xl font-bold text-green-600">{adminStats.totalOrganizers}</p>
                    </div>
                    <Shield className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">คำขอทั้งหมด</p>
                      <p className="text-2xl font-bold text-purple-600">{adminStats.totalRequests}</p>
                    </div>
                    <FileText className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">รออนุมัติ</p>
                      <p className="text-2xl font-bold text-orange-600">{adminStats.pendingRequests}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">ยอดระดมทุนรวม</p>
                      <p className="text-2xl font-bold text-pink-600">
                        ฿{formatAmount(adminStats.totalRaised)}
                      </p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-pink-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">กำลังระดมทุน</p>
                      <p className="text-2xl font-bold text-indigo-600">{adminStats.activeRequests}</p>
                    </div>
                    <Eye className="w-8 h-8 text-indigo-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>กิจกรรมล่าสุด</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">ผู้ใช้ใหม่สมัครสมาชิก</p>
                      <p className="text-xs text-gray-500">5 นาทีที่แล้ว</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-3 bg-green-50 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">คำขอบริจาคได้รับการอนุมัติ</p>
                      <p className="text-xs text-gray-500">15 นาทีที่แล้ว</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-3 bg-orange-50 rounded-lg">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">คำขอใหม่รอการอนุมัติ</p>
                      <p className="text-xs text-gray-500">1 ชั่วโมงที่แล้ว</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "requests" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">
                คำขอรออนุมัติ ({pendingRequests.length})
              </h2>
            </div>

            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-800">{request.title}</h3>
                          <Badge className="bg-yellow-100 text-yellow-700">รออนุมัติ</Badge>
                          <Badge variant="outline">{request.category}</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">ผู้จัดการ:</span>
                            <p>{request.organizer}</p>
                          </div>
                          <div>
                            <span className="font-medium">เป้าหมาย:</span>
                            <p>฿{formatAmount(request.goalAmount)}</p>
                          </div>
                          <div>
                            <span className="font-medium">วันที่ส่ง:</span>
                            <p>
                              {new Date(request.submittedDate).toLocaleDateString("th-TH", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">หมวดหมู่:</span>
                            <p>{request.category}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-transparent"
                          onClick={() => handleViewRequest(request.id)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          ดูรายละเอียด
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApproveRequest(request.id)}
                          className="bg-green-500 hover:bg-green-600 text-white"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          อนุมัติ
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectRequest(request.id)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <X className="w-4 h-4 mr-1" />
                          ปฏิเสธ
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">จัดการผู้ใช้</h2>
              <Button
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                onClick={() => router.push("/admin/add-user")}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                เพิ่มผู้ใช้ใหม่
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-4 font-medium text-gray-700">ผู้ใช้</th>
                        <th className="text-left p-4 font-medium text-gray-700">บทบาท</th>
                        <th className="text-left p-4 font-medium text-gray-700">สถานะ</th>
                        <th className="text-left p-4 font-medium text-gray-700">วันที่สมัคร</th>
                        <th className="text-left p-4 font-medium text-gray-700">สถิติ</th>
                        <th className="text-left p-4 font-medium text-gray-700">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b hover:bg-gray-50">
                          <td className="p-4">
                            <div>
                              <div className="font-medium text-gray-800">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge className={getRoleColor(user.role)}>{getRoleText(user.role)}</Badge>
                          </td>
                          <td className="p-4">
                            <Badge
                              className={user.isVerified ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}
                            >
                              {user.isVerified ? "ยืนยันแล้ว" : "ยังไม่ยืนยัน"}
                            </Badge>
                          </td>
                          <td className="p-4 text-sm text-gray-600">
                            {new Date(user.joinDate).toLocaleDateString("th-TH", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                          <td className="p-4 text-sm text-gray-600">
                            {user.role === "DONOR" && user.totalDonated && (
                              <div>บริจาค: ฿{formatAmount(user.totalDonated)}</div>
                            )}
                            {user.role === "ORGANIZER" && user.requestsCreated && (
                              <div>คำขอ: {user.requestsCreated} รายการ</div>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-transparent"
                                onClick={() => handleViewUser(user.id)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-transparent"
                                onClick={() => handleEditUser(user.id)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
                                onClick={() => handleDeleteUser(user.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">ตั้งค่าระบบ</h2>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>การตั้งค่าทั่วไป</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">อนุมัติคำขออัตโนมัติ</h4>
                      <p className="text-sm text-gray-600">อนุมัติคำขอจากผู้จัดการที่ยืนยันแล้ว</p>
                    </div>
                    <Button variant="outline" size="sm" className="bg-transparent">
                      เปิด
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">การแจ้งเตือนอีเมล</h4>
                      <p className="text-sm text-gray-600">ส่งอีเมลแจ้งเตือนเมื่อมีคำขอใหม่</p>
                    </div>
                    <Button variant="outline" size="sm" className="bg-transparent">
                      เปิด
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">การตรวจสอบเนื้อหา</h4>
                      <p className="text-sm text-gray-600">ตรวจสอบเนื้อหาที่ไม่เหมาะสม</p>
                    </div>
                    <Button variant="outline" size="sm" className="bg-transparent">
                      เปิด
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>ข้อมูลระบบ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">เวอร์ชันระบบ</span>
                    <span className="text-sm font-medium">v1.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">อัปเดตล่าสุด</span>
                    <span className="text-sm font-medium">15 ม.ค. 2567</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">ฐานข้อมูล</span>
                    <span className="text-sm font-medium text-green-600">ปกติ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">เซิร์ฟเวอร์</span>
                    <span className="text-sm font-medium text-green-600">ออนไลน์</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}