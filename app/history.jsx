import { useRouter } from 'expo-router';
import {
  ChevronRight,
  Trash2,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  BookOpen,
} from 'lucide-react-native';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useEffect } from 'react';

import colors from '../constants/colors';
import { useStudents } from '../contexts/StudentContext';

const RISK_CONFIG = {
  at_risk: {
    label: 'At Risk',
    color: colors.atRisk,
    bgColor: colors.atRiskLight,
    icon: AlertCircle,
  },
  satisfactory: {
    label: 'Satisfactory',
    color: colors.satisfactory,
    bgColor: colors.satisfactoryLight,
    icon: TrendingUp,
  },
  high_achiever: {
    label: 'High Achiever',
    color: colors.highAchiever,
    bgColor: colors.highAchieverLight,
    icon: CheckCircle,
  },
};

const RISK_THRESHOLDS = {
  HIGH_ACHIEVER: 75,    
  SATISFACTORY: 60,       
  AT_RISK: 0,           
};

const calculateFallbackRiskLevel = (student) => {
  const englishAvg = student.englishAvg || 
    ((student.writingScore || 0) + (student.readingScore || 0) + (student.speakingScore || 0)) / 3;
 
  if (__DEV__) {
    console.log(`Fallback for ${student.name}: Avg=${englishAvg.toFixed(1)}`);
  }

  if (englishAvg >= 75) {  
    return {
      riskLevel: englishAvg >= 80 ? 'high_achiever' : 'satisfactory',
      confidence: 0.85 + Math.min((englishAvg - 75) / 25 * 0.15, 0.15),
    };
  } else if (englishAvg >= 60) {
    return {
      riskLevel: 'satisfactory',
      confidence: 0.75 + Math.min((englishAvg - 60) / 15 * 0.2, 0.25),
    };
  } else {  
    return {
      riskLevel: 'at_risk',
      confidence: 0.65 + Math.min((englishAvg / 60) * 0.3, 0.35),
    };
  }
};

