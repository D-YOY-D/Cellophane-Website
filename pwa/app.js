/**
 * Cellophane PWA - Main Application
 * Version: 1.2.0
 * Figma design with colorful cards and SVG icons
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
    screenLogin: document.getElementById('screen-login'),
    screenMain: document.getElementById('screen-main'),
    btnGoogleLogin: document.getElementById('btn-google-login'),
    btnProfile: document.getElementById('btn-profile'),
    userAvatar: document.getElementById('user-avatar'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    feedMy: document.getElementById('feed-my'),
    feedFollowing: document.getElementById('feed-following'),
    myFeedList: document.getElementById('my-feed-list'),
    myFeedCount: document.getElementById('my-feed-count'),
    myFeedEmpty: document.getElementById('my-feed-empty'),
    myFeedLoading: document.getElementById('my-feed-loading'),
    followingFeedList: document.getElementById('following-feed-list'),
    followingFeedCount: document.getElementById('following-feed-count'),
    followingFeedEmpty: document.getElementById('following-feed-empty'),
    followingFeedLoading: document.getElementById('following-feed-loading'),
    modalDetail: document.getElementById('modal-detail'),
    modalProfile: document.getElementById('modal-profile'),
    detailCellophane: document.getElementById('detail-cellophane'),
    commentsList: document.getElementById('comments-list'),
    commentText: document.getElementById('comment-text'),
    btnSendComment: document.getElementById('btn-send-comment'),
    profileAvatar: document.getElementById('profile-avatar'),
    profileName: document.getElementById('profile-name'),
    profileEmail: document.getElementById('profile-email'),
    statCellophanes: document.getElementById('stat-cellophanes'),
    statFollowers: document.getElementById('stat-followers'),
    statFollowing: document.getElementById('stat-following'),
    btnLogout: document.getElementById('btn-logout'),
    toastContainer: document.getElementById('toast-container')
};

// ===========================================
// SVG ICONS
// ===========================================

const Icons = {
    globe: '<svg><use href="#icon-globe"/></svg>',
    lock: '<svg><use href="#icon-lock"/></svg>',
    users: '<svg><use href="#icon-users"/></svg>',
    star: '<svg><use href="#icon-star"/></svg>',
    thumbsup: '<svg><use href="#icon-thumbsup"/></svg>',
    message: '<svg><use href="#icon-message"/></svg>',
    share: '<svg><use href="#icon-share"/></svg>',
    link: '<svg><use href="#icon-link"/></svg>',
    heart: '<svg><use href="#icon-heart"/></svg>'
};

// ===========================================
// VISIBILITY CONFIGURATION
// ===========================================

const VisibilityConfig = {
    public: {
        label: 'PUBLIC',
        icon: 'globe'
    },
    private: {
        label: 'PRIVATE',
        icon: 'lock'
    },
    groups: {
        label: 'GROUP',
        icon: 'users'
    },
    influencer: {
        label: 'INFLUENCER',
        icon: 'star'
    }
};

// ===========================================
// INITIALIZATION
// ===========================================

async function initApp() {
    console.log('🎬 Initializing Cellophane PWA v1.2...');
    
    setupEventListeners();
    
    const { data: { session } } = await CelloAPI.auth.getSession();
    
    if (session) {
        console.log('✅ Found existing session');
        await handleAuthSuccess(session);
    } else {
        console.log('👤 No session, showing login');
        showScreen('login');
    }
    
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
    DOM.btnGoogleLogin.addEventListener('click', handleGoogleLogin);
    
    DOM.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => handleTabChange(btn.dataset.tab));
    });
    
    DOM.btnProfile.addEventListener('click', openProfileModal);
    DOM.btnLogout.addEventListener('click', handleLogout);
    
    document.querySelectorAll('.modal .btn-close, .modal .btn-back').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', closeAllModals);
    });
    
    DOM.btnSendComment.addEventListener('click', handleSendComment);
    DOM.commentText.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSendComment();
    });
    
    document.querySelector('.feed-container').addEventListener('scroll', handleScroll);
}

// ===========================================
// AUTH HANDLERS
// ===========================================

async function handleGoogleLogin() {
    console.log('🔐 Starting Google login...');
    DOM.btnGoogleLogin.disabled = true;
    DOM.btnGoogleLogin.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:2px;"></span> Signing in...';
    
    const { data, error } = await CelloAPI.auth.signInWithGoogle();
    
    if (error) {
        console.error('❌ Login error:', error);
        showToast('Sign in failed. Please try again.', 'error');
        DOM.btnGoogleLogin.disabled = false;
        DOM.btnGoogleLogin.innerHTML = '<svg class="google-icon" viewBox="0 0 24 24" width="24" height="24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg><span>Sign in with Google</span>';
    }
}

async function handleAuthSuccess(session) {
    AppState.session = session;
    
    const { data: { user } } = await CelloAPI.auth.getUser();
    AppState.user = user;
    
    console.log('👤 User:', user.email);
    console.log('👤 User metadata:', user.user_metadata);
    
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';
    const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
    
    if (avatarUrl) {
        DOM.userAvatar.src = avatarUrl;
        DOM.profileAvatar.src = avatarUrl;
    } else {
        // Create avatar with initials
        const initials = getInitials(displayName);
        DOM.userAvatar.style.display = 'none';
        DOM.profileAvatar.style.display = 'none';
    }
    
    DOM.profileName.textContent = displayName;
    DOM.profileEmail.textContent = user.email;
    
    showScreen('main');
    await loadMyFeed(true);
    
    showToast(`Welcome, ${displayName}! 👋`, 'success');
}

function handleAuthLogout() {
    AppState.user = null;
    AppState.session = null;
    AppState.feeds = {
        my: { data: [], page: 0, hasMore: true, loading: false },
        following: { data: [], page: 0, hasMore: true, loading: false }
    };
    
    showScreen('login');
    showToast('Signed out successfully', 'success');
}

async function handleLogout() {
    closeAllModals();
    const { error } = await CelloAPI.auth.signOut();
    
    if (error) {
        showToast('Sign out failed', 'error');
    }
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
    
    DOM.tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    DOM.feedMy.classList.toggle('active', tab === 'my-feed');
    DOM.feedFollowing.classList.toggle('active', tab === 'following');
    
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
        showToast('Failed to load cellophanes', 'error');
        return;
    }
    
    if (data.length < 20) {
        feed.hasMore = false;
    }
    
    feed.data = [...feed.data, ...data];
    feed.page++;
    
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
        showToast('Failed to load feed', 'error');
        return;
    }
    
    if (data.length < 20) {
        feed.hasMore = false;
    }
    
    feed.data = [...feed.data, ...data];
    feed.page++;
    
    DOM.followingFeedCount.textContent = feed.data.length;
    
    if (feed.data.length === 0) {
        DOM.followingFeedEmpty.classList.remove('hidden');
    } else {
        renderCellophanes(data, DOM.followingFeedList);
    }
}

// ===========================================
// CELLOPHANE RENDERING - FIGMA DESIGN
// ===========================================

function renderCellophanes(cellophanes, container) {
    cellophanes.forEach(cellophane => {
        const card = createCellophaneCard(cellophane);
        container.appendChild(card);
    });
}

function createCellophaneCard(cellophane) {
    const card = document.createElement('div');
    const visibility = cellophane.visibility || 'public';
    card.className = `cellophane-card ${visibility}`;
    card.dataset.id = cellophane.id;
    
    const authorName = cellophane.author || 'Anonymous';
    const authorAvatar = cellophane.authorAvatar || '';
    const timestamp = formatTimestamp(cellophane.created_at);
    const visibilityConfig = VisibilityConfig[visibility] || VisibilityConfig.public;
    const sourceUrl = cellophane.url || '';
    const sourceDomain = sourceUrl ? extractDomain(sourceUrl) : '';
    const initials = getInitials(authorName);
    
    // Avatar HTML - image or fallback with initials
    const avatarHtml = authorAvatar 
        ? `<img src="${authorAvatar}" alt="${authorName}" class="cellophane-author-avatar" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
           <div class="avatar-fallback" style="display:none;">${initials}</div>`
        : `<div class="avatar-fallback">${initials}</div>`;
    
    card.innerHTML = `
        <div class="cellophane-gradient-strip"></div>
        <div class="cellophane-card-inner">
            <div class="cellophane-header">
                <div class="cellophane-user">
                    ${avatarHtml}
                    <div class="cellophane-author-info">
                        <div class="cellophane-author-name">${escapeHtml(authorName)}</div>
                        <div class="cellophane-time">${timestamp}</div>
                    </div>
                </div>
                <span class="visibility-badge ${visibility}">
                    ${Icons[visibilityConfig.icon]}
                    ${visibilityConfig.label}
                </span>
            </div>
            
            <div class="cellophane-content">${escapeHtml(cellophane.text || '')}</div>
            
            ${sourceUrl ? `
                <a href="${sourceUrl}" target="_blank" class="cellophane-source">
                    ${Icons.link}
                    <span class="cellophane-source-url">${sourceDomain}</span>
                </a>
            ` : ''}
            
            <div class="cellophane-actions">
                <button class="action-btn btn-like" data-id="${cellophane.id}">
                    ${Icons.thumbsup}
                    <span class="like-count">0</span>
                </button>
                <button class="action-btn btn-comment" data-id="${cellophane.id}">
                    ${Icons.message}
                    <span class="comment-count">${cellophane.comments_count || 0}</span>
                </button>
                <button class="action-btn btn-share" data-id="${cellophane.id}">
                    ${Icons.share}
                </button>
            </div>
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
        showToast('Failed to add like', 'error');
        return;
    }
    
    const btn = document.querySelector(`.btn-like[data-id="${cellophaneId}"]`);
    if (btn) {
        btn.classList.toggle('liked', data.action === 'added');
    }
    
    showToast(data.action === 'added' ? '❤️ Liked!' : 'Like removed', 'success');
}

async function handleShare(cellophane) {
    const shareUrl = `${window.location.origin}/c/${cellophane.id}`;
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Cellophane',
                text: cellophane.text?.substring(0, 100) || 'Check out this cellophane',
                url: shareUrl
            });
        } catch (err) {
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
        showToast('Link copied! 📋', 'success');
    }).catch(() => {
        showToast('Failed to copy', 'error');
    });
}

// ===========================================
// CELLOPHANE DETAIL MODAL
// ===========================================

async function openCellophaneDetail(cellophane) {
    AppState.currentCellophane = cellophane;
    
    const authorName = cellophane.author || 'Anonymous';
    const authorAvatar = cellophane.authorAvatar || '';
    const timestamp = formatTimestamp(cellophane.created_at);
    const initials = getInitials(authorName);
    
    const avatarHtml = authorAvatar 
        ? `<img src="${authorAvatar}" alt="${authorName}" class="cellophane-author-avatar" style="width:48px;height:48px;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
           <div class="avatar-fallback" style="display:none;width:48px;height:48px;">${initials}</div>`
        : `<div class="avatar-fallback" style="width:48px;height:48px;">${initials}</div>`;
    
    DOM.detailCellophane.innerHTML = `
        <div class="cellophane-header" style="margin-bottom:16px;">
            <div class="cellophane-user">
                ${avatarHtml}
                <div class="cellophane-author-info">
                    <div class="cellophane-author-name">${escapeHtml(authorName)}</div>
                    <div class="cellophane-time">${timestamp}</div>
                </div>
            </div>
        </div>
        <div class="cellophane-content" style="font-size:1.1rem;margin:16px 0;">${escapeHtml(cellophane.text || '')}</div>
        ${cellophane.url ? `
            <a href="${cellophane.url}" target="_blank" class="cellophane-source">
                ${Icons.link}
                <span>View Source</span>
            </a>
        ` : ''}
    `;
    
    DOM.commentsList.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    DOM.modalDetail.classList.add('active');
    
    const { data: comments, error } = await CelloAPI.comments.getForCellophane(cellophane.id);
    
    if (error) {
        DOM.commentsList.innerHTML = '<p class="text-center" style="color:var(--color-text-secondary);">Failed to load comments</p>';
        return;
    }
    
    if (comments.length === 0) {
        DOM.commentsList.innerHTML = '<p class="text-center" style="color:var(--color-text-secondary);">No comments yet</p>';
    } else {
        DOM.commentsList.innerHTML = comments.map(comment => {
            const commentInitials = getInitials(comment.author || 'A');
            return `
                <div class="comment-item">
                    <div class="avatar-fallback" style="width:32px;height:32px;font-size:0.8rem;background:var(--color-primary-gradient);">${commentInitials}</div>
                    <div class="comment-body">
                        <div class="comment-author">${escapeHtml(comment.author || 'Anonymous')}</div>
                        <div class="comment-text">${escapeHtml(comment.text)}</div>
                        <div class="comment-time">${formatTimestamp(comment.created_at)}</div>
                    </div>
                </div>
            `;
        }).join('');
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
        showToast('Failed to send comment', 'error');
        return;
    }
    
    const userAvatar = AppState.user?.user_metadata?.avatar_url || '';
    const initials = getInitials(data.author);
    
    const commentHtml = `
        <div class="comment-item">
            <div class="avatar-fallback" style="width:32px;height:32px;font-size:0.8rem;background:var(--header-gradient);">${initials}</div>
            <div class="comment-body">
                <div class="comment-author">${escapeHtml(data.author)}</div>
                <div class="comment-text">${escapeHtml(data.text)}</div>
                <div class="comment-time">Just now</div>
            </div>
        </div>
    `;
    
    const noComments = DOM.commentsList.querySelector('p');
    if (noComments) noComments.remove();
    
    DOM.commentsList.insertAdjacentHTML('beforeend', commentHtml);
    showToast('Comment added! 💬', 'success');
}

// ===========================================
// PROFILE MODAL
// ===========================================

async function openProfileModal() {
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
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function extractDomain(url) {
    try {
        return new URL(url).hostname;
    } catch {
        return url;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===========================================
// SERVICE WORKER
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
