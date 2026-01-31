# model_handler.py (updated with dynamic category fetching)
import tensorflow as tf
import numpy as np
from PIL import Image
import os
import sys
from django.conf import settings
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crimsotech_django.settings')

# Initialize Django
if not settings.configured:
    django.setup()

from api.models import Category

class ElectronicsClassifier:
    def __init__(self, model_path=None):
        """
        Initialize the classifier with the trained model
        If model_path is None, it will look for default model
        """
        # If no model_path provided, look in default location
        if model_path is None:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.dirname(os.path.dirname(current_dir))
            model_path = os.path.join(project_root, 'model', 'electronics_classifier3.keras')
        
        try:
            self.model = tf.keras.models.load_model(model_path)
        except Exception as e:
            raise Exception(f"Failed to load model at {model_path}: {str(e)}")
        
        self.IMG_SIZE = (256, 256)
        
        # Fetch categories from database
        self.class_names = self._fetch_categories_from_db()
        
        if not self.class_names:
            raise Exception("No categories found in database. Please add categories first.")
        
        print(f"Loaded classifier with {len(self.class_names)} categories from database")
        print(f"Categories: {', '.join(self.class_names)}")
    
    def _fetch_categories_from_db(self):
        """
        Fetch admin categories from the database
        Categories with shop=None are admin/global categories
        """
        try:
            # Import here to avoid circular imports
            from api.models import Category
            
            # Get admin categories (shop=None)
            categories = Category.objects.filter(shop__isnull=True).order_by('name')
            category_names = [cat.name for cat in categories]
            
            return category_names
            
        except Exception as e:
            print(f"Warning: Failed to fetch categories from database: {e}")
            print("Falling back to default categories...")
            
            # Fallback to default categories if database fetch fails
            return [
                'Audio Devices', 'Computer Accessories', 'Controllers',
                'Desktop and Laptops', 'Home Appliances', 'Mobile Phones',
                'Storage Devices', 'Televisions', 'Wearables'
            ]
    
    def _get_category_mapping(self):
        """
        Get mapping of category names to their database IDs
        Returns dict with category_name: (category_id, category_uuid)
        """
        try:
            from api.models import Category
            
            categories = Category.objects.filter(shop__isnull=True)
            mapping = {}
            
            for cat in categories:
                mapping[cat.name] = {
                    'id': cat.id,
                    'uuid': str(cat.id)
                }
            
            return mapping
            
        except Exception as e:
            print(f"Warning: Failed to fetch category mapping: {e}")
            return {}
    
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
    
    def predict(self, image_path, include_db_info=True):
        """
        Make prediction on a single image
        include_db_info: If True, includes database UUIDs in the response
        """
        img_array = self.preprocess_image(image_path)
        predictions = self.model.predict(img_array, verbose=0)
        
        # Validate that model output matches our categories
        if len(predictions[0]) != len(self.class_names):
            print(f"Warning: Model output shape ({len(predictions[0])}) doesn't match categories ({len(self.class_names)})")
            # If there's a mismatch, we might need to handle this differently
            # For now, take the first n predictions where n is min of both
        
        class_idx = np.argmax(predictions[0])
        class_name = self.class_names[class_idx] if class_idx < len(self.class_names) else "Unknown"
        confidence = float(predictions[0][class_idx]) if class_idx < len(predictions[0]) else 0.0
        
        # Get category mapping for UUIDs
        category_mapping = self._get_category_mapping() if include_db_info else {}
        
        # Get top 3 predictions
        top_3_indices = np.argsort(predictions[0])[-3:][::-1]
        top_predictions = []
        
        for idx in top_3_indices:
            if idx < len(self.class_names):
                pred_class_name = self.class_names[idx]
                pred_confidence = float(predictions[0][idx]) if idx < len(predictions[0]) else 0.0
                
                pred_data = {
                    "class": pred_class_name,
                    "confidence": pred_confidence
                }
                
                # Add UUID if available
                if include_db_info and pred_class_name in category_mapping:
                    pred_data["category_uuid"] = category_mapping[pred_class_name]['uuid']
                    pred_data["category_id"] = str(category_mapping[pred_class_name]['id'])
                
                top_predictions.append(pred_data)
        
        # Build response
        result = {
            "predicted_class": class_name,
            "confidence": confidence,
            "top_predictions": top_predictions,
            "all_predictions": {}
        }
        
        # Add UUID for top prediction if include_db_info is True
        if include_db_info and class_name in category_mapping:
            result["category_uuid"] = category_mapping[class_name]['uuid']
            result["category_id"] = str(category_mapping[class_name]['id'])
        
        # Add all predictions
        for i, class_name in enumerate(self.class_names):
            if i < len(predictions[0]):
                result["all_predictions"][class_name] = float(predictions[0][i])
        
        return result
    
    def predict_from_bytes(self, image_bytes, include_db_info=True):
        """
        Make prediction from image bytes (for in-memory processing)
        include_db_info: If True, includes database UUIDs in the response
        """
        from io import BytesIO
        
        # Open image from bytes
        img = Image.open(BytesIO(image_bytes)).convert('RGB')
        img = img.resize(self.IMG_SIZE)
        img_array = np.array(img, dtype=np.float32)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = tf.keras.applications.resnet50.preprocess_input(img_array)
        
        predictions = self.model.predict(img_array, verbose=0)
        
        # Validate that model output matches our categories
        if len(predictions[0]) != len(self.class_names):
            print(f"Warning: Model output shape ({len(predictions[0])}) doesn't match categories ({len(self.class_names)})")
        
        class_idx = np.argmax(predictions[0])
        class_name = self.class_names[class_idx] if class_idx < len(self.class_names) else "Unknown"
        confidence = float(predictions[0][class_idx]) if class_idx < len(predictions[0]) else 0.0
        
        # Get category mapping for UUIDs
        category_mapping = self._get_category_mapping() if include_db_info else {}
        
        # Get top 3 predictions
        top_3_indices = np.argsort(predictions[0])[-3:][::-1]
        top_predictions = []
        
        for idx in top_3_indices:
            if idx < len(self.class_names):
                pred_class_name = self.class_names[idx]
                pred_confidence = float(predictions[0][idx]) if idx < len(predictions[0]) else 0.0
                
                pred_data = {
                    "class": pred_class_name,
                    "confidence": pred_confidence
                }
                
                # Add UUID if available
                if include_db_info and pred_class_name in category_mapping:
                    pred_data["category_uuid"] = category_mapping[pred_class_name]['uuid']
                    pred_data["category_id"] = str(category_mapping[pred_class_name]['id'])
                
                top_predictions.append(pred_data)
        
        # Build response
        result = {
            "predicted_class": class_name,
            "confidence": confidence,
            "top_predictions": top_predictions,
            "all_predictions": {}
        }
        
        # Add UUID for top prediction if include_db_info is True
        if include_db_info and class_name in category_mapping:
            result["category_uuid"] = category_mapping[class_name]['uuid']
            result["category_id"] = str(category_mapping[class_name]['id'])
        
        # Add all predictions
        for i, class_name in enumerate(self.class_names):
            if i < len(predictions[0]):
                result["all_predictions"][class_name] = float(predictions[0][i])
        
        return result
    
    def get_all_categories(self):
        """
        Get all categories with their UUIDs from database
        Useful for frontend to populate category dropdowns
        """
        try:
            from api.models import Category
            
            categories = Category.objects.filter(shop__isnull=True)
            categories_list = []
            
            for cat in categories:
                categories_list.append({
                    'uuid': str(cat.id),
                    'name': cat.name,
                    'id': str(cat.id)
                })
            
            return categories_list
            
        except Exception as e:
            print(f"Error fetching all categories: {e}")
            return []


# Optional: Create a singleton instance for reuse
_classifier_instance = None

def get_classifier():
    """Get or create a singleton instance of the classifier"""
    global _classifier_instance
    if _classifier_instance is None:
        try:
            _classifier_instance = ElectronicsClassifier()
        except Exception as e:
            print(f"Failed to initialize classifier: {e}")
            return None
    return _classifier_instance