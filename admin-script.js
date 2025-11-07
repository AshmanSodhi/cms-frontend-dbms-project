const API_URL = 'https://cms-backend-dbms-project.onrender.com/api';
let articles = [];

// Check admin authentication
async function checkAdminAuth() {
    const token = localStorage.getItem('authToken');
    console.log('Admin page - Token check:', !!token);
    
    if (!token) {
        alert('Please login to access admin panel');
        window.location.href = 'login.html';
        return false;
    }

    window.authToken = token;

    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Authentication failed');
        }

        const user = await response.json();
        console.log('Admin page - User authenticated:', user);
        console.log('User roleId:', user.roleId, 'roleName:', user.roleName);
        
        window.currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // FIXED: Check BOTH roleId AND roleName
        if (user.roleId !== 1 && user.roleName !== 'admin') {
            console.log('Admin check FAILED - Not an admin');
            alert('Admin access required');
            window.location.href = 'index.html';
            return false;
        }

        console.log('Admin check PASSED');
        updateAdminNav(user);
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        alert('Please login to access admin panel');
        window.location.href = 'login.html';
        return false;
    }
}

function updateAdminNav(user) {
    const navLinks = document.querySelector('.nav-links');
    
    if (!navLinks) {
        console.log('Nav links not found');
        return;
    }
    
    // Find or create user info display
    let userInfo = navLinks.querySelector('.user-info');
    if (!userInfo) {
        userInfo = document.createElement('li');
        userInfo.className = 'user-info';
        userInfo.innerHTML = `<span style="color: #667eea; font-weight: 600;">👤 ${escapeHtml(user.name)}</span>`;
        
        // Add before logout button if it exists, otherwise append
        const logoutBtn = navLinks.querySelector('.logout-btn');
        if (logoutBtn && logoutBtn.parentElement) {
            navLinks.insertBefore(userInfo, logoutBtn.parentElement);
        } else {
            navLinks.appendChild(userInfo);
        }
    }
}

async function fetchStats() {
    const token = window.authToken;
    
    try {
        const response = await fetch(`${API_URL}/admin/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch stats');
        }

        const stats = await response.json();
        updateStats(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        showNotification('error', 'Failed to load statistics');
    }
}

function updateStats(stats) {
    document.getElementById('totalArticles').textContent = stats.totalArticles || 0;
    document.getElementById('totalAuthors').textContent = stats.totalAuthors || 0;
    document.getElementById('totalViews').textContent = formatNumber(stats.totalViews) || 0;
    document.getElementById('publishedToday').textContent = stats.publishedToday || 0;
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

async function fetchArticles() {
    const token = window.authToken;
    
    try {
        const response = await fetch(`${API_URL}/admin/posts`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch articles');
        }

        articles = await response.json();
        renderArticlesTable();
    } catch (error) {
        console.error('Error fetching articles:', error);
        const tbody = document.getElementById('articlesTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2rem; color: #999;">
                    Unable to load articles: ${error.message}
                </td>
            </tr>
        `;
    }
}

function renderArticlesTable() {
    const tbody = document.getElementById('articlesTableBody');
    tbody.innerHTML = '';

    if (articles.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2rem; color: #999;">
                    No articles found
                </td>
            </tr>
        `;
        return;
    }

    articles.forEach(article => {
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        row.style.transition = 'background 0.2s';
        
        row.innerHTML = `
            <td>${article.icon || '📄'} ${escapeHtml(article.title)}</td>
            <td>${escapeHtml(article.author)}</td>
            <td>${article.date}</td>
            <td><span class="status-badge">${article.status || 'Published'}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-view" onclick="viewArticle(${article.id}); event.stopPropagation();" title="View Article">
                        👁️ View
                    </button>
                    <button class="btn btn-edit" onclick="editArticle(${article.id}); event.stopPropagation();" title="Edit Article">
                        ✏️ Edit
                    </button>
                    <button class="btn btn-danger" onclick="deleteArticle(${article.id}); event.stopPropagation();" title="Delete Article">
                        🗑️ Delete
                    </button>
                </div>
            </td>
        `;
        
        row.addEventListener('mouseenter', () => {
            row.style.background = '#f9f9f9';
        });
        
        row.addEventListener('mouseleave', () => {
            row.style.background = '';
        });
        
        tbody.appendChild(row);
    });
}

function viewArticle(id) {
    window.location.href = `article.html?id=${id}`;
}

function editArticle(id) {
    const article = articles.find(a => a.id === id);
    if (article) {
        sessionStorage.setItem('editArticle', JSON.stringify(article));
        window.location.href = `edit-post.html?id=${id}`;
    }
}

async function deleteArticle(id) {
    if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
        return;
    }

    const token = window.authToken;
    
    const deleteBtn = event.target;
    deleteBtn.disabled = true;
    deleteBtn.textContent = '⏳ Deleting...';
    
    try {
        const response = await fetch(`${API_URL}/posts/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to delete article');
        }

        showNotification('success', 'Article deleted successfully!');
        await fetchArticles();
        await fetchStats();
    } catch (error) {
        console.error('Delete error:', error);
        showNotification('error', `Failed to delete article: ${error.message}`);
        deleteBtn.disabled = false;
        deleteBtn.textContent = '🗑️ Delete';
    }
}

