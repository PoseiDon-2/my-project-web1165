"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import NextImage from "next/image"
import {
  ArrowLeft,
  DollarSign,
  Users,
  Tag,
  Info,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  Phone,
  Truck,
  MapPin,
  Hourglass,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/components/auth-context"

interface DonationRequestDetailProps {
  params: {
    id: string
  }
}

interface DonationRecord {
  id: string
  donorName: string
  donorPhone: string
  donorEmail?: string
  isAnonymous: boolean
  itemDetails: {
    description: string
    quantity: string
    condition: string
    deliveryMethod: "send-to-address" | "drop-off"
    trackingNumber?: string
  }
  donationDate: string
  status: "PENDING" | "COMPLETED" | "CANCELLED" | "REFUNDED"
}

interface DonationRequest {
  id: string
  title: string
  description: string
  category: string
  targetAmount: number
  currentAmount: number
  supporters: number
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" | "CANCELLED"
  createdDate: string
  daysLeft: number
  donationType?: "MONEY" | "ITEMS" | "VOLUNTEER"
  itemDetails?: {
    type: string
    condition: string
    quantity: number
    images: string[]
    deliveryAddress?: string
    deliveryContact?: string
  }
  donations?: DonationRecord[]
  volunteerDetails?: {
    skillsNeeded: string[]
    address: string
    contact: string
  }
  organizer: {
    id: string
    phone?: string | null
    organizationName?: string | null
    firstName?: string | null
    lastName?: string | null
  }
  images?: string[] | null // เพิ่มฟิลด์ images
}

// Component สำหรับจัดการรูปภาพที่มี fallback
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
      onError={() => setError(true)}
    />
  );
};

