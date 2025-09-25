import { showToast, navigateTo } from '../utils.js';

// Login page functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOM Content Loaded ===');
    console.log('Current URL:', window.location.href);
    
    const loginForm = document.getElementById('loginForm');
    console.log('Login form element:', loginForm);
    
    if (loginForm) {
        console.log('Adding submit event listener to form');
        
        // Add click handler to the submit button for better debugging
        const submitButton = loginForm.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.addEventListener('click', function() {
                console.log('Submit button clicked');
                console.log('Form elements:', Array.from(loginForm.elements).map(el => ({
                    name: el.name,
                    value: el.value,
                    type: el.type
                })));
            });
        }
        
        loginForm.addEventListener('submit', function(event) {
            console.log('Form submit event triggered');
            event.preventDefault(); // Prevent default form submission
            
            // Log form data
            const formData = new FormData(loginForm);
            console.log('Form data:', Object.fromEntries(formData.entries()));
            
            console.log('Calling handleLogin...');
            handleLogin(event).catch(error => {
                console.error('Login error in form handler:', error);
                showToast('An error occurred during login. Please try again.', 'error');
            });
        });
    } else {
        console.error('Login form not found!');
    }
    
    // Check for user type parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const userType = urlParams.get('type');
    if (userType && (userType === 'student' || userType === 'teacher')) {
        const userTypeSelect = document.getElementById('user-type');
        if (userTypeSelect) {
            userTypeSelect.value = userType;
        }
    }
});

// Ensure API_BASE is set
window.API_BASE = window.API_BASE || 'http://localhost:8000';

async function handleLogin(event) {
    console.log('=== Login process started ===');
    
    try {
        // Get form elements
        const loginForm = event.target;
        const formData = new FormData(loginForm);
        
        // Get form values with fallbacks
        const userType = formData.get('user-type') || 'student';
        const username = formData.get('username') || '';
        const password = formData.get('password') || '';
        
        // Log form values (masking sensitive data)
        console.log('Login form values:', { 
            userType, 
            username: username ? `${username.substring(0, 3)}...` : 'empty',
            hasPassword: !!password
        });
        
        // Validate form data
        if (!userType || !username || !password) {
            const error = 'All fields are required';
            console.error('Validation error:', error);
            showToast(error, 'error');
            throw new Error(error);
        }
        
        // Prepare login data
        const loginData = {
            username: username.trim(),
            password: password,
            user_type: userType
        };
        
        console.log('Sending login request to:', `${window.API_BASE}/auth/login`);
        console.log('Request payload:', JSON.stringify(loginData));
        
        // Test if server is reachable
        try {
            const testResponse = await fetch(`${window.API_BASE}/test-cors`, { 
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            console.log('Server test response status:', testResponse.status);
        } catch (testError) {
            console.error('Server test failed:', testError);
            throw new Error('Cannot connect to the server. Please check your internet connection and try again.');
        }
        
        // Send login request
        let response;
        try {
            response = await fetch(`${window.API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(loginData)
            });
            console.log('Received response status:', response.status);
            
            // Log response headers for debugging
            console.log('Response headers:', [...response.headers.entries()]);
            
        } catch (error) {
            console.error('Network error during login:', error);
            throw new Error('Failed to connect to the server. Please check your internet connection.');
        }
        
        if (!response.ok) {
            // Try to parse error response
            let errorData;
            try {
                errorData = await response.json();
                console.error('Login error response:', errorData);
            } catch (e) {
                console.error('Failed to parse error response:', e);
                throw new Error(`Login failed with status ${response.status}`);
            }
            
            const errorMessage = errorData?.detail?.message || errorData?.detail || 'Login failed. Please check your credentials.';
            throw new Error(errorMessage);
        }
        
        const result = await response.json();
        console.log('Login successful, user data:', result);
        
        // Store user information in localStorage
        const loggedInUserType = result.user_type || 'student';
        const userData = {
            user_id: result.user_id || '',
            username: result.username || '',
            user_type: loggedInUserType,
            token: result.token || ''
        };
        
        // Store both token and user data
        localStorage.setItem('authToken', result.token || '');
        localStorage.setItem('currentUser', JSON.stringify(userData));
        
        console.log('User data stored:', userData);
        showToast('Login successful!', 'success');
        
        // Simple redirect logic
        setTimeout(() => {
            // Default to index.html for students, teacher-dashboard.html for teachers
            const redirectUrl = loggedInUserType === 'teacher' ? 'teacher-dashboard.html' : 'index.html';
            console.log('Redirecting to:', redirectUrl);
            
            // Force a hard redirect
            window.location.href = redirectUrl;
        }, 500); // Small delay to show the success message
    } catch (error) {
        console.error('Login error:', error);
        
        // Specific error messages
        let errorMessage = 'Login failed: ';
        
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            errorMessage += 'Cannot connect to the server. Please check:';
            errorMessage += '\n1. Is the backend server running on localhost:8000?';
            errorMessage += '\n2. Are there any CORS errors in the browser console?';
            errorMessage += '\n3. Is your internet connection working?';
            
            showToast(errorMessage, 'error', 10000); // Show for 10 seconds
        } else {
            errorMessage += error.message || 'An unknown error occurred';
            showToast(errorMessage, 'error');
        }
        
        console.error('Login error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
    }
}
