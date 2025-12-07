from flask import Blueprint, jsonify, request
from datetime import datetime
import joblib
import numpy as np
import os

try:
    from .ml_predictor import predict_student
except ImportError:

    def predict_student(student_data):
        writing = float(student_data.get('writingScore', 0))
        reading = float(student_data.get('readingScore', 0))
        speaking = float(student_data.get('speakingScore', 0))
        avg = (writing + reading + speaking) / 3
        
        if avg >= 80:
            risk = 'high_achiever'
            confidence = 0.9
        elif avg >= 60:
            risk = 'satisfactory'
            confidence = 0.85
        else:
            risk = 'at_risk'
            confidence = 0.8
        
        return {
            'riskLevel': risk,
            'confidence': confidence,
            'predictedScore': round(avg, 1),
            'englishAverage': round(avg, 1),
            'predictionMethod': 'fallback'
        }

from .models import db, Student, Prediction

api_bp = Blueprint('api', __name__)

classifier = None
encoders = None
model_loaded = False

def load_ml_models():
    """Load trained ML models"""
    global classifier, encoders, model_loaded
    
    try:

        model_paths = [
            'data/models/student-model.pkl',
            'assets/models/student-model.pkl',
            'student-model.pkl',
            '../data/models/student-model.pkl'
        ]
        
        encoder_paths = [
            'data/models/encoders.pkl',
            'assets/models/encoders.pkl',
            'encoders.pkl',
            '../data/models/encoders.pkl'
        ]
        
        model_path = None
        encoder_path = None

        for path in model_paths:
            if os.path.exists(path):
                model_path = path
                print(f" Found model at: {path}")
                break
        
        # Find encoder file
        for path in encoder_paths:
            if os.path.exists(path):
                encoder_path = path
                print(f" Found encoder at: {path}")
                break
        
        if model_path and encoder_path:
            classifier = joblib.load(model_path)
            encoders = joblib.load(encoder_path)
            model_loaded = True
            print(" ML Models loaded successfully!")
            print(f"   Model type: {type(classifier).__name__}")
            print(f"   Classes: {classifier.classes_}")
        else:
            print(" Model files not found, using fallback predictions")
            model_loaded = False
            
    except Exception as e:
        print(f"Error loading ML models: {e}")
        model_loaded = False

# Load models when module is imported
print("Loading ML models...")
load_ml_models()

def predict_with_ml_model(student_data):
    """Use actual trained ML model for prediction"""
    global classifier, encoders
    
    if not model_loaded or classifier is None or encoders is None:
        raise Exception("ML models not loaded")
    
    try:
        features = prepare_ml_features(student_data, encoders)

        prediction = classifier.predict([features])[0]
        probabilities = classifier.predict_proba([features])[0]

        class_mapping = {}
        for i, class_name in enumerate(classifier.classes_):
            class_mapping[class_name] = i

        confidence = float(probabilities[class_mapping[prediction]])

        writing = float(student_data.get('writingScore', 0))
        reading = float(student_data.get('readingScore', 0))
        speaking = float(student_data.get('speakingScore', 0))
        english_avg = (writing + reading + speaking) / 3

        probabilities_dict = {}
        for i, class_name in enumerate(classifier.classes_):
            probabilities_dict[class_name] = float(probabilities[i])
        
        return {
            'riskLevel': prediction,
            'confidence': confidence,
            'probabilities': probabilities_dict,
            'predictedScore': round(english_avg, 1),
            'englishAverage': round(english_avg, 1),
            'predictionMethod': 'random_forest',
            'modelInfo': {
                'type': 'RandomForest',
                'nEstimators': getattr(classifier, 'n_estimators', 'Unknown'),
                'nClasses': len(classifier.classes_),
                'classes': list(classifier.classes_)
            }
        }
        
    except Exception as e:
        print(f" ML prediction error: {e}")
        raise

