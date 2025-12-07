export function engineerFeatures(student) {

    const studyTimeScores = {
      less_than_2: 0,
      '2_to_5': 1,
      '5_to_10': 2,
      more_than_10: 3,
    };
  
    const absencesScores = {
      none: 3,
      '1_to_5': 2,
      '6_to_10': 1,
      more_than_10: 0,
    };
  
    const educationScores = {
      none: 0,
      primary: 1,
      secondary: 2,
      bachelors: 3,
      masters: 4,
      doctorate: 5,
    };
  
    return {
      
      previousGrade: student.previousGrade / 100, 
      studyTime: studyTimeScores[student.studyTimePerWeek] / 3, 
      absences: absencesScores[student.absences] / 3, 
      education: educationScores[student.studentEducation] / 5, 
      gender: student.gender === 'male' ? 0 : 1, 
      age: (student.age - 5) / 95, 
      extraCurricular: student.extraCurricular ? 1 : 0,
      internetAccess: student.internetAccess ? 1 : 0,
      tutoring: student.tutoring ? 1 : 0,

      gradeConsistency: 1 - Math.min(student.previousGrade / 100, 1), 
      studyEfficiency: studyTimeScores[student.studyTimePerWeek] * (student.previousGrade / 100),
      supportScore: (student.tutoring ? 0.5 : 0) + (student.internetAccess ? 0.3 : 0) + (student.extraCurricular ? 0.2 : 0),
    };
  }
  
  export function formatFeatureName(feature) {
    const names = {
      previousGrade: 'Previous Grade',
      studyTime: 'Study Time',
      absences: 'Absences',
      education: 'Education Level',
      gender: 'Gender',
      age: 'Age',
      extraCurricular: 'Extra-Curricular',
      internetAccess: 'Internet Access',
      tutoring: 'Tutoring',
      gradeConsistency: 'Grade Consistency',
      studyEfficiency: 'Study Efficiency',
      supportScore: 'Support Score',
    };
    return names[feature] || feature;
  }
  
  export function formatFeatureValue(feature, value) {
    if (feature === 'gender') return value === 0 ? 'Male' : 'Female';
    if (feature === 'previousGrade') return `${Math.round(value * 100)}/100`;
    if (feature === 'studyTime') {
      const times = ['< 2 hours', '2-5 hours', '5-10 hours', '> 10 hours'];
      return times[Math.round(value * 3)];
    }
    if (feature === 'absences') {
      const levels = ['> 10 days', '6-10 days', '1-5 days', 'None'];
      return levels[Math.round(value * 3)];
    }
    if (feature === 'education') {
      const levels = ['None', 'Primary', 'Secondary', "Bachelor's", "Master's", 'Doctorate'];
      return levels[Math.round(value * 5)];
    }
    if (typeof value === 'number') {
      if (feature.includes('Score') || feature.includes('Efficiency') || feature.includes('Consistency')) {
        return `${Math.round(value * 100)}%`;
      }
      return Math.round(value * 100) / 100;
    }
    return value.toString();
  }