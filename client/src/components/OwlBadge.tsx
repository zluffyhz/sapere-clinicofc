import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Lock, Trophy } from "lucide-react";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: "bronze" | "silver" | "gold" | "platinum" | "diamond";
  unlocked: boolean;
  progress?: number;
  target?: number;
}

// SVG Owl components for each tier
const BronzeOwl = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Body */}
    <ellipse cx="50" cy="58" rx="28" ry="32" fill="url(#bronzeGradient)" />
    {/* Chest pattern */}
    <ellipse cx="50" cy="65" rx="18" ry="20" fill="#D4A574" opacity="0.6" />
    <path d="M40 60 Q50 75 60 60" stroke="#8B6914" strokeWidth="1.5" fill="none" />
    <path d="M42 67 Q50 80 58 67" stroke="#8B6914" strokeWidth="1.5" fill="none" />
    {/* Head */}
    <circle cx="50" cy="32" r="22" fill="url(#bronzeGradient)" />
    {/* Ears/Tufts */}
    <path d="M30 18 Q28 8 35 15 Q32 12 30 18" fill="#CD7F32" />
    <path d="M70 18 Q72 8 65 15 Q68 12 70 18" fill="#CD7F32" />
    {/* Eye circles */}
    <circle cx="40" cy="30" r="10" fill="#FFF8E7" stroke="#8B6914" strokeWidth="1.5" />
    <circle cx="60" cy="30" r="10" fill="#FFF8E7" stroke="#8B6914" strokeWidth="1.5" />
    {/* Pupils */}
    <circle cx="40" cy="30" r="5" fill="#2D1810" />
    <circle cx="60" cy="30" r="5" fill="#2D1810" />
    {/* Eye shine */}
    <circle cx="42" cy="28" r="2" fill="white" />
    <circle cx="62" cy="28" r="2" fill="white" />
    {/* Beak */}
    <path d="M50 38 L46 44 L50 48 L54 44 Z" fill="#F4A460" stroke="#8B6914" strokeWidth="1" />
    {/* Wings */}
    <ellipse cx="25" cy="55" rx="8" ry="18" fill="#B8860B" transform="rotate(-15 25 55)" />
    <ellipse cx="75" cy="55" rx="8" ry="18" fill="#B8860B" transform="rotate(15 75 55)" />
    {/* Feet */}
    <path d="M40 88 L38 95 M40 88 L40 95 M40 88 L42 95" stroke="#F4A460" strokeWidth="2" strokeLinecap="round" />
    <path d="M60 88 L58 95 M60 88 L60 95 M60 88 L62 95" stroke="#F4A460" strokeWidth="2" strokeLinecap="round" />
    <defs>
      <linearGradient id="bronzeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#CD7F32" />
        <stop offset="50%" stopColor="#B8860B" />
        <stop offset="100%" stopColor="#8B6914" />
      </linearGradient>
    </defs>
  </svg>
);

