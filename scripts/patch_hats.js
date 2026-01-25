const fs = require('fs');
const path = require('path');

const filePath = path.join('app', 'student', 'settings', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The new HAT_OPTIONS and AvatarConfigView code
const newCode = `const HAT_OPTIONS = [
    { id: 'none', name: 'No Hat', src: '' },
    { id: 'hat1', name: 'Hat 1', src: '/images/hats/hat1.png' },
    { id: 'hat2', name: 'Hat 2', src: '/images/hats/hat2.png' },
];

function AvatarConfigView({ onBack }: { onBack: () => void }) {
    const { userData, user } = useAuth();
    const [hue, setHue] = useState(0);
    const [skinHue, setSkinHue] = useState(0);
    const [bgHue, setBgHue] = useState(260); // Default purple
    const [bgSat, setBgSat] = useState(50);
    const [bgLight, setBgLight] = useState(20);
    const [activeHat, setActiveHat] = useState<string>('none');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (userData?.avatar) {
            if (userData.avatar.hue !== undefined) setHue(userData.avatar.hue);
            if (userData.avatar.skinHue !== undefined) setSkinHue(userData.avatar.skinHue);
            if (userData.avatar.bgHue !== undefined) setBgHue(userData.avatar.bgHue);
            if (userData.avatar.bgSat !== undefined) setBgSat(userData.avatar.bgSat);
            if (userData.avatar.bgLight !== undefined) setBgLight(userData.avatar.bgLight);
            if (userData.avatar.activeHat !== undefined) setActiveHat(userData.avatar.activeHat);
        }
    }, [userData]);

    const handleSelectHat = async (hatId: string) => {
        if (!user) return;
        setLoading(true);
        setActiveHat(hatId);
        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                "avatar.activeHat": hatId
            });
        } catch (e) {
            console.error("Error setting hat", e);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                "avatar.hue": hue,
                "avatar.skinHue": skinHue,
                "avatar.bgHue": bgHue,
                "avatar.bgSat": bgSat,
                "avatar.bgLight": bgLight,
                "avatar.activeHat": activeHat
            });
            onBack();
        } catch (e) {
            console.error(e);
            alert("Error saving DNA sequence.");
        }
        setLoading(false);
    };

    return (
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border border-purple-500/30 bg-black/40 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[400px] relative">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/20 to-transparent pointer-events-none" />
                 
                 <div className="relative w-64 h-64 rounded-full border-4 border-purple-500/50 overflow-visible flex items-center justify-center transition-colors duration-300 ring-4 ring-purple-900/30 shadow-[0_0_50px_rgba(168,85,247,0.4)]"
                      style={{ backgroundColor: \`hsl(\${bgHue}, \${bgSat}%, \${bgLight}%)\` }}
                 >
                    {/* Skin Tint Layer - Masked to bunny shape */}
                    <div 
                        className="absolute inset-0 z-0"
                        style={{ 
                            backgroundColor: \`hsl(\${skinHue}, 70%, 50%)\`,
                            opacity: skinHue === 0 ? 0 : 0.6,
                            maskImage: \`url(\${getAssetPath('/images/avatar/spacebunny.png')})\`,
                            WebkitMaskImage: \`url(\${getAssetPath('/images/avatar/spacebunny.png')})\`,
                            maskSize: 'cover',
                            WebkitMaskSize: 'cover'
                        }} 
                    />
                    
                    {/* Avatar Image */}
                    <img 
                        src={getAssetPath("/images/avatar/spacebunny.png")}
                        alt="Avatar" 
                        className="w-full h-full object-cover relative z-10"
                        style={{ 
                            filter: \`hue-rotate(\${hue}deg)\`
                        }}
                    />

                    {/* Accessories Layer */}
                    {activeHat !== 'none' && HAT_OPTIONS.find(h => h.id === activeHat)?.src ? (
                        <div className="absolute -top-16 left-0 right-0 z-20 flex justify-center pointer-events-none">
                             <img 
                                src={getAssetPath(HAT_OPTIONS.find(h => h.id === activeHat)?.src || '')} 
                                alt="Hat" 
                                className="w-32 h-32 object-contain filter drop-shadow-xl" 
                             />
                        </div>
                    ) : null}
                 </div>

                 <div className="mt-8 text-center">
                    <h3 className="text-xl font-bold text-purple-400 uppercase tracking-widest mb-1">Preview</h3>
                    <p className="text-purple-300/60 text-sm font-mono">{activeHat !== 'none' ? HAT_OPTIONS.find(h => h.id === activeHat)?.name : 'Standard Uniform'}</p>
                 </div>
            </div>

            <div className="space-y-6 max-h-[700px] overflow-y-auto custom-scrollbar pr-2">
                <div className="bg-purple-950/20 p-6 rounded-xl border border-purple-500/20">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Palette size={20} className="text-purple-400" />
                        <span className="uppercase tracking-wider">Appearance</span>
                    </h3>

                    <div className="space-y-6">
                         {/* Background Slider */}
                         <div className="space-y-2">
                            <label className="block text-sm text-purple-400 uppercase tracking-wide">
                                Background Tint
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="360"
                                value={bgHue}
                                onChange={(e) => setBgHue(parseInt(e.target.value))}
                                className="w-full accent-purple-500 h-2 bg-purple-900/50 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        {/* Skin Slider */}
                        <div className="space-y-2">
                            <label className="block text-sm text-purple-400 uppercase tracking-wide">
                                Suit / Skin Tone
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="360"
                                value={skinHue}
                                onChange={(e) => setSkinHue(parseInt(e.target.value))}
                                className="w-full accent-pink-500 h-2 bg-purple-900/50 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        {/* Aura Slider */}
                        <div className="space-y-2">
                            <label className="block text-sm text-purple-400 uppercase tracking-wide">
                                Suit Outline / Visor
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="360"
                                value={hue}
                                onChange={(e) => setHue(parseInt(e.target.value))}
                                className="w-full accent-purple-500 h-2 bg-purple-900/50 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-purple-950/20 p-6 rounded-xl border border-purple-500/20">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Crown size={20} className="text-yellow-400" />
                            <span className="uppercase tracking-wider">Accessory Vendor</span>
                        </h3>
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                        {HAT_OPTIONS.map(h => {
                             const isActive = activeHat === h.id;

                             return (
                                <button 
                                    key={h.id}
                                    onClick={() => handleSelectHat(h.id)}
                                    className={\`relative p-3 rounded-lg border flex flex-col items-center gap-2 transition-all \${
                                        isActive
                                        ? 'bg-purple-600/30 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
                                        : 'bg-black/60 border-white/10 opacity-70 hover:opacity-100'
                                    }\`}
                                >
                                    {h.src ? (
                                        <img src={getAssetPath(h.src)} alt={h.name} className="w-12 h-12 object-contain" />
                                    ) : (
                                       <div className="text-4xl text-gray-500">🚫</div>
                                    )}
                                    <div className="text-[10px] font-bold uppercase text-center w-full truncate">{h.name}</div>
                                    
                                    {isActive && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-green-400 rounded-full shadow-[0_0_5px_currentColor]" />}
                                </button>
                             );
                        })}
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={onBack}
                        className="flex-1 py-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-white uppercase tracking-widest font-bold transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-1 py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-black uppercase tracking-widest font-bold transition-all shadow-[0_0_20px_rgba(147,51,234,0.4)]"
                    >
                        {loading ? "Saving..." : "Save Look"}
                    </button>
                </div>
            </div>
        </div>
    );
}`;

// Splice logic
const startMarker = 'const HAT_OPTIONS = [';
const endMarker = 'function AvatarView({';

const startIndex = content.indexOf(startMarker);
console.log('Start index:', startIndex);

const endIndex = content.indexOf(endMarker);
console.log('End index:', endIndex);

if (startIndex !== -1 && endIndex !== -1) {
    const header = content.substring(0, startIndex);
    const footer = content.substring(endIndex);
    const final = header + newCode + '\n\n' + footer;
    fs.writeFileSync(filePath, final, 'utf8');
    console.log('Patched page.tsx successfully.');
} else {
    console.error('Could not find markers.');
}
