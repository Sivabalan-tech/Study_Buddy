// Corrected: Contains verified logic for button visibility and efficient answer selection.
import { apiService } from '../api.js';
import { StudyLogsManager } from '../components/studyLogs.js';

// Storage helper
const Storage = {
  get: function(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading from localStorage: ${error}`);
      return defaultValue;
    }
  },
  
  set: function(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage: ${error}`);
      return false;
    }
  }
};

// Global variables
let quiz = [];
let userAnswers = [];
let currentQuestionIndex = 0;
let quizResults = null;

// DOM Elements
const domElements = {
  quizContainer: null,
  quizGenerator: null,
  resultsContainer: null,
  mcqSection: null,
  mcqQuestionText: null,
  mcqOptions: null,
  questionCounter: null,
  quizTimer: null,
  progressBar: null,
  nextButton: null,
  prevButton: null,
  submitButton: null,
  floatingSubmit: null
};

// Initialize DOM elements
function initDOMElements() {
  domElements.quizContainer = document.getElementById('quiz-container');
  domElements.quizGenerator = document.getElementById('quiz-generator');
  domElements.resultsContainer = document.getElementById('results-container');
  domElements.mcqSection = document.getElementById('mcq-section');
  domElements.mcqQuestionText = document.getElementById('mcq-question-text');
  domElements.mcqOptions = document.getElementById('mcq-options');
  domElements.questionCounter = document.getElementById('question-counter');
  domElements.quizTimer = document.getElementById('quiz-timer');
  domElements.progressBar = document.getElementById('quiz-progress');
  domElements.nextButton = document.getElementById('next-question');
  domElements.prevButton = document.getElementById('prev-question');
  domElements.submitButton = document.getElementById('submit-quiz');
  domElements.floatingSubmit = document.getElementById('floating-submit');
  
  if (domElements.floatingSubmit) {
    domElements.floatingSubmit.addEventListener('click', submitQuiz);
  }
}

// Quiz Timer
const QuizTimer = {
  startTime: null,
  interval: null,
  
  start() {
    this.startTime = Date.now();
    this.interval = setInterval(this.updateTimer.bind(this), 1000);
  },
  
  updateTimer() {
    if (!this.startTime) return;
    const elapsedMs = Date.now() - this.startTime;
    const minutes = Math.floor(elapsedMs / 60000);
    const seconds = Math.floor((elapsedMs % 60000) / 1000);
    domElements.quizTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  },
  
  getElapsedTime() {
    if (!this.startTime) return '00:00';
    const elapsedMs = Date.now() - this.startTime;
    const minutes = Math.floor(elapsedMs / 60000);
    const seconds = Math.floor((elapsedMs % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  },
  
  stop() {
    clearInterval(this.interval);
    this.interval = null;
  },
  
  reset() {
    this.stop();
    this.startTime = null;
    domElements.quizTimer.textContent = '00:00';
  }
};

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  initDOMElements();

  // Set up event listeners for navigation buttons
  if (domElements.nextButton) {
    domElements.nextButton.addEventListener('click', nextQuestion);
  }
  if (domElements.prevButton) {
    domElements.prevButton.addEventListener('click', prevQuestion);
  }
  if (domElements.submitButton) {
    domElements.submitButton.addEventListener('click', submitQuiz);
  }

  const selectedLogId = sessionStorage.getItem('selectedLogForQuiz');
  if (selectedLogId) {
    sessionStorage.removeItem('selectedLogForQuiz');
    generateQuiz(selectedLogId);
  } else {
    initQuiz();
    loadStudyLogs();
  }
});

// Load study logs into the select dropdown
async function loadStudyLogs() {
  try {
    const selectEl = document.getElementById('study-log-select');
    if (!selectEl) return;
    
    selectEl.innerHTML = '<option value="">Loading study logs...</option>';
    
    const logs = await StudyLogsManager.list();
    
    if (logs.length === 0) {
      selectEl.innerHTML = '<option value="">No study logs found. Create one first.</option>';
      return;
    }
    
    selectEl.innerHTML = '<option value="">Select a study log...</option>';
    
    logs.forEach(log => {
      const option = document.createElement('option');
      option.value = log.id;
      option.textContent = log.title || `Log from ${new Date(log.createdAt).toLocaleDateString()}`;
      selectEl.appendChild(option);
    });
    
  } catch (error) {
    console.error('Error loading study logs:', error);
    const selectEl = document.getElementById('study-log-select');
    if (selectEl) {
      selectEl.innerHTML = '<option value="">Error loading logs. Please refresh the page.</option>';
    }
  }
}

