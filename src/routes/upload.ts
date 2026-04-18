import { Router, Response } from "express";
import path from "path";
import { v4 as uuid } from "crypto";
import { supabase, BUCKETS } from "../config/supabase";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";
import { uploadImage, uploadVideo } from "../middleware/upload";
import User from "../models/User";

const router = Router();

// ── helpers ───────────────────────────────────────────────────────────────────

function randomName(originalName: string): string {
  const ext = path.extname(originalName);
  return `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
}

async function uploadToSupabase(
  bucket: string,
  filePath: string,
  buffer: Buffer,
  mimetype: string
): Promise<string> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, buffer, { contentType: mimetype, upsert: true });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

// ── POST /api/upload/avatar — student uploads their own avatar ────────────────
router.post(
  "/avatar",
  authenticate,
  authorize("user"),
  uploadImage.single("avatar"),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: "No file provided" });
        return;
      }

      const filePath = `${req.user!.id}/${randomName(req.file.originalname)}`;
      const publicUrl = await uploadToSupabase(
        BUCKETS.avatars,
        filePath,
        req.file.buffer,
        req.file.mimetype
      );

      // Save URL to user document
      await User.findByIdAndUpdate(req.user!.id, { avatar: publicUrl });

      res.json({ success: true, data: { url: publicUrl } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message ?? "Avatar upload failed" });
    }
  }
);

// ── POST /api/upload/course-image — admin uploads course thumbnail ────────────
router.post(
  "/course-image",
  authenticate,
  authorize("admin"),
  uploadImage.single("image"),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: "No file provided" });
        return;
      }

      const filePath = `thumbnails/${randomName(req.file.originalname)}`;
      const publicUrl = await uploadToSupabase(
        BUCKETS.courseImages,
        filePath,
        req.file.buffer,
        req.file.mimetype
      );

      res.json({ success: true, data: { url: publicUrl } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message ?? "Image upload failed" });
    }
  }
);

// ── POST /api/upload/course-video — admin uploads course video ────────────────
router.post(
  "/course-video",
  authenticate,
  authorize("admin"),
  uploadVideo.single("video"),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: "No file provided" });
        return;
      }

      const { courseId } = req.body; // optional — organise by course folder
      const folder = courseId ?? "misc";
      const filePath = `${folder}/${randomName(req.file.originalname)}`;

      const { error } = await supabase.storage
        .from(BUCKETS.courseVideos)
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });

      if (error) throw new Error(error.message);

      // Videos are private — return the storage path, not a public URL
      // Frontend requests a signed URL when a student needs to watch
      res.json({ success: true, data: { path: filePath } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message ?? "Video upload failed" });
    }
  }
);

// ── POST /api/upload/video-url — get a temporary signed URL for a video ───────
// Student requests a signed URL to stream a video they are enrolled in
router.post(
  "/video-url",
  authenticate,
  authorize("user"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { videoPath, courseId } = req.body;

      // Verify student is enrolled in the course
      const user = await User.findById(req.user!.id);
      if (!user || !user.enrolledCourses.includes(courseId)) {
        res.status(403).json({ success: false, error: "Not enrolled in this course" });
        return;
      }

      const { data, error } = await supabase.storage
        .from(BUCKETS.courseVideos)
        .createSignedUrl(videoPath, 60 * 60); // 1 hour expiry

      if (error || !data) throw new Error(error?.message ?? "Failed to generate URL");

      res.json({ success: true, data: { url: data.signedUrl, expiresIn: 3600 } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message ?? "Failed to get video URL" });
    }
  }
);

// ── DELETE /api/upload/file — admin deletes any file from a bucket ────────────
router.delete(
  "/file",
  authenticate,
  authorize("admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { bucket, filePath } = req.body;

      if (!Object.values(BUCKETS).includes(bucket)) {
        res.status(400).json({ success: false, error: "Invalid bucket" });
        return;
      }

      const { error } = await supabase.storage.from(bucket).remove([filePath]);
      if (error) throw new Error(error.message);

      res.json({ success: true, message: "File deleted" });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message ?? "Delete failed" });
    }
  }
);

export default router;
