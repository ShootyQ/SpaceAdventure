export const getAssetPath = (path: string) => {
    const isProd = process.env.NODE_ENV === 'production';
    const basePath = isProd ? '/SpaceAdventure' : '';
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${basePath}${cleanPath}`;
};
