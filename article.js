const API_URL = 'https://cms-backend-dbms-project.onrender.com/api';
let currentArticle = null;
let currentUser = null;

// Get article ID from URL
function getArticleId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// Check if user is logged in
async function checkAuth() {
    const token = localStorage.getItem('authToken');
    console.log('Article page - Token check:', !!token);
    
    if (token) {
        window.authToken = token;
        try {
            const response = await fetch(`${API_URL}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                currentUser = await response.json();
                console.log('Article page - User authenticated:', currentUser);
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                // Update navigation
                updateNav(currentUser);
                
                // Show comment form
                document.getElementById('commentFormContainer').style.display = 'block';
                document.getElementById('loginPrompt').style.display = 'none';
                
                return true;
            } else {
                console.log('Article page - Token invalid');
                localStorage.removeItem('authToken');
                localStorage.removeItem('currentUser');
                window.authToken = null;
                currentUser = null;
            }
        } catch (error) {
            console.log('Not authenticated:', error);
        }
    }
    
    // Show login prompt
    document.getElementById('commentFormContainer').style.display = 'none';
    document.getElementById('loginPrompt').style.display = 'block';
    return false;
}

// Update navigation
function updateNav(user) {
    const navLinks = document.querySelector('.nav-links');
    const loginLink = navLinks.querySelector('a[href="login.html"]');
    
    if (loginLink && loginLink.parentElement) {
        loginLink.parentElement.innerHTML = `
            <a href="#" style="color: #667eea; font-weight: 600;">👤 ${escapeHtml(user.name)}</a>
        `;
        
        // Add logout button
        const logoutLi = document.createElement('li');
        logoutLi.innerHTML = '<a href="#" onclick="logout(); return false;">Logout</a>';
        navLinks.appendChild(logoutLi);
    }
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        window.authToken = null;
        window.currentUser = null;
        currentUser = null;
        window.location.href = 'login.html';
    }
}

// Fetch and display article
async function fetchArticle() {
    const articleId = getArticleId();
    
    if (!articleId) {
        document.getElementById('articleContent').innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #666;">
                <h2>Article Not Found</h2>
                <p>The article you're looking for doesn't exist.</p>
                <a href="index.html" style="color: #667eea; text-decoration: none; font-weight: 600;">← Back to Home</a>
            </div>
        `;
        return;
    }

    try {
        const response = await fetch(`${API_URL}/posts/${articleId}`);
        
        if (!response.ok) {
            throw new Error('Article not found');
        }

        currentArticle = await response.json();
        console.log('Article loaded:', currentArticle);
        renderArticle(currentArticle);
        fetchComments(articleId);
        // After fetching article successfully
        fetch(`${API_URL}/posts/${articleId}/view`, { method: 'POST' });
    } catch (error) {
        console.error('Error fetching article:', error);
        document.getElementById('articleContent').innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #666;">
                <h2>Error Loading Article</h2>
                <p>${error.message}</p>
                <a href="index.html" style="color: #667eea; text-decoration: none; font-weight: 600;">← Back to Home</a>
            </div>
        `;
    }
}

// Render article content
function renderArticle(article) {
    const container = document.getElementById('articleContent');
    
    // Check if current user is the author or admin
    const isAuthor = currentUser && (currentUser.userId === article.authorId || currentUser.id === article.authorId);
    const isAdmin = currentUser && currentUser.roleName === 'admin';
    const canEdit = isAuthor || isAdmin;
    
    console.log('Can edit article:', canEdit, 'isAuthor:', isAuthor, 'isAdmin:', isAdmin);
    
    container.innerHTML = `
        <header class="article-header">
            <h1 class="article-title">${escapeHtml(article.title)}</h1>
            <div class="article-meta">
                <span class="author">By ${escapeHtml(article.author)}</span>
                <span class="date">${article.date}</span>
                ${article.category ? `<span class="category">${escapeHtml(article.category)}</span>` : ''}
            </div>
            ${canEdit ? `
                <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                    <button onclick="editArticle()" style="padding: 0.5rem 1rem; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        ✏️ Edit Article
                    </button>
                    <button onclick="deleteArticle()" style="padding: 0.5rem 1rem; background: #ff6b6b; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        🗑️ Delete Article
                    </button>
                </div>
            ` : ''}
        </header>
        
        <div class="article-body">
            ${article.content.split('\n').filter(p => p.trim()).map(para => `<p>${escapeHtml(para)}</p>`).join('')}
        </div>
        
        ${article.tags && article.tags.length > 0 ? `
            <div class="article-tags">
                <strong>Tags:</strong>
                ${article.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
        ` : ''}
        
        <div style="margin-top: 2rem; text-align: center;">
            <a href="index.html" style="color: #667eea; text-decoration: none; font-weight: 600;">← Back to Home</a>
        </div>
    `;
}

// Edit article
function editArticle() {
    if (!currentArticle) return;
    
    sessionStorage.setItem('editArticle', JSON.stringify(currentArticle));
    window.location.href = `edit-post.html?id=${currentArticle.id}`;
}

// Delete article
async function deleteArticle() {
    if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
        return;
    }

    const articleId = getArticleId();
    
    console.log('Deleting article:', articleId);
    console.log('Auth token exists:', !!window.authToken);
    
    try {
        const response = await fetch(`${API_URL}/posts/${articleId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${window.authToken}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to delete article');
        }

        alert('Article deleted successfully!');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Delete error:', error);
        alert(`Failed to delete article: ${error.message}`);
    }
}

// Fetch comments
async function fetchComments(articleId) {
    try {
        const response = await fetch(`${API_URL}/posts/${articleId}/comments`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch comments');
        }

        const comments = await response.json();
        renderComments(comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        document.getElementById('commentsList').innerHTML = `
            <p style="color: #999; text-align: center;">Unable to load comments</p>
        `;
    }
}

// Render comments
function renderComments(comments) {
    const container = document.getElementById('commentsList');
    
    if (comments.length === 0) {
        container.innerHTML = `
            <p style="color: #999; text-align: center; padding: 2rem;">No comments yet. Be the first to comment!</p>
        `;
        return;
    }

    container.innerHTML = comments.map(comment => `
        <div style="border-bottom: 1px solid #e0e0e0; padding: 1.5rem 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <strong style="color: #333;">${escapeHtml(comment.userName)}</strong>
                <span style="color: #999; font-size: 0.9rem;">${formatDate(comment.dateTime)}</span>
            </div>
            <p style="color: #666; margin: 0; line-height: 1.6;">${escapeHtml(comment.comment_body)}</p>
        </div>
    `).join('');
}

// Submit comment
async function submitComment() {
    const commentInput = document.getElementById('commentInput');
    const content = commentInput.value.trim();
    
    console.log('Submitting comment...');
    console.log('Auth token exists:', !!window.authToken);
    
    if (!content) {
        showNotification('error', 'Please enter a comment');
        return;
    }

    if (content.length > 1000) {
        showNotification('error', 'Comment is too long (max 1000 characters)');
        return;
    }

    const articleId = getArticleId();
    
    // Disable textarea and button
    commentInput.disabled = true;
    const submitBtn = event.target;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Posting...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/posts/${articleId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.authToken}`
            },
            body: JSON.stringify({ content })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to post comment');
        }

        showNotification('success', 'Comment posted successfully!');
        commentInput.value = '';
        fetchComments(articleId);
    } catch (error) {
        console.error('Comment error:', error);
        showNotification('error', `Failed to post comment: ${error.message}`);
    } finally {
        commentInput.disabled = false;
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Utility function to escape HTML
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

// Format date helper
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
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
    await checkAuth();
    await fetchArticle();
});