const SilverOwl = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Glow effect for metallic silver shine */}
    <circle cx="50" cy="50" r="48" fill="url(#silverGlow)" opacity="0.5" />
    {/* Body */}
    <ellipse cx="50" cy="58" rx="28" ry="32" fill="url(#silverGradient)" />
    {/* Metallic shine lines on body */}
    <ellipse cx="35" cy="50" rx="4" ry="18" fill="white" opacity="0.4" transform="rotate(-10 35 50)" />
    <ellipse cx="65" cy="55" rx="3" ry="12" fill="white" opacity="0.2" transform="rotate(10 65 55)" />
    {/* Chest pattern */}
    <ellipse cx="50" cy="65" rx="18" ry="20" fill="#F5F5F5" opacity="0.9" />
    <path d="M40 60 Q50 75 60 60" stroke="#9CA3AF" strokeWidth="1.5" fill="none" />
    <path d="M42 67 Q50 80 58 67" stroke="#9CA3AF" strokeWidth="1.5" fill="none" />
    {/* Sparkle effects - more prominent */}
    <circle cx="28" cy="42" r="2" fill="white" opacity="1" />
    <circle cx="72" cy="48" r="1.5" fill="white" opacity="0.9" />
    <circle cx="55" cy="72" r="1.5" fill="white" opacity="0.8" />
    <circle cx="40" cy="80" r="1" fill="white" opacity="0.7" />
    {/* Head */}
    <circle cx="50" cy="32" r="22" fill="url(#silverGradient)" />
    {/* Metallic shine on head - more visible */}
    <ellipse cx="38" cy="24" rx="6" ry="10" fill="white" opacity="0.35" />
    {/* Ears/Tufts with silver tint */}
    <path d="M30 18 Q28 8 35 15 Q32 12 30 18" fill="#D1D5DB" />
    <path d="M70 18 Q72 8 65 15 Q68 12 70 18" fill="#D1D5DB" />
    {/* Eye circles with bright fill */}
    <circle cx="40" cy="30" r="10" fill="#FAFAFA" stroke="#9CA3AF" strokeWidth="2" />
    <circle cx="60" cy="30" r="10" fill="#FAFAFA" stroke="#9CA3AF" strokeWidth="2" />
    {/* Pupils */}
    <circle cx="40" cy="30" r="5" fill="#1a1a2e" />
    <circle cx="60" cy="30" r="5" fill="#1a1a2e" />
    {/* Eye shine - multiple for sparkle */}
    <circle cx="42" cy="28" r="2.5" fill="white" />
    <circle cx="62" cy="28" r="2.5" fill="white" />
    <circle cx="38" cy="32" r="1.2" fill="white" opacity="0.7" />
    <circle cx="58" cy="32" r="1.2" fill="white" opacity="0.7" />
    {/* Beak with silver tint */}
    <path d="M50 38 L46 44 L50 48 L54 44 Z" fill="#D1D5DB" stroke="#9CA3AF" strokeWidth="1" />
    {/* Wings with gradient */}
    <ellipse cx="25" cy="55" rx="8" ry="18" fill="url(#silverWingGradient)" transform="rotate(-15 25 55)" />
    <ellipse cx="75" cy="55" rx="8" ry="18" fill="url(#silverWingGradient)" transform="rotate(15 75 55)" />
    {/* Star decoration - brighter silver */}
    <path d="M50 10 L52 15 L57 15 L53 18.5 L55 24 L50 20.5 L45 24 L47 18.5 L43 15 L48 15 Z" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="0.5" />
    {/* Feet */}
    <path d="M40 88 L38 95 M40 88 L40 95 M40 88 L42 95" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" />
    <path d="M60 88 L58 95 M60 88 L60 95 M60 88 L62 95" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" />
    <defs>
      <linearGradient id="silverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F9FAFB" />
        <stop offset="25%" stopColor="#E5E7EB" />
        <stop offset="50%" stopColor="#D1D5DB" />
        <stop offset="75%" stopColor="#9CA3AF" />
        <stop offset="100%" stopColor="#6B7280" />
      </linearGradient>
      <linearGradient id="silverWingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E5E7EB" />
        <stop offset="100%" stopColor="#6B7280" />
      </linearGradient>
      <radialGradient id="silverGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#F9FAFB" />
        <stop offset="50%" stopColor="#D1D5DB" stopOpacity="0.5" />
        <stop offset="100%" stopColor="transparent" />
      </radialGradient>
    </defs>
  </svg>
);

