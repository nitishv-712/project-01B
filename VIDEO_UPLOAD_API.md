# Video Upload API Documentation

## Overview
This API handles video uploads to Bunny Stream CDN for course lessons. Videos are stored in Bunny Stream and linked to specific lessons within courses.

---

## Base URL
`/api/upload`

---

## Authentication
All endpoints require:
```
Authorization: Bearer <token>
```

---

## Endpoints

### 1. Upload Course Video

**POST** `/api/upload/course-video`

Upload a video file for a specific lesson. The video is uploaded to Bunny Stream CDN and the `videoId` is saved to the lesson.

#### Permission Required
`media:upload`

#### Headers
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

#### Form Data
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `video` | File | Yes | Video file (mp4, mov, avi, etc.) |
| `courseId` | String | Yes | Course ID (slug) |
| `lessonId` | String | Yes | Lesson ID (e.g., "s1-l1") |
| `title` | String | No | Video title (defaults to `{courseId}-{lessonId}`) |

#### Response (201)
```json
{
  "success": true,
  "data": {
    "courseId": "react-101",
    "lessonId": "s1-l1",
    "videoId": "abc123-def456-ghi789",
    "embedUrl": "https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}",
    "streamUrl": "https://{cdn-hostname}/{videoId}/playlist.m3u8",
    "size": 15728640,
    "mimetype": "video/mp4",
    "originalName": "intro.mp4"
  }
}
```

#### Error Responses
```json
// 400 - No file provided
{ "success": false, "error": "No file provided" }

// 400 - Missing required fields
{ "success": false, "error": "courseId and lessonId are required" }

// 404 - Course not found
{ "success": false, "error": "Course not found" }

// 404 - Lesson not found
{ "success": false, "error": "Lesson not found" }

// 500 - Upload failed
{ "success": false, "error": "Video upload failed" }
```

#### Notes
- If the lesson already has a video, the old video will be deleted from Bunny Stream
- Video processing may take a few minutes after upload
- Maximum file size depends on server configuration (check `uploadVideo` middleware)

---

### 2. Delete Course Video

**DELETE** `/api/upload/course-video/:courseId/:lessonId`

Remove a video from a lesson and delete it from Bunny Stream.

#### Permission Required
`media:delete`

#### URL Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `courseId` | String | Course ID (slug) |
| `lessonId` | String | Lesson ID (e.g., "s1-l1") |

#### Response (200)
```json
{
  "success": true,
  "message": "Video removed from lesson"
}
```

#### Error Responses
```json
// 404 - Course not found
{ "success": false, "error": "Course not found" }

// 404 - Lesson not found
{ "success": false, "error": "Lesson not found" }

// 400 - No video attached
{ "success": false, "error": "No video attached to this lesson" }

// 500 - Delete failed
{ "success": false, "error": "Failed to remove video" }
```

---

### 3. Get Video URL (Student Access)

**POST** `/api/upload/video-url`

Get streaming URLs for a video. Students can only access videos from courses they're enrolled in (or free preview lessons).

#### Permission Required
Role: `user` (student)

#### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

#### Request Body
```json
{
  "courseId": "react-101",
  "lessonId": "s1-l1"
}
```

#### Response (200)
```json
{
  "success": true,
  "data": {
    "embedUrl": "https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}",
    "streamUrl": "https://{cdn-hostname}/{videoId}/playlist.m3u8"
  }
}
```

#### Error Responses
```json
// 404 - User not found
{ "success": false, "error": "User not found" }

// 404 - Course not found
{ "success": false, "error": "Course not found" }

// 404 - Lesson not found
{ "success": false, "error": "Lesson not found" }

// 403 - Not enrolled
{ "success": false, "error": "Not enrolled in this course" }

// 404 - No video
{ "success": false, "error": "Video not found" }
```

#### Notes
- Free lessons (where `free: true`) are accessible without enrollment
- `embedUrl` can be used in an iframe for embedded playback
- `streamUrl` is the HLS playlist URL for custom video players

---

## Frontend Implementation Examples

### Upload Video (Admin)

