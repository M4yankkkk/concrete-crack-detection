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
import gc

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

model     = None
grad_model = None   # cached Grad-CAM sub-model — built once, reused for every request

@app.on_event("startup")
async def load_model():
    global model, grad_model
    if os.path.exists(MODEL_PATH):
        try:
            model = tf.keras.models.load_model(MODEL_PATH)
            print(f"✅ Model loaded from: {MODEL_PATH}")
            # Pre-build the Grad-CAM graph once at startup so it is NOT
            # recreated on every request (which causes TF graph bloat → OOM)
            grad_model = _build_grad_model(model)
            print("✅ Grad-CAM sub-model cached")
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

def _build_grad_model(mdl):
    """Build the Grad-CAM sub-model ONCE and cache it as `grad_model`."""
    base_model = mdl.layers[0]  # MobileNetV2 sub-model
    last_conv_layer = None
    for layer in reversed(base_model.layers):
        if isinstance(layer, tf.keras.layers.Conv2D):
            last_conv_layer = layer
            break
    if last_conv_layer is None:
        raise ValueError("No Conv2D layer found in the base model.")
    return tf.keras.models.Model(
        inputs=base_model.input,
        outputs=[last_conv_layer.output, base_model.output]
    )

def get_gradcam_heatmap(img_array):
    """Run Grad-CAM using the module-level cached grad_model."""
    img_tensor = tf.cast(img_array, tf.float32)
    with tf.GradientTape() as tape:
        conv_outputs, base_out = grad_model(img_tensor)
        tape.watch(conv_outputs)
        x = base_out
        for layer in model.layers[1:]:
            x = layer(x)
        loss = x[:, 0]

    grads       = tape.gradient(loss, conv_outputs)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

    conv_np   = conv_outputs[0].numpy()      # pull to NumPy early to free TF tensors
    grads_np  = pooled_grads.numpy()
    heatmap   = conv_np @ grads_np.reshape(-1, 1)
    heatmap   = np.squeeze(heatmap)
    heatmap   = np.maximum(heatmap, 0)
    heatmap  /= (heatmap.max() + 1e-10)

    # Free intermediate arrays explicitly
    del conv_np, grads_np, conv_outputs, base_out, grads, pooled_grads
    return heatmap

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
    if not model or not grad_model:
        return {"error": "Model is not loaded."}

    contents = await file.read()
    original_rgb = None
    try:
        original_rgb, processed_tensor = prepare_image(contents)
        del contents   # free raw upload bytes immediately

        # AI Prediction
        prediction = model.predict(processed_tensor, verbose=0)
        score = float(prediction[0][0])
        del prediction

        # Generate Grad-CAM heatmap using cached sub-model
        heatmap = get_gradcam_heatmap(processed_tensor)
        del processed_tensor

        overlay_img = overlay_heatmap(heatmap, original_rgb)
        del heatmap, original_rgb
        original_rgb = None

        # Encode to JPEG base64
        _, buffer = cv2.imencode('.jpg', cv2.cvtColor(overlay_img, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 80])
        del overlay_img
        base64_img = base64.b64encode(buffer).decode('utf-8')
        del buffer

        label = "CRACK DETECTED \u26a0\ufe0f" if score > 0.5 else "Safe / No Crack \u2705"
        confidence = (score - 0.5) / 0.5 if score > 0.5 else 1 - score

        return {
            "filename": file.filename,
            "result":   label,
            "confidence": f"{confidence:.2%}",
            "raw_score":  score,
            "heatmap":  f"data:image/jpeg;base64,{base64_img}"
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        if original_rgb is not None:
            del original_rgb
        return {"error": str(e)}
    finally:
        # Explicit GC after every request to keep Render free-tier RAM stable
        gc.collect()