const GoldOwl = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Strong golden glow effect */}
    <circle cx="50" cy="50" r="48" fill="url(#goldGlow)" opacity="0.6" />
    {/* Body */}
    <ellipse cx="50" cy="58" rx="28" ry="32" fill="url(#goldGradient)" />
    {/* Metallic shine on body */}
    <ellipse cx="35" cy="50" rx="4" ry="16" fill="#FFFACD" opacity="0.5" transform="rotate(-10 35 50)" />
    {/* Chest pattern */}
    <ellipse cx="50" cy="65" rx="18" ry="20" fill="#FFE082" opacity="0.9" />
    <path d="M40 60 Q50 75 60 60" stroke="#D4A000" strokeWidth="1.5" fill="none" />
    <path d="M42 67 Q50 80 58 67" stroke="#D4A000" strokeWidth="1.5" fill="none" />
    {/* Gold sparkles */}
    <circle cx="30" cy="45" r="2" fill="#FFFACD" opacity="1" />
    <circle cx="70" cy="50" r="1.5" fill="#FFFACD" opacity="0.9" />
    <circle cx="55" cy="75" r="1.5" fill="#FFFACD" opacity="0.8" />
    {/* Head */}
    <circle cx="50" cy="32" r="22" fill="url(#goldGradient)" />
    {/* Metallic shine on head */}
    <ellipse cx="38" cy="24" rx="5" ry="9" fill="#FFFACD" opacity="0.4" />
    {/* Crown - more elaborate */}
    <path d="M33 16 L36 4 L43 12 L50 0 L57 12 L64 4 L67 16" fill="url(#goldGradient)" stroke="#D4A000" strokeWidth="1.5" />
    {/* Crown jewels */}
    <circle cx="50" cy="5" r="3" fill="#FF6B6B" />
    <circle cx="38" cy="9" r="2" fill="#FFFACD" />
    <circle cx="62" cy="9" r="2" fill="#FFFACD" />
    {/* Eye circles */}
    <circle cx="40" cy="30" r="10" fill="#FFFDE7" stroke="#D4A000" strokeWidth="2" />
    <circle cx="60" cy="30" r="10" fill="#FFFDE7" stroke="#D4A000" strokeWidth="2" />
    {/* Pupils */}
    <circle cx="40" cy="30" r="5" fill="#2D1810" />
    <circle cx="60" cy="30" r="5" fill="#2D1810" />
    {/* Eye shine - multiple */}
    <circle cx="42" cy="28" r="2.5" fill="white" />
    <circle cx="62" cy="28" r="2.5" fill="white" />
    <circle cx="38" cy="32" r="1" fill="white" opacity="0.6" />
    <circle cx="58" cy="32" r="1" fill="white" opacity="0.6" />
    {/* Beak */}
    <path d="M50 38 L46 44 L50 48 L54 44 Z" fill="#FFB300" stroke="#D4A000" strokeWidth="1" />
    {/* Wings with gradient */}
    <ellipse cx="25" cy="55" rx="8" ry="18" fill="url(#goldWingGradient)" transform="rotate(-15 25 55)" />
    <ellipse cx="75" cy="55" rx="8" ry="18" fill="url(#goldWingGradient)" transform="rotate(15 75 55)" />
    {/* Feet */}
    <path d="M40 88 L38 95 M40 88 L40 95 M40 88 L42 95" stroke="#FFB300" strokeWidth="2" strokeLinecap="round" />
    <path d="M60 88 L58 95 M60 88 L60 95 M60 88 L62 95" stroke="#FFB300" strokeWidth="2" strokeLinecap="round" />
    <defs>
      <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFE082" />
        <stop offset="25%" stopColor="#FFD54F" />
        <stop offset="50%" stopColor="#FFCA28" />
        <stop offset="75%" stopColor="#FFB300" />
        <stop offset="100%" stopColor="#FFA000" />
      </linearGradient>
      <linearGradient id="goldWingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFD54F" />
        <stop offset="100%" stopColor="#FFA000" />
      </linearGradient>
      <radialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FFD54F" />
        <stop offset="50%" stopColor="#FFCA28" stopOpacity="0.5" />
        <stop offset="100%" stopColor="transparent" />
      </radialGradient>
    </defs>
  </svg>
);

