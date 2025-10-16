"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  Share2,
  MapPin,
  Phone,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  Play,
  Eye,
  ThumbsUp,
  Package,
  HandHeart,
  DollarSign,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ShareModal from "@/components/share-modal";
import DonationModal from "@/components/donation-modal";
import ItemsDonationModal from "@/components/items-donation-modal";
import VolunteerModal from "@/components/volunteer-modal";

interface DonationDetailProps {
  params: { id: string };
}

interface PaymentMethods {
  promptpay: string;
  bankAccount: {
    bank: string;
    accountNumber: string;
    accountName: string;
  };
  truewallet: string;
}

interface Story {
  id: string;
  title: string;
  content: string;
  type: "progress" | "milestone" | "thanks" | "completed";
  imageUrl?: string;
  createdAt: string;
  views: number;
  likes: number;
  isViewed: boolean;
}

interface DonationData {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  organizationType: string;
  donationTypes: string[];
  goals: {
    money?: { target: number; current: number; supporters: number };
    items?: { description: string; received: string[]; supporters: number };
    volunteer?: { target: number; current: number; description: string; supporters: number };
  };
  daysLeft: number;
  address: string;
  contactPhone: string;
  organizer: { name: string; organization: string; avatar: string; verified: boolean };
  createdDate: string;
  tags: string[];
  paymentMethods: PaymentMethods;
  updates: { id: string; title: string; content: string; date: string; images: string[] }[];
  donationHistory: {
    id: string;
    donor: string;
    amount?: number;
    items?: string;
    volunteer?: string;
    date: string;
    message: string;
    type: "money" | "items" | "volunteer";
  }[];
}

