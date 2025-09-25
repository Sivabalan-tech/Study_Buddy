// Practice page logic
import { apiService } from '../api.js';
import { Toast } from '../components/toast.js';

const form = document.getElementById('practice-form');
const questionsSection = document.getElementById('questions-section');
const questionsContainer = document.getElementById('questions-container');
const editorSection = document.getElementById('editor-section');
const resultsSection = document.getElementById('results-section');
const editor = document.getElementById('code-editor');
const currentTitle = document.getElementById('current-question-title');
const currentText = document.getElementById('current-question-text');
const resultsContent = document.getElementById('results-content');

let questions = [], idx = 0;
let results = []; // Store results for each question

// Storage helper
const Storage = {
  get: function(key, defaultValue = []) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading from localStorage:`, error);
      return defaultValue;
    }
  },
  
  set: function(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage:`, error);
      return false;
    }
  }
};

form.onsubmit = async (e) => {
  e.preventDefault();
  questions = []; 
  idx = 0; 
  results = [];
  resultsSection.classList.add('hidden');
  editorSection.classList.add('hidden'); 
  questionsContainer.innerHTML = '';
  
  try {
    const topic = document.getElementById('topic').value.trim();
    const level = document.getElementById('level').value;
    const out = await apiService.generateCoding({ topic, level });
    questions = out.questions || [];
    if (!questions.length) throw new Error('No questions generated');
    
    // Initialize results array
    results = questions.map(q => ({
      question: q.question,
      userCode: '',
      score: 0,
      feedback: '',
      suggestions: '',
      isCorrect: false,
      timestamp: null
    }));
    
    questionsSection.classList.remove('hidden');
    questions.forEach((q, i) => {
      const el = document.createElement('div');
      el.className = 'card';
      el.innerHTML = `
        <h3 class="font-semibold">Q${i+1}</h3>
        <p class="text-gray-700">${q.question}</p>
        <div class="mt-3 flex space-x-2">
          <button class="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition-colors">
            Solve
          </button>
          <button class="save-history-btn bg-gray-200 text-gray-700 px-3 py-2 rounded hover:bg-gray-300 transition-colors" 
                  data-index="${i}" disabled>
            Save to History
          </button>
        </div>
      `;
      el.querySelector('button:first-child').onclick = () => openEditor(i);
      questionsContainer.appendChild(el);
    });
    Toast.success('Generated 5 practice questions');
  } catch (err) { 
    Toast.error(err.message); 
  }
};

function openEditor(i) {
  idx = i; 
  currentTitle.textContent = `Question ${i+1}`; 
  currentText.textContent = questions[i].question;
  editor.value = results[i]?.userCode || '';
  editorSection.classList.remove('hidden');
  
  // Update results section if exists
  if (results[i].timestamp) {
    resultsSection.classList.remove('hidden');
    updateResultsUI(i);
  } else {
    resultsSection.classList.add('hidden');
  }
}

function updateResultsUI(i) {
  const result = results[i];
  resultsContent.innerHTML = `
    <div class="p-4 rounded ${result.isCorrect ? 'bg-green-50' : 'bg-red-50'} border ${result.isCorrect ? 'border-green-200' : 'border-red-200'}">
      <p class="font-medium">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${result.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
          ${result.isCorrect ? '✓ Correct' : '✗ Incorrect'}
        </span>
        <span class="ml-2">Score: ${result.score}/10</span>
      </p>
      ${result.feedback ? `<p class="mt-2"><strong>Feedback:</strong> ${result.feedback}</p>` : ''}
      ${result.suggestions ? `<p class="mt-2"><strong>Suggestions:</strong> ${result.suggestions}</p>` : ''}
      <p class="mt-2 text-sm text-gray-500">Last submitted: ${result.timestamp ? new Date(result.timestamp).toLocaleString() : 'Not submitted yet'}</p>
    </div>
    <div class="mt-4">
      <button onclick="saveToHistory(${i})" class="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
        Save to History
      </button>
    </div>
  `;
}

window.nextQuestion = () => { 
  if (idx < questions.length - 1) {
    openEditor(idx + 1);
  } else {
    Toast.info('No more questions');
  }
};