const PlatinumOwl = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Glow effect */}
    <circle cx="50" cy="50" r="48" fill="url(#platinumGlow)" opacity="0.4" />
    {/* Body */}
    <ellipse cx="50" cy="58" rx="28" ry="32" fill="url(#platinumGradient)" />
    {/* Chest pattern with sparkles */}
    <ellipse cx="50" cy="65" rx="18" ry="20" fill="#E0FFFF" opacity="0.7" />
    <path d="M40 60 Q50 75 60 60" stroke="#5F9EA0" strokeWidth="1.5" fill="none" />
    <path d="M42 67 Q50 80 58 67" stroke="#5F9EA0" strokeWidth="1.5" fill="none" />
    {/* Sparkles on body */}
    <circle cx="45" cy="70" r="1.5" fill="white" opacity="0.8" />
    <circle cx="55" cy="65" r="1" fill="white" opacity="0.8" />
    <circle cx="48" cy="58" r="1.2" fill="white" opacity="0.8" />
    {/* Head */}
    <circle cx="50" cy="32" r="22" fill="url(#platinumGradient)" />
    {/* Elegant crown with gems */}
    <path d="M32 18 L36 6 L42 14 L50 0 L58 14 L64 6 L68 18" fill="url(#platinumGradient)" stroke="#00CED1" strokeWidth="1.5" />
    <circle cx="50" cy="6" r="3" fill="#00FFFF" />
    <circle cx="38" cy="10" r="2" fill="#E0FFFF" />
    <circle cx="62" cy="10" r="2" fill="#E0FFFF" />
    {/* Eye circles */}
    <circle cx="40" cy="30" r="10" fill="#F0FFFF" stroke="#5F9EA0" strokeWidth="1.5" />
    <circle cx="60" cy="30" r="10" fill="#F0FFFF" stroke="#5F9EA0" strokeWidth="1.5" />
    {/* Pupils */}
    <circle cx="40" cy="30" r="5" fill="#1a1a2e" />
    <circle cx="60" cy="30" r="5" fill="#1a1a2e" />
    {/* Eye shine */}
    <circle cx="42" cy="28" r="2" fill="white" />
    <circle cx="62" cy="28" r="2" fill="white" />
    {/* Beak */}
    <path d="M50 38 L46 44 L50 48 L54 44 Z" fill="#B0E0E6" stroke="#5F9EA0" strokeWidth="1" />
    {/* Wings with feather details */}
    <ellipse cx="25" cy="55" rx="8" ry="18" fill="#87CEEB" transform="rotate(-15 25 55)" />
    <ellipse cx="75" cy="55" rx="8" ry="18" fill="#87CEEB" transform="rotate(15 75 55)" />
    {/* Feet */}
    <path d="M40 88 L38 95 M40 88 L40 95 M40 88 L42 95" stroke="#B0E0E6" strokeWidth="2" strokeLinecap="round" />
    <path d="M60 88 L58 95 M60 88 L60 95 M60 88 L62 95" stroke="#B0E0E6" strokeWidth="2" strokeLinecap="round" />
    <defs>
      <linearGradient id="platinumGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E0FFFF" />
        <stop offset="50%" stopColor="#87CEEB" />
        <stop offset="100%" stopColor="#5F9EA0" />
      </linearGradient>
      <radialGradient id="platinumGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#00FFFF" />
        <stop offset="100%" stopColor="transparent" />
      </radialGradient>
    </defs>
  </svg>
);

