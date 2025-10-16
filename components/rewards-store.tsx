"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Coins, Crown, Palette, Award, Gift, Sparkles } from "lucide-react";
import type { UserPoints } from "@/types/rewards";
import { pointsSystem } from "@/lib/points-system";
import { useAuth } from "@/components/auth-context";
import { toast } from "@/components/ui/use-toast";

// กำหนด type RewardTemplate สำหรับ MOCK_REWARDS
interface RewardTemplate {
  id: string;
  name: string;
  description: string;
  category: "profile" | "badge" | "feature";
  pointsCost: number;
  image?: string;
  isActive: boolean;
  isLimited: boolean;
  limitQuantity?: number;
  remainingQuantity?: number;
  createdBy: string;
  createdAt: Date;
  requirements?: { minLevel: number };
}

const MOCK_REWARDS: RewardTemplate[] = [
  {
    id: "theme_gold",
    name: "ธีมทอง",
    description: "เปลี่ยนธีมโปรไฟล์เป็นสีทองหรูหรา",
    category: "profile",
    pointsCost: 500,
    image: "/placeholder-qnb7c.png",
    isActive: true,
    isLimited: false,
    createdBy: "system",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "theme_platinum",
    name: "ธีมแพลทินัม",
    description: "ธีมสีเงินแพลทินัมสุดพรีเมียม",
    category: "profile",
    pointsCost: 1000,
    image: "/placeholder-kzrrr.png",
    isActive: true,
    isLimited: false,
    createdBy: "system",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "theme_diamond",
    name: "ธีมเพชร",
    description: "ธีมเพชรสุดหรู สำหรับผู้บริจาคระดับตำนาน",
    category: "profile",
    pointsCost: 2500,
    image: "/placeholder-bdpu4.png",
    isActive: true,
    isLimited: true,
    limitQuantity: 100,
    remainingQuantity: 87,
    createdBy: "system",
    createdAt: new Date("2024-01-01"),
    requirements: { minLevel: 5 },
  },
  {
    id: "badge_heart",
    name: "ตราหัวใจทอง",
    description: "ตราสัญลักษณ์หัวใจทองคำ",
    category: "badge",
    pointsCost: 300,
    image: "/placeholder-a5wmf.png",
    isActive: true,
    isLimited: false,
    createdBy: "system",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "badge_crown",
    name: "มงกุฎแห่งความดี",
    description: "มงกุฎสำหรับผู้บริจาคชั้นสูง",
    category: "badge",
    pointsCost: 800,
    image: "/golden-crown-badge.png",
    isActive: true,
    isLimited: false,
    createdBy: "system",
    createdAt: new Date("2024-01-01"),
    requirements: { minLevel: 3 },
  },
  {
    id: "frame_rainbow",
    name: "กรอบสีรุ้ง",
    description: "กรอบโปรไฟล์สีรุ้งสวยงาม",
    category: "profile",
    pointsCost: 400,
    image: "/placeholder-xxg4t.png",
    isActive: true,
    isLimited: false,
    createdBy: "system",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "frame_fire",
    name: "กรอบเปลวไฟ",
    description: "กรอบเปลวไฟสำหรับผู้บริจาคที่ร้อนแรง",
    category: "profile",
    pointsCost: 600,
    image: "/placeholder-n8zrx.png",
    isActive: true,
    isLimited: false,
    createdBy: "system",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "feature_priority",
    name: "การแสดงผลพิเศษ",
    description: "คำขอบริจาคของคุณจะแสดงในลำดับต้นๆ",
    category: "feature",
    pointsCost: 1500,
    image: "/placeholder-4h2yn.png",
    isActive: true,
    isLimited: false,
    createdBy: "system",
    createdAt: new Date("2024-01-01"),
    requirements: { minLevel: 4 },
  },
];

