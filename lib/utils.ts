export const getAssetPath = (path: string) => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    
    // Use absolute URL for GitHub Pages to ensure correct loading
    if (typeof window !== 'undefined' && window.location.hostname.includes('github.io')) {
        return `https://shootyq.github.io/SpaceAdventure${cleanPath}`;
    }

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    return `${basePath}${cleanPath}`;
};

export const generateClassCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 1, 0 to avoid confusion
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

export const NAME_MAX_LENGTH = 24;
export const PROFILE_NAME_MAX_LENGTH = 30;
export const PROFILE_NAME_MIN_LENGTH = 1;
const PROFILE_NAME_ALLOWED_REGEX = /^[0-9A-Za-zÀ-ÖØ-öø-ÿĀ-žƀ-ɏ ]+$/;

export const sanitizeName = (value: string, maxLength = NAME_MAX_LENGTH) => {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
};

export const truncateName = (value: string, maxLength = NAME_MAX_LENGTH) => {
    const safe = String(value || '');
    if (safe.length <= maxLength) return safe;
    return `${safe.slice(0, maxLength).trimEnd()}…`;
};

export const sanitizeProfileName = (value: string, maxLength = PROFILE_NAME_MAX_LENGTH) => {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength);
};

export const isValidProfileName = (value: string, minLength = PROFILE_NAME_MIN_LENGTH, maxLength = PROFILE_NAME_MAX_LENGTH) => {
    const sanitized = sanitizeProfileName(value, maxLength);
    if (sanitized.length < minLength || sanitized.length > maxLength) return false;
    return PROFILE_NAME_ALLOWED_REGEX.test(sanitized);
};
