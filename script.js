const API_URL = 'https://cms-backend-dbms-project.onrender.com/api';

async function fetchArticles() {
    try {
        const response = await fetch(`${API_URL}/posts`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch articles');
        }

        const articles = await response.json();
        renderArticles(articles);
    } catch (error) {
        console.error('Error fetching articles:', error);
        const grid = document.getElementById('articlesGrid');
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: white;">
                <h3>Unable to load articles</h3>
                <p>${error.message}</p>
                <p style="font-size: 0.9rem; margin-top: 1rem;">Make sure the backend server is running on http://localhost:3000</p>
            </div>
        `;
    }
}

function renderArticles(articles) {
    const grid = document.getElementById('articlesGrid');
    grid.innerHTML = '';
    
    if (articles.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: white;">
                <h3>No articles found</h3>
                <p>Be the first to create a post!</p>
            </div>
        `;
        return;
    }

    articles.forEach(article => {
        const card = document.createElement('div');
        card.className = 'article-card';
        card.innerHTML = `
            <div class="article-image">${article.icon || '📄'}</div>
            <div class="article-content">
                <h2 class="article-title">${escapeHtml(article.title)}</h2>
                <p class="article-excerpt">${escapeHtml(article.excerpt)}</p>
                <div class="article-meta">
                    <span class="article-author">${escapeHtml(article.author)}</span>
                    <span>${article.date}</span>
                </div>
            </div>
        `;
        
        card.onclick = () => {
            window.location.href = `article.html?id=${article.id}`;
        };
        
        grid.appendChild(card);
    });
}

// Check authentication status
async function checkAuth() {
    const token = localStorage.getItem('authToken');
    console.log('Home page - Token check:', !!token);
    
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
                console.log('Home page - User authenticated:', user);
                window.currentUser = user;
                localStorage.setItem('currentUser', JSON.stringify(user));
                updateNavForLoggedInUser(user);
            } else {
                console.log('Home page - Token invalid');
                // Invalid token
                localStorage.removeItem('authToken');
                localStorage.removeItem('currentUser');
                window.authToken = null;
                window.currentUser = null;
            }
        } catch (error) {
            console.log('Not authenticated:', error);
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            window.authToken = null;
            window.currentUser = null;
        }
    }
}

function updateNavForLoggedInUser(user) {
    const navLinks = document.querySelector('.nav-links');
    const loginLink = navLinks.querySelector('a[href="login.html"]');
    
    if (loginLink) {
        // Remove login link
        loginLink.parentElement.remove();
        
        // Add profile link
        const profileLink = document.createElement('li');
        profileLink.innerHTML = '<a href="profile.html">👤 My Profile</a>';
        navLinks.appendChild(profileLink);
        
        // Add admin link if user is admin (check both roleId and roleName)
        if (user.roleId === 1 || user.roleName === 'admin') {
            const adminLink = document.createElement('li');
            adminLink.innerHTML = '<a href="admin.html">⚙️ Admin Panel</a>';
            navLinks.appendChild(adminLink);
        }
        
        // Add logout button
        const logoutLink = document.createElement('li');
        logoutLink.innerHTML = '<a href="#" id="logoutBtn">Logout</a>';
        navLinks.appendChild(logoutLink);
        
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        window.authToken = null;
        window.currentUser = null;
        window.location.reload();
    }
}

// Escape HTML helper
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    fetchArticles();
    checkAuth();
});