// Initialize quiz selection screen
function initQuiz() {
  if (domElements.quizContainer) domElements.quizContainer.classList.add('hidden');
  if (domElements.resultsContainer) domElements.resultsContainer.classList.add('hidden');
  if (domElements.quizGenerator) domElements.quizGenerator.classList.remove('hidden');
  
  quiz = [];
  userAnswers = [];
  currentQuestionIndex = 0;
  quizResults = null;
  QuizTimer.reset();
}

// Generate quiz from study log
window.generateQuiz = async (logId = null) => {
  try {
    const selectedLogId = logId || document.getElementById('study-log-select')?.value;
    
    if (!selectedLogId) {
      throw new Error('Please select a study log first');
    }
    
    // Get the selected log from StudyLogsManager
    const logs = await StudyLogsManager.list();
    const selectedLog = logs.find(log => log.id === selectedLogId);
    
    if (!selectedLog) {
      throw new Error('Selected study log not found');
    }

    if (window.Toast) window.Toast.show('Generating quiz...', 'info');

    if (domElements.quizGenerator) domElements.quizGenerator.classList.add('hidden');
    if (domElements.quizContainer) domElements.quizContainer.classList.remove('hidden');
    
    if (domElements.mcqSection) {
      domElements.mcqSection.classList.remove('hidden');
      domElements.mcqQuestionText.textContent = 'Generating your quiz questions...';
      domElements.mcqOptions.innerHTML = '<div class="p-4 text-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div><p class="mt-2 text-gray-600">Please wait...</p></div>';
    }

    const response = await apiService.generateQuiz({
      studyLog: selectedLog.content
    });

    if (!response?.questions?.length) {
      throw new Error('No questions were generated by the AI');
    }

    quiz = response.questions.map(q => ({
      ...q,
      type: 'mcq',
      question: q.question,
      options: q.options || [],
      answer: q.answer,
    }));

    userAnswers = new Array(quiz.length).fill(null);
    currentQuestionIndex = 0;
    quizResults = null;

    if (domElements.resultsContainer) domElements.resultsContainer.classList.add('hidden');

    QuizTimer.reset();
    QuizTimer.start();
    showQuestion();
    
    if (domElements.floatingSubmit) {
      domElements.floatingSubmit.classList.remove('hidden');
    }

    if (window.Toast) window.Toast.success('Quiz generated successfully!');
  } catch (error) {
    console.error('Error generating quiz:', error);
    const errorMessage = error.message || 'Failed to generate quiz. Please try again.';
    
    if (domElements.mcqSection) {
      domElements.mcqSection.classList.remove('hidden');
      domElements.mcqQuestionText.textContent = 'Error';
      domElements.mcqOptions.innerHTML = `<div class="p-4 text-red-500 bg-red-50 rounded-lg"><p class="font-medium">Error loading quiz</p><p class="text-sm">${errorMessage}</p><button onclick="window.location.reload()" class="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Try Again</button></div>`;
    }
    
    if (window.Toast) window.Toast.error(errorMessage);
  }
};

// Show current question
function showQuestion() {
  try {
    const currentQuestion = quiz[currentQuestionIndex];
    if (!currentQuestion) throw new Error('No question found at the current index');
    
    // Update question text
    domElements.mcqQuestionText.textContent = currentQuestion.question || 'No question text available';
    
    // Clear previous options
    domElements.mcqOptions.innerHTML = '';
    
    // Add options
    if (Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0) {
      currentQuestion.options.forEach((option, index) => {
        const optionElement = document.createElement('div');
        optionElement.className = `option-button ${userAnswers[currentQuestionIndex] === index ? 'selected' : ''}`;
        optionElement.textContent = option || `Option ${index + 1}`;
        optionElement.onclick = () => selectAnswer(index);
        domElements.mcqOptions.appendChild(optionElement);
      });
    } else {
      throw new Error('No options available for this question');
    }
    
    // Update navigation buttons after showing the question
    updateNavigationButtons();
    
    // Show the section
    domElements.mcqSection.classList.remove('hidden');
    
  } catch (error) {
    console.error('Error in showQuestion:', error);
    if (domElements.mcqSection) {
      domElements.mcqSection.classList.remove('hidden');
      domElements.mcqQuestionText.textContent = 'Error';
      domElements.mcqOptions.innerHTML = `<div class="p-4 text-red-500 bg-red-50 rounded-lg"><p class="font-medium">Error loading question</p><p class="text-sm">${error.message || 'Please try refreshing the page'}</p></div>`;
    }
  }
}

