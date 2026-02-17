# 🏢 AI Structural Health Monitor (Concrete Crack Detection)

![React](https://img.shields.io/badge/Frontend-React-blue)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-green)
![TensorFlow](https://img.shields.io/badge/AI-TensorFlow%20(MobileNetV2)-orange)
![Accuracy](https://img.shields.io/badge/Accuracy-96%25-brightgreen)

## 📌 Project Overview
Automated system for Civil Engineers to detect structural cracks in concrete surfaces in real-time. 
Uses **Deep Learning (Transfer Learning with MobileNetV2)** to analyze images and flags dangerous structural defects with **96.2% confidence**.

### 🚀 Key Features
* **Real-time Analysis:** Instant classification (Crack vs. Safe).
* **Heatmap / Confidence Score:** Shows probability of structural failure.
* **PDF Reporting:** Auto-generates inspection reports for engineers.
* **Full-Stack Web App:** React Dashboard + FastAPI Backend.

## 📸 Screenshots
*(Place a screenshot of your dashboard here later - drag and drop it into GitHub issue editor to get a link)*

## 🛠️ Tech Stack
* **Model:** MobileNetV2 (Fine-tuned on 40,000+ images).
* **Training Hardware:** NVIDIA RTX 4060 Laptop GPU.
* **Backend:** Python FastAPI, Uvicorn.
* **Frontend:** React (Vite), Tailwind CSS.

## ⚙️ How to Run Locally

### 1. Clone the Repo
```bash
git clone [https://github.com/m4yankkkk/concrete-crack-detection.git](https://github.com/m4yankkkk/concrete-crack-detection.git)
cd concrete-crack-detection

### 2. Backend Setup
```bash
# Create virtual env
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start Server
uvicorn backend.main:app --reload

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev


##📊 Performance
Training Accuracy: ~99%
Validation Accuracy: ~96%
Recall (Sensitivity): High focus on minimizing False Negatives for safety.

##📝 Future Improvements
Integration with drone video feeds for bridge inspections.
Severity classification (Hairline vs. Deep Crack).


#### Built with ❤️  by Mayank
