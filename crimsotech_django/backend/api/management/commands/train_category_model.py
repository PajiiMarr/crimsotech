import os
import tensorflow as tf
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.feature_selection import mutual_info_classif
import joblib
from django.core.management.base import BaseCommand
from django.conf import settings
from api.models import Product, Category
import sys
import re
from collections import defaultdict, Counter
import warnings
warnings.filterwarnings('ignore')

class StopAt90Accuracy(tf.keras.callbacks.Callback):
    """Custom callback to stop training when both training and validation accuracy reach 90%"""
    
    def __init__(self, patience=30, min_epochs=50):
        super().__init__()
        self.patience = patience
        self.min_epochs = min_epochs
        self.wait = 0
        self.best_val_acc = 0
        self.best_train_acc = 0
        self.stopped_epoch = 0
        
    def on_epoch_end(self, epoch, logs=None):
        logs = logs or {}
        
        train_acc = logs.get('accuracy', 0)
        val_acc = logs.get('val_accuracy', 0)
        
        if train_acc > self.best_train_acc:
            self.best_train_acc = train_acc
        if val_acc > self.best_val_acc:
            self.best_val_acc = val_acc
        
        if train_acc >= 0.90 and val_acc >= 0.90:
            if epoch >= self.min_epochs:
                self.stopped_epoch = epoch
                self.model.stop_training = True
                print(f"\n✅ Both training ({train_acc:.2%}) and validation ({val_acc:.2%}) accuracy reached 90%!")
                return
        
        if epoch > self.min_epochs:
            if train_acc < 0.90 and val_acc < 0.90:
                self.wait += 1
                if self.wait >= self.patience:
                    self.stopped_epoch = epoch
                    self.model.stop_training = True
                    print(f"\n⚠️  Training stopped after {self.patience} epochs without reaching 90% accuracy")
                    print(f"   Best training accuracy: {self.best_train_acc:.2%}")
                    print(f"   Best validation accuracy: {self.best_val_acc:.2%}")
            else:
                self.wait = 0

