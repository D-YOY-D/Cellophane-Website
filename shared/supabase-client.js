/**
 * Cellophane - Shared Supabase Client
 * Version: 1.6.0
 * 
 * Clean client for PWA (and future React Native).
 * Uses official Supabase JS library.
 * 
 * UPDATE v1.6.0: Security fixes (XSS, URL sanitization) + SW caching fix
 * UPDATE v1.5.1: Fixed comments - match Extension columns (text, author, author_id, etc.)
 * UPDATE v1.5.0: Fixed comments column names (user_name, content) + URL normalization
 * UPDATE v1.4.0: Fixed comments with UUID generation
 * UPDATE v1.3.0: Added media upload support
 * UPDATE v1.2.0: Fixed create cellophane with UUID + timestamp
 * UPDATE v1.1.0: Added avatar support via public_user_profiles join
 */

// ===========================================
// CONFIGURATION
// ===========================================

const SUPABASE_CONFIG = {
    url: 'https://tlukysxlypmextjndyfl.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsdWt5c3hseXBtZXh0am5keWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MzgyNjksImV4cCI6MjA3MjIxNDI2OX0.FMuY_YZ9ggh6h71JmqJAEOSL-LFwBI0zdG_tKjBCfSA'
};

// ===========================================
// SUPABASE CLIENT SINGLETON
// ===========================================

let _supabaseClient = null;

/**
 * Get or create the Supabase client
 * @returns {SupabaseClient}
 */
function getClient() {
    if (!_supabaseClient) {
        if (typeof supabase === 'undefined' || !supabase.createClient) {
            console.error('❌ Supabase library not loaded! Add the script tag first.');
            return null;
        }
        _supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        console.log('✅ Supabase client initialized');
    }
    return _supabaseClient;
}

// ===========================================
// AUTH MODULE
// ===========================================

const CelloAuth = {
    /**
     * Sign in with Google OAuth
     */
    async signInWithGoogle() {
        const client = getClient();
        if (!client) return { data: null, error: new Error('Client not initialized') };
        
        const { data, error } = await client.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + window.location.pathname
            }
        });
        
        return { data, error };
    },
    
    /**
     * Sign out current user
     */
    async signOut() {
        const client = getClient();
        if (!client) return { error: new Error('Client not initialized') };
        
        const { error } = await client.auth.signOut();
        return { error };
    },
    
    /**
     * Get current session
     */
    async getSession() {
        const client = getClient();
        if (!client) return { data: { session: null }, error: null };
        
        const { data, error } = await client.auth.getSession();
        return { data, error };
    },
    
    /**
     * Get current user
     */
    async getUser() {
        const client = getClient();
        if (!client) return { data: { user: null }, error: null };
        
        const { data, error } = await client.auth.getUser();
        return { data, error };
    },
    
    /**
     * Listen to auth state changes
     * @param {Function} callback - (event, session) => void
     * @returns {Function} Unsubscribe function
     */
    onAuthStateChange(callback) {
        const client = getClient();
        if (!client) return () => {};
        
        const { data: { subscription } } = client.auth.onAuthStateChange(callback);
        return () => subscription.unsubscribe();
    }
};

// ===========================================
// HELPER: Generate UUID
// ===========================================

function generateUUID() {
    // Use crypto.randomUUID if available (modern browsers)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ===========================================
// HELPER: Normalize URL for consistency
// ===========================================

function normalizeUrl(url) {
    if (!url) return url;
    
    let normalized = url.trim().toLowerCase();
    
    // Add https:// if no protocol
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
        normalized = 'https://' + normalized;
    }
    
    // Parse URL to work with it
    try {
        const urlObj = new URL(normalized);
        
        // Ensure www. is present for common sites (consistency)
        // If the domain doesn't have www. and it's not a subdomain, add it
        const parts = urlObj.hostname.split('.');
        if (parts.length === 2 && !urlObj.hostname.startsWith('www.')) {
            urlObj.hostname = 'www.' + urlObj.hostname;
        }
        
        // Remove trailing slash from path (but keep if it's just /)
        if (urlObj.pathname.length > 1 && urlObj.pathname.endsWith('/')) {
            urlObj.pathname = urlObj.pathname.slice(0, -1);
        }
        
        return urlObj.toString();
    } catch (e) {
        // If URL parsing fails, return original with https
        return normalized;
    }
}

