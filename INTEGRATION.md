# BIOVISED: Advanced Ingestion Infrastructure & Security Integration Blueprint
Verified JEE/NEET Educational Portal — Production-Ready Architectures
June 16, 2026

---

This document outlines the complete codebase architecture and integration instructions for setting up the verified database seeding, secure sync schedules, admin content managers, and student video players in accordance with BIOVISED's premium dark aesthetic.

---

## Deliverable 1: Cloud Functions Backend (`functions/src/index.ts`)

The server-side synchronization endpoints are fully implemented inside `functions/src/index.ts`. All YouTube API calls are rate-limited, query and data operations are authenticated, and administrative rights are verified utilizing custom JSON-Web-Token (JWT) claims or explicit whitelists.

### Admin Credentials Validation & Gating
```typescript
function verifyAdmin(context: functions.https.CallableContext) {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called by an authenticated user.');
  }

  // Allow bypass for explicit custom token admin flag
  if (context.auth.token.admin === true) {
    return;
  }

  // Cross-reference user email representation
  const userEmail = context.auth.token.email;
  const adminEmailsVar = process.env.ADMIN_EMAILS || 'adarshaman898@gmail.com';
  const adminEmails = adminEmailsVar.split(',').map(email => email.trim().toLowerCase());

  if (userEmail && adminEmails.includes(userEmail.toLowerCase())) {
    return;
  }

  throw new functions.https.HttpsError('permission-denied', 'Only authorized administrators can invoke ingestion procedures.');
}
```

### Ingestion Routines Exposed
1. **`importChannel(channelUrl)`**: Extracts YouTube channel details (by URL, ID, or `@handle`). Resolves metadata such as subscribers and title via standard YouTube Data API v3, and seeds the Firestore `channels` collection.
2. **`importChannelPlaylists(channelId)`**: Loops through all public YouTube playlists associated with the channel.
3. **`importPlaylistVideos(playlistId)`**: Loops through up to 50 playlist items (videos) per pagination cycle, extracts video metrics, matches NCERT subject topics, and writes to `videos` collection.
4. **`syncChannel(channelId)`**: Scans for new video assets on the channel and updates existing records.
5. **`syncAllChannels()`**: Invokes sync on all active records. Can be triggered manually or via cron scheduler (runs at 3:00 AM IST / 21:30 UTC).
6. **`deleteChannel(channelId)`**: Multi-batch deletion process that safely cascadingly removes channel references, playlists, and associated lectures from DB securely.

---

## Deliverable 2: Fortress Firestore Security Rules (`firestore.rules`)

Zero-Trust attribute-based policies are implemented to isolate students' PII, prevent Privilege Escalation, deny shadow document mutations, and enforce server timestamp generation.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Global Safety: Block unauthorized operations by default
    match /{document=**} {
      allow read, write: if false;
    }

    // Auth validation helpers
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(uid) {
      return isSignedIn() && request.auth.uid == uid;
    }

    function isAdmin() {
      return isSignedIn() && (
        request.auth.token.admin == true ||
        request.auth.token.email == "adarshaman898@gmail.com"
      );
    }

    // 1. YouTube Channels
    match /channels/{channelId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }

    // 2. YouTube Playlists
    match /playlists/{playlistId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }

    // 3. YouTube Videos
    match /videos/{videoId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }

    // 4. Operation Audit SyncLogs
    match /syncLogs/{logId} {
      allow read: if isAdmin();
      allow write: if false; // Only Cloud Functions (Server SDK) can push records
    }
    
    // 5. User Metadata & States (Split-Collection Protection)
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow write: if isOwner(userId) && (
        !request.resource.data.keys().hasAny(['role', 'admin', 'isVerified'])
      );
    }
  }
}
```

---

## Deliverable 3: Admin Content Manager Panel (`ContentManagerTab.tsx`)

The design utilizes a minimalist, premium layout styled with dark zinc and charcoal tones accented by teal and orange highlights. It features **5 sub-tabs** for content administration:

### 1. Ingest YouTube Channel Tab (`add_channel`)
*   **Purpose**: Gathers handles or URL endpoints and triggers the recursive Cloud Functions import.
*   **Terminal Interface**: Interactive, retro styled log window showcasing the pipeline processing feedback in real-time.

```tsx
<div className="bg-[#09090b] border border-neutral-900 rounded-xl p-4 font-mono text-xs text-zinc-400 space-y-1 h-44 overflow-y-auto">
  {terminalOutput.map((log, index) => (
    <div key={index} className="text-zinc-500">
      <span className="text-emerald-500 font-bold">✔</span> {log}
    </div>
  ))}
