// Notification Manager component
import { apiService } from '../api.js';
import { Toast } from './toast.js';
import { Storage } from '../utils.js';

class NotificationManager {
  constructor() {
    this.notifications = [];
    this.currentUserId = this.getCurrentUserId();
    this.notificationBell = null;
    this.notificationDropdown = null;
    this.notificationBadge = null;
    this.init();
  }

  getCurrentUserId() {
    // Get user ID from localStorage using the Storage utility
    try {
      // Try 'currentUser' first (this is what the login system uses)
      const user = Storage.get('currentUser');
      
      if (user && typeof user === 'object') {
        return user.id || user.registerNumber || user.username || 'anonymous';
      }
      
      // Fallback to 'user' key for backward compatibility
      const fallbackUser = Storage.get('user');
      
      if (fallbackUser && typeof fallbackUser === 'object') {
        return fallbackUser.id || fallbackUser.registerNumber || fallbackUser.username || 'anonymous';
      }
      
      return 'anonymous';
    } catch (error) {
      console.error('Error getting user ID:', error);
      return 'anonymous';
    }
  }

  init() {
    this.createNotificationUI();
    this.loadNotifications();
    this.setupEventListeners();
    this.startPolling();
  }

  createNotificationUI() {
    // Create notification bell in the header
    const header = document.querySelector('header nav') || document.getElementById('notification-container');
    if (!header) return;

    // Create notification container
    const notificationContainer = document.createElement('div');
    notificationContainer.className = 'relative';
    notificationContainer.innerHTML = `
      <button id="notification-bell" class="relative p-2 text-gray-600 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl transition-all duration-300 hover:bg-blue-50 group shadow-sm hover:shadow-md">
        <svg class="w-7 h-7 transform group-hover:scale-110 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <!-- Enhanced bell icon with modern design -->
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
          <!-- Enhanced notification indicator with glow effect -->
          <circle id="bell-indicator" cx="18" cy="6" r="4" class="fill-red-500 stroke-red-600 hidden animate-pulse" filter="url(#glow)"/>
          <!-- SVG filter for glow effect -->
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
        </svg>
        <span id="notification-badge" class="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full h-7 w-7 flex items-center justify-center shadow-lg transform scale-100 hover:scale-110 transition-all duration-300 hidden min-w-[1.75rem] ring-2 ring-white ring-offset-1">0</span>
      </button>
      <div id="notification-dropdown" class="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 hidden backdrop-blur-lg bg-opacity-95 transition-all duration-300 transform origin-top-right">
        <div class="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
          <div class="flex items-center justify-between">
            <h3 class="text-xl font-bold text-gray-800 flex items-center">
              <svg class="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
              </svg>
              Notifications
            </h3>
            <div class="flex space-x-3">
              <button id="mark-all-read" class="text-sm font-medium text-blue-600 hover:text-blue-800 px-3 py-1 rounded-lg hover:bg-blue-100 transition-colors duration-200">
                Mark all read
              </button>
              <button id="close-notifications" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div id="notification-list" class="max-h-96 overflow-y-auto">
          <div class="p-8 text-center text-gray-500">
            <div class="mb-4">
              <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full mb-3">
                <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                </svg>
              </div>
            </div>
            <p class="text-lg font-medium text-gray-700 mb-1">No notifications</p>
            <p class="text-sm text-gray-500">You're all caught up!</p>
          </div>
        </div>
      </div>
    `;

    // Add to header
    header.appendChild(notificationContainer);

    // Store references
    this.notificationBell = document.getElementById('notification-bell');
    this.notificationDropdown = document.getElementById('notification-dropdown');
    this.notificationBadge = document.getElementById('notification-badge');
    this.notificationList = document.getElementById('notification-list');
  }

