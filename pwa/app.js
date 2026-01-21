/**
 * Cellophane PWA - Main Application
 * Version: 1.0.0
 */

// ===========================================
// APP STATE
// ===========================================

const AppState = {
    user: null,
    session: null,
    currentTab: 'my-feed',
    feeds: {
        my: { data: [], page: 0, hasMore: true, loading: false },
        following: { data: [], page: 0, hasMore: true, loading: false }
    },
    currentCellophane: null
};

// ===========================================
// DOM ELEMENTS
// ===========================================

const DOM = {
    // Screens
    screenLogin: document.getElementById('screen-login'),
    screenMain: document.getElementById('screen-main'),
    
    // Login
    btnGoogleLogin: document.getElementById('btn-google-login'),
    
    // Header
    btnProfile: document.getElementById('btn-profile'),
    userAvatar: document.getElementById('user-avatar'),
    
    // Tabs
    tabBtns: document.querySelectorAll('.tab-btn'),
    feedMy: document.getElementById('feed-my'),
    feedFollowing: document.getElementById('feed-following'),
    
    // My Feed
    myFeedList: document.getElementById('my-feed-list'),
    myFeedCount: document.getElementById('my-feed-count'),
    myFeedEmpty: document.getElementById('my-feed-empty'),
    myFeedLoading: document.getElementById('my-feed-loading'),
    
    // Following Feed
    followingFeedList: document.getElementById('following-feed-list'),
    followingFeedCount: document.getElementById('following-feed-count'),
    followingFeedEmpty: document.getElementById('following-feed-empty'),
    followingFeedLoading: document.getElementById('following-feed-loading'),
    
    // Modals
    modalDetail: document.getElementById('modal-detail'),
    modalProfile: document.getElementById('modal-profile'),
    
    // Detail Modal
    detailCellophane: document.getElementById('detail-cellophane'),
    commentsList: document.getElementById('comments-list'),
    commentText: document.getElementById('comment-text'),
    btnSendComment: document.getElementById('btn-send-comment'),
    
    // Profile Modal
    profileAvatar: document.getElementById('profile-avatar'),
    profileName: document.getElementById('profile-name'),
    profileEmail: document.getElementById('profile-email'),
    statCellophanes: document.getElementById('stat-cellophanes'),
    statFollowers: document.getElementById('stat-followers'),
    statFollowing: document.getElementById('stat-following'),
    btnLogout: document.getElementById('btn-logout'),
    
    // Toast
    toastContainer: document.getElementById('toast-container')
};

// ===========================================
// INITIALIZATION
// ===========================================

async function initApp() {
    console.log('🎬 Initializing Cellophane PWA...');
    
    // Setup event listeners
    setupEventListeners();
    
    // Check for existing session
    const { data: { session } } = await CelloAPI.auth.getSession();
    
    if (session) {
        console.log('✅ Found existing session');
        await handleAuthSuccess(session);
    } else {
        console.log('👤 No session, showing login');
        showScreen('login');
    }
    
    // Listen for auth changes (important for OAuth redirect)
    CelloAPI.auth.onAuthStateChange(async (event, session) => {
        console.log('🔔 Auth event:', event);
        
        if (event === 'SIGNED_IN' && session) {
            await handleAuthSuccess(session);
        } else if (event === 'SIGNED_OUT') {
            handleAuthLogout();
        }
    });
}

// ===========================================
// EVENT LISTENERS
// ===========================================

function setupEventListeners() {
    // Google Login
    DOM.btnGoogleLogin.addEventListener('click', handleGoogleLogin);
    
    // Tab Navigation
    DOM.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => handleTabChange(btn.dataset.tab));
    });
    
    // Profile Button
    DOM.btnProfile.addEventListener('click', openProfileModal);
    
    // Logout
    DOM.btnLogout.addEventListener('click', handleLogout);
    
    // Modal Close Buttons
    document.querySelectorAll('.modal .btn-close, .modal .btn-back').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    
    // Modal Overlay Click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', closeAllModals);
    });
    
    // Comment Send
    DOM.btnSendComment.addEventListener('click', handleSendComment);
    DOM.commentText.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSendComment();
    });
    
    // Infinite Scroll
    document.querySelector('.feed-container').addEventListener('scroll', handleScroll);
}

