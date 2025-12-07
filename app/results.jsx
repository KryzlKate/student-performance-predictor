import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertCircle,
  CheckCircle,
  TrendingUp,
  ArrowLeft,
  Lightbulb,
  BookOpen,
  Check,
  X,
  BarChart3,
} from 'lucide-react-native';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';

import colors from '../constants/colors';
import { useStudents } from '../contexts/StudentContext';

const RISK_CONFIG = {
  at_risk: {
    label: 'At Risk',
    color: colors.atRisk,
    bgColor: colors.atRiskLight,
    icon: AlertCircle,
    description: 'This student may need additional support',
  },
  satisfactory: {
    label: 'Satisfactory',
    color: colors.satisfactory,
    bgColor: colors.satisfactoryLight,
    icon: TrendingUp,
    description: 'This student is performing adequately',
  },
  high_achiever: {
    label: 'High Achiever',
    color: colors.highAchiever,
    bgColor: colors.highAchieverLight,
    icon: CheckCircle,
    description: 'This student is excelling academically',
  },
};

const calculateProbabilities = (englishAvg) => {
  if (englishAvg >= 80) {
    return { at_risk: 0.05, satisfactory: 0.25, high_achiever: 0.70 };
  } else if (englishAvg >= 70) {
    return { at_risk: 0.15, satisfactory: 0.70, high_achiever: 0.15 };
  } else if (englishAvg >= 60) {
    return { at_risk: 0.30, satisfactory: 0.60, high_achiever: 0.10 };
  } else {
    return { at_risk: 0.70, satisfactory: 0.25, high_achiever: 0.05 };
  }
};

