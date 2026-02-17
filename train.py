import os
import shutil
import random
import kagglehub
import tensorflow as tf
import matplotlib.pyplot as plt
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras import layers, models, optimizers
from tqdm import tqdm

# --- CONFIGURATION ---
BATCH_SIZE = 32
IMG_SIZE = (224, 224)
EPOCHS = 10
DATASET_DIR = 'dataset_final'
MODEL_NAME = 'concrete_crack_model.keras'

# --- PART 1: SYSTEM CHECK ---
def check_gpu():
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        print(f"✅ GPU Detected: {gpus[0]}")
        try:
            # Enable memory growth to avoid allocating all VRAM at once
            for gpu in gpus:
                tf.config.experimental.set_memory_growth(gpu, True)
        except RuntimeError as e:
            print(e)
    else:
        print("⚠️  No GPU detected. Training will be slow on CPU.")

# --- PART 2: DATA PIPELINE ---
def prepare_dataset():
    # If the clean folder already exists and has data, skip setup
    if os.path.exists(DATASET_DIR) and len(os.listdir(DATASET_DIR)) == 2:
        print(f"✅ '{DATASET_DIR}' already exists. Skipping download/processing.")
        return

    print("🚀 Starting Data Setup...")
    
    # 1. Download
    print("⬇️  Downloading dataset via KaggleHub...")
    # Using the token environment variable if you set it, or cached credentials
    raw_path = kagglehub.dataset_download("aniruddhsharma/structural-defects-network-concrete-crack-images")
    
    # 2. Create Structure
    if os.path.exists(DATASET_DIR):
        shutil.rmtree(DATASET_DIR) # Clean start
    os.makedirs(DATASET_DIR)
    os.makedirs(os.path.join(DATASET_DIR, 'Positive'))
    os.makedirs(os.path.join(DATASET_DIR, 'Negative'))

    # 3. Reorganize & Copy
    print("📂 Reorganizing files...")
    pos_count = 0
    neg_count = 0
    
    # We collect all file paths first to make balancing easier
    all_negatives = []

    for root, dirs, files in os.walk(raw_path):
        folder_name = os.path.basename(root)
        
        # Determine Label
        label = None
        if 'Non' in folder_name or 'Un' in folder_name:
            label = 'Negative'
        elif 'Crack' in folder_name or 'C' in folder_name:
            label = 'Positive'
        
        if label:
            for file in files:
                if file.lower().endswith(('.jpg', '.png', '.jpeg')):
                    src_path = os.path.join(root, file)
                    dest_name = f"{folder_name}_{file}"
                    
                    if label == 'Positive':
                        # Copy positives immediately
                        shutil.copy(src_path, os.path.join(DATASET_DIR, 'Positive', dest_name))
                        pos_count += 1
                    else:
                        # Store negatives to process later (for balancing)
                        all_negatives.append((src_path, dest_name))

    print(f"   Found {pos_count} Positive and {len(all_negatives)} Negative images.")

    # 4. Balance (Undersampling)
    # We want Negative count == Positive count
    print(f"⚖️  Balancing dataset to approx {pos_count} images per class...")
    random.shuffle(all_negatives)
    balanced_negatives = all_negatives[:pos_count] # Take only as many as we have positives

    for src, name in tqdm(balanced_negatives, desc="Copying Negatives"):
        shutil.copy(src, os.path.join(DATASET_DIR, 'Negative', name))
        neg_count += 1

    print(f"✅ Data Setup Complete! Final Split: {pos_count} Positive, {neg_count} Negative.")

# --- PART 3: TRAINING ---
# ... (Keep your imports and Part 1/Part 2 exactly the same) ...