// ===========================================
// HELPER: Add avatar to cellophanes
// ===========================================

async function addAvatarsToCellophanes(cellophanes) {
    if (!cellophanes || cellophanes.length === 0) return cellophanes;
    
    const client = getClient();
    if (!client) return cellophanes;
    
    // Get unique author IDs
    const authorIds = [...new Set(cellophanes.map(c => c.author_id).filter(Boolean))];
    
    if (authorIds.length === 0) return cellophanes;
    
    // Fetch avatars from public_user_profiles
    const { data: profiles, error } = await client
        .from('public_user_profiles')
        .select('id, avatar_url, display_name')
        .in('id', authorIds);
    
    if (error || !profiles) {
        console.warn('⚠️ Could not fetch user profiles:', error);
        return cellophanes;
    }
    
    // Create a lookup map
    const avatarMap = {};
    profiles.forEach(p => {
        avatarMap[p.id] = p.avatar_url;
    });
    
    // Add avatar to each cellophane
    return cellophanes.map(c => ({
        ...c,
        author_avatar: avatarMap[c.author_id] || null
    }));
}

// ===========================================
// CELLOPHANES MODULE
// ===========================================

const CelloCellophanes = {
    /**
     * Get cellophanes for current user (My Feed)
     * @param {number} page - Page number (0-indexed)
     * @param {number} pageSize - Items per page
     */
    async getMyCellophanes(page = 0, pageSize = 20) {
        const client = getClient();
        if (!client) return { data: [], error: new Error('Client not initialized') };
        
        const { data: { user } } = await client.auth.getUser();
        if (!user) return { data: [], error: new Error('Not authenticated') };
        
        const from = page * pageSize;
        const to = from + pageSize - 1;
        
        const { data, error } = await client
            .from('cellophanes')
            .select('*')
            .eq('author_id', user.id)
            .order('created_at', { ascending: false })
            .range(from, to);
        
        if (error) return { data: [], error };
        
        // Add avatars
        const withAvatars = await addAvatarsToCellophanes(data || []);
        
        return { data: withAvatars, error: null };
    },
    
    /**
     * Get cellophanes from followed users (Following Feed)
     * @param {number} page - Page number (0-indexed)
     * @param {number} pageSize - Items per page
     */
    async getFollowingFeed(page = 0, pageSize = 20) {
        const client = getClient();
        if (!client) return { data: [], error: new Error('Client not initialized') };
        
        const { data: { user } } = await client.auth.getUser();
        if (!user) return { data: [], error: new Error('Not authenticated') };
        
        // First get who I'm following
        const { data: following, error: followError } = await client
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id);
        
        if (followError || !following || following.length === 0) {
            return { data: [], error: followError };
        }
        
        const followingIds = following.map(f => f.following_id);
        const from = page * pageSize;
        const to = from + pageSize - 1;
        
        // Then get their public cellophanes
        const { data, error } = await client
            .from('cellophanes')
            .select('*')
            .in('author_id', followingIds)
            .eq('visibility', 'public')
            .order('created_at', { ascending: false })
            .range(from, to);
        
        if (error) return { data: [], error };
        
        // Add avatars
        const withAvatars = await addAvatarsToCellophanes(data || []);
        
        return { data: withAvatars, error: null };
    },
    
    /**
     * Get a single cellophane by ID
     * @param {string} id - Cellophane ID
     */
    async getById(id) {
        const client = getClient();
        if (!client) return { data: null, error: new Error('Client not initialized') };
        
        const { data, error } = await client
            .from('cellophanes')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error || !data) return { data: null, error };
        
        // Add avatar
        const withAvatars = await addAvatarsToCellophanes([data]);
        
        return { data: withAvatars[0], error: null };
    },
    
    /**
     * Create a new cellophane
     * @param {Object} cellophane - { text, url, visibility, position_x, position_y, media_url, media_type }
     */
    async create(cellophane) {
        const client = getClient();
        if (!client) return { data: null, error: new Error('Client not initialized') };
        
        const { data: { user } } = await client.auth.getUser();
        if (!user) return { data: null, error: new Error('Not authenticated') };
        
        const now = new Date().toISOString();
        
        // Normalize URL for consistency
        let normalizedUrl = cellophane.url || 'https://cellophane.ai/pwa';
        if (normalizedUrl !== 'https://cellophane.ai/pwa') {
            normalizedUrl = normalizeUrl(normalizedUrl);
        }
        
        // Build insert object
        const insertData = {
            id: generateUUID(),
            text: cellophane.text,
            url: normalizedUrl,
            visibility: cellophane.visibility || 'public',
            position_x: cellophane.position_x || 50,
            position_y: cellophane.position_y || 50,
            author_id: user.id,
            author: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
            timestamp: now,
            created_at: now
        };
        
        // Add media if provided
        if (cellophane.media_url) {
            insertData.media_url = cellophane.media_url;
            insertData.media_type = cellophane.media_type || 'image';
        }
        
        const { data, error } = await client
            .from('cellophanes')
            .insert(insertData)
            .select()
            .single();
        
        return { data, error };
    }
};

