// Toast component
const Toast = {
  container: null,
  
  init() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    this.container.className = 'fixed top-4 right-4 z-50 space-y-2';
    document.body.appendChild(this.container);
  },
  
  show(message, type = 'info', duration = 4000) {
    if (!this.container) this.init();
    
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" aria-label="close">×</button>
      </div>
    `;
    
    el.querySelector('.toast-close').onclick = () => el.remove();
    this.container.appendChild(el);
    
    if (duration > 0) {
      setTimeout(() => el.remove(), duration);
    }
    
    return el;
  },
  
  success(message, duration) { return this.show(message, 'success', duration || 3000); },
  error(message, duration) { return this.show(message, 'error', duration || 5000); },
  warning(message, duration) { return this.show(message, 'warning', duration || 4000); },
  info(message, duration) { return this.show(message, 'info', duration || 3000); }
};

// Export functions for ES6 modules
export const showToast = (message, type = 'info', duration = 4000) => Toast.show(message, type, duration);
export const showSuccess = (message, duration) => Toast.success(message, duration);
export const showError = (message, duration) => Toast.error(message, duration);
export const showWarning = (message, duration) => Toast.warning(message, duration);
export const showInfo = (message, duration) => Toast.info(message, duration);

// Export the Toast object for ES6 modules
export { Toast };

// Initialize immediately
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Toast.init());
} else {
  Toast.init();
}

// Make it globally available for backward compatibility
window.Toast = Toast;
window.showToast = showToast;