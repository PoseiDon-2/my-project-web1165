"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileCustomization as ProfileCustomizationType } from "@/types/rewards";
import { toast } from "@/components/ui/use-toast";
import axios from "axios";

interface ProfileCustomizationProps {
  onClose: () => void;
  onSave: (newCustomization: ProfileCustomizationType) => void;
}

export default function ProfileCustomization({ onClose, onSave }: ProfileCustomizationProps) {
  const [customization, setCustomization] = useState<ProfileCustomizationType>({
    userId: "",
    theme: "default",
    badge: "",
    frame: "none",
    title: "none",
    background: "",
    effects: [],
  });

  const handleSave = async () => {
    try {
      const response = await axios.put("/api/profile/update", { customization: JSON.stringify(customization) });
      if (response.status === 200) {
        onSave(customization);
        toast({
          title: "บันทึกการตกแต่งสำเร็จ",
          description: "การตกแต่งโปรไฟล์ของคุณได้รับการบันทึกแล้ว",
        });
      } else {
        toast({
          title: "ข้อผิดพลาด",
          description: response.data.message || "ไม่สามารถบันทึกการตกแต่งได้",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("เกิดข้อผิดพลาด:", error);
      toast({
        title: "ข้อผิดพลาด",
        description: "เกิดข้อผิดพลาดในการบันทึกการตกแต่ง",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>ตกแต่งโปรไฟล์</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">ธีม</label>
          <select
            value={customization.theme}
            onChange={(e) => setCustomization({ ...customization, theme: e.target.value as any })}
            className="w-full p-2 border rounded"
          >
            <option value="default">Default</option>
            <option value="gold">Gold</option>
            <option value="platinum">Platinum</option>
            <option value="diamond">Diamond</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">กรอบ</label>
          <select
            value={customization.frame}
            onChange={(e) => setCustomization({ ...customization, frame: e.target.value })}
            className="w-full p-2 border rounded"
          >
            <option value="none">ไม่มี</option>
            <option value="rainbow">Rainbow</option>
            <option value="fire">Fire</option>
            <option value="ice">Ice</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">แบดจ์</label>
          <select
            value={customization.badge}
            onChange={(e) => setCustomization({ ...customization, badge: e.target.value })}
            className="w-full p-2 border rounded"
          >
            <option value="">ไม่มี</option>
            <option value="heart">💛</option>
            <option value="crown">👑</option>
            <option value="star">⭐</option>
            <option value="diamond">💎</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">ตำแหน่ง</label>
          <select
            value={customization.title}
            onChange={(e) => setCustomization({ ...customization, title: e.target.value })}
            className="w-full p-2 border rounded"
          >
            <option value="none">ไม่มี</option>
            <option value="helper">ผู้ช่วยเหลือ</option>
            <option value="guardian">ผู้พิทักษ์</option>
            <option value="legend">ตำนาน</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave}>บันทึก</Button>
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}