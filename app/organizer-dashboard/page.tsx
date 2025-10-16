"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  BarChart3,
  Users,
  DollarSign,
  Clock,
  ArrowLeft,
  UserCheck,
  Calendar,
  Phone,
  Briefcase,
  ClipboardList,
  MessageSquare,
  CheckCircle,
  XCircle,
  Mail,
  Truck,
  LinkIcon,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/components/auth-context";
import OrganizerReceiptManagement from "@/components/organizer-receipt-management";

interface DonationRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  targetAmount: number; // เปลี่ยนจาก goalAmount
  currentAmount: number;
  supporters: number;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" | "CANCELLED";
  createdDate: string;
  daysLeft: number;
  images: string[];
}

interface VolunteerApplication {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  skills: string[];
  experience: string;
  availability: string;
  status: "APPLIED" | "APPROVED" | "REJECTED" | "COMPLETED";
  hoursCommitted: number;
  startDate: string;
  endDate: string;
  appliedDate: string;
  requestId: string;
}

const ImageWithFallback = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div className={className}>
        <span className="text-gray-400 text-xs">ไม่มีรูปภาพ</span>
      </div>
    );
  }

  return (
    <NextImage
      src={src}
      alt={alt}
      className={className}
      width={200}
      height={120}
      onError={(e) => {
        console.error("Image load error:", src, e);
        setError(true);
      }}
    />
  );
};

