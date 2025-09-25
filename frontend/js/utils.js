// Utility functions
// Navigation + helpers
export const navigateTo = (path) => {
  window.location.href = path;
};

export const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const truncate = (s, n=100) => (s?.length > n ? s.slice(0, n - 1) + "…" : (s || ""));
export const formatDate = (tsOrIso) => { try { return new Date(tsOrIso).toLocaleString(); } catch { return String(tsOrIso || ""); } };
export const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || "");
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Show toast notification
export const showToast = (message, type = 'info') => {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  const container = document.getElementById('toast-container');
  if (container) {
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
};

// Storage wrapper
export const Storage = {
  get: (k, d=null) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn("Storage.set failed", e); } },
  remove: (k) => { try { localStorage.removeItem(k); } catch {} },
};

// Also make functions available globally for backward compatibility
window.navigateTo = navigateTo;
window.generateId = generateId;
window.truncate = truncate;
window.formatDate = formatDate;
window.isValidEmail = isValidEmail;
window.sleep = sleep;
window.Storage = Storage;
window.showToast = showToast;