// ===========================================
// REACTIONS MODULE
// ===========================================

const CelloReactions = {
    /**
     * Get reactions for a cellophane
     * @param {string} cellophaneId
     */
    async getForCellophane(cellophaneId) {
        const client = getClient();
        if (!client) return { data: [], error: new Error('Client not initialized') };
        
        const { data, error } = await client
            .from('reactions')
            .select('*')
            .eq('cellophane_id', cellophaneId);
        
        return { data: data || [], error };
    },
    
    /**
     * Toggle reaction (add if not exists, remove if exists)
     * @param {string} cellophaneId
     * @param {string} emoji
     */
    async toggle(cellophaneId, emoji) {
        const client = getClient();
        if (!client) return { data: null, error: new Error('Client not initialized') };
        
        const { data: { user } } = await client.auth.getUser();
        if (!user) return { data: null, error: new Error('Not authenticated') };
        
        // Check if reaction exists
        const { data: existing } = await client
            .from('reactions')
            .select('id')
            .eq('cellophane_id', cellophaneId)
            .eq('user_id', user.id)
            .eq('emoji', emoji)
            .single();
        
        if (existing) {
            // Remove reaction
            const { error } = await client
                .from('reactions')
                .delete()
                .eq('id', existing.id);
            return { data: { action: 'removed' }, error };
        } else {
            // Add reaction
            const { data, error } = await client
                .from('reactions')
                .insert({
                    cellophane_id: cellophaneId,
                    user_id: user.id,
                    emoji: emoji
                })
                .select()
                .single();
            return { data: { action: 'added', reaction: data }, error };
        }
    }
};

// ===========================================
// COMMENTS MODULE
// ===========================================

const CelloComments = {
    /**
     * Get comments for a cellophane
     * @param {string} cellophaneId
     */
    async getForCellophane(cellophaneId) {
        const client = getClient();
        if (!client) return { data: [], error: new Error('Client not initialized') };
        
        const { data, error } = await client
            .from('cellophane_comments')
            .select('*')
            .eq('cellophane_id', cellophaneId)
            .order('created_at', { ascending: true });
        
        return { data: data || [], error };
    },
    
    /**
     * Add a comment
     * @param {string} cellophaneId
     * @param {string} text
     * @param {string|null} parentId - For replies
     */
    async add(cellophaneId, text, parentId = null) {
        const client = getClient();
        if (!client) return { data: null, error: new Error('Client not initialized') };
        
        const { data: { user } } = await client.auth.getUser();
        if (!user) return { data: null, error: new Error('Not authenticated') };
        
        // Column names MUST match what Extension uses (cellophane-api.js):
        // text (not content), author (not user_name), author_id, author_email, author_avatar
        const { data, error } = await client
            .from('cellophane_comments')
            .insert({
                cellophane_id: cellophaneId,
                text: text,
                author: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
                author_id: user.id,
                author_email: user.email || null,
                author_avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
                created_at: new Date().toISOString()
            })
            .select()
            .single();
        
        return { data, error };
    },
    
    /**
     * Delete a comment (only own comments)
     * @param {string} commentId
     */
    async delete(commentId) {
        const client = getClient();
        if (!client) return { error: new Error('Client not initialized') };
        
        const { error } = await client
            .from('cellophane_comments')
            .delete()
            .eq('id', commentId);
        
        return { error };
    }
};

