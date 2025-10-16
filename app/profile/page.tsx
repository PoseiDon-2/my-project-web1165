"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Heart,
  Gift,
  LogOut,
  Edit3,
  ArrowLeft,
  Trophy,
  BarChart3,
  Shield,
  DollarSign,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  Palette,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "../../components/auth-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ProfileCustomization from "../../components/profile-customization";
import { PointsDisplay } from "../../components/points-display";
import { pointsSystem } from "@/lib/points-system";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import axios from "axios";
import type { UserPoints, ProfileCustomization as ProfileCustomizationType, UserLevel, Reward } from "@/types/rewards";
import { USER_LEVELS, POINTS_CONFIG } from "@/types/rewards";

export default function Profile() {
  const router = useRouter();
  const { user, logout, setUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "donations" | "favorites" | "points">("profile");
  const [showCustomization, setShowCustomization] = useState(false);
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null);
  const [userRewards, setUserRewards] = useState<Reward[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phone: user?.phone || "",
    bio: user?.bio || "",
    avatarFile: null as File | null,
  });

  useEffect(() => {
    // Redirect ถ้าไม่มี user
    if (!user) {
      router.push("/login");
      return;
    }

    const loadUserData = async () => {
      if (user?.id) {
        setIsLoading(true);
        try {
          console.log("Fetching points and rewards for userId:", user.id); // Debug
          console.log("Using token:", user.token); // Debug
          const points = await pointsSystem.getUserPoints(user.id, user.token);
          const rewards = await pointsSystem.getUserRewards(user.id, user.token);
          setUserPoints(points);
          setUserRewards(rewards);
          setFormData({
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            phone: user.phone || "",
            bio: user.bio || "",
            avatarFile: null,
          });
          setError(null);
        } catch (error) {
          console.error("Failed to load user data:", error);
          setError("ไม่สามารถโหลดข้อมูลคะแนนหรือรางวัลได้");
          toast({
            title: "ข้อผิดพลาด",
            description: "ไม่สามารถโหลดข้อมูลคะแนนหรือรางวัลได้ กรุณาลองใหม่",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadUserData();
  }, [user, router]);

  // Early return ถ้าไม่มี user
  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const formatAmount = (amount: number | undefined | null) => {
    return new Intl.NumberFormat("th-TH").format(amount ?? 0);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  const getUserLevel = (points: number | undefined): UserLevel => {
    const totalPoints = points ?? 0;
    let currentLevel = USER_LEVELS[0];
    let nextLevelPoints = USER_LEVELS[1]?.minPoints || USER_LEVELS[0].minPoints;

    for (let i = USER_LEVELS.length - 1; i >= 0; i--) {
      if (totalPoints >= USER_LEVELS[i].minPoints) {
        currentLevel = USER_LEVELS[i];
        nextLevelPoints = USER_LEVELS[i + 1]?.minPoints || USER_LEVELS[i].minPoints;
        break;
      }
    }

    const progress = nextLevelPoints
      ? Math.min(((totalPoints - currentLevel.minPoints) / (nextLevelPoints - currentLevel.minPoints)) * 100, 100)
      : 100;

    return {
      ...currentLevel,
      nextLevelPoints,
      progress,
    };
  };

  const renderCustomizedAvatar = () => {
    const theme = user.customization?.theme || "default";
    const frame = user.customization?.frame || "none";
    const badge = user.customization?.badge || "";
    const themeGradient =
      theme === "gold"
        ? "from-yellow-400 to-orange-500"
        : theme === "platinum"
          ? "from-gray-300 to-gray-500"
          : theme === "diamond"
            ? "from-blue-400 to-cyan-300"
            : "from-pink-500 to-purple-500";
    const frameClass =
      frame === "rainbow"
        ? "border-4 border-gradient-to-r from-red-500 via-yellow-500 to-blue-500"
        : frame === "fire"
          ? "border-4 border-orange-500 shadow-lg shadow-orange-200"
          : frame === "ice"
            ? "border-4 border-cyan-400 shadow-lg shadow-cyan-200"
            : "border-2 border-gray-200";

    return (
      <div className="relative inline-block">
        <div className={`p-1 rounded-full ${frameClass}`}>
          <Avatar className="w-24 h-24 mx-auto">
            <AvatarImage src={user.avatar || "/placeholder.svg"} alt={`${user.firstName} ${user.lastName}`} />
            <AvatarFallback className={`text-2xl bg-gradient-to-r ${themeGradient} text-white`}>
              {getInitials(user.firstName, user.lastName)}
            </AvatarFallback>
          </Avatar>
        </div>
        {badge && (
          <div className="absolute -top-2 -right-2 text-2xl">
            {badge === "heart" ? "💛" : badge === "crown" ? "👑" : badge === "star" ? "⭐" : badge === "diamond" ? "💎" : ""}
          </div>
        )}
        <Badge className={`absolute -bottom-2 -right-2 ${userLevel.color} text-white`}>
          {userLevel.level} {userLevel.name}
        </Badge>
      </div>
    );
  };

  const getDonationStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return { text: "สำเร็จ", class: "bg-green-100 text-green-700", icon: <CheckCircle className="w-3 h-3 mr-1" /> };
      case "pending":
        return { text: "รอดำเนินการ", class: "bg-yellow-100 text-yellow-700", icon: <Clock className="w-3 h-3 mr-1" /> };
      case "shipped":
        return { text: "จัดส่งแล้ว", class: "bg-blue-100 text-blue-700", icon: <Truck className="w-3 h-3 mr-1" /> };
      case "received":
        return {
          text: "ได้รับแล้ว",
          class: "bg-purple-100 text-purple-700",
          icon: <CheckCircle className="w-3 h-3 mr-1" />,
        };
      case "cancelled":
        return { text: "ยกเลิก", class: "bg-red-100 text-red-700", icon: <XCircle className="w-3 h-3 mr-1" /> };
      case "refunded":
        return { text: "คืนเงิน", class: "bg-orange-100 text-orange-700", icon: <DollarSign className="w-3 h-3 mr-1" /> };
      default:
        return { text: status, class: "bg-gray-100 text-gray-700", icon: null };
    }
  };

  const userLevel = getUserLevel(userPoints?.totalPoints);

  const validateForm = () => {
    if (!formData.firstName || !formData.lastName) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณากรอกชื่อและนามสกุล",
        variant: "destructive",
      });
      return false;
    }
    if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
      toast({
        title: "ข้อผิดพลาด",
        description: "เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก",
        variant: "destructive",
      });
      return false;
    }
    if (formData.bio && formData.bio.length > 500) {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไบโอต้องไม่เกิน 500 ตัวอักษร",
        variant: "destructive",
      });
      return false;
    }
    if (formData.avatarFile && formData.avatarFile.size > 5 * 1024 * 1024) {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไฟล์รูปภาพต้องไม่เกิน 5MB",
        variant: "destructive",
      });
      return false;
    }
    if (formData.avatarFile && !["image/jpeg", "image/png", "image/gif"].includes(formData.avatarFile.type)) {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไฟล์ต้องเป็น JPEG, PNG หรือ GIF",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const form = new FormData();
    form.append("firstName", formData.firstName);
    form.append("lastName", formData.lastName);
    form.append("phone", formData.phone);
    form.append("bio", formData.bio);
    if (formData.avatarFile) {
      form.append("avatarFile", formData.avatarFile);
    }

    try {
      const response = await axios.put("/api/profile/update", form, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${user.token}`,
        },
      });
      if (response.status === 200) {
        setUser(response.data.user);
        setIsEditing(false);
        toast({
          title: "อัปเดตโปรไฟล์สำเร็จ",
          description: "ข้อมูลโปรไฟล์ของคุณได้รับการบันทึกแล้ว",
        });
        // อัปเดตคะแนนถ้าผู้ใช้กรอก bio หรืออัปโหลด avatar ครั้งแรก
        if (formData.bio && !user.bio) {
          await pointsSystem.addPoints(
            user.id,
            "PROFILE_COMPLETE",
            POINTS_CONFIG.PROFILE_COMPLETE,
            "กรอกข้อมูลไบโอในโปรไฟล์"
          );
          setUserPoints(await pointsSystem.getUserPoints(user.id));
          setUserRewards(await pointsSystem.getUserRewards(user.id));
        }
        if (formData.avatarFile && !user.avatar) {
          await pointsSystem.addPoints(
            user.id,
            "ADD_AVATAR",
            POINTS_CONFIG.ADD_AVATAR,
            "เพิ่มรูปโปรไฟล์"
          );
          setUserPoints(await pointsSystem.getUserPoints(user.id));
          setUserRewards(await pointsSystem.getUserRewards(user.id));
        }
      } else {
        toast({
          title: "ข้อผิดพลาด",
          description: response.data.message || "ไม่สามารถอัปเดตโปรไฟล์ได้",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("เกิดข้อผิดพลาด:", error);
      toast({
        title: "ข้อผิดพลาด",
        description: "เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormData({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      phone: user.phone || "",
      bio: user.bio || "",
      avatarFile: null,
    });
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
            <div className="text-red-700">{error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="hover:bg-pink-50">
                <ArrowLeft className="w-4 h-4 mr-2" />
                กลับหน้าหลัก
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">โปรไฟล์ของฉัน</h1>
                <p className="text-sm text-gray-600">จัดการข้อมูลส่วนตัวและดูประวัติการบริจาค</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => router.push("/rewards")}
                className="text-yellow-600 border-yellow-200 hover:bg-yellow-50 bg-transparent"
              >
                <Gift className="w-4 h-4 mr-2" />
                ร้านรางวัล
              </Button>
              {user.role === "ORGANIZER" && (
                <Button
                  variant="outline"
                  onClick={() => router.push("/organizer-dashboard")}
                  className="text-green-600 border-green-200 hover:bg-green-50 bg-transparent"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  แดชบอร์ดผู้จัดการ
                </Button>
              )}
              {user.role === "ADMIN" && (
                <Button
                  variant="outline"
                  onClick={() => router.push("/admin-dashboard")}
                  className="text-purple-600 border-purple-200 hover:bg-purple-50 bg-transparent"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  แดชบอร์ดผู้ดูแลระบบ
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleLogout}
                className="text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
              >
                <LogOut className="w-4 h-4 mr-2" />
                ออกจากระบบ
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Card className="text-center">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {renderCustomizedAvatar()}
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      {user.firstName} {user.lastName}
                    </h2>
                    <p className="text-gray-600">{user.email}</p>
                    {user.customization?.title && user.customization.title !== "none" && (
                      <Badge variant="outline" className="mt-1">
                        {user.customization.title === "helper"
                          ? "ผู้ช่วยเหลือ"
                          : user.customization.title === "guardian"
                            ? "ผู้พิทักษ์"
                            : user.customization.title === "legend"
                              ? "ตำนาน"
                              : ""}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-pink-600">฿{formatAmount(user.totalDonated)}</div>
                      <div className="text-xs text-gray-500">ยอดบริจาครวม</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{user.donationCount ?? 0}</div>
                      <div className="text-xs text-gray-500">ครั้งที่บริจาค</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full bg-transparent"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      {isEditing ? "ยกเลิกการแก้ไข" : "แก้ไขโปรไฟล์"}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full bg-transparent"
                      onClick={() => setShowCustomization(true)}
                    >
                      <Palette className="w-4 h-4 mr-2" />
                      ตกแต่งโปรไฟล์
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {userPoints && (
              <div className="mt-6">
                <PointsDisplay userPoints={userPoints} />
              </div>
            )}

            {userRewards.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Gift className="w-5 h-5 text-yellow-500" />
                    รางวัลที่ได้รับ
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {userRewards.map((reward) => (
                    <div key={reward.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{reward.rewardId}</span>
                      <Badge className={reward.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                        {reward.isActive ? "ใช้งาน" : "หมดอายุ"}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  สถิติการบริจาค
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">ระดับปัจจุบัน</span>
                  <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                    {userLevel.name} (ระดับ {userLevel.level})
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">คะแนนปัจจุบัน</span>
                  <span className="text-sm font-medium">{userPoints?.totalPoints || 0} คะแนน</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">เป้าหมายถัดไป</span>
                  <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                    {userLevel.progress >= 100
                      ? "สูงสุดแล้ว!"
                      : `${userLevel.nextLevelPoints - (userPoints?.totalPoints || 0)} คะแนน`}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">หมวดหมู่ที่ชื่นชอบ</span>
                  <div className="flex gap-1">
                    {Array.isArray(user.preferredCategories) && user.preferredCategories.length > 0 ? (
                      user.preferredCategories.map((category, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {category}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-gray-500 text-sm">ยังไม่มีหมวดหมู่ที่ชื่นชอบ</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">สมาชิกตั้งแต่</span>
                  <span className="text-sm font-medium">
                    {new Date(user.createdAt).toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-0">
                <div className="flex border-b">
                  <button
                    onClick={() => setActiveTab("profile")}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === "profile"
                        ? "border-b-2 border-pink-500 text-pink-600 bg-pink-50"
                        : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                    }`}
                  >
                    <User className="w-4 h-4 mr-2 inline" />
                    ข้อมูลส่วนตัว
                  </button>
                  <button
                    onClick={() => setActiveTab("donations")}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === "donations"
                        ? "border-b-2 border-pink-500 text-pink-600 bg-pink-50"
                        : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                    }`}
                  >
                    <Gift className="w-4 h-4 mr-2 inline" />
                    ประวัติการบริจาค
                  </button>
                  <button
                    onClick={() => setActiveTab("favorites")}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === "favorites"
                        ? "border-b-2 border-pink-500 text-pink-600 bg-pink-50"
                        : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                    }`}
                  >
                    <Heart className="w-4 h-4 mr-2 inline" />
                    รายการที่สนใจ
                  </button>
                  <button
                    onClick={() => setActiveTab("points")}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === "points"
                        ? "border-b-2 border-pink-500 text-pink-600 bg-pink-50"
                        : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                    }`}
                  >
                    <Trophy className="w-4 h-4 mr-2 inline" />
                    ประวัติคะแนน
                  </button>
                </div>
              </CardContent>
            </Card>

            {activeTab === "profile" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-pink-500" />
                    ข้อมูลส่วนตัว
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing ? (
                    <form onSubmit={handleProfileSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">ชื่อ</label>
                          <Input
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">นามสกุล</label>
                          <Input
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">เบอร์โทรศัพท์</label>
                        <Input
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">ไบโอ</label>
                        <Textarea
                          value={formData.bio}
                          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                          rows={4}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">รูปโปรไฟล์</label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setFormData({ ...formData, avatarFile: e.target.files?.[0] || null })}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" className="w-full">
                          <Save className="w-4 h-4 mr-2" />
                          บันทึก
                        </Button>
                        <Button type="button" variant="outline" className="w-full" onClick={handleCancelEdit}>
                          ยกเลิก
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">ชื่อ</label>
                          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-800">{user.firstName}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">นามสกุล</label>
                          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-800">{user.lastName}</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">อีเมล</label>
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-800">{user.email}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">เบอร์โทรศัพท์</label>
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-800">{user.phone ?? "ไม่ระบุ"}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">ไบโอ</label>
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-800">{user.bio ?? "ไม่ระบุ"}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">วันที่สมัครสมาชิก</label>
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-800">
                            {new Date(user.createdAt).toLocaleDateString("th-TH", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === "donations" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-pink-500" />
                    ประวัติการบริจาค
                  </CardTitle>
                  <p className="text-sm text-gray-600">รายการการบริจาคทั้งหมดของคุณ</p>
                </CardHeader>
                <CardContent>
                  {user.donations && user.donations.length > 0 ? (
                    <div className="space-y-4">
                      {user.donations.map((donation) => {
                        const statusBadge = getDonationStatusBadge(donation.status);
                        return (
                          <Card key={donation.id} className="p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-2">
                              <Link
                                href={`/donation/${donation.requestId}`}
                                className="text-lg font-semibold text-gray-800 hover:text-pink-600 transition-colors"
                              >
                                {donation.requestTitle}
                              </Link>
                              <Badge className={`${statusBadge.class} text-xs px-2 py-1`}>
                                {statusBadge.icon}
                                {statusBadge.text}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500 mb-2">
                              {new Date(donation.date).toLocaleDateString("th-TH", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                            {donation.type === "money" ? (
                              <div className="flex items-center gap-2 text-gray-700 text-sm">
                                <DollarSign className="w-4 h-4" />
                                <span>
                                  บริจาคเงิน: <span className="font-bold">฿{formatAmount(donation.amount)}</span>
                                </span>
                                {donation.paymentMethod && (
                                  <span className="text-gray-500">({donation.paymentMethod})</span>
                                )}
                              </div>
                            ) : donation.type === "item" ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-gray-700 text-sm">
                                  <Package className="w-4 h-4" />
                                  <span>บริจาคสิ่งของ:</span>
                                </div>
                                <ul className="list-disc list-inside text-sm text-gray-600 ml-6">
                                  {donation.items?.map((item, idx) => (
                                    <li key={idx}>
                                      {item.name} ({item.quantity} ชิ้น)
                                      {item.status && (
                                        <Badge variant="secondary" className="ml-2 text-xs">
                                          {item.status === "shipped"
                                            ? "จัดส่งแล้ว"
                                            : item.status === "received"
                                              ? "ได้รับแล้ว"
                                              : "รอดำเนินการ"}
                                        </Badge>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                                {donation.trackingNumber && (
                                  <div className="flex items-center gap-2 text-gray-700 text-sm mt-2">
                                    <Truck className="w-4 h-4" />
                                    <span>
                                      เลขติดตามพัสดุ: <span className="font-medium">{donation.trackingNumber}</span>
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-gray-700 text-sm">
                                <Gift className="w-4 h-4" />
                                <span>อาสาสมัคร</span>
                              </div>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Gift className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>ยังไม่มีประวัติการบริจาค</p>
                      <p className="text-sm mt-1">เริ่มบริจาคเพื่อช่วยเหลือผู้อื่น</p>
                      <Button onClick={() => router.push("/")} className="mt-4 bg-pink-500 hover:bg-pink-600">
                        เริ่มบริจาค
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === "favorites" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-pink-500" />
                    รายการที่สนใจ
                  </CardTitle>
                  <p className="text-sm text-gray-600">คำขอบริจาคที่คุณสนใจ</p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-gray-600">
                      คุณมีรายการที่สนใจ {user.preferredCategories?.length ?? 0} รายการ
                    </p>
                    <Button variant="outline" onClick={() => router.push("/favorites")} className="bg-transparent">
                      ดูทั้งหมด
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "points" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-pink-500" />
                    ประวัติคะแนน
                  </CardTitle>
                  <p className="text-sm text-gray-600">รายการคะแนนที่คุณได้รับและใช้ไป</p>
                </CardHeader>
                <CardContent>
                  {userPoints && userPoints.pointsHistory.length > 0 ? (
                    <div className="space-y-4">
                      {userPoints.pointsHistory.map((transaction) => (
                        <Card key={transaction.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{transaction.description}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(transaction.date).toLocaleDateString("th-TH", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                            <Badge
                              className={transaction.type === "earned" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}
                            >
                              {transaction.type === "earned" ? "+" : "-"}{transaction.amount} คะแนน
                            </Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>ยังไม่มีประวัติคะแนน</p>
                      <p className="text-sm mt-1">เริ่มทำกิจกรรมเพื่อรับคะแนน</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showCustomization} onOpenChange={setShowCustomization}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ตกแต่งโปรไฟล์</DialogTitle>
            <DialogDescription>ปรับแต่งรูปลักษณ์โปรไฟล์ของคุณด้วยรางวัลที่ได้รับ</DialogDescription>
          </DialogHeader>
          <ProfileCustomization
            onClose={() => setShowCustomization(false)}
            onSave={(newCustomization: ProfileCustomizationType) => {
              setUser({ ...user, customization: newCustomization });
              setShowCustomization(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}