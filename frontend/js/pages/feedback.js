// Feedback page functionality for students
import { showToast } from '../components/toast.js';
import { navigateTo } from '../utils.js';

let currentUser = null;

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) {
        showToast('Please login first', 'error');
        navigateTo('login.html');
        return;
    }
    
    currentUser = JSON.parse(userStr);
    
    // Only allow students to access this page
    if (currentUser.user_type !== 'student') {
        showToast('Access denied. This page is for students only.', 'error');
        navigateTo('login.html');
        return;
    }
    
    loadStudentFeedback();
});

async function loadStudentFeedback() {
    const loadingState = document.getElementById('loading-state');
    const noFeedbackState = document.getElementById('no-feedback-state');
    const feedbackContainer = document.getElementById('feedback-container');
    const feedbackStats = document.getElementById('feedback-stats');
    
    try {
        const response = await fetch(`${window.API_BASE}/feedback/student`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                student_register_number: currentUser.username
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch feedback');
        }
        
        const feedbackList = await response.json();
        
        loadingState.classList.add('hidden');
        
        if (feedbackList.length === 0) {
            noFeedbackState.classList.remove('hidden');
        } else {
            feedbackContainer.classList.remove('hidden');
            feedbackStats.classList.remove('hidden');
            displayFeedback(feedbackList);
            updateStats(feedbackList);
        }
        
    } catch (error) {
        console.error('Error loading feedback:', error);
        loadingState.classList.add('hidden');
        showToast('Failed to load feedback. Please try again.', 'error');
    }
}

function displayFeedback(feedbackList) {
    const container = document.getElementById('feedback-container');
    container.innerHTML = '';
    
    // Sort feedback by date (newest first)
    feedbackList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    feedbackList.forEach(feedback => {
        const feedbackCard = createFeedbackCard(feedback);
        container.appendChild(feedbackCard);
    });
}

function createFeedbackCard(feedback) {
    const card = document.createElement('div');
    card.className = `card hover-lift ${!feedback.is_read ? 'border-l-4 border-blue-500' : ''} relative`;
    
    const date = new Date(feedback.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Format test type for display
    let testTypeBadge = '';
    if (feedback.test_type) {
        const typeMap = {
            'quiz': { text: 'Quiz', class: 'bg-blue-100 text-blue-800' },
            'coding': { text: 'Coding', class: 'bg-green-100 text-green-800' },
            'general': { text: 'General', class: 'bg-gray-100 text-gray-800' }
        };
        const typeInfo = typeMap[feedback.test_type] || { text: feedback.test_type, class: 'bg-gray-100 text-gray-800' };
        testTypeBadge = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeInfo.class} ml-2">
            ${typeInfo.text}
        </span>`;
    }
    
    // Format feedback type for display
    let feedbackTypeBadge = '';
    if (feedback.feedback_type) {
        const typeMap = {
            'positive': { text: 'Positive', class: 'bg-green-100 text-green-800' },
            'constructive': { text: 'Constructive', class: 'bg-yellow-100 text-yellow-800' },
            'improvement': { text: 'Needs Improvement', class: 'bg-red-100 text-red-800' }
        };
        const typeInfo = typeMap[feedback.feedback_type] || { text: feedback.feedback_type, class: 'bg-gray-100 text-gray-800' };
        feedbackTypeBadge = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeInfo.class}">
            ${typeInfo.text}
        </span>`;
    }
    
    // Format related item if available
    let relatedItemInfo = '';
    if (feedback.related_id && feedback.test_type) {
        const prefix = feedback.test_type === 'quiz' ? 'Quiz on ' : 
                      feedback.test_type === 'coding' ? 'Coding exercise ' : '';
        relatedItemInfo = `
            <div class="mt-2 text-sm text-gray-600">
                <span class="font-medium">Related to:</span> ${prefix}${feedback.related_id}
            </div>`;
    }
    
    // Add teacher information if available
    const teacherInfo = feedback.teacher_name ? `
        <div class="absolute top-4 right-4 flex items-center">
            <span class="text-sm text-gray-500 mr-2">From:</span>
            <span class="font-medium text-gray-700">${feedback.teacher_name}</span>
        </div>` : '';
    
    card.innerHTML = `
        <div class="p-6">
            ${teacherInfo}
            <div class="flex justify-between items-start">
                <h3 class="text-lg font-medium text-gray-900">${feedback.subject || 'Feedback'}</h3>
                <div class="flex space-x-2">
                    ${testTypeBadge}
                    ${feedbackTypeBadge}
                </div>
            </div>
            <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span class="text-white font-semibold">👨‍🏫</span>
                    </div>
                    <div>
                        <h3 class="font-semibold text-gray-800">Teacher Feedback</h3>
                        <p class="text-sm text-gray-500">${date}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    ${!feedback.is_read ? '<span class="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">New</span>' : ''}
                    ${feedback.quiz_score !== null ? `<span class="px-3 py-1 bg-green-100 text-green-600 text-sm rounded-full font-medium">Score: ${feedback.quiz_score}%</span>` : ''}
                </div>
            </div>
            
            <p class="text-gray-700 leading-relaxed">${feedback.feedback_text}</p>
        </div>
        
        ${feedback.subject ? `
            <div class="mb-4">
                <span class="inline-block px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                    📚 ${feedback.subject}
                </span>
            </div>
        ` : ''}
        
        ${!feedback.is_read ? `
            <button onclick="markAsRead('${feedback.feedback_id}')" class="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Mark as Read
            </button>
        ` : ''}
    `;
    
    return card;
}

function updateStats(feedbackList) {
    const totalFeedback = feedbackList.length;
    const unreadFeedback = feedbackList.filter(f => !f.is_read).length;
    
    // Calculate average quiz score from feedback with scores
    const feedbackWithScores = feedbackList.filter(f => f.quiz_score !== null);
    const avgScore = feedbackWithScores.length > 0 
        ? Math.round(feedbackWithScores.reduce((sum, f) => sum + f.quiz_score, 0) / feedbackWithScores.length)
        : 0;
    
    document.getElementById('total-feedback').textContent = totalFeedback;
    document.getElementById('unread-feedback').textContent = unreadFeedback;
    document.getElementById('avg-quiz-score').textContent = `${avgScore}%`;
}

window.markAsRead = async function(feedbackId) {
    try {
        const response = await fetch(`${window.API_BASE}/feedback/mark-read/${feedbackId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (response.ok) {
            showToast('Feedback marked as read', 'success');
            // Reload feedback to update the UI
            loadStudentFeedback();
        } else {
            throw new Error('Failed to mark as read');
        }
    } catch (error) {
        console.error('Error marking feedback as read:', error);
        showToast('Failed to mark as read. Please try again.', 'error');
    }
};