// ===========================================
// AUTH HANDLERS
// ===========================================

async function handleGoogleLogin() {
    console.log('🔐 Starting Google login...');
    DOM.btnGoogleLogin.disabled = true;
    DOM.btnGoogleLogin.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:2px;"></span> מתחבר...';
    
    const { data, error } = await CelloAPI.auth.signInWithGoogle();
    
    if (error) {
        console.error('❌ Login error:', error);
        showToast('שגיאה בהתחברות. נסה שוב.', 'error');
        DOM.btnGoogleLogin.disabled = false;
        DOM.btnGoogleLogin.innerHTML = '<svg class="google-icon" viewBox="0 0 24 24" width="24" height="24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg><span>התחבר עם Google</span>';
    }
    // If success, the page will redirect to Google, then back to us
    // The onAuthStateChange listener will handle the rest
}

async function handleAuthSuccess(session) {
    AppState.session = session;
    
    // Get user details
    const { data: { user } } = await CelloAPI.auth.getUser();
    AppState.user = user;
    
    console.log('👤 User:', user.email);
    
    // Update UI with user info
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';
    const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
    
    DOM.userAvatar.src = avatarUrl || 'https://via.placeholder.com/32';
    DOM.profileAvatar.src = avatarUrl || 'https://via.placeholder.com/80';
    DOM.profileName.textContent = displayName;
    DOM.profileEmail.textContent = user.email;
    
    // Show main screen
    showScreen('main');
    
    // Load feeds
    await loadMyFeed(true);
    
    showToast(`שלום ${displayName}! 👋`, 'success');
}

function handleAuthLogout() {
    AppState.user = null;
    AppState.session = null;
    AppState.feeds = {
        my: { data: [], page: 0, hasMore: true, loading: false },
        following: { data: [], page: 0, hasMore: true, loading: false }
    };
    
    showScreen('login');
    showToast('התנתקת בהצלחה', 'success');
}

async function handleLogout() {
    closeAllModals();
    const { error } = await CelloAPI.auth.signOut();
    
    if (error) {
        showToast('שגיאה בהתנתקות', 'error');
    }
    // onAuthStateChange will handle the rest
}

// ===========================================
// SCREEN MANAGEMENT
// ===========================================

function showScreen(screen) {
    DOM.screenLogin.classList.remove('active');
    DOM.screenMain.classList.remove('active');
    
    if (screen === 'login') {
        DOM.screenLogin.classList.add('active');
    } else if (screen === 'main') {
        DOM.screenMain.classList.add('active');
    }
}

// ===========================================
// TAB NAVIGATION
// ===========================================

function handleTabChange(tab) {
    AppState.currentTab = tab;
    
    // Update tab buttons
    DOM.tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    // Update feeds visibility
    DOM.feedMy.classList.toggle('active', tab === 'my-feed');
    DOM.feedFollowing.classList.toggle('active', tab === 'following');
    
    // Load feed if needed
    if (tab === 'my-feed' && AppState.feeds.my.data.length === 0) {
        loadMyFeed(true);
    } else if (tab === 'following' && AppState.feeds.following.data.length === 0) {
        loadFollowingFeed(true);
    }
}

// ===========================================
// FEED LOADING
// ===========================================