export default function OrganizerDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "overview" | "requests" | "volunteer-applicants" | "analytics" | "receipts"
  >("overview");
  const [selectedRequestForReceipts, setSelectedRequestForReceipts] = useState<DonationRequest | null>(null);
  const [requests, setRequests] = useState<DonationRequest[]>([]);
  const [volunteerApplications, setVolunteerApplications] = useState<VolunteerApplication[]>([]);
  const [storiesCount, setStoriesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== "ORGANIZER") {
      router.push("/");
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        setError("กรุณาเข้าสู่ระบบ");
        router.push("/login");
        setIsLoading(false);
        return;
      }

      try {
        const requestsResponse = await fetch("/api/donation-requests", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!requestsResponse.ok) {
          const errorData = await requestsResponse.json();
          throw new Error(errorData.error || "ไม่สามารถดึงข้อมูลคำขอบริจาคได้");
        }
        const requestsData = await requestsResponse.json();
        console.log("Requests response:", requestsData); // Debug response
        const requestsWithImages = (Array.isArray(requestsData)
          ? requestsData
          : Array.isArray(requestsData.data)
            ? requestsData.data
            : []
        ).map((req: any) => ({
          id: req.id,
          title: req.title,
          description: req.description,
          category: req.category || "N/A",
          targetAmount: req.targetAmount || 0, // เปลี่ยนจาก goalAmount
          currentAmount: req.currentAmount || 0,
          supporters: req.supporters || 0,
          status: req.status,
          createdDate: req.createdDate || req.createdAt,
          daysLeft: req.daysLeft || 0,
          images: Array.isArray(req.images) ? req.images : [],
        }));
        setRequests(requestsWithImages);

        const applicationsResponse = await fetch("/api/volunteer-applications", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!applicationsResponse.ok) {
          const errorData = await applicationsResponse.json();
          throw new Error(errorData.error || "ไม่สามารถดึงข้อมูลผู้สมัครอาสาสมัครได้");
        }
        const applicationsData = await applicationsResponse.json();
        const applicationsArray = Array.isArray(applicationsData)
          ? applicationsData
          : Array.isArray(applicationsData.data)
            ? applicationsData.data
            : [];
        setVolunteerApplications(applicationsArray);

        const storiesResponse = await fetch("/api/stories/groups", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!storiesResponse.ok) {
          const errorData = await storiesResponse.json();
          throw new Error(errorData.error || "ไม่สามารถดึงจำนวน Stories ได้");
        }
        const storiesData = await storiesResponse.json();
        setStoriesCount(storiesData.count || 0);
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError(err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router, user]);

  if (!user || user.role !== "ORGANIZER") {
    return null;
  }

  const handleUpdateApplicationStatus = async (
    applicationId: string,
    status: "APPROVED" | "REJECTED" | "COMPLETED"
  ) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("กรุณาเข้าสู่ระบบ");
        return;
      }

      const response = await fetch(`/api/volunteer-applications/${applicationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "ไม่สามารถอัปเดตสถานะได้");
      }

      const updatedApplication = await response.json();
      setVolunteerApplications((prev) =>
        prev.map((app) => (app.id === applicationId ? { ...app, status: updatedApplication.status } : app))
      );
      setSuccess(`อัปเดตสถานะใบสมัครของ ${updatedApplication.name} เป็น ${getStatusText(updatedApplication.status)} สำเร็จ`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Error updating application status:", err);
      setError(err.message || "เกิดข้อผิดพลาดในการอัปเดตสถานะ");
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("th-TH").format(amount);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      DRAFT: "bg-gray-100 text-gray-700",
      PENDING: "bg-yellow-100 text-yellow-700",
      APPROVED: "bg-green-100 text-green-700",
      REJECTED: "bg-red-100 text-red-700",
      COMPLETED: "bg-blue-100 text-blue-700",
      CANCELLED: "bg-gray-100 text-gray-700",
      APPLIED: "bg-yellow-100 text-yellow-700",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-700";
  };

  const getStatusText = (status: string) => {
    const texts = {
      DRAFT: "ร่าง",
      PENDING: "รอการอนุมัติ",
      APPROVED: "อนุมัติแล้ว",
      REJECTED: "ถูกปฏิเสธ",
      COMPLETED: "เสร็จสิ้น",
      CANCELLED: "ยกเลิก",
      APPLIED: "รอการอนุมัติ",
    };
    return texts[status as keyof typeof texts] || status;
  };

  const totalRaised = Array.isArray(requests) ? requests.reduce((sum, req) => sum + req.currentAmount, 0) : 0;
  const totalSupporters = Array.isArray(requests) ? requests.reduce((sum, req) => sum + req.supporters, 0) : 0;
  const activeRequests = Array.isArray(requests) ? requests.filter((req) => req.status === "APPROVED").length : 0;
  const pendingVolunteerApplications = Array.isArray(volunteerApplications)
    ? volunteerApplications.filter((app) => app.status === "APPLIED").length
    : 0;

  const getSkillIcon = (skill: string) => {
    const icons = {
      "งานใช้แรงงาน": <Briefcase className="w-4 h-4 text-gray-500" />,
      "งานเฉพาะทาง": <ClipboardList className="w-4 h-4 text-gray-500" />,
      "งานสร้างสรรค์": <MessageSquare className="w-4 h-4 text-gray-500" />,
      "งานประสานงาน": <ClipboardList className="w-4 h-4 text-gray-500" />,
      "งานครัว": <Briefcase className="w-4 h-4 text-gray-500" />,
      "งานขนส่ง": <Truck className="w-4 h-4 text-gray-500" />,
    };
    return icons[skill as keyof typeof icons] || null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="hover:bg-pink-50">
                <ArrowLeft className="w-4 h-4 mr-2" />
                กลับหน้าหลัก
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">แดชบอร์ดผู้จัดการ</h1>
                <p className="text-sm text-gray-600">{user.organizationName || `${user.firstName} ${user.lastName}`}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push("/story-management")}
                className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                จัดการ Stories
              </Button>
              <Button
                onClick={() => router.push("/create-request")}
                className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                สร้างคำขอใหม่
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <AlertDescription className="text-green-700">{success}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        <Card className="mb-6">
          <CardContent className="p-0">
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab("overview")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === "overview"
                    ? "border-b-2 border-pink-500 text-pink-600 bg-pink-50"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                  }`}
              >
                <BarChart3 className="w-4 h-4 mr-2 inline" />
                ภาพรวม
              </button>
              <button
                onClick={() => setActiveTab("requests")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === "requests"
                    ? "border-b-2 border-pink-500 text-pink-600 bg-pink-50"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                  }`}
              >
                <Eye className="w-4 h-4 mr-2 inline" />
                คำขอของฉัน
              </button>
              <button
                onClick={() => setActiveTab("volunteer-applicants")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === "volunteer-applicants"
                    ? "border-b-2 border-pink-500 text-pink-600 bg-pink-50"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                  }`}
              >
                <UserCheck className="w-4 h-4 mr-2 inline" />
                ผู้สมัครอาสา
                {pendingVolunteerApplications > 0 && (
                  <Badge className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {pendingVolunteerApplications}
                  </Badge>
                )}
              </button>
              <button
                onClick={() => setActiveTab("receipts")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === "receipts"
                    ? "border-b-2 border-pink-500 text-pink-600 bg-pink-50"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                  }`}
              >
                <Receipt className="w-4 h-4 mr-2 inline" />
                จัดการสลิป
              </button>
              <button
                onClick={() => setActiveTab("analytics")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === "analytics"
                    ? "border-b-2 border-pink-500 text-pink-600 bg-pink-50"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                  }`}
              >
                <BarChart3 className="w-4 h-4 mr-2 inline" />
                สถิติ
              </button>
            </div>
          </CardContent>
        </Card>

        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">ยอดระดมทุนรวม</p>
                      <p className="text-2xl font-bold text-green-600">฿{formatAmount(totalRaised)}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">ผู้สนับสนุนรวม</p>
                      <p className="text-2xl font-bold text-blue-600">{totalSupporters}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">คำขอที่กำลังดำเนินการ</p>
                      <p className="text-2xl font-bold text-purple-600">{activeRequests}</p>
                    </div>
                    <Clock className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">คำขอทั้งหมด</p>
                      <p className="text-2xl font-bold text-pink-600">{requests.length}</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-pink-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Stories ทั้งหมด</p>
                      <p className="text-2xl font-bold text-purple-600">{storiesCount}</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">ผู้สมัครอาสาใหม่</p>
                      <p className="text-2xl font-bold text-orange-600">{pendingVolunteerApplications}</p>
                    </div>
                    <UserCheck className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>คำขอล่าสุด</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {requests.slice(0, 3).map((request) => {
                    const progressPercentage = request.targetAmount ? (request.currentAmount / request.targetAmount) * 100 : 0;
                    return (
                      <div key={request.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="w-24 h-16 rounded-md overflow-hidden">
                          <ImageWithFallback
                            src={Array.isArray(request.images) && request.images.length > 0 ? request.images[0] : "/placeholder.svg"}
                            alt={request.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-gray-800">{request.title}</h4>
                            <Badge className={getStatusColor(request.status)}>{getStatusText(request.status)}</Badge>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">ระดมทุนได้</span>
                              <span className="font-semibold">
                                ฿{formatAmount(request.currentAmount)} / ฿{formatAmount(request.targetAmount)}
                              </span>
                            </div>
                            <Progress value={progressPercentage} className="h-2" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-transparent"
                            onClick={() => router.push(`/requests/${request.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="bg-transparent">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ผู้สมัครอาสาสมัครล่าสุด</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {volunteerApplications.slice(0, 3).map((applicant) => {
                    const relatedRequest = requests.find((req) => req.id === applicant.requestId);
                    return (
                      <div key={applicant.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-800">{applicant.name}</h4>
                            <Badge className={getStatusColor(applicant.status)}>
                              {getStatusText(applicant.status)}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            <Mail className="w-3 h-3 inline mr-1" />
                            {applicant.email}
                          </p>
                          <p className="text-sm text-gray-600">
                            <Phone className="w-3 h-3 inline mr-1" />
                            {applicant.phone}
                          </p>
                          {relatedRequest && (
                            <p className="text-sm text-gray-600 mt-1">
                              <LinkIcon className="w-3 h-3 inline mr-1" />
                              สมัครสำหรับ:{" "}
                              <Button
                                variant="link"
                                className="p-0 h-auto text-sm text-pink-600 hover:text-pink-700"
                                onClick={() => router.push(`/requests/${relatedRequest.id}`)}
                              >
                                {relatedRequest.title}
                              </Button>
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {applicant.skills.map((skill, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {getSkillIcon(skill)} {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-transparent"
                          onClick={() => router.push(`/volunteer-applications/${applicant.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>การดำเนินการด่วน</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => router.push("/create-story")}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  สร้าง Story ใหม่
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/story-management")}
                  className="w-full bg-transparent"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  ดู Stories ทั้งหมด
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "requests" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">คำขอบริจาคทั้งหมด</h2>
              <Button
                onClick={() => router.push("/create-request")}
                className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                สร้างคำขอใหม่
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {requests.map((request) => {
                const progressPercentage = request.targetAmount ? (request.currentAmount / request.targetAmount) * 100 : 0;
                return (
                  <Card key={request.id} className="overflow-hidden">
                    <div className="aspect-video rounded-t-md overflow-hidden">
                      <ImageWithFallback
                        src={Array.isArray(request.images) && request.images.length > 0 ? request.images[0] : "/placeholder.svg"}
                        alt={request.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <h3 className="font-bold text-gray-800 line-clamp-2 flex-1">{request.title}</h3>
                          <Badge className={getStatusColor(request.status)}>{getStatusText(request.status)}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{request.description}</p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">ระดมทุนได้</span>
                            <span className="font-semibold">
                              ฿{formatAmount(request.currentAmount)} / ฿{formatAmount(request.targetAmount)}
                            </span>
                          </div>
                          <Progress value={progressPercentage} className="h-2" />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{request.supporters} ผู้สนับสนุน</span>
                            <span>เหลือ {request.daysLeft} วัน</span>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 bg-transparent"
                            onClick={() => router.push(`/requests/${request.id}`)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            ดู
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 bg-transparent"
                            onClick={() => {
                              setSelectedRequestForReceipts(request);
                              setActiveTab("receipts");
                            }}
                          >
                            <Receipt className="w-4 h-4 mr-1" />
                            สลิป
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                            <Edit className="w-4 h-4 mr-1" />
                            แก้ไข
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "volunteer-applicants" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">ผู้สมัครอาสาสมัครทั้งหมด</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {volunteerApplications.map((applicant) => {
                const relatedRequest = requests.find((req) => req.id === applicant.requestId);
                return (
                  <Card key={applicant.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <h3 className="font-bold text-gray-800 line-clamp-2 flex-1">{applicant.name}</h3>
                          <Badge className={getStatusColor(applicant.status)}>{getStatusText(applicant.status)}</Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          <Mail className="w-4 h-4 inline mr-1" />
                          {applicant.email}
                        </p>
                        <p className="text-sm text-gray-600">
                          <Phone className="w-4 h-4 inline mr-1" />
                          {applicant.phone}
                        </p>
                        <p className="text-sm text-gray-600">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          สมัครเมื่อ {new Date(applicant.appliedDate).toLocaleDateString("th-TH")}
                        </p>
                        {relatedRequest && (
                          <p className="text-sm text-gray-600 mt-1">
                            <LinkIcon className="w-4 h-4 inline mr-1" />
                            สมัครสำหรับ:{" "}
                            <Button
                              variant="link"
                              className="p-0 h-auto text-sm text-pink-600 hover:text-pink-700"
                              onClick={() => router.push(`/requests/${relatedRequest.id}`)}
                            >
                              {relatedRequest.title}
                            </Button>
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 pt-2">
                          {applicant.skills.map((skill, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {getSkillIcon(skill)} {skill}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 bg-transparent"
                            onClick={() => router.push(`/volunteer-applications/${applicant.id}`)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            ดูรายละเอียด
                          </Button>
                          {applicant.status === "APPLIED" && (
                            <>
                              <Button
                                size="sm"
                                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                                onClick={() => handleUpdateApplicationStatus(applicant.id, "APPROVED")}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                อนุมัติ
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
                                onClick={() => handleUpdateApplicationStatus(applicant.id, "REJECTED")}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                ปฏิเสธ
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "receipts" && (
          <div className="space-y-6">
            {selectedRequestForReceipts ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="sm" onClick={() => setSelectedRequestForReceipts(null)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    กลับ
                  </Button>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">จัดการสลิปการรับเงิน</h2>
                    <p className="text-gray-600">สำหรับ: {selectedRequestForReceipts.title}</p>
                  </div>
                </div>
                <OrganizerReceiptManagement
                  requestId={selectedRequestForReceipts.id.toString()}
                  requestTitle={selectedRequestForReceipts.title}
                />
              </div>
            ) : (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-800">เลือกคำขอเพื่อจัดการสลิป</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {requests.map((request) => (
                    <Card
                      key={request.id}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedRequestForReceipts(request)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <h3 className="font-bold text-gray-800 line-clamp-2 flex-1">{request.title}</h3>
                            <Badge className={getStatusColor(request.status)}>{getStatusText(request.status)}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">{request.description}</p>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">ระดมทุนได้</span>
                            <span className="font-semibold">฿{formatAmount(request.currentAmount)}</span>
                          </div>
                          <Button className="w-full" size="sm">
                            <Receipt className="w-4 h-4 mr-2" />
                            จัดการสลิป
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">สถิติและการวิเคราะห์</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>ประสิทธิภาพการระดมทุน</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {requests
                      .filter((req) => req.status === "APPROVED")
                      .map((request) => {
                        const progressPercentage = request.targetAmount ? (request.currentAmount / request.targetAmount) * 100 : 0;
                        return (
                          <div key={request.id} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium truncate">{request.title}</span>
                              <span className="text-gray-600">{Math.round(progressPercentage)}%</span>
                            </div>
                            <Progress value={progressPercentage} className="h-2" />
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>การแจกแจงตามหมวดหมู่</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      "ภัยพิบัติ",
                      "การแพทย์",
                      "การศึกษา",
                      "สัตว์",
                      "สิ่งแวดล้อม",
                      "ผู้สูงอายุ",
                      "เด็กและเยาวชน",
                      "ผู้พิการ",
                      "ชุมชน",
                      "ศาสนา",
                    ].map((category) => {
                      const categoryRequests = requests.filter((req) => req.category === category);
                      const categoryTotal = categoryRequests.reduce((sum, req) => sum + req.currentAmount, 0);
                      return (
                        <div key={category} className="flex justify-between items-center">
                          <span className="text-sm font-medium">{category}</span>
                          <div className="text-right">
                            <div className="text-sm font-semibold">฿{formatAmount(categoryTotal)}</div>
                            <div className="text-xs text-gray-500">{categoryRequests.length} คำขอ</div>
                          </div>
                        </div>
                      );
                    })}
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