// ===========================================
// FOLLOWS MODULE
// ===========================================

const CelloFollows = {
    /**
     * Get users I'm following
     */
    async getFollowing() {
        const client = getClient();
        if (!client) return { data: [], error: new Error('Client not initialized') };
        
        const { data: { user } } = await client.auth.getUser();
        if (!user) return { data: [], error: new Error('Not authenticated') };
        
        const { data, error } = await client
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id);
        
        return { data: data || [], error };
    },
    
    /**
     * Get my followers
     */
    async getFollowers() {
        const client = getClient();
        if (!client) return { data: [], error: new Error('Client not initialized') };
        
        const { data: { user } } = await client.auth.getUser();
        if (!user) return { data: [], error: new Error('Not authenticated') };
        
        const { data, error } = await client
            .from('follows')
            .select('follower_id')
            .eq('following_id', user.id);
        
        return { data: data || [], error };
    },
    
    /**
     * Follow a user
     * @param {string} userId - User to follow
     */
    async follow(userId) {
        const client = getClient();
        if (!client) return { data: null, error: new Error('Client not initialized') };
        
        const { data: { user } } = await client.auth.getUser();
        if (!user) return { data: null, error: new Error('Not authenticated') };
        
        const { data, error } = await client
            .from('follows')
            .insert({
                follower_id: user.id,
                following_id: userId
            })
            .select()
            .single();
        
        return { data, error };
    },
    
    /**
     * Unfollow a user
     * @param {string} userId - User to unfollow
     */
    async unfollow(userId) {
        const client = getClient();
        if (!client) return { error: new Error('Client not initialized') };
        
        const { data: { user } } = await client.auth.getUser();
        if (!user) return { error: new Error('Not authenticated') };
        
        const { error } = await client
            .from('follows')
            .delete()
            .eq('follower_id', user.id)
            .eq('following_id', userId);
        
        return { error };
    },
    
    /**
     * Check if following a user
     * @param {string} userId
     */
    async isFollowing(userId) {
        const client = getClient();
        if (!client) return { data: false, error: new Error('Client not initialized') };
        
        const { data: { user } } = await client.auth.getUser();
        if (!user) return { data: false, error: null };
        
        const { data, error } = await client
            .from('follows')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', userId)
            .single();
        
        return { data: !!data, error };
    }
};

// ===========================================
// USER PROFILE MODULE
// ===========================================

