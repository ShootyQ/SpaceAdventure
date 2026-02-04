import { getAssetPath } from "@/lib/utils";

export interface AvatarConfig {
    hue: number;
    skinHue: number;
    bgHue: number;
    bgSat: number;
    bgLight: number;
    activeHat: string;
    avatarId: string;
}

export const AVATAR_OPTIONS = [
    { id: 'bunny', name: 'Space Bunny', src: '/images/avatar/spacebunny.png' },
    { id: 'cat', name: 'Cosmic Cat', src: '/images/avatar/spacecat.png' },
    { id: 'raccoon', name: 'Rocket Raccoon', src: '/images/avatar/spaceraccoon.png' },
    { id: 'otter', name: 'Orbit Otter', src: '/images/avatar/spaceotter.png' },
    { id: 'pup', name: 'Pluto Pup', src: '/images/avatar/spacepup.png' },
];

export const AVATAR_PRESETS: { id: string, name: string, config: AvatarConfig }[] = [
    { id: 'p1', name: 'Cadet Blue', config: { hue: 0, skinHue: 200, bgHue: 240, bgSat: 60, bgLight: 50, activeHat: 'none', avatarId: 'bunny' } },
    { id: 'p2', name: 'Crimson Guard', config: { hue: 350, skinHue: 0, bgHue: 0, bgSat: 70, bgLight: 40, activeHat: 'none', avatarId: 'cat' } },
    { id: 'p3', name: 'Forest Ranger', config: { hue: 120, skinHue: 100, bgHue: 120, bgSat: 50, bgLight: 60, activeHat: 'none', avatarId: 'raccoon' } },
    { id: 'p4', name: 'Solar Pilot', config: { hue: 45, skinHue: 60, bgHue: 40, bgSat: 90, bgLight: 70, activeHat: 'none', avatarId: 'otter' } },
    { id: 'p5', name: 'Void Walker', config: { hue: 270, skinHue: 260, bgHue: 280, bgSat: 40, bgLight: 20, activeHat: 'none', avatarId: 'pup' } },
    { id: 'p6', name: 'Neon Scout', config: { hue: 180, skinHue: 300, bgHue: 320, bgSat: 100, bgLight: 50, activeHat: 'none', avatarId: 'cat' } },
    { id: 'p7', name: 'Rusty Mechanic', config: { hue: 25, skinHue: 30, bgHue: 15, bgSat: 50, bgLight: 40, activeHat: 'none', avatarId: 'raccoon' } },
    { id: 'p8', name: 'Ice Specialist', config: { hue: 190, skinHue: 180, bgHue: 200, bgSat: 70, bgLight: 90, activeHat: 'none', avatarId: 'bunny' } },
];

export const HAT_OPTIONS = [
    { 
        id: 'none', 
        name: 'No Hat', 
        src: '', 
        style: '' 
    },
    { 
        id: 'hat1', 
        name: 'Helmet', 
        src: '/images/hats/helmet1.png', 
        style: 'scale-[2.5] translate-y-[45%]' // Helmet positioning
    },
    { 
        id: 'hat2', 
        name: 'Fedora', 
        src: '/images/hats/hat2.png', 
        style: 'scale-[0.9] -translate-y-[40%]' // Fedora positioning
    },
    { 
        id: 'hat3', 
        name: 'Top Hat', 
        src: '/images/hats/tophat.png', 
        style: 'scale-[0.9] -translate-y-[40%]' 
    },
    { 
        id: 'hat4', 
        name: 'Cowboy Hat', 
        src: '/images/hats/cowboyhat.png', 
        style: 'scale-[0.9] -translate-y-[40%]' 
    },
    { 
        id: 'hat5', 
        name: 'Dungan Doves Cap', 
        src: '/images/hats/dungandoves.png', 
        style: 'scale-[0.9] -translate-y-[40%]' 
    },
];

interface UserAvatarProps {
    userData?: any;
    hue?: number;
    skinHue?: number;
    bgHue?: number;
    bgSat?: number;
    bgLight?: number;
    hat?: string;
    avatarId?: string;
    className?: string;
}

export const UserAvatar = ({ 
    userData, 
    hue, 
    skinHue, 
    bgHue, 
    bgSat, 
    bgLight, 
    hat, 
    avatarId,
    className = "" 
}: UserAvatarProps) => {
    // Determine values: prefers direct props if provided (overriding userData), 
    // OR falls back to userData, OR falls back to defaults.
    
    const finalHue = hue ?? userData?.avatar?.hue ?? 0;
    const finalSkinHue = skinHue ?? userData?.avatar?.skinHue ?? 0;
    const finalBgHue = bgHue ?? userData?.avatar?.bgHue ?? 260;
    const finalBgSat = bgSat ?? userData?.avatar?.bgSat ?? 50;
    const finalBgLight = bgLight ?? userData?.avatar?.bgLight ?? 20;

    // Avatar Base
    const finalAvatarId = avatarId ?? userData?.avatar?.avatarId ?? 'bunny';
    const avatarOption = AVATAR_OPTIONS.find(a => a.id === finalAvatarId) || AVATAR_OPTIONS[0];
    const avatarSrc = avatarOption?.src || '/images/avatar/spacebunny.png';
    
    // Hat logic: check direct prop, then userData locations
    const finalHat = hat ?? userData?.activeHat ?? userData?.avatar?.activeHat ?? userData?.avatar?.hat ?? 'none';
    
    const hatOption = HAT_OPTIONS.find(h => h.id === finalHat);
    const hatSrc = hatOption?.src;
    const hatStyle = hatOption?.style || "scale-100";
    
    return (
       <div className={`relative ${className}`} style={{ backgroundColor: `hsl(${finalBgHue}, ${finalBgSat}%, ${finalBgLight}%)` }}>
            <div className="absolute inset-0 z-0" style={{ backgroundColor: `hsl(${finalSkinHue}, 70%, 50%)`, maskImage: `url(${getAssetPath(avatarSrc)})`, WebkitMaskImage: `url(${getAssetPath(avatarSrc)})`, maskSize: 'cover' }} />
            <img src={getAssetPath(avatarSrc)} alt="Avatar" className="w-full h-full object-cover relative z-10" style={{ filter: `hue-rotate(${finalHue}deg)` }} />
            {hatSrc && (
                <img 
                    src={getAssetPath(hatSrc)} 
                    alt="Accessory" 
                    className={`absolute inset-0 z-20 w-full h-full object-cover pointer-events-none transition-transform ${hatStyle}`}
                    onError={(e) => console.error('Error loading hat:', hatSrc, getAssetPath(hatSrc))}
                />
            )}
       </div>
    );
};
