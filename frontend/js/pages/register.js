// Registration page functionality
import { showToast } from '../components/toast.js';
import { navigateTo } from '../utils.js';

document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('register-form');
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegistration);
    }
});

async function handleRegistration(event) {
    event.preventDefault();
    
    const userType = document.getElementById('user-type').value;
    const fullName = document.getElementById('full-name').value;
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Validation
    if (!userType || !fullName || !username || !password || !confirmPassword) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters long', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${window.API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                password: password,
                user_type: userType,
                full_name: fullName,
                email: email || null
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Registration successful! Please login with your credentials.', 'success');
            
            // Redirect to login page after successful registration
            setTimeout(() => {
                navigateTo('login.html');
            }, 2000);
        } else {
            showToast(result.message || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showToast('Network error. Please try again.', 'error');
    }
}
