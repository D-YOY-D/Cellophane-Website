/**
 * Cellophane PWA - Main Application
 * Version: 1.8.6
 * 
 * CHANGELOG:
 * v1.8.6 - "More from this site" in detail modal, Browse by URL API
 * v1.8.5 - Hide/Dismiss cellophane, Deep Link /c/{id}, security fixes
 * v1.8.4 - Like + Dislike buttons, comment avatars + latest author names
 * v1.8.1 - Fixed avatar display (fetch from DB, ensure visible in profile modal)
 * v1.8.0 - Profile page with Tabs (My/Liked), Follow/Unfollow, event delegation
 * v1.6.2 - URL canonicalization (no www injection, strip fragments, remove default ports)
 * v1.6.1 - Fixed URL normalization - preserve path case (only hostname lowercase)
 * v1.6.0 - Security fixes (XSS via escapeHtml, URL sanitization)
 * v1.5.1 - Fixed comments - match Extension columns (text, author, author_id, etc.)
 * v1.4.0 - Media upload support (image/video/audio), Create cellophane
 * v1.3.0 - Media display support
 * v1.2.0 - Fixed create cellophane with UUID + timestamp
 * v1.1.0 - Added avatar support via public_user_profiles join
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
    currentCellophane: null,
    // v1.8.5: Deep link support
    pendingDeepLink: null,  // Cellophane ID to open after login
    openedFromDeepLink: false,  // Track if detail was opened via deep link
    // v1.8.2: Comments state
    comments: {
        data: [],
        replyingTo: null  // comment ID being replied to
    },
    // v1.8.0: Profile modal state
    profile: {
        userId: null,
        isSelf: false,
        isFollowing: false,
        currentTab: 'my',
        tabs: {
            my: { data: [], page: 0, hasMore: true, loading: false },
            liked: { data: [], page: 0, hasMore: true, loading: false }
        }
    },
    // Media upload state
    pendingMedia: {
        file: null,
        type: null,
        url: null,
        base64: null
    },
    audioRecording: {
        mediaRecorder: null,
        chunks: [],
        startTime: null,
        timerInterval: null
    }
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
    modalCreate: document.getElementById('modal-create'),
    detailCellophane: document.getElementById('detail-cellophane'),
    commentsList: document.getElementById('comments-list'),
    // v1.8.6: More from this site
    moreFromSite: document.getElementById('more-from-site'),
    moreFromSiteList: document.getElementById('more-from-site-list'),
    commentText: document.getElementById('comment-text'),
    btnSendComment: document.getElementById('btn-send-comment'),
    profileAvatar: document.getElementById('profile-avatar'),
    profileName: document.getElementById('profile-name'),
    profileEmail: document.getElementById('profile-email'),
    statCellophanes: document.getElementById('stat-cellophanes'),
    statFollowers: document.getElementById('stat-followers'),
    statFollowing: document.getElementById('stat-following'),
    btnLogout: document.getElementById('btn-logout'),
    toastContainer: document.getElementById('toast-container'),
    // Create form elements
    btnCreateFab: document.getElementById('btn-create-fab'),
    btnAddToPage: document.getElementById('btn-add-to-page'),
    formCreate: document.getElementById('form-create'),
    createText: document.getElementById('create-text'),
    createUrl: document.getElementById('create-url'),
    charCount: document.getElementById('char-count'),
    btnCreateSubmit: document.getElementById('btn-create-submit'),
    // Media upload elements
    btnAddImage: document.getElementById('btn-add-image'),
    btnAddVideo: document.getElementById('btn-add-video'),
    btnAddAudio: document.getElementById('btn-add-audio'),
    inputImage: document.getElementById('input-image'),
    inputVideo: document.getElementById('input-video'),
    mediaPreview: document.getElementById('media-preview'),
    mediaPreviewContent: document.getElementById('media-preview-content'),
    btnRemoveMedia: document.getElementById('btn-remove-media'),
    audioRecorder: document.getElementById('audio-recorder'),
    recordingTime: document.getElementById('recording-time'),
    btnStopRecording: document.getElementById('btn-stop-recording'),
    // v1.8.0: Profile modal elements
    profileModalTitle: document.getElementById('profile-modal-title'),
    profileHeaderLoading: document.getElementById('profile-header-loading'),
    profileHeaderContent: document.getElementById('profile-header-content'),
    profileBio: document.getElementById('profile-bio'),
    btnFollow: document.getElementById('btn-follow'),
    profileTabs: document.querySelectorAll('.profile-tab'),
    profileTabContent: document.getElementById('profile-tab-content'),
    profileContentLoading: document.getElementById('profile-content-loading'),
    profileContentEmpty: document.getElementById('profile-content-empty'),
    profileContentError: document.getElementById('profile-content-error'),
    profileEmptyText: document.getElementById('profile-empty-text'),
    profileCellophanesList: document.getElementById('profile-cellophanes-list'),
    btnProfileLoadMore: document.getElementById('btn-profile-load-more'),
    btnProfileRetry: document.getElementById('btn-profile-retry'),
    profileActionsSelf: document.getElementById('profile-actions-self')
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
    thumbsdown: '<svg><use href="#icon-thumbsdown"/></svg>',
    message: '<svg><use href="#icon-message"/></svg>',
    share: '<svg><use href="#icon-share"/></svg>',
    link: '<svg><use href="#icon-link"/></svg>',
    heart: '<svg><use href="#icon-heart"/></svg>',
    x: '<svg><use href="#icon-x"/></svg>'
};

// ===========================================
// VISIBILITY CONFIGURATION
// ===========================================

const VisibilityConfig = {
    public: { label: 'PUBLIC', icon: 'globe' },
    private: { label: 'PRIVATE', icon: 'lock' },
    groups: { label: 'GROUP', icon: 'users' },
    influencer: { label: 'INFLUENCER', icon: 'star' }
};

// ===========================================
// HIDDEN CELLOPHANES (localStorage) - v1.8.5
// ===========================================

const HIDDEN_STORAGE_PREFIX = 'cellophane_hidden_ids';
const HIDDEN_MAX_COUNT = 500; // Cap to prevent localStorage bloat

function getHiddenStorageKey() {
    // Per-user storage key
    const userId = AppState.user?.id || 'guest';
    return `${HIDDEN_STORAGE_PREFIX}:${userId}`;
}

function getHiddenCellophanes() {
    try {
        const stored = localStorage.getItem(getHiddenStorageKey());
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.warn('⚠️ Could not read hidden cellophanes:', e);
        return [];
    }
}

function hideCellophane(id) {
    const hidden = getHiddenCellophanes();
    if (!hidden.includes(id)) {
        hidden.push(id);
        // Cap the list to prevent localStorage bloat
        if (hidden.length > HIDDEN_MAX_COUNT) {
            hidden.shift(); // Remove oldest
        }
        localStorage.setItem(getHiddenStorageKey(), JSON.stringify(hidden));
    }
}

function unhideCellophane(id) {
    const hidden = getHiddenCellophanes();
    const filtered = hidden.filter(h => h !== id);
    localStorage.setItem(getHiddenStorageKey(), JSON.stringify(filtered));
}

function filterHiddenCellophanes(cellophanes) {
    const hidden = getHiddenCellophanes();
    if (hidden.length === 0) return cellophanes;
    return cellophanes.filter(c => !hidden.includes(c.id));
}

// ===========================================
// INITIALIZATION
// ===========================================

async function initApp() {
    console.log('🎬 Initializing Cellophane PWA v1.8.6...');
    
    setupEventListeners();
    
    // v1.8.5: Check for deep link (/c/{id})
    checkForDeepLink();
    
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
// DEEP LINK HANDLING - v1.8.5
// ===========================================

/**
 * Check URL for deep link pattern /c/{id} or /c/{id}/
 */