async function loadMyFeed(reset = false) {
    const feed = AppState.feeds.my;
    
    if (feed.loading || (!reset && !feed.hasMore)) return;
    
    if (reset) {
        feed.data = [];
        feed.page = 0;
        feed.hasMore = true;
        DOM.myFeedList.innerHTML = '';
    }
    
    feed.loading = true;
    DOM.myFeedLoading.classList.remove('hidden');
    DOM.myFeedEmpty.classList.add('hidden');
    
    const { data, error } = await CelloAPI.cellophanes.getMyCellophanes(feed.page);
    
    feed.loading = false;
    DOM.myFeedLoading.classList.add('hidden');
    
    if (error) {
        console.error('❌ Error loading my feed:', error);
        showToast('שגיאה בטעינת הצלופנים', 'error');
        return;
    }
    
    if (data.length < 20) {
        feed.hasMore = false;
    }
    
    feed.data = [...feed.data, ...data];
    feed.page++;
    
    // Update UI
    DOM.myFeedCount.textContent = feed.data.length;
    DOM.statCellophanes.textContent = feed.data.length;
    
    if (feed.data.length === 0) {
        DOM.myFeedEmpty.classList.remove('hidden');
    } else {
        renderCellophanes(data, DOM.myFeedList);
    }
}

async function loadFollowingFeed(reset = false) {
    const feed = AppState.feeds.following;
    
    if (feed.loading || (!reset && !feed.hasMore)) return;
    
    if (reset) {
        feed.data = [];
        feed.page = 0;
        feed.hasMore = true;
        DOM.followingFeedList.innerHTML = '';
    }
    
    feed.loading = true;
    DOM.followingFeedLoading.classList.remove('hidden');
    DOM.followingFeedEmpty.classList.add('hidden');
    
    const { data, error } = await CelloAPI.cellophanes.getFollowingFeed(feed.page);
    
    feed.loading = false;
    DOM.followingFeedLoading.classList.add('hidden');
    
    if (error) {
        console.error('❌ Error loading following feed:', error);
        showToast('שגיאה בטעינת הפיד', 'error');
        return;
    }
    
    if (data.length < 20) {
        feed.hasMore = false;
    }
    
    feed.data = [...feed.data, ...data];
    feed.page++;
    
    // Update UI
    DOM.followingFeedCount.textContent = feed.data.length;
    
    if (feed.data.length === 0) {
        DOM.followingFeedEmpty.classList.remove('hidden');
    } else {
        renderCellophanes(data, DOM.followingFeedList);
    }
}

// ===========================================
// CELLOPHANE RENDERING
// ===========================================

function renderCellophanes(cellophanes, container) {
    cellophanes.forEach(cellophane => {
        const card = createCellophaneCard(cellophane);
        container.appendChild(card);
    });
}

function createCellophaneCard(cellophane) {
    const card = document.createElement('div');
    card.className = `cellophane-card ${cellophane.visibility || 'public'}`;
    card.dataset.id = cellophane.id;
    
    const authorAvatar = cellophane.authorAvatar || 'https://via.placeholder.com/36';
    const authorName = cellophane.author || 'Anonymous';
    const timestamp = formatTimestamp(cellophane.created_at);
    const visibility = getVisibilityLabel(cellophane.visibility);
    const sourceUrl = cellophane.url || '';
    const sourceDomain = sourceUrl ? new URL(sourceUrl).hostname : '';
    
    card.innerHTML = `
        <div class="cellophane-header">
            <img src="${authorAvatar}" alt="${authorName}" class="cellophane-author-avatar">
            <div class="cellophane-author-info">
                <div class="cellophane-author-name">${escapeHtml(authorName)}</div>
                <div class="cellophane-meta">
                    <span>${timestamp}</span>
                    <span class="visibility-badge ${cellophane.visibility || 'public'}">${visibility}</span>
                </div>
            </div>
        </div>
        <div class="cellophane-content">${escapeHtml(cellophane.text || '')}</div>
        ${sourceUrl ? `
            <div class="cellophane-source">
                <span class="cellophane-source-icon">🔗</span>
                <span class="cellophane-source-url">${sourceDomain}</span>
            </div>
        ` : ''}
        <div class="cellophane-actions">
            <button class="action-btn btn-like" data-id="${cellophane.id}">
                <span>❤️</span>
                <span class="like-count">0</span>
            </button>
            <button class="action-btn btn-comment" data-id="${cellophane.id}">
                <span>💬</span>
                <span class="comment-count">${cellophane.comments_count || 0}</span>
            </button>
            <button class="action-btn btn-share" data-id="${cellophane.id}">
                <span>📤</span>
            </button>
        </div>
    `;
    
    // Event listeners
    card.querySelector('.btn-like').addEventListener('click', (e) => {
        e.stopPropagation();
        handleLike(cellophane.id);
    });
    
    card.querySelector('.btn-comment').addEventListener('click', (e) => {
        e.stopPropagation();
        openCellophaneDetail(cellophane);
    });
    
    card.querySelector('.btn-share').addEventListener('click', (e) => {
        e.stopPropagation();
        handleShare(cellophane);
    });
    
    card.addEventListener('click', () => openCellophaneDetail(cellophane));
    
    return card;
}

