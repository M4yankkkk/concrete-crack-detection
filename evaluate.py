import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from sklearn.metrics import classification_report, confusion_matrix
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# --- CONFIGURATION ---
BATCH_SIZE = 32
IMG_SIZE = (224, 224)
DATA_DIR = 'dataset_final'
MODEL_PATH = 'concrete_crack_model_v2.keras' # Ensure this matches your new model name

# 1. Load the Model
print(f"Loading model: {MODEL_PATH}...")
model = tf.keras.models.load_model(MODEL_PATH)

# 2. Prepare Validation Data
# Important: shuffle=False so we can match predictions to true labels correctly
datagen = ImageDataGenerator(preprocessing_function=preprocess_input, validation_split=0.2)

print("Preparing validation dataset...")
val_gen = datagen.flow_from_directory(
    DATA_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='binary',
    subset='validation',
    shuffle=False 
)

# 3. Run Prediction
print("Running predictions on validation set (this may take a moment)...")
predictions = model.predict(val_gen, verbose=1)
predicted_classes = (predictions > 0.5).astype("int32") # Convert probabilities to 0 or 1

# 4. Get True Labels
true_classes = val_gen.classes
class_labels = list(val_gen.class_indices.keys()) # ['Negative', 'Positive']

# 5. Calculate Metrics
print("\n-------------------------------------------------------")
print("FINAL EVALUATION REPORT")
print("-------------------------------------------------------")

# Confusion Matrix
cm = confusion_matrix(true_classes, predicted_classes)
accuracy = np.trace(cm) / float(np.sum(cm))
print(f"✅ Real Accuracy: {accuracy:.2%}")

# Classification Report (Precision, Recall, F1-Score)
print("\nDetailed Metrics:")
print(classification_report(true_classes, predicted_classes, target_names=class_labels))

# 6. Plot Confusion Matrix
plt.figure(figsize=(8, 6))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=class_labels, yticklabels=class_labels)
plt.ylabel('Actual Label')
plt.xlabel('Predicted Label')
plt.title(f'Confusion Matrix (Acc: {accuracy:.2%})')
plt.show()
print("Graphs generated. Close the window to finish.")