function checkForDeepLink() {
    const path = window.location.pathname;
    // Handle: /c/{id}, /c/{id}/, /pwa/c/{id}, /pwa/c/{id}/
    const match = path.match(/^\/(?:pwa\/)?c\/([a-zA-Z0-9_-]+)\/?$/);
    
    if (match) {
        const cellophaneId = decodeURIComponent(match[1]);
        console.log('🔗 Deep link detected:', cellophaneId);
        AppState.pendingDeepLink = cellophaneId;
    }
}

/**
 * Handle pending deep link after auth
 */
async function handlePendingDeepLink() {
    if (!AppState.pendingDeepLink) return;
    
    const cellophaneId = AppState.pendingDeepLink;
    AppState.pendingDeepLink = null;
    
    console.log('🔗 Processing deep link:', cellophaneId);
    
    // Fetch the cellophane
    const { data, error } = await CelloAPI.cellophanes.getById(cellophaneId);
    
    if (error || !data) {
        console.error('❌ Deep link cellophane not found:', cellophaneId);
        showToast('Cellophane not found', 'error');
        // Clean URL and go to feed
        clearDeepLinkUrl();
        return;
    }
    
    // Mark that we opened from deep link (URL stays until modal closes)
    AppState.openedFromDeepLink = true;
    
    // Open the cellophane detail (URL stays as /c/{id})
    openCellophaneDetail(data);
}

/**
 * Clear deep link from URL without page reload
 * v1.8.5: Dynamic base path detection
 */
function clearDeepLinkUrl() {
    // Detect base path dynamically
    const path = window.location.pathname;
    let basePath = '/';
    
    if (path.startsWith('/pwa')) {
        basePath = '/pwa/';
    }
    
    window.history.replaceState({}, '', window.location.origin + basePath);
    AppState.openedFromDeepLink = false;
}

// ===========================================
// EVENT LISTENERS
// ===========================================

