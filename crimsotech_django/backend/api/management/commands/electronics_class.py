import tensorflow as tf
from tensorflow import keras
from keras import layers, models
import os
import numpy as np
from keras.utils import load_img, img_to_array
import matplotlib.pyplot as plt

# ---------------- PARAMETERS ---------------- #
DATA_DIR = "dataset"  # dataset folder
IMG_SIZE = (256, 256)
BATCH_SIZE = 16
EPOCHS = 5  # start small, increase later
# -------------------------------------------- #

# ---------------- LOAD DATASETS ---------------- #
train_dataset = tf.keras.preprocessing.image_dataset_from_directory(
    os.path.join(DATA_DIR, "train"),
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE
)

val_dataset = tf.keras.preprocessing.image_dataset_from_directory(
    os.path.join(DATA_DIR, "val"),
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE
)

test_dataset = tf.keras.preprocessing.image_dataset_from_directory(
    os.path.join(DATA_DIR, "test"),
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE
)

CLASS_NAMES = train_dataset.class_names
NUM_CLASSES = len(CLASS_NAMES)
print("Detected classes:", CLASS_NAMES)

data_augmentation = tf.keras.Sequential([
    layers.RandomFlip("horizontal"),
    layers.RandomRotation(0.1),
    layers.RandomZoom(0.1),
])

# Load pretrained ResNet50 without top layers
base_model = tf.keras.applications.ResNet50(
    input_shape=(IMG_SIZE[0], IMG_SIZE[1], 3),
    include_top=False,
    weights='imagenet'
)
base_model.trainable = False  # freeze pretrained layers

# Add classification head
model = tf.keras.Sequential([
    data_augmentation,
    base_model,
    layers.GlobalAveragePooling2D(),
    layers.Dense(256, activation='relu'),
    layers.Dropout(0.3),
    layers.Dense(NUM_CLASSES, activation='softmax')

])

model.compile(
    optimizer='adam',
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)

model.summary()

image_extensions = (".jpg", ".jpeg", ".png")
num_images = sum(
    [len([f for f in files if f.endswith(image_extensions)]) 
     for r, d, files in os.walk(DATA_DIR)]
)

print(f"Total number of images: {num_images}")

history = model.fit(
    train_dataset,
    validation_data=val_dataset,
    epochs=EPOCHS
)
# ---------------- EVALUATE ON TEST SET ---------------- #
test_loss, test_acc = model.evaluate(test_dataset)
print(f"Test Accuracy: {test_acc:.4f}")


def predict_image(img_path):
    img = load_img(img_path, target_size=IMG_SIZE)
    img_array = img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = tf.keras.applications.resnet50.preprocess_input(img_array)

    predictions = model.predict(img_array)

    class_idx = np.argmax(predictions[0])
    class_name = train_dataset.class_names[class_idx]
    confidence = predictions[0][class_idx]

    return class_name, confidence


image_path = "dataset/test/try.jpeg"
predicted_class, confidence = predict_image(image_path)

print(f"Predicted category: {predicted_class}")
print(f"Confidence: {confidence:.2f}")

model.save("electronics_classifier3.keras")