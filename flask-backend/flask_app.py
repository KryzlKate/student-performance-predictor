from flask import Flask, jsonify, request
from flask_cors import CORS
import joblib
import numpy as np
import json
import os
from datetime import datetime

print("Starting Flask ML Backend...")
print("=" * 60)

app = Flask(__name__)
CORS(app, origins=[
    "https://student-performance-predictor-web-hk1z4k395-kryzlkates-projects.vercel.app",
    "https://student-performance-predictor-web-app-kryzlkates-projects.vercel.app",
    "http://localhost:8081",
    "http://localhost:19006"
]) 

@app.route('/test', methods=['GET'])
def test_connection():
    return jsonify({
        'status': 'success',
        'message': 'Flask backend is running',
        'timestamp': datetime.now().isoformat()
    }), 200

classifier = None
encoders = None
model_config = None
models_loaded = False

def load_ml_models():
    """Load trained ML models"""
    global classifier, encoders, model_config, models_loaded
    
    try:
        print(" Loading ML models...")

        config_path = 'models/model.json'
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                model_config = json.load(f)
            print(f" Model config loaded from: {config_path}")
        else:
            print(" model.json not found, using defaults")
            model_config = {
                'metadata': {'model_type': 'RandomForest', 'accuracy': 0.85}
            }

        model_path = 'models/student-model.pkl'
        if os.path.exists(model_path):
            classifier = joblib.load(model_path)
            print(f"   ML model loaded from: {model_path}")
            print(f"   Model type: {type(classifier).__name__}")
            print(f"   Classes: {classifier.classes_}")
        else:
            print(f" Model file not found: {model_path}")
            return False

        encoder_path = 'models/encoders.pkl'
        if os.path.exists(encoder_path):
            encoders = joblib.load(encoder_path)
            print(f" Encoders loaded from: {encoder_path}")
            if encoders:
                for key, encoder in encoders.items():
                    print(f"   {key}: {list(encoder.classes_)}")
        else:
            print(f" Encoders file not found: {encoder_path}")
            encoders = {}
        
        models_loaded = True
        print(" ML Models loaded successfully!")
        return True
        
    except Exception as e:
        print(f" Error loading ML models: {e}")
        import traceback
        traceback.print_exc()
        return False

models_loaded = load_ml_models()

def prepare_ml_features(student_data):
    features = []

    gender = student_data.get('gender', 'female')
    if encoders and 'gender' in encoders:
        try:
            features.append(encoders['gender'].transform([gender])[0])
        except:
            features.append(1 if gender.lower() == 'female' else 0)
    else:
        features.append(1 if gender.lower() == 'female' else 0)

    study_time = student_data.get('studyTimePerWeek', '2_to_5')
    if encoders and 'study_time' in encoders:
        try:
            features.append(encoders['study_time'].transform([study_time])[0])
        except:
            study_time_map = {'less_than_2': 0, '2_to_5': 1, '5_to_10': 2, 'more_than_10': 3}
            features.append(study_time_map.get(study_time, 1))
    else:
        study_time_map = {'less_than_2': 0, '2_to_5': 1, '5_to_10': 2, 'more_than_10': 3}
        features.append(study_time_map.get(study_time, 1))
    
    absences = student_data.get('absences', 'none')
    if encoders and 'attendance' in encoders:
        try:
            features.append(encoders['attendance'].transform([absences])[0])
        except:
            absences_map = {'none': 3, '1_to_5': 2, '6_to_10': 1, 'more_than_10': 0}
            features.append(absences_map.get(absences, 3))
    else:
        absences_map = {'none': 3, '1_to_5': 2, '6_to_10': 1, 'more_than_10': 0}
        features.append(absences_map.get(absences, 3))
    
    education = student_data.get('studentEducation', 'secondary')
    if encoders and 'education' in encoders:
        try:
            features.append(encoders['education'].transform([education])[0])
        except:
            education_map = {'secondary': 2, 'bachelors': 1, 'masters': 3, 'doctorate': 4}
            features.append(education_map.get(education, 2))
    else:
        education_map = {'secondary': 2, 'bachelors': 1, 'masters': 3, 'doctorate': 4}
        features.append(education_map.get(education, 2))
    
    attendance_rate = float(student_data.get('attendanceRate', 65))
    features.append(attendance_rate)
    
    writing = float(student_data.get('writingScore', 0))
    reading = float(student_data.get('readingScore', 0))
    speaking = float(student_data.get('speakingScore', 0))
    english_avg = (writing + reading + speaking) / 3
    features.append(english_avg)

    features.append(0)
    features.append(0)
    features.append(0)

    return features

def get_top_factors(student_data, english_avg):
    """Get top factors affecting prediction"""
    factors = []

    factors.append({
        'name': 'English Average Score',
        'value': f'{english_avg:.1f}/100',
        'impact': 0.905,
        'explanation': 'Most important predictor (90.5% impact)',
        'percentage': '90.5%'
    })

    study_time = student_data.get('studyTimePerWeek', '2_to_5')
    factors.append({
        'name': 'Study Time',
        'value': study_time.replace('_', ' '),
        'impact': 0.017,
        'explanation': 'Weekly study commitment',
        'percentage': '1.7%'
    })

    test_prep = student_data.get('testPrep', 'not_prepared')
    factors.append({
        'name': 'Test Preparation',
        'value': 'Prepared' if test_prep == 'prepared' else 'Not Prepared',
        'impact': 0.022,
        'explanation': 'Preparation level affects performance',
        'percentage': '2.2%'
    })
    
    return factors