// ===========================================
// CELLOPHANE ACTIONS
// ===========================================

async function handleLike(cellophaneId) {
    const { data, error } = await CelloAPI.reactions.toggle(cellophaneId, '❤️');
    
    if (error) {
        showToast('שגיאה בהוספת לייק', 'error');
        return;
    }
    
    // Update UI
    const btn = document.querySelector(`.btn-like[data-id="${cellophaneId}"]`);
    if (btn) {
        btn.classList.toggle('liked', data.action === 'added');
    }
    
    showToast(data.action === 'added' ? '❤️ אהבת!' : 'הסרת לייק', 'success');
}

async function handleShare(cellophane) {
    const shareUrl = `${window.location.origin}/c/${cellophane.id}`;
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Cellophane',
                text: cellophane.text?.substring(0, 100) || 'צלופן חדש',
                url: shareUrl
            });
        } catch (err) {
            // User cancelled or error
            if (err.name !== 'AbortError') {
                copyToClipboard(shareUrl);
            }
        }
    } else {
        copyToClipboard(shareUrl);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('הקישור הועתק! 📋', 'success');
    }).catch(() => {
        showToast('שגיאה בהעתקה', 'error');
    });
}

// ===========================================
// CELLOPHANE DETAIL MODAL
// ===========================================

async function openCellophaneDetail(cellophane) {
    AppState.currentCellophane = cellophane;
    
    const authorAvatar = cellophane.authorAvatar || 'https://via.placeholder.com/48';
    const authorName = cellophane.author || 'Anonymous';
    const timestamp = formatTimestamp(cellophane.created_at);
    
    DOM.detailCellophane.innerHTML = `
        <div class="cellophane-header">
            <img src="${authorAvatar}" alt="${authorName}" class="cellophane-author-avatar" style="width:48px;height:48px;">
            <div class="cellophane-author-info">
                <div class="cellophane-author-name">${escapeHtml(authorName)}</div>
                <div class="cellophane-meta">
                    <span>${timestamp}</span>
                </div>
            </div>
        </div>
        <div class="cellophane-content" style="font-size:1.1rem;margin:16px 0;">${escapeHtml(cellophane.text || '')}</div>
        ${cellophane.url ? `
            <a href="${cellophane.url}" target="_blank" class="cellophane-source">
                <span class="cellophane-source-icon">🔗</span>
                <span>צפה במקור</span>
            </a>
        ` : ''}
    `;
    
    // Load comments
    DOM.commentsList.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    DOM.modalDetail.classList.add('active');
    
    const { data: comments, error } = await CelloAPI.comments.getForCellophane(cellophane.id);
    
    if (error) {
        DOM.commentsList.innerHTML = '<p class="text-center" style="color:var(--color-text-secondary);">שגיאה בטעינת תגובות</p>';
        return;
    }
    
    if (comments.length === 0) {
        DOM.commentsList.innerHTML = '<p class="text-center" style="color:var(--color-text-secondary);">אין תגובות עדיין</p>';
    } else {
        DOM.commentsList.innerHTML = comments.map(comment => `
            <div class="comment-item">
                <img src="https://via.placeholder.com/32" alt="" class="comment-avatar">
                <div class="comment-body">
                    <div class="comment-author">${escapeHtml(comment.author || 'Anonymous')}</div>
                    <div class="comment-text">${escapeHtml(comment.text)}</div>
                    <div class="comment-time">${formatTimestamp(comment.created_at)}</div>
                </div>
            </div>
        `).join('');
    }
}