function setupEventListeners() {
    DOM.btnGoogleLogin.addEventListener('click', handleGoogleLogin);
    
    DOM.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => handleTabChange(btn.dataset.tab));
    });
    
    // v1.8.1: Use arrow function to not pass event as userId
    DOM.btnProfile.addEventListener('click', () => openProfileModal());
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
    
    // Create cellophane events
    if (DOM.btnCreateFab) {
        DOM.btnCreateFab.addEventListener('click', () => openCreateModal());
    }
    
    if (DOM.btnAddToPage) {
        DOM.btnAddToPage.addEventListener('click', handleAddToPage);
    }
    
    if (DOM.formCreate) {
        DOM.formCreate.addEventListener('submit', handleCreateSubmit);
    }
    
    if (DOM.createText) {
        DOM.createText.addEventListener('input', updateCharCounter);
    }
    
    // Visibility selection - change button color
    document.querySelectorAll('input[name="visibility"]').forEach(radio => {
        radio.addEventListener('change', updateSubmitButtonColor);
    });
    
    // Media upload events
    if (DOM.btnAddImage) {
        DOM.btnAddImage.addEventListener('click', () => DOM.inputImage.click());
    }
    if (DOM.btnAddVideo) {
        DOM.btnAddVideo.addEventListener('click', () => DOM.inputVideo.click());
    }
    if (DOM.btnAddAudio) {
        DOM.btnAddAudio.addEventListener('click', startAudioRecording);
    }
    if (DOM.inputImage) {
        DOM.inputImage.addEventListener('change', (e) => handleFileSelect(e, 'image'));
    }
    if (DOM.inputVideo) {
        DOM.inputVideo.addEventListener('change', (e) => handleFileSelect(e, 'video'));
    }
    if (DOM.btnRemoveMedia) {
        DOM.btnRemoveMedia.addEventListener('click', clearMediaPreview);
    }
    if (DOM.btnStopRecording) {
        DOM.btnStopRecording.addEventListener('click', stopAudioRecording);
    }
    
    // =============================================
    // DELEGATED MEDIA EVENT HANDLERS (Security: no inline JS)
    // =============================================
    
    // Fullscreen image click (delegated)
    document.addEventListener('click', (e) => {
        const mediaEl = e.target.closest('.media-clickable');
        if (mediaEl) {
            e.stopPropagation();
            const url = mediaEl.dataset.fullscreenUrl;
            if (url) openImageFullscreen(url);
        }
    });
    
    // Stop propagation for video/audio controls
    document.addEventListener('click', (e) => {
        if (e.target.closest('.media-stop-propagation')) {
            e.stopPropagation();
        }
    });
    
    // Image error handling (delegated, no inline onerror)
    document.addEventListener('error', (e) => {
        if (e.target.tagName === 'IMG') {
            // Media images - hide container
            if (e.target.closest('.cellophane-media')) {
                e.target.closest('.cellophane-media').style.display = 'none';
            }
            // Avatar images - show fallback
            if (e.target.classList.contains('avatar-with-fallback')) {
                e.target.style.display = 'none';
                const fallback = e.target.nextElementSibling;
                if (fallback && fallback.classList.contains('avatar-fallback')) {
                    fallback.style.display = 'flex';
                }
            }
        }
    }, true); // Use capture phase
    
    // v1.8.0: Setup profile modal event listeners
    setupProfileEventListeners();
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
    
    // v1.8.1: Also fetch profile from DB to get avatar
    let dbAvatarUrl = null;
    try {
        const { data: profile } = await CelloAPI.profile.getById(user.id);
        if (profile?.avatar_url) {
            dbAvatarUrl = profile.avatar_url;
            console.log('📷 Got avatar from DB:', dbAvatarUrl);
        }
    } catch (e) {
        console.warn('⚠️ Could not fetch profile for avatar');
    }
    
    // Prefer DB avatar, then OAuth metadata
    const avatarUrl = dbAvatarUrl || user.user_metadata?.avatar_url || user.user_metadata?.picture || '';
    const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
    const initials = displayName.charAt(0).toUpperCase();
    
    // Update header avatar with fallback
    const avatarFallback = document.getElementById('user-avatar-fallback');
    if (avatarUrl) {
        DOM.userAvatar.src = avatarUrl;
        DOM.userAvatar.style.display = 'block';
        if (avatarFallback) avatarFallback.style.display = 'none';
    } else {
        DOM.userAvatar.style.display = 'none';
        if (avatarFallback) {
            avatarFallback.textContent = initials;
            avatarFallback.style.display = 'flex';
        }
    }
    
    DOM.profileName.textContent = displayName;
    DOM.profileEmail.textContent = user.email;
    
    showScreen('main');
    await loadMyFeed(true);
    
    // v1.8.5: Handle pending deep link after auth
    await handlePendingDeepLink();
    
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
    
    console.log('📦 Loaded cellophanes:', data);
    
    // Debug: Check if avatar fields exist
    if (data.length > 0) {
        console.log('🔍 First cellophane fields:', Object.keys(data[0]));
        console.log('🖼️ Avatar fields:', {
            authorAvatar: data[0].authorAvatar,
            author_avatar: data[0].author_avatar
        });
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
// CELLOPHANE RENDERING WITH MEDIA SUPPORT
// ===========================================

function renderCellophanes(cellophanes, container) {
    // v1.8.5: Filter out hidden cellophanes
    const visibleCellophanes = filterHiddenCellophanes(cellophanes);
    
    visibleCellophanes.forEach(cellophane => {
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
    // Support both camelCase (authorAvatar) and snake_case (author_avatar) from DB
    // Sanitize avatar URL for security
    const rawAvatar = cellophane.authorAvatar || cellophane.author_avatar || '';
    const authorAvatar = rawAvatar ? sanitizeUrl(rawAvatar) : '';
    const timestamp = formatTimestamp(cellophane.created_at);
    const visibilityConfig = VisibilityConfig[visibility] || VisibilityConfig.public;
    // v1.8.5: Sanitize source URL for security
    const sourceUrl = sanitizeUrl(cellophane.url);
    const sourceDomain = sourceUrl ? extractDomain(sourceUrl) : '';
    const initials = getInitials(authorName);
    // v1.8.0: Author ID for profile click
    const authorId = cellophane.author_id || '';
    
    // Media HTML - IMPORTANT!
    const mediaHtml = renderMedia(cellophane);
    
    // Avatar HTML - sanitized URL, delegated error handling (no inline onerror)
    // v1.8.0: Added data-author-id for profile click delegation
    const avatarHtml = authorAvatar 
        ? `<img src="${escapeHtml(authorAvatar)}" alt="${escapeHtml(authorName)}" class="cellophane-author-avatar avatar-with-fallback" data-author-id="${escapeHtml(authorId)}">
           <div class="avatar-fallback" style="display:none;" data-author-id="${escapeHtml(authorId)}">${initials}</div>`
        : `<div class="avatar-fallback" data-author-id="${escapeHtml(authorId)}">${initials}</div>`;
    
    card.innerHTML = `
        <div class="cellophane-gradient-strip"></div>
        <div class="cellophane-card-inner">
            <div class="cellophane-header">
                <div class="cellophane-user" data-author-id="${escapeHtml(authorId)}">
                    ${avatarHtml}
                    <div class="cellophane-author-info">
                        <div class="cellophane-author-name" data-author-id="${escapeHtml(authorId)}">${escapeHtml(authorName)}</div>
                        <div class="cellophane-time">${timestamp}</div>
                    </div>
                </div>
                <div class="cellophane-header-actions">
                    <span class="visibility-badge ${visibility}">
                        ${Icons[visibilityConfig.icon]}
                        ${visibilityConfig.label}
                    </span>
                    <button class="btn-dismiss" data-id="${cellophane.id}" title="Hide this cellophane">
                        ${Icons.x}
                    </button>
                </div>
            </div>
            
            <div class="cellophane-content">${escapeHtml(cellophane.text || '')}</div>
            
            ${mediaHtml}
            
            ${sourceUrl ? `
                <a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer" class="cellophane-source">
                    ${Icons.link}
                    <span class="cellophane-source-url">${sourceDomain}</span>
                </a>
            ` : ''}
            
            <div class="cellophane-actions">
                <button class="action-btn btn-like" data-id="${cellophane.id}">
                    ${Icons.thumbsup}
                    <span class="like-count">${cellophane.likes_count || 0}</span>
                </button>
                <button class="action-btn btn-dislike" data-id="${cellophane.id}">
                    ${Icons.thumbsdown}
                    <span class="dislike-count">${cellophane.dislikes_count || 0}</span>
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
        handleReaction(cellophane.id, '👍', 'like');
    });
    
    card.querySelector('.btn-dislike').addEventListener('click', (e) => {
        e.stopPropagation();
        handleReaction(cellophane.id, '👎', 'dislike');
    });
    
    card.querySelector('.btn-comment').addEventListener('click', (e) => {
        e.stopPropagation();
        openCellophaneDetail(cellophane);
    });
    
    card.querySelector('.btn-share').addEventListener('click', (e) => {
        e.stopPropagation();
        handleShare(cellophane);
    });
    
    // v1.8.5: Dismiss/hide button
    card.querySelector('.btn-dismiss').addEventListener('click', (e) => {
        e.stopPropagation();
        handleDismiss(cellophane.id, card);
    });
    
    card.addEventListener('click', () => openCellophaneDetail(cellophane));
    
    return card;
}

// ===========================================
// URL SANITIZATION (Security)
// ===========================================

function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return null;
    
    const trimmed = url.trim();
    
    // Only allow http and https protocols
    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return trimmed;
        }
    } catch (e) {
        // Invalid URL
    }
    
    return null;
}

// ===========================================
// MEDIA RENDERING (IMAGE/VIDEO/AUDIO)
// ===========================================

function renderMedia(cellophane) {
    const mediaUrl = sanitizeUrl(cellophane.media_url);
    const mediaType = cellophane.media_type;
    
    if (!mediaUrl) return '';
    
    console.log('🖼️ Media:', mediaType, mediaUrl);
    
    // IMAGE - use data attribute instead of inline onclick
    if (mediaType === 'image' || isImageUrl(mediaUrl)) {
        return `
            <div class="cellophane-media media-clickable" data-fullscreen-url="${escapeHtml(mediaUrl)}">
                <img src="${escapeHtml(mediaUrl)}" alt="Media" class="media-image" loading="lazy">
            </div>
        `;
    }
    
    // VIDEO
    if (mediaType === 'video' || isVideoUrl(mediaUrl)) {
        return `
            <div class="cellophane-media media-stop-propagation">
                <video src="${escapeHtml(mediaUrl)}" class="media-video" controls preload="metadata" playsinline>
                    Your browser does not support video playback.
                </video>
            </div>
        `;
    }
    
    // AUDIO
    if (mediaType === 'audio' || isAudioUrl(mediaUrl)) {
        return `
            <div class="cellophane-media cellophane-audio media-stop-propagation">
                <div class="audio-wrapper">
                    <div class="audio-icon">🎵</div>
                    <audio src="${escapeHtml(mediaUrl)}" class="media-audio" controls preload="metadata">
                        Your browser does not support audio playback.
                    </audio>
                </div>
            </div>
        `;
    }
    
    // Unknown - show as downloadable link
    const safeName = escapeHtml(cellophane.media_name || 'Download attachment');
    return `
        <div class="cellophane-media media-stop-propagation">
            <a href="${escapeHtml(mediaUrl)}" target="_blank" rel="noopener noreferrer" class="media-download">
                📎 ${safeName}
            </a>
        </div>
    `;
}

function isImageUrl(url) {
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url);
}

function isVideoUrl(url) {
    return /\.(mp4|webm|ogg|mov|avi|m4v)(\?.*)?$/i.test(url);
}

function isAudioUrl(url) {
    return /\.(mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/i.test(url);
}

// Open image in fullscreen - no inline handlers
function openImageFullscreen(url) {
    const safeUrl = sanitizeUrl(url);
    if (!safeUrl) return;
    
    const modal = document.createElement('div');
    modal.className = 'image-fullscreen-modal';
    
    const backdrop = document.createElement('div');
    backdrop.className = 'image-fullscreen-backdrop';
    backdrop.addEventListener('click', () => modal.remove());
    
    const img = document.createElement('img');
    img.className = 'image-fullscreen-img';
    img.src = safeUrl;
    img.addEventListener('click', (e) => e.stopPropagation());
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'image-fullscreen-close';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => modal.remove());
    
    modal.appendChild(backdrop);
    modal.appendChild(img);
    modal.appendChild(closeBtn);
    document.body.appendChild(modal);
}

// Make global
window.openImageFullscreen = openImageFullscreen;

// ===========================================
// CELLOPHANE ACTIONS
// ===========================================

/**
 * Handle like or dislike reaction
 * v1.8.4: Unified reaction handler for 👍 and 👎
 */
async function handleReaction(cellophaneId, emoji, type) {
    console.log(`${emoji} Toggling ${type} for:`, cellophaneId);
    
    const { data, error } = await CelloAPI.reactions.toggle(cellophaneId, emoji);
    
    if (error) {
        console.error(`❌ ${type} error:`, error);
        showToast(`Failed to ${type}`, 'error');
        return;
    }
    
    console.log(`${emoji} ${type} result:`, data);
    
    // Update button state
    const btnClass = type === 'like' ? '.btn-like' : '.btn-dislike';
    const countClass = type === 'like' ? '.like-count' : '.dislike-count';
    const btn = document.querySelector(`${btnClass}[data-id="${cellophaneId}"]`);
    
    if (btn) {
        const isActive = data.action === 'added';
        btn.classList.toggle('active', isActive);
        
        // Update count
        const countEl = btn.querySelector(countClass);
        if (countEl) {
            let count = parseInt(countEl.textContent) || 0;
            count = isActive ? count + 1 : Math.max(0, count - 1);
            countEl.textContent = count;
        }
    }
    
    const message = data.action === 'added' 
        ? (type === 'like' ? '👍 Liked!' : '👎 Disliked!')
        : `${type === 'like' ? 'Like' : 'Dislike'} removed`;
    showToast(message, 'success');
}

async function handleShare(cellophane) {
    // v1.8.5: Use /pwa/c/{id} for static hosting compatibility
    const shareUrl = `${window.location.origin}/pwa/c/${cellophane.id}`;
    
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

/**
 * Handle dismiss/hide cellophane
 * v1.8.5: Hides cellophane with undo option
 */
function handleDismiss(cellophaneId, cardElement) {
    // Animate out
    cardElement.style.transition = 'all 0.3s ease';
    cardElement.style.opacity = '0';
    cardElement.style.transform = 'translateX(-100%)';
    
    setTimeout(() => {
        // Remove from DOM
        cardElement.remove();
        
        // Save to localStorage
        hideCellophane(cellophaneId);
        
        // Show toast with undo
        showToastWithUndo('Cellophane hidden', () => {
            unhideCellophane(cellophaneId);
            // Reload current feed to show it again
            if (AppState.currentTab === 'my-feed') {
                loadMyFeed(true);
            } else {
                loadFollowingFeed(true);
            }
        });
    }, 300);
}

/**
 * Show toast with undo button
 */
function showToastWithUndo(message, undoCallback) {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast toast-with-undo';
    toast.innerHTML = `
        <span>${escapeHtml(message)}</span>
        <button class="btn-undo">Undo</button>
    `;
    
    // Use the toast container like showToast does
    DOM.toastContainer.appendChild(toast);
    
    // Undo handler
    const undoBtn = toast.querySelector('.btn-undo');
    undoBtn.addEventListener('click', () => {
        toast.remove();
        undoCallback();
    });
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'fadeIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// ===========================================
// CELLOPHANE DETAIL MODAL
// ===========================================

async function openCellophaneDetail(cellophane) {
    AppState.currentCellophane = cellophane;
    
    const authorName = cellophane.author || 'Anonymous';
    // Support both camelCase and snake_case from DB - sanitize URL
    const rawAvatar = cellophane.authorAvatar || cellophane.author_avatar || '';
    const authorAvatar = rawAvatar ? sanitizeUrl(rawAvatar) : '';
    const timestamp = formatTimestamp(cellophane.created_at);
    const initials = getInitials(authorName);
    const mediaHtml = renderMedia(cellophane);
    
    // Avatar HTML - sanitized URL, delegated error handling (no inline onerror)
    const avatarHtml = authorAvatar 
        ? `<img src="${escapeHtml(authorAvatar)}" alt="${escapeHtml(authorName)}" class="cellophane-author-avatar avatar-with-fallback" style="width:48px;height:48px;">
           <div class="avatar-fallback" style="display:none;width:48px;height:48px;font-size:1.2rem;">${initials}</div>`
        : `<div class="avatar-fallback" style="width:48px;height:48px;font-size:1.2rem;">${initials}</div>`;
    
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
        ${mediaHtml}
        ${cellophane.url && sanitizeUrl(cellophane.url) ? `
            <a href="${escapeHtml(sanitizeUrl(cellophane.url))}" target="_blank" rel="noopener noreferrer" class="cellophane-source" style="margin-top:12px;">
                ${Icons.link}
                <span>View Source</span>
            </a>
        ` : ''}
    `;
    
    // Show "Add to this page" button if cellophane has a real URL (not PWA default)
    const hasRealUrl = cellophane.url && 
                       !cellophane.url.includes('cellophane.ai/pwa') && 
                       cellophane.url !== '';
    
    if (DOM.btnAddToPage) {
        if (hasRealUrl) {
            DOM.btnAddToPage.classList.remove('hidden');
            DOM.btnAddToPage.dataset.url = cellophane.url;
        } else {
            DOM.btnAddToPage.classList.add('hidden');
        }
    }
    
    DOM.commentsList.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    DOM.modalDetail.classList.add('active');
    
    // v1.8.2: Reset comments state
    AppState.comments = { data: [], replyingTo: null };
    
    const { data: comments, error } = await CelloAPI.comments.getForCellophane(cellophane.id);
    
    if (error) {
        DOM.commentsList.innerHTML = '<p style="text-align:center;color:var(--color-text-secondary);">Failed to load comments</p>';
        return;
    }
    
    // Store comments in state
    AppState.comments.data = comments || [];
    
    // Render threaded comments
    renderComments();
    
    // v1.8.6: Load "More from this site" if cellophane has a real URL
    loadMoreFromSite(cellophane);
}

/**
 * Load and display "More from this site"
 * v1.8.6
 */
async function loadMoreFromSite(cellophane) {
    // Only show for cellophanes with real URLs (not PWA default)
    const hasRealUrl = cellophane.url && 
                       !cellophane.url.includes('cellophane.ai/pwa') && 
                       cellophane.url !== '';
    
    if (!hasRealUrl) {
        DOM.moreFromSite.classList.add('hidden');
        return;
    }
    
    // Show loading state
    DOM.moreFromSite.classList.remove('hidden');
    DOM.moreFromSiteList.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    
    // Fetch related cellophanes
    const { data: related, error } = await CelloAPI.cellophanes.getByUrl(cellophane.url, cellophane.id, 5);
    
    if (error || !related || related.length === 0) {
        DOM.moreFromSite.classList.add('hidden');
        return;
    }
    
    // Render related cellophanes
    renderMoreFromSite(related);
}

/**
 * Render "More from this site" cards
 * v1.8.6
 */
function renderMoreFromSite(cellophanes) {
    DOM.moreFromSiteList.innerHTML = cellophanes.map(c => {
        const authorName = c.author || 'Anonymous';
        const initials = getInitials(authorName);
        const rawAvatar = c.authorAvatar || c.author_avatar || '';
        const avatarUrl = rawAvatar ? sanitizeUrl(rawAvatar) : '';
        const timestamp = formatTimestamp(c.created_at);
        const text = (c.text || '').length > 100 ? c.text.substring(0, 100) + '...' : (c.text || '');
        
        const avatarHtml = avatarUrl 
            ? `<img src="${escapeHtml(avatarUrl)}" class="avatar-small avatar-with-fallback" alt="">
               <div class="avatar-fallback avatar-small" style="display:none;">${initials}</div>`
            : `<div class="avatar-fallback avatar-small">${initials}</div>`;
        
        return `
            <div class="related-cellophane-card" data-cellophane-id="${c.id}">
                <div class="related-cellophane-header">
                    ${avatarHtml}
                    <div class="related-cellophane-info">
                        <span class="related-author">${escapeHtml(authorName)}</span>
                        <span class="related-time">${timestamp}</span>
                    </div>
                </div>
                <div class="related-cellophane-text">${escapeHtml(text)}</div>
            </div>
        `;
    }).join('');
    
    // Add click handlers to open the cellophane
    DOM.moreFromSiteList.querySelectorAll('.related-cellophane-card').forEach(card => {
        card.addEventListener('click', async () => {
            const id = card.dataset.cellophaneId;
            const { data, error } = await CelloAPI.cellophanes.getById(id);
            if (data && !error) {
                openCellophaneDetail(data);
            }
        });
    });
}

/**
 * Render comments with threading support
 * v1.8.2
 */
function renderComments() {
    const comments = AppState.comments.data;
    
    if (comments.length === 0) {
        DOM.commentsList.innerHTML = '<p class="comments-empty">No comments yet. Be the first!</p>';
        updateReplyIndicator();
        return;
    }
    
    // Separate top-level comments from replies
    const topLevel = comments.filter(c => !c.parent_id);
    const replies = comments.filter(c => c.parent_id);
    
    // Build reply map for quick lookup
    const replyMap = {};
    replies.forEach(r => {
        if (!replyMap[r.parent_id]) replyMap[r.parent_id] = [];
        replyMap[r.parent_id].push(r);
    });
    
    // Render HTML
    let html = '';
    topLevel.forEach(comment => {
        html += renderCommentItem(comment, 0);
        // Render replies
        const commentReplies = replyMap[comment.id] || [];
        commentReplies.forEach(reply => {
            html += renderCommentItem(reply, 1);
        });
    });
    
    DOM.commentsList.innerHTML = html;
    
    // Attach event listeners
    attachCommentEventListeners();
    
    // Update reply indicator
    updateReplyIndicator();
}

/**
 * Render a single comment item
 * @param {Object} comment
 * @param {number} depth - 0 for top-level, 1 for reply
 */
function renderCommentItem(comment, depth = 0) {
    const initials = getInitials(comment.author || 'A');
    const isOwn = AppState.user && comment.author_id === AppState.user.id;
    const indentStyle = depth > 0 ? 'margin-left: 40px; border-left: 2px solid var(--color-border); padding-left: 12px;' : '';
    
    // v1.8.5: Use delegated error handler (no inline onerror)
    const avatarHtml = comment.author_avatar 
        ? `<img src="${escapeHtml(comment.author_avatar)}" class="comment-avatar avatar-with-fallback" alt="">
           <div class="avatar-fallback comment-avatar-fallback" style="display:none;">${initials}</div>`
        : `<div class="avatar-fallback comment-avatar-fallback">${initials}</div>`;
    
    return `
        <div class="comment-item" data-comment-id="${comment.id}" style="${indentStyle}">
            <div class="comment-avatar-wrapper">
                ${avatarHtml}
            </div>
            <div class="comment-body">
                <div class="comment-author">${escapeHtml(comment.author || 'Anonymous')}</div>
                <div class="comment-text">${escapeHtml(comment.text)}</div>
                <div class="comment-meta">
                    <span class="comment-time">${formatTimestamp(comment.created_at)}</span>
                    <div class="comment-actions">
                        ${depth === 0 ? `<button class="btn-comment-action btn-reply" data-comment-id="${comment.id}">Reply</button>` : ''}
                        ${isOwn ? `<button class="btn-comment-action btn-delete" data-comment-id="${comment.id}">Delete</button>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Attach event listeners to comment action buttons
 */
function attachCommentEventListeners() {
    // Reply buttons
    DOM.commentsList.querySelectorAll('.btn-reply').forEach(btn => {
        btn.addEventListener('click', () => {
            const commentId = btn.dataset.commentId;
            AppState.comments.replyingTo = commentId;
            updateReplyIndicator();
            DOM.commentText.focus();
        });
    });
    
    // Delete buttons
    DOM.commentsList.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const commentId = btn.dataset.commentId;
            if (confirm('Delete this comment?')) {
                await handleDeleteComment(commentId);
            }
        });
    });
}

