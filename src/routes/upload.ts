import { Router, Response } from "express";
import path from "path";
import { supabase, BUCKETS } from "../config/supabase";
import { bunnyCreateVideo, bunnyUploadVideo, bunnyDeleteVideo, bunnyStreamUrl, bunnyEmbedUrl } from "../config/bunny";
import { authenticate, authorize, authorizePermission, AuthRequest } from "../middleware/auth";
import { uploadImage, uploadVideo } from "../middleware/upload";
import User from "../models/User";
import Course from "../models/Course";

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
  authorizePermission("media:upload"),
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

router.post(
  "/course-video",
  authenticate,
  authorizePermission("media:upload"),
  uploadVideo.single("video"),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: "No file provided" });
        return;
      }

      const { courseId, lessonId, title } = req.body;

      if (!courseId || !lessonId) {
        res.status(400).json({ success: false, error: "courseId and lessonId are required" });
        return;
      }

      const course = await Course.findOne({ id: courseId });
      if (!course) {
        res.status(404).json({ success: false, error: "Course not found" });
        return;
      }

      // Find the lesson across all sections
      let targetLesson: any = null;
      for (const section of course.curriculum) {
        const lesson = (section.lessons as any[]).find((l: any) => l.lessonId === lessonId);
        if (lesson) { targetLesson = lesson; break; }
      }
      if (!targetLesson) {
        res.status(404).json({ success: false, error: "Lesson not found" });
        return;
      }

      // Delete old video from Bunny Stream if one exists
      if (targetLesson.videoId) {
        await bunnyDeleteVideo(targetLesson.videoId).catch(() => {});
      }

      // Step 1 — create video object in Bunny Stream library
      const videoTitle = title || `${courseId}-${lessonId}`;
      const videoId = await bunnyCreateVideo(videoTitle);

      // Step 2 — upload the actual file
      await bunnyUploadVideo(videoId, req.file.buffer);

      // Save videoId to the lesson
      targetLesson.videoId = videoId;
      course.markModified("curriculum");
      await course.save();

      res.json({
        success: true,
        data: {
          courseId,
          lessonId,
          videoId,
          embedUrl: bunnyEmbedUrl(videoId),
          streamUrl: bunnyStreamUrl(videoId),
          size: req.file.size,
          mimetype: req.file.mimetype,
          originalName: req.file.originalname,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message ?? "Video upload failed" });
    }
  }
);

// ── DELETE /api/upload/course-video/:courseId/:lessonId — admin removes a lesson video ──
router.delete(
  "/course-video/:courseId/:lessonId",
  authenticate,
  authorizePermission("media:delete"),
  async (req: AuthRequest, res: Response) => {
    try {
      const course = await Course.findOne({ id: req.params.courseId });
      if (!course) {
        res.status(404).json({ success: false, error: "Course not found" });
        return;
      }

      let targetLesson: any = null;
      for (const section of course.curriculum) {
        const lesson = (section.lessons as any[]).find((l: any) => l.lessonId === req.params.lessonId);
        if (lesson) { targetLesson = lesson; break; }
      }
      if (!targetLesson) {
        res.status(404).json({ success: false, error: "Lesson not found" });
        return;
      }

      if (!targetLesson.videoId) {
        res.status(400).json({ success: false, error: "No video attached to this lesson" });
        return;
      }

      await bunnyDeleteVideo(targetLesson.videoId);
      targetLesson.videoId = null;
      course.markModified("curriculum");
      await course.save();

      res.json({ success: true, message: "Video removed from lesson" });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message ?? "Failed to remove video" });
    }
  }
);

// ── POST /api/upload/video-url — get stream/embed URLs for an enrolled student ──
router.post(
  "/video-url",
  authenticate,
  authorize("user"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { courseId, lessonId } = req.body;

      const user = await User.findById(req.user!.id);
      if (!user) {
        res.status(404).json({ success: false, error: "User not found" });
        return;
      }

      const course = await Course.findOne({ id: courseId });
      if (!course) {
        res.status(404).json({ success: false, error: "Course not found" });
        return;
      }

      // Find the lesson
      let targetLesson: any = null;
      for (const section of course.curriculum) {
        const lesson = (section.lessons as any[]).find((l: any) => l.lessonId === lessonId);
        if (lesson) { targetLesson = lesson; break; }
      }
      if (!targetLesson) {
        res.status(404).json({ success: false, error: "Lesson not found" });
        return;
      }

      // Free lessons are accessible without enrollment
      if (!targetLesson.free && !user.enrolledCourses.includes(courseId)) {
        res.status(403).json({ success: false, error: "Not enrolled in this course" });
        return;
      }

      if (!targetLesson.videoId) {
        res.status(404).json({ success: false, error: "Video not found" });
        return;
      }

      res.json({
        success: true,
        data: {
          embedUrl: bunnyEmbedUrl(targetLesson.videoId),
          streamUrl: bunnyStreamUrl(targetLesson.videoId),
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message ?? "Failed to get video URL" });
    }
  }
);

// ── DELETE /api/upload/file — admin deletes any file from a bucket ────────────
router.delete(
  "/file",
  authenticate,
  authorizePermission("media:delete"),
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
