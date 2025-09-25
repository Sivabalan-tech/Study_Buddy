// History page functionality
document.addEventListener('DOMContentLoaded', () => {
  debugLocalStorage(); // Log localStorage contents on page load
  loadHistory();
  
  // Add event listeners for filters
  document.getElementById('type-filter')?.addEventListener('change', document.applyFilters);
  document.getElementById('date-filter')?.addEventListener('change', document.applyFilters);
  
  // Listen for storage events to refresh history when it changes
  window.addEventListener('storage', handleStorageEvent);
});

// Debug function to check localStorage contents
function debugLocalStorage() {
  console.log('=== DEBUG: localStorage Contents ===');
  console.log('codingHistory:', JSON.parse(localStorage.getItem('codingHistory') || '[]'));
  console.log('quizHistory:', JSON.parse(localStorage.getItem('quizHistory') || '[]'));
  console.log('==================================');
}

// Handle storage events
function handleStorageEvent(event) {
  if (event.key === 'codingHistory' || event.key === 'quizHistory') {
    loadHistory();
  }
}

function loadHistory() {
  try {
    console.log('Loading history...');
    
    // Get filters
    const typeFilter = document.getElementById('type-filter')?.value || 'all';
    const dateFilter = document.getElementById('date-filter')?.value || 'all';
    
    console.log('Current filters - type:', typeFilter, 'date:', dateFilter);
    
    // Load both quiz and coding history
    let quizHistory = Storage.get('quizHistory', []);
    let codingHistory = Storage.get('codingHistory', []);

    // If a student is logged in, filter to only their items
    try {
      const cu = localStorage.getItem('currentUser');
      if (cu) {
        const u = JSON.parse(cu);
        if (u?.user_type === 'student') {
          const reg = (u.username || '').toUpperCase().trim();
          quizHistory = (quizHistory || []).filter(x => (x.student_register_number || '').toUpperCase().trim() === reg);
          codingHistory = (codingHistory || []).filter(x => (x.student_register_number || '').toUpperCase().trim() === reg);
        }
      }
    } catch (e) { console.warn('History filter by user failed:', e); }
    
    console.log('Raw quiz history:', quizHistory);
    console.log('Raw coding history:', codingHistory);
    
    const processedQuizHistory = quizHistory.map(item => ({
      ...item,
      type: 'quiz',
      // Ensure all required fields exist
      id: item.id || `quiz-${Date.now()}`,
      date: item.date || new Date().toISOString()
    }));
    
    const processedCodingHistory = codingHistory.map(item => ({
      ...item,
      type: 'coding',
      // Ensure all required fields exist
      id: item.id || `coding-${Date.now()}`,
      date: item.date || new Date().toISOString(),
      score: item.score || 0,
      isCorrect: item.isCorrect || false
    }));
    
    console.log('Processed quiz history:', processedQuizHistory);
    console.log('Processed coding history:', processedCodingHistory);
    
    // Load communication history
    loadCommunicationHistory().then(communicationHistory => {
      console.log('Communication history:', communicationHistory);
      
      // Combine and sort by date (newest first)
      let combinedHistory = [...processedQuizHistory, ...processedCodingHistory, ...communicationHistory].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );
      
      console.log('Combined history before filters:', combinedHistory);
      
      // Apply type filter
      if (typeFilter !== 'all') {
        combinedHistory = combinedHistory.filter(item => item.type === typeFilter);
      }
      
      // Apply date filter
      const now = new Date();
      let filteredHistory = [...combinedHistory];
      
      if (dateFilter !== 'all') {
        const cutoff = new Date(now);
        
        if (dateFilter === 'today') {
          cutoff.setDate(now.getDate() - 1);
        } else if (dateFilter === 'week') {
          cutoff.setDate(now.getDate() - 7);
        } else if (dateFilter === 'month') {
          cutoff.setMonth(now.getMonth() - 1);
        } else if (dateFilter === 'year') {
          cutoff.setFullYear(now.getFullYear() - 1);
        }
        
        filteredHistory = combinedHistory.filter(item => {
          try {
            const itemDate = new Date(item.date);
            return itemDate >= cutoff;
          } catch (e) {
            console.warn('Invalid date in history item:', item);
            return false;
          }
        });
      }
      
      // Ensure we only show the current student's data (for all time filter)
      try {
        const cu = localStorage.getItem('currentUser');
        if (cu) {
          const u = JSON.parse(cu);
          if (u?.user_type === 'student' && u?.username) {
            const reg = u.username.toUpperCase().trim();
            filteredHistory = filteredHistory.filter(item => 
              (item.student_register_number || '').toUpperCase().trim() === reg
            );
          }
        }
      } catch (e) { 
        console.warn('Error filtering history by student:', e);
      }
      
      combinedHistory = filteredHistory;
      
      updateStats(combinedHistory);
      updateHistoryTable(combinedHistory);
      
    });
  } catch (error) {
    console.error('Error loading history:', error);
    Toast.error('Failed to load history. Please try again.');
  }
}

