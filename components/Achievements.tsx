import React from 'react';
import { ACHIEVEMENTS_CONFIG } from '../constants';
import { StreakLog, Achievement } from '../types';

interface AchievementsProps {
    logs: StreakLog[];
}

// Robust date parser
const toDate = (val: any): Date => {
    if (!val) return new Date();
    if (val instanceof Date) return val;
    if (typeof val.toDate === 'function') return val.toDate(); // Firestore Timestamp
    if (typeof val === 'object' && 'seconds' in val) return new Date(val.seconds * 1000); // Plain object timestamp
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
};

export const Achievements: React.FC<AchievementsProps> = ({ logs }) => {
    // Find active log (current streak)
    const activeLog = logs.find(l => !l.endDate);

    // Calculate days for the current streak
    const currentStreakDays = activeLog ? (() => {
        const startMs = toDate(activeLog.startDate).getTime();
        const endMs = Date.now();
        return (endMs - startMs) / (1000 * 60 * 60 * 24);
    })() : 0;

    // Process achievement status
    const processedAchievements = ACHIEVEMENTS_CONFIG.map(ach => ({
        ...ach,
        unlocked: ach.days ? currentStreakDays >= ach.days : false
    }));

    const earned = processedAchievements.filter(a => a.unlocked);
    const unearned = processedAchievements.filter(a => !a.unlocked);

    const renderBadge = (ach: Achievement & { unlocked: boolean }) => (
        <div 
            key={ach.name} 
            className={`relative p-4 md:p-6 border transition-all duration-300 flex flex-col items-center text-center
            ${ach.unlocked 
                ? 'border-neon bg-neonDim/10 hover:shadow-[0_0_15px_rgba(39,255,71,0.2)] hover:scale-105' 
                : 'border-gray-800 bg-black opacity-60 grayscale'}`}
        >
            <div className={`text-4xl md:text-6xl mb-2 md:mb-4 ${ach.unlocked ? 'drop-shadow-[0_0_10px_#27ff47]' : ''}`}>
                {ach.icon}
            </div>
            <h3 className={`font-bold text-sm md:text-base ${ach.unlocked ? 'text-white' : 'text-gray-500'}`}>
                {ach.name}
            </h3>
            <p className="text-xs md:text-sm text-neon mt-2">+{ach.xp} XP</p>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="p-4 bg-black border border-neonDim text-base text-gray-400 font-mono">
                MEDALS REFLECT CURRENT ACTIVE STREAK STATUS ONLY.
            </div>

            {/* Earned Section */}
            <div>
                <h2 className="text-3xl font-bold border-b border-dashed border-neon pb-2 mb-6">ACQUIRED MEDALS</h2>
                {earned.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                        {earned.map(ach => renderBadge(ach))}
                    </div>
                ) : (
                    <div className="text-center py-10 border border-dashed border-gray-800 text-gray-600 font-mono text-base">
                        NO MEDALS ACQUIRED IN CURRENT SESSION
                    </div>
                )}
            </div>

            {/* Unearned Section */}
            <div>
                <h2 className="text-3xl font-bold border-b border-dashed border-gray-800 text-gray-500 pb-2 mb-6">CLASSIFIED / LOCKED</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                    {unearned.map(ach => renderBadge(ach))}
                </div>
            </div>
        </div>
    );
};