const API_URL = 'https://cms-backend-dbms-project.onrender.com/api';

// Store all articles and current filter state
let allArticles = [];
let currentCategory = '';
let currentSearchQuery = '';

async function fetchArticles() {
    try {
        const response = await fetch(`${API_URL}/posts`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch articles');
        }

        allArticles = await response.json();
        console.log('Fetched articles:', allArticles);
        renderArticles(allArticles);
        await fetchCategories(); // Fetch categories after articles are loaded
    } catch (error) {
        console.error('Error fetching articles:', error);
        const grid = document.getElementById('articlesGrid');
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: white;">
                <h3>Unable to load articles</h3>
                <p>${error.message}</p>
                <p style="font-size: 0.9rem; margin-top: 1rem;">Make sure the backend server is running</p>
            </div>
        `;
    }
}

// Fetch categories from API
async function fetchCategories() {
    try {
        const response = await fetch(`${API_URL}/categories`);
        
        if (!response.ok) {
            console.log('Categories endpoint not available, extracting from articles');
            extractCategoriesFromArticles();
            return;
        }

        const categories = await response.json();
        console.log('Fetched categories:', categories);
        
        // Filter out categories with no posts
        const activeCategories = categories.filter(cat => cat.postCount > 0);
        renderCategoryButtons(activeCategories);
    } catch (error) {
        console.log('Error fetching categories, extracting from articles:', error);
        extractCategoriesFromArticles();
    }
}

// Extract unique categories from articles (fallback method)
function extractCategoriesFromArticles() {
    const categoriesSet = new Set();
    
    allArticles.forEach(article => {
        // The API returns 'category' as a string directly
        if (article.category) {
            categoriesSet.add(article.category);
        }
    });
    
    const categories = Array.from(categoriesSet).map(cat => ({
        name: cat,
        categoryId: cat.toLowerCase().replace(/\s+/g, '-')
    }));
    
    console.log('Extracted categories from articles:', categories);
    renderCategoryButtons(categories);
}

// Render category filter buttons
function renderCategoryButtons(categories) {
    const filterContainer = document.getElementById('categoryFilter');
    
    if (!filterContainer) return;
    
    // Clear existing buttons except "All"
    filterContainer.innerHTML = '<button class="category-btn active" onclick="filterByCategory(\'\')">All</button>';
    
    if (categories.length === 0) {
        console.log('No categories to display');
        return;
    }
    
    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'category-btn';
        // Use 'name' property from API response
        const categoryName = category.name || category;
        button.textContent = categoryName;
        button.onclick = () => filterByCategory(categoryName);
        filterContainer.appendChild(button);
    });
}

// Filter articles by category
function filterByCategory(category) {
    currentCategory = category;
    console.log('Filtering by category:', category);
    
    // Update active button
    const buttons = document.querySelectorAll('.category-btn');
    buttons.forEach(btn => {
        if ((category === '' && btn.textContent === 'All') || 
            btn.textContent === category) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Apply both search and category filters
    applyFilters();
}

// Search function
function searchArticles(query) {
    currentSearchQuery = query.toLowerCase().trim();
    console.log('Searching for:', currentSearchQuery);
    applyFilters();
}

// Apply both search and category filters
function applyFilters() {
    let filtered = [...allArticles];
    
    // Apply category filter
    if (currentCategory) {
        filtered = filtered.filter(article => {
            // The API returns 'category' as a string directly
            return article.category === currentCategory;
        });
        console.log('After category filter:', filtered.length, 'articles');
    }
    
    // Apply search filter
    if (currentSearchQuery) {
        filtered = filtered.filter(article => {
            const titleMatch = article.title?.toLowerCase().includes(currentSearchQuery);
            const authorMatch = article.author?.toLowerCase().includes(currentSearchQuery);
            const excerptMatch = article.excerpt?.toLowerCase().includes(currentSearchQuery);
            const contentMatch = article.content?.toLowerCase().includes(currentSearchQuery);
            const categoryMatch = article.category?.toLowerCase().includes(currentSearchQuery);
            
            return titleMatch || authorMatch || excerptMatch || contentMatch || categoryMatch;
        });
        console.log('After search filter:', filtered.length, 'articles');
    }
    
    renderArticles(filtered);
}

function renderArticles(articles) {
    const grid = document.getElementById('articlesGrid');
    grid.innerHTML = '';
    
    if (articles.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: white;">
                <h3>No articles found</h3>
                <p>${currentSearchQuery || currentCategory ? 'Try adjusting your search or filter' : 'Be the first to create a post!'}</p>
            </div>
        `;
        return;
    }

    articles.forEach(article => {
        const card = document.createElement('div');
        card.className = 'article-card';
        
        // Get category - it's already a string in the API response
        const category = article.category || '';
        
        card.innerHTML = `
            ${article.imageUrl 
                ? `<div class="article-image-wrapper">
                     <img src="${escapeHtml(article.imageUrl)}" alt="${escapeHtml(article.title)}" class="article-image-img" onerror="this.parentElement.innerHTML='<div class=\\'article-image\\'>${article.icon || '📄'}</div>'">
                   </div>`
                : `<div class="article-image">${article.icon || '📄'}</div>`
            }
            <div class="article-content">
                <h2 class="article-title">${escapeHtml(article.title)}</h2>
                ${category ? `<span class="article-category">${escapeHtml(category)}</span>` : ''}
                <p class="article-excerpt">${escapeHtml(article.excerpt)}</p>
                <div class="article-meta">
                    <span class="article-author">👤 ${escapeHtml(article.author)}</span>
                    <span>📅 ${article.date}</span>
                    ${article.views ? `<span>👁️ ${article.views} views</span>` : ''}
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
        loginLink.parentElement.remove();
        
        const profileLink = document.createElement('li');
        profileLink.innerHTML = '<a href="profile.html">👤 My Profile</a>';
        navLinks.appendChild(profileLink);
        
        if (user.roleId === 1 || user.roleName === 'admin') {
            const adminLink = document.createElement('li');
            adminLink.innerHTML = '<a href="admin.html">⚙️ Admin Panel</a>';
            navLinks.appendChild(adminLink);
        }
        
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
    
    // Setup search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchArticles(e.target.value);
        });
    }
});