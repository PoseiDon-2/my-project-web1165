"use client";

import { useState } from "react";
import { Share2, Copy, Twitter, MessageCircle, Mail, QrCode, X, ExternalLink, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "./auth-context";
import { toast } from "@/components/ui/use-toast";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  donation: {
    id: string;
    title: string;
    description: string;
    imageUrl?: string;
    currentAmount: number;
    goalAmount: number;
    supporters: number;
    organizer: string;
  };
  initialShowQR?: boolean;
  url?: string;   
  title?: string; 
}

export default function ShareModal({ isOpen, onClose, donation, initialShowQR = false }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(initialShowQR);
  const { user } = useAuth();

  if (!isOpen) return null;

  const getBaseUrl = (): string => {
    // ใช้ค่าจาก ENV ก่อน (ตั้งค่าใน .env.local)
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      return process.env.NEXT_PUBLIC_SITE_URL;
    }

    // fallback ตอน dev SSR
    return "http://localhost:3000";
  };

  const shareUrl = `${getBaseUrl()}/requests/${donation.id}`;
  const shareTitle = `ช่วยเหลือ: ${donation.title}`;
  const shareDescription = `${donation.description.substring(0, 100)}... เป้าหมาย ฿${donation.goalAmount.toLocaleString("th-TH")} โดย ${donation.organizer}`;

  const handleShare = async (platform: string) => {
    try {
      if (user) {
        const response = await fetch("/api/interactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            entityType: "DonationRequest",
            entityId: donation.id,
            interactionType: "SHARE",
            interactionValue: 3, // SHARE มี weight สูง
          }),
        });
        if (!response.ok) throw new Error("Failed to record SHARE interaction");
      }
    } catch (err) {
      console.error("Failed to record SHARE:", err);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกการแชร์ได้ กรุณาลองใหม่",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      await handleShare("clipboard"); // Track SHARE เมื่อ copy link
    } catch (err) {
      console.error("Failed to copy: ", err);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถคัดลอกลิงก์ได้",
        variant: "destructive",
      });
    }
  };

  const shareToFacebook = async () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareTitle + " - " + shareDescription)}`;
    window.open(url, "_blank", "width=600,height=400");
    await handleShare("facebook"); // Track SHARE
  };

  const shareToTwitter = async () => {
    const text = `${shareTitle}\n\n${shareDescription}\n\n#บริจาค #ช่วยเหลือ`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "width=600,height=400");
    await handleShare("twitter"); // Track SHARE
  };

  const shareToLine = async () => {
    const text = `${shareTitle}\n\n${shareDescription}`;
    const url = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "width=600,height=400");
    await handleShare("line"); // Track SHARE
  };

  const shareToWhatsApp = async () => {
    const text = `${shareTitle}\n\n${shareDescription}\n\n${shareUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    await handleShare("whatsapp"); // Track SHARE
  };

  const shareToEmail = async () => {
    const subject = encodeURIComponent(shareTitle);
    const body = encodeURIComponent(
      `${shareDescription}\n\nดูรายละเอียดเพิ่มเติม: ${shareUrl}`
    );
    const url = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = url;
    await handleShare("email"); // Track SHARE
  };

  const generateQRCode = () => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-pink-500" />
              แชร์คำขอบริจาค
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Preview Card */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex gap-3">
              <img
                src={donation.imageUrl || "/placeholder.svg"}
                alt={donation.title}
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm text-gray-800 line-clamp-2">{donation.title}</h4>
                <p className="text-xs text-gray-600 mt-1">
                  เป้าหมาย ฿{donation.goalAmount.toLocaleString("th-TH")}
                </p>
                <p className="text-xs text-gray-500">โดย {donation.organizer}</p>
              </div>
            </div>
          </div>

          {/* Copy Link */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-800">คัดลอกลิงก์</h4>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 truncate">{shareUrl}</div>
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className={`${copied ? "bg-green-50 border-green-200 text-green-700" : "bg-transparent"}`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            {copied && <p className="text-sm text-green-600 text-center">✓ คัดลอกลิงก์แล้ว!</p>}
          </div>

          <Separator />

          {/* Social Media Sharing */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-800">แชร์ผ่านโซเชียลมีเดีย</h4>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="flex items-center gap-2 justify-start bg-transparent hover:bg-blue-50 hover:border-blue-200"
                onClick={shareToFacebook}
              >
                <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">f</span>
                </div>
                Facebook
              </Button>

              <Button
                variant="outline"
                className="flex items-center gap-2 justify-start bg-transparent hover:bg-sky-50 hover:border-sky-200"
                onClick={shareToTwitter}
              >
                <Twitter className="w-5 h-5 text-sky-500" />
                Twitter
              </Button>

              <Button
                variant="outline"
                className="flex items-center gap-2 justify-start bg-transparent hover:bg-green-50 hover:border-green-200"
                onClick={shareToLine}
              >
                <div className="w-5 h-5 bg-green-500 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">LINE</span>
                </div>
                Line
              </Button>

              <Button
                variant="outline"
                className="flex items-center gap-2 justify-start bg-transparent hover:bg-green-50 hover:border-green-200"
                onClick={shareToWhatsApp}
              >
                <MessageCircle className="w-5 h-5 text-green-600" />
                WhatsApp
              </Button>

              <Button
                variant="outline"
                className="flex items-center gap-2 justify-start bg-transparent hover:bg-gray-50 hover:border-gray-300"
                onClick={shareToEmail}
              >
                <Mail className="w-5 h-5 text-gray-600" />
                Email
              </Button>

              <Button
                variant="outline"
                className="flex items-center gap-2 justify-start bg-transparent hover:bg-purple-50 hover:border-purple-200"
                onClick={() => setShowQR(!showQR)}
              >
                <QrCode className="w-5 h-5 text-purple-600" />
                QR Code
              </Button>
            </div>
          </div>

          {/* QR Code */}
          {showQR && (
            <div className="space-y-3">
              <Separator />
              <h4 className="font-medium text-gray-800">QR Code สำหรับแชร์</h4>
              <div className="text-center">
                <div className="inline-block p-4 bg-white border-2 border-dashed border-gray-300 rounded-lg">
                  <img
                    src={generateQRCode()}
                    alt="QR Code สำหรับแชร์"
                    className="w-32 h-32 mx-auto"
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">สแกน QR Code เพื่อเปิดลิงก์</p>
              </div>
            </div>
          )}

          {/* Native Share */}
          {typeof navigator !== "undefined" && navigator.share && (
            <div>
              <Separator />
              <Button
                variant="outline"
                className="w-full bg-transparent"
                onClick={async () => {
                  try {
                    await navigator.share({
                      title: shareTitle,
                      text: shareDescription,
                      url: shareUrl,
                    });
                    await handleShare("native"); // Track SHARE
                  } catch (err) {
                    console.error("Native share failed:", err);
                  }
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                แชร์ผ่านแอปอื่นๆ
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}