def get_recommendations(risk_level, english_avg):
    """Generate personalized recommendations"""
    recommendations = []
    
    if risk_level == 'at_risk':
        recommendations = [
            'Schedule intensive tutoring sessions (3+ times weekly)',
            'Increase study time to at least 10 hours per week',
            'Focus on foundational grammar and vocabulary',
            'Use online resources for additional practice'
        ]
    elif risk_level == 'satisfactory':
        recommendations = [
            'Maintain current study habits',
            'Target specific weak areas in writing/reading/speaking',
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

    if english_avg < 60:
        recommendations.append('Focus on basic grammar and vocabulary building')
    elif english_avg < 70:
        recommendations.append('Practice reading comprehension daily')
    elif english_avg < 80:
        recommendations.append('Work on advanced writing techniques')
    
    return recommendations

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'ml_models_loaded': models_loaded,
        'model_type': 'RandomForest' if models_loaded else 'None',
        'accuracy': model_config.get('metadata', {}).get('accuracy', 0.995) if model_config else 0.85,
    })

@app.route('/predict', methods=['POST'])
def predict():
    """Main prediction endpoint"""
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
            
        print(f" Received prediction request for: {data.get('name', 'Unknown')}")
        
        writing = float(data.get('writingScore', 0))
        reading = float(data.get('readingScore', 0))
        speaking = float(data.get('speakingScore', 0))
        english_avg = (writing + reading + speaking) / 3
        
        prediction_result = None

        if models_loaded and classifier is not None:
            try:
                features = prepare_ml_features(data)
                prediction = classifier.predict([features])[0]
                probabilities = classifier.predict_proba([features])[0]
                
                class_index = list(classifier.classes_).index(prediction)
                confidence = float(probabilities[class_index])
                
                probabilities_dict = {}
                for i, class_name in enumerate(classifier.classes_):
                    probabilities_dict[class_name] = float(probabilities[i])
                
                prediction_result = {
                    'riskLevel': prediction,
                    'confidence': confidence,
                    'probabilities': probabilities_dict,
                    'predictionMethod': 'random_forest',
                    'modelLoaded': True
                }
                
                print(f" ML Prediction: {prediction} ({confidence:.1%} confidence)")
                
            except Exception as ml_error:
                print(f" ML prediction failed: {ml_error}")

        if prediction_result is None:
            if english_avg >= 80:
                risk = 'high_achiever'
                confidence = 0.9
            elif english_avg >= 60:
                risk = 'satisfactory'
                confidence = 0.85
            else:
                risk = 'at_risk'
                confidence = 0.8

            if english_avg >= 80:
                probabilities = {'at_risk': 0.05, 'satisfactory': 0.25, 'high_achiever': 0.70}
            elif english_avg >= 70:
                probabilities = {'at_risk': 0.15, 'satisfactory': 0.70, 'high_achiever': 0.15}
            elif english_avg >= 60:
                probabilities = {'at_risk': 0.30, 'satisfactory': 0.60, 'high_achiever': 0.10}
            else:
                probabilities = {'at_risk': 0.70, 'satisfactory': 0.25, 'high_achiever': 0.05}
            
            prediction_result = {
                'riskLevel': risk,
                'confidence': confidence,
                'probabilities': probabilities,
                'predictionMethod': 'simple_rules',
                'modelLoaded': models_loaded
            }

        prediction_result.update({
            'predictedScore': round(english_avg, 1),
            'englishAverage': round(english_avg, 1),
            'factors': get_top_factors(data, english_avg),
            'recommendations': get_recommendations(prediction_result['riskLevel'], english_avg),
            'modelInfo': {
                'type': 'RandomForest' if models_loaded else 'SimpleRules',
                'accuracy': model_config.get('metadata', {}).get('accuracy', 0.995) if model_config else 0.85,
                'featuresUsed': 6
            }
        })
        
        print(f" Prediction complete: {prediction_result['riskLevel']}")
        
        return jsonify({
            'success': True,
            'prediction': prediction_result,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f' Error in predict: {e}')
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/model-info', methods=['GET'])
def model_info():
    """Get information about the loaded ML model"""
    try:
        if models_loaded and classifier is not None:
            accuracy = 0.85  
            
            if model_config and 'metadata' in model_config:
                metadata = model_config['metadata']
        
                accuracy_keys = ['accuracy', 'test_accuracy', 'testing_accuracy', 'training_accuracy', 'model_accuracy']
                for key in accuracy_keys:
                    if key in metadata:
                        accuracy = metadata[key]
                        break
            
            info = {
                'status': 'loaded',
                'model_type': type(classifier).__name__,
                'accuracy': float(accuracy),
                'classes': classifier.classes_.tolist(),
                'n_features': classifier.n_features_in_ if hasattr(classifier, 'n_features_in_') else 6,
            }
            
            if hasattr(classifier, 'feature_importances_'):
                info['feature_importance'] = classifier.feature_importances_.tolist()
            else:
                info['feature_importance'] = []
                
        else:
            info = {
                'status': 'not_loaded',
                'message': 'Using fallback prediction system'
            }
        
        return jsonify({
            'success': True,
            'model_info': info,
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        print(f' Error in /model-info: {e}')
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    
    print(f"\n{'=' * 60}")
    print(f"Starting Flask Server:")
    print(f"  Host: 0.0.0.0")
    print(f"  Port: {port}")
    print(f"  Debug: {debug}")
    print(f"{'=' * 60}\n")
    
    app.run(host='0.0.0.0', port=port, debug=debug)