# --- PART 3: TRAINING (OPTIMIZED) ---
# --- PART 3: TRAINING (FIXED FOR KERAS 3) ---
def train_model():
    # 1. Optimizations
    # We increase batch size to feed the RTX 4060 faster
    BATCH_SIZE = 64 
    
    # 2. Generators
    # Note: In Keras 3, ImageDataGenerator is slower than new methods, 
    # but it is the most stable for this specific project structure.
    train_datagen = ImageDataGenerator(
        preprocessing_function=preprocess_input,
        validation_split=0.2,
        rotation_range=20,
        width_shift_range=0.1,
        height_shift_range=0.1,
        horizontal_flip=True,
        fill_mode='nearest'
    )

    print(f"📊 Loading Data Generators (Batch Size: {BATCH_SIZE})...")
    
    train_generator = train_datagen.flow_from_directory(
        DATASET_DIR,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='binary',
        subset='training',
        shuffle=True
    )

    val_generator = train_datagen.flow_from_directory(
        DATASET_DIR,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='binary',
        subset='validation'
    )

    # 3. Build Model
    print("🏗️  Building MobileNetV2 Model...")
    base_model = MobileNetV2(
        input_shape=IMG_SIZE + (3,),
        include_top=False,
        weights='imagenet'
    )
    base_model.trainable = False

    model = models.Sequential([
        base_model,
        layers.GlobalAveragePooling2D(),
        layers.Dropout(0.2),
        layers.Dense(1, activation='sigmoid')
    ])

    model.compile(
        optimizer=optimizers.Adam(learning_rate=0.001),
        loss='binary_crossentropy',
        metrics=['accuracy']
    )

    # 4. Train (Standard)
    # Keras 3 handles threading internally now.
    print(f"🚀 Starting Training ({EPOCHS} epochs)...")
    
    history = model.fit(
        train_generator,
        epochs=EPOCHS,
        validation_data=val_generator
    )

    # 5. Save & Plot
    model.save(MODEL_NAME)
    print(f"💾 Model saved successfully as '{MODEL_NAME}'")

    acc = history.history['accuracy']
    val_acc = history.history['val_accuracy']
    loss = history.history['loss']
    val_loss = history.history['val_loss']
    epochs_range = range(len(acc))

    plt.figure(figsize=(12, 6))
    plt.subplot(1, 2, 1)
    plt.plot(epochs_range, acc, label='Training Accuracy')
    plt.plot(epochs_range, val_acc, label='Validation Accuracy')
    plt.legend(loc='lower right')
    plt.title('Accuracy')

    plt.subplot(1, 2, 2)
    plt.plot(epochs_range, loss, label='Training Loss')
    plt.plot(epochs_range, val_loss, label='Validation Loss')
    plt.legend(loc='upper right')
    plt.title('Loss')
    plt.savefig('training_results.png')
    print("📈 Training graph saved as 'training_results.png'")
    # plt.show() # Commented out to prevent hanging on servers without screens

    # 5. Plot Results
    acc = history.history['accuracy']
    val_acc = history.history['val_accuracy']
    loss = history.history['loss']
    val_loss = history.history['val_loss']
    epochs_range = range(len(acc))

    plt.figure(figsize=(12, 6))
    plt.subplot(1, 2, 1)
    plt.plot(epochs_range, acc, label='Training Accuracy')
    plt.plot(epochs_range, val_acc, label='Validation Accuracy')
    plt.legend(loc='lower right')
    plt.title('Accuracy')

    plt.subplot(1, 2, 2)
    plt.plot(epochs_range, loss, label='Training Loss')
    plt.plot(epochs_range, val_loss, label='Validation Loss')
    plt.legend(loc='upper right')
    plt.title('Loss')
    plt.savefig('training_results.png')
    print("📈 Training graph saved as 'training_results.png'")
    plt.show()

# --- MAIN EXECUTION ---
if __name__ == "__main__":
    # Ensure Kaggle Token is present (replace if needed, or rely on cached)
    # os.environ['KAGGLE_API_TOKEN'] = "YOUR_TOKEN_HERE" 
    
    check_gpu()
    prepare_dataset()
    train_model()
