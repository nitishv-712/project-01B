"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const supabase_1 = require("../config/supabase");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const User_1 = __importDefault(require("../models/User"));
const Course_1 = __importDefault(require("../models/Course"));
const router = (0, express_1.Router)();
// ── helpers ───────────────────────────────────────────────────────────────────
function randomName(originalName) {
    const ext = path_1.default.extname(originalName);
    return `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
}
async function uploadToSupabase(bucket, filePath, buffer, mimetype) {
    const { error } = await supabase_1.supabase.storage
        .from(bucket)
        .upload(filePath, buffer, { contentType: mimetype, upsert: true });
    if (error)
        throw new Error(error.message);
    const { data } = supabase_1.supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
}
// ── POST /api/upload/avatar — student uploads their own avatar ────────────────
router.post("/avatar", auth_1.authenticate, (0, auth_1.authorize)("user"), upload_1.uploadImage.single("avatar"), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, error: "No file provided" });
            return;
        }
        const filePath = `${req.user.id}/${randomName(req.file.originalname)}`;
        const publicUrl = await uploadToSupabase(supabase_1.BUCKETS.avatars, filePath, req.file.buffer, req.file.mimetype);
        // Save URL to user document
        await User_1.default.findByIdAndUpdate(req.user.id, { avatar: publicUrl });
        res.json({ success: true, data: { url: publicUrl } });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message ?? "Avatar upload failed" });
    }
});
// ── POST /api/upload/course-image — admin uploads course thumbnail ────────────
router.post("/course-image", auth_1.authenticate, (0, auth_1.authorizePermission)("media:upload"), upload_1.uploadImage.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, error: "No file provided" });
            return;
        }
        const filePath = `thumbnails/${randomName(req.file.originalname)}`;
        const publicUrl = await uploadToSupabase(supabase_1.BUCKETS.courseImages, filePath, req.file.buffer, req.file.mimetype);
        res.json({ success: true, data: { url: publicUrl } });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message ?? "Image upload failed" });
    }
});
// ── POST /api/upload/course-video — admin uploads course video ────────────────
// Accepts: multipart/form-data
// Fields:  video (file, required), courseId (string, required), title (string, optional), description (string, optional)
// Uploads to Supabase videos bucket, saves videoPath + videoMeta to course document
router.post("/course-video", auth_1.authenticate, (0, auth_1.authorizePermission)("media:upload"), upload_1.uploadVideo.single("video"), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, error: "No file provided" });
            return;
        }
        const { courseId, title, description } = req.body;
        if (!courseId) {
            res.status(400).json({ success: false, error: "courseId is required" });
            return;
        }
        const course = await Course_1.default.findOne({ id: courseId });
        if (!course) {
            res.status(404).json({ success: false, error: "Course not found" });
            return;
        }
        // Delete old video from Supabase if one exists
        if (course.videoPath) {
            await supabase_1.supabase.storage.from(supabase_1.BUCKETS.courseVideos).remove([course.videoPath]);
        }
        const filePath = `${courseId}/${randomName(req.file.originalname)}`;
        const { error } = await supabase_1.supabase.storage
            .from(supabase_1.BUCKETS.courseVideos)
            .upload(filePath, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: true,
        });
        if (error)
            throw new Error(error.message);
        // Save videoPath and optional meta to course
        course.videoPath = filePath;
        if (title)
            course.videoMeta = { ...course.videoMeta, title };
        if (description)
            course.videoMeta = { ...course.videoMeta, description };
        await course.save();
        res.json({
            success: true,
            data: {
                courseId,
                videoPath: filePath,
                size: req.file.size,
                mimetype: req.file.mimetype,
                originalName: req.file.originalname,
            },
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message ?? "Video upload failed" });
    }
});
// ── DELETE /api/upload/course-video/:courseId — admin removes a course video ──
router.delete("/course-video/:courseId", auth_1.authenticate, (0, auth_1.authorizePermission)("media:delete"), async (req, res) => {
    try {
        const course = await Course_1.default.findOne({ id: req.params.courseId });
        if (!course) {
            res.status(404).json({ success: false, error: "Course not found" });
            return;
        }
        if (!course.videoPath) {
            res.status(400).json({ success: false, error: "No video attached to this course" });
            return;
        }
        const { error } = await supabase_1.supabase.storage
            .from(supabase_1.BUCKETS.courseVideos)
            .remove([course.videoPath]);
        if (error)
            throw new Error(error.message);
        course.videoPath = undefined;
        await course.save();
        res.json({ success: true, message: "Video removed from course" });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message ?? "Failed to remove video" });
    }
});
// ── POST /api/upload/video-url — get a temporary signed URL for a video ───────
// Student requests a signed URL to stream a video they are enrolled in
router.post("/video-url", auth_1.authenticate, (0, auth_1.authorize)("user"), async (req, res) => {
    try {
        const { videoPath, courseId } = req.body;
        // Verify student is enrolled in the course
        const user = await User_1.default.findById(req.user.id);
        if (!user || !user.enrolledCourses.includes(courseId)) {
            res.status(403).json({ success: false, error: "Not enrolled in this course" });
            return;
        }
        const { data, error } = await supabase_1.supabase.storage
            .from(supabase_1.BUCKETS.courseVideos)
            .createSignedUrl(videoPath, 60 * 60); // 1 hour expiry
        if (error || !data)
            throw new Error(error?.message ?? "Failed to generate URL");
        res.json({ success: true, data: { url: data.signedUrl, expiresIn: 3600 } });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message ?? "Failed to get video URL" });
    }
});
// ── DELETE /api/upload/file — admin deletes any file from a bucket ────────────
router.delete("/file", auth_1.authenticate, (0, auth_1.authorizePermission)("media:delete"), async (req, res) => {
    try {
        const { bucket, filePath } = req.body;
        if (!Object.values(supabase_1.BUCKETS).includes(bucket)) {
            res.status(400).json({ success: false, error: "Invalid bucket" });
            return;
        }
        const { error } = await supabase_1.supabase.storage.from(bucket).remove([filePath]);
        if (error)
            throw new Error(error.message);
        res.json({ success: true, message: "File deleted" });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message ?? "Delete failed" });
    }
});
exports.default = router;
