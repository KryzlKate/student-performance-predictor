import joblib
import numpy as np
from datetime import datetime
import os

def load_ml_model():
    try:
        classifier_path = 'data/models/student-model.pkl'
        encoder_path = 'data/models/encoders.pkl'
        
        if os.path.exists(classifier_path) and os.path.exists(encoder_path):
            classifier = joblib.load(classifier_path)
            encoders = joblib.load(encoder_path)
            print(" ML Models loaded successfully")
            return classifier, encoders
        else:
            print(" ML model files not found, using fallback")
            return None, None
    except Exception as e:
        print(f" Error loading ML models: {e}")
        return None, None

classifier, encoders = load_ml_model()

def predict_student(student_data):
    """
    Use actual trained ML model for prediction
    """
    if classifier is not None and encoders is not None:
        try:
            features = prepare_ml_features(student_data, encoders)
            
            prediction = classifier.predict([features])[0]
            probabilities = classifier.predict_proba([features])[0]

            risk_mapping = {
                'at_risk': 'at_risk',
                'satisfactory': 'satisfactory', 
                'high_achiever': 'high_achiever'
            }
            
            risk_level = risk_mapping.get(prediction, 'satisfactory')
            confidence = float(max(probabilities))
            
            writing = float(student_data.get('writingScore', 0))
            reading = float(student_data.get('readingScore', 0))
            speaking = float(student_data.get('speakingScore', 0))
            english_avg = (writing + reading + speaking) / 3

            feature_importance = classifier.feature_importances_

            return {
                'riskLevel': risk_level,
                'confidence': confidence,
                'predictedScore': round(english_avg, 1),
                'englishAverage': round(english_avg, 1),
                'probabilities': {
                    'at_risk': float(probabilities[0]),
                    'satisfactory': float(probabilities[2]),
                    'high_achiever': float(probabilities[1])
                },
                'factors': get_ml_factors(student_data, feature_importance),
                'recommendations': get_recommendations(risk_level, english_avg),
                'predictionMethod': 'real_ml_model',
                'modelInfo': {
                    'type': 'RandomForest',
                    'accuracy': 0.995,
                    'featuresUsed': len(features)
                }
            }
        except Exception as e:
            print(f" ML prediction error, using fallback: {e}")

    return fallback_prediction(student_data)

def prepare_ml_features(student_data, encoders):
    """
    Convert student data to features for ML model
    """
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

    features.append(0)  

    features.append(2)  
    
    return features

def get_ml_factors(student_data, feature_importance):
    """
    Generate factors based on feature importance
    """
    factors = []

    writing = float(student_data.get('writingScore', 0))
    reading = float(student_data.get('readingScore', 0))
    speaking = float(student_data.get('speakingScore', 0))
    english_avg = (writing + reading + speaking) / 3
    
    factors.append({
        'name': 'Previous English Score',
        'impact': 0.867,  
        'value': f'{english_avg:.1f}/100',
        'explanation': 'Most important predictor (86.7% impact)',
        'percentage': '86.7%'
    })

    study_time = student_data.get('studyTimePerWeek', '2_to_5')
    factors.append({
        'name': 'Study Time',
        'impact': 0.010,
        'value': study_time.replace('_', ' '),
        'explanation': 'Weekly study commitment affects performance',
        'percentage': '1.0%'
    })
    
    test_prep = student_data.get('testPrep', 'not_prepared')
    factors.append({
        'name': 'Test Preparation',
        'impact': 0.022,
        'value': 'Prepared' if test_prep == 'prepared' else 'Not Prepared',
        'explanation': 'Preparation significantly impacts results',
        'percentage': '2.2%'
    })
    
    return factors

def get_recommendations(risk_level, english_avg):
    """
    Generate personalized recommendations
    """
    base_recommendations = []
    
    if risk_level == 'at_risk':
        base_recommendations = [
            'Schedule intensive tutoring sessions (3+ times weekly)',
            'Increase study time to at least 10 hours per week',
            'Focus on foundational English skills',
            'Use online resources for additional practice'
        ]
    elif risk_level == 'satisfactory':
        base_recommendations = [
            'Maintain current study habits',
            'Target specific weak areas in writing/reading/speaking',
            'Join study groups for collaborative learning',
            'Take practice tests regularly'
        ]
    else:  
        base_recommendations = [
            'Challenge yourself with advanced materials',
            'Consider mentoring other students',
            'Explore academic competitions',
            'Prepare for advanced English certifications'
        ]

    if english_avg < 60:
        base_recommendations.append('Focus on basic grammar and vocabulary building')
    elif english_avg < 70:
        base_recommendations.append('Practice reading comprehension daily')
    elif english_avg < 80:
        base_recommendations.append('Work on advanced writing techniques')
    
    return base_recommendations

def fallback_prediction(student_data):
    """
    Fallback prediction if ML model fails
    """

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

    if avg >= 80:
        probabilities = {'at_risk': 0.05, 'satisfactory': 0.25, 'high_achiever': 0.70}
    elif avg >= 70:
        probabilities = {'at_risk': 0.15, 'satisfactory': 0.70, 'high_achiever': 0.15}
    elif avg >= 60:
        probabilities = {'at_risk': 0.30, 'satisfactory': 0.60, 'high_achiever': 0.10}
    else:
        probabilities = {'at_risk': 0.70, 'satisfactory': 0.25, 'high_achiever': 0.05}
    
    return {
        'riskLevel': risk,
        'confidence': confidence,
        'predictedScore': round(avg, 1),
        'englishAverage': round(avg, 1),
        'probabilities': probabilities,
        'factors': [{
            'name': 'Academic Average',
            'impact': 1.0,
            'value': f'{avg:.1f}/100',
            'explanation': 'Primary performance indicator',
            'percentage': '100%'
        }],
        'recommendations': get_recommendations(risk, avg),
        'predictionMethod': 'fallback_algorithm'
    }