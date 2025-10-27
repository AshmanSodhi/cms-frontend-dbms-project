const API_URL = 'https://cms-backend-dbms-project.onrender.com/api';

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const formTitle = document.getElementById('formTitle');
const formSubtitle = document.getElementById('formSubtitle');

let isLoginMode = true;

// Toggle between login and registration forms
function setupToggle() {
    const currentToggleLink = document.getElementById('toggleLink');
    if (currentToggleLink) {
        currentToggleLink.addEventListener('click', (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            
            if (isLoginMode) {
                loginForm.classList.add('active');
                registerForm.classList.remove('active');
                formTitle.textContent = 'Welcome Back';
                formSubtitle.textContent = 'Sign in to your account';
                document.getElementById('toggleText').innerHTML = 'Don\'t have an account? <a href="#" id="toggleLink">Sign up</a>';
            } else {
                loginForm.classList.remove('active');
                registerForm.classList.add('active');
                formTitle.textContent = 'Create Account';
                formSubtitle.textContent = 'Join us today';
                document.getElementById('toggleText').innerHTML = 'Already have an account? <a href="#" id="toggleLink">Sign in</a>';
            }
            
            setupToggle();
        });
    }
}

setupToggle();

// Handle login form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';
    
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

        console.log('Login successful:', data);
        console.log('User roleId:', data.user.roleId, 'roleName:', data.user.roleName);

        // Store authentication data
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        
        // Set in window for immediate use
        window.authToken = data.token;
        window.currentUser = data.user;

        showMessage('success', `Login successful! Welcome back, ${data.user.name}!`);
        
        // Redirect after short delay - Check both roleId and roleName
        setTimeout(() => {
            if (data.user.roleId === 1 || data.user.roleName === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'index.html';
            }
        }, 1000);
    } catch (error) {
        console.error('Login error:', error);
        showMessage('error', `Login failed: ${error.message}`);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
    }
});

// Handle registration form submission
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;
    
    if (password !== confirmPassword) {
        showMessage('error', 'Passwords do not match!');
        return;
    }
    
    if (password.length < 8) {
        showMessage('error', 'Password must be at least 8 characters long!');
        return;
    }
    
    if (!agreeTerms) {
        showMessage('error', 'Please agree to the Terms & Conditions');
        return;
    }
    
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';
    
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

        showMessage('success', `Registration successful! Welcome, ${name}! Please log in.`);
        
        setTimeout(() => {
            document.getElementById('toggleLink').click();
            document.getElementById('loginEmail').value = email;
        }, 2000);
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('error', `Registration failed: ${error.message}`);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
    }
});

// Show message function
function showMessage(type, message) {
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    messageDiv.style.cssText = `
        padding: 1rem;
        margin-bottom: 1rem;
        border-radius: 8px;
        border-left: 4px solid;
        animation: slideIn 0.3s ease-out;
    `;
    
    if (type === 'error') {
        messageDiv.style.background = '#fee';
        messageDiv.style.color = '#c33';
        messageDiv.style.borderColor = '#c33';
    } else {
        messageDiv.style.background = '#efe';
        messageDiv.style.color = '#2c7a2c';
        messageDiv.style.borderColor = '#2c7a2c';
    }
    
    messageDiv.textContent = message;
    
    const activeForm = isLoginMode ? loginForm : registerForm;
    activeForm.insertBefore(messageDiv, activeForm.firstChild);
    
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => messageDiv.remove(), 300);
    }, 5000);
}

// Add input validation and styling
const inputs = document.querySelectorAll('input[type="email"], input[type="password"], input[type="text"]');

inputs.forEach(input => {
    input.addEventListener('blur', () => {
        if (input.value.trim() === '' && input.hasAttribute('required')) {
            input.style.borderColor = '#ff6b6b';
        } else if (input.value.trim() !== '') {
            input.style.borderColor = '#4caf50';
        }
    });
    
    input.addEventListener('focus', () => {
        input.style.borderColor = '#667eea';
    });
    
    input.addEventListener('input', () => {
        if (input.style.borderColor === 'rgb(255, 107, 107)') {
            input.style.borderColor = '#667eea';
        }
    });
});

// Password strength indicator
const passwordInput = document.getElementById('registerPassword');
if (passwordInput) {
    const strengthIndicator = document.createElement('div');
    strengthIndicator.style.cssText = `
        margin-top: 0.5rem;
        font-size: 0.85rem;
        font-weight: 600;
    `;
    passwordInput.parentElement.appendChild(strengthIndicator);
    
    passwordInput.addEventListener('input', () => {
        const password = passwordInput.value;
        let strength = 0;
        
        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z\d]/.test(password)) strength++;
        
        if (password.length === 0) {
            strengthIndicator.textContent = '';
        } else if (strength <= 2) {
            strengthIndicator.textContent = '⚠️ Weak password';
            strengthIndicator.style.color = '#ff6b6b';
        } else if (strength === 3) {
            strengthIndicator.textContent = '✓ Medium password';
            strengthIndicator.style.color = '#ffa500';
        } else {
            strengthIndicator.textContent = '✓ Strong password';
            strengthIndicator.style.color = '#4caf50';
        }
    });
}

// Check if already logged in on page load
window.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('currentUser');
    
    console.log('Auth check - Token exists:', !!token);
    console.log('Auth check - User data exists:', !!userStr);
    
    if (token && userStr) {
        try {
            const response = await fetch(`${API_URL}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const validUser = await response.json();
                console.log('Token valid, user:', validUser);
                
                // Update stored user data
                localStorage.setItem('currentUser', JSON.stringify(validUser));
                
                // Redirect if already logged in - Check both roleId and roleName
                if (validUser.roleId === 1 || validUser.roleName === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'index.html';
                }
            } else {
                console.log('Token invalid, clearing storage');
                localStorage.removeItem('authToken');
                localStorage.removeItem('currentUser');
            }
        } catch (error) {
            console.log('Auth check error:', error);
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
        }
    }
});

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(-10px);
        }
    }
`;
document.head.appendChild(style);