"use client"
import cloudinary from "cloudinary";
import { File } from "formidable";

cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        cloudinary.v2.uploader.upload(
            file.filepath,
            { folder: "donation_swipe/avatars" },
            (error, result) => {
                if (error) return reject(error);
                resolve(result?.secure_url || "");
            }
        );
    });
}