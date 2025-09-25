// Import required functions
import { navigateTo } from '../utils.js';
import { showToast } from '../components/toast.js';

// Results page logic
document.addEventListener('DOMContentLoaded', () => {
  try {
    const result = JSON.parse(sessionStorage.getItem('quizResult'));
    
    if (!result) {
      showToast('No quiz results found. Please take a quiz first.', 'error');
      setTimeout(() => navigateTo('quiz.html'), 2000);
      return;
    }
    
    // Display overall score
    document.getElementById('overall-score').textContent = result.score;
    
    // Calculate correct/incorrect counts
    const [correctCount, totalCount] = result.score.split('/')[0].split('(')[0].split(' of ');
    const correct = parseInt(correctCount);
    const total = parseInt(totalCount);
    
    document.getElementById('total-questions').textContent = total;
    document.getElementById('correct-answers').textContent = correct;
    document.getElementById('incorrect-answers').textContent = total - correct;
    document.getElementById('time-taken').textContent = result.timeTaken;
    
    // Generate suggestions based on score
    const percentage = parseInt(result.score.split('(')[1]);
    let suggestions = '';
    
    if (percentage >= 80) {
      suggestions = 'Excellent work! You have a strong understanding of this material. Consider exploring more advanced topics.';
    } else if (percentage >= 60) {
      suggestions = 'Good job! You have a solid foundation. Review the incorrect answers to improve your knowledge.';
    } else {
      suggestions = 'Keep practicing! Focus on the topics you found challenging and review the material before trying again.';
    }
    
    document.getElementById('suggestions-text').textContent = suggestions;
    
    // Display detailed feedback for each question
    const container = document.getElementById('detailed-feedback');
    container.innerHTML = '';
    
    result.answers.forEach((answer, index) => {
      const isCorrect = answer.isCorrect;
      const questionDiv = document.createElement('div');
      questionDiv.className = `p-4 mb-4 rounded-lg ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`;
      
      questionDiv.innerHTML = `
        <div class="flex justify-between items-start">
          <h4 class="font-semibold text-gray-800">Question ${index + 1}: ${answer.question}</h4>
          <span class="px-2 py-1 text-xs font-semibold rounded ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
            ${isCorrect ? 'Correct' : 'Incorrect'}
          </span>
        </div>
        <div class="mt-2">
          <p class="text-sm text-gray-600">Your answer: <span class="font-medium">${answer.userAnswer || 'No answer provided'}</span></p>
          ${!isCorrect ? 
            `<p class="text-sm text-gray-600 mt-1">Correct answer: <span class="font-medium">${answer.correctAnswer}</span></p>` : ''
          }
        </div>
      `;
      
      container.appendChild(questionDiv);
    });
    
  } catch (error) {
    console.error('Error loading quiz results:', error);
    showToast('Failed to load quiz results. Please try again.', 'error');
  }
});

// Save results to history
function saveResults() {
  try {
    const result = JSON.parse(sessionStorage.getItem('quizResult'));
    
    if (!result) {
      showToast('No results to save.', 'error');
      return;
    }
    
    // Add timestamp if not exists
    if (!result.date) {
      result.date = new Date().toISOString();
    }
    
    // Add a unique ID if not exists
    if (!result.id) {
      result.id = Date.now().toString();
    }
    
    // Attach student_register_number if available
    try {
      const cu = localStorage.getItem('currentUser');
      if (cu) {
        const u = JSON.parse(cu);
        if (u?.user_type === 'student') {
          result.student_register_number = result.student_register_number || u.username;
        }
      }
    } catch {}

    // Save to unified history format for main page stats
    const unifiedHistory = JSON.parse(localStorage.getItem('srm_history_sessions') || '[]');
    const sessionData = {
      id: result.id,
      type: 'quiz',
      date: result.date,
      overallScore: result.percentage || 0,
      timeTakenSec: convertTimeToSeconds(result.timeTaken),
      topics: ['Quiz'], // Can be enhanced to extract actual topics
      totalQuestions: result.totalQuestions || 0,
      correctAnswers: result.correctAnswers || 0
    };
    
    // Check if already exists in unified history
    const existingUnifiedIndex = unifiedHistory.findIndex(item => item.id === result.id);
    if (existingUnifiedIndex >= 0) {
      unifiedHistory[existingUnifiedIndex] = sessionData;
    } else {
      unifiedHistory.unshift(sessionData);
    }
    localStorage.setItem('srm_history_sessions', JSON.stringify(unifiedHistory));
    
    // Also save to legacy quizHistory for backward compatibility
    const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
    const existingIndex = history.findIndex(item => item.id === result.id);
    
    if (existingIndex >= 0) {
      history[existingIndex] = result;
    } else {
      history.push(result);
    }
    localStorage.setItem('quizHistory', JSON.stringify(history));
    
    // Update button state
    const saveBtn = document.getElementById('save-results');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saved to History';
      saveBtn.className = 'bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg';
    }
    
    showToast('Results saved to your history!', 'success');
    
    // Trigger stats update event for main page
    window.dispatchEvent(new Event('statsUpdate'));
    
  } catch (error) {
    console.error('Error saving results:', error);
    showToast('Failed to save results. Please try again.', 'error');
  }
}

// Helper function to convert time format to seconds
function convertTimeToSeconds(timeString) {
  if (!timeString) return 0;
  const parts = timeString.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  return 0;
}

// Export functions for use in other modules
export { saveResults };

// Retry the same quiz
export const retryQuiz = () => {
  try {
    const result = JSON.parse(sessionStorage.getItem('quizResult'));
    
    if (!result) {
      showToast('No quiz data found to retry.', 'error');
      navigateTo('quiz.html');
      return;
    }
    
    // Clear the current result but keep the questions for retry
    const quizData = {
      questions: result.questions || [],
      quizTitle: result.quizTitle || 'Quiz',
      logId: result.logId
    };
    
    // Store the quiz data in session storage
    sessionStorage.setItem('quizData', JSON.stringify(quizData));
    
    // Navigate to quiz page
    window.location.href = 'quiz.html';
    
  } catch (error) {
    console.error('Error preparing quiz retry:', error);
    showToast('Failed to prepare quiz for retry. Starting a new quiz instead.', 'error');
    sessionStorage.removeItem('quizResult');
    navigateTo('quiz.html');
  }
};
  