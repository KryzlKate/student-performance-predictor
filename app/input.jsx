import { useRouter } from 'expo-router';
import { ArrowRight, Check, Brain, Wifi, WifiOff } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';

import colors from '../constants/colors';
import { useStudents } from '../contexts/StudentContext';
import { predictWithML, testApiConnection } from '../utils/api'; 

const STUDENT_EDUCATION_OPTIONS = [
  { value: 'secondary', label: 'Secondary' },
  { value: 'bachelors', label: "Bachelor's" },
  { value: 'masters', label: "Master's" },
  { value: 'doctorate', label: 'Doctorate' },
];

const STUDY_TIME_OPTIONS = [
  { value: 'less_than_2', label: '< 2 hours/week' },
  { value: '2_to_5', label: '2-5 hours/week' },
  { value: '5_to_10', label: '5-10 hours/week' },
  { value: 'more_than_10', label: '> 10 hours/week' },
];

const ABSENCES_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: '1_to_5', label: '1-5 days' },
  { value: '6_to_10', label: '6-10 days' },
  { value: 'more_than_10', label: '> 10 days' },
];

const TEST_PREP_OPTIONS = [
  { value: 'prepared', label: 'Prepared' },
  { value: 'not_prepared', label: 'Not Prepared' },
];

export default function InputScreen() {
  const router = useRouter();
  const { addStudent, addPrediction } = useStudents();

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    studentEducation: 'secondary',
    studyTime: '2_to_5',
    absences: 'none',
    testPrep: 'not_prepared',
    writingScore: '',
    readingScore: '',
    speakingScore: '',
    extraCurricular: false,
    internetAccess: true,
    tutoring: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modelStatus, setModelStatus] = useState('Dual ML Algorithms (Local)');
  const [backendConnected, setBackendConnected] = useState(false);
  const [apiUrl, setApiUrl] = useState('http://localhost:5000');

  useEffect(() => {

    checkBackendConnection();

    const status = backendConnected 
      ? 'Dual ML Algorithms (Flask Backend) - Real ML'
      : 'Dual ML Algorithms (Local) - Using fallback';
    setModelStatus(status);
  }, [backendConnected]);

  const checkBackendConnection = async () => {
    try {
      const result = await testApiConnection();
      setBackendConnected(result.connected);
      
      if (result.connected) {
        console.log('Flask backend connected:', result.data);
      } else {
        console.log('Flask backend not connected, using local mode');
      }
    } catch (error) {
      console.error('Error checking backend:', error);
      setBackendConnected(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const { name, age, writingScore, readingScore, speakingScore } = formData;
    
    if (!name.trim()) {
      Alert.alert('Missing Information', 'Please enter student name');
      return false;
    }
    
    if (!age.trim()) {
      Alert.alert('Missing Information', 'Please enter age');
      return false;
    }
    
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 5 || ageNum > 100) {
      Alert.alert('Invalid Age', 'Please enter a valid age between 5 and 100');
      return false;
    }
    
    if (!writingScore.trim() || !readingScore.trim() || !speakingScore.trim()) {
      Alert.alert('Missing Scores', 'Please enter all test scores');
      return false;
    }
    
    const scores = [
      { value: writingScore, label: 'Writing' },
      { value: readingScore, label: 'Reading' },
      { value: speakingScore, label: 'Speaking' }
    ];
    
    for (const score of scores) {
      const num = parseFloat(score.value);
      if (isNaN(num) || num < 0 || num > 100) {
        Alert.alert('Invalid Score', `Please enter a valid ${score.label} Score between 0 and 100`);
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    const {
      name, age, gender, studentEducation, studyTime, absences, testPrep,
      writingScore, readingScore, speakingScore,
      extraCurricular, internetAccess, tutoring
    } = formData;
    
    const writing = parseFloat(writingScore);
    const reading = parseFloat(readingScore);
    const speaking = parseFloat(speakingScore);
    const englishAvg = (writing + reading + speaking) / 3;
    
    const studentData = {
      id: Date.now().toString(),
      name: name.trim(),
      age: parseInt(age, 10),
      gender,
      studentEducation,
      studyTimePerWeek: studyTime,
      absences,
      testPrep,
      writingScore: writing,
      readingScore: reading,
      speakingScore: speaking,
      englishAvg: parseFloat(englishAvg.toFixed(2)),
      extraCurricular,
      internetAccess,
      tutoring,
      attendanceRate: 65, 
      createdAt: new Date().toISOString(),
    };
    
    console.log(' Creating student data:', studentData);
    
    try {

      const studentAdded = await addStudent(studentData);
      console.log(' Student added to context:', studentAdded);
      
      console.log(' Getting ML prediction...');
      let prediction;
      
      try {
        prediction = await predictWithML(studentData);
        console.log(' ML Prediction generated:', prediction);
      } catch (predictionError) {
        console.error(' Prediction failed, using fallback:', predictionError);
        
        prediction = {
          studentId: studentData.id,
          riskLevel: englishAvg >= 80 ? 'high_achiever' : englishAvg >= 60 ? 'satisfactory' : 'at_risk',
          probabilities: {
            at_risk: englishAvg < 60 ? 0.7 : englishAvg < 70 ? 0.3 : 0.1,
            satisfactory: englishAvg >= 80 ? 0.2 : englishAvg >= 60 ? 0.6 : 0.3,
            high_achiever: englishAvg >= 80 ? 0.7 : englishAvg >= 70 ? 0.1 : 0.0
          },
          confidence: Math.min(0.95, 0.7 + (englishAvg / 100) * 0.25),
          predictionMethod: 'fallback_algorithm',
          modelVersion: '1.0',
          createdAt: new Date().toISOString(),
          englishAverage: englishAvg,
        };
      }

      if (!prediction.studentId) {
        prediction.studentId = studentData.id;
      }

      await addPrediction(prediction);
      console.log(' Prediction saved to context');

      setIsSubmitting(false);

      router.push(`/results?studentId=${studentData.id}`);
      
    } catch (error) {
      console.error(' Full submission error:', error);
      setIsSubmitting(false);
      
      Alert.alert(
        'Error',
        'There was an error processing your request. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const writingNum = parseFloat(formData.writingScore) || 0;
  const readingNum = parseFloat(formData.readingScore) || 0;
  const speakingNum = parseFloat(formData.speakingScore) || 0;
  const englishAvg = (writingNum + readingNum + speakingNum) / 3;

  const isValid = formData.name.trim() && formData.age.trim() && 
                  formData.writingScore.trim() && formData.readingScore.trim() && 
                  formData.speakingScore.trim();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        
        <View style={styles.modelBanner}>
          <View style={styles.modelBannerHeader}>
            <Brain size={24} color={colors.primary} />
            <Text style={styles.modelBannerTitle}>Student Academic Performance Predictor</Text>
          </View>
          <Text style={styles.modelBannerText}>
            Using DUAL Machine Learning algorithms trained on 1,000 student records in the Philippines.
          </Text>
          
          <View style={styles.statusRow}>
            <View style={styles.modelStatusContainer}>
              <Text style={styles.modelStatusText}>{modelStatus}</Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.connectionStatus, { 
                backgroundColor: backendConnected ? colors.success + '20' : colors.warning + '20' 
              }]}
              onPress={checkBackendConnection}
            >
              {backendConnected ? (
                <Wifi size={16} color={colors.success} />
              ) : (
                <WifiOff size={16} color={colors.warning} />
              )}
              <Text style={[styles.connectionText, { 
                color: backendConnected ? colors.success : colors.warning 
              }]}>
                {backendConnected ? 'Flask Connected' : 'Local Mode'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Student Name *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              placeholder="Enter student name"
              placeholderTextColor={colors.textLight}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Age *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.age}
              onChangeText={(value) => handleInputChange('age', value)}
              placeholder="Enter age "
              placeholderTextColor={colors.textLight}
              keyboardType="numeric"
              maxLength={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  formData.gender === 'male' && styles.segmentButtonActive,
                ]}
                onPress={() => handleInputChange('gender', 'male')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    formData.gender === 'male' && styles.segmentTextActive,
                  ]}
                >
                  Male
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  formData.gender === 'female' && styles.segmentButtonActive,
                ]}
                onPress={() => handleInputChange('gender', 'female')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    formData.gender === 'female' && styles.segmentTextActive,
                  ]}
                >
                  Female
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Academic Performance</Text>
          <Text style={styles.sectionSubtext}>English Language Assessment Scores.</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Test Preparation *</Text>
            <View style={styles.optionsGrid}>
              {TEST_PREP_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionChip,
                    formData.testPrep === option.value && styles.optionChipActive,
                  ]}
                  onPress={() => handleInputChange('testPrep', option.value)}
                >
                  {formData.testPrep === option.value && (
                    <Check size={16} color={colors.surface} />
                  )}
                  <Text
                    style={[
                      styles.optionChipText,
                      formData.testPrep === option.value && styles.optionChipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Writing Score *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.writingScore}
              onChangeText={(value) => handleInputChange('writingScore', value)}
              placeholder="Enter Writing Score (0-100)"
              placeholderTextColor={colors.textLight}
              keyboardType="numeric"
              maxLength={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Reading Score *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.readingScore}
              onChangeText={(value) => handleInputChange('readingScore', value)}
              placeholder="Enter Reading Score (0-100)"
              placeholderTextColor={colors.textLight}
              keyboardType="numeric"
              maxLength={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Speaking Score *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.speakingScore}
              onChangeText={(value) => handleInputChange('speakingScore', value)}
              placeholder="Enter Speaking Score (0-100)"
              placeholderTextColor={colors.textLight}
              keyboardType="numeric"
              maxLength={3}
            />
          </View>

          {(formData.writingScore || formData.readingScore || formData.speakingScore) && (
            <View style={styles.englishAvgContainer}>
              <Text style={styles.englishAvgLabel}>Academic Average:</Text>
              <View style={styles.englishAvgValueContainer}>
                <Text style={[
                  styles.englishAvgValue,
                  englishAvg >= 80 ? styles.highScore :
                  englishAvg >= 60 ? styles.mediumScore :
                  styles.lowScore
                ]}>
                  {englishAvg.toFixed(1)}/100
                </Text>
                <View 
                  style={[
                    styles.englishAvgBar,
                    { width: `${Math.min(100, englishAvg)}%` },
                    englishAvg >= 80 ? styles.englishAvgBarHigh :
                    englishAvg >= 60 ? styles.englishAvgBarMedium :
                    styles.englishAvgBarLow
                  ]}
                />
              </View>
              <Text style={styles.englishAvgLevel}>
                {englishAvg >= 80 ? 'High' :
                 englishAvg >= 60 ? 'Medium' : 'Low'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Study Habits</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Student's Education Level</Text>
            <View style={styles.optionsGrid}>
              {STUDENT_EDUCATION_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionChip,
                    formData.studentEducation === option.value && styles.optionChipActive,
                  ]}
                  onPress={() => handleInputChange('studentEducation', option.value)}
                >
                  {formData.studentEducation === option.value && (
                    <Check size={16} color={colors.surface} />
                  )}
                  <Text
                    style={[
                      styles.optionChipText,
                      formData.studentEducation === option.value && styles.optionChipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Study Time Per Week</Text>
            <View style={styles.optionsGrid}>
              {STUDY_TIME_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionChip,
                    formData.studyTime === option.value && styles.optionChipActive,
                  ]}
                  onPress={() => handleInputChange('studyTime', option.value)}
                >
                  {formData.studyTime === option.value && (
                    <Check size={16} color={colors.surface} />
                  )}
                  <Text
                    style={[
                      styles.optionChipText,
                      formData.studyTime === option.value && styles.optionChipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Absences</Text>
            <View style={styles.optionsGrid}>
              {ABSENCES_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionChip,
                    formData.absences === option.value && styles.optionChipActive,
                  ]}
                  onPress={() => handleInputChange('absences', option.value)}
                >
                  {formData.absences === option.value && (
                    <Check size={16} color={colors.surface} />
                  )}
                  <Text
                    style={[
                      styles.optionChipText,
                      formData.absences === option.value && styles.optionChipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Factors</Text>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.switchLabelText}>Extra-Curricular Activities</Text>
              <Text style={styles.switchLabelSubtext}>
                Sports, clubs, or other activities
              </Text>
            </View>
            <Switch
              value={formData.extraCurricular}
              onValueChange={(value) => handleInputChange('extraCurricular', value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.switchLabelText}>Internet Access at Home</Text>
              <Text style={styles.switchLabelSubtext}>
                Access to online resources
              </Text>
            </View>
            <Switch
              value={formData.internetAccess}
              onValueChange={(value) => handleInputChange('internetAccess', value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.switchLabelText}>Currently in Tutoring</Text>
              <Text style={styles.switchLabelSubtext}>
                Receiving additional support
              </Text>
            </View>
            <Switch
              value={formData.tutoring}
              onValueChange={(value) => handleInputChange('tutoring', value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, (!isValid || isSubmitting) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || isSubmitting}
          activeOpacity={0.8}
        >
          <View style={styles.submitButtonContent}>
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.surface} style={styles.mlIcon} />
            ) : (
              <Brain size={20} color={colors.surface} style={styles.mlIcon} />
            )}
            <Text style={styles.submitButtonText}>
              {isSubmitting 
                ? (backendConnected ? 'Analyzing with Real ML...' : 'Analyzing with AI...')
                : (backendConnected ? 'Generate Real ML Prediction' : 'Generate AI Prediction')
              }
            </Text>
            {!isSubmitting && <ArrowRight size={20} color={colors.surface} />}
          </View>
          <Text style={styles.mlIndicator}>
            {backendConnected 
              ? 'Powered by Flask + Random Forest (Real ML)' 
              : 'Powered by Random Forest + Linear Regression (Local)'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  modelBanner: {
    backgroundColor: colors.primary + '15',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.primary + '50',
  },
  modelBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  modelBannerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
  },
  modelBannerText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  modelStatusContainer: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
    marginRight: 8,
  },
  modelStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  connectionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  sectionSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 25,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 2,
    borderColor: colors.border,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  segmentTextActive: {
    color: colors.surface,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  optionChipTextActive: {
    color: colors.surface,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  switchLabel: {
    flex: 1,
    marginRight: 16,
  },
  switchLabelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  switchLabelSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mlIcon: {
    marginRight: 4,
  },
  submitButtonDisabled: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.surface,
  },
  mlIndicator: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    textAlign: 'center',
  },
  englishAvgContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
    marginTop: 8,
  },
  englishAvgLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  englishAvgValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  englishAvgValue: {
    fontSize: 24,
    fontWeight: '700',
    marginRight: 12,
    minWidth: 80,
  },
  englishAvgBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
  },
  englishAvgBarHigh: {
    backgroundColor: colors.success,
  },
  englishAvgBarMedium: {
    backgroundColor: colors.warning,
  },
  englishAvgBarLow: {
    backgroundColor: colors.danger,
  },
  englishAvgLevel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  highScore: {
    color: colors.success,
  },
  mediumScore: {
    color: colors.warning,
  },
  lowScore: {
    color: colors.danger,
  },
});