class Command(BaseCommand):
    help = 'Train a category prediction model using data from Django database'
    
    def add_arguments(self, parser):
        parser.add_argument('--min-samples', type=int, default=5)
        parser.add_argument('--model-dir', type=str, 
            default=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 'model'))
        parser.add_argument('--epochs', type=int, default=500)
        parser.add_argument('--target-accuracy', type=float, default=0.90)
        parser.add_argument('--patience', type=int, default=30)
    
    def _extract_top_keywords(self, df, n_keywords=10):
        """Extract top keywords for each category"""
        category_keywords = {}
        
        for category in df['category'].unique():
            category_text = ' '.join(
                df[df['category'] == category]['name'].fillna('').astype(str) + ' ' +
                df[df['category'] == category]['description'].fillna('').astype(str)
            ).lower()
            
            tokens = re.findall(r'\b[a-z]{3,}\b', category_text)
            common_words = set(['new', 'used', 'like', 'good', 'excellent', 'condition', 
                               'with', 'for', 'and', 'the', 'this', 'that', 'brand'])
            tokens = [t for t in tokens if t not in common_words]
            
            word_counts = Counter(tokens)
            top_keywords = [word for word, _ in word_counts.most_common(n_keywords)]
            category_keywords[category] = top_keywords
        
        return category_keywords
    
    def _create_price_quantity_features(self, df):
        """Create enhanced price and quantity features"""
        features = pd.DataFrame(index=df.index)
        
        features['price_quantity_interaction'] = df['price'] * np.log1p(df['quantity'] + 1)
        features['log_price'] = np.log1p(df['price'])
        features['price'] = df['price']
        features['price_per_unit'] = df['price'] / (df['quantity'] + 1)
        features['price_to_quantity_ratio'] = df['price'] / (df['quantity'] + 1e-5)
        features['quantity_scaled'] = df['quantity'] / (df['quantity'].max() + 1e-5)
        features['price_scaled'] = df['price'] / (df['price'].max() + 1e-5)
        
        price_bins = pd.qcut(df['price'], q=5, labels=False, duplicates='drop')
        for i in range(5):
            features[f'price_bin_{i}'] = (price_bins == i).astype(int)
        
        return features
    
    def _create_keyword_features(self, df, category_keywords):
        """Create keyword presence features"""
        features = pd.DataFrame(index=df.index)
        
        for category, keywords in category_keywords.items():
            for keyword in keywords:
                col_name = f'has_{keyword}'
                features[col_name] = df['name'].str.lower().str.contains(keyword, na=False).astype(int) | \
                                    df['description'].str.lower().str.contains(keyword, na=False).astype(int)
        
        keyword_cols = [col for col in features.columns if col.startswith('has_')]
        if keyword_cols:
            features['keyword_count'] = features[keyword_cols].sum(axis=1)
            features['unique_keywords'] = features[keyword_cols].gt(0).sum(axis=1)
        
        return features
    
    def _create_condition_features(self, df):
        """Create condition features"""
        features = pd.DataFrame(index=df.index)
        
        condition_mapping = {
            'New': 3,
            'Like New': 2,
            'Refurbished': 1,
            'Used - Excellent': 0,
            'Used - Good': -1,
            'Used - Fair': -2
        }
        
        features['condition_score'] = df['condition'].map(condition_mapping).fillna(0)
        features['is_new'] = df['condition'].str.contains('New', case=False, na=False).astype(int)
        features['is_used'] = df['condition'].str.contains('Used', case=False, na=False).astype(int)
        features['is_refurbished'] = df['condition'].str.contains('Refurbished', case=False, na=False).astype(int)
        
        return features
    
    def _create_simple_text_features(self, df):
        """Create simple text-based features"""
        features = pd.DataFrame(index=df.index)
        
        features['name_length'] = df['name'].fillna('').str.len()
        features['name_word_count'] = df['name'].fillna('').str.split().str.len()
        features['desc_length'] = df['description'].fillna('').str.len()
        features['desc_word_count'] = df['description'].fillna('').str.split().str.len()
        features['name_desc_ratio'] = features['name_length'] / (features['desc_length'] + 1)
        
        features['has_iphone'] = df['name'].str.lower().str.contains('iphone', na=False).astype(int)
        features['has_samsung'] = df['name'].str.lower().str.contains('samsung', na=False).astype(int)
        features['has_apple'] = df['name'].str.lower().str.contains('apple', na=False).astype(int)
        features['has_sony'] = df['name'].str.lower().str.contains('sony', na=False).astype(int)
        
        return features
    
    def _create_category_specific_stats(self, df):
        """Create features based on category statistics"""
        features = pd.DataFrame(index=df.index)
        
        category_stats = df.groupby('category').agg({
            'price': ['mean', 'std'],
            'quantity': ['mean', 'std']
        }).round(2)
        
        for idx, row in df.iterrows():
            category = row['category']
            price = row['price']
            quantity = row['quantity']
            
            if category in category_stats.index:
                cat_price_mean = category_stats.loc[category, ('price', 'mean')]
                cat_price_std = category_stats.loc[category, ('price', 'std')]
                
                if cat_price_std > 0:
                    features.loc[idx, 'price_category_zscore'] = (price - cat_price_mean) / cat_price_std
                else:
                    features.loc[idx, 'price_category_zscore'] = 0
                
                cat_qty_mean = category_stats.loc[category, ('quantity', 'mean')]
                cat_qty_std = category_stats.loc[category, ('quantity', 'std')]
                
                if cat_qty_std > 0:
                    features.loc[idx, 'quantity_category_zscore'] = (quantity - cat_qty_mean) / cat_qty_std
                else:
                    features.loc[idx, 'quantity_category_zscore'] = 0
                
                cat_prices = df[df['category'] == category]['price']
                if len(cat_prices) > 1:
                    q1 = cat_prices.quantile(0.25)
                    q3 = cat_prices.quantile(0.75)
                    if price <= q1:
                        features.loc[idx, 'price_category_quartile'] = 1
                    elif price <= q3:
                        features.loc[idx, 'price_category_quartile'] = 2
                    else:
                        features.loc[idx, 'price_category_quartile'] = 3
                else:
                    features.loc[idx, 'price_category_quartile'] = 2
            else:
                features.loc[idx, 'price_category_zscore'] = 0
                features.loc[idx, 'quantity_category_zscore'] = 0
                features.loc[idx, 'price_category_quartile'] = 2
        
        return features
    
    def handle(self, *args, **options):
        min_samples = options['min_samples']
        model_dir = options['model_dir']
        max_epochs = options['epochs']
        target_accuracy = options['target_accuracy']
        patience = options['patience']
        
        self.stdout.write(self.style.SUCCESS('Starting category prediction model training...'))
        self.stdout.write(f'Target accuracy: {target_accuracy:.0%} for both training and validation')
        self.stdout.write(f'Maximum epochs: {max_epochs}')
        self.stdout.write(f'Patience: {patience} epochs')
        self.stdout.write(f'Model directory: {model_dir}')
        
        os.makedirs(model_dir, exist_ok=True)
        
        try:
            # Fetch data
            self.stdout.write('\nFetching product data from database...')
            products = Product.objects.filter(category_admin__isnull=False).select_related('category_admin')
            
            if products.count() == 0:
                products = Product.objects.filter(
                    category__isnull=False,
                    category__shop__isnull=True
                ).select_related('category')
            
            if products.count() == 0:
                self.stderr.write(self.style.ERROR('No products with categories found!'))
                sys.exit(1)
            
            # Prepare data
            data_list = []
            for product in products:
                if product.category_admin:
                    category_name = product.category_admin.name
                elif product.category and product.category.shop is None:
                    category_name = product.category.name
                else:
                    continue
                
                data_list.append({
                    'name': product.name,
                    'description': product.description,
                    'quantity': product.quantity,
                    'price': float(product.price),
                    'condition': product.condition,
                    'category': category_name
                })
            
            df = pd.DataFrame(data_list).dropna(subset=['category'])
            category_counts = df['category'].value_counts()
            valid_categories = category_counts[category_counts >= min_samples].index
            df = df[df['category'].isin(valid_categories)]
            
            self.stdout.write(self.style.SUCCESS(f'Loaded {len(df)} records for {len(valid_categories)} categories'))
            
            # =========== FEATURE ENGINEERING ===========
            self.stdout.write('\n' + '='*60)
            self.stdout.write('FEATURE ENGINEERING')
            self.stdout.write('='*60)
            
            self.stdout.write('\nExtracting category keywords...')
            category_keywords = self._extract_top_keywords(df, n_keywords=5)
            
            self.stdout.write('Creating features...')
            price_qty_features = self._create_price_quantity_features(df)
            keyword_features = self._create_keyword_features(df, category_keywords)
            condition_features = self._create_condition_features(df)
            text_features = self._create_simple_text_features(df)
            category_stats_features = self._create_category_specific_stats(df)
            
            # Combine features
            all_features = pd.concat([
                price_qty_features,
                keyword_features,
                condition_features,
                text_features,
                category_stats_features
            ], axis=1).fillna(0)
            
            all_features['category'] = df['category']
            
            # =========== FEATURE SELECTION ===========
            self.stdout.write('\n' + '='*60)
            self.stdout.write('FEATURE SELECTION')
            self.stdout.write('='*60)
            
            X = all_features.drop('category', axis=1)
            y = all_features['category']
            
            # 🔧 FIX: Remove duplicate columns from X before feature selection
            self.stdout.write(f'\nOriginal feature count: {X.shape[1]}')
            duplicate_cols = X.columns[X.columns.duplicated()].tolist()
            if duplicate_cols:
                self.stdout.write(f'⚠️  Found duplicate columns: {duplicate_cols}')
                X = X.loc[:, ~X.columns.duplicated()]
                self.stdout.write(f'After removing duplicates: {X.shape[1]}')
            
            category_le = LabelEncoder()
            y_encoded = category_le.fit_transform(y)
            
            self.stdout.write('Calculating feature importance...')
            mi_scores = mutual_info_classif(X, y_encoded, random_state=42, n_neighbors=3)
            feature_importance = pd.DataFrame({
                'feature': X.columns,
                'importance': mi_scores
            }).sort_values('importance', ascending=False)
            
            # Select top features
            n_features = min(30, X.shape[1])
            important_features = feature_importance.head(n_features)['feature'].tolist()
            
            # 🔧 FIX: Ensure important_features list has no duplicates
            from collections import Counter
            feature_counts = Counter(important_features)
            duplicate_features = [f for f, count in feature_counts.items() if count > 1]
            if duplicate_features:
                self.stdout.write(f'⚠️  Found duplicate features in selection: {duplicate_features}')
                # Remove duplicates while preserving order
                seen = set()
                important_features = [x for x in important_features if not (x in seen or seen.add(x))]
                self.stdout.write(f'After removing duplicates: {len(important_features)} features')
            
            self.stdout.write(f'\nSelected {len(important_features)} most important features:')
            for i, (feature, imp) in enumerate(feature_importance.head(10).itertuples(index=False), 1):
                self.stdout.write(f'  {i:2}. {feature}: {imp:.4f}')
            
            X_important = X[important_features].copy()
            
            # ⚠️ CRITICAL FIX: Verify feature count BEFORE scaling
            self.stdout.write(f'\n🔍 VERIFICATION:')
            self.stdout.write(f'   X_important.shape[1] = {X_important.shape[1]}')
            self.stdout.write(f'   len(important_features) = {len(important_features)}')
            self.stdout.write(f'   X_important columns: {list(X_important.columns)}')
            
            # Double-check for duplicates in the DataFrame itself
            df_duplicate_cols = X_important.columns[X_important.columns.duplicated()].tolist()
            if df_duplicate_cols:
                self.stdout.write(f'⚠️  Found duplicate columns in X_important: {df_duplicate_cols}')
                X_important = X_important.loc[:, ~X_important.columns.duplicated()]
                self.stdout.write(f'   After removing: {X_important.shape[1]} columns')
            
            # Final assertion
            if X_important.shape[1] != len(important_features):
                self.stderr.write(self.style.ERROR(f'ERROR: X_important has {X_important.shape[1]} columns but important_features has {len(important_features)} items'))
                self.stderr.write(f'X_important columns: {list(X_important.columns)}')
                self.stderr.write(f'important_features: {important_features}')
                raise ValueError("Feature count mismatch!")
            
            self.stdout.write(f'✅ Feature count verified: {X_important.shape[1]} features')
            
            # Scale features
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X_important)
            
            # =========== MODEL TRAINING ===========
            self.stdout.write('\n' + '='*60)
            self.stdout.write('MODEL TRAINING')
            self.stdout.write('='*60)
            
            X_train, X_val, y_train, y_val = train_test_split(
                X_scaled, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
            )
            
            self.stdout.write(f'Training samples: {len(X_train)}')
            self.stdout.write(f'Validation samples: {len(X_val)}')
            self.stdout.write(f'Number of classes: {len(category_le.classes_)}')
            self.stdout.write(f'Input features: {X_train.shape[1]}')
            
            # Build model - MUST match X_train.shape[1]
            input_shape = X_train.shape[1]
            num_classes = len(category_le.classes_)
            
            model = tf.keras.Sequential([
                tf.keras.layers.Input(shape=(input_shape,)),
                tf.keras.layers.Dense(256, activation='relu'),
                tf.keras.layers.BatchNormalization(),
                tf.keras.layers.Dropout(0.4),
                tf.keras.layers.Dense(128, activation='relu'),
                tf.keras.layers.BatchNormalization(),
                tf.keras.layers.Dropout(0.3),
                tf.keras.layers.Dense(64, activation='relu'),
                tf.keras.layers.BatchNormalization(),
                tf.keras.layers.Dropout(0.2),
                tf.keras.layers.Dense(32, activation='relu'),
                tf.keras.layers.Dense(num_classes, activation='softmax')
            ])
            
            # ⚠️ CRITICAL: Verify model input matches feature count
            self.stdout.write(f'\n🔍 Model verification:')
            self.stdout.write(f'   Model input shape: {model.input_shape}')
            self.stdout.write(f'   Expected: (None, {len(important_features)})')
            
            if model.input_shape[1] != len(important_features):
                raise ValueError(f"Model expects {model.input_shape[1]} but got {len(important_features)} features!")
            
            self.stdout.write(f'✅ Model input shape verified')
            
            optimizer = tf.keras.optimizers.Adam(learning_rate=0.001, weight_decay=0.0001)
            
            model.compile(
                optimizer=optimizer,
                loss='sparse_categorical_crossentropy',
                metrics=['accuracy']
            )
            
            stop_at_90 = StopAt90Accuracy(patience=patience, min_epochs=50)
            
            reduce_lr = tf.keras.callbacks.ReduceLROnPlateau(
                monitor='val_accuracy',
                factor=0.5,
                patience=patience//2,
                min_lr=0.00001,
                mode='max',
                verbose=1
            )
            
            checkpoint_path = os.path.join(model_dir, 'best_model.keras')
            model_checkpoint = tf.keras.callbacks.ModelCheckpoint(
                checkpoint_path,
                monitor='val_accuracy',
                save_best_only=True,
                mode='max',
                verbose=0
            )
            
            self.stdout.write(f'\nTraining model (will stop when both accuracies reach {target_accuracy:.0%})...')
            history = model.fit(
                X_train, y_train,
                validation_data=(X_val, y_val),
                epochs=max_epochs,
                batch_size=min(32, len(X_train)),
                callbacks=[stop_at_90, reduce_lr, model_checkpoint],
                verbose=2
            )
            
            if os.path.exists(checkpoint_path):
                model = tf.keras.models.load_model(checkpoint_path)
                self.stdout.write('Loaded best model from checkpoint')
            
            train_loss, train_accuracy = model.evaluate(X_train, y_train, verbose=0)
            val_loss, val_accuracy = model.evaluate(X_val, y_val, verbose=0)
            
            self.stdout.write('\n' + '='*60)
            self.stdout.write('FINAL RESULTS')
            self.stdout.write('='*60)
            
            self.stdout.write(f'Training Accuracy:   {train_accuracy:.2%}')
            self.stdout.write(f'Validation Accuracy: {val_accuracy:.2%}')
            self.stdout.write(f'Epochs trained:      {len(history.history["loss"])}')
            
            target_reached = train_accuracy >= target_accuracy and val_accuracy >= target_accuracy
            
            if target_reached:
                self.stdout.write(self.style.SUCCESS(f'\n✅ SUCCESS: Both accuracies reached {target_accuracy:.0%}!'))
            else:
                self.stdout.write(self.style.WARNING(f'\n⚠️  Target of {target_accuracy:.0%} not reached'))
            
            # Analyze predictions
            y_pred_probs = model.predict(X_val, verbose=0)
            y_pred = np.argmax(y_pred_probs, axis=1)
            
            from sklearn.metrics import classification_report, confusion_matrix
            self.stdout.write('\n' + '-'*60)
            self.stdout.write('DETAILED VALIDATION PERFORMANCE')
            self.stdout.write('-'*60)
            
            report = classification_report(y_val, y_pred, 
                                         target_names=category_le.classes_,
                                         output_dict=False)
            self.stdout.write(report)
            
            cm = confusion_matrix(y_val, y_pred)
            self.stdout.write('\nCategories with perfect predictions:')
            perfect_categories = []
            for i in range(len(category_le.classes_)):
                if cm[i, i] == cm[i].sum() and cm[i].sum() > 0:
                    perfect_categories.append(category_le.classes_[i])
            
            if perfect_categories:
                for cat in perfect_categories:
                    self.stdout.write(f'  ✅ {cat}')
            else:
                self.stdout.write('  None')
            
            # =========== SAVE MODELS ===========
            self.stdout.write('\n' + '='*60)
            self.stdout.write('SAVING MODELS')
            self.stdout.write('='*60)
            
            # ⚠️ CRITICAL: Final verification before saving
            self.stdout.write(f'\n🔍 FINAL CHECK:')
            self.stdout.write(f'   Model input shape: {model.input_shape}')
            self.stdout.write(f'   Feature list length: {len(important_features)}')
            self.stdout.write(f'   Match: {model.input_shape[1] == len(important_features)}')
            
            if model.input_shape[1] != len(important_features):
                raise ValueError(f"CRITICAL ERROR: Model expects {model.input_shape[1]} features but feature list has {len(important_features)}!")
            
            joblib.dump({
                'category_keywords': category_keywords,
                'important_features': important_features,
                'feature_importance': feature_importance.to_dict('records')
            }, os.path.join(model_dir, 'feature_info.pkl'))
            
            joblib.dump(category_le, os.path.join(model_dir, 'category_label_encoder.pkl'))
            joblib.dump(scaler, os.path.join(model_dir, 'scaler.pkl'))
            
            final_model_path = os.path.join(model_dir, 'category_classifier.keras')
            model.save(final_model_path)
            
            # Save feature columns
            joblib.dump(important_features, os.path.join(model_dir, 'feature_columns.pkl'))
            
            training_summary = {
                'train_accuracy': float(train_accuracy),
                'val_accuracy': float(val_accuracy),
                'train_loss': float(train_loss),
                'val_loss': float(val_loss),
                'epochs_trained': len(history.history.get('loss', [])),
                'target_accuracy': target_accuracy,
                'reached_target': target_reached,
                'categories': list(category_le.classes_),
                'num_samples': len(df),
                'num_features': len(important_features),
                'important_features': important_features[:10]
            }
            
            joblib.dump(training_summary, os.path.join(model_dir, 'training_summary.pkl'))
            
            self.stdout.write(self.style.SUCCESS('\n✅ Model training completed!'))
            self.stdout.write(f'   Model saved to: {final_model_path}')
            self.stdout.write(f'   Features saved: {len(important_features)}')
            self.stdout.write(f'   Categories: {len(category_le.classes_)}')
            self.stdout.write(f'   Model input shape: {model.input_shape}')
            
        except Exception as e:
            self.stderr.write(self.style.ERROR(f'Error during training: {str(e)}'))
            import traceback
            self.stderr.write(traceback.format_exc())
            sys.exit(1)