/**
 * Update the reply indicator above the input
 */
function updateReplyIndicator() {
    let indicator = document.getElementById('reply-indicator');
    
    if (AppState.comments.replyingTo) {
        const replyingToComment = AppState.comments.data.find(c => c.id === AppState.comments.replyingTo);
        const replyingToName = replyingToComment?.author || 'someone';
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'reply-indicator';
            indicator.className = 'reply-indicator';
            DOM.commentText.parentElement.insertBefore(indicator, DOM.commentText);
        }
        
        // v1.8.5: No inline onclick - use delegation
        indicator.innerHTML = `
            <span>Replying to <strong>${escapeHtml(replyingToName)}</strong></span>
            <button class="btn-cancel-reply">✕</button>
        `;
        indicator.classList.remove('hidden');
        
        // Attach event listener directly (indicator is recreated each time)
        indicator.querySelector('.btn-cancel-reply').addEventListener('click', cancelReply);
    } else if (indicator) {
        indicator.classList.add('hidden');
    }
}

/**
 * Cancel reply mode
 */
function cancelReply() {
    AppState.comments.replyingTo = null;
    updateReplyIndicator();
}

/**
 * Delete a comment
 */
async function handleDeleteComment(commentId) {
    const { error } = await CelloAPI.comments.delete(commentId);
    
    if (error) {
        showToast('Failed to delete comment', 'error');
        return;
    }
    
    // Remove from state and re-render
    AppState.comments.data = AppState.comments.data.filter(c => c.id !== commentId);
    // Also remove any replies to this comment
    AppState.comments.data = AppState.comments.data.filter(c => c.parent_id !== commentId);
    
    renderComments();
    showToast('Comment deleted', 'success');
}