export function RewardsStore() {
  const { user } = useAuth();
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null);
  const [selectedReward, setSelectedReward] = useState<RewardTemplate | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUserPoints = async () => {
    if (!user?.id) {
      setError("กรุณาเข้าสู่ระบบเพื่อดูร้านรางวัล");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const points = await pointsSystem.getUserPoints(user.id, user.token);
      setUserPoints(points);
      setError(null);
    } catch (error) {
      console.error("Failed to load user points:", error);
      setError("ไม่สามารถโหลดข้อมูลคะแนนได้");
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลคะแนนได้ กรุณาลองใหม่",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserPoints();
  }, [user]);

  const filteredRewards = MOCK_REWARDS.filter((reward) => {
    if (activeCategory === "all") return true;
    return reward.category === activeCategory;
  });

  const canPurchase = (reward: RewardTemplate): boolean => {
    if (!userPoints || userPoints.availablePoints === undefined || userPoints.level === undefined) return false;
    if (userPoints.availablePoints < reward.pointsCost) return false;
    if (reward.requirements?.minLevel && userPoints.level < reward.requirements.minLevel) return false;
    if (reward.isLimited && reward.remainingQuantity === 0) return false;
    return true;
  };

  const handlePurchase = (reward: RewardTemplate) => {
    setSelectedReward(reward);
    setShowConfirmDialog(true);
  };

  const confirmPurchase = async () => {
    if (!selectedReward || !user || !userPoints) {
      toast({
        title: "ข้อผิดพลาด",
        description: "ข้อมูลไม่ครบถ้วน กรุณาลองใหม่",
        variant: "destructive",
      });
      setShowConfirmDialog(false);
      setSelectedReward(null);
      return;
    }

    try {
      const success = await pointsSystem.spendPoints(
        user.id,
        selectedReward.pointsCost,
        "reward_purchase",
        `ซื้อ ${selectedReward.name}`,
        selectedReward.id,
      );

      if (success) {
        // บันทึกรางวัลลงฐานข้อมูล
        const response = await fetch(`/api/rewards/${user.id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(user.token && { Authorization: `Bearer ${user.token}` }),
          },
          body: JSON.stringify({
            rewardId: selectedReward.id,
            isActive: true,
            createdAt: new Date(),
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to save reward: ${response.statusText}`);
        }

        const updatedPoints = await pointsSystem.getUserPoints(user.id, user.token);
        setUserPoints(updatedPoints);
        toast({
          title: "ซื้อรางวัลสำเร็จ!",
          description: `คุณได้รับ ${selectedReward.name} แล้ว`,
        });
      } else {
        toast({
          title: "ซื้อรางวัลไม่สำเร็จ",
          description: "คะแนนไม่เพียงพอหรือเกิดข้อผิดพลาด",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error purchasing reward:", error);
      toast({
        title: "ข้อผิดพลาด",
        description: "เกิดข้อผิดพลาดขณะซื้อรางวัล กรุณาลองใหม่",
        variant: "destructive",
      });
    }

    setShowConfirmDialog(false);
    setSelectedReward(null);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "profile":
        return <Palette className="h-4 w-4" />;
      case "badge":
        return <Award className="h-4 w-4" />;
      case "feature":
        return <Sparkles className="h-4 w-4" />;
      default:
        return <Gift className="h-4 w-4" />;
    }
  };

  if (!user || !user.id) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>กรุณาเข้าสู่ระบบเพื่อดูร้านรางวัล</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>กำลังโหลดข้อมูลคะแนน...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-red-600">{error}</p>
        <Button onClick={loadUserPoints} className="mt-4">
          ลองใหม่
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Points Display */}
      <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Coins className="h-8 w-8 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">คะแนนที่ใช้ได้</p>
                <p className="text-3xl font-bold text-yellow-700">
                  {userPoints && userPoints.availablePoints !== undefined
                    ? userPoints.availablePoints.toLocaleString("th-TH")
                    : "0"}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="px-4 py-2 text-lg">
              <Crown className="h-5 w-5 mr-2" />
              {userPoints?.levelName || "N/A"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            ทั้งหมด
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            ธีม
          </TabsTrigger>
          <TabsTrigger value="badge" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            ตรา
          </TabsTrigger>
          <TabsTrigger value="feature" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            ฟีเจอร์
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeCategory} className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRewards.map((reward) => (
              <Card key={reward.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square relative">
                  <img
                    src={reward.image || "/placeholder.svg"}
                    alt={reward.name}
                    className="w-full h-full object-cover"
                  />
                  {reward.isLimited && reward.remainingQuantity !== undefined && reward.limitQuantity !== undefined && (
                    <Badge className="absolute top-2 right-2 bg-red-500">
                      จำกัด {reward.remainingQuantity}/{reward.limitQuantity}
                    </Badge>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{reward.name}</CardTitle>
                    {getCategoryIcon(reward.category)}
                  </div>
                  <CardDescription>{reward.description}</CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Coins className="h-4 w-4 text-yellow-500" />
                      <span className="font-semibold">{reward.pointsCost.toLocaleString("th-TH")}</span>
                    </div>
                    {reward.requirements?.minLevel && (
                      <Badge variant="outline" className="text-xs">
                        ระดับ {reward.requirements.minLevel}+
                      </Badge>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={() => handlePurchase(reward)}
                    disabled={!canPurchase(reward)}
                    variant={canPurchase(reward) ? "default" : "secondary"}
                  >
                    {!canPurchase(reward)
                      ? userPoints && userPoints.availablePoints !== undefined && userPoints.availablePoints < reward.pointsCost
                        ? "คะแนนไม่พอ"
                        : reward.requirements?.minLevel && userPoints && userPoints.level !== undefined && userPoints.level < reward.requirements.minLevel
                          ? "ระดับไม่พอ"
                          : reward.isLimited && reward.remainingQuantity === 0
                            ? "หมดแล้ว"
                            : "ไม่สามารถซื้อได้"
                      : "ซื้อรางวัล"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการซื้อรางวัล</DialogTitle>
            <DialogDescription>
              คุณต้องการซื้อ "{selectedReward?.name}" ด้วยคะแนน{" "}
              {selectedReward?.pointsCost.toLocaleString("th-TH")} คะแนนใช่หรือไม่?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              ยกเลิก
            </Button>
            <Button onClick={confirmPurchase}>ยืนยันการซื้อ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}