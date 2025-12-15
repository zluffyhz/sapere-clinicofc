import { 
  Flame, 
  Trophy, 
  Crown, 
  Star, 
  Target, 
  TrendingUp, 
  Award, 
  Medal,
  CalendarCheck,
  Lock
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

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

const tierColors = {
  bronze: {
    bg: "bg-gradient-to-br from-amber-600 to-amber-800",
    border: "border-amber-500",
    glow: "shadow-amber-500/30",
    text: "text-amber-100",
  },
  silver: {
    bg: "bg-gradient-to-br from-gray-300 to-gray-500",
    border: "border-gray-400",
    glow: "shadow-gray-400/30",
    text: "text-gray-100",
  },
  gold: {
    bg: "bg-gradient-to-br from-yellow-400 to-yellow-600",
    border: "border-yellow-400",
    glow: "shadow-yellow-400/40",
    text: "text-yellow-100",
  },
  platinum: {
    bg: "bg-gradient-to-br from-cyan-300 to-cyan-600",
    border: "border-cyan-400",
    glow: "shadow-cyan-400/40",
    text: "text-cyan-100",
  },
  diamond: {
    bg: "bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400",
    border: "border-purple-400",
    glow: "shadow-purple-400/50",
    text: "text-white",
  },
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  flame: Flame,
  trophy: Trophy,
  crown: Crown,
  star: Star,
  target: Target,
  "trending-up": TrendingUp,
  award: Award,
  medal: Medal,
  "calendar-check": CalendarCheck,
};

export function AchievementBadge({ badge }: { badge: Badge }) {
  const colors = tierColors[badge.tier];
  const IconComponent = iconMap[badge.icon] || Star;

  if (!badge.unlocked) {
    return (
      <div className="relative group">
        <div className="flex flex-col items-center p-4 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 opacity-60 hover:opacity-80 transition-opacity">
          <div className="relative w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-2">
            <Lock className="w-6 h-6 text-gray-400" />
          </div>
          <span className="text-sm font-medium text-gray-500 text-center">{badge.name}</span>
          <span className="text-xs text-gray-400 text-center mt-1">{badge.description}</span>
          
          {badge.progress !== undefined && badge.target !== undefined && (
            <div className="w-full mt-3">
              <Progress 
                value={(badge.progress / badge.target) * 100} 
                className="h-2"
              />
              <span className="text-xs text-gray-500 mt-1 block text-center">
                {badge.progress}/{badge.target}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">
      <div 
        className={cn(
          "flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-300 bg-white",
          "hover:scale-105 hover:shadow-lg",
          colors.border,
          "shadow-md",
          colors.glow
        )}
      >
        <div 
          className={cn(
            "relative w-16 h-16 rounded-full flex items-center justify-center mb-2",
            "shadow-lg transform transition-transform group-hover:rotate-12",
            colors.bg
          )}
        >
          <IconComponent className={cn("w-8 h-8", colors.text)} />
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/30 to-transparent" />
        </div>

        <span className="text-sm font-semibold text-gray-800 text-center">
          {badge.name}
        </span>
        
        <span className="text-xs text-gray-500 text-center mt-1">
          {badge.description}
        </span>

        <div className={cn(
          "mt-2 px-2 py-0.5 rounded-full text-xs font-medium capitalize",
          badge.tier === "bronze" && "bg-amber-100 text-amber-700",
          badge.tier === "silver" && "bg-gray-100 text-gray-700",
          badge.tier === "gold" && "bg-yellow-100 text-yellow-700",
          badge.tier === "platinum" && "bg-cyan-100 text-cyan-700",
          badge.tier === "diamond" && "bg-purple-100 text-purple-700",
        )}>
          {badge.tier === "diamond" ? "Diamante" : 
           badge.tier === "platinum" ? "Platina" :
           badge.tier === "gold" ? "Ouro" :
           badge.tier === "silver" ? "Prata" : "Bronze"}
        </div>
      </div>
    </div>
  );
}

export function AchievementGrid({ badges }: { badges: Badge[] }) {
  const unlockedBadges = badges.filter(b => b.unlocked);
  const lockedBadges = badges.filter(b => !b.unlocked);

  return (
    <div className="space-y-6">
      {unlockedBadges.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Conquistas Desbloqueadas ({unlockedBadges.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {unlockedBadges.map((badge) => (
              <AchievementBadge key={badge.id} badge={badge} />
            ))}
          </div>
        </div>
      )}

      {lockedBadges.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-500 mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Proximas Conquistas
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {lockedBadges.slice(0, 4).map((badge) => (
              <AchievementBadge key={badge.id} badge={badge} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