async function handleSendComment() {
    const text = DOM.commentText.value.trim();
    if (!text || !AppState.currentCellophane) return;
    
    DOM.btnSendComment.disabled = true;
    
    // v1.8.2: Pass parent_id for replies
    const parentId = AppState.comments.replyingTo || null;
    const { data, error } = await CelloAPI.comments.add(AppState.currentCellophane.id, text, parentId);
    
    DOM.btnSendComment.disabled = false;
    DOM.commentText.value = '';
    
    if (error) {
        showToast('Failed to send comment', 'error');
        return;
    }
    
    // v1.8.2: Add to state and re-render
    AppState.comments.data.push(data);
    AppState.comments.replyingTo = null;  // Reset reply mode
    
    renderComments();
    showToast(parentId ? 'Reply added! 💬' : 'Comment added! 💬', 'success');
}

// ===========================================
// PROFILE MODAL - v1.8.1
// ===========================================

/**
 * Open profile modal for a user
 * v1.8.1: Added defensive check for Event objects
 * @param {string} userId - User ID to view (optional, defaults to current user)
 */
async function openProfileModal(userId) {
    // v1.8.1: Defensive check - if passed an Event, treat as no userId
    if (!userId || typeof userId !== 'string' || userId instanceof Event) {
        userId = AppState.user?.id;
    }
    
    if (!userId) {
        console.warn('⚠️ openProfileModal: No user ID');
        return;
    }
    
    console.log('👤 Opening profile for:', userId);
    
    // Determine if viewing self
    const isSelf = AppState.user && AppState.user.id === userId;
    
    // Reset profile state
    AppState.profile = {
        userId,
        isSelf,
        isFollowing: false,
        currentTab: 'my',
        tabs: {
            my: { data: [], page: 0, hasMore: true, loading: false },
            liked: { data: [], page: 0, hasMore: true, loading: false }
        }
    };
    
    // Show modal with loading state
    DOM.modalProfile.classList.add('active');
    showProfileLoading(true);
    hideProfileContent();
    
    try {
        // Load profile data
        const [profileResult, followCountsResult] = await Promise.all([
            CelloAPI.profile.getById(userId),
            CelloAPI.follows.getFollowCounts(userId)
        ]);
        
        if (profileResult.error) {
            console.error('❌ Failed to load profile:', profileResult.error);
            showProfileError('Failed to load profile');
            return;
        }
        
        const profile = profileResult.data;
        
        // Check if current user is following this user (only if not self)
        if (!isSelf && AppState.user) {
            const { data: isFollowing } = await CelloAPI.follows.isFollowing(userId);
            AppState.profile.isFollowing = isFollowing;
        }
        
        // Update UI
        renderProfileHeader(profile, followCountsResult, isSelf);
        showProfileLoading(false);
        
        // Load initial tab (My)
        await loadProfileTab('my');
        
    } catch (error) {
        console.error('❌ Profile modal error:', error);
        showProfileError('Something went wrong');
    }
}

