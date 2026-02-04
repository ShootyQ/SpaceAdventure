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
