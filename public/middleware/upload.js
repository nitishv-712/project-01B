"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadVideo = exports.uploadImage = void 0;
const multer_1 = __importDefault(require("multer"));
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MB = 1024 * 1024;
function makeUpload(allowedTypes, maxSizeMB) {
    return (0, multer_1.default)({
        storage: multer_1.default.memoryStorage(),
        limits: { fileSize: maxSizeMB * MB },
        fileFilter: (_req, file, cb) => {
            if (allowedTypes.includes(file.mimetype)) {
                cb(null, true);
            }
            else {
                cb(new Error(`Invalid file type. Allowed: ${allowedTypes.join(", ")}`));
            }
        },
    });
}
exports.uploadImage = makeUpload(IMAGE_TYPES, 5); // max 5MB
exports.uploadVideo = makeUpload(VIDEO_TYPES, 500); // max 500MB