/**
 * Show/hide profile loading skeleton
 */
function showProfileLoading(show) {
    if (DOM.profileHeaderLoading) {
        DOM.profileHeaderLoading.classList.toggle('hidden', !show);
    }
    if (DOM.profileHeaderContent) {
        DOM.profileHeaderContent.classList.toggle('hidden', show);
    }
}

/**
 * Render profile header with user data
 */
function renderProfileHeader(profile, followCounts, isSelf) {
    if (!profile) return;
    
    // Avatar - always show (use fallback if no URL)
    const avatarUrl = profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.display_name || profile.username || 'User')}`;
    if (DOM.profileAvatar) {
        DOM.profileAvatar.src = avatarUrl;
        DOM.profileAvatar.style.display = 'block'; // v1.8.1: ensure visible
        DOM.profileAvatar.onerror = () => {
            DOM.profileAvatar.src = `https://api.dicebear.com/7.x/initials/svg?seed=User`;
        };
    }
    
    // Name
    const displayName = profile.display_name || profile.username || 'User';
    if (DOM.profileName) DOM.profileName.textContent = displayName;
    if (DOM.profileModalTitle) DOM.profileModalTitle.textContent = isSelf ? 'My Profile' : displayName;
    
    // Email (only for self, if element exists)
    if (DOM.profileEmail && isSelf && AppState.user?.email) {
        DOM.profileEmail.textContent = AppState.user.email;
        DOM.profileEmail.classList.remove('hidden');
    } else if (DOM.profileEmail) {
        DOM.profileEmail.classList.add('hidden');
    }
    
    // Bio
    if (DOM.profileBio) {
        DOM.profileBio.textContent = profile.bio || '';
        DOM.profileBio.classList.toggle('hidden', !profile.bio);
    }
    
    // Stats
    if (DOM.statCellophanes) DOM.statCellophanes.textContent = '-';
    if (DOM.statFollowers) DOM.statFollowers.textContent = followCounts.followers || 0;
    if (DOM.statFollowing) DOM.statFollowing.textContent = followCounts.following || 0;
    
    // Follow button (hide for self)
    if (DOM.btnFollow) {
        DOM.btnFollow.classList.toggle('hidden', isSelf);
        DOM.btnFollow.dataset.userId = profile.id;
        updateFollowButton(AppState.profile.isFollowing);
    }
    
    // Actions (show Sign Out only for self)
    if (DOM.profileActionsSelf) {
        DOM.profileActionsSelf.classList.toggle('hidden', !isSelf);
    }
}

/**
 * Update follow button state
 */
function updateFollowButton(isFollowing) {
    if (!DOM.btnFollow) return;
    
    if (isFollowing) {
        DOM.btnFollow.textContent = 'Following';
        DOM.btnFollow.classList.remove('btn-primary');
        DOM.btnFollow.classList.add('btn-outline');
    } else {
        DOM.btnFollow.textContent = 'Follow';
        DOM.btnFollow.classList.add('btn-primary');
        DOM.btnFollow.classList.remove('btn-outline');
    }
}

/**
 * Toggle follow/unfollow
 */
async function toggleFollow() {
    const userId = AppState.profile.userId;
    if (!userId || AppState.profile.isSelf) return;
    
    const wasFollowing = AppState.profile.isFollowing;
    
    // Optimistic update
    AppState.profile.isFollowing = !wasFollowing;
    updateFollowButton(!wasFollowing);
    
    // Update count optimistically
    const currentCount = parseInt(DOM.statFollowers?.textContent || '0');
    if (DOM.statFollowers) {
        DOM.statFollowers.textContent = wasFollowing ? currentCount - 1 : currentCount + 1;
    }
    
    try {
        let error;
        if (wasFollowing) {
            const result = await CelloAPI.follows.unfollow(userId);
            error = result.error;
        } else {
            const result = await CelloAPI.follows.follow(userId);
            error = result.error;
        }
        
        if (error) {
            console.error('❌ Follow toggle failed:', error);
            AppState.profile.isFollowing = wasFollowing;
            updateFollowButton(wasFollowing);
            if (DOM.statFollowers) DOM.statFollowers.textContent = currentCount;
            showToast('Failed to update follow status', 'error');
        } else {
            showToast(wasFollowing ? 'Unfollowed' : 'Following!', 'success');
        }
    } catch (error) {
        console.error('❌ Follow toggle error:', error);
        AppState.profile.isFollowing = wasFollowing;
        updateFollowButton(wasFollowing);
        if (DOM.statFollowers) DOM.statFollowers.textContent = currentCount;
    }
}

