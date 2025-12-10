import pandas as pd
import numpy as np
import tensorflow as tf
import joblib

def predict_single_item(item_data):
    """
    Predict category for a single item.
    
    item_data should be a dictionary with:
    {
        'quantity': int,
        'price': float,
        'condition': str,  # original condition string
        'name': str,       # original name string
        'description': str # original description string
    }
    """
    
    le = joblib.load('label_encoder.pkl')
    name_mapping = joblib.load('name_mapping.pkl')
    desc_mapping = joblib.load('desc_mapping.pkl')
    scaler = joblib.load('scaler.pkl')
    
    model = tf.keras.models.load_model('category_classifier.h5')
    
    df_item = pd.DataFrame([item_data])
    
    df_item['condition_encoded'] = le.transform(df_item['condition'])
    
    df_item['name_encoded'] = df_item['name'].map(lambda x: name_mapping.get(x, 0))
    df_item['description_encoded'] = df_item['description'].map(lambda x: desc_mapping.get(x, 0))
    
    df_item = df_item.drop(['condition', 'name', 'description'], axis=1)
    
    feature_order = ['quantity', 'price', 'condition_encoded', 'name_encoded', 'description_encoded']
    df_item = df_item[feature_order]
    
    scaled_features = scaler.transform(df_item)
    
    prediction_probs = model.predict(scaled_features, verbose=0)
    predicted_class = np.argmax(prediction_probs, axis=1)[0]
    confidence = np.max(prediction_probs, axis=1)[0]
    
    result = {
        'predicted_category': int(predicted_class),
        'confidence': float(confidence),
        'all_probabilities': prediction_probs[0].tolist()
    }
    
    return result