const DiamondOwl = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Rainbow glow effect */}
    <circle cx="50" cy="50" r="48" fill="url(#diamondGlow)" opacity="0.5" />
    {/* Sparkle particles */}
    <circle cx="20" cy="25" r="2" fill="white" opacity="0.9">
      <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.5s" repeatCount="indefinite" />
    </circle>
    <circle cx="80" cy="30" r="1.5" fill="white" opacity="0.8">
      <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite" />
    </circle>
    <circle cx="15" cy="70" r="1.5" fill="white" opacity="0.7">
      <animate attributeName="opacity" values="0.7;0.2;0.7" dur="1.8s" repeatCount="indefinite" />
    </circle>
    <circle cx="85" cy="75" r="2" fill="white" opacity="0.9">
      <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.3s" repeatCount="indefinite" />
    </circle>
    {/* Body */}
    <ellipse cx="50" cy="58" rx="28" ry="32" fill="url(#diamondGradient)" />
    {/* Chest pattern with rainbow shimmer */}
    <ellipse cx="50" cy="65" rx="18" ry="20" fill="url(#rainbowShimmer)" opacity="0.6" />
    <path d="M40 60 Q50 75 60 60" stroke="#9370DB" strokeWidth="1.5" fill="none" />
    <path d="M42 67 Q50 80 58 67" stroke="#9370DB" strokeWidth="1.5" fill="none" />
    {/* Sparkles on body */}
    <circle cx="45" cy="70" r="2" fill="white" opacity="0.9" />
    <circle cx="55" cy="65" r="1.5" fill="white" opacity="0.9" />
    <circle cx="48" cy="58" r="1.8" fill="white" opacity="0.9" />
    <circle cx="52" cy="75" r="1.2" fill="white" opacity="0.8" />
    {/* Head */}
    <circle cx="50" cy="32" r="22" fill="url(#diamondGradient)" />
    {/* Majestic crown with diamond */}
    <path d="M30 20 L34 5 L42 15 L50 -2 L58 15 L66 5 L70 20" fill="url(#diamondGradient)" stroke="#BA55D3" strokeWidth="2" />
    {/* Large diamond on crown */}
    <path d="M50 -2 L44 8 L50 14 L56 8 Z" fill="url(#diamondGem)" stroke="white" strokeWidth="0.5" />
    <circle cx="36" cy="10" r="2.5" fill="#FF69B4" />
    <circle cx="64" cy="10" r="2.5" fill="#87CEEB" />
    {/* Eye circles with rainbow reflection */}
    <circle cx="40" cy="30" r="10" fill="#FFF0F5" stroke="#9370DB" strokeWidth="2" />
    <circle cx="60" cy="30" r="10" fill="#FFF0F5" stroke="#9370DB" strokeWidth="2" />
    {/* Pupils with star */}
    <circle cx="40" cy="30" r="5" fill="#1a1a2e" />
    <circle cx="60" cy="30" r="5" fill="#1a1a2e" />
    {/* Eye shine - multiple for sparkle effect */}
    <circle cx="42" cy="28" r="2" fill="white" />
    <circle cx="62" cy="28" r="2" fill="white" />
    <circle cx="38" cy="32" r="1" fill="white" opacity="0.6" />
    <circle cx="58" cy="32" r="1" fill="white" opacity="0.6" />
    {/* Beak */}
    <path d="M50 38 L46 44 L50 48 L54 44 Z" fill="#DDA0DD" stroke="#9370DB" strokeWidth="1" />
    {/* Wings with gradient */}
    <ellipse cx="25" cy="55" rx="8" ry="18" fill="url(#wingGradient)" transform="rotate(-15 25 55)" />
    <ellipse cx="75" cy="55" rx="8" ry="18" fill="url(#wingGradient)" transform="rotate(15 75 55)" />
    {/* Feet */}
    <path d="M40 88 L38 95 M40 88 L40 95 M40 88 L42 95" stroke="#DDA0DD" strokeWidth="2" strokeLinecap="round" />
    <path d="M60 88 L58 95 M60 88 L60 95 M60 88 L62 95" stroke="#DDA0DD" strokeWidth="2" strokeLinecap="round" />
    <defs>
      <linearGradient id="diamondGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E6E6FA" />
        <stop offset="25%" stopColor="#DDA0DD" />
        <stop offset="50%" stopColor="#DA70D6" />
        <stop offset="75%" stopColor="#BA55D3" />
        <stop offset="100%" stopColor="#9370DB" />
      </linearGradient>
      <linearGradient id="rainbowShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FF69B4" />
        <stop offset="25%" stopColor="#FFD700" />
        <stop offset="50%" stopColor="#98FB98" />
        <stop offset="75%" stopColor="#87CEEB" />
        <stop offset="100%" stopColor="#DDA0DD" />
      </linearGradient>
      <linearGradient id="diamondGem" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="white" />
        <stop offset="50%" stopColor="#E0FFFF" />
        <stop offset="100%" stopColor="#87CEEB" />
      </linearGradient>
      <linearGradient id="wingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#DDA0DD" />
        <stop offset="100%" stopColor="#9370DB" />
      </linearGradient>
      <radialGradient id="diamondGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FF69B4" />
        <stop offset="33%" stopColor="#87CEEB" />
        <stop offset="66%" stopColor="#DDA0DD" />
        <stop offset="100%" stopColor="transparent" />
      </radialGradient>
    </defs>
  </svg>
);

const owlComponents = {
  bronze: BronzeOwl,
  silver: SilverOwl,
  gold: GoldOwl,
  platinum: PlatinumOwl,
  diamond: DiamondOwl,
};