/**
 * Load profile tab content
 * @param {string} tabName - 'my' or 'liked'
 * @param {boolean} refresh - Force refresh
 */
async function loadProfileTab(tabName, refresh = false) {
    const tab = AppState.profile.tabs[tabName];
    if (!tab) return;
    
    if (tab.loading) return;
    
    if (refresh) {
        tab.data = [];
        tab.page = 0;
        tab.hasMore = true;
    }
    
    if (!tab.hasMore && !refresh) return;
    
    tab.loading = true;
    AppState.profile.currentTab = tabName;
    
    // Update tab UI
    DOM.profileTabs?.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Show loading
    showProfileContentLoading(true);
    hideProfileContentStates();
    
    try {
        let result;
        const userId = AppState.profile.userId;
        
        if (tabName === 'my') {
            result = await CelloAPI.cellophanes.getByAuthorId(userId, tab.page, 20);
        } else {
            result = await CelloAPI.cellophanes.getReactedByUser(userId, tab.page, 20);
        }
        
        if (result.error) {
            console.error(`❌ Failed to load ${tabName} tab:`, result.error);
            showProfileContentError();
            tab.loading = false;
            return;
        }
        
        const newData = result.data || [];
        tab.data = refresh ? newData : [...tab.data, ...newData];
        tab.hasMore = newData.length >= 20;
        tab.page++;
        
        // Update cellophanes count for "My" tab
        if (tabName === 'my' && DOM.statCellophanes) {
            DOM.statCellophanes.textContent = tab.data.length + (tab.hasMore ? '+' : '');
        }
        
        // Render
        showProfileContentLoading(false);
        renderProfileCellophanes(tab.data, tabName);
        
        // Show/hide load more button
        if (DOM.btnProfileLoadMore) {
            DOM.btnProfileLoadMore.classList.toggle('hidden', !tab.hasMore);
        }
        
    } catch (error) {
        console.error(`❌ Error loading ${tabName} tab:`, error);
        showProfileContentError();
    }
    
    tab.loading = false;
}

/**
 * Show/hide profile content loading spinner
 */
function showProfileContentLoading(show) {
    if (DOM.profileContentLoading) {
        DOM.profileContentLoading.classList.toggle('hidden', !show);
    }
}

/**
 * Hide all profile content states
 */
function hideProfileContentStates() {
    DOM.profileContentEmpty?.classList.add('hidden');
    DOM.profileContentError?.classList.add('hidden');
    DOM.profileCellophanesList?.classList.add('hidden');
    DOM.btnProfileLoadMore?.classList.add('hidden');
}

/**
 * Hide profile content
 */
function hideProfileContent() {
    hideProfileContentStates();
    showProfileContentLoading(true);
}

/**
 * Show profile error state
 */
function showProfileError(message) {
    showProfileLoading(false);
    if (DOM.profileContentError) {
        DOM.profileContentError.classList.remove('hidden');
    }
}

/**
 * Show profile content error state
 */
function showProfileContentError() {
    showProfileContentLoading(false);
    hideProfileContentStates();
    if (DOM.profileContentError) {
        DOM.profileContentError.classList.remove('hidden');
    }
}

/**
 * Render cellophanes in profile
 */
function renderProfileCellophanes(cellophanes, tabName) {
    if (!DOM.profileCellophanesList) return;
    
    if (!cellophanes || cellophanes.length === 0) {
        DOM.profileCellophanesList.classList.add('hidden');
        if (DOM.profileContentEmpty) {
            DOM.profileContentEmpty.classList.remove('hidden');
            if (DOM.profileEmptyText) {
                DOM.profileEmptyText.textContent = tabName === 'my' 
                    ? 'No cellophanes yet' 
                    : 'No liked cellophanes';
            }
        }
        return;
    }
    
    DOM.profileContentEmpty?.classList.add('hidden');
    DOM.profileCellophanesList.classList.remove('hidden');
    
    // Clear and append cards (v1.8.0 fix: use appendChild, not outerHTML)
    DOM.profileCellophanesList.innerHTML = '';
    cellophanes.forEach(c => {
        const card = createCellophaneCard(c);
        DOM.profileCellophanesList.appendChild(card);
    });
}

/**
 * Handle click on user avatar/name in feed (event delegation)
 */
function handleFeedUserClick(e) {
    const authorElement = e.target.closest('[data-author-id]');
    if (authorElement) {
        const authorId = authorElement.dataset.authorId;
        if (authorId) {
            e.preventDefault();
            e.stopPropagation();
            openProfileModal(authorId);
        }
    }
}

/**
 * Setup profile event listeners
 */
function setupProfileEventListeners() {
    // Profile tabs
    DOM.profileTabs?.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            if (tabName && tabName !== AppState.profile.currentTab) {
                loadProfileTab(tabName, true);
            }
        });
    });
    
    // Follow button
    if (DOM.btnFollow) {
        DOM.btnFollow.addEventListener('click', toggleFollow);
    }
    
    // Load more button
    if (DOM.btnProfileLoadMore) {
        DOM.btnProfileLoadMore.addEventListener('click', () => {
            loadProfileTab(AppState.profile.currentTab);
        });
    }
    
    // Retry button
    if (DOM.btnProfileRetry) {
        DOM.btnProfileRetry.addEventListener('click', () => {
            loadProfileTab(AppState.profile.currentTab, true);
        });
    }
    
    // Event delegation for avatar/name clicks in feeds
    if (DOM.myFeedList) {
        DOM.myFeedList.addEventListener('click', handleFeedUserClick);
    }
    if (DOM.followingFeedList) {
        DOM.followingFeedList.addEventListener('click', handleFeedUserClick);
    }
    
    // Profile cellophanes list - also needs delegation for nested profile views
    if (DOM.profileCellophanesList) {
        DOM.profileCellophanesList.addEventListener('click', handleFeedUserClick);
    }
}

// ===========================================
// MODAL MANAGEMENT
// ===========================================

function closeAllModals() {
    DOM.modalDetail.classList.remove('active');
    DOM.modalProfile.classList.remove('active');
    if (DOM.modalCreate) {
        DOM.modalCreate.classList.remove('active');
    }
    AppState.currentCellophane = null;
    
    // v1.8.5: Clear deep link URL when closing modal
    if (AppState.openedFromDeepLink) {
        clearDeepLinkUrl();
    }
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
// MEDIA UPLOAD FUNCTIONS
// ===========================================

function handleFileSelect(event, mediaType) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log(`📎 Selected ${mediaType}:`, file.name);
    
    // Store file reference
    AppState.pendingMedia = {
        file: file,
        type: mediaType,
        url: null,
        base64: null
    };
    
    // Show preview
    showMediaPreview(file, mediaType);
}

