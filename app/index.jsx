import { useRouter } from 'expo-router';
import { GraduationCap, History, Plus, TrendingUp, BookOpen, Target, Users, BarChart3 } from 'lucide-react-native';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import colors from '../constants/colors';
import { useStudents } from '../contexts/StudentContext';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { students, isLoading, getPrediction } = useStudents();

  const atRiskCount = students.filter(s => {
    const prediction = getPrediction(s.id);
    return prediction && prediction.riskLevel === 'at_risk';
  }).length;

  const satisfactoryCount = students.filter(s => {
    const prediction = getPrediction(s.id);
    return prediction && prediction.riskLevel === 'satisfactory';
  }).length;

  const highAchieverCount = students.filter(s => {
    const prediction = getPrediction(s.id);
    return prediction && prediction.riskLevel === 'high_achiever';
  }).length;

  const totalEnglishAvg = students.reduce((sum, student) => {
    const englishAvg = student.englishAvg || 
                      ((student.writingScore || 0) + 
                       (student.readingScore || 0) + 
                       (student.speakingScore || 0)) / 3;
    return sum + englishAvg;
  }, 0);
  
  const averageEnglishScore = students.length > 0 
    ? (totalEnglishAvg / students.length).toFixed(1)
    : '0.0';

  const preparedCount = students.filter(s => s.testPrep === 'prepared').length;
  const notPreparedCount = students.length - preparedCount;
  const preparationRate = students.length > 0 
    ? Math.round((preparedCount / students.length) * 100)
    : 0;

  return (
    <View style={styles.backgroundContainer}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <GraduationCap size={48} color={colors.primary} strokeWidth={2} />
          </View>
          <Text style={styles.title}>Academic Performance</Text>
          <Text style={styles.subtitle}>Predictor</Text>
          <Text style={styles.description}>
            Predict student English performance using Machine Learning trained on real student data
          </Text>
        </View>

        {!isLoading && students.length > 0 && (
          <>
            <View style={styles.overviewContainer}>
              <Text style={styles.overviewTitle}>Performance Overview</Text>
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                  <View style={[styles.statIconContainer, { backgroundColor: colors.primary }]}>
                    <BookOpen size={20} color={colors.surface} />
                  </View>
                  <Text style={styles.statValue}>{averageEnglishScore}</Text>
                  <Text style={styles.statLabel}>Avg English Score</Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                  <View style={[styles.statIconContainer, { backgroundColor: colors.success }]}>
                    <Target size={20} color={colors.surface} />
                  </View>
                  <Text style={styles.statValue}>{preparationRate}%</Text>
                  <Text style={styles.statLabel}>Test Prepared</Text>
                </View>
              </View>
            </View>

            <View style={styles.overviewContainer}>
              <Text style={styles.overviewTitle}>Risk Distribution</Text>
              <View style={styles.statsGrid}>
                <View style={[styles.riskCard, { backgroundColor: colors.dangerLight }]}>
                  <View style={[styles.riskIconContainer, { backgroundColor: colors.atRisk }]}>
                    <TrendingUp size={20} color={colors.surface} />
                  </View>
                  <Text style={[styles.riskValue, { color: colors.dangerDark }]}>{atRiskCount}</Text>
                  <Text style={[styles.riskLabel, { color: colors.dangerDark }]}>At Risk</Text>
                  <Text style={styles.riskPercentage}>
                    {students.length > 0 ? Math.round((atRiskCount / students.length) * 100) : 0}%
                  </Text>
                </View>

                <View style={[styles.riskCard, { backgroundColor: colors.warningLight }]}>
                  <View style={[styles.riskIconContainer, { backgroundColor: colors.satisfactory }]}>
                    <TrendingUp size={20} color={colors.surface} />
                  </View>
                  <Text style={[styles.riskValue, { color: colors.warningDark }]}>{satisfactoryCount}</Text>
                  <Text style={[styles.riskLabel, { color: colors.warningDark }]}>Satisfactory</Text>
                  <Text style={styles.riskPercentage}>
                    {students.length > 0 ? Math.round((satisfactoryCount / students.length) * 100) : 0}%
                  </Text>
                </View>

                <View style={[styles.riskCard, { backgroundColor: colors.successLight }]}>
                  <View style={[styles.riskIconContainer, { backgroundColor: colors.highAchiever }]}>
                    <TrendingUp size={20} color={colors.surface} />
                  </View>
                  <Text style={[styles.riskValue, { color: colors.successDark }]}>{highAchieverCount}</Text>
                  <Text style={[styles.riskLabel, { color: colors.successDark }]}>High Achiever</Text>
                  <Text style={styles.riskPercentage}>
                    {students.length > 0 ? Math.round((highAchieverCount / students.length) * 100) : 0}%
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/input')}
            activeOpacity={0.8}
          >
            <View style={styles.buttonIconContainer}>
              <Plus size={24} color={colors.surface} />
            </View>
            <View style={styles.buttonTextContainer}>
              <Text style={styles.primaryButtonText}>Add New Student</Text>
              <Text style={styles.primaryButtonSubtext}>
                Enter scores and student data
              </Text>
            </View>
          </TouchableOpacity>

          {students.length > 0 && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/history')}
              activeOpacity={0.8}
            >
              <View style={styles.buttonIconContainer}>
                <History size={24} color={colors.primary} />
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.secondaryButtonText}>View History</Text>
                <Text style={styles.secondaryButtonSubtext}>
                  {students.length} student{students.length !== 1 ? 's' : ''} evaluated
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.secondaryButton, { marginTop: 8 }]}
          onPress={() => router.push('/analytics')}
          activeOpacity={0.8}
        >
          <View style={styles.buttonIconContainer}>
            <BarChart3 size={24} color={colors.primary} />
          </View>
          <View style={styles.buttonTextContainer}>
            <Text style={styles.secondaryButtonText}>Analytics Dashboard</Text>
            <Text style={styles.secondaryButtonSubtext}>
              View ML insights & statistics
            </Text>
          </View>
        </TouchableOpacity>

        {students.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <BookOpen size={64} color={colors.textLight} strokeWidth={1.5} />
            <Text style={styles.emptyStateTitle}>No Students Yet</Text>
            <Text style={styles.emptyStateText}>
              Get started by adding your first student to analyze their Academic Performance potential
            </Text>
          </View>
        )}

        {students.length > 0 && (
          <View style={styles.modelInfoContainer}>
            <View style={styles.modelInfoHeader}>
              <GraduationCap size={20} color={colors.primary} />
              <Text style={styles.modelInfoTitle}>AI Model</Text>
            </View>
            <Text style={styles.modelInfoText}>
              Powered by machine learning trained on 1,000 student records.
            </Text>
            <View style={styles.modelStats}>
              <View style={styles.modelStat}>
                <Text style={styles.modelStatValue}>99.5%</Text>
                <Text style={styles.modelStatLabel}>Accuracy</Text>
              </View>
              <View style={styles.modelStat}>
                <Text style={styles.modelStatValue}>1,000</Text>
                <Text style={styles.modelStatLabel}>Training Data</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  overviewContainer: {
    marginBottom: 24,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  statIconContainer: {
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
  riskCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  riskIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  riskValue: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  riskLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  riskPercentage: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  actionsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  buttonIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  buttonTextContainer: {
    flex: 1,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.surface,
    marginBottom: 4,
  },
  primaryButtonSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  secondaryButtonSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
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
    maxWidth: 280,
  },
  modelInfoContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: colors.border,
    marginTop: 8,
  },
  modelInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  modelInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  modelInfoText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  modelStats: {
    flexDirection: 'row',
    gap: 16,
  },
  modelStat: {
    alignItems: 'center',
    flex: 1,
  },
  modelStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  modelStatLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});