const tierConfig = {
  bronze: {
    bg: "bg-gradient-to-br from-amber-100 to-amber-200",
    border: "border-amber-400",
    shadow: "shadow-amber-200",
    label: "Bronze",
    labelBg: "bg-amber-100 text-amber-800",
  },
  silver: {
    bg: "bg-gradient-to-br from-slate-100 via-gray-200 to-slate-300",
    border: "border-slate-400",
    shadow: "shadow-slate-300",
    label: "Prata",
    labelBg: "bg-slate-200 text-slate-700",
  },
  gold: {
    bg: "bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-400",
    border: "border-yellow-500",
    shadow: "shadow-yellow-400/50",
    label: "Ouro",
    labelBg: "bg-yellow-300 text-yellow-900",
  },
  platinum: {
    bg: "bg-gradient-to-br from-cyan-100 to-teal-200",
    border: "border-cyan-400",
    shadow: "shadow-cyan-200",
    label: "Platina",
    labelBg: "bg-cyan-100 text-cyan-800",
  },
  diamond: {
    bg: "bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100",
    border: "border-purple-400",
    shadow: "shadow-purple-200",
    label: "Diamante",
    labelBg: "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800",
  },
};

export function OwlBadge({ badge }: { badge: Badge }) {
  const config = tierConfig[badge.tier];
  const OwlComponent = owlComponents[badge.tier];

  if (!badge.unlocked) {
    return (
      <div className="relative group h-full">
        <div className="flex flex-col items-center p-4 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 opacity-50 hover:opacity-70 transition-all duration-300 h-full min-h-[220px]">
          <div className="relative w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mb-3 flex-shrink-0">
            <Lock className="w-8 h-8 text-gray-400" />
          </div>
          <span className="text-sm font-semibold text-gray-500 text-center line-clamp-2">{badge.name}</span>
          <span className="text-xs text-gray-400 text-center mt-1 px-2 line-clamp-2 flex-grow">{badge.description}</span>
          
          {badge.progress !== undefined && badge.target !== undefined && (
            <div className="w-full mt-auto pt-3 px-2">
              <Progress 
                value={(badge.progress / badge.target) * 100} 
                className="h-2"
              />
              <span className="text-xs text-gray-500 mt-1 block text-center font-medium">
                {badge.progress} / {badge.target}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative group h-full">
      <div 
        className={cn(
          "flex flex-col items-center p-4 rounded-2xl border-2 transition-all duration-300 h-full min-h-[220px]",
          "hover:scale-105 hover:shadow-xl",
          config.bg,
          config.border,
          "shadow-lg",
          config.shadow
        )}
      >
        {/* Owl Badge */}
        <div className="relative w-20 h-20 mb-3 transform transition-transform duration-300 group-hover:scale-110 flex-shrink-0">
          <OwlComponent className="w-full h-full drop-shadow-lg" />
        </div>

        {/* Badge Name */}
        <span className="text-sm font-bold text-gray-800 text-center leading-tight line-clamp-2">
          {badge.name}
        </span>
        
        {/* Badge Description */}
        <span className="text-xs text-gray-600 text-center mt-1 px-2 leading-tight line-clamp-2 flex-grow">
          {badge.description}
        </span>

        {/* Tier Label */}
        <div className={cn(
          "mt-auto pt-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide",
          config.labelBg
        )}>
          {config.label}
        </div>
      </div>
    </div>
  );
}

export function OwlBadgeGrid({ badges }: { badges: Badge[] }) {
  const unlockedBadges = badges.filter(b => b.unlocked);
  const lockedBadges = badges.filter(b => !b.unlocked);

  return (
    <div className="space-y-8">
      {/* Unlocked Badges */}
      {unlockedBadges.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Conquistas Desbloqueadas ({unlockedBadges.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {unlockedBadges.map((badge) => (
              <OwlBadge key={badge.id} badge={badge} />
            ))}
          </div>
        </div>
      )}

      {/* Locked Badges */}
      {lockedBadges.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-500 mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Próximas Conquistas
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {lockedBadges.slice(0, 4).map((badge) => (
              <OwlBadge key={badge.id} badge={badge} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
