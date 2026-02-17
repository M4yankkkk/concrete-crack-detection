import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from sklearn.metrics import f1_score, recall_score, precision_score
import numpy as np

# Config
DATA_DIR = 'dataset_final'
MODEL_PATH = 'concrete_crack_model_v2.keras'
IMG_SIZE = (224, 224)

# 1. Load Data & Model
print("Loading...")
model = tf.keras.models.load_model(MODEL_PATH)

datagen = ImageDataGenerator(preprocessing_function=preprocess_input, validation_split=0.2)
val_gen = datagen.flow_from_directory(
    DATA_DIR, target_size=IMG_SIZE, batch_size=32, 
    class_mode='binary', subset='validation', shuffle=False
)

# 2. Get Raw Probabilities
print("Predicting probabilities...")
y_pred_prob = model.predict(val_gen, verbose=1)
y_true = val_gen.classes

# 3. Test Thresholds from 0.1 to 0.9
print("\n--- THRESHOLD OPTIMIZATION ---")
print(f"{'Threshold':<10} {'Accuracy':<10} {'Recall (Crack)':<15} {'Precision':<10}")

best_thresh = 0.5
best_f1 = 0

for thresh in np.arange(0.1, 0.9, 0.1):
    y_pred_binary = (y_pred_prob > thresh).astype(int)
    
    acc = np.mean(y_pred_binary.flatten() == y_true)
    recall = recall_score(y_true, y_pred_binary) # How many cracks did we find?
    precision = precision_score(y_true, y_pred_binary)
    f1 = f1_score(y_true, y_pred_binary)
    
    print(f"{thresh:.1f}       {acc:.2%}     {recall:.2%}          {precision:.2%}")
    
    if f1 > best_f1:
        best_f1 = f1
        best_thresh = thresh

print(f"\n✅ BEST THRESHOLD: {best_thresh:.1f}")