// Load communication history from backend
async function loadCommunicationHistory() {
  try {
    console.log('Loading communication history from backend...');
    
    const cu = localStorage.getItem('currentUser');
    if (!cu) {
      console.log('No current user found, skipping communication history');
      return [];
    }
    
    const u = JSON.parse(cu);
    if (u?.user_type !== 'student' || !u?.username) {
      console.log('Current user is not a student, skipping communication history');
      return [];
    }
    
    const response = await fetch(`${window.API_BASE}/api/communication/get-history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        student_register_number: u.username
      })
    });
    
    if (!response.ok) {
      console.warn('Failed to load communication history:', response.status);
      return [];
    }
    
    const result = await response.json();
    console.log('Communication history loaded:', result);
    
    if (result.success && result.history) {
      return result.history.map((item, index) => ({
        ...item,
        type: 'communication',
        id: item.id || `communication-${item.timestamp}-${index}`, // Generate ID if not present
        date: item.timestamp || new Date().toISOString(),
        score: Math.round((item.clarity + item.confidence + item.articulation) / 3), // Average score
        question: item.transcription ? item.transcription.substring(0, 100) + '...' : 'Communication Practice',
        timeSpent: 'N/A'
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error loading communication history:', error);
    return [];
  }
}

function updateStats(history) {
  console.log('=== updateStats called with', history.length, 'items ===');
  
  try {
    // Calculate basic stats
    const totalSessions = history.length;
    const quizSessions = history.filter(item => item.type === 'quiz').length;
    const codingSessions = history.filter(item => item.type === 'coding').length;
    const communicationSessions = history.filter(item => item.type === 'communication').length;
    
    console.log('Sessions - Total:', totalSessions, 'Quiz:', quizSessions, 'Coding:', codingSessions, 'Communication:', communicationSessions);
    
    // Calculate average quiz score
    const quizScores = history
      .filter(item => item.type === 'quiz' && item.score)
      .map(item => {
        try {
          const scoreMatch = item.score?.match(/\((\d+)%\)/);
          return scoreMatch ? parseInt(scoreMatch[1]) : 0;
        } catch (e) {
          console.error('Error parsing quiz score:', e, 'Item:', item);
          return 0;
        }
      });
    
    const avgScore = quizScores.length > 0
      ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
      : 0;
    
    console.log('Quiz scores:', quizScores, 'Average:', avgScore);
    
    // Update the UI
    const totalEl = document.getElementById('total-sessions');
    const quizEl = document.getElementById('quiz-sessions');
    const codingEl = document.getElementById('coding-sessions');
    const communicationEl = document.getElementById('communication-sessions');
    const avgEl = document.getElementById('avg-score');
    
    if (totalEl) totalEl.textContent = totalSessions;
    if (quizEl) quizEl.textContent = quizSessions;
    if (codingEl) codingEl.textContent = codingSessions;
    if (communicationEl) communicationEl.textContent = communicationSessions;
    if (avgEl) avgEl.textContent = `${avgScore}%`;
    
    console.log('Stats updated in UI');
    
  } catch (error) {
    console.error('Error in updateStats:', error);
    // Don't show error to user as it's not critical
  }
}

function updateHistoryTable(history) {
  console.log('=== updateHistoryTable called with', history.length, 'items ===');
  
  // Try to find the table body
  let tbody = document.getElementById('history-table-body');
  
  // If not found, try to find it another way
  if (!tbody) {
    console.warn('Could not find #history-table-body, trying alternative selector...');
    const tables = document.getElementsByTagName('table');
    if (tables.length > 0 && tables[0].tBodies.length > 0) {
      tbody = tables[0].tBodies[0];
      console.log('Found table body using alternative method');
    }
  }
  
  // If still not found, log error and return
  if (!tbody) {
    console.error('Could not find table body element. Page structure may be incorrect.');
    return;
  }
  
  console.log('Found table body:', tbody);
  
  // Clear existing rows
  tbody.innerHTML = '';
  
  if (!history || history.length === 0) {
    console.log('No history items to display');
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-4 text-center text-gray-500">
          No history found. Complete some quizzes or coding practices to see your history here.
        </td>
      </tr>`;
    return;
  }
  
  console.log('Rendering', history.length, 'history items');
  
  history.forEach((item, index) => {
    try {
      console.log(`Rendering item ${index}:`, item);
      
      const row = document.createElement('tr');
      
      // Format date
      let formattedDate = 'N/A';
      try {
        formattedDate = item.date ? new Date(item.date).toLocaleString() : 'N/A';
      } catch (e) {
        console.error('Error formatting date:', e, 'Item:', item);
        formattedDate = 'Invalid Date';
      }
      
      // Set type label and styling
      const typeLabel = item.type === 'quiz' ? 'Quiz' : item.type === 'coding' ? 'Coding' : 'Communication';
      const typeClass = item.type === 'quiz' 
        ? 'bg-blue-100 text-blue-800' 
        : item.type === 'coding' 
          ? 'bg-green-100 text-green-800' 
          : 'bg-yellow-100 text-yellow-800';
      
      // Format title
      let title = 'Untitled';
      if (item.type === 'quiz') {
        title = item.quizTitle || 'Quiz';
      } else if (item.type === 'coding') {
        title = (item.question || 'Coding Practice')
          .substring(0, 50) + 
          ((item.question?.length || 0) > 50 ? '...' : '');
      } else if (item.type === 'communication') {
        title = item.question || 'Communication Practice';
      }
      
      // Format score
      let scoreText = 'N/A';
      if (item.type === 'quiz') {
        scoreText = item.score || 'N/A';
      } else if (item.type === 'coding') {
        const score = typeof item.score !== 'undefined' ? item.score : 0;
        const isCorrect = item.isCorrect ? '✓' : '✗';
        scoreText = `${isCorrect} ${score}/10`;
      } else if (item.type === 'communication') {
        scoreText = `${item.score}/10`;
      }
      
      // Format time taken
      const timeTaken = item.timeTaken || item.timeSpent || 'N/A';
      
      // Create row HTML
      row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formattedDate}</td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${typeClass}">
            ${typeLabel}
          </span>
        </td>
        <td class="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title="${title}">
          ${title}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${scoreText}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${timeTaken}</td>
        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <button onclick="viewItemDetails('${item.id}', '${item.type}')" 
                  class="text-blue-600 hover:text-blue-900 mr-4">
            View
          </button>
          <button onclick="if(confirm('Are you sure you want to delete this item?')) deleteItem('${item.id}', '${item.type}')" 
                  class="text-red-600 hover:text-red-900">
            Delete
          </button>
        </td>`;
      
      tbody.appendChild(row);
      console.log('Successfully added row for item', index);
      
    } catch (error) {
      console.error(`Error rendering history item at index ${index}:`, error, 'Item:', item);
      
      // Add error row
      const errorRow = document.createElement('tr');
      errorRow.className = 'bg-red-50';
      errorRow.innerHTML = `
        <td colspan="6" class="px-6 py-2 text-xs text-red-700">
          Error displaying item: ${error.message}
        </td>`;
      tbody.appendChild(errorRow);
    }
  });
  
  console.log('=== Finished rendering history table ===');
}

// Apply filters and refresh the history
document.applyFilters = function() {
  console.log('Applying filters...');
  
  // Get current filter values
  const typeFilter = document.getElementById('type-filter')?.value || 'all';
  const dateFilter = document.getElementById('date-filter')?.value || 'all';
  
  console.log('Current filters - Type:', typeFilter, 'Date:', dateFilter);
  
  // Load both quiz and coding history
  let quizHistory = Storage.get('quizHistory', []);
  let codingHistory = Storage.get('codingHistory', []);

  // If a student is logged in, filter to only their items
  try {
    const cu = localStorage.getItem('currentUser');
    if (cu) {
      const u = JSON.parse(cu);
      if (u?.user_type === 'student') {
        const reg = (u.username || '').toUpperCase().trim();
        quizHistory = (quizHistory || []).filter(x => (x.student_register_number || '').toUpperCase().trim() === reg);
        codingHistory = (codingHistory || []).filter(x => (x.student_register_number || '').toUpperCase().trim() === reg);
      }
    }
  } catch (e) { console.warn('History filter by user failed:', e); }
  
  console.log('Raw history - Quiz:', quizHistory.length, 'Coding:', codingHistory.length);
  
  // Process quiz history
  const processedQuizHistory = (quizHistory || []).map(item => ({
    ...item,
    type: 'quiz',
    id: item.id || `quiz-${Date.now()}`,
    date: item.date || new Date().toISOString(),
    // Ensure all required fields exist
    quizTitle: item.quizTitle || 'Quiz',
    score: item.score || '0%',
    timeTaken: item.timeTaken || 'N/A'
  }));
  
  // Process coding history
  const processedCodingHistory = (codingHistory || []).map(item => ({
    ...item,
    type: 'coding',
    id: item.id || `coding-${Date.now()}`,
    date: item.date || new Date().toISOString(),
    // Ensure all required fields exist
    question: item.question || 'Coding Practice',
    score: typeof item.score !== 'undefined' ? item.score : 0,
    isCorrect: !!item.isCorrect,
    timeTaken: item.timeTaken || 'N/A'
  }));
  
  // Load communication history
  loadCommunicationHistory().then(communicationHistory => {
    console.log('Communication history:', communicationHistory);
    
    // Combine and sort by date (newest first)
    let combinedHistory = [...processedQuizHistory, ...processedCodingHistory, ...communicationHistory].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
    
    console.log('Combined history before filters:', combinedHistory.length, 'items');
    
    // Apply type filter
    if (typeFilter !== 'all') {
      combinedHistory = combinedHistory.filter(item => item.type === typeFilter);
      console.log('After type filter:', combinedHistory.length, 'items');
    }
    
    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const cutoff = new Date(now);
      
      if (dateFilter === 'today') {
        cutoff.setDate(now.getDate() - 1);
      } else if (dateFilter === 'week') {
        cutoff.setDate(now.getDate() - 7);
      } else if (dateFilter === 'month') {
        cutoff.setMonth(now.getMonth() - 1);
      }
      
      combinedHistory = combinedHistory.filter(item => {
        try {
          return item && item.date ? new Date(item.date) >= cutoff : false;
        } catch (e) {
          console.error('Error filtering by date:', e, 'Item:', item);
          return false;
        }
      });
      
      console.log('After date filter:', combinedHistory.length, 'items');
    }
    
    console.log('Final items to display:', combinedHistory);
    
    // Update the UI
    updateStats(combinedHistory);
    updateHistoryTable(combinedHistory);
    
    // Show a toast if no items match the filters
    if (combinedHistory.length === 0) {
      Toast.info('No history items match the selected filters');
    }
  });
};

// Delete item from history
async function deleteItem(id, type) {
  if (!confirm('Are you sure you want to delete this item?')) return;
  
  try {
    if (type === 'quiz' || type === 'coding') {
      const storageKey = type === 'quiz' ? 'quizHistory' : 'codingHistory';
      const history = Storage.get(storageKey, []);
      const updatedHistory = history.filter(item => item.id !== id);
      
      Storage.set(storageKey, updatedHistory);
    } else if (type === 'communication') {
      // Delete communication history item from backend
      const response = await fetch(`${window.API_BASE}/api/communication/delete-item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: id
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete communication history item');
      }
    }
    
    Toast.success('Item deleted successfully');
    loadHistory(); // Refresh the table
  } catch (error) {
    console.error('Error deleting item:', error);
    Toast.error('Failed to delete item');
  }
}