const CelloProfile = {
    /**
     * Get public profile by user ID
     * @param {string} userId
     */
    async getById(userId) {
        const client = getClient();
        if (!client) return { data: null, error: new Error('Client not initialized') };
        
        const { data, error } = await client
            .from('public_user_profiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        return { data, error };
    },
    
    /**
     * Update current user's profile
     * @param {Object} updates - { display_name, bio, avatar_url }
     */
    async update(updates) {
        const client = getClient();
        if (!client) return { data: null, error: new Error('Client not initialized') };
        
        const { data: { user } } = await client.auth.getUser();
        if (!user) return { data: null, error: new Error('Not authenticated') };
        
        // Update user metadata
        const { data, error } = await client.auth.updateUser({
            data: {
                full_name: updates.display_name,
                bio: updates.bio,
                avatar_url: updates.avatar_url
            }
        });
        
        return { data, error };
    }
};

// ===========================================
// MEDIA UPLOAD MODULE
// ===========================================

const CelloMedia = {
    /**
     * Upload media file to Supabase Storage
     * @param {File} file - File object from input
     * @param {string} mediaType - 'image', 'video', or 'audio'
     * @returns {Promise<{url: string, error: Error|null}>}
     */
    async uploadFile(file, mediaType) {
        const client = getClient();
        if (!client) return { url: null, error: new Error('Client not initialized') };
        
        try {
            console.log(`📤 Uploading ${mediaType}: ${file.name}`);
            
            // Generate unique filename
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substring(2, 9);
            const fileExt = file.name.split('.').pop() || 'bin';
            const filename = `${mediaType}_${timestamp}_${randomStr}.${fileExt}`;
            const filePath = `${mediaType}s/${filename}`;
            
            // Upload to Supabase Storage
            const { data, error } = await client.storage
                .from('media')
                .upload(filePath, file, {
                    contentType: file.type,
                    upsert: true
                });
            
            if (error) {
                console.error('❌ Upload error:', error);
                return { url: null, error };
            }
            
            // Get public URL
            const { data: { publicUrl } } = client.storage
                .from('media')
                .getPublicUrl(filePath);
            
            console.log(`✅ ${mediaType} uploaded:`, publicUrl);
            return { url: publicUrl, error: null };
            
        } catch (error) {
            console.error(`❌ Error uploading ${mediaType}:`, error);
            return { url: null, error };
        }
    },
    
    /**
     * Upload base64 data (for audio recording)
     * @param {string} base64Data - Base64 encoded data with data: prefix
     * @param {string} mediaType - 'image', 'video', or 'audio'
     */
    async uploadBase64(base64Data, mediaType) {
        const client = getClient();
        if (!client) return { url: null, error: new Error('Client not initialized') };
        
        try {
            console.log(`📤 Uploading ${mediaType} from base64...`);
            
            // Parse base64 data URL
            let contentType = 'application/octet-stream';
            let base64Content = base64Data;
            let fileExt = 'bin';
            
            if (base64Data.startsWith('data:')) {
                const matches = base64Data.match(/data:([^;]+);base64,(.+)/);
                if (matches) {
                    contentType = matches[1];
                    base64Content = matches[2];
                    
                    // Determine extension
                    if (contentType.includes('image/jpeg')) fileExt = 'jpg';
                    else if (contentType.includes('image/png')) fileExt = 'png';
                    else if (contentType.includes('image/gif')) fileExt = 'gif';
                    else if (contentType.includes('image/webp')) fileExt = 'webp';
                    else if (contentType.includes('video/mp4')) fileExt = 'mp4';
                    else if (contentType.includes('video/webm')) fileExt = 'webm';
                    else if (contentType.includes('audio/webm')) fileExt = 'webm';
                    else if (contentType.includes('audio/mp3') || contentType.includes('audio/mpeg')) fileExt = 'mp3';
                    else if (contentType.includes('audio/wav')) fileExt = 'wav';
                }
            }
            
            // Convert base64 to blob
            const byteCharacters = atob(base64Content);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: contentType });
            
            // Generate unique filename
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substring(2, 9);
            const filename = `${mediaType}_${timestamp}_${randomStr}.${fileExt}`;
            const filePath = `${mediaType}s/${filename}`;
            
            // Upload to Supabase Storage
            const { data, error } = await client.storage
                .from('media')
                .upload(filePath, blob, {
                    contentType: contentType,
                    upsert: true
                });
            
            if (error) {
                console.error('❌ Upload error:', error);
                return { url: null, error };
            }
            
            // Get public URL
            const { data: { publicUrl } } = client.storage
                .from('media')
                .getPublicUrl(filePath);
            
            console.log(`✅ ${mediaType} uploaded:`, publicUrl);
            return { url: publicUrl, error: null };
            
        } catch (error) {
            console.error(`❌ Error uploading ${mediaType}:`, error);
            return { url: null, error };
        }
    }
};

// ===========================================
// EXPORT API
// ===========================================

const CelloAPI = {
    // Core
    getClient,
    config: SUPABASE_CONFIG,
    
    // Modules
    auth: CelloAuth,
    cellophanes: CelloCellophanes,
    reactions: CelloReactions,
    comments: CelloComments,
    follows: CelloFollows,
    profile: CelloProfile,
    media: CelloMedia
};

// Make available globally
window.CelloAPI = CelloAPI;

console.log('✅ CelloAPI loaded - Shared Supabase Client v1.6.0');
