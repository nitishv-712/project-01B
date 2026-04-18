import multer, { FileFilterCallback } from "multer";
import { Request } from "express";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

const MB = 1024 * 1024;

function makeUpload(allowedTypes: string[], maxSizeMB: number) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSizeMB * MB },
    fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type. Allowed: ${allowedTypes.join(", ")}`));
      }
    },
  });
}

export const uploadImage = makeUpload(IMAGE_TYPES, 5);   // max 5MB
export const uploadVideo = makeUpload(VIDEO_TYPES, 500); // max 500MB