async function handleSendComment() {
    const text = DOM.commentText.value.trim();
    if (!text || !AppState.currentCellophane) return;
    
    DOM.btnSendComment.disabled = true;
    
    const { data, error } = await CelloAPI.comments.add(AppState.currentCellophane.id, text);
    
    DOM.btnSendComment.disabled = false;
    DOM.commentText.value = '';
    
    if (error) {
        showToast('שגיאה בשליחת תגובה', 'error');
        return;
    }
    
    // Add comment to list
    const commentHtml = `
        <div class="comment-item">
            <img src="${AppState.user?.user_metadata?.avatar_url || 'https://via.placeholder.com/32'}" alt="" class="comment-avatar">
            <div class="comment-body">
                <div class="comment-author">${escapeHtml(data.author)}</div>
                <div class="comment-text">${escapeHtml(data.text)}</div>
                <div class="comment-time">עכשיו</div>
            </div>
        </div>
    `;
    
    const noComments = DOM.commentsList.querySelector('p');
    if (noComments) noComments.remove();
    
    DOM.commentsList.insertAdjacentHTML('beforeend', commentHtml);
    showToast('תגובה נוספה! 💬', 'success');
}

// ===========================================
// PROFILE MODAL
// ===========================================

async function openProfileModal() {
    // Load stats
    const { data: followers } = await CelloAPI.follows.getFollowers();
    const { data: following } = await CelloAPI.follows.getFollowing();
    
    DOM.statFollowers.textContent = followers?.length || 0;
    DOM.statFollowing.textContent = following?.length || 0;
    
    DOM.modalProfile.classList.add('active');
}

// ===========================================
// MODAL MANAGEMENT
// ===========================================

function closeAllModals() {
    DOM.modalDetail.classList.remove('active');
    DOM.modalProfile.classList.remove('active');
    AppState.currentCellophane = null;
}

// ===========================================
// INFINITE SCROLL
// ===========================================

function handleScroll(e) {
    const container = e.target;
    const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    
    if (scrollBottom < 200) {
        if (AppState.currentTab === 'my-feed') {
            loadMyFeed();
        } else {
            loadFollowingFeed();
        }
    }
}

// ===========================================
// TOAST NOTIFICATIONS
// ===========================================

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    DOM.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'עכשיו';
    if (minutes < 60) return `לפני ${minutes} דקות`;
    if (hours < 24) return `לפני ${hours} שעות`;
    if (days < 7) return `לפני ${days} ימים`;
    
    return date.toLocaleDateString('he-IL');
}

function getVisibilityLabel(visibility) {
    const labels = {
        public: '🌍 ציבורי',
        private: '🔒 פרטי',
        groups: '👥 קבוצה',
        influencer: '⭐ משפיען'
    };
    return labels[visibility] || labels.public;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===========================================
// SERVICE WORKER REGISTRATION
// ===========================================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('sw.js');
            console.log('✅ Service Worker registered:', registration.scope);
        } catch (error) {
            console.log('❌ Service Worker registration failed:', error);
        }
    });
}

// ===========================================
// START APP
// ===========================================

document.addEventListener('DOMContentLoaded', initApp);
