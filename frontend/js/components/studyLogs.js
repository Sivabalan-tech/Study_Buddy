// Study Logs component using backend API
import { apiService } from '../api.js';
import { Toast } from './toast.js';
import { Storage } from '../utils.js';

class StudyLogs {
  constructor() {
    this.logs = [];
    this.currentUserId = this.getCurrentUserId();
  }

  getCurrentUserId() {
    // Get user ID from localStorage using the Storage utility for consistency
    try {
      // Try 'currentUser' first (this is what the login system uses)
      const user = Storage.get('currentUser');
      
      if (user && typeof user === 'object') {
        const userId = user.user_id || user.id || user.registerNumber || user.username || 'anonymous';
        console.log('Retrieved user ID:', userId, 'from currentUser data:', user);
        return userId;
      }
      
      // Fallback to 'user' key for backward compatibility
      const fallbackUser = Storage.get('user');
      
      if (fallbackUser && typeof fallbackUser === 'object') {
        const userId = fallbackUser.user_id || fallbackUser.id || fallbackUser.registerNumber || fallbackUser.username || 'anonymous';
        console.log('Retrieved user ID:', userId, 'from fallback user data:', fallbackUser);
        return userId;
      }
      
      console.warn('No user data found in localStorage');
      return 'anonymous';
    } catch (error) {
      console.error('Error getting user ID:', error);
      return 'anonymous';
    }
  }

  async create(title, content) {
    try {
      const response = await apiService.createStudyLog(title, content, this.currentUserId);
      
      // Convert backend response to frontend format
      const log = {
        id: response.id,
        title: response.title,
        content: response.content,
        createdAt: new Date(response.created_at).getTime(),
        userId: response.user_id
      };
      
      // Add to local cache
      this.logs.unshift(log);
      
      Toast.success('Study log created successfully');
      return log;
    } catch (error) {
      console.error('Error creating study log:', error);
      Toast.error('Failed to create study log');
      throw error;
    }
  }

  async list() {
    try {
      // Always fetch fresh data from backend
      const response = await apiService.getUserStudyLogs(this.currentUserId);
      
      // Convert backend response to frontend format
      this.logs = response.logs.map(log => ({
        id: log.id,
        title: log.title,
        content: log.content,
        createdAt: new Date(log.created_at).getTime(),
        userId: log.user_id
      }));
      
      return this.logs;
    } catch (error) {
      console.error('Error fetching study logs:', error);
      Toast.error('Failed to load study logs');
      return [];
    }
  }

  get(id) {
    return this.logs.find(l => l.id === id);
  }

  async delete(id) {
    try {
      await apiService.deleteStudyLog(id, this.currentUserId);
      
      // Remove from local cache
      this.logs = this.logs.filter(l => l.id !== id);
      
      Toast.info('Study log deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting study log:', error);
      Toast.error('Failed to delete study log');
      throw error;
    }
  }

  // Helper method to format date for display
  formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }
}

// Export singleton instance
const StudyLogsManager = new StudyLogs();
export { StudyLogsManager };

// Also make it available globally for backward compatibility
window.StudyLogsManager = StudyLogsManager;
  