export default function HistoryScreen() {
  const router = useRouter();
  const { students, getPrediction, deleteStudent } = useStudents();

  useEffect(() => {
    if (students.length > 0 && __DEV__) {
      console.log('=== HISTORY SCREEN DEBUG ===');
      console.log('Total students:', students.length);
      
      students.forEach((student, index) => {
        const prediction = getPrediction(student.id);
        const englishAvg = student.englishAvg || 
          ((student.writingScore || 0) + (student.readingScore || 0) + (student.speakingScore || 0)) / 3;
        
        console.log(`Student ${index + 1}: ${student.name}`);
        console.log('  - Average score:', englishAvg.toFixed(1));
        console.log('  - Context prediction:', prediction);
        
        if (!prediction || !prediction.riskLevel) {
          const fallback = calculateFallbackRiskLevel(student);
          console.log('  - Will use fallback:', fallback);
          console.log('  - Expected level based on score:');
          if (englishAvg >= 80) console.log('    -> High Achiever (80+)');
          else if (englishAvg >= 75) console.log('    -> Satisfactory/High Achiever (75-79)');
          else if (englishAvg >= 60) console.log('    -> Satisfactory (60-74)');
          else console.log('    -> At Risk (0-59)');
        }
        console.log('---');
      });
    }
  }, [students, getPrediction]);

  const handleDelete = (id, name) => {
    Alert.alert(
      'Delete Student',
      `Are you sure you want to delete ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteStudent(id);
          },
        },
      ]
    );
  };

  const handleViewDetails = (studentId) => {
    router.push(`/results?studentId=${studentId}`);
  };

  const sortedStudents = [...students].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <View style={styles.container}>
      {sortedStudents.length === 0 ? (
        <View style={styles.emptyState}>
          <BookOpen size={64} color={colors.textLight} strokeWidth={1.5} />
          <Text style={styles.emptyStateTitle}>No Students Yet</Text>
          <Text style={styles.emptyStateText}>
            Students you evaluate will appear here
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <BookOpen size={24} color={colors.primary} />
              <Text style={styles.headerTitle}>Student History</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              {sortedStudents.length} student{sortedStudents.length !== 1 ? 's' : ''} evaluated
            </Text>
          </View>

          <View style={styles.listContainer}>
            {sortedStudents.map((student) => {
              let prediction = getPrediction(student.id);
              

              const isValidPrediction = prediction && 
                                       prediction.riskLevel && 
                                       RISK_CONFIG[prediction.riskLevel] &&
                                       prediction.confidence > 0;  
              if (!isValidPrediction) {

                if (__DEV__) {
                  console.log(`Prediction invalid for ${student.name}:`, {
                    hasPrediction: !!prediction,
                    hasRiskLevel: prediction?.riskLevel,
                    validConfig: RISK_CONFIG[prediction?.riskLevel] ? 'YES' : 'NO',
                    confidence: prediction?.confidence
                  });
                }

                prediction = calculateFallbackRiskLevel(student);

                prediction.predictionMethod = 'fallback';

                if (__DEV__) {
                  const englishAvg = student.englishAvg || 
                    ((student.writingScore || 0) + (student.readingScore || 0) + (student.speakingScore || 0)) / 3;
                  console.log(`Using fallback for ${student.name}: Score=${englishAvg.toFixed(1)}, Risk=${prediction.riskLevel}`);
                }
              }

              const config = RISK_CONFIG[prediction.riskLevel];
              const Icon = config?.icon;

              const englishAvg = student.englishAvg || 
                ((student.writingScore || 0) + (student.readingScore || 0) + (student.speakingScore || 0)) / 3;

              const date = new Date(student.createdAt);
              const formattedDate = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });

              return (
                <View key={student.id} style={styles.studentCard}>
                  <TouchableOpacity
                    style={styles.studentCardMain}
                    onPress={() => handleViewDetails(student.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.studentHeader}>
                      {config && Icon && (
                        <View style={[styles.riskIndicator, { backgroundColor: config.bgColor }]}>
                          <Icon size={18} color={config.color} />
                        </View>
                      )}
                      <View style={styles.studentInfo}>
                        <Text style={styles.studentName}>{student.name}</Text>
                        <Text style={styles.studentMeta}>
                          Age {student.age} • {formattedDate}
                        </Text>
                      </View>
                      <ChevronRight size={20} color={colors.textLight} />
                    </View>

                    <View style={styles.academicInfo}>
                      <View style={styles.scoreRow}>
                        <View style={styles.scoreItem}>
                          <Text style={styles.scoreLabel}>Writing</Text>
                          <Text style={[
                            styles.scoreValue,
                            { color: (student.writingScore || 0) >= 60 ? colors.success : colors.danger }
                          ]}>
                            {student.writingScore || 0}
                          </Text>
                        </View>
                        <View style={styles.scoreItem}>
                          <Text style={styles.scoreLabel}>Reading</Text>
                          <Text style={[
                            styles.scoreValue,
                            { color: (student.readingScore || 0) >= 60 ? colors.success : colors.danger }
                          ]}>
                            {student.readingScore || 0}
                          </Text>
                        </View>
                        <View style={styles.scoreItem}>
                          <Text style={styles.scoreLabel}>Speaking</Text>
                          <Text style={[
                            styles.scoreValue,
                            { color: (student.speakingScore || 0) >= 60 ? colors.success : colors.danger }
                          ]}>
                            {student.speakingScore || 0}
                          </Text>
                        </View>
                        <View style={styles.scoreItem}>
                          <Text style={styles.scoreLabel}>Avg</Text>
                          <Text style={[
                            styles.scoreValue,
                            { 
                              color: englishAvg >= RISK_THRESHOLDS.HIGH_ACHIEVER ? colors.highAchiever : 
                                     englishAvg >= RISK_THRESHOLDS.SATISFACTORY ? colors.satisfactory : colors.atRisk,
                              fontWeight: '700'
                            }
                          ]}>
                            {englishAvg.toFixed(1)}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.studentDetails}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Education:</Text>
                          <Text style={styles.detailValue}>
                            {student.studentEducation === 'secondary' ? 'Secondary' :
                             student.studentEducation === 'bachelors' ? "Bachelor's" :
                             student.studentEducation === 'masters' ? "Master's" : 'Doctorate'}
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Test Prep:</Text>
                          <Text style={[
                            styles.detailValue,
                            { color: student.testPrep === 'prepared' ? colors.success : colors.danger }
                          ]}>
                            {student.testPrep === 'prepared' ? 'Prepared' : 'Not Prepared'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {config && (
                      <View style={[styles.riskBadge, { backgroundColor: config.bgColor }]}>
                        <Text style={[styles.riskBadgeText, { color: config.color }]}>
                          {config.label}
                        </Text>
                        {prediction && (
                          <Text style={styles.confidenceText}>
                            {(prediction.confidence * 100).toFixed(0)}% confidence
                          </Text>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(student.id, student.name)}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={18} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
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
  header: {
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: colors.border,
  },
  listContainer: {
    gap: 16,
  },
  studentCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  studentCardMain: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  riskIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  studentMeta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  academicInfo: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  scoreItem: {
    alignItems: 'center',
    flex: 1,
  },
  scoreLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  studentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  detailRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  riskBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  riskBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  confidenceText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  deleteButton: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerLight,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
})