const API_BASE_URL = 'http://localhost:8000';

const ENDPOINTS = {
  QUIZ_GENERATE: '/quiz/generate',
  QUIZ_EVALUATE: '/quiz/evaluate',
  CODING_GENERATE: '/coding/generate',
  CODING_EVALUATE: '/coding/evaluate',
  TRANSCRIPTION_EVALUATE: '/transcription/evaluate',
  COMMUNICATION_HISTORY: '/communication/save-history',
  STUDY_LOGS_CREATE: '/api/study-logs/create',
  STUDY_LOGS_USER: '/api/study-logs/user',
  STUDY_LOGS_DELETE: '/api/study-logs/delete',
  NOTIFICATIONS_CREATE: '/api/notifications/create',
  NOTIFICATIONS_USER: '/api/notifications/user',
  NOTIFICATIONS_MARK_READ: '/api/notifications/mark-read',
  NOTIFICATIONS_MARK_ALL_READ: '/api/notifications/mark-all-read',
  NOTIFICATIONS_DELETE: '/api/notifications',
  TEST_CORS: '/test-cors'
};

class APIService {
  constructor() { 
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    // Default headers
    const headers = {
      'Accept': 'application/json',
      ...(options.headers || {})
    };

    // Only set Content-Type for non-FormData requests
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      method: 'GET',
      ...options,
      headers,
      credentials: 'include',  // Important for CORS with credentials
      mode: 'cors',           // Enable CORS
      cache: 'no-cache',      // Disable cache
    };

