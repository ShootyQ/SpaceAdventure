export const getAssetPath = (path: string) => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    
    // Use absolute URL for GitHub Pages to ensure correct loading
    if (typeof window !== 'undefined' && window.location.hostname.includes('github.io')) {
        return `https://shootyq.github.io/SpaceAdventure${cleanPath}`;
    }

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    return `${basePath}${cleanPath}`;
};
