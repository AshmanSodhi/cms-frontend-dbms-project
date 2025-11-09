const API_URL = 'https://cms-backend-dbms-project.onrender.com/api';
let currentArticle = null;
let articleId = null;

// Get article ID from URL
function getArticleId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// Check authentication
async function checkAuth() {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
        alert('Please login to edit posts');
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

        if (response.ok) {
            const user = await response.json();
            window.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            return true;
        } else {
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            alert('Session expired. Please login again.');
            window.location.href = 'login.html';
            return false;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        alert('Authentication failed. Please login again.');
        window.location.href = 'login.html';
        return false;
    }
}

// Fetch article data
async function fetchArticle() {
    articleId = getArticleId();
    
    if (!articleId) {
        alert('No article ID provided');
        window.location.href = 'profile.html';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/posts/${articleId}`);
        
        if (!response.ok) {
            throw new Error('Article not found');
        }

        currentArticle = await response.json();
        
        // Check if user is authorized to edit
        const isAuthor = window.currentUser && (window.currentUser.userId === currentArticle.authorId || window.currentUser.id === currentArticle.authorId);
        const isAdmin = window.currentUser && (window.currentUser.roleId === 1 || window.currentUser.roleName === 'admin');
        
        if (!isAuthor && !isAdmin) {
            alert('You are not authorized to edit this article');
            window.location.href = 'profile.html';
            return;
        }
        
        populateForm();
    } catch (error) {
        console.error('Error fetching article:', error);
        alert(`Failed to load article: ${error.message}`);
        window.location.href = 'profile.html';
    }
}

// Populate form with article data
function populateForm() {
    document.getElementById('postTitle').value = currentArticle.title || '';
    document.getElementById('postCategory').value = currentArticle.category || '';
    document.getElementById('postTags').value = currentArticle.tags ? currentArticle.tags.join(', ') : '';
    
    // For excerpt, we need to extract from content or use first 200 chars
    const excerpt = currentArticle.content ? currentArticle.content.substring(0, 200) : '';
    document.getElementById('postExcerpt').value = excerpt;
    
    document.getElementById('postContent').value = currentArticle.content || '';
    
    // FIXED: Set imageUrl field
    document.getElementById('imageUrl').value = currentArticle.imageUrl || '';
    
    // Set date - convert to datetime-local format
    if (currentArticle.dateCreated) {
        const date = new Date(currentArticle.dateCreated);
        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        document.getElementById('postDate').value = date.toISOString().slice(0, 16);
    }
    
    document.getElementById('allowComments').checked = true;
    document.getElementById('featuredPost').checked = false;
    
    // Update character counts
    titleInput.dispatchEvent(new Event('input'));
    excerptInput.dispatchEvent(new Event('input'));
}

// Character counters
const titleInput = document.getElementById('postTitle');
const titleCount = document.getElementById('titleCount');
const excerptInput = document.getElementById('postExcerpt');
const excerptCount = document.getElementById('excerptCount');

titleInput.addEventListener('input', () => {
    const count = titleInput.value.length;
    titleCount.textContent = `${count}/200`;
});

excerptInput.addEventListener('input', () => {
    const count = excerptInput.value.length;
    excerptCount.textContent = `${count}/300`;
});

// Form elements
const editPostForm = document.getElementById('editPostForm');
const previewBtn = document.getElementById('previewBtn');

// Collect form data
function collectFormData() {
    return {
        title: document.getElementById('postTitle').value.trim(),
        category: document.getElementById('postCategory').value,
        tags: document.getElementById('postTags').value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag !== ''),
        excerpt: document.getElementById('postExcerpt').value.trim(),
        content: document.getElementById('postContent').value.trim(),
        imageUrl: document.getElementById('imageUrl').value.trim(), // FIXED: Use imageUrl
        publishDate: document.getElementById('postDate').value,
        allowComments: document.getElementById('allowComments').checked,
        isFeatured: document.getElementById('featuredPost').checked
    };
}

// Validate form
function validateForm() {
    const data = collectFormData();
    const errors = [];
    
    if (data.title === '') errors.push('Title is required');
    if (data.category === '') errors.push('Category is required');
    if (data.excerpt === '') errors.push('Excerpt is required');
    if (data.content === '') errors.push('Content is required');
    if (data.publishDate === '') errors.push('Publish date is required');
    
    // FIXED: Validate imageUrl instead of featuredImage
    if (data.imageUrl && !isValidUrl(data.imageUrl)) {
        errors.push('Image URL must be a valid URL');
    }
    
    return errors;
}

// URL validation
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Handle form submission
editPostForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    
    if (errors.length > 0) {
        alert('Please fix the following errors:\n\n' + errors.join('\n'));
        return;
    }
    
    const data = collectFormData();
    
    const submitBtn = editPostForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Updating...';
    
    try {
        // FIXED: Include imageUrl in the request body
        const response = await fetch(`${API_URL}/posts/${articleId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.authToken}`
            },
            body: JSON.stringify({
                title: data.title,
                content: data.content,
                category: data.category,
                tags: data.tags,
                imageUrl: data.imageUrl || null // FIXED: Added imageUrl
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to update post');
        }

        alert('Post Updated Successfully! 🎉');
        window.location.href = `article.html?id=${articleId}`;
    } catch (error) {
        console.error('Update error:', error);
        alert(`Failed to update post: ${error.message}`);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Update Post';
    }
});

// Cancel edit
function cancelEdit() {
    if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
        window.location.href = `article.html?id=${articleId}`;
    }
}

// Preview post
previewBtn.addEventListener('click', () => {
    const postData = collectFormData();
    
    if (!postData.title || !postData.content) {
        alert('Please add at least a title and content to preview');
        return;
    }
    
    const previewWindow = window.open('', 'Preview', 'width=800,height=600');
    previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Preview: ${escapeHtml(postData.title)}</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 2rem;
                    line-height: 1.6;
                }
                h1 { color: #333; margin-bottom: 0.5rem; }
                .meta { color: #666; margin-bottom: 1rem; font-size: 0.9rem; }
                .excerpt { font-style: italic; color: #555; margin: 1rem 0; padding: 1rem; background: #f5f5f5; border-left: 4px solid #667eea; }
                .content { white-space: pre-wrap; }
                img { max-width: 100%; height: auto; margin: 1rem 0; }
                .tags { margin-top: 2rem; }
                .tag { display: inline-block; background: #667eea; color: white; padding: 0.25rem 0.75rem; border-radius: 15px; margin-right: 0.5rem; font-size: 0.85rem; }
            </style>
        </head>
        <body>
            <h1>${escapeHtml(postData.title)}</h1>
            <div class="meta">
                ${new Date(postData.publishDate).toLocaleDateString()} | ${escapeHtml(postData.category)}
            </div>
            ${postData.imageUrl ? `<img src="${escapeHtml(postData.imageUrl)}" alt="${escapeHtml(postData.title)}">` : ''}
            <div class="excerpt">${escapeHtml(postData.excerpt)}</div>
            <div class="content">${escapeHtml(postData.content)}</div>
            ${postData.tags.length > 0 ? `
                <div class="tags">
                    ${postData.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
                </div>
            ` : ''}
        </body>
        </html>
    `);
});

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

// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        window.authToken = null;
        window.currentUser = null;
        window.location.href = 'login.html';
    }
}

// Add visual feedback for validation
const inputs = document.querySelectorAll('input[required], textarea[required], select[required]');

inputs.forEach(input => {
    input.addEventListener('blur', () => {
        if (input.value.trim() === '') {
            input.style.borderColor = '#ff6b6b';
        } else {
            input.style.borderColor = '#4caf50';
        }
    });
    
    input.addEventListener('focus', () => {
        input.style.borderColor = '#667eea';
    });
});

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
        await fetchArticle();
    }
});