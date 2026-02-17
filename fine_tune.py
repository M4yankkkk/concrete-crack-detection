import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras import optimizers

# Config
BATCH_SIZE = 64 # Your RTX 4060 handles this easily
IMG_SIZE = (224, 224)
DATA_DIR = 'dataset_final'

# 1. Load Data
datagen = ImageDataGenerator(
    preprocessing_function=preprocess_input,
    validation_split=0.2,
    rotation_range=20,
    horizontal_flip=True
)

train_gen = datagen.flow_from_directory(DATA_DIR, target_size=IMG_SIZE, batch_size=BATCH_SIZE, subset='training', class_mode='binary')
val_gen = datagen.flow_from_directory(DATA_DIR, target_size=IMG_SIZE, batch_size=BATCH_SIZE, subset='validation', class_mode='binary')

# 2. Load Your Saved Model
print("Loading previous model...")
model = tf.keras.models.load_model('concrete_crack_model.keras')

# 3. UNFREEZE the Brain (The Magic Step)
# We unfreeze the top 30 layers of MobileNet so they can "learn" concrete textures
base_model = model.layers[0]
base_model.trainable = True

# Freeze the bottom layers (generic shapes), unfreeze top (specific textures)
for layer in base_model.layers[:-30]:
    layer.trainable = False

# 4. Re-compile with a Very Low Learning Rate (Slow & Steady)
model.compile(
    optimizer=optimizers.Adam(learning_rate=1e-5), # 100x slower than before
    loss='binary_crossentropy',
    metrics=['accuracy']
)

# 5. Fine-Tune
print("🚀 Starting Fine-Tuning (This improves accuracy significantly)...")
model.fit(train_gen, epochs=10, validation_data=val_gen)

# 6. Save the Upgraded Model
model.save('concrete_crack_model_v2.keras')
print("✅ Upgraded model saved as 'concrete_crack_model_v2.keras'")