function openAddModal() {
    window.location.href = 'add-post.html';
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        window.authToken = null;
        window.currentUser = null;
        window.location.href = 'login.html';
    }
}

// Search functionality for admin table
function setupAdminSearch() {
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search articles...';
    searchInput.style.cssText = `
        padding: 0.75rem;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        font-size: 1rem;
        width: 300px;
        margin-bottom: 1rem;
    `;
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#articlesTableBody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(query) ? '' : 'none';
        });
    });
    
    const sectionHeader = document.querySelector('.section-header');
    if (sectionHeader) {
        const searchContainer = document.createElement('div');
        searchContainer.appendChild(searchInput);
        sectionHeader.insertBefore(searchContainer, sectionHeader.firstChild);
    }
}

// Export data functionality
function exportArticlesToCSV() {
    if (articles.length === 0) {
        showNotification('error', 'No articles to export');
        return;
    }
    
    const headers = ['ID', 'Title', 'Author', 'Date', 'Status'];
    const csvContent = [
        headers.join(','),
        ...articles.map(article => [
            article.id,
            `"${article.title.replace(/"/g, '""')}"`,
            `"${article.author.replace(/"/g, '""')}"`,
            article.date,
            article.status || 'Published'
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `writenest-articles-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showNotification('success', 'Articles exported successfully!');
}

// Add export button
function addExportButton() {
    const sectionHeader = document.querySelector('.section-header');
    if (sectionHeader) {
        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn';
        exportBtn.textContent = '📥 Export CSV';
        exportBtn.onclick = exportArticlesToCSV;
        exportBtn.style.marginLeft = '1rem';
        sectionHeader.appendChild(exportBtn);
    }
}

// Show notification
function showNotification(type, message) {
    const existing = document.querySelectorAll('.admin-notification');
    existing.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = 'admin-notification';
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        font-weight: 600;
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 300px;
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

// Utility function
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

// Add refresh button
function addRefreshButton() {
    const sectionHeader = document.querySelector('.section-header');
    if (sectionHeader) {
        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'btn';
        refreshBtn.textContent = '🔄 Refresh';
        refreshBtn.onclick = async () => {
            refreshBtn.disabled = true;
            refreshBtn.textContent = '⏳ Loading...';
            await fetchArticles();
            await fetchStats();
            refreshBtn.disabled = false;
            refreshBtn.textContent = '🔄 Refresh';
            showNotification('success', 'Data refreshed!');
        };
        refreshBtn.style.marginLeft = '1rem';
        sectionHeader.appendChild(refreshBtn);
    }
}

// Add CSS for animations and status badge
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
    
    .status-badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: 600;
        background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
        color: white;
    }
    
    .action-buttons {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
    }
    
    .btn-view {
        background: #2196F3;
        color: white;
        padding: 0.4rem 0.8rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 600;
        transition: all 0.2s;
    }
    
    .btn-view:hover {
        background: #1976D2;
        transform: translateY(-1px);
    }
    
    .btn-edit {
        background: #FF9800;
        color: white;
        padding: 0.4rem 0.8rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 600;
        transition: all 0.2s;
    }
    
    .btn-edit:hover {
        background: #F57C00;
        transform: translateY(-1px);
    }
    
    .btn-danger:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;
document.head.appendChild(style);

// Initialize admin panel
document.addEventListener('DOMContentLoaded', async () => {
    const isAdmin = await checkAdminAuth();
    if (isAdmin) {
        await fetchStats();
        await fetchArticles();
        setupAdminSearch();
        addExportButton();
        addRefreshButton();
        
        // Auto-refresh every 30 seconds
        setInterval(async () => {
            await fetchStats();
        }, 30000);
    }
});