import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const STUDENTS_STORAGE_KEY = '@students';
const PREDICTIONS_STORAGE_KEY = '@predictions';

const StudentContext = createContext();

const correctPredictionIfWrong = (prediction, student) => {
  if (!prediction || !student) return prediction;

  const writing = student.writingScore || 0;
  const reading = student.readingScore || 0;
  const speaking = student.speakingScore || 0;
  const englishAvg = student.englishAvg || (writing + reading + speaking) / 3;

  if (englishAvg >= 75 && prediction.riskLevel === 'at_risk') {
    console.log('CORRECTING wrong prediction:', {
      student: student.name,
      avg: englishAvg,
      storedRisk: prediction.riskLevel,
      correctedRisk: 'high_achiever'
    });
    
    return {
      ...prediction,
      riskLevel: 'high_achiever',
      confidence: 0.90 + Math.min((englishAvg - 75) / 25 * 0.1, 0.1),
      corrected: true
    };
  }
  
  if (englishAvg >= 60 && prediction.riskLevel === 'at_risk') {
    console.log('CORRECTING wrong prediction:', {
      student: student.name,
      avg: englishAvg,
      storedRisk: prediction.riskLevel,
      correctedRisk: 'satisfactory'
    });
    
    return {
      ...prediction,
      riskLevel: 'satisfactory',
      confidence: 0.85 + Math.min((englishAvg - 60) / 15 * 0.15, 0.15),
      corrected: true
    };
  }
  
  return prediction;
};

export function StudentProvider({ children }) {
  const [students, setStudents] = useState([]);
  const [predictions, setPredictions] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [studentsJson, predictionsJson] = await Promise.all([
        AsyncStorage.getItem(STUDENTS_STORAGE_KEY),
        AsyncStorage.getItem(PREDICTIONS_STORAGE_KEY),
      ]);

      let parsedStudents = [];
      if (studentsJson) {
        parsedStudents = JSON.parse(studentsJson);
      }

      if (predictionsJson) {
        const parsedPredictions = JSON.parse(predictionsJson);
        const predictionsMap = new Map(Object.entries(parsedPredictions));

        const correctedPredictions = new Map();
        for (const [studentId, prediction] of predictionsMap) {
          const student = parsedStudents.find(s => s.id === studentId);
          if (student) {
            const corrected = correctPredictionIfWrong(prediction, student);
            correctedPredictions.set(studentId, corrected);
          } else {
            correctedPredictions.set(studentId, prediction);
          }
        }
        
        setPredictions(correctedPredictions);

        if (correctedPredictions.size > 0) {
          const predictionsObj = Object.fromEntries(correctedPredictions);
          await AsyncStorage.setItem(PREDICTIONS_STORAGE_KEY, JSON.stringify(predictionsObj));
        }
      }

      setStudents(parsedStudents);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveStudents = async (newStudents) => {
    try {
      await AsyncStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(newStudents));
      setStudents(newStudents);
    } catch (error) {
      console.error('Failed to save students:', error);
    }
  };

  const savePredictions = async (newPredictions) => {
    try {
      const predictionsObj = Object.fromEntries(newPredictions);
      await AsyncStorage.setItem(PREDICTIONS_STORAGE_KEY, JSON.stringify(predictionsObj));
      setPredictions(newPredictions);
    } catch (error) {
      console.error('Failed to save predictions:', error);
    }
  };

  const addStudent = useCallback(async (student) => {
    const newStudents = [...students, student];
    await saveStudents(newStudents);
  }, [students]);

  const addPrediction = useCallback(async (prediction) => {
    const student = students.find(s => s.id === prediction.studentId);
    const correctedPrediction = correctPredictionIfWrong(prediction, student);
    
    const newPredictions = new Map(predictions);
    newPredictions.set(correctedPrediction.studentId, correctedPrediction);
    await savePredictions(newPredictions);
 
    console.log('Prediction saved (corrected if needed):', {
      studentId: correctedPrediction.studentId,
      studentName: student?.name || 'Unknown',
      riskLevel: correctedPrediction.riskLevel,
      confidence: correctedPrediction.confidence,
      wasCorrected: correctedPrediction.corrected || false,
      originalRisk: prediction.riskLevel
    });
  }, [predictions, students]);

  const getStudent = useCallback((id) => {
    return students.find((s) => s.id === id);
  }, [students]);

  const getPrediction = useCallback((studentId) => {
    const prediction = predictions.get(studentId);
    
    if (__DEV__ && studentId) {
      console.log('Getting prediction for:', studentId, 'Found:', prediction ? 'YES' : 'NO');
    }
    
    return prediction;
  }, [predictions]);

  const deleteStudent = useCallback(async (id) => {
    const newStudents = students.filter((s) => s.id !== id);
    const newPredictions = new Map(predictions);
    newPredictions.delete(id);
    
    await Promise.all([
      saveStudents(newStudents),
      savePredictions(newPredictions),
    ]);
  }, [students, predictions]);

  const addStudentWithPrediction = useCallback(async (student, prediction) => {
    // Add student first
    const newStudents = [...students, student];
    await saveStudents(newStudents);

    const correctedPrediction = correctPredictionIfWrong(prediction, student);
    const newPredictions = new Map(predictions);
    newPredictions.set(correctedPrediction.studentId, correctedPrediction);
    await savePredictions(newPredictions);
    
    console.log('Student and prediction saved (corrected):', {
      studentName: student.name,
      studentId: student.id,
      originalRisk: prediction.riskLevel,
      correctedRisk: correctedPrediction.riskLevel,
      wasCorrected: correctedPrediction.corrected || false
    });
  }, [students, predictions]);

  const fixAllPredictions = useCallback(async () => {
    const newPredictions = new Map();
    
    for (const student of students) {
      const prediction = predictions.get(student.id);
      if (prediction) {
        const corrected = correctPredictionIfWrong(prediction, student);
        newPredictions.set(student.id, corrected);
        
        if (corrected.corrected) {
          console.log('Fixed prediction for:', student.name, {
            from: prediction.riskLevel,
            to: corrected.riskLevel
          });
        }
      }
    }
    
    await savePredictions(newPredictions);
    return newPredictions;
  }, [students, predictions, savePredictions]);

  const getCorrectedPrediction = useCallback((studentId) => {
    const prediction = predictions.get(studentId);
    if (!prediction) return null;
    
    const student = students.find(s => s.id === studentId);
    if (!student) return prediction;
    
    return correctPredictionIfWrong(prediction, student);
  }, [predictions, students]);

  const value = useMemo(() => ({
    students,
    predictions,
    isLoading,
    addStudent,
    addPrediction,
    addStudentWithPrediction,
    getStudent,
    getPrediction,
    getCorrectedPrediction,
    deleteStudent,
    fixAllPredictions,
  }), [
    students, 
    predictions, 
    isLoading, 
    addStudent, 
    addPrediction, 
    addStudentWithPrediction, 
    getStudent, 
    getPrediction,
    getCorrectedPrediction,
    deleteStudent,
    fixAllPredictions
  ]);

  return (
    <StudentContext.Provider value={value}>
      {children}
    </StudentContext.Provider>
  );
}

export function useStudents() {
  const context = useContext(StudentContext);
  if (context === undefined) {
    throw new Error('useStudents must be used within a StudentProvider');
  }
  return context;
}