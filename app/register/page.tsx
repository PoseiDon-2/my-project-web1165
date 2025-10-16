"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowLeft, Upload, FileText, CheckCircle, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "../../components/auth-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Combobox } from "@/components/ui/combobox"

type RegistrationStep = "info" | "interests" | "documents" | "otp" | "success"

type Organization = {
  id: string
  name: string
  type: string
}

const generalInterests = [
  {
    id: "disaster-relief",
    label: "ช่วยเหลือภัยพิบัติ",
    description: "น้ำท่วม แผ่นดินไหว ไฟไหม้ ภัยแล้ง",
    icon: "🌊",
    category: "disaster",
  },
  {
    id: "medical-health",
    label: "การแพทย์และสุขภาพ",
    description: "โรงพยาบาล อุปกรณ์การแพทย์ การรักษา",
    icon: "🏥",
    category: "medical",
  },
  {
    id: "education-learning",
    label: "การศึกษาและการเรียนรู้",
    description: "โรงเรียน มหาวิทยาลัย ทุนการศึกษา",
    icon: "📚",
    category: "education",
  },
  {
    id: "animal-welfare",
    label: "สวัสดิภาพสัตว์",
    description: "สุนัขจรจัด แมวจรจัด สัตว์ป่า",
    icon: "🐕",
    category: "animal",
  },
  {
    id: "environment",
    label: "สิ่งแวดล้อม",
    description: "ปลูกป่า ลดขยะ พลังงานสะอาด",
    icon: "🌱",
    category: "environment",
  },
  {
    id: "elderly-care",
    label: "ดูแลผู้สูงอายุ",
    description: "บ้านพักคนชรา กิจกรรมผู้สูงอายุ",
    icon: "👴",
    category: "elderly",
  },
  {
    id: "children-youth",
    label: "เด็กและเยาวชน",
    description: "สถานเลี้ยงเด็กกำพร้า กิจกรรมเด็ก",
    icon: "👶",
    category: "children",
  },
  {
    id: "disability-support",
    label: "ผู้พิการ",
    description: "ศูนย์ผู้พิการ อุปกรณ์ช่วยเหลือ",
    icon: "♿",
    category: "disability",
  },
  {
    id: "community-development",
    label: "พัฒนาชุมชน",
    description: "โครงการชุมชน สาธารณูปโภค",
    icon: "🏘️",
    category: "community",
  },
  {
    id: "religious-spiritual",
    label: "ศาสนาและจิตวิญญาณ",
    description: "วัด โบสถ์ มัสยิด กิจกรรมศาสนา",
    icon: "🙏",
    category: "religion",
  },
  {
    id: "arts-culture",
    label: "ศิลปะและวัฒนธรรม",
    description: "การแสดง ดนตรี ศิลปกรรม",
    icon: "🎨",
    category: "arts",
  },
  {
    id: "sports-recreation",
    label: "กีฬาและนันทนาการ",
    description: "อุปกรณ์กีฬา สนามเด็กเล่น",
    icon: "⚽",
    category: "sports",
  },
]

const organizationTypes = [
  { value: "NGO", label: "องค์กรไม่แสวงหาผลกำไร", icon: "🌟" },
  { value: "CHARITY", label: "การกุศล", icon: "🤝" },
  { value: "FOUNDATION", label: "มูลนิธิ", icon: "🏛️" },
  { value: "GOVERNMENT", label: "หน่วยงานราชการ", icon: "🏛️" },
  { value: "TEMPLE", label: "วัด/สถานที่ศักดิ์สิทธิ์", icon: "🏛️" },
  { value: "OTHER", label: "อื่นๆ", icon: "📌" },
]

