import os
import tensorflow as tf
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, MinMaxScaler
import joblib
from django.core.management.base import BaseCommand
from django.conf import settings
from api.models import Product, Category
import sys
from django.db.models import Count

class Command(BaseCommand):
    help = 'Train a category prediction model using data from Django database'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--min-samples',
            type=int,
            default=5,
            help='Minimum number of samples per category (default: 5)'
        )
        parser.add_argument(
            '--model-dir',
            type=str,
            default=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 'model'),
            help='Directory to save trained models'
        )
        parser.add_argument(
            '--epochs',
            type=int,
            default=500,
            help='Maximum number of training epochs (default: 500)'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force training even with limited data'
        )
    
    def handle(self, *args, **options):
        min_samples = options['min_samples']
        model_dir = options['model_dir']
        epochs = options['epochs']
        force = options['force']
        
        self.stdout.write(self.style.SUCCESS('Starting category prediction model training...'))
        self.stdout.write(f'Model directory: {model_dir}')
        
        # Create model directory if it doesn't exist
        os.makedirs(model_dir, exist_ok=True)
        
        try:
            # 1. Fetch data from database
            self.stdout.write('Fetching product data from database...')
            
            # Get all products with any category (admin or global)
            products = Product.objects.filter(
                category_admin__isnull=False
            ).select_related('category_admin')
            
            self.stdout.write(f'Found {products.count()} products with admin categories')
            
            if products.count() == 0:
                self.stdout.write(self.style.WARNING('No products with admin categories found.'))
                self.stdout.write('Looking for products with global categories...')
                
                # Try to get products with global categories
                products = Product.objects.filter(
                    category__isnull=False,
                    category__shop__isnull=True
                ).select_related('category')
                
                self.stdout.write(f'Found {products.count()} products with global categories')
            
            if products.count() == 0:
                self.stderr.write(self.style.ERROR('No products with categories found in database!'))
                self.stderr.write(self.style.ERROR('Please add some products with categories first.'))
                sys.exit(1)
            
            # 2. Prepare data for training
            data_list = []
            
            for product in products:
                # Determine which category to use
                if product.category_admin:
                    category_name = product.category_admin.name
                elif product.category and product.category.shop is None:
                    category_name = product.category.name
                else:
                    continue  # Skip products without valid category
                
                data_list.append({
                    'name': product.name,
                    'description': product.description,
                    'quantity': product.quantity,
                    'price': float(product.price),
                    'condition': product.condition,
                    'category': category_name
                })
            
            # Create DataFrame
            df = pd.DataFrame(data_list)
            
            # Remove rows with missing categories
            df = df.dropna(subset=['category'])
            
            self.stdout.write(self.style.SUCCESS(f'Loaded {len(df)} records for training'))
            
            # Show category distribution
            category_counts = df['category'].value_counts()
            self.stdout.write(f'\nCategory distribution:')
            for category, count in category_counts.items():
                self.stdout.write(f'  {category}: {count} samples')
            
            # Filter categories with enough samples
            valid_categories = category_counts[category_counts >= min_samples].index
            df_filtered = df[df['category'].isin(valid_categories)]
            
            if len(df_filtered) == 0:
                if force:
                    self.stdout.write(self.style.WARNING(f'No categories with at least {min_samples} samples, but forcing training with all data'))
                    df_filtered = df.copy()
                    valid_categories = df['category'].unique()
                else:
                    self.stderr.write(self.style.ERROR(f'No categories with at least {min_samples} samples!'))
                    self.stderr.write(self.style.ERROR(f'Use --force flag to train with all data'))
                    self.stderr.write(self.style.ERROR(f'Or use --min-samples={min(category_counts.values)} to use all categories'))
                    sys.exit(1)
            
            self.stdout.write(f'\nUsing {len(valid_categories)} categories')
            self.stdout.write(f'Total samples: {len(df_filtered)}')
            
            if len(df_filtered) < 20:
                self.stdout.write(self.style.WARNING('Warning: Very small dataset. Model may not train well.'))
            
            # 3. Prepare the data
            df_filtered = df_filtered.copy()
            
            # Data type conversion
            df_filtered['name'] = df_filtered['name'].astype('string')
            df_filtered['description'] = df_filtered['description'].astype('string')
            df_filtered['quantity'] = df_filtered['quantity'].astype('int32')
            df_filtered['price'] = df_filtered['price'].astype('float32')
            df_filtered['condition'] = df_filtered['condition'].astype('category')
            df_filtered['category'] = df_filtered['category'].astype('category')
            
            # Remove outliers (optional for small datasets)
            if len(df_filtered) > 30:
                numeric_cols = ['quantity', 'price']
                Q1 = df_filtered[numeric_cols].quantile(0.25)
                Q3 = df_filtered[numeric_cols].quantile(0.75)
                IQR = Q3 - Q1
                df_no_outliers = df_filtered[
                    ~((df_filtered[numeric_cols] < (Q1 - 1.5 * IQR)) |
                      (df_filtered[numeric_cols] > (Q3 + 1.5 * IQR))).any(axis=1)
                ]
                self.stdout.write(f'Samples after removing outliers: {len(df_no_outliers)}')
            else:
                df_no_outliers = df_filtered.copy()
                self.stdout.write('Skipping outlier removal due to small dataset')
            
            # 4. Create separate encoders
            # Category encoder (for predicting categories)
            category_le = LabelEncoder()
            df_no_outliers['category_encoded'] = category_le.fit_transform(df_no_outliers['category'])
            
            # Condition encoder (for encoding condition as a feature)
            condition_le = LabelEncoder()
            df_no_outliers['condition_encoded'] = condition_le.fit_transform(df_no_outliers['condition'])
            
            # Get number of unique classes
            num_classes = len(df_no_outliers['category_encoded'].unique())
            
            self.stdout.write(self.style.SUCCESS(f'\nNumber of CATEGORY classes: {num_classes}'))
            self.stdout.write('Category classes:')
            for i, cls in enumerate(category_le.classes_):
                self.stdout.write(f'  {i}. {cls}')
            
            self.stdout.write(f'\nNumber of CONDITION classes: {len(condition_le.classes_)}')
            self.stdout.write('Condition classes:')
            for i, cls in enumerate(condition_le.classes_):
                self.stdout.write(f'  {i}. {cls}')
            
            # 5. Create mapping dictionaries for name and description
            self.stdout.write('\nCreating name and description mappings...')
            
            # Fill missing values with 0
            name_mapping = df_no_outliers.groupby('name')['category_encoded'].agg(
                lambda x: x.mode()[0] if not x.mode().empty else 0
            ).to_dict()
            
            desc_mapping = df_no_outliers.groupby('description')['category_encoded'].agg(
                lambda x: x.mode()[0] if not x.mode().empty else 0
            ).to_dict()
            
            df_no_outliers['name_encoded'] = df_no_outliers['name'].map(name_mapping).fillna(0).astype(int)
            df_no_outliers['description_encoded'] = df_no_outliers['description'].map(desc_mapping).fillna(0).astype(int)
            
            # Drop original text columns
            df_no_outliers = df_no_outliers.drop(['category', 'condition', 'name', 'description'], axis=1)
            
            # 6. Scale features
            self.stdout.write('Scaling features...')
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
            
            # 7. Split data
            self.stdout.write('Splitting data into train/validation sets...')
            
            if len(X) < 10:
                # For very small datasets, use all data for training
                X_train, X_val, y_train, y_val = X, X, y, y
                self.stdout.write(self.style.WARNING('Very small dataset, using all data for training and validation'))
            else:
                X_train, X_val, y_train, y_val = train_test_split(
                    X, y, test_size=0.2, random_state=42, stratify=y
                )
            
            input_shape = X.shape[1]
            self.stdout.write(f'Input shape: {input_shape}')
            self.stdout.write(f'Training samples: {len(X_train)}')
            self.stdout.write(f'Validation samples: {len(X_val)}')
            
            # 8. Build and train model
            self.stdout.write('\nBuilding neural network model...')
            
            # Adjust model complexity based on data size
            if num_classes <= 5 or len(X_train) < 50:
                # Simplified model for small datasets
                model = tf.keras.Sequential([
                    tf.keras.layers.Dense(32, activation='relu', input_shape=(input_shape,)),
                    tf.keras.layers.Dropout(0.2),
                    tf.keras.layers.Dense(16, activation='relu'),
                    tf.keras.layers.Dense(num_classes, activation='softmax')
                ])
                self.stdout.write('Using simplified model for small dataset')
            else:
                # Standard model
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
            
            # Adjust patience based on dataset size
            patience = min(20, max(5, len(X_train) // 10))
            
            early_stopping = tf.keras.callbacks.EarlyStopping(
                monitor='val_loss',
                patience=patience,
                restore_best_weights=True
            )
            
            self.stdout.write('Training model...')
            history = model.fit(
                X_train, y_train,
                validation_data=(X_val, y_val) if len(X_val) > 0 else None,
                epochs=epochs,
                batch_size=min(32, len(X_train)),
                callbacks=[early_stopping] if len(X_val) > 0 else [],
                verbose=2
            )
            
            # 9. Evaluate
            if len(X_val) > 0:
                val_loss, val_accuracy = model.evaluate(X_val, y_val, verbose=0)
                self.stdout.write(self.style.SUCCESS(f'Validation Accuracy: {val_accuracy:.4f}'))
            
            train_loss, train_accuracy = model.evaluate(X_train, y_train, verbose=0)
            self.stdout.write(self.style.SUCCESS(f'Training Accuracy: {train_accuracy:.4f}'))
            
            # Show training summary
            trained_epochs = len(history.history.get('loss', []))
            self.stdout.write(f'Training epochs: {trained_epochs}')
            
            # 10. Save models and preprocessing objects
            self.stdout.write('\nSaving models and preprocessing objects...')
            
            # Save category label encoder
            category_le_path = os.path.join(model_dir, 'category_label_encoder.pkl')
            joblib.dump(category_le, category_le_path)
            self.stdout.write(f'✓ Saved category label encoder to: {category_le_path}')
            
            # Save condition label encoder
            condition_le_path = os.path.join(model_dir, 'condition_label_encoder.pkl')
            joblib.dump(condition_le, condition_le_path)
            self.stdout.write(f'✓ Saved condition label encoder to: {condition_le_path}')
            
            # Save name mapping
            name_mapping_path = os.path.join(model_dir, 'name_mapping.pkl')
            joblib.dump(name_mapping, name_mapping_path)
            self.stdout.write(f'✓ Saved name mapping to: {name_mapping_path}')
            
            # Save description mapping
            desc_mapping_path = os.path.join(model_dir, 'desc_mapping.pkl')
            joblib.dump(desc_mapping, desc_mapping_path)
            self.stdout.write(f'✓ Saved description mapping to: {desc_mapping_path}')
            
            # Save scaler
            scaler_path = os.path.join(model_dir, 'scaler.pkl')
            joblib.dump(scaler, scaler_path)
            self.stdout.write(f'✓ Saved scaler to: {scaler_path}')
            
            # Save TensorFlow model
            model_path = os.path.join(model_dir, 'category_classifier.h5')
            model.save(model_path)
            self.stdout.write(f'✓ Saved TensorFlow model to: {model_path}')
            
            # Save a summary file
            summary_path = os.path.join(model_dir, 'model_summary.txt')
            with open(summary_path, 'w') as f:
                f.write(f'Model Training Summary\n')
                f.write(f'=====================\n')
                f.write(f'Training date: {pd.Timestamp.now()}\n')
                f.write(f'Number of categories: {num_classes}\n')
                f.write(f'Categories: {", ".join(category_le.classes_)}\n')
                f.write(f'Training samples: {len(X_train)}\n')
                f.write(f'Validation samples: {len(X_val)}\n')
                f.write(f'Training accuracy: {train_accuracy:.4f}\n')
                if len(X_val) > 0:
                    f.write(f'Validation accuracy: {val_accuracy:.4f}\n')
                f.write(f'Input shape: {input_shape}\n')
                f.write(f'Total products in database: {products.count()}\n')
                f.write(f'Used for training: {len(df_filtered)}\n')
            
            self.stdout.write(f'✓ Saved model summary to: {summary_path}')
            
            # Test the model with a sample prediction
            self.stdout.write('\nTesting model with sample prediction...')
            if len(X) > 0:
                sample_pred = model.predict(X[:1], verbose=0)
                predicted_class = np.argmax(sample_pred, axis=1)[0]
                predicted_label = category_le.inverse_transform([predicted_class])[0]
                self.stdout.write(f'Sample prediction: {predicted_label}')
            
            self.stdout.write(self.style.SUCCESS('\n✅ Model training completed successfully!'))
            self.stdout.write(self.style.SUCCESS(f'All models saved in: {model_dir}'))
            
            # Show how to use in Django view
            self.stdout.write('\n📋 To use in Django view, update your predict_category function:')

        except Exception as e:
            self.stderr.write(self.style.ERROR(f'Error during training: {str(e)}'))
            import traceback
            self.stderr.write(traceback.format_exc())
            sys.exit(1)

