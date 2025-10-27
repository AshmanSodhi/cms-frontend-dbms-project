const API_URL = 'https://cms-backend-dbms-project.onrender.com/api';

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const toggleLink = document.getElementById('toggleLink');
const toggleText = document.getElementById('toggleText');
const formTitle = document.getElementById('formTitle');
const formSubtitle = document.getElementById('formSubtitle');

let isLoginMode = true;

// Toggle between login and registration forms
toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    
    if (isLoginMode) {
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
        formTitle.textContent = 'Welcome Back';
        formSubtitle.textContent = 'Sign in to your account';
        toggleText.innerHTML = 'Don\'t have an account? <a href="#" id="toggleLink">Sign up</a>';
    } else {
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
        formTitle.textContent = 'Create Account';
        formSubtitle.textContent = 'Join us today';
        toggleText.innerHTML = 'Already have an account? <a href="#" id="toggleLink">Sign in</a>';
    }
    
    // Re-attach event listener to new toggle link
    document.getElementById('toggleLink').addEventListener('click', arguments.callee);
});

// Handle login form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, rememberMe })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        // Store token and user data in localStorage
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        window.authToken = data.token;
        window.currentUser = data.user;

        alert(`Login successful! Welcome back, ${data.user.name}!`);
        
        // Redirect based on role
        if (data.user.role === 'admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Login error:', error);
        alert(`Login failed: ${error.message}`);
    }
});

// Handle registration form submission
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;
    
    // Validate passwords match
    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    
    // Validate password strength
    if (password.length < 8) {
        alert('Password must be at least 8 characters long!');
        return;
    }
    
    // Check if terms are agreed
    if (!agreeTerms) {
        alert('Please agree to the Terms & Conditions');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }

        alert(`Registration successful! Welcome, ${name}! Please log in.`);
        
        // Switch to login form
        document.getElementById('toggleLink').click();
        
        // Pre-fill email
        document.getElementById('loginEmail').value = email;
    } catch (error) {
        console.error('Registration error:', error);
        alert(`Registration failed: ${error.message}`);
    }
});

// Add input validation and styling
const inputs = document.querySelectorAll('input[type="email"], input[type="password"], input[type="text"]');

inputs.forEach(input => {
    input.addEventListener('blur', () => {
        if (input.value.trim() === '') {
            input.style.borderColor = '#ff6b6b';
        } else {
            input.style.borderColor = '#667eea';
        }
    });
    
    input.addEventListener('focus', () => {
        input.style.borderColor = '#667eea';
    });
});

// Check if already logged in
window.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
        window.authToken = token;
        try {
            const response = await fetch(`${API_URL}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const user = await response.json();
                localStorage.setItem('currentUser', JSON.stringify(user));
                if (user.roleName === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'index.html';
                }
            } else {
                // Invalid token, clear storage
                localStorage.removeItem('authToken');
                localStorage.removeItem('currentUser');
            }
        } catch (error) {
            console.log('Not logged in');
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
        }
    }
});