export default function RequestDetail({ params }: DonationRequestDetailProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [currentRequest, setCurrentRequest] = useState<DonationRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRequest = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem("token")
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
        const response = await fetch(`/api/donation-requests/${params.id}`, { headers })
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to fetch donation request")
        }
        const data = await response.json()
        console.log("RequestDetail data:", data) // Debug response
        setCurrentRequest(data)
      } catch (err: any) {
        console.error("Fetch error:", err)
        setError("ไม่สามารถโหลดข้อมูลคำขอได้ กรุณาลองใหม่")
      } finally {
        setLoading(false)
      }
    }
    fetchRequest()
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">กำลังโหลด...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !currentRequest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">ไม่พบคำขอ</h2>
            <p className="text-gray-600 mb-4">{error || "ไม่พบข้อมูลคำขอบริจาคที่คุณกำลังมองหา"}</p>
            <Button onClick={() => router.push("/organizer-dashboard")} className="bg-pink-500 hover:bg-pink-600">
              กลับแดชบอร์ด
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isOrganizer = user?.id === currentRequest.organizer.id
  const isAdmin = user?.role === "ADMIN"

  if (!user || (!isOrganizer && !isAdmin)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
            <p className="text-gray-600 mb-4">คุณไม่มีสิทธิ์ในการดูรายละเอียดคำขอบริจาคนี้</p>
            <Button onClick={() => router.push("/")} className="bg-pink-500 hover:bg-pink-600">
              กลับหน้าหลัก
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("th-TH").format(amount)
  }

  const getStatusColor = (status: string) => {
    const colors = {
      DRAFT: "bg-gray-100 text-gray-700",
      PENDING: "bg-yellow-100 text-yellow-700",
      APPROVED: "bg-green-100 text-green-700",
      REJECTED: "bg-red-100 text-red-700",
      COMPLETED: "bg-blue-100 text-blue-700",
      CANCELLED: "bg-gray-100 text-gray-700",
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-700"
  }

  const getStatusText = (status: string) => {
    const texts = {
      DRAFT: "ร่าง",
      PENDING: "รอการอนุมัติ",
      APPROVED: "อนุมัติ",
      REJECTED: "ถูกปฏิเสธ",
      COMPLETED: "เสร็จสิ้น",
      CANCELLED: "ยกเลิก",
    }
    return texts[status as keyof typeof texts] || status
  }

  const getDeliveryMethodText = (method: "send-to-address" | "drop-off") => {
    const methods = {
      "send-to-address": "ส่งตามที่อยู่ (ผ่านขนส่ง)",
      "drop-off": "นำไปส่งถึงที่ (ด้วยตัวเอง)",
    }
    return methods[method]
  }

  const getDonationStatus = (status: DonationRecord["status"]) => {
    const statusConfig = {
      PENDING: { label: "รอดำเนินการ", color: "bg-yellow-100 text-yellow-700", icon: Hourglass },
      COMPLETED: { label: "ได้รับแล้ว", color: "bg-green-100 text-green-700", icon: CheckCircle },
      CANCELLED: { label: "ยกเลิก", color: "bg-red-100 text-red-700", icon: XCircle },
      REFUNDED: { label: "คืนเงิน", color: "bg-gray-100 text-gray-700", icon: XCircle },
    }
    return statusConfig[status] || statusConfig.PENDING
  }

  const handleUpdateDonationStatus = async (donationId: string, newStatus: DonationRecord["status"]) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/donations/${donationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update donation status")
      }
      setCurrentRequest((prevRequest) => {
        if (!prevRequest || !prevRequest.donations) return prevRequest
        return {
          ...prevRequest,
          donations: prevRequest.donations.map((donation) =>
            donation.id === donationId ? { ...donation, status: newStatus } : donation,
          ),
        }
      })
    } catch (err: any) {
      console.error("Update donation status error:", err)
      setError("ไม่สามารถอัปเดตสถานะการบริจาคได้")
    }
  }

  const handleUpdateRequestStatus = async (newStatus: "APPROVED" | "REJECTED" | "COMPLETED" | "CANCELLED") => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/donation-requests/${currentRequest.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update request status")
      }
      setCurrentRequest((prev) => (prev ? { ...prev, status: newStatus } : prev))
    } catch (err: any) {
      console.error("Update request status error:", err)
      setError("ไม่สามารถอัปเดตสถานะคำขอได้")
    }
  }

  const progressPercentage = currentRequest.targetAmount
    ? (currentRequest.currentAmount / currentRequest.targetAmount) * 100
    : 0

  // สร้างชื่อผู้สร้างสำหรับแสดงผล
  const organizerName = currentRequest.organizer.organizationName
    ? currentRequest.organizer.organizationName
    : (currentRequest.organizer.firstName && currentRequest.organizer.lastName)
      ? `${currentRequest.organizer.firstName} ${currentRequest.organizer.lastName}`
      : "ไม่ระบุชื่อผู้สร้าง"

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.back()} className="hover:bg-pink-50">
                <ArrowLeft className="w-4 h-4 mr-2" />
                กลับ
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">รายละเอียดคำขอ #{currentRequest.id}</h1>
                <p className="text-sm text-gray-600">ตรวจสอบข้อมูลคำขอบริจาค</p>
              </div>
            </div>
            <Badge className={getStatusColor(currentRequest.status)}>{getStatusText(currentRequest.status)}</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 text-red-800 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Organizer Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
              ข้อมูลผู้สร้างคำขอ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">ชื่อผู้สร้าง</label>
              <p className="text-gray-800">{organizerName}</p>
            </div>
            {(isOrganizer || isAdmin) && currentRequest.organizer.phone && (
              <div>
                <label className="text-sm font-medium text-gray-600">เบอร์ติดต่อ</label>
                <p className="text-gray-800">{currentRequest.organizer.phone}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Request Images */}
        {currentRequest.images && currentRequest.images.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-500" />
                รูปภาพของคำขอ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {currentRequest.images.map((img, index) => (
                  <ImageWithFallback
                    key={index}
                    src={img || "/placeholder.svg"}
                    alt={`Request image ${index + 1}`}
                    className="w-32 h-32 object-cover rounded-md border"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Request Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-pink-500" />
              ภาพรวมคำขอ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">ชื่อคำขอ</label>
              <h2 className="text-xl font-bold text-gray-800">{currentRequest.title}</h2>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">รายละเอียด</label>
              <p className="text-gray-800">{currentRequest.description}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">หมวดหมู่</label>
                <Badge variant="secondary" className="mt-1">
                  <Tag className="w-3 h-3 inline mr-1" />
                  {currentRequest.category}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">วันที่สร้าง</label>
                <p className="text-gray-800">{new Date(currentRequest.createdDate).toLocaleDateString("th-TH")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Donation Type Specific Details */}
        {currentRequest.donationType === "MONEY" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                รายละเอียดการระดมทุน (เงิน)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">ยอดเป้าหมาย</label>
                  <p className="text-xl font-bold text-green-600">฿{formatAmount(currentRequest.targetAmount)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">ยอดระดมทุนปัจจุบัน</label>
                  <p className="text-xl font-bold text-green-600">฿{formatAmount(currentRequest.currentAmount)}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">ความคืบหน้า</label>
                <Progress value={progressPercentage} className="h-3 mt-1" />
                <p className="text-sm text-gray-600 mt-1">
                  {Math.round(progressPercentage)}% ของเป้าหมาย ({currentRequest.supporters} ผู้สนับสนุน)
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">เหลือเวลา</label>
                <p className="text-gray-800">{currentRequest.daysLeft} วัน</p>
              </div>
            </CardContent>
          </Card>
        )}

        {currentRequest.donationType === "ITEMS" && currentRequest.itemDetails && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-500" />
                รายละเอียดการบริจาค (สิ่งของ)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">ประเภทสิ่งของที่ต้องการ</label>
                <p className="text-gray-800">{currentRequest.itemDetails.type}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">สภาพ</label>
                  <p className="text-gray-800">{currentRequest.itemDetails.condition}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">จำนวนที่ต้องการ</label>
                  <p className="text-gray-800">{currentRequest.itemDetails.quantity} ชิ้น/หน่วย</p>
                </div>
              </div>
              {currentRequest.itemDetails.deliveryAddress && (
                <div>
                  <label className="text-sm font-medium text-gray-600">ที่อยู่สำหรับส่งมอบ</label>
                  <p className="text-gray-800">{currentRequest.itemDetails.deliveryAddress}</p>
                </div>
              )}
              {currentRequest.itemDetails.deliveryContact && (
                <div>
                  <label className="text-sm font-medium text-gray-600">ผู้ติดต่อสำหรับการส่งมอบ</label>
                  <p className="text-gray-800">{currentRequest.itemDetails.deliveryContact}</p>
                </div>
              )}
              {currentRequest.itemDetails.images && currentRequest.itemDetails.images.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-600">รูปภาพตัวอย่างสิ่งของ</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {currentRequest.itemDetails.images.map((img, index) => (
                      <ImageWithFallback
                        key={index}
                        src={img || "/placeholder.svg"}
                        alt={`Item image ${index + 1}`}
                        className="w-24 h-24 object-cover rounded-md border"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Section for individual donations */}
              {currentRequest.donations && currentRequest.donations.length > 0 && (
                <div className="space-y-4 pt-4 border-t mt-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-600" />
                    สิ่งของที่ได้รับ ({currentRequest.donations.length} รายการ)
                  </h3>
                  <div className="grid gap-4">
                    {currentRequest.donations.map((donation) => {
                      const statusConfig = getDonationStatus(donation.status)
                      const StatusIcon = statusConfig.icon
                      return (
                        <Card key={donation.id} className="bg-purple-50 border-purple-200">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-purple-800">
                                {donation.isAnonymous ? "บริจาคแบบไม่ระบุชื่อ" : donation.donorName}
                              </h4>
                              <span className="text-xs text-gray-500">
                                {new Date(donation.donationDate).toLocaleDateString("th-TH")}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{donation.itemDetails.description}</p>
                            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Phone className="w-4 h-4" />
                                <span>{donation.isAnonymous ? "ไม่ระบุ" : donation.donorPhone}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                <span>{getDeliveryMethodText(donation.itemDetails.deliveryMethod)}</span>
                              </div>
                              {donation.itemDetails.trackingNumber && (
                                <div className="flex items-center gap-1 col-span-2">
                                  <Truck className="w-4 h-4" />
                                  <span>เลขพัสดุ: {donation.itemDetails.trackingNumber}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t mt-3">
                              <Badge className={statusConfig.color}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusConfig.label}
                              </Badge>
                              {(isOrganizer || isAdmin) && donation.status === "PENDING" && (
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-green-50 text-green-700 hover:bg-green-100"
                                    onClick={() => handleUpdateDonationStatus(donation.id, "COMPLETED")}
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    ได้รับแล้ว
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-red-50 text-red-700 hover:bg-red-100"
                                    onClick={() => handleUpdateDonationStatus(donation.id, "CANCELLED")}
                                  >
                                    <XCircle className="w-3 h-3 mr-1" />
                                    ยกเลิก
                                  </Button>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {currentRequest.donationType === "VOLUNTEER" && currentRequest.volunteerDetails && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                รายละเอียดการรับสมัคร (อาสาสมัคร)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">ทักษะที่ต้องการ</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {currentRequest.volunteerDetails.skillsNeeded.map((skill, index) => (
                    <Badge key={index} variant="outline" className="border-blue-200 text-blue-700">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">สถานที่ปฏิบัติงาน</label>
                <p className="text-gray-800">{currentRequest.volunteerDetails.address}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">ผู้ติดต่อ</label>
                <p className="text-gray-800">{currentRequest.volunteerDetails.contact}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {currentRequest.status === "PENDING" && isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>การจัดการคำขอ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full bg-green-500 hover:bg-green-600 text-white"
                onClick={() => handleUpdateRequestStatus("APPROVED")}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                อนุมัติคำขอ
              </Button>
              <Button
                variant="outline"
                className="w-full text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
                onClick={() => handleUpdateRequestStatus("REJECTED")}
              >
                <XCircle className="w-4 h-4 mr-2" />
                ปฏิเสธคำขอ
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}