function selectAnswer(answerIndex) {
  userAnswers[currentQuestionIndex] = answerIndex;

  // Update UI to show selected answer without redrawing the whole question
  const options = domElements.mcqOptions.querySelectorAll('.option-button');
  options.forEach((option, index) => {
    if (index === answerIndex) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });
}

function nextQuestion() {
  if (currentQuestionIndex < quiz.length - 1) {
    currentQuestionIndex++;
    showQuestion();
  }
}

function prevQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    showQuestion();
  }
}

function updateNavigationButtons() {
  if (!domElements.prevButton || !domElements.nextButton || !domElements.submitButton) return;
  
  // Update previous button
  domElements.prevButton.style.visibility = currentQuestionIndex > 0 ? 'visible' : 'hidden';
  
  // Update next/submit buttons
  const isLastQuestion = currentQuestionIndex >= quiz.length - 1;
  domElements.nextButton.style.display = isLastQuestion ? 'none' : 'block';
  domElements.submitButton.style.display = isLastQuestion ? 'block' : 'none';
  
  // Update question counter
  if (domElements.questionCounter) {
    domElements.questionCounter.textContent = `Question ${currentQuestionIndex + 1} of ${quiz.length}`;
  }
  
  // Update progress bar
  if (domElements.progressBar) {
    const progress = ((currentQuestionIndex + 1) / quiz.length) * 100;
    domElements.progressBar.style.width = `${progress}%`;
  }
}

async function submitQuiz() {
  try {
    const unanswered = userAnswers.findIndex(answer => answer === null);
    
    if (unanswered !== -1) {
      const message = `Please answer question ${unanswered + 1} before submitting.`;
      if (window.Toast) window.Toast.error(message);
      else alert(message);
      return;
    }
    
    let correct = 0;
    const results = [];
    
    quiz.forEach((q, index) => {
      const isCorrect = q.answer === userAnswers[index];
      if (isCorrect) correct++;
      
      results.push({
        question: q.question,
        userAnswer: q.options[userAnswers[index]] || 'Not answered',
        correctAnswer: q.options[q.answer],
        isCorrect: isCorrect,
        explanation: q.explanation || ''
      });
    });
    
    const score = Math.round((correct / quiz.length) * 100);
    const timeTaken = QuizTimer.getElapsedTime();
    QuizTimer.stop();
    
    // Format the score for display
    const scoreText = `${correct} of ${quiz.length} (${score}%)`;
    
    // Prepare the result object in the exact format results.js expects
    quizResults = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      score: scoreText,
      timeTaken: timeTaken,
      answers: results.map((r, index) => ({
        question: r.question,
        userAnswer: r.userAnswer,
        correctAnswer: r.correctAnswer,
        isCorrect: r.isCorrect,
        explanation: r.explanation || ''
      })),
      questions: quiz,
      totalQuestions: quiz.length,
      correctAnswers: correct,
      percentage: score
    };
    
    // Save quiz result to backend if user is logged in
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.user_type === 'student') {
          const quizData = {
            score: score,
            total_questions: quiz.length,
            time_taken: timeTaken,
            subject: 'General Quiz',
            date: new Date().toISOString()
          };
          
          console.log('Saving quiz result for student:', user.username, 'Data:', quizData);
          
          const response = await fetch(`${window.API_BASE}/quiz/save-result`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              student_register_number: user.username,
              quiz_data: quizData
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Failed to save quiz result:', response.status, errorData);
          } else {
            console.log('Quiz result saved successfully');
          }
        }
      } catch (error) {
        console.error('Error saving quiz result to backend:', error);
        // Don't block the quiz completion if backend save fails
      }
    } else {
      console.warn('No user logged in, skipping quiz result save to backend');
    }
    
    // Save to session storage for results page
    console.log('Saving quiz results:', quizResults);
    // Tag with student_register_number if logged in
    try {
      const cu = localStorage.getItem('currentUser');
      if (cu) {
        const u = JSON.parse(cu);
        if (u?.user_type === 'student') {
          quizResults.student_register_number = u.username;
        }
      }
    } catch {}
    sessionStorage.setItem('quizResult', JSON.stringify(quizResults));
    
    // Navigate to results page
    if (window.navigateTo) {
      window.navigateTo('results.html');
    } else {
      window.location.href = 'results.html';
    }
    
    // Hide the floating submit button
    if (domElements.floatingSubmit) {
      domElements.floatingSubmit.classList.add('hidden');
    }
    
  } catch (error) {
    console.error('Error submitting quiz:', error);
    if (window.Toast) window.Toast.error('Failed to submit quiz. Please try again.');
    else alert('Failed to submit quiz. Please try again.');
  }
}

