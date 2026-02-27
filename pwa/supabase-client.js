/**
 * Cellophane - Shared Supabase Client
 * Version: 1.8.4
 * 
 * Clean client for PWA (and future React Native).
 * Uses official Supabase JS library.
 * 
 * UPDATE v1.8.4: Separate likes/dislikes counts, comment avatars + latest profile
 * UPDATE v1.8.3: Fetch comments_count and reactions_count with cellophanes
 * UPDATE v1.8.1: Fix author name - always use latest display_name from profile
 * UPDATE v1.8.0: Profile page APIs - getByAuthorId, getReactedByUser, getFollowCounts, idempotent follow
 * UPDATE v1.6.2: URL canonicalization (no www injection, strip fragments, remove default ports)
 * UPDATE v1.6.1: Fixed URL normalization - preserve path case (only hostname lowercase)
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
// HELPER: Normalize URL for consistency (Canonical)
// ===========================================

function normalizeUrl(url) {
    if (!url) return url;
    
    let normalized = url.trim();
    
    // Add https:// if no protocol
    if (!normalized.match(/^https?:\/\//i)) {
        normalized = 'https://' + normalized;
    }
    
    // Parse URL to work with it
    try {
        const urlObj = new URL(normalized);
        
        // Only hostname should be lowercase (case-insensitive by spec)
        // Path should preserve case (can be case-sensitive on some servers)
        urlObj.hostname = urlObj.hostname.toLowerCase();
        
        // Strip fragment (hash) - not relevant for page identity
        urlObj.hash = '';
        
        // Remove default ports
        if (urlObj.protocol === 'https:' && urlObj.port === '443') {
            urlObj.port = '';
        }
        if (urlObj.protocol === 'http:' && urlObj.port === '80') {
            urlObj.port = '';
        }
        
        // Remove trailing slash from path (but keep if it's just /)
        if (urlObj.pathname.length > 1 && urlObj.pathname.endsWith('/')) {
            urlObj.pathname = urlObj.pathname.slice(0, -1);
        }
        
        // NOTE: Do NOT add www. automatically - this would split threads
        // between www.example.com and example.com
        
        return urlObj.toString();
    } catch (e) {
        // If URL parsing fails, return original with https
        return normalized;
    }
}

// ===========================================
// HELPER: Add avatar, display name, and counts to cellophanes
// ===========================================

async function addAvatarsToCellophanes(cellophanes) {
    if (!cellophanes || cellophanes.length === 0) return cellophanes;
    
    const client = getClient();
    if (!client) return cellophanes;
    
    // Get unique author IDs and cellophane IDs
    const authorIds = [...new Set(cellophanes.map(c => c.author_id).filter(Boolean))];
    const cellophaneIds = cellophanes.map(c => c.id);
    
    // Fetch profiles, comment counts, and reaction counts in parallel
    const [profilesResult, commentsResult, reactionsResult] = await Promise.all([
        // Profiles
        authorIds.length > 0 
            ? client.from('public_user_profiles').select('id, avatar_url, display_name').in('id', authorIds)
            : { data: [], error: null },
        // Comment counts
        client.from('cellophane_comments').select('cellophane_id').in('cellophane_id', cellophaneIds),
        // v1.8.4: Reactions with emoji to separate likes/dislikes
        client.from('reactions').select('cellophane_id, emoji').in('cellophane_id', cellophaneIds)
    ]);
    
    // Create profile lookup map
    const profileMap = {};
    if (profilesResult.data) {
        profilesResult.data.forEach(p => {
            profileMap[p.id] = {
                avatar_url: p.avatar_url,
                display_name: p.display_name
            };
        });
    }
    
    // Count comments per cellophane
    const commentsCountMap = {};
    if (commentsResult.data) {
        commentsResult.data.forEach(c => {
            commentsCountMap[c.cellophane_id] = (commentsCountMap[c.cellophane_id] || 0) + 1;
        });
    }
    
    // v1.8.4: Count likes (👍) and dislikes (👎) separately
    const likesCountMap = {};
    const dislikesCountMap = {};
    if (reactionsResult.data) {
        reactionsResult.data.forEach(r => {
            if (r.emoji === '👍' || r.emoji === '❤️') {
                // Count both 👍 and ❤️ as likes for backwards compatibility
                likesCountMap[r.cellophane_id] = (likesCountMap[r.cellophane_id] || 0) + 1;
            } else if (r.emoji === '👎') {
                dislikesCountMap[r.cellophane_id] = (dislikesCountMap[r.cellophane_id] || 0) + 1;
            }
        });
    }
    
    // Add all data to each cellophane
    return cellophanes.map(c => {
        const profile = profileMap[c.author_id];
        return {
            ...c,
            author_avatar: profile?.avatar_url || null,
            author: profile?.display_name || c.author,
            comments_count: commentsCountMap[c.id] || 0,
            likes_count: likesCountMap[c.id] || 0,
            dislikes_count: dislikesCountMap[c.id] || 0
        };
    });
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
     * Get cellophanes by URL (for "More from this site")
     * v1.8.6: Browse by URL feature
     * @param {string} url - The URL to search for
     * @param {string} excludeId - Cellophane ID to exclude (current one)
     * @param {number} limit - Max results (default 10)
     */
    async getByUrl(url, excludeId = null, limit = 10) {
        const client = getClient();
        if (!client) return { data: [], error: new Error('Client not initialized') };
        
        if (!url) return { data: [], error: null };
        
        // Extract domain for broader matching
        let domain = url;
        try {
            const parsed = new URL(url);
            domain = parsed.hostname.replace('www.', '');
        } catch (e) {
            // Use as-is if not a valid URL
        }
        
        let query = client
            .from('cellophanes')
            .select('*')
            .ilike('url', `%${domain}%`)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        // Exclude current cellophane if specified
        if (excludeId) {
            query = query.neq('id', excludeId);
        }
        
        const { data, error } = await query;
        
        if (error) return { data: [], error };
        if (!data || data.length === 0) return { data: [], error: null };
        
        // Add avatars
        const withAvatars = await addAvatarsToCellophanes(data);
        
        return { data: withAvatars, error: null };
    },
    
    /**
     * Get top sites by cellophane count
     * v1.8.7: Popular sites recommendations
     * @param {number} limit - Max results (default 5)
     */
    async getTopSites(limit = 5) {
        const client = getClient();
        if (!client) return { data: [], error: new Error('Client not initialized') };
        
        // Get all public cellophanes with URLs
        const { data, error } = await client
            .from('cellophanes')
            .select('url')
            .eq('visibility', 'public')
            .not('url', 'is', null)
            .not('url', 'ilike', '%cellophane.ai/pwa%');
        
        if (error) return { data: [], error };
        if (!data || data.length === 0) return { data: [], error: null };
        
        // Count by domain
        const domainCounts = {};
        data.forEach(row => {
            if (!row.url) return;
            try {
                const parsed = new URL(row.url);
                const domain = parsed.hostname.replace('www.', '');
                domainCounts[domain] = (domainCounts[domain] || 0) + 1;
            } catch (e) {}
        });
        
        // Sort by count and take top N
        const sorted = Object.entries(domainCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([domain, count]) => ({ domain, count }));
        
        return { data: sorted, error: null };
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
    },
    
    /**
     * Get cellophanes by a specific author (for Profile page - My tab)
     * v1.8.0
     * @param {string} userId - Author ID
     * @param {number} page - Page number (0-indexed)
     * @param {number} pageSize - Items per page
     */
    async getByAuthorId(userId, page = 0, pageSize = 20) {
        const client = getClient();
        if (!client) return { data: [], error: new Error('Client not initialized') };
        
        if (!userId) return { data: [], error: new Error('User ID required') };
        
        const from = page * pageSize;
        const to = from + pageSize - 1;
        
        const { data, error } = await client
            .from('cellophanes')
            .select('*')
            .eq('author_id', userId)
            .eq('visibility', 'public')
            .order('created_at', { ascending: false })
            .range(from, to);
        
        if (error) return { data: [], error };
        
        const withAvatars = await addAvatarsToCellophanes(data || []);
        return { data: withAvatars, error: null };
    },
    
    /**
     * Get cellophanes that a user has reacted to (for Profile page - Liked tab)
     * v1.8.0
     * @param {string} userId - User ID
     * @param {number} page - Page number (0-indexed)
     * @param {number} pageSize - Items per page
     */
    async getReactedByUser(userId, page = 0, pageSize = 20) {
        const client = getClient();
        if (!client) return { data: [], error: new Error('Client not initialized') };
        
        if (!userId) return { data: [], error: new Error('User ID required') };
        
        const from = page * pageSize;
        const to = from + pageSize - 1;
        
        // Step 1: Get cellophane IDs this user has reacted to
        const { data: reactions, error: reactionsError } = await client
            .from('reactions')
            .select('cellophane_id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(from, to);
        
        if (reactionsError || !reactions || reactions.length === 0) {
            return { data: [], error: reactionsError };
        }
        
        // Get unique cellophane IDs (preserve order)
        const cellophaneIds = [...new Set(reactions.map(r => r.cellophane_id))];
        
        // Step 2: Fetch the actual cellophanes
        const { data: cellophanes, error: cellophaneError } = await client
            .from('cellophanes')
            .select('*')
            .in('id', cellophaneIds)
            .eq('visibility', 'public');
        
        if (cellophaneError) return { data: [], error: cellophaneError };
        
        // Preserve order from reactions (most recently liked first)
        const cellophaneMap = {};
        (cellophanes || []).forEach(c => { cellophaneMap[c.id] = c; });
        const orderedCellophanes = cellophaneIds
            .map(id => cellophaneMap[id])
            .filter(Boolean);
        
        const withAvatars = await addAvatarsToCellophanes(orderedCellophanes);
        return { data: withAvatars, error: null };
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
     * v1.8.4: Fetch latest display_name and avatar from profiles
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
        
        if (error || !data || data.length === 0) {
            return { data: data || [], error };
        }
        
        // v1.8.4: Fetch latest profiles for comment authors
        const authorIds = [...new Set(data.map(c => c.author_id).filter(Boolean))];
        
        if (authorIds.length > 0) {
            const { data: profiles } = await client
                .from('public_user_profiles')
                .select('id, avatar_url, display_name')
                .in('id', authorIds);
            
            if (profiles) {
                const profileMap = {};
                profiles.forEach(p => {
                    profileMap[p.id] = {
                        avatar_url: p.avatar_url,
                        display_name: p.display_name
                    };
                });
                
                // Update comments with latest profile data
                data.forEach(comment => {
                    const profile = profileMap[comment.author_id];
                    if (profile) {
                        comment.author = profile.display_name || comment.author;
                        comment.author_avatar = profile.avatar_url || comment.author_avatar;
                    }
                });
            }
        }
        
        return { data, error: null };
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
        const insertData = {
            cellophane_id: cellophaneId,
            text: text,
            author: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
            author_id: user.id,
            author_email: user.email || null,
            author_avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
            created_at: new Date().toISOString()
        };
        
        // v1.8.2: Add parent_id for replies
        if (parentId) {
            insertData.parent_id = parentId;
        }
        
        const { data, error } = await client
            .from('cellophane_comments')
            .insert(insertData)
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
     * Follow a user (idempotent - safe to call multiple times)
     * v1.8.0: Made idempotent with check-then-insert
     * @param {string} userId - User to follow
     */
    async follow(userId) {
        const client = getClient();
        if (!client) return { data: null, error: new Error('Client not initialized') };
        
        const { data: { user } } = await client.auth.getUser();
        if (!user) return { data: null, error: new Error('Not authenticated') };
        
        // Prevent following self
        if (user.id === userId) {
            return { data: null, error: new Error('Cannot follow yourself') };
        }
        
        // v1.8.9: Use maybeSingle to avoid 406 error when not following yet
        const { data: existing } = await client
            .from('follows')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', userId)
            .maybeSingle();
        
        if (existing) {
            return { data: existing, error: null };
        }
        
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
        
        // v1.8.9: Use maybeSingle to avoid 406 error when no rows found
        const { data, error } = await client
            .from('follows')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', userId)
            .maybeSingle();
        
        return { data: !!data, error: null };
    },
    
    /**
     * Get follower/following counts for a user
     * v1.8.0
     * @param {string} userId
     */
    async getFollowCounts(userId) {
        const client = getClient();
        if (!client) return { followers: 0, following: 0, error: new Error('Client not initialized') };
        
        if (!userId) return { followers: 0, following: 0, error: new Error('User ID required') };
        
        const { count: followers, error: e1 } = await client
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', userId);
        
        const { count: following, error: e2 } = await client
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', userId);
        
        return { 
            followers: followers || 0, 
            following: following || 0, 
            error: e1 || e2 
        };
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
// GAMIFICATION API - v1.8.8
// ===========================================

const ACHIEVEMENTS = [
    { id: 'first_cellophane', icon: '🎯', name: 'First Steps', description: 'Create your first cellophane', check: (s) => s.cellophanes >= 1 },
    { id: 'ten_cellophanes', icon: '💫', name: 'Rising Star', description: 'Create 10 cellophanes', check: (s) => s.cellophanes >= 10 },
    { id: 'fifty_cellophanes', icon: '🔥', name: 'On Fire', description: 'Create 50 cellophanes', check: (s) => s.cellophanes >= 50 },
    { id: 'first_follower', icon: '👤', name: 'First Fan', description: 'Get your first follower', check: (s) => s.followers >= 1 },
    { id: 'ten_followers', icon: '👥', name: 'Social Butterfly', description: 'Get 10 followers', check: (s) => s.followers >= 10 },
    { id: 'first_comment', icon: '💬', name: 'Conversation Starter', description: 'Leave your first comment', check: (s) => s.comments >= 1 },
    { id: 'first_like', icon: '❤️', name: 'Spread the Love', description: 'Like your first cellophane', check: (s) => s.likes >= 1 }
];

const CelloGamification = {
    ACHIEVEMENTS,
    
    /**
     * Calculate level from XP
     */
    calculateLevel(xp) {
        if (xp < 100) return 1;
        if (xp < 300) return 2;
        if (xp < 600) return 3;
        if (xp < 1000) return 4;
        if (xp < 1500) return 5;
        if (xp < 2200) return 6;
        if (xp < 3000) return 7;
        if (xp < 4000) return 8;
        if (xp < 5200) return 9;
        return 10;
    },
    
    /**
     * Get XP thresholds for each level
     */
    getLevelThresholds() {
        return [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5200, 9999];
    },
    
    /**
     * Get user stats (cellophanes, followers, comments, likes)
     */
    async getUserStats(userId) {
        const client = getClient();
        if (!client || !userId) return { data: null, error: new Error('Not initialized') };
        
        try {
            // Get cellophane count
            const { count: cellophanes } = await client
                .from('cellophanes')
                .select('*', { count: 'exact', head: true })
                .eq('author_id', userId);
            
            // Get followers count
            const { count: followers } = await client
                .from('follows')
                .select('*', { count: 'exact', head: true })
                .eq('following_id', userId);
            
            // Get comments count
            const { count: comments } = await client
                .from('cellophane_comments')
                .select('*', { count: 'exact', head: true })
                .eq('author_id', userId);
            
            // Get likes given count
            const { count: likes } = await client
                .from('reactions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('emoji', '👍');
            
            // Calculate XP (simple formula: cellophanes*10 + followers*5 + comments*3 + likes*1)
            const xp = (cellophanes || 0) * 10 + (followers || 0) * 5 + (comments || 0) * 3 + (likes || 0);
            const level = this.calculateLevel(xp);
            const thresholds = this.getLevelThresholds();
            const currentLevelXp = thresholds[level - 1];
            const nextLevelXp = thresholds[level];
            const progress = Math.round(((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100);
            
            return {
                data: {
                    cellophanes: cellophanes || 0,
                    followers: followers || 0,
                    comments: comments || 0,
                    likes: likes || 0,
                    xp,
                    level,
                    progress: Math.min(progress, 100),
                    nextLevelXp
                },
                error: null
            };
        } catch (error) {
            console.error('❌ Error getting user stats:', error);
            return { data: null, error };
        }
    },
    
    /**
     * Get earned achievements for user
     */
    async getEarnedAchievements(userId) {
        const { data: stats } = await this.getUserStats(userId);
        if (!stats) return [];
        
        return ACHIEVEMENTS.filter(a => a.check(stats));
    }
};

// ===========================================
// NOTIFICATIONS API - v1.8.8
// ===========================================

const CelloNotifications = {
    /**
     * Get notifications for current user
     */
    async getNotifications(limit = 20) {
        const client = getClient();
        if (!client) return { data: [], error: new Error('Client not initialized') };
        
        const { data: { user } } = await client.auth.getUser();
        if (!user) return { data: [], error: new Error('Not authenticated') };
        
        const { data, error } = await client
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        return { data: data || [], error };
    },
    
    /**
     * Get unread notification count
     */
    async getUnreadCount() {
        const client = getClient();
        if (!client) return { count: 0, error: null };
        
        const { data: { user } } = await client.auth.getUser();
        if (!user) return { count: 0, error: null };
        
        const { count, error } = await client
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('read', false);
        
        return { count: count || 0, error };
    },
    
    /**
     * Mark notification as read
     */
    async markAsRead(notificationId) {
        const client = getClient();
        if (!client) return { error: new Error('Client not initialized') };
        
        const { error } = await client
            .from('notifications')
            .update({ read: true })
            .eq('id', notificationId);
        
        return { error };
    },
    
    /**
     * Mark all notifications as read
     */
    async markAllAsRead() {
        const client = getClient();
        if (!client) return { error: new Error('Client not initialized') };
        
        const { data: { user } } = await client.auth.getUser();
        if (!user) return { error: new Error('Not authenticated') };
        
        const { error } = await client
            .from('notifications')
            .update({ read: true })
            .eq('user_id', user.id)
            .eq('read', false);
        
        return { error };
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
    media: CelloMedia,
    // v1.8.8: New modules
    gamification: CelloGamification,
    notifications: CelloNotifications
};

// Make available globally
window.CelloAPI = CelloAPI;

console.log('✅ CelloAPI loaded - Shared Supabase Client v1.8.9');
