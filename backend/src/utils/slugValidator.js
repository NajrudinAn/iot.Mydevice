const RESERVED_SLUGS = new Set([
    'www', 'api', 'mqtt', 'mail', 'smtp', 'imap', 'pop', 'ftp', 'ssh', 'sftp',
    'ns1', 'ns2', 'dns', 'admin', 'administrator', 'platform', 'app', 'apps',
    'application', 'applications', 'dashboard', 'status', 'support', 'help',
    'docs', 'documentation', 'blog', 'cdn', 'static', 'assets', 'auth', 'login',
    'logout', 'register', 'signup', 'account', 'accounts', 'billing', 'payments',
    'webhook', 'webhooks', 'callback', 'callbacks', 'health', 'healthcheck',
    'monitoring', 'monitor', 'metrics', 'analytics', 'dev', 'development',
    'test', 'testing', 'staging', 'production', 'demo', 'mydevice'
]);

/**
 * Validates a slug against DNS-safe formatting rules and reserved system hostnames.
 * @param {string} slug The slug to validate
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateSlug(slug) {
    if (!slug || typeof slug !== 'string') {
        return { valid: false, reason: 'Slug must be a non-empty string' };
    }

    const normalized = slug.trim().toLowerCase();

    if (normalized.length < 2 || normalized.length > 63) {
        return { valid: false, reason: 'Slug must be between 2 and 63 characters long' };
    }

    // Must start and end with alphanumeric, can contain hyphens in the middle
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(normalized)) {
        return { valid: false, reason: 'Slug must contain only lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen' };
    }

    if (RESERVED_SLUGS.has(normalized)) {
        return { valid: false, reason: 'RESERVED_SUBDOMAIN' };
    }

    return { valid: true };
}

/**
 * Generates a DNS-safe slug from an arbitrary name.
 * @param {string} name 
 * @returns {string}
 */
function generateSafeSlug(name) {
    if (!name) return '';
    return name.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars (except - and _)
        .replace(/_/g, '-')             // Replace underscores with hyphens
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

module.exports = {
    validateSlug,
    generateSafeSlug,
    RESERVED_SLUGS
};
