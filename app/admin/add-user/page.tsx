"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Save,
  X,
  Shield,
  Building,
  AlertTriangle,
  UserPlus,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "../../../components/auth-context";

// Organization types
const organizationTypes = [
  { id: "school", label: "สถานศึกษา" },
  { id: "hospital", label: "สถานพยาบาล" },
  { id: "foundation", label: "มูลนิธิ/องค์กรการกุศล" },
  { id: "ngo", label: "องค์กรพัฒนาเอกชน" },
  { id: "government", label: "หน่วยงานราชการ" },
  { id: "community", label: "องค์กรชุมชน" },
  { id: "religious", label: "สถานศาสนา" },
  { id: "sports", label: "สโมสรกีฬา" },
  { id: "arts", label: "องค์กรศิลปะ" },
  { id: "other", label: "อื่นๆ" },
];

// General categories for interests
const generalCategories = [
  { id: "education", label: "การศึกษา" },
  { id: "healthcare", label: "สาธารณสุข" },
  { id: "social-welfare", label: "สวัสดิการสังคม" },
  { id: "environment", label: "สิ่งแวดล้อม" },
  { id: "disaster-relief", label: "การช่วยเหลือภัยพิบัติ" },
  { id: "animal-welfare", label: "สวัสดิการสัตว์" },
  { id: "arts-culture", label: "ศิลปะและวัฒนธรรม" },
  { id: "technology", label: "เทคโนโลยีและนวัตกรรม" },
  { id: "sports", label: "กีฬาและนันทนาการ" },
  { id: "community", label: "พัฒนาชุมชน" },
];

interface AddUserData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: "user" | "organizer" | "admin";
  organizationName?: string;
  organizationType?: string;
  organizationId?: string;
  interests: string[];
  isVerified: boolean;
  documentsVerified?: boolean;
}

export default function AddUserPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState<AddUserData>({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    role: "user",
    organizationName: "",
    organizationType: "",
    organizationId: "",
    interests: [],
    isVerified: true,
    documentsVerified: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ใช้ useEffect สำหรับการ redirect
  useEffect(() => {
    if (!currentUser || currentUser.role !== "ADMIN") {
      router.push("/");
    }
  }, [currentUser, router]);

  // Early return เพื่อป้องกันการ render ถ้าไม่ใช่ admin
  if (!currentUser || currentUser.role !== "ADMIN") {
    return null;
  }

  const handleInputChange = (name: string, value: string | boolean) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleInterestToggle = (interestId: string) => {
    setFormData({
      ...formData,
      interests: formData.interests.includes(interestId)
        ? formData.interests.filter((id) => id !== interestId)
        : [...formData.interests, interestId],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    // Validation
    if (
      !formData.email ||
      !formData.password ||
      !formData.firstName ||
      !formData.lastName ||
      !formData.phone
    ) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      setSaving(false);
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      setSaving(false);
      return;
    }
    if (formData.password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      setSaving(false);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("รูปแบบอีเมลไม่ถูกต้อง");
      setSaving(false);
      return;
    }
    const phoneRegex = /^[0-9-]+$/;
    if (!phoneRegex.test(formData.phone)) {
      setError("เบอร์โทรศัพท์ไม่ถูกต้อง");
      setSaving(false);
      return;
    }
    if (
      formData.role === "organizer" &&
      (!formData.organizationName && !formData.organizationId)
    ) {
      setError("กรุณาระบุชื่อองค์กรหรือเลือกองค์กรที่มีอยู่");
      setSaving(false);
      return;
    }

    try {
      const payload: any = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        role:
          formData.role === "user"
            ? "DONOR"
            : formData.role === "organizer"
              ? "ORGANIZER"
              : "ADMIN",
        status: formData.isVerified ? "ACTIVE" : "INACTIVE",
      };

      if (formData.role === "organizer") {
        payload.organization = formData.organizationId
          ? { connect: { id: formData.organizationId } }
          : formData.organizationName
            ? { create: { name: formData.organizationName, type: formData.organizationType } }
            : undefined;
        payload.documentsVerified = formData.documentsVerified || false;
      }

      if (formData.role === "user" && formData.interests?.length) {
        payload.userInterests = {
          create: formData.interests.map((interestId) => ({
            interest: { connect: { id: interestId } },
          })),
        };
      }

      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "เกิดข้อผิดพลาดในการสร้างผู้ใช้");

      setSuccess("สร้างผู้ใช้ใหม่เรียบร้อยแล้ว");
      setTimeout(() => router.push("/admin-dashboard"), 1500);
    } catch (err: any) {
      setError(err.message);
    }

    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="hover:bg-pink-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับ
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-purple-500" />
              เพิ่มผู้ใช้ใหม่
            </h1>
            <p className="text-sm text-gray-600">สร้างบัญชีผู้ใช้ใหม่โดยผู้ดูแลระบบ</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              ข้อมูลผู้ใช้ใหม่
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription className="text-red-700">{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-200 bg-green-50">
                  <AlertDescription className="text-green-700">{success}</AlertDescription>
                </Alert>
              )}

              {/* Basic Info */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-gray-700">
                    ชื่อ *
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-gray-700">
                    นามสกุล *
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700">
                    อีเมล *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-gray-700">
                    เบอร์โทรศัพท์ *
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700">
                    รหัสผ่าน *
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-gray-700">
                    ยืนยันรหัสผ่าน *
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label htmlFor="role" className="text-gray-700">
                  บทบาท *
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: "user" | "organizer" | "admin") =>
                    handleInputChange("role", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกบทบาท" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">ผู้ใช้ทั่วไป</SelectItem>
                    <SelectItem value="organizer">ผู้แทนองค์กร</SelectItem>
                    <SelectItem value="admin">ผู้ดูแลระบบ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dynamic Role Details */}
              {formData.role === "user" && (
                <div className="space-y-4">
                  <h4 className="font-medium text-pink-800 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-pink-600" /> เลือกความสนใจ
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                    {generalCategories.map((interest) => (
                      <label
                        key={interest.id}
                        className="flex items-center gap-2 border p-2 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.interests.includes(interest.id)}
                          onChange={() => handleInterestToggle(interest.id)}
                        />
                        {interest.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Organization info (Organizer only) */}
              {formData.role === "organizer" && (
                <div className="space-y-4 p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-800 flex items-center gap-2">
                    <Building className="w-4 h-4" /> ข้อมูลองค์กร
                  </h4>
                  <div className="space-y-2">
                    <Label htmlFor="organizationName" className="text-gray-700">
                      ชื่อองค์กร *
                    </Label>
                    <Input
                      id="organizationName"
                      value={formData.organizationName}
                      onChange={(e) => handleInputChange("organizationName", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="organizationType" className="text-gray-700">
                      ประเภทองค์กร *
                    </Label>
                    <Select
                      value={formData.organizationType}
                      onValueChange={(value) => handleInputChange("organizationType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกประเภทองค์กร" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizationTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.documentsVerified}
                      onChange={(e) => handleInputChange("documentsVerified", e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="documentsVerified" className="text-sm text-gray-700">
                      ยืนยันเอกสารแล้ว
                    </Label>
                  </div>
                </div>
              )}

              {/* Verification */}
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> สถานะการยืนยัน
                </h4>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isVerified}
                    onChange={(e) => handleInputChange("isVerified", e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="isVerified" className="text-sm text-gray-700">
                    ยืนยันตัวตนแล้ว
                  </Label>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-6">
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                >
                  {saving ? "กำลังสร้าง..." : "สร้างผู้ใช้ใหม่"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={saving}
                  className="flex-1"
                >
                  ยกเลิก
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}