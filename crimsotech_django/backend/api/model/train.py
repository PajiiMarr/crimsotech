import pandas as pd
import tensorflow as tf
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, MinMaxScaler
import joblib

# Load and prepare data
df = pd.read_csv('../../csvs/data.csv')
df = df.rename(columns={'name-2': 'category'})

# Data type conversion
df.name = df.name.astype('string')
df.description = df.description.astype('string')
df.quantity = df.quantity.astype('int32')
df.price = df.price.astype('float32')
df.condition = df.condition.astype('category')
df.category = df.category.astype('category')

# Remove outliers
numeric_cols = ['quantity', 'price']
Q1 = df[numeric_cols].quantile(0.25)
Q3 = df[numeric_cols].quantile(0.75)
IQR = Q3 - Q1
df_no_outliers = df[
    ~((df[numeric_cols] < (Q1 - 1.5 * IQR)) |
      (df[numeric_cols] > (Q3 + 1.5 * IQR))).any(axis=1)
]

# =========== FIXED: CREATE SEPARATE ENCODERS ===========
df_no_outliers = df_no_outliers.copy()

# 1. Create CATEGORY label encoder (for predicting categories)
category_le = LabelEncoder()
df_no_outliers['category_encoded'] = category_le.fit_transform(df_no_outliers['category'])

# 2. Create CONDITION label encoder (for encoding condition as a feature)
condition_le = LabelEncoder()
df_no_outliers['condition_encoded'] = condition_le.fit_transform(df_no_outliers['condition'])

# Get number of unique classes
num_classes = len(df_no_outliers['category_encoded'].unique())
print(f"Number of CATEGORY classes: {num_classes}")
print(f"Category classes: {category_le.classes_}")
print(f"Number of CONDITION classes: {len(condition_le.classes_)}")
print(f"Condition classes: {condition_le.classes_}")

# Create mapping dictionaries for name and description
name_mapping = df_no_outliers.groupby('name')['category_encoded'].agg(
    lambda x: x.mode()[0] if not x.mode().empty else 0
).to_dict()

desc_mapping = df_no_outliers.groupby('description')['category_encoded'].agg(
    lambda x: x.mode()[0] if not x.mode().empty else 0
).to_dict()

df_no_outliers['name_encoded'] = df_no_outliers['name'].map(name_mapping)
df_no_outliers['description_encoded'] = df_no_outliers['description'].map(desc_mapping)

# Drop original text columns
df_no_outliers.drop(['category', 'condition', 'name', 'description'], axis=1, inplace=True)

print("\nDataFrame after encoding:")
print(df_no_outliers.head())
print(df_no_outliers.info())

# Scale features
target = df_no_outliers['category_encoded']
features = df_no_outliers.drop(['category_encoded'], axis=1)

scaler = MinMaxScaler()
scaled_features = pd.DataFrame(
    scaler.fit_transform(features),
    columns=features.columns,
    index=features.index
)

# Prepare final dataset
df_scaled = scaled_features.copy()
df_scaled['category_encoded'] = target

# Prepare X and y
X = df_scaled.drop('category_encoded', axis=1).values
y = df_scaled['category_encoded'].values

# Split data
X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# Build model
input_shape = X.shape[1]
print(f"\nInput shape: {input_shape}")

model = tf.keras.Sequential([
    tf.keras.layers.Dense(64, activation='relu', input_shape=(input_shape,)),
    tf.keras.layers.Dropout(0.3),
    tf.keras.layers.Dense(32, activation='relu'),
    tf.keras.layers.Dropout(0.3),
    tf.keras.layers.Dense(16, activation='relu'),
    tf.keras.layers.Dense(num_classes, activation='softmax')
])

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)

early_stopping = tf.keras.callbacks.EarlyStopping(
    monitor='val_loss',
    patience=20,
    restore_best_weights=True
)

# Train
history = model.fit(
    X_train, y_train,
    validation_data=(X_val, y_val),
    epochs=500,
    batch_size=32,
    callbacks=[early_stopping],
    verbose=1
)

# Evaluate
val_loss, val_accuracy = model.evaluate(X_val, y_val)
train_loss, train_accuracy = model.evaluate(X_train, y_train)

print(f"\nTraining Accuracy: {train_accuracy:.4f}")
print(f"Validation Accuracy: {val_accuracy:.4f}")

# =========== FIXED: SAVE BOTH ENCODERS ===========
# Save the preprocessing objects
joblib.dump(category_le, 'category_label_encoder.pkl')  # For decoding predictions
joblib.dump(condition_le, 'condition_label_encoder.pkl')  # For encoding condition input
joblib.dump(name_mapping, 'name_mapping.pkl')
joblib.dump(desc_mapping, 'desc_mapping.pkl')
joblib.dump(scaler, 'scaler.pkl')

# Save the model
model.save('category_classifier.h5')

print("\nPreprocessing objects and model saved successfully!")
print("Saved files:")
print("- category_label_encoder.pkl (for decoding category predictions)")
print("- condition_label_encoder.pkl (for encoding condition input)")
print("- name_mapping.pkl")
print("- desc_mapping.pkl")
print("- scaler.pkl")
print("- category_classifier.h5")