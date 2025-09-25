// Logs page logic
import { StudyLogsManager } from '../components/studyLogs.js';
import { Toast } from '../components/toast.js';

async function render() {
  const container = document.getElementById('logs-container');
  
  try {
    // Show loading state
    container.innerHTML = '<div class="card text-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div><p class="text-gray-500">Loading study logs...</p></div>';
    
    const logs = await StudyLogsManager.list();
    
    if (!logs.length) {
      container.innerHTML = '<div class="card text-center py-12"><div class="text-gray-400 mb-4">📝</div><p class="text-gray-500">No study logs yet. Create your first log to get started!</p></div>';
      return;
    }
    
    container.innerHTML = logs.map(l => `<div class="card cursor-pointer hover:scale-105 transition" onclick="showLog('${l.id}')">
      <h3 class="text-lg font-semibold mb-2">${l.title}</h3>
      <p class="text-gray-600 text-sm mb-2">${(l.content || "").substring(0, 120)}...</p>
      <div class="text-xs text-gray-500">${StudyLogsManager.formatDate(l.createdAt)}</div>
    </div>`).join('');
  } catch (error) {
    console.error('Error rendering logs:', error);
    container.innerHTML = '<div class="card text-center py-12"><div class="text-red-400 mb-4">❌</div><p class="text-gray-500">Failed to load study logs. Please try again.</p></div>';
  }
}

function showCreateLogModal() { 
  document.getElementById('create-log-modal').classList.remove('hidden'); 
}

function hideCreateLogModal() { 
  document.getElementById('create-log-modal').classList.add('hidden'); 
  document.getElementById('create-log-form').reset(); 
}

// Make modal functions globally available for inline HTML onclick attributes
window.showCreateLogModal = showCreateLogModal;
window.hideCreateLogModal = hideCreateLogModal;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('create-log-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('log-title').value;
    const content = document.getElementById('log-content').value;
    
    if (!title || !content) return;
    
    try {
      // Show loading state
      const submitBtn = e.target.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Creating...';
      submitBtn.disabled = true;
      
      await StudyLogsManager.create(title, content);
      hideCreateLogModal();
      await render();
    } catch (error) {
      console.error('Error creating log:', error);
      // Error is already handled by StudyLogsManager with Toast
    } finally {
      // Reset button state
      const submitBtn = e.target.querySelector('button[type="submit"]');
      submitBtn.textContent = 'Create Log';
      submitBtn.disabled = false;
    }
  });
  
  render();
});

// Make functions globally available for inline HTML onclick attributes
window.showLog = function(id) {
  const log = StudyLogsManager.get(id);
  if (!log) return;
  document.getElementById('log-detail-title').textContent = log.title;
  document.getElementById('log-detail-content').textContent = log.content;
  document.getElementById('log-detail-modal').classList.remove('hidden');
  window.currentLogId = id;
};

window.hideLogDetailModal = function() { 
  document.getElementById('log-detail-modal').classList.add('hidden'); 
  window.currentLogId = null; 
};

window.deleteCurrentLog = async function() { 
  if (!window.currentLogId) return; 
  
  try {
    await StudyLogsManager.delete(window.currentLogId); 
    hideLogDetailModal(); 
    await render(); 
  } catch (error) {
    console.error('Error deleting log:', error);
    // Error is already handled by StudyLogsManager with Toast
  }
};

window.useLogForQuiz = function() { 
  if (!window.currentLogId) return; 
  // Set the key for sessionStorage to be picked up by quiz.js
  sessionStorage.setItem('selectedLogForQuiz', window.currentLogId);
  hideLogDetailModal();
  if (Toast) {
    Toast.success('Log selected for quiz!');
  }
  // This assumes a global navigateTo function exists
  if (window.navigateTo) {
    window.navigateTo('quiz.html');
  } else {
    window.location.href = 'quiz.html';
  }
};