# 🏢 AI Structural Health Monitor (Concrete Crack Detection)

![React](https://img.shields.io/badge/Frontend-React-blue)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-green)
![TensorFlow](https://img.shields.io/badge/AI-TensorFlow%20(MobileNetV2)-orange)
![Accuracy](https://img.shields.io/badge/Accuracy-96%25-brightgreen)

---

## 📌 Project Overview

Automated system for Civil Engineers to detect structural cracks in concrete surfaces in real-time.  
Uses **Deep Learning (Transfer Learning with MobileNetV2)** to analyze images and flag dangerous structural defects with **96.2% validation accuracy**.

---

## 🚀 Key Features

- **Real-time Analysis:** Instant classification (Crack vs Safe)
- **Confidence Score:** Displays probability of structural defect
- **PDF Reporting:** Auto-generates inspection reports
- **Full-Stack Web App:** React Dashboard + FastAPI Backend
- **Transfer Learning:** Fine-tuned MobileNetV2 model

---

## 📸 Screenshots

_Add your screenshots below once available_

```md
![Dashboard Screenshot](image-link-here)
```

---

## 🛠️ Tech Stack

- **Model:** MobileNetV2 (Fine-tuned on 40,000+ images)
- **Framework:** TensorFlow / Keras
- **Backend:** FastAPI + Uvicorn
- **Frontend:** React (Vite) + Tailwind CSS
- **Training Hardware:** NVIDIA RTX 4060 Laptop GPU

---

## ⚙️ How to Run Locally

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/m4yankkkk/concrete-crack-detection.git
cd concrete-crack-detection
```

---

### 2️⃣ Backend Setup

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn backend.main:app --reload
```

Backend runs at:
```
http://127.0.0.1:8000
```

---

### 3️⃣ Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:
```
http://localhost:5173
```

---

## 📊 Model Performance

- **Training Accuracy:** ~99%
- **Validation Accuracy:** ~96%
- **Recall:** Optimized to minimize False Negatives (critical for structural safety)

---

## 🔮 Future Improvements

- Drone video feed integration for bridge/building inspection
- Crack severity classification (Hairline vs Deep)
- Deployment on edge devices (Raspberry Pi / Jetson)
- Cloud-based inspection dashboard

---

## 📂 Project Structure

```
concrete-crack-detection/
│
├── backend/
│   ├── main.py
│   ├── model/
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   └── package.json
│
└── README.md
```

---

## 👨‍💻 Author

Built with ❤️ by Mayank
