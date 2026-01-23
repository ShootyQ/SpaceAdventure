export const getAssetPath = (path: string) => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    
    // Client-side override for GitHub Pages if environment variables fail
    if (typeof window !== 'undefined' && window.location.hostname.includes('github.io')) {
        return `/SpaceAdventure${cleanPath}`;
    }

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || (process.env.NODE_ENV === 'production' ? '/SpaceAdventure' : '');
    return `${basePath}${cleanPath}`;
};
