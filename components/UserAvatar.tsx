import { getAssetPath } from "@/lib/utils";

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
        style: 'scale-[0.85] -translate-y-[45%]' // Fedora positioning
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
    className = "" 
}: UserAvatarProps) => {
    // Determine values: prefers direct props if provided (overriding userData), 
    // OR falls back to userData, OR falls back to defaults.
    // Wait, typically specific props should override userData, but here I might use this component 
    // where I pass `userData` OR individual props (like in the editor preview).
    
    const finalHue = hue ?? userData?.avatar?.hue ?? 0;
    const finalSkinHue = skinHue ?? userData?.avatar?.skinHue ?? 0;
    const finalBgHue = bgHue ?? userData?.avatar?.bgHue ?? 260;
    const finalBgSat = bgSat ?? userData?.avatar?.bgSat ?? 50;
    const finalBgLight = bgLight ?? userData?.avatar?.bgLight ?? 20;
    
    // Hat logic: check direct prop, then userData locations
    const finalHat = hat ?? userData?.activeHat ?? userData?.avatar?.activeHat ?? userData?.avatar?.hat ?? 'none';
    
    const hatOption = HAT_OPTIONS.find(h => h.id === finalHat);
    const hatSrc = hatOption?.src;
    const hatStyle = hatOption?.style || "scale-100";
    
    return (
       <div className={`relative ${className}`} style={{ backgroundColor: `hsl(${finalBgHue}, ${finalBgSat}%, ${finalBgLight}%)` }}>
            <div className="absolute inset-0 z-0" style={{ backgroundColor: `hsl(${finalSkinHue}, 70%, 50%)`, maskImage: `url(${getAssetPath('/images/avatar/spacebunny.png')})`, WebkitMaskImage: `url(${getAssetPath('/images/avatar/spacebunny.png')})`, maskSize: 'cover' }} />
            <img src={getAssetPath("/images/avatar/spacebunny.png")} alt="Avatar" className="w-full h-full object-cover relative z-10" style={{ filter: `hue-rotate(${finalHue}deg)` }} />
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