export default function Register() {
  const router = useRouter()
  const { register, sendOTP, verifyOTP, isLoading } = useAuth()
  const [currentStep, setCurrentStep] = useState<RegistrationStep>("info")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    role: "user" as "DONOR" | "ORGANIZER",
    organizationId: "",
    newOrganizationName: "",
    organizationType: "",
    registrationNumber: "",
    templeId: "",
    interests: [] as string[],
    documents: {
      idCard: null as File | null,
      organizationCert: null as File | null,
    },
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false)

  useEffect(() => {
    if (formData.role === "ORGANIZER") {
      const fetchOrganizations = async () => {
        setIsLoadingOrganizations(true)
        try {
          const response = await fetch("/api/organizations")
          if (!response.ok) throw new Error("Failed to fetch organizations")
          const data = await response.json()
          setOrganizations(data)
        } catch (err) {
          setError("ไม่สามารถโหลดรายชื่อองค์กรได้ กรุณาลองใหม่")
        } finally {
          setIsLoadingOrganizations(false)
        }
      }
      fetchOrganizations()
    }
  }, [formData.role])

  const getStepProgress = () => {
    const userSteps = ["info", "interests", "otp", "success"]
    const organizerSteps = ["info", "documents", "otp", "success"]
    const steps = formData.role === "ORGANIZER" ? organizerSteps : userSteps
    return ((steps.indexOf(currentStep) + 1) / steps.length) * 100
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (currentStep === "info") {
      if (!formData.email || !formData.password || !formData.firstName || !formData.lastName || !formData.phone) {
        setError("กรุณากรอกข้อมูลพื้นฐานให้ครบถ้วน")
        return
      }

      if (formData.password !== formData.confirmPassword) {
        setError("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน")
        return
      }

      if (formData.password.length < 6) {
        setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
        return
      }

      const phoneRegex = /^[0-9-]+$/
      if (!phoneRegex.test(formData.phone)) {
        setError("เบอร์โทรศัพท์ต้องมีเฉพาะตัวเลขและเครื่องหมาย -")
        return
      }

      if (formData.role === "ORGANIZER") {
        if (!formData.organizationId && !formData.newOrganizationName) {
          setError("กรุณาเลือกองค์กรที่มีอยู่หรือระบุชื่อองค์กรใหม่")
          return
        }
        if (!formData.organizationType) {
          setError("กรุณาเลือกประเภทองค์กร")
          return
        }
        if (formData.organizationId === "other" && !formData.newOrganizationName) {
          setError("กรุณาระบุชื่อองค์กรใหม่")
          return
        }
        if (formData.organizationType === "TEMPLE" && !formData.templeId) {
          setError("กรุณาระบุเลขวัด")
          return
        }
        if (
          ["NGO", "CHARITY", "FOUNDATION", "GOVERNMENT"].includes(formData.organizationType) &&
          !formData.registrationNumber
        ) {
          setError("กรุณาระบุเลขนิติบุคคล")
          return
        }
        // Validate templeId (ตัวเลขเท่านั้น)
        if (formData.templeId && !/^\d+$/.test(formData.templeId)) {
          setError("เลขวัดต้องประกอบด้วยตัวเลขเท่านั้น")
          return
        }
        // Validate registrationNumber (ตัวอย่าง: 13 หลักสำหรับเลขนิติบุคคล)
        if (formData.registrationNumber && !/^\d{13}$/.test(formData.registrationNumber)) {
          setError("เลขนิติบุคคลต้องเป็นตัวเลข 13 หลัก")
          return
        }
        setCurrentStep("documents")
      } else {
        setCurrentStep("interests")
      }
    } else if (currentStep === "interests") {
      if (formData.interests.length === 0) {
        setError("แนะนำให้เลือกความสนใจอย่างน้อย 1 หมวดหมู่เพื่อประสบการณ์ที่ดีขึ้น")
      }
      await handleSendOTP()
    } else if (currentStep === "documents") {
      if (!formData.documents.idCard || !formData.documents.organizationCert) {
        setError("กรุณาแนบเอกสารทั้งบัตรประชาชนและหนังสือรับรององค์กร")
        return
      }
      await handleSendOTP()
    } else if (currentStep === "otp") {
      await handleVerifyOTP()
    }
  }

  const handleSendOTP = async () => {
    try {
      const { success, message } = await sendOTP(formData.email);
      if (success) {
        setOtpSent(true);
        setCurrentStep("otp");
        setError("");
      } else {
        setError(message || "ไม่สามารถส่ง OTP ได้ กรุณาลองใหม่");
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการส่ง OTP กรุณาลองใหม่");
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError("กรุณากรอกรหัส OTP 6 หลัก");
      return;
    }
    try {
      const { success, message } = await verifyOTP(formData.email, otpCode);
      if (!success) {
        setError(message || "รหัส OTP ไม่ถูกต้อง กรุณาตรวจสอบ");
        return;
      }
      const { success: registerSuccess, message: registerMessage } = await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        role: formData.role,
        organizationId: formData.organizationId === "other" ? undefined : formData.organizationId,
        newOrganizationName: formData.organizationId === "other" ? formData.newOrganizationName : undefined,
        organizationType: formData.organizationType,
        registrationNumber: formData.registrationNumber || undefined,
        templeId: formData.templeId || undefined,
        interests: formData.interests,
        documents: formData.documents,
      });
      if (registerSuccess) {
        setCurrentStep("success");
        setTimeout(() => {
          router.push("/profile");
        }, 3000);
      } else {
        setError(registerMessage || "สมัครสมาชิกไม่สำเร็จ");
      }
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการยืนยัน OTP หรือสมัครสมาชิก");
    }
  };

  const handleInputChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const handleInterestChange = (interestId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      interests: checked
        ? [...new Set([...prev.interests, interestId])]
        : prev.interests.filter((id) => id !== interestId),
    }))
  }

  const handleFileUpload = (type: "idCard" | "organizationCert", file: File | null) => {
    if (file && file.size > 5 * 1024 * 1024) {
      setError("ไฟล์ต้องมีขนาดไม่เกิน 5MB")
      return
    }
    if (file && !["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
      setError("ไฟล์ต้องเป็น PDF, JPG หรือ PNG เท่านั้น")
      return
    }
    setFormData({
      ...formData,
      documents: {
        ...formData.documents,
        [type]: file,
      },
    })
  }

  const handleBack = () => {
    if (currentStep === "interests") {
      setCurrentStep("info")
    } else if (currentStep === "documents") {
      setCurrentStep("info")
    } else if (currentStep === "otp") {
      if (formData.role === "ORGANIZER") {
        setCurrentStep("documents")
      } else {
        setCurrentStep("interests")
      }
    }
  }

  if (currentStep === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">สมัครสมาชิกสำเร็จ!</h2>
            <p className="text-gray-600 mb-4">
              {formData.role === "ORGANIZER" ? "บัญชีของคุณอยู่ระหว่างการตรวจสอบเอกสาร" : "ยินดีต้อนรับสู่ DonateSwipe"}
            </p>
            <p className="text-sm text-gray-500">กำลังนำคุณไปยังหน้าโปรไฟล์...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Button
            variant="ghost"
            onClick={() => (currentStep === "info" ? router.push("/login") : handleBack())}
            className="absolute top-4 left-4 hover:bg-pink-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับ
          </Button>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">💝 DonateSwipe</h1>
          <p className="text-gray-600">สร้างบัญชีเพื่อเริ่มช่วยเหลือผู้อื่น</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold text-gray-800">
              {currentStep === "info" && "ข้อมูลพื้นฐาน"}
              {currentStep === "interests" && "ความสนใจของคุณ"}
              {currentStep === "documents" && "แนบเอกสาร"}
              {currentStep === "otp" && "ยืนยันอีเมล"}
            </CardTitle>
            <div className="mt-4">
              <Progress value={getStepProgress()} className="h-2" />
              <p className="text-sm text-gray-500 mt-2">
                ขั้นตอนที่{" "}
                {formData.role === "ORGANIZER"
                  ? ["info", "documents", "otp"].indexOf(currentStep) + 1
                  : ["info", "interests", "otp"].indexOf(currentStep) + 1}{" "}
                จาก {formData.role === "ORGANIZER" ? "3" : "3"}
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-700">{error}</AlertDescription>
                </Alert>
              )}

              {currentStep === "info" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-gray-700">
                        ชื่อ *
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="firstName"
                          name="firstName"
                          type="text"
                          placeholder="ชื่อ"
                          value={formData.firstName}
                          onChange={(e) => handleInputChange(e.target.name, e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-gray-700">
                        นามสกุล *
                      </Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        type="text"
                        placeholder="นามสกุล"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange(e.target.name, e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700">
                      อีเมล *
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="กรอกอีเมลของคุณ"
                        value={formData.email}
                        onChange={(e) => handleInputChange(e.target.name, e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-gray-700">
                      เบอร์โทรศัพท์ *
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="081-234-5678"
                        value={formData.phone}
                        onChange={(e) => handleInputChange(e.target.name, e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-gray-700">
                      ประเภทบัญชี *
                    </Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value: "user" | "ORGANIZER") => {
                        setFormData({
                          ...formData,
                          role: value === "user" ? "DONOR" : "ORGANIZER",
                          organizationId: "",
                          newOrganizationName: "",
                          organizationType: "",
                          registrationNumber: "",
                          templeId: "",
                        })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกประเภทบัญชี" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">ผู้ใช้ทั่วไป</SelectItem>
                        <SelectItem value="ORGANIZER">ผู้จัดการองค์กร</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.role === "ORGANIZER" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="organizationId" className="text-gray-700">
                          ชื่อองค์กร *
                        </Label>
                        <Combobox
                          options={[
                            ...organizations.map((org) => ({
                              value: org.id,
                              label: `${org.name} (${org.type})`,
                            })),
                            { value: "other", label: "อื่นๆ (ระบุชื่อใหม่)" },
                          ]}
                          value={formData.organizationId}
                          onChange={(value) => {
                            setFormData({
                              ...formData,
                              organizationId: value,
                              newOrganizationName: value === "other" ? formData.newOrganizationName : "",
                            })
                          }}
                          placeholder={isLoadingOrganizations ? "กำลังโหลดองค์กร..." : "ค้นหาหรือเลือกองค์กร..."}
                          disabled={isLoadingOrganizations}
                        />
                      </div>

                      {formData.organizationId === "other" && (
                        <div className="space-y-2">
                          <Label htmlFor="newOrganizationName" className="text-gray-700">
                            ระบุชื่อองค์กรใหม่ *
                          </Label>
                          <Input
                            id="newOrganizationName"
                            name="newOrganizationName"
                            type="text"
                            placeholder="เช่น มูลนิธิบ้านน้ำใจ"
                            value={formData.newOrganizationName}
                            onChange={(e) => handleInputChange(e.target.name, e.target.value)}
                            required
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="organizationType" className="text-gray-700">
                          ประเภทองค์กร *
                        </Label>
                        <Select
                          value={formData.organizationType}
                          onValueChange={(value) => {
                            setFormData({
                              ...formData,
                              organizationType: value,
                              registrationNumber: "",
                              templeId: "",
                            })
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="เลือกประเภทองค์กร" />
                          </SelectTrigger>
                          <SelectContent>
                            {organizationTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center gap-2">
                                  <span>{type.icon}</span>
                                  <span>{type.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.organizationType && formData.organizationType !== "TEMPLE" && (
                        <div className="space-y-2">
                          <Label htmlFor="registrationNumber" className="text-gray-700">
                            เลขนิติบุคคล {formData.organizationType !== "OTHER" ? "*" : "(ถ้ามี)"}
                          </Label>
                          <Input
                            id="registrationNumber"
                            name="registrationNumber"
                            type="text"
                            placeholder="เช่น 0123456789012"
                            value={formData.registrationNumber}
                            onChange={(e) => handleInputChange(e.target.name, e.target.value)}
                            required={formData.organizationType !== "OTHER"}
                          />
                        </div>
                      )}

                      {formData.organizationType === "TEMPLE" && (
                        <div className="space-y-2">
                          <Label htmlFor="templeId" className="text-gray-700">
                            เลขวัด *
                          </Label>
                          <Input
                            id="templeId"
                            name="templeId"
                            type="text"
                            placeholder="เช่น 123456"
                            value={formData.templeId}
                            onChange={(e) => handleInputChange(e.target.name, e.target.value)}
                            required
                          />
                        </div>
                      )}
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-700">
                      รหัสผ่าน *
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="สร้างรหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
                        value={formData.password}
                        onChange={(e) => handleInputChange(e.target.name, e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-gray-700">
                      ยืนยันรหัสผ่าน *
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="ยืนยันรหัสผ่าน"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange(e.target.name, e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {currentStep === "interests" && (
                <>
                  <div className="space-y-4">
                    <div className="bg-pink-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Heart className="w-5 h-5 text-pink-600" />
                        <h4 className="font-medium text-pink-800">เลือกความสนใจของคุณ</h4>
                      </div>
                      <p className="text-sm text-pink-700">
                        เลือกหมวดหมู่ที่คุณสนใจเพื่อให้เราแนะนำการบริจาคที่เหมาะสมกับคุณ
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                      {generalInterests.map((interest) => (
                        <label
                          key={interest.id}
                          htmlFor={interest.id}
                          className={`block border rounded-lg p-4 cursor-pointer transition-all ${formData.interests.includes(interest.id)
                            ? "border-pink-300 bg-pink-50"
                            : "border-gray-200 hover:border-pink-200 hover:bg-pink-50"
                            }`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id={interest.id}
                              checked={formData.interests.includes(interest.id)}
                              onCheckedChange={(checked) => handleInterestChange(interest.id, !!checked)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{interest.icon}</span>
                                <h5 className="font-medium text-gray-800">{interest.label}</h5>
                              </div>
                              <p className="text-sm text-gray-600">{interest.description}</p>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-700">
                        💡 <strong>เลือกแล้ว {formData.interests.length} หมวดหมู่</strong>
                        {formData.interests.length > 0 && " - คุณสามารถเปลี่ยนแปลงได้ในภายหลัง"}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {currentStep === "documents" && (
                <>
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-800 mb-2">📋 เอกสารที่ต้องแนบ</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• สำเนาบัตรประจำตัวประชาชน</li>
                        <li>• หนังสือรับรองการจดทะเบียนองค์กร</li>
                        <li>• ไฟล์ต้องเป็น PDF, JPG หรือ PNG ขนาดไม่เกิน 5MB</li>
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-700">สำเนาบัตรประจำตัวประชาชน *</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileUpload("idCard", e.target.files?.[0] || null)}
                          className="hidden"
                          id="idCard"
                        />
                        <label htmlFor="idCard" className="cursor-pointer">
                          <div className="text-center">
                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">
                              {formData.documents.idCard ? formData.documents.idCard.name : "คลิกเพื่อเลือกไฟล์"}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (ไม่เกิน 5MB)</p>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-700">หนังสือรับรององค์กร *</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileUpload("organizationCert", e.target.files?.[0] || null)}
                          className="hidden"
                          id="organizationCert"
                        />
                        <label htmlFor="organizationCert" className="cursor-pointer">
                          <div className="text-center">
                            <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">
                              {formData.documents.organizationCert
                                ? formData.documents.organizationCert.name
                                : "คลิกเพื่อเลือกไฟล์"}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (ไม่เกิน 5MB)</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {currentStep === "otp" && (
                <>
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                      <Mail className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">ยืนยันอีเมลของคุณ</h3>
                      <p className="text-sm text-gray-600 mt-1">เราได้ส่งรหัส OTP 6 หลักไปยัง</p>
                      <p className="text-sm font-medium text-gray-800">{formData.email}</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="otp" className="text-gray-700">
                        รหัส OTP *
                      </Label>
                      <Input
                        id="otp"
                        type="text"
                        placeholder="กรอกรหัส 6 หลัก"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="text-center text-lg tracking-widest"
                        maxLength={6}
                        required
                      />
                    </div>

                    <Button
                      type="button"
                      variant="link"
                      onClick={handleSendOTP}
                      className="text-pink-600 hover:text-pink-700"
                      disabled={isLoading}
                    >
                      ส่งรหัสใหม่
                    </Button>
                  </div>
                </>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    กำลังดำเนินการ...
                  </>
                ) : (
                  <>
                    {currentStep === "info" && (formData.role === "ORGANIZER" ? "ถัดไป" : "ถัดไป")}
                    {currentStep === "interests" && "ส่ง OTP"}
                    {currentStep === "documents" && "ส่ง OTP"}
                    {currentStep === "otp" && "ยืนยันและสมัครสมาชิก"}
                  </>
                )}
              </Button>
            </form>

            {currentStep === "info" && (
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  มีบัญชีอยู่แล้ว?{" "}
                  <Button
                    variant="link"
                    onClick={() => router.push("/login")}
                    className="p-0 h-auto text-pink-600 hover:text-pink-700"
                  >
                    เข้าสู่ระบบ
                  </Button>
                </p>
              </div>
            )}

            {currentStep === "interests" && (
              <div className="text-center">
                <p className="text-xs text-gray-500">💡 คุณสามารถข้ามขั้นตอนนี้และเลือกความสนใจในภายหลังได้</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}