import axios from "axios";

const BUNNY_STREAM_API_KEY  = process.env.BUNNY_STREAM_API_KEY!;
const BUNNY_LIBRARY_ID      = process.env.BUNNY_LIBRARY_ID!;     
const BUNNY_CDN_HOSTNAME    = process.env.BUNNY_CDN_HOSTNAME!;

const STREAM_BASE = `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}`;

// Step 1 — Create a video object, returns the videoId
export async function bunnyCreateVideo(title: string): Promise<string> {
  const { data } = await axios.post(
    `${STREAM_BASE}/videos`,
    { title },
    { headers: { AccessKey: BUNNY_STREAM_API_KEY, "Content-Type": "application/json" } }
  );
  return data.guid as string; // videoId
}

// Step 2 — Upload the video file to the created video object
export async function bunnyUploadVideo(videoId: string, buffer: Buffer): Promise<void> {
  await axios.put(
    `${STREAM_BASE}/videos/${videoId}`,
    buffer,
    {
      headers: {
        AccessKey: BUNNY_STREAM_API_KEY,
        "Content-Type": "application/octet-stream",
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    }
  );
}

// Delete a video from the library
export async function bunnyDeleteVideo(videoId: string): Promise<void> {
  await axios.delete(`${STREAM_BASE}/videos/${videoId}`, {
    headers: { AccessKey: BUNNY_STREAM_API_KEY },
  });
}

// Build the HLS stream URL for a videoId — used by enrolled students
export function bunnyStreamUrl(videoId: string): string {
  return `https://${BUNNY_CDN_HOSTNAME}/${videoId}/playlist.m3u8`;
}

// Build the iframe embed URL for a videoId
export function bunnyEmbedUrl(videoId: string): string {
  return `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${videoId}`;
}