window.submitCode = async () => {
  try {
    const response = await apiService.evaluateCoding({
      question: questions[idx].question,
      userCode: editor.value
    });
    
    // Update results for current question
    results[idx] = {
      ...results[idx],
      userCode: editor.value,
      score: response.score || 0,
      feedback: response.feedback || '',
      suggestions: response.suggestions || '',
      isCorrect: response.isCorrect || false,
      timestamp: Date.now()
    };
    
    // Update UI
    resultsSection.classList.remove('hidden');
    updateResultsUI(idx);
    
    // Enable save button for this question
    const saveBtn = document.querySelector(`.save-history-btn[data-index="${idx}"]`);
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.classList.remove('bg-gray-200', 'text-gray-700');
      saveBtn.classList.add('bg-green-600', 'text-white', 'hover:bg-green-700');
    }
    
    Toast.success('Code submitted successfully!');
  } catch (error) {
    console.error('Error submitting code:', error);
    Toast.error(error.message || 'Failed to submit code. Please try again.');
  }
};

// Save question and result to history
window.saveToHistory = async (questionIndex) => {
  try {
    const question = questions[questionIndex];
    const result = results[questionIndex];
    
    if (!question || !result.timestamp) {
      Toast.warning('Please submit your code before saving to history');
      return;
    }
    
    const historyItem = {
      id: `coding-${Date.now()}`,
      type: 'coding',
      date: new Date().toISOString(),
      question: question.question,
      difficulty: question.difficulty || 'medium',
      topic: question.topic || 'Coding Practice',
      userCode: result.userCode,
      score: result.score,
      isCorrect: result.isCorrect,
      feedback: result.feedback,
      suggestions: result.suggestions,
      timestamp: result.timestamp
    };
    // Attach student_register_number when logged in
    try {
      const cu = localStorage.getItem('currentUser');
      if (cu) {
        const u = JSON.parse(cu);
        if (u?.user_type === 'student') {
          historyItem.student_register_number = u.username;
        }
      }
    } catch {}
    
    // Ensure student_register_number is set in historyItem
    try {
      const cu = localStorage.getItem('currentUser');
      if (cu) {
        const u = JSON.parse(cu);
        if (u?.user_type === 'student' && u?.username) {
          historyItem.student_register_number = u.username;
        }
      }
    } catch (e) { console.warn('Error setting student register number:', e); }
    
    // Save to unified history format for main page stats
    const unifiedHistory = JSON.parse(localStorage.getItem('srm_history_sessions') || '[]');
    const sessionData = {
      id: historyItem.id,
      type: 'coding',
      date: historyItem.date,
      overallScore: result.score * 10, // Convert 0-10 score to percentage
      timeTakenSec: Math.floor((Date.now() - result.timestamp) / 1000), // Approximate time
      topics: [question.topic || 'Coding Practice'],
      totalQuestions: 1,
      correctAnswers: result.isCorrect ? 1 : 0,
      student_register_number: historyItem.student_register_number
    };
    
    unifiedHistory.unshift(sessionData);
    localStorage.setItem('srm_history_sessions', JSON.stringify(unifiedHistory));
    
    // Also save to legacy codingHistory for backward compatibility
    const history = Storage.get('codingHistory', []);
    history.unshift(historyItem);
    const success = Storage.set('codingHistory', history);

    // Save to backend if student logged in
    try {
      const cu = localStorage.getItem('currentUser');
      if (cu) {
        const u = JSON.parse(cu);
        if (u?.user_type === 'student') {
          const codingData = {
            question: historyItem.question,
            score: Math.min(100, Math.max(0, (historyItem.score || 0) * 10)),
            is_correct: !!historyItem.isCorrect,
            time_taken: 'N/A',
            subject: historyItem.topic || 'Coding'
          };
          fetch(`${window.API_BASE}/coding/save-result`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              student_register_number: u.username,
              coding_data: codingData
            })
          }).catch(err => console.warn('Failed to save coding result to backend:', err));
        }
      }
    } catch (e) { console.warn('Coding backend save error:', e); }
    
    // Update UI
    const saveBtn = document.querySelector(`.save-history-btn[data-index="${questionIndex}"]`);
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saved ✓';
      saveBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
      saveBtn.classList.add('bg-gray-200', 'text-gray-500');
    }
    
    Toast.success('Saved to history!');
    
    // Trigger stats update event for main page
    window.dispatchEvent(new Event('statsUpdate'));
    
  } catch (error) {
    console.error('Error saving to history:', error);
    Toast.error('Failed to save to history. Please try again.');
  }
};

// Add global navigation
window.navigateTo = (page) => {
  window.location.href = page;
};
