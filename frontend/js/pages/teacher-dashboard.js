// Teacher dashboard functionality
import { showToast } from '../components/toast.js';
import { navigateTo } from '../utils.js';
import { apiService } from '../api.js';

let currentUser = null;
let currentStudentRegister = null;

function populateCodingHistory(codingScores) {
    const tableBody = document.getElementById('coding-history-table');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    
    if (!codingScores || codingScores.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="5" class="px-6 py-4 text-center text-sm text-gray-500">
                No coding history found for this student.
            </td>
        `;
        tableBody.appendChild(row);
        return;
    }
    
    const sorted = [...codingScores].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    
    sorted.forEach((item, idx) => {
        const row = document.createElement('tr');
        row.className = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        let dateStr = 'N/A';
        try { 
            dateStr = new Date(item.date).toLocaleString(); 
        } catch (e) {}
        
        const score = parseFloat(item.score) || 0;
        const status = item.is_correct ? 'Correct' : 'Incorrect';
        const statusClass = item.is_correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${dateStr}</td>
            <td class="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">${item.question || 'Coding Challenge'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${score}%</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 text-xs font-medium rounded-full ${statusClass}">
                    ${status}
                </span>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

function populateCommunicationHistory(communicationScores) {
    const tableBody = document.getElementById('communication-history-table');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    
    if (!communicationScores || communicationScores.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="5" class="px-6 py-4 text-center text-sm text-gray-500">
                No communication history found for this student.
            </td>
        `;
        tableBody.appendChild(row);
        return;
    }
    
    const sorted = [...communicationScores].sort((a, b) => new Date(b.date || b.timestamp || 0) - new Date(a.date || a.timestamp || 0));
    
    sorted.forEach((item, idx) => {
        const row = document.createElement('tr');
        row.className = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        let dateStr = 'N/A';
        try { 
            dateStr = new Date(item.date || item.timestamp || 0).toLocaleString(); 
        } catch (e) {}
        
        const overallScore = parseFloat(item.overall_score) || Math.round(((parseFloat(item.clarity) || 0) + (parseFloat(item.confidence) || 0)) / 2) || 0;
        const clarity = parseFloat(item.clarity) || 0;
        const confidence = parseFloat(item.confidence) || 0;
        
        const overallScoreClass = overallScore >= 80 ? 'text-green-600' : 
                                 overallScore >= 60 ? 'text-yellow-600' : 'text-red-600';
        const clarityClass = clarity >= 80 ? 'text-green-600' : 
                            clarity >= 60 ? 'text-yellow-600' : 'text-red-600';
        const confidenceClass = confidence >= 80 ? 'text-green-600' : 
                               confidence >= 60 ? 'text-yellow-600' : 'text-red-600';
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${dateStr}</td>
            <td class="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">${item.transcription || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${overallScoreClass}">${overallScore}%</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${clarityClass}">${clarity}%</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${confidenceClass}">${confidence}%</td>
        `;
        
        tableBody.appendChild(row);
    });
}

function setupRelatedItems(studentData) {
    const typeSel = document.getElementById('feedback-type');
    const relatedSel = document.getElementById('related-id');
    if (!typeSel || !relatedSel) return;
    const fill = () => {
        const t = typeSel.value;
        relatedSel.innerHTML = '<option value="">None</option>';
        if (t === 'quiz') {
            (studentData.quiz_results || []).forEach(q => {
                const lbl = `${new Date(q.date||0).toLocaleString()} - ${q.subject || 'Quiz'} (${q.score}%)`;
                const opt = document.createElement('option');
                opt.value = q.quiz_id || '';
                opt.textContent = lbl;
                relatedSel.appendChild(opt);
            });
        } else if (t === 'coding') {
            (studentData.coding_results || []).forEach(c => {
                const lbl = `${new Date(c.date||0).toLocaleString()} - ${(c.question||'Coding').slice(0,30)} (${c.score}%)`;
                const opt = document.createElement('option');
                opt.value = c.coding_id || '';
                opt.textContent = lbl;
                relatedSel.appendChild(opt);
            });
        }
    };
    typeSel.onchange = fill;
    fill();
}

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) {
        showToast('Please login first', 'error');
        navigateTo('login.html');
        return;
    }
    
    currentUser = JSON.parse(userStr);
    
    // Only allow teachers to access this page
    if (currentUser.user_type !== 'teacher') {
        showToast('Access denied. This page is for teachers only.', 'error');
        navigateTo('login.html');
        return;
    }
    
    // Update teacher name
    document.getElementById('teacher-name').textContent = `Welcome back, ${currentUser.username}!`;
    
    // Setup form submission
    const feedbackForm = document.getElementById('feedback-form');
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', handleFeedbackSubmission);
    }
    
    // Setup enter key for search
    const searchInput = document.getElementById('student-register-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchStudent();
            }
        });
    }
});

window.searchStudent = async function() {
    const registerNumber = document.getElementById('student-register-input').value.trim();
    
    if (!registerNumber) {
        showToast('Please enter a student register number', 'error');
        return;
    }
    
    currentStudentRegister = registerNumber;
    
    // Show loading state
    showLoadingState();
    
    try {
        console.log('Fetching student combined results for:', registerNumber);
        
        // Log the API URL being called
        const apiUrl = `${window.API_BASE}/feedback/student-results`;
        console.log('API URL:', apiUrl);
        
        // Add timestamp to prevent caching issues
        const timestamp = new Date().getTime();
        const response = await fetch(`${apiUrl}?_t=${timestamp}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                student_register_number: registerNumber,
                result_type: 'all'
            })
        }).catch(networkError => {
            console.error('Network error:', networkError);
            throw new Error('Network error. Please check your internet connection and try again.');
        });
        
        if (!response) {
            throw new Error('No response received from server');
        }
        
        if (!response.ok) {
            let errorMessage = `Server responded with status ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorData.message || errorMessage;
            } catch (e) {
                const errorText = await response.text();
                console.error('Failed to parse error response:', errorText);
            }
            throw new Error(errorMessage);
        }
        
        const studentData = await response.json().catch(e => {
            console.error('Error parsing JSON response:', e);
            throw new Error('Invalid response from server');
        });
        
        console.log('Received student data:', studentData);
        
        hideLoadingState();
        
        if ((studentData.total_quizzes || 0) === 0 && (studentData.total_coding || 0) === 0 && (studentData.total_communication || 0) === 0) {
            console.log('No results found for student:', registerNumber);
            showStudentNotFound();
        } else {
            console.log(`Found ${studentData.total_quizzes} quizzes, ${studentData.total_coding} coding entries and ${studentData.total_communication} communication entries for student`);
            showStudentResults(studentData);
        }
        
    } catch (error) {
        console.error('Error in searchStudent:', error);
        hideLoadingState();
        
        // More user-friendly error messages
        let errorMessage = error.message;
        if (error.message.includes('Failed to fetch') || error.message.includes('Network error')) {
            errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
        } else if (error.message.includes('CORS')) {
            errorMessage = 'CORS error. Please ensure the backend server is running and properly configured for CORS.';
        }
        
        showToast(`Error: ${errorMessage}`, 'error');
    }
};

function showLoadingState() {
    document.getElementById('loading-state').classList.remove('hidden');
    document.getElementById('student-not-found').classList.add('hidden');
    document.getElementById('student-results').classList.add('hidden');
}

function hideLoadingState() {
    document.getElementById('loading-state').classList.add('hidden');
}

function showStudentNotFound() {
    document.getElementById('student-not-found').classList.remove('hidden');
    document.getElementById('student-results').classList.add('hidden');
}

function showStudentResults(studentData) {
    console.log('Displaying student results:', studentData);
    
    document.getElementById('student-not-found').classList.add('hidden');
    document.getElementById('student-results').classList.remove('hidden');
    
    // Update student register number
    const registerNumber = studentData.student_register_number || currentStudentRegister || 'N/A';
    document.getElementById('student-register').textContent = registerNumber;
    
    // Populate quiz history table
    populateQuizHistory(studentData.quiz_results || []);

    // Populate coding history table
    populateCodingHistory(studentData.coding_results || []);

    // Populate communication history table
    populateCommunicationHistory(studentData.communication_results || []);

    // Populate related-id dropdown based on feedback type selection
    setupRelatedItems(studentData);
}

function populateQuizHistory(quizScores) {
    const tableBody = document.getElementById('quiz-history-table');
    tableBody.innerHTML = '';
    
    if (!quizScores || quizScores.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="5" class="px-6 py-4 text-center text-sm text-gray-500">
                No quiz history found for this student.
            </td>
        `;
        tableBody.appendChild(row);
        return;
    }
    
    console.log('Populating quiz history with scores:', quizScores);
    
    // Sort by date (newest first)
    const sortedQuizzes = [...quizScores].sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateB - dateA; // Newest first
    });
    
    sortedQuizzes.forEach((quiz, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        // Format date
        let dateStr = 'N/A';
        try {
            dateStr = new Date(quiz.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            console.warn('Invalid date format:', quiz.date);
            dateStr = 'N/A';
        }
        
        // Determine score class
        const score = parseFloat(quiz.score) || 0;
        const scoreClass = score >= 80 ? 'text-green-600' : 
                         score >= 60 ? 'text-yellow-600' : 'text-red-600';
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${dateStr}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${quiz.subject || 'General'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${scoreClass}">${score}%</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${quiz.total_questions || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${quiz.time_taken || 'N/A'}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

async function handleFeedbackSubmission(event) {
    event.preventDefault();
    
    if (!currentStudentRegister) {
        showToast('Please search for a student first', 'error');
        return;
    }
    
    const testType = document.getElementById('test-type')?.value;
    const feedbackType = document.getElementById('feedback-type')?.value || 'constructive';
    const message = document.getElementById('feedback-message').value.trim();
    
    if (!testType) {
        showToast('Please select a test type', 'error');
        return;
    }
    
    if (!message) {
        showToast('Please enter a feedback message', 'error');
        return;
    }
    
    try {
        // Map the feedback type to match the backend's expected format
        const feedbackTypeMap = {
            'positive': 'general',
            'constructive': 'general',
            'improvement': 'general',
            'quiz': 'quiz',
            'coding': 'coding',
            'communication': 'communication',
            'general': 'general'
        };

        const feedbackData = {
            student_register_number: currentStudentRegister,
            teacher_id: currentUser.user_id,
            feedback_text: message,
            feedback_type: feedbackTypeMap[testType] || 'general',
            subject: testType === 'quiz' ? 'Quiz Feedback' : 
                     testType === 'coding' ? 'Coding Feedback' : 
                     testType === 'communication' ? 'Communication Feedback' : 'General Feedback',
            score: 0
        };
        
        console.log('Sending feedback data:', feedbackData);
        
        // Test network connectivity first using a valid endpoint
        try {
            await fetch(`${window.API_BASE}/test-cors`, { method: 'GET' });
        } catch (networkError) {
            console.error('Network error:', networkError);
            throw new Error('Cannot connect to the server. Please check your internet connection and ensure the backend is running.');
        }
        
        const response = await fetch(`${window.API_BASE}/feedback/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(feedbackData),
            credentials: 'include'  // Include cookies for authentication
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Server error response:', response.status, errorData);
            throw new Error(errorData.detail || `Server responded with status ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Feedback created successfully:', result);
        
        // Create notification for the student
        try {
            await apiService.createNotification(
                currentStudentRegister,
                'New Feedback Received',
                `Teacher ${currentUser.username} has provided ${testType} feedback for you.`,
                'feedback',
                result.feedback_id || null,
                currentUser.username
            );
            console.log('Notification created successfully');
        } catch (notificationError) {
            console.error('Error creating notification:', notificationError);
            // Don't show error to teacher, just log it
        }
        
        showToast('Feedback sent successfully!', 'success');
        
        // Clear the form
        document.getElementById('feedback-form').reset();
        
    } catch (error) {
        console.error('Error creating feedback:', error);
        showToast(`Error: ${error.message}`, 'error');
    }
}

// View student code in modal - matches student module's showCodingDetails function
window.viewStudentCode = function(codingItem) {
    const modal = document.getElementById('code-modal');
    const modalContent = document.getElementById('code-modal-content');
    if (!modal || !modalContent) return;

    // Format the date
    let dateStr = 'N/A';
    try {
        dateStr = new Date(codingItem.date || codingItem.timestamp).toLocaleString();
    } catch (e) {}

    // Get the code from the correct property (handle both userCode and code properties)
    const userCode = codingItem.userCode || codingItem.code || '// No code submitted';
    
    // Create the modal content
    modalContent.innerHTML = `
        <div class="space-y-6">
            <div class="border-b border-gray-200 pb-4">
                <div class="flex items-center justify-between">
                    <h3 class="text-lg font-medium text-gray-900">Coding Submission Details</h3>
                    <div class="flex items-center space-x-2">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            codingItem.isCorrect || codingItem.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }">
                            ${codingItem.isCorrect || codingItem.passed ? 'Correct' : 'Incorrect'}
                        </span>
                        <span class="text-sm text-gray-500">${dateStr}</span>
                    </div>
                </div>
            </div>
            
            <div>
                <h4 class="text-sm font-medium text-gray-700 mb-1">Question:</h4>
                <div class="bg-gray-50 p-3 rounded-md">
                    <p class="whitespace-pre-wrap text-gray-800">${codingItem.question || codingItem.problem || 'No question provided'}</p>
                </div>
            </div>
            
            <div>
                <div class="flex justify-between items-center mb-1">
                    <h4 class="text-sm font-medium text-gray-700">Student's Code:</h4>
                    <span class="text-xs text-gray-500">Score: ${codingItem.score || 0}%</span>
                </div>
                <div class="bg-gray-900 rounded-md overflow-hidden border border-gray-700">
                    <pre class="text-green-400 text-sm p-4 overflow-auto max-h-96"><code class="language-python">${userCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
                </div>
            </div>
            
            <div class="bg-blue-50 p-3 rounded-md">
                <h4 class="text-sm font-medium text-gray-700 mb-1">Test Results:</h4>
                <p class="text-sm text-gray-800">
                    ${(codingItem.isCorrect || codingItem.passed) ? 
                        '✅ All test cases passed!' : 
                        '❌ ' + (codingItem.feedback || codingItem.message || 'Some test cases failed. Please review the code.')
                    }
                </p>
                ${codingItem.suggestions || codingItem.hint ? `
                <div class="mt-2">
                    <h5 class="text-xs font-medium text-gray-600 uppercase tracking-wider">${codingItem.suggestions ? 'Suggestions' : 'Hint'}:</h5>
                    <p class="text-sm text-gray-700 mt-1">${codingItem.suggestions || codingItem.hint}</p>
                </div>` : ''}
            </div>
            
            <div class="flex justify-end space-x-3 pt-2">
                <button onclick="document.getElementById('code-modal').classList.add('hidden')" 
                        class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    Close
                </button>
            </div>
        </div>
    `;
    
    // Show the modal
    modal.classList.remove('hidden');
    
    // Add syntax highlighting if available
    if (window.hljs) {
        const codeElement = modalContent.querySelector('code');
        if (codeElement) {
            hljs.highlightElement(codeElement);
        }
    }
    
    // Add escape key listener to close modal
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            modal.classList.add('hidden');
            document.removeEventListener('keydown', handleKeyDown);
        }
    };
    document.addEventListener('keydown', handleKeyDown);
};

// Handle test type and feedback type changes
document.addEventListener('DOMContentLoaded', function() {
    const testTypeSelect = document.getElementById('test-type');
    const feedbackTypeSelect = document.getElementById('feedback-type');
    
    if (testTypeSelect) {
        testTypeSelect.addEventListener('change', function() {
            const testType = this.value;
            // No need to handle related items anymore
        });
    }
    
    if (feedbackTypeSelect) {
        feedbackTypeSelect.addEventListener('change', function() {
            // Feedback type change handler if needed
        });
    }
});

window.logout = function() {
    localStorage.removeItem('currentUser');
    showToast('Logged out successfully', 'success');
    setTimeout(() => {
        navigateTo('login.html');
    }, 1000);
};