def prepare_ml_features(student_data, encoders):
    """Convert student data to features for ML model"""
    features = []

    study_time = student_data.get('studyTimePerWeek', '2_to_5')
    try:
        if 'study_time' in encoders:
            features.append(encoders['study_time'].transform([study_time])[0])
        else:
            study_time_map = {'less_than_2': 0, '2_to_5': 1, '5_to_10': 2, 'more_than_10': 3}
            features.append(study_time_map.get(study_time, 1))
    except:
        features.append(1)  

    absences = student_data.get('absences', 'none')
    try:
        if 'absence' in encoders:
            features.append(encoders['absence'].transform([absences])[0])
        else:
            absences_map = {'none': 3, '1_to_5': 2, '6_to_10': 1, 'more_than_10': 0}
            features.append(absences_map.get(absences, 3))
    except:
        features.append(3)

    education = student_data.get('studentEducation', 'secondary')
    try:
        if 'education' in encoders:
            features.append(encoders['education'].transform([education])[0])
        else:
            education_map = {'secondary': 2, 'bachelors': 0, 'masters': 1, 'doctorate': 1}
            features.append(education_map.get(education, 2))
    except:
        features.append(2)
    
    gender = student_data.get('gender', 'female')
    try:
        if 'Gender' in encoders:
            features.append(encoders['Gender'].transform([gender])[0])
        else:
            features.append(1 if gender == 'female' else 0)
    except:
        features.append(1)

    features.append(float(student_data.get('attendanceRate', 65)))

    writing = float(student_data.get('writingScore', 0))
    reading = float(student_data.get('readingScore', 0))
    speaking = float(student_data.get('speakingScore', 0))
    english_avg = (writing + reading + speaking) / 3
    features.append(english_avg)

    tutoring = student_data.get('testPrep', 'not_prepared')
    features.append(1 if tutoring == 'prepared' else 0)
    
    
    return features

@api_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'Flask ML Backend is running',
        'ml_models_loaded': model_loaded,
        'model_type': 'RandomForest' if model_loaded else 'None',
        'timestamp': datetime.now().isoformat()
    })