```typescript
async function uploadCourseVideo(
  courseId: string,
  lessonId: string,
  videoFile: File,
  title?: string
) {
  const formData = new FormData();
  formData.append('video', videoFile);
  formData.append('courseId', courseId);
  formData.append('lessonId', lessonId);
  if (title) formData.append('title', title);

  const response = await fetch('/api/upload/course-video', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  return await response.json();
}

// Usage
const file = document.querySelector('input[type="file"]').files[0];
const result = await uploadCourseVideo('react-101', 's1-l1', file, 'Introduction');
console.log('Video ID:', result.data.videoId);
```

### Delete Video (Admin)

```typescript
async function deleteCourseVideo(courseId: string, lessonId: string) {
  const response = await fetch(`/api/upload/course-video/${courseId}/${lessonId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return await response.json();
}

// Usage
await deleteCourseVideo('react-101', 's1-l1');
```

### Get Video URL (Student)

```typescript
async function getVideoUrl(courseId: string, lessonId: string) {
  const response = await fetch('/api/upload/video-url', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ courseId, lessonId })
  });

  return await response.json();
}

// Usage
const { data } = await getVideoUrl('react-101', 's1-l1');

// Option 1: Embed in iframe
const iframe = document.createElement('iframe');
iframe.src = data.embedUrl;
iframe.width = '640';
iframe.height = '360';
iframe.allowFullscreen = true;
document.body.appendChild(iframe);

// Option 2: Use with HLS player (e.g., Video.js, Plyr)
const player = new Plyr('#player', {
  sources: [{
    src: data.streamUrl,
    type: 'application/x-mpegURL'
  }]
});
```

### React Component Example

```tsx
import { useState } from 'react';

function VideoUploader({ courseId, lessonId, token }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('video', file);
    formData.append('courseId', courseId);
    formData.append('lessonId', lessonId);

    try {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        const result = JSON.parse(xhr.responseText);
        console.log('Upload complete:', result);
        setUploading(false);
      });

      xhr.open('POST', '/api/upload/course-video');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    } catch (error) {
      console.error('Upload failed:', error);
      setUploading(false);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        accept="video/*" 
        onChange={handleUpload}
        disabled={uploading}
      />
      {uploading && <progress value={progress} max="100">{progress}%</progress>}
    </div>
  );
}
```

---

## Video Player Integration

### Using Bunny Embed (Simplest)

```html
<iframe 
  src="https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}"
  width="640"
  height="360"
  frameborder="0"
  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
  allowfullscreen
></iframe>
```

### Using HLS with Video.js

```html
<link href="https://vjs.zencdn.net/8.0.4/video-js.css" rel="stylesheet" />
<script src="https://vjs.zencdn.net/8.0.4/video.min.js"></script>

<video id="my-video" class="video-js" controls preload="auto" width="640" height="360">
  <source src="https://{cdn-hostname}/{videoId}/playlist.m3u8" type="application/x-mpegURL">
</video>

<script>
  const player = videojs('my-video');
</script>
```

### Using Plyr

```html
<link rel="stylesheet" href="https://cdn.plyr.io/3.7.8/plyr.css" />
<script src="https://cdn.plyr.io/3.7.8/plyr.js"></script>
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>

<video id="player" controls></video>

<script>
  const video = document.getElementById('player');
  const hls = new Hls();
  hls.loadSource('https://{cdn-hostname}/{videoId}/playlist.m3u8');
  hls.attachMedia(video);
  
  const player = new Plyr(video);
</script>
```

---

## Environment Variables Required

```env
BUNNY_STREAM_API_KEY=your-api-key
BUNNY_LIBRARY_ID=your-library-id
BUNNY_CDN_HOSTNAME=your-cdn-hostname.b-cdn.net
```

---

## Workflow

### Admin Upload Flow
1. Admin selects video file
2. POST to `/api/upload/course-video` with courseId, lessonId, and file
3. Backend creates video object in Bunny Stream
4. Backend uploads video file to Bunny Stream
5. Backend saves `videoId` to lesson in database
6. Returns video URLs and metadata

### Student Playback Flow
1. Student navigates to lesson
2. Frontend checks if user is enrolled (or lesson is free)
3. POST to `/api/upload/video-url` with courseId and lessonId
4. Backend verifies enrollment
5. Returns streaming URLs
6. Frontend embeds video player with URL

---

## Notes

- Videos are processed asynchronously by Bunny Stream after upload
- Processing time varies based on video length and quality
- Bunny Stream automatically generates multiple quality levels (adaptive streaming)
- HLS format ensures compatibility across all devices
- Videos are automatically optimized for web delivery
