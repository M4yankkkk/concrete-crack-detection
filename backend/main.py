from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import tensorflow as tf
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
import numpy as np
from PIL import Image
import io
import os
import cv2
import base64

# Resolve model path relative to this script so it works no matter
# which directory uvicorn is launched from.
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "..", "concrete_crack_model_v2.keras")

app = FastAPI(title="Concrete Crack Detection API")

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
    if os.path.exists(MODEL_PATH):
        try:
            model = tf.keras.models.load_model(MODEL_PATH)
            print(f"✅ Model loaded from: {MODEL_PATH}")
        except Exception as e:
            print(f"❌ Error loading model: {e}")
    else:
        print(f"⚠️ Model not found at {MODEL_PATH}. Please check the path.")

def prepare_image(image_data):
    image = Image.open(io.BytesIO(image_data))
    image = image.resize((224, 224))
    img_array = np.array(image)

    # Handle Grayscale or PNG Alpha channels
    if len(img_array.shape) == 2:
        img_array = np.stack((img_array,) * 3, axis=-1)
    if img_array.shape[-1] == 4:
        img_array = img_array[..., :3]

    original_rgb = img_array.copy()  # Save pure image for the heatmap overlay

    img_array = preprocess_input(img_array.astype(np.float32))
    img_array = np.expand_dims(img_array, axis=0)

    return original_rgb, img_array

def get_gradcam_heatmap(model, img_array):
    # 1. Extract the MobileNetV2 base model (Functional API — has proper .output)
    base_model = model.layers[0]  # This is the MobileNetV2 sub-model

    # 2. Find the last convolutional layer inside the base model for the feature map
    last_conv_layer = None
    for layer in reversed(base_model.layers):
        if isinstance(layer, tf.keras.layers.Conv2D):
            last_conv_layer = layer
            break

    if last_conv_layer is None:
        raise ValueError("No Conv2D layer found in the base model.")

    # 3. Build a sub-model: base_model.input → [last_conv_output, base_model.output]
    #    Both are Functional API tensors so this is safe.
    grad_model = tf.keras.models.Model(
        inputs=base_model.input,
        outputs=[last_conv_layer.output, base_model.output]
    )

    # 4. Run the grad model and record gradients
    img_tensor = tf.cast(img_array, tf.float32)
    with tf.GradientTape() as tape:
        conv_outputs, base_out = grad_model(img_tensor)
        tape.watch(conv_outputs)

        # Pass base_out through the remaining Sequential layers (GlobalAvgPool + Dense)
        x = base_out
        for layer in model.layers[1:]:   # layers after the base model
            x = layer(x)
        loss = x[:, 0]

    # 5. Calculate gradients & pool them across spatial dims
    grads = tape.gradient(loss, conv_outputs)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

    # 6. Weight the feature map channels by their gradient importance
    conv_outputs = conv_outputs[0]
    heatmap = conv_outputs @ tf.reshape(pooled_grads, (-1, 1))
    heatmap = tf.squeeze(heatmap)

    # 7. Keep only positive activations and normalize to [0, 1]
    heatmap = tf.maximum(heatmap, 0) / (tf.math.reduce_max(heatmap) + 1e-10)
    return heatmap.numpy()

def overlay_heatmap(heatmap, original_image):
    # Resize and colorize the heatmap
    heatmap_resized = cv2.resize(heatmap, (original_image.shape[1], original_image.shape[0]))
    heatmap_resized = np.uint8(255 * heatmap_resized)
    heatmap_colormap = cv2.applyColorMap(heatmap_resized, cv2.COLORMAP_JET)
    heatmap_rgb = cv2.cvtColor(heatmap_colormap, cv2.COLOR_BGR2RGB)

    # Blend the heatmap onto the original image
    superimposed_img = cv2.addWeighted(original_image, 0.6, heatmap_rgb, 0.4, 0)
    return superimposed_img

@app.get("/")
def home():
    return {"status": "System Online", "gpu_enabled": len(tf.config.list_physical_devices('GPU')) > 0}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if not model:
        return {"error": "Model is not loaded."}

    contents = await file.read()
    try:
        original_rgb, processed_tensor = prepare_image(contents)

        # AI Prediction
        prediction = model.predict(processed_tensor)
        score = float(prediction[0][0])

        # Generate Grad-CAM Heatmap Overlay
        heatmap = get_gradcam_heatmap(model, processed_tensor)
        overlay_img = overlay_heatmap(heatmap, original_rgb)

        # Encode image to Base64 string so React can render it
        _, buffer = cv2.imencode('.jpg', cv2.cvtColor(overlay_img, cv2.COLOR_RGB2BGR))
        base64_img = base64.b64encode(buffer).decode('utf-8')

        # Optimized threshold: score > 0.5 = crack
        label = "CRACK DETECTED ⚠️" if score > 0.5 else "Safe / No Crack ✅"
        if score > 0.5:
            confidence = (score - 0.5) / 0.5
        else:
            confidence = 1 - score

        return {
            "filename": file.filename,
            "result": label,
            "confidence": f"{confidence:.2%}",
            "raw_score": score,
            "heatmap": f"data:image/jpeg;base64,{base64_img}"
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}