    // Stringify body if it's an object and not FormData
    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
    }

    try {
      console.log(`Sending ${config.method} request to:`, url, config);
      const response = await fetch(url, config);

      // Handle non-OK responses
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: await response.text() };
        }
        
        const error = new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
        error.status = response.status;
        error.data = errorData;
        throw error;
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      return await response.text();

    } catch (error) {
      console.error('Request failed:', {
        url,
        error: error.message,
        status: error.status,
        data: error.data
      });
      throw error;
    }
  }

  // Test CORS connection
  async testCors() {
    return this.request(ENDPOINTS.TEST_CORS, { method: 'GET' });
  }

  // Quiz API methods
  async generateQuiz(data) {
    return this.request(ENDPOINTS.QUIZ_GENERATE, {
      method: 'POST',
      body: data
    });
  }

  async evaluateQuiz(data) {
    return this.request(ENDPOINTS.QUIZ_EVALUATE, {
      method: 'POST',
      body: data
    });
  }

  // Coding API methods
  async generateCoding({ topic, level }) {
    console.log('Sending generateCoding request with:', { topic, level });
    try {
      const response = await this.request(ENDPOINTS.CODING_GENERATE, {
        method: 'POST',
        body: { topic, level }
      });
      console.log('generateCoding response:', response);
      return response;
    } catch (error) {
      console.error('Error in generateCoding:', error);
      throw error;
    }
  }

  async evaluateCoding(data) {
    return this.request(ENDPOINTS.CODING_EVALUATE, {
      method: 'POST',
      body: data
    });
  }

  // Transcription/Communication API methods
  async evaluateTranscription(audioData, format = 'webm') {
    console.log('Sending evaluateTranscription request with audio data length:', audioData?.length);
    try {
      const response = await this.request(ENDPOINTS.TRANSCRIPTION_EVALUATE, {
        method: 'POST',
        body: {
          audioData: audioData,
          format: format
        }
      });
      console.log('evaluateTranscription response:', response);
      return response;
    } catch (error) {
      console.error('Error in evaluateTranscription:', error);
      throw error;
    }
  }

  async saveCommunicationHistory(historyData) {
    console.log('Sending saveCommunicationHistory request:', historyData);
    try {
      const response = await this.request(ENDPOINTS.COMMUNICATION_HISTORY, {
        method: 'POST',
        body: historyData
      });
      console.log('saveCommunicationHistory response:', response);
      return response;
    } catch (error) {
      console.error('Error in saveCommunicationHistory:', error);
      throw error;
    }
  }

  // Study Logs API methods
  async createStudyLog(title, content, userId) {
    console.log('Sending createStudyLog request:', { title, content, userId });
    try {
      const response = await this.request(ENDPOINTS.STUDY_LOGS_CREATE, {
        method: 'POST',
        body: {
          title: title.trim(),
          content: content.trim(),
          user_id: userId
        }
      });
      console.log('createStudyLog response:', response);
      return response;
    } catch (error) {
      console.error('Error in createStudyLog:', error);
      throw error;
    }
  }

  async getUserStudyLogs(userId) {
    console.log('Sending getUserStudyLogs request for userId:', userId);
    try {
      const response = await this.request(`${ENDPOINTS.STUDY_LOGS_USER}/${userId}`, {
        method: 'GET'
      });
      console.log('getUserStudyLogs response:', response);
      return response;
    } catch (error) {
      console.error('Error in getUserStudyLogs:', error);
      throw error;
    }
  }

  async deleteStudyLog(logId, userId) {
    console.log('Sending deleteStudyLog request:', { logId, userId });
    try {
      const response = await this.request(ENDPOINTS.STUDY_LOGS_DELETE, {
        method: 'DELETE',
        body: {
          log_id: logId,
          user_id: userId
        }
      });
      console.log('deleteStudyLog response:', response);
      return response;
    } catch (error) {
      console.error('Error in deleteStudyLog:', error);
      throw error;
    }
  }

  // Notifications API methods
  async createNotification(userId, title, message, type, relatedId = null, teacherName = null) {
    console.log('Sending createNotification request:', { userId, title, message, type, relatedId, teacherName });
    try {
      const response = await this.request(ENDPOINTS.NOTIFICATIONS_CREATE, {
        method: 'POST',
        body: {
          user_id: userId,
          title: title.trim(),
          message: message.trim(),
          type: type,
          related_id: relatedId,
          teacher_name: teacherName
        }
      });
      console.log('createNotification response:', response);
      return response;
    } catch (error) {
      console.error('Error in createNotification:', error);
      throw error;
    }
  }

  async getUserNotifications(userId, unreadOnly = false) {
    console.log('Sending getUserNotifications request for userId:', userId, 'unreadOnly:', unreadOnly);
    try {
      const url = `${ENDPOINTS.NOTIFICATIONS_USER}/${userId}${unreadOnly ? '?unreadOnly=true' : ''}`;
      const response = await this.request(url, {
        method: 'GET'
      });
      console.log('getUserNotifications response:', response);
      return response;
    } catch (error) {
      console.error('Error in getUserNotifications:', error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId, userId) {
    console.log('Sending markNotificationAsRead request:', { notificationId, userId });
    try {
      const response = await this.request(ENDPOINTS.NOTIFICATIONS_MARK_READ, {
        method: 'POST',
        body: {
          notification_id: notificationId,
          user_id: userId
        }
      });
      console.log('markNotificationAsRead response:', response);
      return response;
    } catch (error) {
      console.error('Error in markNotificationAsRead:', error);
      throw error;
    }
  }

  async markAllNotificationsAsRead(userId) {
    console.log('Sending markAllNotificationsAsRead request for userId:', userId);
    try {
      const response = await this.request(`${ENDPOINTS.NOTIFICATIONS_MARK_ALL_READ}/${userId}`, {
        method: 'POST'
      });
      console.log('markAllNotificationsAsRead response:', response);
      return response;
    } catch (error) {
      console.error('Error in markAllNotificationsAsRead:', error);
      throw error;
    }
  }

  async deleteNotification(notificationId, userId) {
    console.log('Sending deleteNotification request:', { notificationId, userId });
    try {
      const response = await this.request(`${ENDPOINTS.NOTIFICATIONS_DELETE}/${notificationId}/user/${userId}`, {
        method: 'DELETE'
      });
      console.log('deleteNotification response:', response);
      return response;
    } catch (error) {
      console.error('Error in deleteNotification:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const apiService = new APIService();