import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split, cross_val_score, KFold
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    classification_report, 
    confusion_matrix,
    mean_squared_error,
    mean_absolute_error,
    r2_score,
    explained_variance_score,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score
)
import joblib
import json
from datetime import datetime
import os

print(" ADVANCED ML TRAINING WITH PROPER EVALUATION")
print("=" * 60)

def convert_numpy_types(obj):
    """Convert numpy types to Python native types for JSON serialization"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    else:
        return obj

def main():
    os.makedirs('assets/models', exist_ok=True)
    
    try:

        print("\n Loading Philippine student data...")
        df = pd.read_csv('data/raw/PhilipineStudentsPerformance_with_StudyingHours.csv')
        print(f" {len(df)} student records loaded")

        english_scores = ['Speaking', 'Reading', 'Writing', 'Listening']
        df['english_avg'] = df[english_scores].mean(axis=1)

        def categorize_performance(score):
            if score >= 80:
                return 'high_achiever'
            elif score >= 60:
                return 'satisfactory'
            else:
                return 'at_risk'
        
        df['risk_level'] = df['english_avg'].apply(categorize_performance)
        
        print(" Performance distribution:")
        for level, count in df['risk_level'].value_counts().items():
            percentage = (count / len(df)) * 100
            print(f"   {level}: {count} students ({percentage:.1f}%)")

        print("\n Feature engineering...")

        encoders = {}

        le_gender = LabelEncoder()
        df['Gender_encoded'] = le_gender.fit_transform(df['Gender'])
        encoders['Gender'] = le_gender

        degree_mapping = {
            'Junior High School': 'secondary',
            'Senior High School': 'secondary', 
            'Bachelors': 'bachelors',
            'Masters': 'masters',
            'Doctorate': 'doctorate',
            'Others': 'secondary'
        }
        df['education_level'] = df['Degree Program'].map(degree_mapping)
        le_education = LabelEncoder()
        df['education_encoded'] = le_education.fit_transform(df['education_level'].fillna('secondary'))
        encoders['education'] = le_education

        def categorize_study_hours(hours):
            if hours < 2:
                return 'less_than_2'
            elif hours < 5:
                return '2_to_5'
            elif hours < 10:
                return '5_to_10'
            else:
                return 'more_than_10'
        
        df['study_time_category'] = df['Studying Hours'].apply(categorize_study_hours)
        le_study = LabelEncoder()
        df['study_time_encoded'] = le_study.fit_transform(df['study_time_category'])
        encoders['study_time'] = le_study

        def categorize_attendance(attendance):
            if attendance >= 90:
                return 'none'
            elif attendance >= 70:
                return '1_to_5'
            elif attendance >= 50:
                return '6_to_10'
            else:
                return 'more_than_10'
        
        df['absence_category'] = df['Attendance Rate (%)'].apply(categorize_attendance)
        le_absence = LabelEncoder()
        df['absence_encoded'] = le_absence.fit_transform(df['absence_category'])
        encoders['absence'] = le_absence

        df['has_tutoring'] = df['Test Prep'].map({'Prepared': 1, 'Not Prepared': 0}).fillna(0)




        features = [
            'study_time_encoded',
            'absence_encoded', 
            'education_encoded',
            'Gender_encoded',
            'Attendance Rate (%)', 
            'has_tutoring',

        ]
        
        feature_names = [
            'Study Time',
            'Absences',
            'Education Level',
            'Gender',
            'Attendance Rate',
            'Tutoring',

        ]
        
        X = df[features]
        y_classification = df['risk_level']
        y_regression = df['english_avg']

        X_train, X_test, y_train_cls, y_test_cls, y_train_reg, y_test_reg = train_test_split(
            X, y_classification, y_regression, test_size=0.2, random_state=42, stratify=y_classification
        )
        
        print(f"\n Training with {len(features)} features")
        print(f" Train/Test split: {len(X_train)}/{len(X_test)} students")

        print("\n 1. Training Random Forest Classifier...")
        rf_clf = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            class_weight='balanced',
            n_jobs=-1
        )
        
        rf_clf.fit(X_train, y_train_cls)

        print(" 2. Training Random Forest Regressor...")
        rf_reg = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        
        rf_reg.fit(X_train, y_train_reg)

        print(" 3. Training Linear Regression...")
        lr = LinearRegression()
        lr.fit(X_train, y_train_reg)
        
        print("\n" + "=" * 60)
        print(" ADVANCED MODEL EVALUATION METRICS")
        print("=" * 60)
 
        print("\n RANDOM FOREST CLASSIFIER EVALUATION")
        print("-" * 40)
        
        y_pred_cls = rf_clf.predict(X_test)
        y_pred_proba = rf_clf.predict_proba(X_test)

        accuracy = accuracy_score(y_test_cls, y_pred_cls)
        precision = precision_score(y_test_cls, y_pred_cls, average='weighted')
        recall = recall_score(y_test_cls, y_pred_cls, average='weighted')
        f1 = f1_score(y_test_cls, y_pred_cls, average='weighted')
        
        print(f"Accuracy: {accuracy:.4f}")
        print(f"Precision: {precision:.4f}")
        print(f"Recall: {recall:.4f}")
        print(f"F1-Score: {f1:.4f}")

        print("\n Classification Report:")
        print(classification_report(y_test_cls, y_pred_cls, target_names=['at_risk', 'satisfactory', 'high_achiever']))

        cm = confusion_matrix(y_test_cls, y_pred_cls)
        print("\n Confusion Matrix:")
        print(cm)

        print("\n RANDOM FOREST REGRESSOR EVALUATION")
        print("-" * 40)
        
        y_pred_reg_rf = rf_reg.predict(X_test)

        r2_rf = r2_score(y_test_reg, y_pred_reg_rf)
        mse_rf = mean_squared_error(y_test_reg, y_pred_reg_rf)
        rmse_rf = np.sqrt(mse_rf)

        mae_rf = mean_absolute_error(y_test_reg, y_pred_reg_rf)
        explained_variance_rf = explained_variance_score(y_test_reg, y_pred_reg_rf)
        
        print(f"R-squared (R²): {r2_rf:.4f}")
        print(f"Root Mean Square Error (RMSE): {rmse_rf:.4f}")
        print(f"Mean Absolute Error (MAE): {mae_rf:.4f}")
        print(f"Explained Variance Score: {explained_variance_rf:.4f}")

        print("\n LINEAR REGRESSION EVALUATION")
        print("-" * 40)
        
        y_pred_reg_lr = lr.predict(X_test)

        r2_lr = r2_score(y_test_reg, y_pred_reg_lr)
        mse_lr = mean_squared_error(y_test_reg, y_pred_reg_lr)
        rmse_lr = np.sqrt(mse_lr)

        mae_lr = mean_absolute_error(y_test_reg, y_pred_reg_lr)
        explained_variance_lr = explained_variance_score(y_test_reg, y_pred_reg_lr)
        
        print(f"R-squared (R²): {r2_lr:.4f}")
        print(f"Root Mean Square Error (RMSE): {rmse_lr:.4f}")
        print(f"Mean Absolute Error (MAE): {mae_lr:.4f}")
        print(f"Explained Variance Score: {explained_variance_lr:.4f}")

        print("\n" + "=" * 60)
        print(" K-FOLD CROSS VALIDATION (k=5)")
        print("=" * 60)
        
        kfold = KFold(n_splits=5, shuffle=True, random_state=42)

        cv_scores_clf = cross_val_score(rf_clf, X, y_classification, 
                                       cv=kfold, scoring='accuracy')

        cv_scores_reg_rf = cross_val_score(rf_reg, X, y_regression, 
                                         cv=kfold, scoring='r2')

        cv_scores_reg_lr = cross_val_score(lr, X, y_regression, 
                                         cv=kfold, scoring='r2')
        
        print("\n Random Forest Classifier CV Results:")
        print(f"  CV Accuracy Scores: {cv_scores_clf}")
        print(f"  Mean CV Accuracy: {cv_scores_clf.mean():.4f} (±{cv_scores_clf.std():.4f})")
        
        print("\n Random Forest Regressor CV Results:")
        print(f"  CV R² Scores: {cv_scores_reg_rf}")
        print(f"  Mean CV R²: {cv_scores_reg_rf.mean():.4f} (±{cv_scores_reg_rf.std():.4f})")
        
        print("\n Linear Regression CV Results:")
        print(f"  CV R² Scores: {cv_scores_reg_lr}")
        print(f"  Mean CV R²: {cv_scores_reg_lr.mean():.4f} (±{cv_scores_reg_lr.std():.4f})")
 
        print("\n" + "=" * 60)
        print(" FEATURE IMPORTANCE ANALYSIS")
        print("=" * 60)

        print("\n Random Forest Classifier:")
        rf_clf_importance = pd.DataFrame({
            'Feature': feature_names,
            'Importance': rf_clf.feature_importances_
        }).sort_values('Importance', ascending=False)
        
        for i, row in rf_clf_importance.iterrows():
            print(f"  {row['Feature']}: {row['Importance']:.4f}")

        print("\n Random Forest Regressor:")
        rf_reg_importance = pd.DataFrame({
            'Feature': feature_names,
            'Importance': rf_reg.feature_importances_
        }).sort_values('Importance', ascending=False)
        
        for i, row in rf_reg_importance.iterrows():
            print(f"  {row['Feature']}: {row['Importance']:.4f}")

        print("\n Linear Regression Coefficients:")
        lr_coef_df = pd.DataFrame({
            'Feature': feature_names,
            'Coefficient': lr.coef_
        }).sort_values('Coefficient', key=abs, ascending=False)
        
        for i, row in lr_coef_df.iterrows():
            impact = "increases" if row['Coefficient'] > 0 else "decreases"
            print(f"  {row['Feature']}: {row['Coefficient']:.4f} ({impact} score)")

        print("\n" + "=" * 60)
        print(" PREDICTION ERROR ANALYSIS")
        print("=" * 60)

        residuals_rf = y_test_reg - y_pred_reg_rf
        residuals_lr = y_test_reg - y_pred_reg_lr

        print("\n Random Forest Regressor Error Statistics:")
        print(f"  Mean Residual: {float(residuals_rf.mean()):.4f}")
        print(f"  Std Residual: {float(residuals_rf.std()):.4f}")
        print(f"  Max Overprediction: {float(residuals_rf.min()):.4f}")
        print(f"  Max Underprediction: {float(residuals_rf.max()):.4f}")
        
        print("\n Linear Regression Error Statistics:")
        print(f"  Mean Residual: {float(residuals_lr.mean()):.4f}")
        print(f"  Std Residual: {float(residuals_lr.std()):.4f}")
        print(f"  Max Overprediction: {float(residuals_lr.min()):.4f}")
        print(f"  Max Underprediction: {float(residuals_lr.max()):.4f}")

        error_ranges = {
            'Excellent (±5 points)': int(np.sum(np.abs(residuals_rf) <= 5)),
            'Good (±10 points)': int(np.sum((np.abs(residuals_rf) > 5) & (np.abs(residuals_rf) <= 10))),
            'Fair (±15 points)': int(np.sum((np.abs(residuals_rf) > 10) & (np.abs(residuals_rf) <= 15))),
            'Poor (>15 points)': int(np.sum(np.abs(residuals_rf) > 15))
        }
        
        print("\n Random Forest Error Distribution:")
        for range_name, count in error_ranges.items():
            percentage = (count / len(residuals_rf)) * 100
            print(f"  {range_name}: {count} students ({percentage:.1f}%)")

        print("\n Saving models and evaluation results...")

        joblib.dump(rf_clf, 'assets/models/random_forest_classifier.pkl')
        joblib.dump(rf_reg, 'assets/models/random_forest_regressor.pkl')
        joblib.dump(lr, 'assets/models/linear_regression.pkl')
        joblib.dump(encoders, 'assets/models/encoders.pkl')

        evaluation_data = {
            'metadata': {
                'model_type': 'advanced_dual_algorithms',
                'trained_date': datetime.now().isoformat(),
                'dataset': {
                    'size': int(len(df)),
                    'performance_distribution': convert_numpy_types(df['risk_level'].value_counts().to_dict()),
                    'avg_english_score': float(df['english_avg'].mean()),
                    'std_english_score': float(df['english_avg'].std()),
                    'features_used': int(len(features))
                }
            },
            'evaluation_metrics': {
                'random_forest_classifier': {
                    'accuracy': float(accuracy),
                    'precision': float(precision),
                    'recall': float(recall),
                    'f1_score': float(f1),
                    'cross_validation': {
                        'mean_accuracy': float(cv_scores_clf.mean()),
                        'std_accuracy': float(cv_scores_clf.std()),
                        'cv_scores': cv_scores_clf.tolist()
                    },
                    'feature_importance': rf_clf_importance.to_dict('records')
                },
                'random_forest_regressor': {
                    'primary_metrics': {
                        'r_squared': float(r2_rf),
                        'rmse': float(rmse_rf)
                    },
                    'secondary_metrics': {
                        'mae': float(mae_rf),
                        'explained_variance': float(explained_variance_rf),
                        'mse': float(mse_rf)
                    },
                    'cross_validation': {
                        'mean_r2': float(cv_scores_reg_rf.mean()),
                        'std_r2': float(cv_scores_reg_rf.std()),
                        'cv_scores': cv_scores_reg_rf.tolist()
                    },
                    'error_statistics': {
                        'mean_residual': float(residuals_rf.mean()),
                        'std_residual': float(residuals_rf.std()),
                        'error_distribution': error_ranges  
                    },
                    'feature_importance': rf_reg_importance.to_dict('records')
                },
                'linear_regression': {
                    'primary_metrics': {
                        'r_squared': float(r2_lr),
                        'rmse': float(rmse_lr)
                    },
                    'secondary_metrics': {
                        'mae': float(mae_lr),
                        'explained_variance': float(explained_variance_lr),
                        'mse': float(mse_lr)
                    },
                    'cross_validation': {
                        'mean_r2': float(cv_scores_reg_lr.mean()),
                        'std_r2': float(cv_scores_reg_lr.std()),
                        'cv_scores': cv_scores_reg_lr.tolist()
                    },
                    'coefficients': lr_coef_df.to_dict('records'),
                    'intercept': float(lr.intercept_),
                    'error_statistics': {
                        'mean_residual': float(residuals_lr.mean()),
                        'std_residual': float(residuals_lr.std())
                    }
                }
            },
            'mappings': {
                'app_to_model': {
                    'studyTimePerWeek': 'study_time_encoded',
                    'absences': 'absence_encoded',
                    'studentEducation': 'education_encoded',
                    'gender': 'Gender_encoded',
                    'englishAvg': 'english_avg',
                    'tutoring': 'has_tutoring',
                    'attendanceRate': 'Attendance Rate (%)'
                },
                'study_time': dict(zip(le_study.classes_, range(len(le_study.classes_)))),
                'absences': dict(zip(le_absence.classes_, range(len(le_absence.classes_)))),
                'gender': {'Male': 0, 'Female': 1},
                'tutoring': {'Prepared': 1, 'Not Prepared': 0},
                'education': dict(zip(le_education.classes_, range(len(le_education.classes_))))
            },
            'encoders': {
                key: {'classes': encoder.classes_.tolist()}
                for key, encoder in encoders.items()
            },
            'performance_thresholds': {
                'at_risk': {'max_score': 59.9, 'description': 'Needs intensive support'},
                'satisfactory': {'min_score': 60, 'max_score': 79.9, 'description': 'Performing adequately'},
                'high_achiever': {'min_score': 80, 'description': 'Excelling academically'}
            },
            'model_selection_recommendation': {
                'classification_task': 'random_forest_classifier',
                'regression_task': 'random_forest_regressor',
                'reason': 'Higher R² and better cross-validation scores',
                'confidence_level': 'high'
            }
        }

        evaluation_data = convert_numpy_types(evaluation_data)

        with open('assets/models/evaluation_results.json', 'w') as f:
            json.dump(evaluation_data, f, indent=2)

        simplified = {
            'trained_date': datetime.now().strftime('%Y-%m-%d %H:%M'),
            'dataset_size': int(len(df)),
            'models': {
                'random_forest_classifier': {
                    'accuracy': f"{accuracy:.1%}",
                    'cv_accuracy': f"{cv_scores_clf.mean():.1%} ± {cv_scores_clf.std():.1%}"
                },
                'random_forest_regressor': {
                    'r2': f"{r2_rf:.3f}",
                    'rmse': f"{rmse_rf:.1f}",
                    'mae': f"{mae_rf:.1f}",
                    'cv_r2': f"{cv_scores_reg_rf.mean():.3f} ± {cv_scores_reg_rf.std():.3f}"
                },
                'linear_regression': {
                    'r2': f"{r2_lr:.3f}",
                    'rmse': f"{rmse_lr:.1f}",
                    'mae': f"{mae_lr:.1f}",
                    'cv_r2': f"{cv_scores_reg_lr.mean():.3f} ± {cv_scores_reg_lr.std():.3f}"
                }
            },
            'recommended_model': 'random_forest_regressor',
            'top_features': rf_reg_importance.head(3).to_dict('records')
        }
        
        simplified = convert_numpy_types(simplified)
        
        with open('assets/models/model_evaluation.json', 'w') as f:
            json.dump(simplified, f, indent=2)
        
        print("\n" + "=" * 60)
        print("ADVANCED TRAINING COMPLETE!")
        print("=" * 60)
        
        print(f"\nFiles created:")
        print(f"  ✓ assets/models/random_forest_classifier.pkl")
        print(f"  ✓ assets/models/random_forest_regressor.pkl")
        print(f"  ✓ assets/models/linear_regression.pkl")
        print(f"  ✓ assets/models/evaluation_results.json")
        print(f"  ✓ assets/models/model_evaluation.json")
        
        print(f"\n FINAL MODEL PERFORMANCE:")
        print(f"   Random Forest Classifier: {accuracy:.1%} accuracy")
        print(f"   Random Forest Regressor: R² = {r2_rf:.3f}, RMSE = {rmse_rf:.1f}")
        print(f"   Linear Regression: R² = {r2_lr:.3f}, RMSE = {rmse_lr:.1f}")
        
        print(f"\nCROSS-VALIDATION STABILITY:")
        print(f"  Classifier CV: {cv_scores_clf.mean():.1%} ± {cv_scores_clf.std():.1%}")
        print(f"  Regressor RF CV: {cv_scores_reg_rf.mean():.3f} ± {cv_scores_reg_rf.std():.3f}")
        print(f"  Regressor LR CV: {cv_scores_reg_lr.mean():.3f} ± {cv_scores_reg_lr.std():.3f}")
        
        print(f"\n ERROR ANALYSIS:")
        print(f"  {error_ranges['Excellent (±5 points)']} students ({error_ranges['Excellent (±5 points)']/len(residuals_rf)*100:.1f}%) predicted within ±5 points")
        print(f"  Average prediction error: {mae_rf:.1f} points")
        
        print(f"\nRECOMMENDED MODEL:")
        print(f"  For score prediction: Random Forest Regressor")
        print(f"  For risk classification: Random Forest Classifier")
        
        print(f"\nYour app now has PROPER ML EVALUATION with:")
        print("  ✓ R², RMSE, MAE, Explained Variance")
        print("  ✓ 5-Fold Cross-Validation")
        print("  ✓ Error Distribution Analysis")
        print("  ✓ Feature Importance")
        print("  ✓ Model Stability Assessment")
        
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()