const calculateCorrectRiskLevel = (student, englishAvg) => {

  const readingScore = student.readingScore || 0;
  
  if (englishAvg >= 80) {
    return 'high_achiever';
  } else if (englishAvg >= 60) {

    if (englishAvg >= 70 && readingScore >= 60) {
      return 'satisfactory';
    } else if (englishAvg >= 70 && readingScore < 60) {
      return 'at_risk';
    } else if (englishAvg >= 60) {
      return 'satisfactory';
    }
  }
  return 'at_risk';
};

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const studentId = params.studentId;

  const { getStudent, getPrediction } = useStudents();

  const student = getStudent(studentId);
  const rawPrediction = getPrediction(studentId);

  if (!student) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <AlertCircle size={64} color={colors.danger} />
          <Text style={styles.errorText}>Student data not found</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => router.back()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const englishAvg = student.englishAvg || 
    ((student.writingScore || 0) + (student.readingScore || 0) + (student.speakingScore || 0)) / 3;

  console.log('=== RESULTS SCREEN DEBUG ===');
  console.log('Student:', student.name);
  console.log('Scores:', {
    writing: student.writingScore,
    reading: student.readingScore,
    speaking: student.speakingScore,
    average: englishAvg.toFixed(1)
  });
  console.log('Raw prediction:', rawPrediction);

  const correctRiskLevel = calculateCorrectRiskLevel(student, englishAvg);
  console.log('Correct risk level based on scores:', correctRiskLevel);

  const calculatedProbabilities = calculateProbabilities(englishAvg);

  const finalPrediction = {

    ...(rawPrediction || {}),

    riskLevel: correctRiskLevel,
    probabilities: calculatedProbabilities,
    confidence: Math.max(0.8, Math.min(0.95, 0.8 + (englishAvg - 60) / 40 * 0.15)),
    factors: rawPrediction?.factors || [
      {
        name: 'English Average Score',
        value: `${englishAvg.toFixed(1)}/100`,
        impact: (englishAvg - 70) / 100,
        percentage: 'Primary Factor',
        explanation: englishAvg >= 70 ? 
          'Good overall performance indicates satisfactory progress' :
          'Average score suggests need for additional support'
      },
      {
        name: 'Test Preparation',
        value: student.testPrep === 'prepared' ? 'Prepared' : 'Not Prepared',
        impact: student.testPrep === 'prepared' ? 0.15 : -0.15,
        percentage: 'Important Factor',
        explanation: student.testPrep === 'prepared' ?
          'Preparation contributes positively to performance' :
          'Lack of preparation may affect test results'
      }
    ],
    recommendations: rawPrediction?.recommendations || [
      englishAvg < 70 ? 'Consider additional English tutoring sessions' : 'Continue current study patterns',
      student.readingScore < 70 ? 'Focus on reading comprehension exercises' : 'Maintain reading practice',
      'Regular practice tests to track progress'
    ]
  };

  console.log('Final prediction to display:', finalPrediction);
  console.log('=== END DEBUG ===');

  const config = RISK_CONFIG[finalPrediction.riskLevel];
  const Icon = config.icon;

  const testPrep = student.testPrep || 'not_prepared';
  const isPrepared = testPrep === 'prepared';

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        <View style={[styles.resultCard, { backgroundColor: config.bgColor }]}>
          <View style={[styles.iconCircle, { backgroundColor: config.color }]}>
            <Icon size={40} color={colors.surface} strokeWidth={2} />
          </View>
          <Text style={[styles.resultLabel, { color: config.color }]}>
            {config.label}
          </Text>
          <Text style={styles.studentName}>{student.name}</Text>
          <Text style={[styles.resultDescription, { color: config.color }]}>
            {config.description}
          </Text>
          
          <View style={styles.englishScoresContainer}>
            <View style={styles.scoresHeader}>
              <BookOpen size={20} color={config.color} />
              <Text style={[styles.scoresTitle, { color: config.color }]}>
                Academic Performance
              </Text>
            </View>
            
            <View style={styles.scoreGrid}>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>Writing</Text>
                <Text style={[
                  styles.scoreValue,
                  { color: (student.writingScore || 0) >= 60 ? colors.success : colors.danger }
                ]}>
                  {student.writingScore || 0}/100
                </Text>
              </View>
              
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>Reading</Text>
                <Text style={[
                  styles.scoreValue,
                  { 
                    color: (student.readingScore || 0) >= 70 ? colors.success : 
                           (student.readingScore || 0) >= 60 ? colors.warning : colors.danger,
                    fontWeight: '600'
                  }
                ]}>
                  {student.readingScore || 0}/100
                </Text>
              </View>
              
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>Speaking</Text>
                <Text style={[
                  styles.scoreValue,
                  { color: (student.speakingScore || 0) >= 60 ? colors.success : colors.danger }
                ]}>
                  {student.speakingScore || 0}/100
                </Text>
              </View>
            </View>
            
            <View style={styles.averageContainer}>
              <Text style={styles.averageLabel}>Average:</Text>
              <Text style={[
                styles.averageValue,
                { 
                  color: englishAvg >= 80 ? colors.highAchiever : 
                         englishAvg >= 70 ? colors.satisfactory :
                         englishAvg >= 60 ? colors.warning : colors.atRisk,
                  fontWeight: '700'
                }
              ]}>
                {englishAvg.toFixed(1)}/100
              </Text>
            </View>
            
            <View style={styles.scoreInterpretation}>
              <Text style={styles.interpretationText}>
                {englishAvg >= 80 ? 'Excellent performance!' :
                 englishAvg >= 70 ? 'Good performance' :
                 englishAvg >= 60 ? 'Adequate performance' :
                 'Needs improvement'}
              </Text>
            </View>
            
            <View style={styles.testPrepContainer}>
              <View style={styles.testPrepRow}>
                <View style={styles.testPrepIcon}>
                  {isPrepared ? (
                    <Check size={16} color={colors.success} />
                  ) : (
                    <X size={16} color={colors.danger} />
                  )}
                </View>
                <Text style={styles.testPrepLabel}>Test Preparation:</Text>
                <Text style={[
                  styles.testPrepValue,
                  { color: isPrepared ? colors.success : colors.danger }
                ]}>
                  {isPrepared ? 'Prepared' : 'Not Prepared'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.probabilitiesSection}>
            <View style={styles.probabilitiesHeader}>
              <BarChart3 size={18} color={config.color} />
              <Text style={[styles.probabilitiesTitle, { color: config.color }]}>
                Prediction Breakdown
              </Text>
            </View>
            
            <View style={styles.probabilitiesContainer}>
              <View style={styles.probabilityRow}>
                <View style={[styles.probabilityDot, { backgroundColor: colors.atRisk }]} />
                <Text style={styles.probabilityLabel}>At Risk</Text>
                <Text style={[styles.probabilityValue, { color: colors.atRisk }]}>
                  {(finalPrediction.probabilities.at_risk * 100).toFixed(1)}%
                </Text>
              </View>
              
              <View style={styles.probabilityRow}>
                <View style={[styles.probabilityDot, { backgroundColor: colors.satisfactory }]} />
                <Text style={styles.probabilityLabel}>Satisfactory</Text>
                <Text style={[styles.probabilityValue, { color: colors.satisfactory }]}>
                  {(finalPrediction.probabilities.satisfactory * 100).toFixed(1)}%
                </Text>
              </View>
              
              <View style={styles.probabilityRow}>
                <View style={[styles.probabilityDot, { backgroundColor: colors.highAchiever }]} />
                <Text style={styles.probabilityLabel}>High Achiever</Text>
                <Text style={[styles.probabilityValue, { color: colors.highAchiever }]}>
                  {(finalPrediction.probabilities.high_achiever * 100).toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.confidenceContainer}>
            <Text style={styles.confidenceLabel}>Prediction Confidence</Text>
            <Text style={styles.confidenceValue}>
              {(finalPrediction.confidence * 100).toFixed(0)}%
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Factors</Text>
          <Text style={styles.sectionSubtitle}>
            These factors have the most impact on the prediction
          </Text>
          <View style={styles.factorsContainer}>
            {finalPrediction.factors?.slice(0, 5).map((factor, index) => (
              <View key={index} style={styles.factorCard}>
                <View style={styles.factorHeader}>
                  <View style={styles.factorNameContainer}>
                    <Text style={styles.factorName}>{factor.name}</Text>
                    {factor.details && (
                      <Text style={styles.factorDetails}>{factor.details}</Text>
                    )}
                  </View>
                  <Text style={styles.factorValue}>{factor.value}</Text>
                </View>
                <View style={styles.impactBar}>
                  <View
                    style={[
                      styles.impactFill,
                      {
                        width: `${Math.min(100, Math.abs(factor.impact) * 100)}%`,
                        backgroundColor: factor.impact > 0 ? colors.success : colors.danger,
                      },
                    ]}
                  />
                </View>
                
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.recommendationHeader}>
            <Lightbulb size={24} color={colors.warning} />
            <Text style={styles.sectionTitle}>Recommendations</Text>
          </View>
          <View style={styles.recommendationsContainer}>
            {finalPrediction.recommendations?.map((recommendation, index) => (
              <View key={index} style={styles.recommendationCard}>
                <View style={styles.recommendationNumber}>
                  <Text style={styles.recommendationNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.recommendationText}>{recommendation}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Student Details</Text>
          <View style={styles.detailsContainer}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Age:</Text>
              <Text style={styles.detailValue}>{student.age}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Education Level:</Text>
              <Text style={styles.detailValue}>
                {student.studentEducation === 'secondary' ? 'Secondary' :
                 student.studentEducation === 'bachelors' ? "Bachelor's" :
                 student.studentEducation === 'masters' ? "Master's" : 'Doctorate'}
              </Text>
            </View>
            {student.studyTimePerWeek && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Study Time:</Text>
                <Text style={[
                  styles.detailValue,
                  { 
                    color: student.studyTimePerWeek === 'more_than_10' ? colors.success :
                           student.studyTimePerWeek === 'less_than_2' ? colors.danger : colors.textSecondary
                  }
                ]}>
                  {student.studyTimePerWeek.replace(/_/g, ' ')}
                </Text>
              </View>
            )}
            {student.absences && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Absences:</Text>
                <Text style={[
                  styles.detailValue,
                  { 
                    color: student.absences === 'none' ? colors.success : 
                           student.absences === 'more_than_10' ? colors.danger : colors.textSecondary
                  }
                ]}>
                  {student.absences === 'none' ? 'None' : 
                   student.absences === '1_to_5' ? '1-5 days' :
                   student.absences === '6_to_10' ? '6-10 days' : 
                   student.absences ? '>10 days' : 'Not specified'}
                </Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/')}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color={colors.primary} />
          <Text style={styles.backButtonText}>Back to Home</Text>
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
  adjustedBanner: {
    backgroundColor: colors.info,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  adjustedText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  resultCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  resultLabel: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  studentName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  resultDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  englishScoresContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  scoresHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  scoresTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scoreGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  scoreItem: {
    alignItems: 'center',
    flex: 1,
  },
  scoreLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  averageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  averageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  averageValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  scoreInterpretation: {
    alignItems: 'center',
    marginBottom: 12,
  },
  interpretationText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    fontStyle: 'italic',
  },
  testPrepContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
  },
  testPrepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  testPrepIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testPrepLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  testPrepValue: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 'auto',
  },
  // Probabilities Section
  probabilitiesSection: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  probabilitiesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  probabilitiesTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  probabilitiesContainer: {
    gap: 12,
  },
  probabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  probabilityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  probabilityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginLeft: 12,
  },
  probabilityValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  confidenceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  confidenceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  factorsContainer: {
    gap: 12,
  },
  factorCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  factorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  factorNameContainer: {
    flex: 1,
    marginRight: 12,
  },
  factorName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  factorDetails: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  factorValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  impactBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  impactFill: {
    height: '100%',
    borderRadius: 4,
  },
  impactInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  impactLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  impactPercentage: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  factorExplanation: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  recommendationsContainer: {
    gap: 12,
  },
  recommendationCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  recommendationNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendationNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.surface,
  },
  recommendationText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  detailsContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailItemLast: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: colors.border,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.surface,
  },
});