  setupEventListeners() {
    if (this.notificationBell) {
      this.notificationBell.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleDropdown();
      });
    }

    if (this.notificationDropdown) {
      this.notificationDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      this.closeDropdown();
    });

    // Mark all read button
    const markAllReadBtn = document.getElementById('mark-all-read');
    if (markAllReadBtn) {
      markAllReadBtn.addEventListener('click', () => {
        this.markAllAsRead();
      });
    }

    // Close button
    const closeBtn = document.getElementById('close-notifications');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeDropdown();
      });
    }
  }

  toggleDropdown() {
    if (!this.notificationDropdown) return;
    
    const isHidden = this.notificationDropdown.classList.contains('hidden');
    
    if (isHidden) {
      // Show dropdown with animation
      this.notificationDropdown.classList.remove('hidden');
      this.notificationDropdown.style.opacity = '0';
      this.notificationDropdown.style.transform = 'scale(0.95) translateY(-10px)';
      
      // Force reflow
      this.notificationDropdown.offsetHeight;
      
      // Animate in
      this.notificationDropdown.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      this.notificationDropdown.style.opacity = '1';
      this.notificationDropdown.style.transform = 'scale(1) translateY(0)';
      
      // Add bell animation
      if (this.notificationBell) {
        this.notificationBell.classList.add('animate-pulse');
        setTimeout(() => {
          this.notificationBell.classList.remove('animate-pulse');
        }, 1000);
      }
      
      if (!this.notificationDropdown.classList.contains('hidden')) {
        this.loadNotifications();
      }
    } else {
      // Hide dropdown with animation
      this.notificationDropdown.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
      this.notificationDropdown.style.opacity = '0';
      this.notificationDropdown.style.transform = 'scale(0.95) translateY(-10px)';
      
      setTimeout(() => {
        this.notificationDropdown.classList.add('hidden');
      }, 200);
    }
  }

  closeDropdown() {
    if (this.notificationDropdown && !this.notificationDropdown.classList.contains('hidden')) {
      // Animate out
      this.notificationDropdown.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
      this.notificationDropdown.style.opacity = '0';
      this.notificationDropdown.style.transform = 'scale(0.95) translateY(-10px)';
      
      setTimeout(() => {
        this.notificationDropdown.classList.add('hidden');
      }, 200);
    }
  }

  async loadNotifications() {
    try {
      const response = await apiService.getUserNotifications(this.currentUserId);
      this.notifications = response.notifications || [];
      this.updateNotificationUI(response.unread_count || 0);
      this.renderNotifications();
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  updateNotificationUI(unreadCount) {
    if (!this.notificationBadge) return;

    if (unreadCount > 0) {
      this.notificationBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      this.notificationBadge.classList.remove('hidden');
      
      // Add pulse animation for new notifications
      this.notificationBadge.classList.add('animate-pulse');
      
      // Show bell indicator
      const bellIndicator = document.getElementById('bell-indicator');
      if (bellIndicator) {
        bellIndicator.classList.remove('hidden');
      }
      
      // Remove pulse after 2 seconds
      setTimeout(() => {
        this.notificationBadge.classList.remove('animate-pulse');
      }, 2000);
    } else {
      this.notificationBadge.classList.add('hidden');
      
      // Hide bell indicator
      const bellIndicator = document.getElementById('bell-indicator');
      if (bellIndicator) {
        bellIndicator.classList.add('hidden');
      }
    }
  }

  renderNotifications() {
    if (!this.notificationList) return;

    if (this.notifications.length === 0) {
      this.notificationList.innerHTML = `
        <div class="p-8 text-center text-gray-500">
          <div class="mb-4">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full mb-3">
              <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
              </svg>
            </div>
          </div>
          <p class="text-lg font-medium text-gray-700 mb-1">No notifications</p>
          <p class="text-sm text-gray-500">You're all caught up!</p>
        </div>
      `;
      return;
    }

    this.notificationList.innerHTML = this.notifications.map(notification => `
      <div class="notification-item p-4 border-b border-gray-100 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 cursor-pointer transition-all duration-200 ${notification.status === 'unread' ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-l-blue-500' : ''}" 
           data-notification-id="${notification.id}">
        <div class="flex items-start space-x-4">
          <div class="flex-shrink-0">
            <div class="w-12 h-12 rounded-full bg-gradient-to-br ${this.getNotificationBackground(notification.type)} flex items-center justify-center shadow-sm">
              ${this.getNotificationIcon(notification.type)}
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-2">
              <p class="text-sm font-semibold text-gray-900 ${notification.status === 'unread' ? 'font-bold' : ''}">
                ${notification.title}
              </p>
              <div class="flex items-center space-x-2">
                ${notification.status === 'unread' ? '<div class="w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-sm"></div>' : ''}
                <button class="delete-notification text-gray-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-all duration-200" data-notification-id="${notification.id}">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>
            </div>
            <p class="text-sm text-gray-700 mb-2 leading-relaxed">${notification.message}</p>
            <div class="flex items-center justify-between">
              <p class="text-xs text-gray-500 font-medium">
                ${notification.teacher_name ? `<span class="inline-flex items-center"><svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>From ${notification.teacher_name}</span>` : ''}
              </p>
              <p class="text-xs text-gray-400 font-medium">
                ${this.formatDate(notification.created_at)}
              </p>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    // Add event listeners to notification items
    this.notificationList.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.closest('.delete-notification')) {
          this.handleNotificationClick(item.dataset.notificationId);
        }
      });
    });

    // Add event listeners to delete buttons
    this.notificationList.querySelectorAll('.delete-notification').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteNotification(btn.dataset.notificationId);
      });
    });
  }

  getNotificationIcon(type) {
    const icons = {
      feedback: '<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>',
      quiz_result: '<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>',
      coding_result: '<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>',
      communication_result: '<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>'
    };
    return icons[type] || icons.feedback;
  }

  getNotificationBackground(type) {
    const backgrounds = {
      feedback: 'from-blue-500 to-blue-600',
      quiz_result: 'from-green-500 to-green-600',
      coding_result: 'from-purple-500 to-purple-600',
      communication_result: 'from-orange-500 to-orange-600'
    };
    return backgrounds[type] || backgrounds.feedback;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  async handleNotificationClick(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (!notification) return;

    // Mark as read
    if (notification.status === 'unread') {
      await this.markAsRead(notificationId);
    }

    // Handle navigation based on notification type
    if (notification.type === 'feedback' && notification.related_id) {
      // Navigate to feedback page
      window.location.href = `feedback.html?feedback_id=${notification.related_id}`;
    } else if (notification.type === 'quiz_result') {
      // Navigate to history page
      window.location.href = 'history.html';
    } else if (notification.type === 'coding_result') {
      // Navigate to history page
      window.location.href = 'history.html';
    } else if (notification.type === 'communication_result') {
      // Navigate to history page
      window.location.href = 'history.html';
    }
  }

  async markAsRead(notificationId) {
    try {
      await apiService.markNotificationAsRead(notificationId, this.currentUserId);
      await this.loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async markAllAsRead() {
    try {
      await apiService.markAllNotificationsAsRead(this.currentUserId);
      await this.loadNotifications();
      Toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      Toast.error('Failed to mark all notifications as read');
    }
  }

  async deleteNotification(notificationId) {
    try {
      await apiService.deleteNotification(notificationId, this.currentUserId);
      await this.loadNotifications();
      Toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      Toast.error('Failed to delete notification');
    }
  }

  startPolling() {
    // Poll for new notifications every 30 seconds
    setInterval(() => {
      this.loadNotifications();
    }, 30000);
  }

  // Static method to create feedback notification
  static async createFeedbackNotification(userId, teacherName, feedbackType) {
    try {
      await apiService.createNotification(
        userId,
        'New Feedback Received',
        `Teacher ${teacherName} has provided ${feedbackType} feedback for you.`,
        'feedback',
        null,
        teacherName
      );
    } catch (error) {
      console.error('Error creating feedback notification:', error);
    }
  }
}

// Export singleton instance with error handling
let notificationManager;
try {
  notificationManager = new NotificationManager();
} catch (error) {
  console.error('Failed to initialize NotificationManager:', error);
  // Create a dummy manager that doesn't break the app
  notificationManager = {
    currentUserId: 'anonymous',
    init: () => {},
    loadNotifications: () => {},
    setupEventListeners: () => {},
    startPolling: () => {},
    updateNotificationUI: () => {},
    renderNotifications: () => {},
    markAllAsRead: async () => {},
    deleteNotification: async () => {},
    markNotificationAsRead: async () => {},
    createNotificationUI: () => {}
  };
}

export { notificationManager };
