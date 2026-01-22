/**
 * Cellophane PWA - Main Application
 * Version: 1.6.2
 * 
 * CHANGELOG:
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
    btnStopRecording: document.getElementById('btn-stop-recording')
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
    public: { label: 'PUBLIC', icon: 'globe' },
    private: { label: 'PRIVATE', icon: 'lock' },
    groups: { label: 'GROUP', icon: 'users' },
    influencer: { label: 'INFLUENCER', icon: 'star' }
};

// ===========================================
// INITIALIZATION
// ===========================================

async function initApp() {
    console.log('🎬 Initializing Cellophane PWA v1.6.2...');
    
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
    
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';
    const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
    const initials = displayName.charAt(0).toUpperCase();
    
    // Update header avatar with fallback
    const avatarFallback = document.getElementById('user-avatar-fallback');
    if (avatarUrl) {
        DOM.userAvatar.src = avatarUrl;
        DOM.userAvatar.style.display = 'block';
        if (avatarFallback) avatarFallback.style.display = 'none';
        DOM.profileAvatar.src = avatarUrl;
        DOM.profileAvatar.style.display = 'block';
    } else {
        DOM.userAvatar.style.display = 'none';
        if (avatarFallback) {
            avatarFallback.textContent = initials;
            avatarFallback.style.display = 'flex';
        }
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
    // Support both camelCase (authorAvatar) and snake_case (author_avatar) from DB
    // Sanitize avatar URL for security
    const rawAvatar = cellophane.authorAvatar || cellophane.author_avatar || '';
    const authorAvatar = rawAvatar ? sanitizeUrl(rawAvatar) : '';
    const timestamp = formatTimestamp(cellophane.created_at);
    const visibilityConfig = VisibilityConfig[visibility] || VisibilityConfig.public;
    const sourceUrl = cellophane.url || '';
    const sourceDomain = sourceUrl ? extractDomain(sourceUrl) : '';
    const initials = getInitials(authorName);
    
    // Media HTML - IMPORTANT!
    const mediaHtml = renderMedia(cellophane);
    
    // Avatar HTML - sanitized URL, delegated error handling (no inline onerror)
    const avatarHtml = authorAvatar 
        ? `<img src="${escapeHtml(authorAvatar)}" alt="${escapeHtml(authorName)}" class="cellophane-author-avatar avatar-with-fallback">
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
            
            ${mediaHtml}
            
            ${sourceUrl ? `
                <a href="${sourceUrl}" target="_blank" class="cellophane-source">
                    ${Icons.link}
                    <span class="cellophane-source-url">${sourceDomain}</span>
                </a>
            ` : ''}
            
            <div class="cellophane-actions">
                <button class="action-btn btn-like" data-id="${cellophane.id}">
                    ${Icons.thumbsup}
                    <span class="like-count">${cellophane.reactions_count || 0}</span>
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

async function handleLike(cellophaneId) {
    console.log('❤️ Toggling like for:', cellophaneId);
    
    const { data, error } = await CelloAPI.reactions.toggle(cellophaneId, '❤️');
    
    if (error) {
        console.error('❌ Like error:', error);
        showToast('Failed to add like', 'error');
        return;
    }
    
    console.log('❤️ Like result:', data);
    
    // Update button state
    const btn = document.querySelector(`.btn-like[data-id="${cellophaneId}"]`);
    if (btn) {
        const isLiked = data.action === 'added';
        btn.classList.toggle('liked', isLiked);
        
        // Update count
        const countEl = btn.querySelector('.like-count');
        if (countEl) {
            let count = parseInt(countEl.textContent) || 0;
            count = isLiked ? count + 1 : Math.max(0, count - 1);
            countEl.textContent = count;
        }
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
    
    const { data: comments, error } = await CelloAPI.comments.getForCellophane(cellophane.id);
    
    if (error) {
        DOM.commentsList.innerHTML = '<p style="text-align:center;color:var(--color-text-secondary);">Failed to load comments</p>';
        return;
    }
    
    if (comments.length === 0) {
        DOM.commentsList.innerHTML = '<p style="text-align:center;color:var(--color-text-secondary);">No comments yet</p>';
    } else {
        DOM.commentsList.innerHTML = comments.map(comment => {
            const commentInitials = getInitials(comment.author || 'A');
            return `
                <div class="comment-item">
                    <div class="avatar-fallback" style="width:32px;height:32px;font-size:0.8rem;">${commentInitials}</div>
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
    
    const initials = getInitials(data.author);
    
    const commentHtml = `
        <div class="comment-item">
            <div class="avatar-fallback" style="width:32px;height:32px;font-size:0.8rem;">${initials}</div>
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
    if (DOM.modalCreate) {
        DOM.modalCreate.classList.remove('active');
    }
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
