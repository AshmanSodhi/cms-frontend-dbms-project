const API_URL = 'https://cms-backend-dbms-project.onrender.com/api';

// Check authentication on page load
window.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('authToken');
    console.log('Post page - Token check:', !!token);
    
    if (!token) {
        alert('Please login to create a post');
        window.location.href = 'login.html';
        return;
    }
    
    window.authToken = token;
    
    // Verify token is valid
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const user = await response.json();
            console.log('Post page - User authenticated:', user);
            window.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            
            // Update nav if user is logged in
            updateNav(user);
        } else {
            console.log('Post page - Token invalid');
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            alert('Session expired. Please login again.');
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        alert('Authentication failed. Please login again.');
        window.location.href = 'login.html';
    }
});

// Update navigation for logged in user
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
        window.location.href = 'login.html';
    }
}

// Character counters
const titleInput = document.getElementById('postTitle');
const titleCount = document.getElementById('titleCount');
const excerptInput = document.getElementById('postExcerpt');
const excerptCount = document.getElementById('excerptCount');

// Form elements
const postForm = document.getElementById('postForm');
const saveDraftBtn = document.getElementById('saveDraftBtn');
const previewBtn = document.getElementById('previewBtn');

// Set current date and time as default
const postDateInput = document.getElementById('postDate');
const now = new Date();
now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
postDateInput.value = now.toISOString().slice(0, 16);

// Character counter for title
titleInput.addEventListener('input', () => {
    const count = titleInput.value.length;
    titleCount.textContent = `${count}/200`;
});

// Character counter for excerpt
excerptInput.addEventListener('input', () => {
    const count = excerptInput.value.length;
    excerptCount.textContent = `${count}/300`;
});

// Collect form data
function collectFormData() {
    const formData = {
        title: document.getElementById('postTitle').value.trim(),
        category: document.getElementById('postCategory').value,
        tags: document.getElementById('postTags').value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag !== ''),
        excerpt: document.getElementById('postExcerpt').value.trim(),
        content: document.getElementById('postContent').value.trim(),
        featuredImage: document.getElementById('imageUrl').value.trim(),
        publishDate: document.getElementById('postDate').value,
        allowComments: document.getElementById('allowComments').checked,
        isFeatured: document.getElementById('featuredPost').checked
    };
    
    return formData;
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
    
    // Validate URL if provided
    if (data.featuredImage && !isValidUrl(data.featuredImage)) {
        errors.push('Featured image must be a valid URL');
    }
    
    return errors;
}

// URL validation helper
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Handle form submission (Publish)
postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    console.log('Submitting post...');
    console.log('Auth token exists:', !!window.authToken);
    
    const errors = validateForm();
    
    if (errors.length > 0) {
        alert('Please fix the following errors:\n\n' + errors.join('\n'));
        return;
    }
    
    const data = collectFormData();
    
    // Disable submit button
    const submitBtn = postForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Publishing...';
    
    try {
        const response = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.authToken}`
            },
            body: JSON.stringify({
                title: data.title,
                content: data.content,
                category: data.category,
                tags: data.tags,
                date: data.publishDate
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to create post');
        }

        alert('Post Published Successfully! 🎉');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Publish error:', error);
        alert(`Failed to publish post: ${error.message}`);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Publish Post';
    }
});

// Save as draft
saveDraftBtn.addEventListener('click', () => {
    const postData = collectFormData();
    localStorage.setItem('draftPost', JSON.stringify(postData));
    alert('Draft saved locally! 📝');
});

// Preview post
previewBtn.addEventListener('click', () => {
    const postData = collectFormData();
    
    if (!postData.title || !postData.content) {
        alert('Please add at least a title and content to preview');
        return;
    }
    
    // Create preview window
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
            ${postData.featuredImage ? `<img src="${escapeHtml(postData.featuredImage)}" alt="${escapeHtml(postData.imageAlt || postData.title)}">` : ''}
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

// Load draft if exists
window.addEventListener('load', () => {
    const draft = localStorage.getItem('draftPost');
    if (draft && confirm('Found a saved draft. Would you like to load it?')) {
        try {
            const postData = JSON.parse(draft);
            document.getElementById('postTitle').value = postData.title || '';
            document.getElementById('postCategory').value = postData.category || '';
            document.getElementById('postTags').value = postData.tags ? postData.tags.join(', ') : '';
            document.getElementById('postExcerpt').value = postData.excerpt || '';
            document.getElementById('postContent').value = postData.content || '';
            document.getElementById('imageUrl').value = postData.featuredImage || '';
            document.getElementById('postDate').value = postData.publishDate || '';
            document.getElementById('allowComments').checked = postData.allowComments !== false;
            document.getElementById('featuredPost').checked = postData.isFeatured || false;
            
            // Update character counts
            titleInput.dispatchEvent(new Event('input'));
            excerptInput.dispatchEvent(new Event('input'));
        } catch (e) {
            console.error('Failed to load draft:', e);
        }
    }
});