// View item details
async function viewItemDetails(id, type) {
  console.log('Viewing item details:', { id, type });
  
  try {
    let item;
    
    if (type === 'quiz') {
      const history = Storage.get('quizHistory', []);
      item = history.find(item => item.id === id);
    } else if (type === 'coding') {
      const history = Storage.get('codingHistory', []);
      item = history.find(item => item.id === id);
    } else if (type === 'communication') {
      const communicationHistory = await loadCommunicationHistory();
      item = communicationHistory.find(item => item.id === id);
    }
    
    if (!item) {
      Toast.error('Item not found');
      return;
    }
    
    if (type === 'quiz') {
      // For quizzes, redirect to results page
      sessionStorage.setItem('quizResult', JSON.stringify(item));
      window.location.href = 'results.html';
    } else if (type === 'coding') {
      // For coding practice, show details in a modal
      showCodingDetails(item);
    } else if (type === 'communication') {
      // For communication practice, show details in a modal
      showCommunicationDetails(item);
    }
  } catch (error) {
    console.error('Error viewing item details:', error);
    Toast.error('Failed to load item details');
  }
}

// Show coding practice details in a modal
window.showCodingDetails = function(item) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  
  modal.innerHTML = `
    <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div class="p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium text-gray-900">Coding Practice Details</h3>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-500">
            <span class="sr-only">Close</span>
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div class="space-y-4">
          <div>
            <h4 class="text-sm font-medium text-gray-500">Question</h4>
            <p class="mt-1 text-sm text-gray-900">${item.question || 'N/A'}</p>
          </div>
          
          <div>
            <h4 class="text-sm font-medium text-gray-500">Your Code</h4>
            <pre class="mt-1 p-3 bg-gray-50 rounded-md text-sm overflow-x-auto">
              <code>${item.userCode || 'No code submitted'}</code>
            </pre>
          </div>
          
          <div>
            <h4 class="text-sm font-medium text-gray-500">Score</h4>
            <p class="mt-1 text-sm text-gray-900">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                ${item.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                ${item.isCorrect ? '✓ Correct' : '✗ Incorrect'} ${item.score || 0}/10
              </span>
            </p>
          </div>
          
          ${item.feedback ? `
          <div>
            <h4 class="text-sm font-medium text-gray-500">Feedback</h4>
            <p class="mt-1 text-sm text-gray-900">${item.feedback}</p>
          </div>` : ''}
          
          ${item.suggestions ? `
          <div>
            <h4 class="text-sm font-medium text-gray-500">Suggestions</h4>
            <p class="mt-1 text-sm text-gray-900">${item.suggestions}</p>
          </div>` : ''}
          
          <div class="pt-4 border-t border-gray-200">
            <button onclick="retryCoding(${JSON.stringify(item).replace(/"/g, '&quot;')})" 
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Retry This Question
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
};

// Show communication practice details in a modal
window.showCommunicationDetails = function(item) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  
  modal.innerHTML = `
    <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div class="p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium text-gray-900">Communication Practice Details</h3>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-500">
            <span class="sr-only">Close</span>
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div class="space-y-4">
          <div>
            <h4 class="text-sm font-medium text-gray-500">Transcription</h4>
            <p class="mt-1 text-sm text-gray-900">${item.transcription || 'N/A'}</p>
          </div>
          
          <div>
            <h4 class="text-sm font-medium text-gray-500">Score</h4>
            <p class="mt-1 text-sm text-gray-900">${item.score}/10</p>
          </div>
          
          ${item.feedback ? `
          <div>
            <h4 class="text-sm font-medium text-gray-500">Feedback</h4>
            <p class="mt-1 text-sm text-gray-900">${item.feedback}</p>
          </div>` : ''}
          
          ${item.suggestions ? `
          <div>
            <h4 class="text-sm font-medium text-gray-500">Suggestions</h4>
            <p class="mt-1 text-sm text-gray-900">${item.suggestions}</p>
          </div>` : ''}
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
};

// Retry coding question
window.retryCoding = function(question) {
  sessionStorage.setItem('retryQuestion', JSON.stringify(question));
  window.location.href = 'practice.html';
};
