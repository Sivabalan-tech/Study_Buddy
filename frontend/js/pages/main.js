// Main page logic
function updateStats() {
    const history = JSON.parse(localStorage.getItem('srm_history_sessions')||'[]');
    const sessions = history.length;
    const total = history.reduce((a,s)=>a+(s.overallScore||0),0);
    const avg = sessions? Math.round(total/sessions):0;
    const secs = history.reduce((a,s)=>a+(s.timeTakenSec||0),0);
    
    const totalSessionsEl = document.getElementById('total-sessions');
    const avgScoreEl = document.getElementById('avg-score');
    const totalTimeEl = document.getElementById('total-time');
    const topicsCoveredEl = document.getElementById('topics-covered');
    
    if (totalSessionsEl) totalSessionsEl.textContent = sessions;
    if (avgScoreEl) avgScoreEl.textContent = `${avg}%`;
    if (totalTimeEl) totalTimeEl.textContent = `${Math.round(secs/3600)}h`;
    if (topicsCoveredEl) topicsCoveredEl.textContent = new Set(history.flatMap(s=>s.topics||[])).size;
}

// Check user authentication and update UI
function checkUserAuth() {
    const userStr = localStorage.getItem('currentUser');
    const userMenu = document.getElementById('user-menu');
    const loginPrompt = document.getElementById('login-prompt');
    
    if (userStr) {
        const user = JSON.parse(userStr);
        if (userMenu) {
            userMenu.classList.remove('hidden');
        }
        if (loginPrompt) {
            loginPrompt.classList.add('hidden');
        }
    } else {
        if (userMenu) {
            userMenu.classList.add('hidden');
        }
        if (loginPrompt) {
            loginPrompt.classList.remove('hidden');
        }
    }
}

// Logout function
window.logout = function() {
    localStorage.removeItem('currentUser');
    checkUserAuth();
    if (window.showToast) {
        window.showToast('Logged out successfully', 'success');
    }
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1000);
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    updateStats();
    checkUserAuth();
});

// Listen for storage changes to update stats in real-time
window.addEventListener('storage', function(e) {
    if (e.key === 'srm_history_sessions') {
        updateStats();
    }
    if (e.key === 'currentUser') {
        checkUserAuth();
    }
});

// Also listen for custom events from same-window updates
window.addEventListener('statsUpdate', updateStats);

// Make functions globally available
window.updateStats = updateStats;
window.checkUserAuth = checkUserAuth;
  