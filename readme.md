---
title: Concrete Crack Detection API
emoji: 🏗️
colorFrom: gray
colorTo: blue
sdk: docker
pinned: false
---

# 🏢 AI Structural Health Monitor — CrackSense

![React](https://img.shields.io/badge/Frontend-React%20(Vite)-blue)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-green)
![TensorFlow](https://img.shields.io/badge/AI-TensorFlow%20%28MobileNetV2%29-orange)
![Accuracy](https://img.shields.io/badge/Accuracy-96%25-brightgreen)
![Video Analysis](https://img.shields.io/badge/Feature-Drone%20Video%20Analysis-purple)

**Live Demo:** [concrete-crack-detector.mayankt.me](https://concrete-crack-detector.mayankt.me)

---

## 📌 Project Overview

Automated structural health monitoring system for Civil Engineers. Detects cracks in concrete surfaces from **both static images and drone video footage** using Deep Learning (Transfer Learning with MobileNetV2) — with **96.2% validation accuracy**.

Every prediction is backed by a **Grad-CAM heatmap** (Explainable AI) that shows exactly where the crack was detected, and a professionally formatted **PDF inspection report** is generated client-side.

---

## 🚀 Key Features

### 🖼️ Image Analysis Mode
- **Instant Classification** — Crack vs Safe with sub-second inference
- **Confidence Score** — Normalized probability per prediction
- **Grad-CAM Heatmap** — X-Ray overlay showing where the AI looked
- **PDF Report** — Auto-generated inspection report with severity, confidence bar, recommended actions

### 🎬 Video Analysis Mode *(NEW)*
- **Auto FPS Detection** — Uses `requestVideoFrameCallback` to measure true video frame rate
- **Smart Frame Sampling** — 1 sample per 10 source frames (e.g. every 333ms at 30fps) — no unnecessary frames
- **Real-time Incident Log** — Defect cards appear live as frames are processed
- **Heatmap Zoom Modal** — Click any Grad-CAM thumbnail to view it full-size with confidence bar and metadata
- **Multi-page PDF Report** — Executive summary + one Grad-CAM page per defect + summary table with recommendations
- **Reliable on Free Hosting** — Sequential requests + exponential backoff + backend GC to survive Render free-tier memory limits

### 📊 Sample Video Analysis Report
> 📹 **Sample video used:** [WhatsApp drone footage on Google Drive](https://drive.google.com/file/d/1DS6gmV4T5dkeLSRNplKoD_piaLfdzzDE/view?usp=sharing)  
> 📄 **Pre-generated PDF report:** [`Video_report.pdf`](./Video_report.pdf)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Model** | MobileNetV2 (fine-tuned on 40K+ images) |
| **AI Explainability** | Grad-CAM (last Conv2D layer, JET colormap) |
| **Backend** | FastAPI + Uvicorn + Python 3.11 |
| **Frontend** | React 18 + Vite + Vanilla CSS |
| **PDF Generation** | jsPDF (client-side, no server) |
| **Video Processing** | HTML5 Canvas API + `requestVideoFrameCallback` |
| **Image Processing** | OpenCV + NumPy + Pillow |
| **Hosting** | Render (backend) + custom domain (frontend) |
| **Training Hardware** | NVIDIA RTX 4060 Laptop GPU + CUDA 12 |

---

## ⚙️ How to Run Locally

### 1️⃣ Clone

```bash
git clone https://github.com/m4yankkkk/concrete-crack-detection.git
cd concrete-crack-detection
```

### 2️⃣ Backend

```bash
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.main:app --reload
# Runs at http://127.0.0.1:8000
```

### 3️⃣ Frontend

```bash
cd frontend
cp .env.example .env          # set VITE_API_URL=http://127.0.0.1:8000
npm install
npm run dev
# Runs at http://localhost:5173
```

---

## 🎬 Video Analysis — How It Works

```
Upload Video
    │
    ▼
FPS Detection          ← requestVideoFrameCallback measures true frame rate
    │
    ▼
Frame Extraction        ← 1 frame sampled per 10 source frames (client-side Canvas)
    │
    ▼
Sequential API Calls   ← One frame at a time with 800ms delay + 3-retry backoff
    │
    ▼
Grad-CAM per Frame     ← Cached sub-model (no graph bloat), gc.collect() after each
    │
    ▼
Live Incident Log      ← Defect cards appear in real-time as results arrive
    │
    ▼
Multi-page PDF Report  ← Executive summary + per-defect pages + recommendations
```

---

## 📊 Model Performance

| Metric | Value |
|---|---|
| Training Accuracy | ~99% |
| Validation Accuracy | ~96.2% |
| Recall | Optimized (minimize False Negatives) |
| Training Dataset | 40,000+ labeled concrete images |
| Input Size | 224 × 224 px |

---

## 📂 Project Structure

```
concrete-crack-detection/
├── backend/
│   ├── main.py               ← FastAPI + Grad-CAM inference
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx           ← Image analysis mode
│   │   ├── VideoAnalyzer.jsx ← Video analysis mode + PDF report
│   │   ├── LandingPage.jsx   ← Marketing landing page
│   │   └── index.css         ← All styles (no Tailwind runtime)
│   └── package.json
├── Video_report.pdf          ← Sample drone inspection PDF report
└── readme.md
```

---

## 👨‍💻 Author

Built with ❤️ by Mayank · NITK Project
