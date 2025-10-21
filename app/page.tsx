// components/DonationSwipe.tsx
"use client";

import { useState, useEffect } from "react";
import { Heart, X, MapPin, Users, Calendar, Share2, ExternalLink, List, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import ShareModal from "../components/share-modal";
import { useAuth } from "../components/auth-context";
import StoryPreview from "../components/story-preview";

interface DonationRequest {
  id: string;
  title: string;
  description: string;
  category: { name: string };
  address: string | null;
  targetAmount: string | null;
  currentAmount: string;
  daysLeft?: number;
  supporters: number;
  images: string[] | null;
  organizer: { firstName: string | null; lastName: string | null };
  status: string;
  urgency: string | null;
  score?: number;
}

interface StoryGroup {
  donationRequestId: string;
  organizer: string;
  avatar: string;
  hasUnviewed: boolean;
  storyCount: number;
}

export default function DonationSwipe() {
  const [donationRequests, setDonationRequests] = useState<DonationRequest[]>([]);
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedRequests, setLikedRequests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [showShareModal, setShowShareModal] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (authLoading) {
        console.log('Auth is loading, skipping fetch');
        return;
      }

      try {
        setLoading(true);
        console.log('Fetching recommendations for user:', user?.id);
        let endpoint = "/api/donation-requests";
        if (user?.id) {
          endpoint = `/api/recommendations/donation-requests?userId=${user.id}`;
        }
        const donationResponse = await fetch(endpoint, {
          headers: { "Content-Type": "application/json" },
          cache: 'no-store',
        });
        console.log('Donation response status:', donationResponse.status);
        const donationText = await donationResponse.text();
        console.log('Donation response body:', donationText);
        const donationData = JSON.parse(donationText);
        if (!donationResponse.ok) throw new Error(donationData.error || "Failed to fetch donation requests");
        console.log('Donation data:', donationData);
        setDonationRequests(donationData);

        const storyResponse = await fetch("/api/stories/groups", {
          headers: { "Content-Type": "application/json" },
          cache: 'no-store',
        });
        console.log('Story response status:', storyResponse.status);
        const storyText = await storyResponse.text();
        console.log('Story response body:', storyText);
        const storyData = JSON.parse(storyText);
        if (!storyResponse.ok) throw new Error(storyData.error || "Failed to fetch stories");
        console.log('Story data:', storyData);
        setStoryGroups(storyData);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendations();
  }, [user, authLoading]);

  const handleViewDetails = async (requestId: string) => {
    if (user) {
      try {
        await fetch("/api/interactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            entityType: "DonationRequest",
            entityId: requestId,
            interactionType: "VIEW",
            interactionValue: 1,
          }),
        });
        console.log("VIEW interaction recorded for request:", requestId);
      } catch (err) {
        console.error("Failed to record VIEW:", err);
      }
    }
    router.push(`/donation/${requestId}`);
  };

  const handleSwipe = async (liked: boolean) => {
    const currentRequest = donationRequests[currentIndex];
    if (!currentRequest) return;

    try {
      if (user) {
        await fetch("/api/interactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            entityType: "DonationRequest",
            entityId: currentRequest.id,
            interactionType: liked ? "FAVORITE" : "SKIP",
            interactionValue: liked ? 2 : 0,
          }),
        });
        console.log(`${liked ? 'FAVORITE' : 'SKIP'} interaction recorded for request:`, currentRequest.id);
      }

      if (liked) {
        const updatedLikes = [...likedRequests, currentRequest.id];
        setLikedRequests(updatedLikes);
        localStorage.setItem("likedDonations", JSON.stringify(updatedLikes));
      }
    } catch (err) {
      console.error("Failed to record interaction:", err);
      setError("ไม่สามารถบันทึกการโต้ตอบได้");
    }

    if (currentIndex < donationRequests.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handleShare = async (platform: string) => {
    const currentRequest = donationRequests[currentIndex];
    if (!currentRequest || !user) return;

    try {
      await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          entityType: "DonationRequest",
          entityId: currentRequest.id,
          interactionType: "SHARE",
          interactionValue: 3,
        }),
      });
      console.log("SHARE interaction recorded for request:", currentRequest.id);
    } catch (err) {
      console.error("Failed to record SHARE:", err);
    }
  };

  const formatAmount = (amount: string | number) => {
    return new Intl.NumberFormat("th-TH").format(Number(amount));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500 mx-auto"></div>
          <p className="text-gray-600 mt-4">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!donationRequests.length || !donationRequests[currentIndex]) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-6 pt-4">
            <h1 className="text-2xl font-bold text-gray-800">💝 DonateSwipe</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/list")}
                className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200"
              >
                <List className="w-4 h-4 mr-1" />
                รายการ
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/favorites")}
                className="bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-200"
              >
                ❤️ {likedRequests.length} รายการ
              </Button>
              {user ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/profile")}
                  className="bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
                >
                  👤 {user.firstName}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/login")}
                  className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
                >
                  เข้าสู่ระบบ
                </Button>
              )}
            </div>
          </div>

          {storyGroups.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-800">📖 Stories</h2>
                <span className="text-sm text-gray-500">ความคืบหน้าล่าสุด</span>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {storyGroups.map((group) => (
                  <StoryPreview
                    key={group.donationRequestId}
                    donationRequestId={group.donationRequestId}
                    organizer={group.organizer}
                    avatar={group.avatar}
                    hasUnviewed={group.hasUnviewed}
                    storyCount={group.storyCount}
                    onClick={() => router.push(`/stories?group=${group.donationRequestId}&story=0`)}
                  />
                ))}
              </div>
            </div>
          )}

          <Card className="overflow-hidden shadow-2xl border-0 bg-white">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-800 text-center">
                สร้างการเปลี่ยนแปลงวันนี้!
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 text-center">
              <img
                src="/create-donation-placeholder.svg"
                alt="Create Donation Request"
                className="w-full h-48 object-cover rounded-md mb-4"
              />
              {user && (user.role === "ORGANIZER" || user.role === "ADMIN") ? (
                <>
                  <p className="text-gray-600 mb-4">
                    เริ่มต้นคำขอรับบริจาคเพื่อช่วยเหลือชุมชนของคุณ! แชร์เรื่องราวและความต้องการเพื่อให้ผู้สนับสนุนมาร่วมสร้างผลกระทบไปด้วยกัน
                  </p>
                  <Button
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                    onClick={() => router.push("/donation-request/create")}
                  >
                    สร้างคำขอรับบริจาค
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-gray-600 mb-4">
                    อยากเป็นส่วนหนึ่งของการเปลี่ยนแปลง? สมัครเป็นผู้จัดงานเพื่อสร้างคำขอรับบริจาคและช่วยเหลือชุมชน
                  </p>
                  <Button
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                    onClick={() => router.push("/register?role=ORGANIZER")}
                  >
                    สมัครเป็นผู้จัดงาน
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-center gap-6 mt-8">
            <Button
              size="lg"
              variant="outline"
              className="w-16 h-16 rounded-full border-2 border-gray-300 bg-gray-100 cursor-not-allowed"
              disabled
            >
              <X className="w-8 h-8 text-gray-400" />
            </Button>
            <Button
              size="lg"
              className="w-16 h-16 rounded-full bg-gray-100 cursor-not-allowed"
              disabled
            >
              <Heart className="w-8 h-8 text-gray-400" />
            </Button>
          </div>

          <div className="text-center mt-8 text-sm text-gray-500">
            <p>ไม่มีคำขอรับบริจาคในขณะนี้ อาจไม่มีคำขอที่ตรงกับเงื่อนไข ลองดูรายการทั้งหมดหรือสร้างคำขอใหม่!</p>
          </div>
        </div>
      </div>
    );
  }

  const currentRequest = donationRequests[currentIndex];
  const progressPercentage = currentRequest.targetAmount
    ? (Number(currentRequest.currentAmount) / Number(currentRequest.targetAmount)) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6 pt-4">
          <h1 className="text-2xl font-bold text-gray-800">💝 DonateSwipe</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/list")}
              className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200"
            >
              <List className="w-4 h-4 mr-1" />
              รายการ
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/favorites")}
              className="bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-200"
            >
              ❤️ {likedRequests.length} รายการ
            </Button>
            {user ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/profile")}
                className="bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
              >
                👤 {user.firstName}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/login")}
                className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
              >
                เข้าสู่ระบบ
              </Button>
            )}
          </div>
        </div>

        {storyGroups.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800">📖 Stories</h2>
              <span className="text-sm text-gray-500">ความคืบหน้าล่าสุด</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {storyGroups.map((group) => (
                <StoryPreview
                  key={group.donationRequestId}
                  donationRequestId={group.donationRequestId}
                  organizer={group.organizer}
                  avatar={group.avatar}
                  hasUnviewed={group.hasUnviewed}
                  storyCount={group.storyCount}
                  onClick={() => router.push(`/stories?group=${group.donationRequestId}&story=0`)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="relative">
          <Card className="overflow-hidden shadow-2xl border-0 bg-white">
            <div className="relative">
              <img
                src={currentRequest.images?.[0] || "/placeholder.svg"}
                alt={currentRequest.title}
                className="w-full h-64 object-cover"
              />
              <Badge className="absolute top-4 left-4 bg-white/90 text-gray-800 hover:bg-white/90">
                {currentRequest.category.name}
              </Badge>

              <Button
                variant="outline"
                className="absolute top-4 right-4 bg-white/90 text-gray-800 hover:bg-white"
                onClick={() => setShowQR(true)}
              >
                <QrCode className="w-5 h-5" />
              </Button>

              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">{currentRequest.title}</h2>
                    <p className="text-gray-600 text-sm leading-relaxed">{currentRequest.description}</p>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{currentRequest.address || "ไม่ระบุ"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{currentRequest.supporters} คน</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{currentRequest.daysLeft ?? "ไม่ระบุ"} วัน</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">ระดมทุนได้</span>
                      <span className="font-semibold text-gray-800">
                        ฿{formatAmount(currentRequest.currentAmount)} / ฿{formatAmount(currentRequest.targetAmount || 0)}
                      </span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                    <div className="text-right text-xs text-gray-500">{Math.round(progressPercentage)}% ของเป้าหมาย</div>
                  </div>

                  <div className="text-sm text-gray-600">
                    <span className="font-medium">ผู้จัดการ:</span>{" "}
                    {currentRequest.organizer
                      ? `${currentRequest.organizer.firstName ?? ""} ${currentRequest.organizer.lastName ?? ""}`
                      : "ไม่ระบุ"}
                  </div>

                  <Separator />

                  <Button
                    variant="outline"
                    className="w-full mt-2 border-pink-200 text-pink-600 hover:bg-pink-50 bg-transparent"
                    onClick={() => {
                      handleViewDetails(currentRequest.id);
                    }}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    ดูรายละเอียดเพิ่มเติม
                  </Button>
                </div>
              </CardContent>
            </div>
          </Card>

          <div className="flex justify-center gap-6 mt-8">
            <Button
              size="lg"
              variant="outline"
              className="w-16 h-16 rounded-full border-2 border-gray-300 hover:border-red-300 hover:bg-red-50 bg-transparent"
              onClick={() => handleSwipe(false)}
            >
              <X className="w-8 h-8 text-gray-400 hover:text-red-500" />
            </Button>

            <Button
              size="lg"
              className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 shadow-lg"
              onClick={() => handleSwipe(true)}
            >
              <Heart className="w-8 h-8 text-white" />
            </Button>
          </div>

          <div className="flex justify-center mt-6 gap-2">
            {donationRequests.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${index === currentIndex ? "bg-pink-500" : index < currentIndex ? "bg-pink-300" : "bg-gray-300"}`}
              />
            ))}
          </div>
        </div>

        <div className="text-center mt-8 text-sm text-gray-500">
          <p>กดปุ่ม ❤️ เพื่อสนับสนุน หรือ ✕ เพื่อข้าม</p>
        </div>
      </div>

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        donation={{
          id: currentRequest.id,
          title: currentRequest.title,
          description: currentRequest.description,
          imageUrl: currentRequest.images?.[0] || undefined,
          currentAmount: Number(currentRequest.currentAmount),
          goalAmount: Number(currentRequest.targetAmount || 0),
          supporters: currentRequest.supporters,
          organizer: currentRequest.organizer
            ? `${currentRequest.organizer.firstName ?? ""} ${currentRequest.organizer.lastName ?? ""}`
            : "ไม่ระบุ",
        }}
        initialShowQR={showQR}
      />
    </div>
  );
}