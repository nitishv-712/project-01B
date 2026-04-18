import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be defined");
}

// Service role key — bypasses RLS, only used server-side, never expose to frontend
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export const BUCKETS = {
  avatars: "avatars",       // public bucket — student profile pictures
  courseImages: "courses",  // public bucket — course thumbnail images
  courseVideos: "videos",   // private bucket — course video content
} as const;