@api_bp.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        print(f" Received prediction request for: {data.get('name', 'Unknown')}")

        prediction_result = None
        prediction_method = 'fallback'
        
        try:
            if model_loaded:
                prediction_result = predict_with_ml_model(data)
                prediction_method = 'random_forest'
                print(f" Using ML model prediction: {prediction_result['riskLevel']}")
            else:
                raise Exception("ML model not loaded")
        except Exception as ml_error:
            print(f" ML prediction failed, using fallback: {ml_error}")
            prediction_result = predict_student(data)
            prediction_method = 'simple_rules'
        
        if 'probabilities' not in prediction_result:
            risk = prediction_result['riskLevel']
            if risk == 'high_achiever':
                probabilities = {'at_risk': 0.05, 'satisfactory': 0.25, 'high_achiever': 0.70}
            elif risk == 'satisfactory':
                probabilities = {'at_risk': 0.15, 'satisfactory': 0.70, 'high_achiever': 0.15}
            else:  
                probabilities = {'at_risk': 0.70, 'satisfactory': 0.25, 'high_achiever': 0.05}
            prediction_result['probabilities'] = probabilities

        writing = float(data.get('writingScore', 0))
        reading = float(data.get('readingScore', 0))
        speaking = float(data.get('speakingScore', 0))
        english_avg = (writing + reading + speaking) / 3
        

        if 'factors' not in prediction_result:
            factors = []

            factors.append({
                'name': 'English Average Score',
                'value': f'{english_avg:.1f}/100',
                'impact': 0.867 if english_avg >= 70 else 0.567,
                'explanation': 'Primary performance indicator'
            })

            study_time = data.get('studyTimePerWeek', '2_to_5')
            factors.append({
                'name': 'Study Time',
                'value': study_time.replace('_', ' '),
                'impact': 0.010,
                'explanation': 'Weekly study commitment'
            })

            test_prep = data.get('testPrep', 'not_prepared')
            factors.append({
                'name': 'Test Preparation',
                'value': 'Prepared' if test_prep == 'prepared' else 'Not Prepared',
                'impact': 0.022 if test_prep == 'prepared' else 0.005,
                'explanation': 'Preparation level affects performance'
            })
            
            prediction_result['factors'] = factors

        if 'recommendations' not in prediction_result:
            recommendations = []
            risk = prediction_result['riskLevel']
            
            if risk == 'at_risk':
                recommendations = [
                    'Schedule intensive tutoring sessions (3+ times weekly)',
                    'Increase study time to at least 10 hours per week',
                    'Focus on foundational English skills',
                    'Use online resources for additional practice'
                ]
            elif risk == 'satisfactory':
                recommendations = [
                    'Maintain current study habits',
                    'Target specific weak areas',
                    'Join study groups for collaborative learning',
                    'Take practice tests regularly'
                ]
            else: 
                recommendations = [
                    'Challenge yourself with advanced materials',
                    'Consider mentoring other students',
                    'Explore academic competitions',
                    'Prepare for advanced English certifications'
                ]
            
            prediction_result['recommendations'] = recommendations

        prediction_result['predictionMethod'] = prediction_method
        prediction_result['modelLoaded'] = model_loaded

        student = Student(
            name=data.get('name', 'Unknown'),
            age=int(data.get('age', 0)),
            gender=data.get('gender', ''),
            student_education=data.get('studentEducation', ''),
            study_time_per_week=data.get('studyTimePerWeek', ''),
            absences=data.get('absences', ''),
            test_prep=data.get('testPrep', ''),
            writing_score=writing,
            reading_score=reading,
            speaking_score=speaking,
            english_avg=english_avg,
            extra_curricular=bool(data.get('extraCurricular', False)),
            internet_access=bool(data.get('internetAccess', True)),
            tutoring=bool(data.get('tutoring', False))
        )
        
        db.session.add(student)
        db.session.commit()
        print(f"Saved student to database: {student.name} (ID: {student.id})")

        prediction = Prediction(
            student_id=student.id,
            risk_level=prediction_result['riskLevel'],
            confidence=prediction_result['confidence'],
            predicted_score=prediction_result.get('predictedScore'),
            prediction_method=prediction_result['predictionMethod'],
            factors=prediction_result.get('factors', []),
            recommendations=prediction_result.get('recommendations', [])
        )
        
        db.session.add(prediction)
        db.session.commit()
        print(f"Saved prediction to database for student: {student.id}")

        prediction_result['student_id'] = student.id
        prediction_result['prediction_id'] = prediction.id
        
        response = {
            'success': True,
            'prediction': prediction_result,
            'database_saved': True,
            'prediction_date': datetime.now().isoformat(),
            'model_status': {
                'loaded': model_loaded,
                'type': 'RandomForest' if model_loaded else 'Fallback',
                'method_used': prediction_method
            }
        }
        
        print(f"Prediction completed for {student.name}: {prediction_result['riskLevel']}")
        return jsonify(response)
    
    except Exception as e:
        print(f' Error in predict: {e}')
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'success': False,
            'message': 'Prediction failed'
        }), 500

@api_bp.route('/model-info', methods=['GET'])
def model_info():
    """Get information about the loaded ML model"""
    try:
        if model_loaded and classifier is not None:
            info = {
                'status': 'loaded',
                'model_type': type(classifier).__name__,
                'n_estimators': getattr(classifier, 'n_estimators', 'Unknown'),
                'classes': list(classifier.classes_) if hasattr(classifier, 'classes_') else [],
                'n_classes': len(classifier.classes_) if hasattr(classifier, 'classes_') else 0,
                'n_features': classifier.n_features_in_ if hasattr(classifier, 'n_features_in_') else 'Unknown',
                'feature_importance': classifier.feature_importances_.tolist() if hasattr(classifier, 'feature_importances_') else []
            }
        else:
            info = {
                'status': 'not_loaded',
                'message': 'ML model not loaded or available'
            }
        
        return jsonify({
            'success': True,
            'model_info': info,
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/reload-models', methods=['POST'])
def reload_models():
    """Reload ML models (useful after training new models)"""
    try:
        load_ml_models()
        
        return jsonify({
            'success': True,
            'message': 'ML models reloaded',
            'model_loaded': model_loaded,
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500