function showResults(score, timeTaken, results) {
  domElements.quizContainer.classList.add('hidden');
  domElements.resultsContainer.classList.remove('hidden');
  
  document.getElementById('quiz-score').textContent = `${score}%`;
  document.getElementById('quiz-time').textContent = timeTaken;
  
  const resultsList = document.getElementById('results-list');
  resultsList.innerHTML = '';
  
  results.forEach((result, index) => {
    const resultItem = document.createElement('div');
    resultItem.className = `p-4 mb-4 rounded-lg ${result.isCorrect ? 'bg-green-50' : 'bg-red-50'}`;
    resultItem.innerHTML = `
      <div class="flex justify-between items-center">
        <h4 class="font-medium">Question ${index + 1}</h4>
        <span class="text-sm ${result.isCorrect ? 'text-green-600' : 'text-red-600'}">
          ${result.isCorrect ? '✓ Correct' : '✗ Incorrect'}
        </span>
      </div>
      <p class="mt-2 text-gray-700">${result.question}</p>
      <div class="mt-2 text-sm">
        <p><span class="font-medium">Your answer:</span> ${result.userAnswer}</p>
        ${!result.isCorrect ? `<p class="text-green-600"><span class="font-medium">Correct answer:</span> ${result.correctAnswer}</p>` : ''}
      </div>
    `;
    resultsList.appendChild(resultItem);
  });
}

window.retryQuiz = () => {
  currentQuestionIndex = 0;
  userAnswers = new Array(quiz.length).fill(null);
  quizResults = null;
  
  if (domElements.floatingSubmit) {
    domElements.floatingSubmit.classList.add('hidden');
  }
  
  domElements.resultsContainer.classList.add('hidden');
  domElements.quizContainer.classList.remove('hidden');
  
  QuizTimer.reset();
  QuizTimer.start();
  showQuestion();
};

window.saveToHistory = () => {
  if (!quizResults) return;
  const history = Storage.get('quizHistory', []);
  
  // Get student info if logged in
  let studentRegisterNumber = null;
  try {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (user?.user_type === 'student' && user?.username) {
      studentRegisterNumber = user.username;
    }
  } catch (e) {
    console.warn('Error getting student info:', e);
  }
  
  const historyItem = {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    score: quizResults.score,
    timeTaken: quizResults.timeTaken,
    topic: 'Generated Quiz',
    student_register_number: studentRegisterNumber
  };
  
  history.unshift(historyItem);
  Storage.set('quizHistory', history.slice(0, 100));
  
  // Also save to the new unified history format
  try {
    const unifiedHistory = JSON.parse(localStorage.getItem('srm_history_sessions') || '[]');
    unifiedHistory.unshift({
      id: historyItem.id,
      type: 'quiz',
      date: historyItem.date,
      overallScore: historyItem.score,
      timeTakenSec: Math.floor(historyItem.timeTaken / 1000) || 0,
      topics: [historyItem.topic],
      totalQuestions: quizResults.totalQuestions || 1,
      correctAnswers: Math.ceil((historyItem.score / 100) * (quizResults.totalQuestions || 1))
    });
    localStorage.setItem('srm_history_sessions', JSON.stringify(unifiedHistory));
  } catch (e) {
    console.error('Error updating unified history:', e);
  }
  
  if (window.Toast) window.Toast.success('Quiz results saved to history!');
};