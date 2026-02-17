from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import tensorflow as tf
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
import numpy as np
from PIL import Image
import io
import os

app = FastAPI(title="Concrete Crack Detection API")

# Allow React (Frontend) to talk to this Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None

@app.on_event("startup")
async def load_model():
    global model
    # Look for the model file in the main project folder (one level up)
    model_path = "concrete_crack_model_v2.keras"
    
    if os.path.exists(model_path):
        try:
            model = tf.keras.models.load_model(model_path)
            print(f"✅ Model loaded from: {model_path}")
        except Exception as e:
            print(f"❌ Error loading model: {e}")
    else:
        print(f"⚠️ Model not found at {model_path}. Please check the path.")

def prepare_image(image_data):
    # 1. Open image from bytes
    image = Image.open(io.BytesIO(image_data))
    
    # 2. Resize to 224x224 (Must match training size)
    image = image.resize((224, 224))
    
    # 3. Convert to Array & Handle PNGs (Drop Alpha channel if present)
    img_array = np.array(image)
    if img_array.shape[-1] == 4:
        img_array = img_array[..., :3]
    
    # 4. Preprocess (Scale to -1 to 1) - CRITICAL for MobileNet
    img_array = preprocess_input(img_array)
    
    # 5. Add Batch Dimension (1, 224, 224, 3)
    img_array = np.expand_dims(img_array, axis=0)
    
    return img_array

@app.get("/")
def home():
    return {"status": "System Online", "gpu_enabled": len(tf.config.list_physical_devices('GPU')) > 0}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if not model:
        return {"error": "Model is not loaded."}

    # Read and Process
    contents = await file.read()
    try:
        processed_image = prepare_image(contents)
        
        # Inference
        prediction = model.predict(processed_image)
        score = float(prediction[0][0]) # 0.0 to 1.0
        
        # Threshold Logic (You can tweak this 0.5 value)
        # Closer to 1.0 means "Positive" (Crack)
        # Closer to 0.0 means "Negative" (No Crack)
        label = "CRACK DETECTED ⚠️" if score > 0.5 else "Safe / No Crack ✅"
        confidence = score if score > 0.5 else 1 - score
        
        return {
            "filename": file.filename,
            "result": label,
            "confidence": f"{confidence:.2%}",
            "raw_score": score
        }
    except Exception as e:
        return {"error": str(e)}