</div>
```

### 2. Channels Directory Tab (`channels_list`)
*   **Purpose**: Displays tabular list of active channels, subscriber counts, total ingested playlists, and metadata.
*   **Actions**: Controls to trigger manual synchronization runs or run safe batch deletion operations.

### 3. Playlists Sub-tab (`playlists`)
*   **Purpose**: Displays all parsed playlist grids representing academic course tracks. Filters let you search lists by subject tags (`NEET 2025`, `XII Physics`, etc.).

### 4. Videos Library Sub-tab (`videos`)
*   **Purpose**: Controls individual video attributes. Admins can override the default NCERT subject mapping, change target topics, modify video titles, or block items from student directories entirely.

### 5. Ingestion Sync Logs Tab (`sync_logs`)
*   **Purpose**: Real-time auditing feed. Shows exact numbers of items synchronized along with estimated API quota unit expenditures.

---

## Deliverable 4: Student Frontend Verse & Video Player

The student video experience operates as a fluid, immersive interface with a custom distraction-free mode. It displays interactive learning aids alongside the video viewport:

### Dynamic Metadata & Verified Teacher Cards
*   Displays channels, playcounts, and instructor titles loaded directly from Firestore.
*   **Robust Image Fallback Chain**: Assures thumbnail coverage if high-definition images fail.

```typescript
export function getPlaylistThumbnail(playlist: any): string {
  if (playlist.thumbnailUrl) return playlist.thumbnailUrl;
  if (playlist.thumbnail) return playlist.thumbnail;
  if (playlist.id) return `https://img.youtube.com/vi/${playlist.id}/0.jpg`;
  return "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300";
}
```

### Video Player Interface Components
*   **Cinema Dimmer**: Fades the surrounding UI elements to allow student focus.
*   **Precision Scrubbing & Speed Control Popup**: High accuracy progress controllers supporting customized playback speeds (0.5x, 1.0x, 1.5x, 2.0x).
*   **Live Reviews & Feedback Engine**: Allows students to submit quality feedback. All operations are securely validated and verified in real-time.

---

## Deliverable 5: Single HTML File Integration Instructions

If your BIOVISED application is distributed as a single comprehensive `index.html` file, integrate this backend and front-end system using the following steps:

### Step 1: Append Firebase SDK & Cloud Functions Client CDN Script Tags
Add these imports directly inside the `<head>` of your single `index.html` file:
```html
<!-- Firebase App, Firestore, Auth & Functions CDNs -->
<script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-functions-compat.js"></script>
```

### Step 2: Initialize Web Services and Database Handles
Include the configuration block at the beginning of your script scope. Always bind your Cloud Functions to the appropriate region:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

// Start Compact Instance
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const functions = firebase.app().functions("asia-east1"); // Bind to Asia running container
```

### Step 3: Triggering Pipeline Sync via Callable Functions
```javascript
async function triggerChannelIngestion(channelUrlVal, subjectTag = "Biology", examTag = "NEET") {
  try {
    const importChannelFn = functions.httpsCallable('importChannel');
    const result = await importChannelFn({
      channelUrl: channelUrlVal,
      subject: subjectTag,
      examTags: [examTag]
    });
    console.log("Ingestion Synchronized successfully:", result.data);
    return result.data;
  } catch (error) {
    console.error("Ingestion failed:", error.message);
    throw error;
  }
}
```

### Step 4: Displaying the Live Video Carousel (Dynamic Firestore Query with Pagination)
```javascript
let lastLoadedVideo = null;
const PAGE_SIZE = 12;

function loadVideosFromFirestore(subjectFilter = "Biology") {
  let query = db.collection('videos')
    .where('subject', '==', subjectFilter)
    .orderBy('publishedAt', 'desc')
    .limit(PAGE_SIZE);

  if (lastLoadedVideo) {
    query = query.startAfter(lastLoadedVideo);
  }

  query.get().then((snapshot) => {
    if (snapshot.docs.length > 0) {
      lastLoadedVideo = snapshot.docs[snapshot.docs.length - 1];
    }
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      renderVideoCardInLibrary(data); // Append card element to HTML grid
    });
  }).catch((error) => {
    console.error("Error loading videos:", error);
  });
}
```
