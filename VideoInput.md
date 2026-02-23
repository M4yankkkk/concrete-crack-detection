
------------------------------------------------------------------------

# 📄 PRD: Distributed Video Processing for Structural Health Monitoring

## 1. Project Overview

**Objective:** Enable civil engineers to upload high-resolution drone
inspection videos and automatically receive a timeline of structural
defects, complete with X-Ray (Grad-CAM) heatmaps. **Challenge:** Cloud
environments (like Render's Free Tier) enforce strict memory limits
(512MB RAM) and request timeouts (60 seconds). Processing a 100MB video
file on the server will cause immediate Out-Of-Memory (OOM) crashes.
**Solution:** A Client-Side Frame Extraction architecture. The React
frontend acts as an "Edge" device, slicing the video into lightweight
frames locally, and drip-feeding them to the FastAPI backend for
stateless, independent AI inference.

## 2. System Architecture

1.  **The Client (React):** Loads the video into a hidden HTML5
    `<video>` element. Uses the HTML5 `<canvas>` API to snap frames at
    specific timestamps (e.g., every 1 second).
2.  **The Queue (Frontend State):** Packages these frames into an
    asynchronous queue, sending 2 to 3 frames concurrently to the
    backend to prevent network throttling.
3.  **The Inference Engine (FastAPI on Render):** Receives a single
    image payload, runs the MobileNetV2 prediction. If a crack is found,
    generates the Grad-CAM heatmap and returns it. Memory is freed
    instantly after each request.
4.  **The UI Assembly:** React listens for responses. If a frame is
    marked as a "Defect," it is injected into a live-updating "Incident
    Timeline" next to the video player.

## 3. User Flow

1.  User uploads an `.mp4` file via the dashboard.
2.  The UI transitions to a dashboard view with the video on the left
    and an empty "Incident Log" on the right.
3.  A progress bar appears: *"Analyzing drone footage (0 / 120
    frames)..."*
4.  As the progress bar fills, "Defect Cards" (containing the timestamp,
    confidence score, and X-Ray heatmap) begin appearing dynamically in
    the right-hand column.
5.  The user clicks a Defect Card, and the video player instantly seeks
    to that exact timestamp for manual review.

------------------------------------------------------------------------

# 🛠️ Implementation Guide: How to Build It

This approach requires **zero changes to your existing FastAPI
backend**. Your `/predict` endpoint already accepts images and returns
heatmaps. We only need to engineer the React frontend.

### Step 1: The Hidden Engine (Video & Canvas Setup)

You need to mount the video file the user uploaded so the browser can
read it, but you don't necessarily need the user to see the messy
extraction process.

-   **Implementation:** Create a `useRef` for a `<video>` element and a
    `<canvas>` element in your React component.
-   **The Trick:** When the user selects a file, use
    `URL.createObjectURL(file)` and set it as the `src` of the video
    reference.

### Step 2: The Slicer Logic (The Core Algorithm)

This is the JavaScript function that scrubs through the video and paints
frames.

-   **Implementation:** 1. Determine the video duration (e.g., 60
    seconds).

2.  Create a loop that iterates from `0` to `duration` in increments
    (e.g., `currentTime += 1.0` for 1 frame per second).
3.  Set the `videoRef.current.currentTime = time`.
4.  Wait for the video's `onSeeked` event to fire (this ensures the
    frame is fully loaded).
5.  Use `canvas.getContext('2d').drawImage(video, 0, 0)` to paint the
    exact frame onto the canvas.
6.  Convert the canvas to a file using `canvas.toBlob()`.

### Step 3: The Drip-Feed Queue (Network Management)

If you slice a 60-second video at 1 frame per second, you have 60
images. You cannot send 60 `axios.post` requests at the exact same
millisecond, or the browser will crash and Render will block you.

-   **Implementation:**

1.  Store the 60 Blobs in a JavaScript Array.
2.  Create a recursive function (or use `Promise.all` with chunking) to
    send them in batches of **3**.
3.  Send Batch 1 (Frames 1, 2, 3) to
    `https://your-api.onrender.com/predict`.
4.  Wait for them to resolve.
5.  Send Batch 2 (Frames 4, 5, 6).
6.  Update your React loading bar state
    (`processedFrames / totalFrames * 100`).

### Step 4: Building the Incident Timeline (UI/UX)

As the FastAPI backend replies to each request, React needs to evaluate
the response.

-   **Implementation:**

1.  If the API returns `"Safe / No Crack"`, discard the response.
2.  If the API returns `"CRACK DETECTED ⚠️"`, take the returned JSON
    (which contains the Grad-CAM Base64 image and confidence score) and
    append the *current video timestamp* to it.
3.  Push this object into an `incidentLog` state array.
4.  Build a UI component that maps over `incidentLog`. Render a card
    showing the timestamp, the Grad-CAM thumbnail, and a severity
    indicator.

### Step 5: The "Interactive Playback" Feature

To make it a true engineering tool, the timeline must control the video.

-   **Implementation:** Add an `onClick` handler to each Defect Card in
    your mapped array. When clicked, it executes
    `videoRef.current.currentTime = defect.timestamp`, instantly jumping
    the inspector to the exact moment the fault was detected.

------------------------------------------------------------------------
