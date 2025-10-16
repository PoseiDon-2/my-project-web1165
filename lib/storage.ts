"use client"
import cloudinary from "cloudinary";
import { Readable } from "stream";

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadFileToCloudinary(file: File, fileName: string): Promise<string> {
  try {
    // Validate file size
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error("File size exceeds 5MB limit");
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("File type must be JPEG, PNG, or PDF");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.v2.uploader.upload_stream(
        {
          public_id: fileName,
          folder: "donateswipe/documents",
          resource_type: "auto",
          allowed_formats: ["jpg", "png", "pdf"], // จำกัดประเภทไฟล์
          quality: "auto",
          fetch_format: "auto",
        },
        (error, result) => {
          if (error) {
            return reject(new Error(`Cloudinary upload failed: ${error.message}`));
          }
          if (!result?.secure_url) {
            return reject(new Error("No secure_url returned from Cloudinary"));
          }
          resolve(result.secure_url);
        }
      );

      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("เกิดข้อผิดพลาดในการอัปโหลดไฟล์");
  }
}