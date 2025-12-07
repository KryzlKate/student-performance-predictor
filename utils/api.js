import { API_URL } from '../constants/config';

export const testApiConnection = async () => {
  try {
    console.log('🔗 Testing connection to:', `${API_URL}/health`);
    
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log(' Backend connected:', data);
      return {
        connected: true,
        data: data,
        url: API_URL,
      };
    } else {
      console.log(' Backend error status:', response.status);
      return {
        connected: false,
        error: `HTTP ${response.status}`,
        url: API_URL,
      };
    }
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    return {
      connected: false,
      error: error.message,
      url: API_URL,
    };
  }
};

export const predictWithML = async (studentData) => {
  try {
    console.log('📤 Sending prediction request to:', `${API_URL}/predict`);
    
    const response = await fetch(`${API_URL}/predict`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(studentData),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        return {
          studentId: studentData.id,
          ...result.prediction,
          createdAt: new Date().toISOString(),
        };
      } else {
        throw new Error(result.error || 'Prediction failed');
      }
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.error('ML prediction failed:', error.message);
    throw error;
  }
};

// Export as default object
export default {
  testApiConnection,
  predictWithML,
};