function showMediaPreview(file, mediaType) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        let previewHtml = '';
        
        if (mediaType === 'image') {
            previewHtml = `<img src="${e.target.result}" alt="Preview">`;
        } else if (mediaType === 'video') {
            previewHtml = `<video src="${e.target.result}" controls></video>`;
        } else if (mediaType === 'audio') {
            previewHtml = `
                <div class="audio-preview">
                    <span class="audio-icon">🎵</span>
                    <audio src="${e.target.result}" controls></audio>
                </div>
            `;
        }
        
        DOM.mediaPreviewContent.innerHTML = previewHtml;
        DOM.mediaPreview.classList.remove('hidden');
    };
    
    reader.readAsDataURL(file);
}

function clearMediaPreview() {
    AppState.pendingMedia = {
        file: null,
        type: null,
        url: null,
        base64: null
    };
    
    DOM.mediaPreviewContent.innerHTML = '';
    DOM.mediaPreview.classList.add('hidden');
    
    // Reset file inputs
    if (DOM.inputImage) DOM.inputImage.value = '';
    if (DOM.inputVideo) DOM.inputVideo.value = '';
}

async function startAudioRecording() {
    try {
        console.log('🎤 Starting audio recording...');
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        
        AppState.audioRecording = {
            mediaRecorder: mediaRecorder,
            chunks: [],
            startTime: Date.now(),
            timerInterval: null
        };
        
        mediaRecorder.ondataavailable = (e) => {
            AppState.audioRecording.chunks.push(e.data);
        };
        
        mediaRecorder.onstop = () => {
            const blob = new Blob(AppState.audioRecording.chunks, { type: 'audio/webm' });
            const file = new File([blob], `recording_${Date.now()}.webm`, { type: 'audio/webm' });
            
            // Store as pending media
            AppState.pendingMedia = {
                file: file,
                type: 'audio',
                url: null,
                base64: null
            };
            
            // Show preview
            showMediaPreview(file, 'audio');
            
            // Clean up
            stream.getTracks().forEach(track => track.stop());
            clearInterval(AppState.audioRecording.timerInterval);
            DOM.audioRecorder.classList.add('hidden');
        };
        
        mediaRecorder.start();
        
        // Show recording UI
        DOM.audioRecorder.classList.remove('hidden');
        
        // Start timer
        AppState.audioRecording.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - AppState.audioRecording.startTime) / 1000);
            const mins = Math.floor(elapsed / 60);
            const secs = elapsed % 60;
            DOM.recordingTime.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        }, 1000);
        
        showToast('Recording started...', 'info');
        
    } catch (error) {
        console.error('❌ Microphone error:', error);
        showToast('Could not access microphone', 'error');
    }
}

function stopAudioRecording() {
    console.log('🛑 Stopping audio recording...');
    
    if (AppState.audioRecording.mediaRecorder && 
        AppState.audioRecording.mediaRecorder.state === 'recording') {
        AppState.audioRecording.mediaRecorder.stop();
    }
}

async function uploadPendingMedia() {
    if (!AppState.pendingMedia.file) {
        return { url: null, type: null };
    }
    
    console.log('📤 Uploading media...');
    showToast('Uploading media...', 'info');
    
    const { url, error } = await CelloAPI.media.uploadFile(
        AppState.pendingMedia.file,
        AppState.pendingMedia.type
    );
    
    if (error) {
        console.error('❌ Upload failed:', error);
        showToast('Media upload failed', 'error');
        return { url: null, type: null };
    }
    
    return { url: url, type: AppState.pendingMedia.type };
}

// ===========================================
// CREATE CELLOPHANE
// ===========================================

function handleAddToPage() {
    const url = DOM.btnAddToPage.dataset.url;
    console.log('📝 Add to page:', url);
    
    // Close detail modal
    closeAllModals();
    
    // Open create modal with URL pre-filled
    setTimeout(() => {
        openCreateModal(url);
    }, 200);
}

function openCreateModal(prefillUrl = null) {
    console.log('📝 Opening create modal');
    console.log('📝 DOM.modalCreate:', DOM.modalCreate);
    
    if (!DOM.modalCreate) {
        console.error('❌ modalCreate element not found!');
        showToast('Create modal not available', 'error');
        return;
    }
    
    // Reset form
    if (DOM.formCreate) {
        DOM.formCreate.reset();
    }
    if (DOM.charCount) {
        DOM.charCount.textContent = '0';
        DOM.charCount.parentElement.className = 'char-counter';
    }
    
    // Reset visibility selection
    const publicOption = document.querySelector('.visibility-option input[value="public"]');
    if (publicOption) {
        publicOption.checked = true;
    }
    
    // Reset media preview
    clearMediaPreview();
    
    // Pre-fill URL if provided (from "Add to this page")
    if (prefillUrl && DOM.createUrl) {
        DOM.createUrl.value = prefillUrl;
    }
    
    // Set initial button color to public
    updateSubmitButtonColor();
    
    DOM.modalCreate.classList.add('active');
}

function updateCharCounter() {
    const length = DOM.createText.value.length;
    DOM.charCount.textContent = length;
    
    const counter = DOM.charCount.parentElement;
    counter.classList.remove('warning', 'danger');
    
    if (length >= 450) {
        counter.classList.add('danger');
    } else if (length >= 400) {
        counter.classList.add('warning');
    }
}

function updateSubmitButtonColor() {
    const visibility = document.querySelector('input[name="visibility"]:checked')?.value || 'public';
    const btn = DOM.btnCreateSubmit;
    
    if (!btn) return;
    
    // Remove all visibility classes
    btn.classList.remove('btn-public', 'btn-private', 'btn-groups', 'btn-influencer');
    
    // Add the selected one
    btn.classList.add(`btn-${visibility}`);
}

async function handleCreateSubmit(e) {
    e.preventDefault();
    
    const text = DOM.createText.value.trim();
    if (!text) {
        showToast('Please enter some text', 'error');
        return;
    }
    
    const visibility = document.querySelector('input[name="visibility"]:checked')?.value || 'public';
    let url = DOM.createUrl.value.trim() || null;
    
    // Auto-fix URL: add https:// if missing
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    
    // Disable button while submitting
    DOM.btnCreateSubmit.disabled = true;
    DOM.btnCreateSubmit.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:2px;"></span> Creating...';
    
    // Upload media if present
    let mediaUrl = null;
    let mediaType = null;
    
    if (AppState.pendingMedia.file) {
        const uploaded = await uploadPendingMedia();
        mediaUrl = uploaded.url;
        mediaType = uploaded.type;
    }
    
    console.log('📝 Creating cellophane:', { text, visibility, url, mediaUrl, mediaType });
    
    const { data, error } = await CelloAPI.cellophanes.create({
        text,
        visibility,
        url,
        position_x: 50,
        position_y: 50,
        media_url: mediaUrl,
        media_type: mediaType
    });
    
    // Re-enable button
    DOM.btnCreateSubmit.disabled = false;
    DOM.btnCreateSubmit.innerHTML = '<svg><use href="#icon-plus"/></svg><span>Create Cellophane</span>';
    
    if (error) {
        console.error('❌ Create error:', error);
        showToast('Failed to create cellophane', 'error');
        return;
    }
    
    console.log('✅ Created cellophane:', data);
    showToast('Cellophane created! 🎉', 'success');
    
    // Clear media preview
    clearMediaPreview();
    
    // Close modal and refresh feed
    closeAllModals();
    await loadMyFeed(true);
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