export default function DonationDetail({ params }: DonationDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("details");
  const [isFavorited, setIsFavorited] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [showItemsDonationModal, setShowItemsDonationModal] = useState(false);
  const [showVolunteerModal, setShowVolunteerModal] = useState(false);
  const [showAllStories, setShowAllStories] = useState(false);
  const [donation, setDonation] = useState<DonationData | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDonation() {
      try {
        setLoading(true);
        const response = await fetch(`/api/donation/${params.id}`);
        if (!response.ok) {
          throw new Error(response.status === 404 ? "Donation not found" : "Failed to fetch donation");
        }
        const data = await response.json();

        const safeParse = (value: any, defaultValue: any) => {
          try {
            return value ? JSON.parse(value) : defaultValue;
          } catch (error) {
            console.warn("JSON parse error:", error);
            return defaultValue;
          }
        };

        const donationData: DonationData = {
          id: data.id || "",
          title: data.title || "ไม่มีชื่อ",
          description: data.description || "",
          imageUrl: safeParse(data.images, ["/placeholder.svg"])[0] || "/placeholder.svg",
          category: data.category?.name || "ไม่ระบุ",
          organizationType: data.organization?.type || "ชุมชน",
          donationTypes: [
            ...(data.acceptsMoney ? ["money"] : []),
            ...(data.acceptsItems ? ["items"] : []),
            ...(data.acceptsVolunteer ? ["volunteer"] : []),
          ],
          goals: {
            money: data.acceptsMoney
              ? {
                target: Number(data.targetAmount) || 0,
                current: Number(data.currentAmount) || 0,
                supporters: data.supporters || 0,
              }
              : undefined,
            items: data.acceptsItems
              ? {
                description: data.itemDetails || "",
                received: data.donations
                  ?.filter((d: any) => d.type === "ITEMS")
                  .map((d: any) => d.itemDetails || "") || [],
                supporters: data.donations?.filter((d: any) => d.type === "ITEMS").length || 0,
              }
              : undefined,
            volunteer: data.acceptsVolunteer
              ? {
                target: data.volunteersNeeded || 0,
                current: data.volunteersReceived || 0,
                description: data.volunteerDetails || "",
                supporters: data.volunteerApplications?.length || 0,
              }
              : undefined,
          },
          daysLeft: data.expiresAt
            ? Math.max(0, Math.ceil((new Date(data.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : 0,
          address: data.location || "ไม่ระบุ",
          contactPhone: data.organizer?.phone || "ไม่ระบุ",
          organizer: {
            name: `${data.organizer?.firstName || ""} ${data.organizer?.lastName || ""}`.trim() || "ผู้จัด",
            organization: data.organization?.name || "ชุมชน",
            avatar: data.organizer?.avatar || "/placeholder.svg",
            verified: data.organizer?.documentsVerified || false,
          },
          createdDate: data.createdAt || new Date().toISOString(),
          tags: data.itemDetails?.split(",").map((s: string) => s.trim()) || [],
          paymentMethods: safeParse(data.paymentMethods, {}),
          updates: data.stories?.map((story: any) => ({
            id: story.id || "",
            title: story.title || "",
            content: story.content || "",
            date: story.createdAt || new Date().toISOString(),
            images: safeParse(story.images, []),
          })) || [],
          donationHistory: [
            ...(data.donations?.map((d: any) => ({
              id: d.id || "",
              donor: `${d.donor?.firstName || "ผู้บริจาค"} ${d.donor?.lastName || "ไม่ประสงค์ออกนาม"}`.trim(),
              amount: d.type === "MONEY" ? Number(d.amount) || 0 : undefined,
              items: d.type === "ITEMS" ? d.itemDetails : undefined,
              volunteer: d.type === "VOLUNTEER" ? d.itemDetails : undefined,
              date: d.createdAt || new Date().toISOString(),
              message: d.itemDetails || "",
              type: d.type.toLowerCase() as "money" | "items" | "volunteer",
            })) || []),
            ...(data.volunteerApplications?.map((v: any) => ({
              id: v.id || "",
              donor: `${v.volunteer?.firstName || "อาสาสมัคร"} ${v.volunteer?.lastName || "ไม่ประสงค์ออกนาม"}`.trim(),
              amount: undefined,
              items: undefined,
              volunteer: v.message,
              date: v.createdAt || new Date().toISOString(),
              message: v.message || "",
              type: "volunteer" as "money" | "items" | "volunteer",
            })) || []),
          ],
        };

        const mappedStories: Story[] = data.stories?.map((story: any) => ({
          id: story.id || "",
          title: story.title || "",
          content: story.content || "",
          type: story.status?.toLowerCase() as "progress" | "milestone" | "thanks" | "completed",
          imageUrl: safeParse(story.images, [])[0],
          createdAt: story.createdAt || new Date().toISOString(),
          views: story.views || 0,
          likes: 0,
          isViewed: story.views > 0,
        })) || [];

        setDonation(donationData);
        setStories(mappedStories);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchDonation();
  }, [params.id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">กำลังโหลด...</div>;
  }

  if (error || !donation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">{error || "ไม่พบข้อมูลการบริจาค"}</div>
      </div>
    );
  }

  const moneyProgressPercentage = donation.goals.money
    ? (donation.goals.money.current / donation.goals.money.target) * 100
    : 0;
  const volunteerProgressPercentage = donation.goals.volunteer
    ? (donation.goals.volunteer.current / donation.goals.volunteer.target) * 100
    : 0;

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("th-TH").format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return "เมื่อสักครู่";
    if (diffInHours < 24) return `${diffInHours} ชั่วโมงที่แล้ว`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} วันที่แล้ว`;
    return formatDate(dateString);
  };

  const getStoryTypeColor = (type: string) => {
    const colors = {
      progress: "bg-blue-100 text-blue-700",
      milestone: "bg-green-100 text-green-700",
      thanks: "bg-pink-100 text-pink-700",
      completed: "bg-purple-100 text-purple-700",
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-700";
  };

  const getStoryTypeText = (type: string) => {
    const texts = {
      progress: "ความคืบหน้า",
      milestone: "เหตุการณ์สำคัญ",
      thanks: "ขอบคุณ",
      completed: "เสร็จสิ้น",
    };
    return texts[type as keyof typeof texts] || type;
  };

  const getDonationTypeIcon = (type: string) => {
    const icons = {
      money: DollarSign,
      items: Package,
      volunteer: HandHeart,
    };
    return icons[type as keyof typeof icons] || DollarSign;
  };

  const getDonationTypeLabel = (type: string) => {
    const labels = {
      money: "เงิน",
      items: "สิ่งของ",
      volunteer: "อาสาสมัคร",
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getDonationTypeColor = (type: string) => {
    const colors = {
      money: "bg-green-100 text-green-700 border-green-200",
      items: "bg-blue-100 text-blue-700 border-blue-200",
      volunteer: "bg-purple-100 text-purple-700 border-purple-200",
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  const unviewedStories = stories.filter((story) => !story.isViewed);
  const displayedStories = showAllStories ? stories : stories.slice(0, 3);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => router.back()} className="hover:bg-pink-50">
                <ArrowLeft className="w-4 h-4 mr-2" />
                กลับ
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFavorited(!isFavorited)}
                  className={`hover:bg-pink-50 ${isFavorited ? "text-pink-600" : "text-gray-600"}`}
                >
                  <Heart className={`w-4 h-4 ${isFavorited ? "fill-current" : ""}`} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowShareModal(true)} className="hover:bg-pink-50">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-4">
          {/* Hero Card */}
          <Card className="mb-6 overflow-hidden">
            {/* ... Card Content ... */}
            <div className="aspect-video relative">
              <img
                src={donation.imageUrl}
                alt={donation.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 flex gap-2">
                <Badge className="bg-white/90 text-gray-800 hover:bg-white">{donation.category}</Badge>
                <Badge variant="outline" className="bg-white/90 text-gray-800 hover:bg-white">
                  {donation.organizationType}
                </Badge>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800 mb-2">{donation.title}</h1>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>สร้างเมื่อ {formatDate(donation.createdDate)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>เหลือ {donation.daysLeft} วัน</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium text-gray-800">ประเภทการบริจาค</h3>
                  <div className="flex flex-wrap gap-2">
                    {donation.donationTypes.map((type) => {
                      const Icon = getDonationTypeIcon(type);
                      return (
                        <Badge key={type} className={`${getDonationTypeColor(type)} border`}>
                          <Icon className="w-3 h-3 mr-1" />
                          {getDonationTypeLabel(type)}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  {donation.goals.money && (
                    <div className="space-y-3 p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        <h4 className="font-medium text-green-800">เป้าหมายเงิน</h4>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-bold text-green-600">
                          ฿{formatAmount(donation.goals.money.current)}
                        </span>
                        <span className="text-sm text-gray-600">
                          เป้าหมาย ฿{formatAmount(donation.goals.money.target)}
                        </span>
                      </div>
                      <Progress value={moneyProgressPercentage} className="h-3" />
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{Math.round(moneyProgressPercentage)}% ของเป้าหมาย</span>
                        <span>{donation.goals.money.supporters} ผู้สนับสนุน</span>
                      </div>
                    </div>
                  )}

                  {donation.goals.items && (
                    <div className="space-y-3 p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-600" />
                        <h4 className="font-medium text-blue-800">สิ่งของที่ต้องการ</h4>
                      </div>
                      <p className="text-sm text-gray-700">{donation.goals.items.description}</p>
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-blue-800">ได้รับแล้ว:</h5>
                        <ul className="text-sm text-gray-700 space-y-1">
                          {donation.goals.items.received.map((item, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="text-sm text-gray-600">{donation.goals.items.supporters} ผู้บริจาคสิ่งของ</div>
                    </div>
                  )}

                  {donation.goals.volunteer && (
                    <div className="space-y-3 p-4 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <HandHeart className="w-5 h-5 text-purple-600" />
                        <h4 className="font-medium text-purple-800">อาสาสมัคร</h4>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-bold text-purple-600">{donation.goals.volunteer.current} คน</span>
                        <span className="text-sm text-gray-600">เป้าหมาย {donation.goals.volunteer.target} คน</span>
                      </div>
                      <Progress value={volunteerProgressPercentage} className="h-3" />
                      <p className="text-sm text-gray-700">{donation.goals.volunteer.description}</p>
                      <div className="text-sm text-gray-600">{Math.round(volunteerProgressPercentage)}% ของเป้าหมาย</div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={donation.organizer.avatar} />
                    <AvatarFallback>{donation.organizer.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{donation.organizer.name}</span>
                      {donation.organizer.verified && <CheckCircle className="w-4 h-4 text-green-500" />}
                    </div>
                    <p className="text-sm text-gray-600">{donation.organizer.organization}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {donation.donationTypes.includes("money") && (
                    <Button
                      className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                      onClick={() => setShowDonationModal(true)}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      บริจาคเงิน
                    </Button>
                  )}
                  {donation.donationTypes.includes("items") && (
                    <Button
                      className="bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600"
                      onClick={() => setShowItemsDonationModal(true)}
                    >
                      <Package className="w-4 h-4 mr-2" />
                      บริจาคสิ่งของ
                    </Button>
                  )}
                  {donation.donationTypes.includes("volunteer") && (
                    <Button variant="outline" className="bg-transparent" onClick={() => setShowVolunteerModal(true)}>
                      <HandHeart className="w-4 h-4 mr-2" />
                      สมัครอาสาสมัคร
                    </Button>
                  )}
                  {!donation.donationTypes.length && (
                    <Button variant="outline" className="bg-transparent col-span-2">
                      <Phone className="w-4 h-4 mr-2" />
                      ติดต่อผู้จัดการ
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white">
            <TabsTrigger value="details">รายละเอียด</TabsTrigger>
            <TabsTrigger value="history">ประวัติการบริจาค</TabsTrigger>
            <TabsTrigger value="updates">อัปเดตจากผู้รับบริจาค</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>รายละเอียด</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{donation.description}</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {donation.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="bg-pink-100 text-pink-700">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-pink-500" />
                  ที่ตั้งและการติดต่อ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{donation.address}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{donation.contactPhone}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📖 Stories ความคืบหน้า
                  {unviewedStories.length > 0 && (
                    <Badge className="bg-pink-500 text-white text-xs">{unviewedStories.length} ใหม่</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg">
                  <div className="relative">
                    <Avatar className="w-16 h-16 ring-2 ring-pink-300">
                      <AvatarImage src={donation.organizer.avatar} />
                      <AvatarFallback>{donation.organizer.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {unviewedStories.length > 0 && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-bold">{unviewedStories.length}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{donation.organizer.name}</h4>
                    <p className="text-sm text-gray-600">
                      {unviewedStories.length > 0 ? `มี Stories ใหม่ ${unviewedStories.length} เรื่อง` : "ดู Stories ทั้งหมด"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                    onClick={() => router.push(`/stories?donation=${donation.id}`)}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    ดู Stories
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {stories.slice(0, 3).map((story) => (
                    <div
                      key={story.id}
                      className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => router.push(`/stories?donation=${donation.id}&story=${story.id}`)}
                    >
                      {story.imageUrl ? (
                        <img
                          src={story.imageUrl}
                          alt={story.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100">
                          <span className="text-2xl">📖</span>
                        </div>
                      )}
                      {!story.isViewed && (
                        <div className="absolute top-2 right-2 w-3 h-3 bg-pink-500 rounded-full"></div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <Badge className={`${getStoryTypeColor(story.type)} text-xs`}>
                          {getStoryTypeText(story.type)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <h5 className="font-medium text-gray-800">Stories ล่าสุด</h5>
                  {displayedStories.map((story) => (
                    <div
                      key={story.id}
                      className="flex gap-3 p-3 bg-white rounded-lg border hover:shadow-sm transition-shadow cursor-pointer"
                      onClick={() => router.push(`/stories?donation=${donation.id}&story=${story.id}`)}
                    >
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center">
                        {story.imageUrl ? (
                          <img
                            src={story.imageUrl}
                            alt={story.title}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <span className="text-lg">📖</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h6 className="font-medium text-gray-800 truncate">{story.title}</h6>
                          <Badge className={`${getStoryTypeColor(story.type)} text-xs flex-shrink-0`}>
                            {getStoryTypeText(story.type)}
                          </Badge>
                          {!story.isViewed && <div className="w-2 h-2 bg-pink-500 rounded-full flex-shrink-0"></div>}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">{story.content}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{getRelativeTime(story.createdAt)}</span>
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            <span>{story.views}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" />
                            <span>{story.likes}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {stories.length > 3 && (
                  <Button
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={() => setShowAllStories(!showAllStories)}
                  >
                    {showAllStories ? "แสดงน้อยลง" : `ดู Stories ทั้งหมด (${stories.length})`}
                  </Button>
                )}

                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-800">{stories.length}</div>
                    <div className="text-xs text-gray-600">Stories ทั้งหมด</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-800">
                      {stories.reduce((sum, story) => sum + story.views, 0)}
                    </div>
                    <div className="text-xs text-gray-600">การดูรวม</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-800">
                      {stories.reduce((sum, story) => sum + story.likes, 0)}
                    </div>
                    <div className="text-xs text-gray-600">ถูกใจรวม</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  ประวัติการบริจาค ({donation.donationHistory.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {donation.donationHistory.map((history) => (
                    <div key={history.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback>{history.donor.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-800">{history.donor}</span>
                          <div className="flex items-center gap-2">
                            {history.type === "money" && history.amount && (
                              <span className="font-bold text-green-600">฿{formatAmount(history.amount)}</span>
                            )}
                            {history.type === "items" && history.items && (
                              <span className="font-bold text-blue-600">{history.items}</span>
                            )}
                            {history.type === "volunteer" && history.volunteer && (
                              <span className="font-bold text-purple-600">{history.volunteer}</span>
                            )}
                            <Badge className={getDonationTypeColor(history.type)}>
                              {getDonationTypeLabel(history.type)}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{formatDate(history.date)}</p>
                        {history.message && <p className="text-sm text-gray-700 italic">"{history.message}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="updates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-500" />
                  อัปเดตล่าสุด ({donation.updates.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {donation.updates.map((update) => (
                    <div key={update.id} className="border-l-4 border-purple-200 pl-4 space-y-2">
                      <p className="text-xs text-gray-500">{formatDate(update.date)}</p>
                      <h4 className="font-semibold text-gray-800 text-lg">{update.title}</h4>
                      <p className="text-gray-700">{update.content}</p>
                      {update.images.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          {update.images.map((img, index) => (
                            <img
                              key={index}
                              src={img}
                              alt={`Update image ${index + 1}`}
                              className="w-full h-auto object-cover rounded-lg"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals (ควรอยู่ด้านล่างสุดของ Fragment) */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        donation={{
          id: donation.id,
          title: donation.title,
          description: donation.description,
          imageUrl: donation.imageUrl,
          currentAmount: donation.goals.money?.current || 0,
          goalAmount: donation.goals.money?.target || 0,
          supporters:
            donation.goals.money?.supporters ||
            donation.goals.items?.supporters ||
            donation.goals.volunteer?.supporters ||
            0,
          organizer: donation.organizer.organization,
        }}
      />
      <DonationModal
        isOpen={showDonationModal}
        onClose={() => setShowDonationModal(false)}
        donation={{
          id: donation.id,
          title: donation.title,
          paymentMethods: donation.paymentMethods
        }}
      />
      <ItemsDonationModal
        isOpen={showItemsDonationModal}
        onClose={() => setShowItemsDonationModal(false)}
        donation={{
          id: donation.id,
          title: donation.title,
          itemsNeeded: donation.goals.items?.description || "",
          contactPhone: donation.contactPhone,
          address: donation.address
        }}
      />
      <VolunteerModal
        isOpen={showVolunteerModal}
        onClose={() => setShowVolunteerModal(false)}
        donation={{
          id: donation.id,
          title: donation.title,
          volunteerDescription: donation.goals.volunteer?.description || "",
          contactPhone: donation.contactPhone,
          address: donation.address
        }}
      />
    </> // 💡 ปิด React Fragment
  );
}
