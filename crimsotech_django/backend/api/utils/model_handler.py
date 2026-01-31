# model_handle.py (updated with path handling)
import tensorflow as tf
import numpy as np
from PIL import Image
import os
import json

class ElectronicsClassifier:
    def __init__(self, model_path=None, class_names=None):
        """
        Initialize the classifier with the trained model
        If model_path is None, it will look for default model
        """
        # If no model_path provided, look in default location
        if model_path is None:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.dirname(os.path.dirname(current_dir))
            model_path = os.path.join(project_root, 'model', 'electronics_classifiers3.keras')
        
        try:
            self.model = tf.keras.models.load_model(model_path)
        except Exception as e:
            raise Exception(f"Failed to load model at {model_path}: {str(e)}")
        
        self.IMG_SIZE = (256, 256)
        
        # If you didn't save class names, define them here
        if class_names:
            self.class_names = class_names
        else:
            # Use the same order as during training
            self.class_names = [
                'Audio Devices', 'Computer Accessories', 'Controllers',
                'Desktop and Laptops', 'Home Appliances', 'Mobile Phones',
                'Storage Devices', 'Televisions', 'Wearables'
            ]
    
    def preprocess_image(self, image_path):
        """
        Preprocess image for ResNet50 model
        """
        # Use Pillow to load and resize the image instead of tensorflow.keras.utils
        img = Image.open(image_path).convert('RGB')
        img = img.resize(self.IMG_SIZE)
        img_array = np.array(img, dtype=np.float32)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = tf.keras.applications.resnet50.preprocess_input(img_array)
        return img_array
    
    def predict(self, image_path):
        """
        Make prediction on a single image
        """
        img_array = self.preprocess_image(image_path)
        predictions = self.model.predict(img_array, verbose=0)
        
        class_idx = np.argmax(predictions[0])
        class_name = self.class_names[class_idx]
        confidence = float(predictions[0][class_idx])
        
        # Get top 3 predictions
        top_3_indices = np.argsort(predictions[0])[-3:][::-1]
        top_predictions = [
            {
                "class": self.class_names[idx],
                "confidence": float(predictions[0][idx])
            }
            for idx in top_3_indices
        ]
        
        return {
            "predicted_class": class_name,
            "confidence": confidence,
            "top_predictions": top_predictions,
            "all_predictions": {
                self.class_names[i]: float(predictions[0][i])
                for i in range(len(self.class_names))
            }
        }
    
    def predict_from_bytes(self, image_bytes):
        """
        Make prediction from image bytes (for in-memory processing)
        """
        from io import BytesIO
        
        # Open image from bytes
        img = Image.open(BytesIO(image_bytes)).convert('RGB')
        img = img.resize(self.IMG_SIZE)
        img_array = np.array(img, dtype=np.float32)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = tf.keras.applications.resnet50.preprocess_input(img_array)
        
        predictions = self.model.predict(img_array, verbose=0)
        
        class_idx = np.argmax(predictions[0])
        class_name = self.class_names[class_idx]
        confidence = float(predictions[0][class_idx])
        
        # Get top 3 predictions
        top_3_indices = np.argsort(predictions[0])[-3:][::-1]
        top_predictions = [
            {
                "class": self.class_names[idx],
                "confidence": float(predictions[0][idx])
            }
            for idx in top_3_indices
        ]
        
        return {
            "predicted_class": class_name,
            "confidence": confidence,
            "top_predictions": top_predictions,
            "all_predictions": {
                self.class_names[i]: float(predictions[0][i])
                for i in range(len(self.class_names))
            }
        }