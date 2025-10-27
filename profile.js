const API_URL = 'https://cms-backend-dbms-project.onrender.com/api';
let currentUser = null;
let myArticles = [];

// Check authentication
async function checkAuth() {
    const token = localStorage.getItem('authToken');
    
    console.log('=== PROFILE PAGE AUTH CHECK ===');
    console.log('Token exists:', !!token);
    
    if (!token) {
        alert('Please login to view your profile');
        window.location.href = 'login.html';
        return false;
    }

    window.authToken = token;

    try {
        console.log('Calling /auth/me...');
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Auth failed:', errorData);
            throw new Error('Authentication failed');
        }

        currentUser = await response.json();
        console.log('Current user:', currentUser);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        displayUserInfo();
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        alert('Session expired. Please login again.');
        window.location.href = 'login.html';
        return false;
    }
}

// Display user information
function displayUserInfo() {
    document.getElementById('profileName').textContent = currentUser.name;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('memberSince').textContent = currentUser.year;
}

// Fetch user's articles
async function fetchMyArticles() {
    console.log('=== FETCHING MY ARTICLES ===');
    console.log('Token:', window.authToken ? 'exists' : 'missing');
    
    try {
        const response = await fetch(`${API_URL}/auth/my-posts`, {
            headers: {
                'Authorization': `Bearer ${window.authToken}`
            }
        });

        console.log('My posts response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to fetch articles:', errorData);
            throw new Error(errorData.error || 'Failed to fetch articles');
        }

        myArticles = await response.json();
        console.log('My articles:', myArticles);
        
        // Update stats
        document.getElementById('totalPosts').textContent = myArticles.length;
       
        const totalViews = myArticles.reduce((sum, article) => sum + (article.views || 0), 0);
        document.getElementById('totalViews').textContent = totalViews; // Mock calculation
        
        renderArticles();
    } catch (error) {
        console.error('Error fetching articles:', error);
        document.getElementById('articlesList').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3>Failed to load articles</h3>
                <p>${error.message}</p>
                <button onclick="fetchMyArticles()" style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Retry</button>
            </div>
        `;
    }
}

// Render articles list
function renderArticles() {
    const container = document.getElementById('articlesList');
    
    if (myArticles.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <h3>No articles yet</h3>
                <p>Start writing your first article!</p>
                <a href="add-post.html" style="display: inline-block; margin-top: 1rem; background: #667eea; color: white; padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 600;">Create New Article</a>
            </div>
        `;
        return;
    }

    container.innerHTML = myArticles.map(article => `
        <div class="article-item">
            <div class="article-item-header">
                <h3 class="article-item-title">${escapeHtml(article.title)}</h3>
            </div>
            <p class="article-item-excerpt">${escapeHtml(article.excerpt)}</p>
            <div class="article-item-meta">
                <span>📅 ${article.date}</span>
                ${article.category ? `<span>📁 ${escapeHtml(article.category)}</span>` : ''}
                ${article.tags && article.tags.length > 0 ? `<span>🏷️ ${article.tags.length} tags</span>` : ''}
            </div>
            <div class="article-actions">
                <button class="btn-small btn-view" onclick="viewArticle(${article.id})">👁️ View</button>
                <button class="btn-small btn-edit" onclick="editArticle(${article.id})">✏️ Edit</button>
                <button class="btn-small btn-delete" onclick="deleteArticle(${article.id})">🗑️ Delete</button>
            </div>
        </div>
    `).join('');
}

// View article
function viewArticle(id) {
    window.location.href = `article.html?id=${id}`;
}

// Edit article
function editArticle(id) {
    window.location.href = `edit-post.html?id=${id}`;
}

// Delete article
async function deleteArticle(id) {
    if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/posts/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${window.authToken}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to delete article');
        }

        showNotification('success', 'Article deleted successfully!');
        
        // Refresh the articles list
        await fetchMyArticles();
    } catch (error) {
        console.error('Delete error:', error);
        showNotification('error', `Failed to delete article: ${error.message}`);
    }
}

// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        window.authToken = null;
        window.location.href = 'login.html';
    }
}

// Show notification
function showNotification(type, message) {
    const existing = document.querySelectorAll('.notification');
    existing.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        font-weight: 600;
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    if (type === 'error') {
        notification.style.background = '#ff6b6b';
        notification.style.color = 'white';
    } else {
        notification.style.background = '#4caf50';
        notification.style.color = 'white';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Escape HTML
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

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
`;
document.head.appendChild(style);

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    // Setup logout button if it exists
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
    
    const isAuth = await checkAuth();
    if (isAuth) {
        await fetchMyArticles();
    }
});