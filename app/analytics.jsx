import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  BookOpen,
  Target,
  BarChart3,
  PieChart,
  Brain,
  Clock,
  CheckCircle,
  AlertCircle,
  Award,
  Calendar,
  UserCheck,
  TreePine,
  LineChart,
  Wifi,
  WifiOff,
  Server,
  Database,
  RefreshCw
} from 'lucide-react-native';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import colors from '../constants/colors';
import { useStudents } from '../contexts/StudentContext';
import { testApiConnection } from '../utils/api'; 

export default function AnalyticsScreen() {
  const router = useRouter();
  const { students, getPrediction } = useStudents();

  const totalStudents = students.length;
  
  const riskDistribution = students.reduce((acc, student) => {
    const prediction = getPrediction(student.id);
    const risk = prediction?.riskLevel || 'satisfactory';
    acc[risk] = (acc[risk] || 0) + 1;
    return acc;
  }, { at_risk: 0, satisfactory: 0, high_achiever: 0 });

  const preparedCount = students.filter(s => s.testPrep === 'prepared').length;
  const preparationRate = totalStudents > 0 ? (preparedCount / totalStudents) * 100 : 0;

  const [modelStatus, setModelStatus] = useState({
    isTrained: false,
    lastTrained: '2025-12-04',
    accuracy: 99.5,
    dataSize: 1000,
    hasBackend: false,
    backendConnected: false,
    backendUrl: '', 
    checking: true
  });

  const avgScores = students.reduce((acc, student) => {
    const englishAvg = student.englishAvg || 
      ((student.writingScore || 0) + 
       (student.readingScore || 0) + 
       (student.speakingScore || 0)) / 3;
    return {
      writing: acc.writing + (student.writingScore || 0),
      reading: acc.reading + (student.readingScore || 0),
      speaking: acc.speaking + (student.speakingScore || 0),
      englishAvg: acc.englishAvg + englishAvg,
      count: acc.count + 1
    };
  }, { writing: 0, reading: 0, speaking: 0, englishAvg: 0, count: 0 });

  const averages = {
    writing: avgScores.count > 0 ? avgScores.writing / avgScores.count : 0,
    reading: avgScores.count > 0 ? avgScores.reading / avgScores.count : 0,
    speaking: avgScores.count > 0 ? avgScores.speaking / avgScores.count : 0,
    englishAvg: avgScores.count > 0 ? avgScores.englishAvg / avgScores.count : 0
  };

  const studyTimeLabels = {
    'less_than_2': '< 2 hours',
    '2_to_5': '2-5 hours',
    '5_to_10': '5-10 hours',
    'more_than_10': '> 10 hours'
  };

  const studyTimeDistribution = students.reduce((acc, student) => {
    const time = student.studyTimePerWeek || '2_to_5';
    acc[time] = (acc[time] || 0) + 1;
    return acc;
  }, {});

  const realModelData = {
    isTrained: true,
    trainingDate: '2024-12-03',
    datasetSize: 1000,
    testAccuracy: 99.5,
    featuresUsed: 9,
    models: [
      {
        name: 'Random Forest Classifier',
        type: 'Classification',
        accuracy: 0.995,
        purpose: 'Risk Level Prediction',
        icon: TreePine,
        color: colors.primary
      },
      {
        name: 'Random Forest Regressor',
        type: 'Regression',
        accuracy: 0.987, 
        purpose: 'Score Prediction',
        icon: LineChart,
        color: colors.success
      }
    ],
    featureImportance: [
      { name: 'English Score', importance: 86.7, color: colors.success },
      { name: 'Attendance Rate', importance: 3.2, color: colors.warning },
      { name: 'Tutoring', importance: 2.2, color: colors.info },
      { name: 'Study Time', importance: 1.0, color: colors.textSecondary },
      { name: 'Education Level', importance: 1.8, color: colors.textSecondary },
      { name: 'Gender', importance: 0.9, color: colors.textSecondary },
    ]
  };

  const checkBackendConnection = async () => {
    setModelStatus(prev => ({ ...prev, checking: true }));
    try {
      const result = await testApiConnection();
       console.log('Connection result:', result);

      setModelStatus(prev => ({
        ...prev,
        hasBackend: true,
        backendConnected: result.connected,
        backendUrl: result.url || '',
        checking: false,
        lastChecked: new Date().toLocaleTimeString()
      }));
      
      if (result.connected) {
        console.log(' Flask backend connected in Analytics');
      } else {
        console.log(' Flask backend not connected');
      }
    } catch (error) {
      setModelStatus(prev => ({
        ...prev,
        hasBackend: false,
        backendConnected: false,
        checking: false
      }));
    }
  };

  useEffect(() => {
    checkBackendConnection();
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Brain size={28} color={colors.primary} />
            <Text style={styles.headerTitle}>Analytics Dashboard</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Real ML Insights & Student Performance Analytics
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Server size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>ML System Status</Text>
            <TouchableOpacity onPress={checkBackendConnection} style={styles.refreshButton}>
              <RefreshCw size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.statusGrid}>
            <View style={styles.statusCard}>
              {realModelData.isTrained ? (
                <CheckCircle size={24} color={colors.success} />
              ) : (
                <AlertCircle size={24} color={colors.warning} />
              )}
              <Text style={styles.statusLabel}>
                ML Model: {realModelData.isTrained ? 'Trained' : 'Not Trained'}
              </Text>
              <Text style={styles.statusSubtext}>
                {realModelData.datasetSize} student dataset
              </Text>
            </View>

            <View style={styles.statusCard}>
              {modelStatus.backendConnected ? (
                <Wifi size={24} color={colors.success} />
              ) : (
                <WifiOff size={24} color={colors.warning} />
              )}
              <Text style={styles.statusLabel}>
                Backend: {modelStatus.backendConnected ? 'Connected' : 'Offline'}
              </Text>
              <Text style={styles.statusSubtext}>
                {modelStatus.backendConnected ? 'Real ML Predictions' : 'Local Predictions'}
              </Text>
            </View>
          </View>

          {modelStatus.checking ? (
            <View style={styles.checkingStatus}>
              <RefreshCw size={16} color={colors.textSecondary} />
              <Text style={styles.checkingText}>Checking connection...</Text>
            </View>
          ) : (
            <View style={[styles.connectionStatus, { 
              backgroundColor: modelStatus.backendConnected ? colors.success + '15' : colors.warning + '15',
              borderColor: modelStatus.backendConnected ? colors.success : colors.warning
            }]}>
              <Text style={[styles.connectionStatusText, {
                color: modelStatus.backendConnected ? colors.success : colors.warning
              }]}>
                {modelStatus.backendConnected 
                  ? ' Connected to Flask ML Backend - Using Real ML Models'
                  : ' Local Mode - Using simulated predictions'}
              </Text>
            </View>
          )}
        </View>


        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <BarChart3 size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Student Analytics</Text>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
                <Users size={24} color={colors.primary} />
              </View>
              <Text style={styles.statValue}>{totalStudents}</Text>
              <Text style={styles.statLabel}>Total Students</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: colors.success + '20' }]}>
                <TrendingUp size={24} color={colors.success} />
              </View>
              <Text style={styles.statValue}>{averages.englishAvg.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Avg English Score</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: colors.warning + '20' }]}>
                <BookOpen size={24} color={colors.warning} />
              </View>
              <Text style={styles.statValue}>{preparationRate.toFixed(1)}%</Text>
              <Text style={styles.statLabel}>Test Prep Rate</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: colors.info + '20' }]}>
                <Calendar size={24} color={colors.info} />
              </View>
        <Text style={styles.statValue}>
          {realModelData.metadata?.trained_date 
            ? String(new Date(realModelData.metadata.trained_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }))
            : '2025-12-03'}
        </Text>              
            <Text style={styles.statLabel}>Model Trained</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <PieChart size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Risk Distribution</Text>
          </View>
          
          <View style={styles.distributionContainer}>
            <View style={styles.distributionCard}>
              <View style={styles.riskInfo}>
                <View style={[styles.riskPill, { backgroundColor: colors.atRiskLight }]}>
                  <Text style={[styles.riskPillText, { color: colors.atRisk }]}>
                    At Risk
                  </Text>
                </View>
                <Text style={styles.riskDescription}>Needs additional support</Text>
              </View>
              <View style={styles.distributionStats}>
                <Text style={styles.distributionCount}>{riskDistribution.at_risk}</Text>
                <Text style={styles.distributionPercentage}>
                  {totalStudents > 0 ? ((riskDistribution.at_risk / totalStudents) * 100).toFixed(1) : 0}%
                </Text>
              </View>
            </View>
            
            <View style={styles.distributionCard}>
              <View style={styles.riskInfo}>
                <View style={[styles.riskPill, { backgroundColor: colors.satisfactoryLight }]}>
                  <Text style={[styles.riskPillText, { color: colors.satisfactory }]}>
                    Satisfactory
                  </Text>
                </View>
                <Text style={styles.riskDescription}>Meeting expectations</Text>
              </View>
              <View style={styles.distributionStats}>
                <Text style={styles.distributionCount}>{riskDistribution.satisfactory}</Text>
                <Text style={styles.distributionPercentage}>
                  {totalStudents > 0 ? ((riskDistribution.satisfactory / totalStudents) * 100).toFixed(1) : 0}%
                </Text>
              </View>
            </View>
            
            <View style={styles.distributionCard}>
              <View style={styles.riskInfo}>
                <View style={[styles.riskPill, { backgroundColor: colors.highAchieverLight }]}>
                  <Text style={[styles.riskPillText, { color: colors.highAchiever }]}>
                    High Achiever
                  </Text>
                </View>
                <Text style={styles.riskDescription}>Exceeding expectations</Text>
              </View>
              <View style={styles.distributionStats}>
                <Text style={styles.distributionCount}>{riskDistribution.high_achiever}</Text>
                <Text style={styles.distributionPercentage}>
                  {totalStudents > 0 ? ((riskDistribution.high_achiever / totalStudents) * 100).toFixed(1) : 0}%
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Award size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Average Scores</Text>
          </View>
          
          <View style={styles.scoresContainer}>
            <View style={styles.scoreCard}>
              <View style={styles.scoreHeader}>
                <Text style={styles.scoreTitle}>Writing</Text>
                <Text style={styles.scoreValue}>{averages.writing.toFixed(1)}</Text>
              </View>
              <View style={styles.scoreBarContainer}>
                <View 
                  style={[
                    styles.scoreBar, 
                    { 
                      width: `${Math.min(100, averages.writing)}%`,
                      backgroundColor: averages.writing >= 70 ? colors.success : averages.writing >= 60 ? colors.warning : colors.danger
                    }
                  ]} 
                />
              </View>
            </View>
            
            <View style={styles.scoreCard}>
              <View style={styles.scoreHeader}>
                <Text style={styles.scoreTitle}>Reading</Text>
                <Text style={styles.scoreValue}>{averages.reading.toFixed(1)}</Text>
              </View>
              <View style={styles.scoreBarContainer}>
                <View 
                  style={[
                    styles.scoreBar, 
                    { 
                      width: `${Math.min(100, averages.reading)}%`,
                      backgroundColor: averages.reading >= 70 ? colors.success : averages.reading >= 60 ? colors.warning : colors.danger
                    }
                  ]} 
                />
              </View>
            </View>
            
            <View style={styles.scoreCard}>
              <View style={styles.scoreHeader}>
                <Text style={styles.scoreTitle}>Speaking</Text>
                <Text style={styles.scoreValue}>{averages.speaking.toFixed(1)}</Text>
              </View>
              <View style={styles.scoreBarContainer}>
                <View 
                  style={[
                    styles.scoreBar, 
                    { 
                      width: `${Math.min(100, averages.speaking)}%`,
                      backgroundColor: averages.speaking >= 70 ? colors.success : averages.speaking >= 60 ? colors.warning : colors.danger
                    }
                  ]} 
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Study Time Distribution</Text>
          </View>
          
          <View style={styles.studyTimeContainer}>
            {Object.entries(studyTimeLabels).map(([key, label]) => {
              const count = studyTimeDistribution[key] || 0;
              const percentage = totalStudents > 0 ? (count / totalStudents) * 100 : 0;
              
              return (
                <View key={key} style={styles.studyTimeCard}>
                  <Text style={styles.studyTimeLabel}>{label}</Text>
                  <View style={styles.studyTimeStats}>
                    <Text style={styles.studyTimeCount}>{count} students</Text>
                    <Text style={styles.studyTimePercentage}>{percentage.toFixed(1)}%</Text>
                  </View>
                  <View style={styles.studyTimeBarContainer}>
                    <View 
                      style={[
                        styles.studyTimeBar, 
                        { width: `${Math.min(100, percentage)}%` }
                      ]} 
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Brain size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Key Insights</Text>
          </View>
          
          <View style={styles.insightsContainer}>
            <View style={styles.insightCard}>
              <AlertCircle size={20} color={colors.warning} />
              <Text style={styles.insightText}>
                <Text style={styles.insightHighlight}>{riskDistribution.at_risk} students</Text> are at risk and may need additional support to improve their performance.
              </Text>
            </View>
            
            <View style={styles.insightCard}>
              <TrendingUp size={20} color={colors.success} />
              <Text style={styles.insightText}>
                The average English score is <Text style={styles.insightHighlight}>{averages.englishAvg.toFixed(1)}/100</Text>, indicating {averages.englishAvg >= 70 ? 'good' : 'room for improvement in'} overall performance.
              </Text>
            </View>
            
            <View style={styles.insightCard}>
              {modelStatus.backendConnected ? (
                <Server size={20} color={colors.success} />
              ) : (
                <Server size={20} color={colors.warning} />
              )}
              <Text style={styles.insightText}>
                System is in <Text style={styles.insightHighlight}>
                  {modelStatus.backendConnected ? 'Real ML Mode' : 'Local Mode'}
                </Text> - {modelStatus.backendConnected 
                  ? 'using trained Random Forest models' 
                  : 'using simulated predictions'}
              </Text>
            </View>
          </View>
        </View>

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
  header: {
    marginBottom: 32,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    lineHeight: 22,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: -4,
    marginBottom: 16,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // System Status Styles
  statusGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statusCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 8,
    marginBottom: 2,
  },
  statusSubtext: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  checkingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkingText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  connectionStatus: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  connectionStatusText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Dual Algorithms Styles
  algorithmContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  algorithmCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  algorithmIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  algorithmName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  algorithmType: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  algorithmAccuracy: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  algorithmDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modelStats: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  modelStat: {
    flex: 1,
    alignItems: 'center',
  },
  modelStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  modelStatLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  // Statistics Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Distribution Styles
  distributionContainer: {
    gap: 12,
  },
  distributionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: colors.border,
  },
  riskInfo: {
    flex: 1,
  },
  riskPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  riskPillText: {
    fontSize: 14,
    fontWeight: '700',
  },
  riskDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  distributionStats: {
    alignItems: 'flex-end',
  },
  distributionCount: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  distributionPercentage: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  // Scores Container
  scoresContainer: {
    gap: 12,
  },
  scoreCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  scoreBarContainer: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBar: {
    height: '100%',
    borderRadius: 4,
  },
  // Features Container
  featuresContainer: {
    gap: 12,
    marginBottom: 16,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  featureName: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  featureBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  featureBar: {
    height: '100%',
    borderRadius: 4,
  },
  featureValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    minWidth: 50,
    textAlign: 'right',
  },
  featureInsight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  featureInsightText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  insightHighlight: {
    fontWeight: '700',
    color: colors.primary,
  },
  // Study Time Container
  studyTimeContainer: {
    gap: 12,
  },
  studyTimeCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  studyTimeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  studyTimeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  studyTimeCount: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  studyTimePercentage: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
  },
  studyTimeBarContainer: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  studyTimeBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  // Insights Container
  insightsContainer: {
    gap: 12,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});
