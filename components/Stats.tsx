
import React, { useState, useMemo } from 'react';
import { StreakLog, UserProfile } from '../types';
import { LEVEL_CONFIG, ACHIEVEMENTS_CONFIG } from '../constants';

interface StatsProps {
    logs: StreakLog[];
    userData: UserProfile;
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

// Helper to get consistent date key YYYY-M-D
const getDateKey = (date: Date) => {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

export const Stats: React.FC<StatsProps> = ({ logs, userData }) => {
    const [viewMode, setViewMode] = useState<'1M' | '3M' | '12M'>('3M');
    const [baseDate, setBaseDate] = useState(new Date());

    // --- Helper for XP Calc (Reused for projections & Peak Rank) ---
    const calculateActiveXp = (days: number) => {
        let xp = days * 2; // Base daily rate
        ACHIEVEMENTS_CONFIG.forEach(ach => {
            if (ach.days && days >= ach.days) xp += ach.xp;
        });
        if (userData.goal && days >= userData.goal) xp += 10;
        return xp;
    };

    // --- Advanced Analytics Calculations ---
    const now = Date.now();
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1).getTime();
    const nextYear = new Date(currentYear + 1, 0, 1).getTime();

    let totalDurationYtdMs = 0;
    let maxDurationMs = 0;
    let currentDurationMs = 0;
    let highestXpAllTime = 0;

    const msPerDay = 1000 * 60 * 60 * 24;

    logs.forEach(log => {
        const start = toDate(log.startDate).getTime();
        const end = log.endDate ? toDate(log.endDate).getTime() : now;
        
        // Duration Calcs
        const duration = Math.max(0, end - start);
        if (duration > maxDurationMs) maxDurationMs = duration;
        if (!log.endDate) currentDurationMs = duration;

        // Total Days (YTD) Calc - Calculate overlap with current year
        const overlapStart = Math.max(start, startOfYear);
        const overlapEnd = Math.min(end, nextYear);
        if (overlapEnd > overlapStart) {
            totalDurationYtdMs += (overlapEnd - overlapStart);
        }

        // Peak Rank Calc
        let logXp = 0;
        if (!log.endDate) {
            // Active streak: calculate dynamic XP
            logXp = calculateActiveXp(duration / msPerDay);
        } else {
            // Completed streak: use stored final XP, fallback to calc if missing
            logXp = log.finalXp || calculateActiveXp(duration / msPerDay);
        }
        if (logXp > highestXpAllTime) highestXpAllTime = logXp;
    });

    const totalDaysYtd = totalDurationYtdMs / msPerDay;
    const maxDays = maxDurationMs / msPerDay;
    const currentDays = currentDurationMs / msPerDay;
    const avgDays = logs.length ? (logs.reduce((acc, log) => {
        const s = toDate(log.startDate).getTime();
        const e = log.endDate ? toDate(log.endDate).getTime() : now;
        return acc + Math.max(0, e - s);
    }, 0) / msPerDay) / logs.length : 0;
    
    const peakLevel = LEVEL_CONFIG.slice().reverse().find(l => highestXpAllTime >= l.xp) || LEVEL_CONFIG[0];
    
    // Current Stats for Projections
    const currentXp = calculateActiveXp(currentDays);
    const currentLevel = LEVEL_CONFIG.slice().reverse().find(l => currentXp >= l.xp) || LEVEL_CONFIG[0];
    const futureLevels = LEVEL_CONFIG.filter(l => l.level > currentLevel.level);

    // --- Calendar Logic ---
    const { activeDateSet, endDateMap, startDateSet } = useMemo(() => {
        const active = new Set<string>();
        const ends = new Map<string, boolean>(); // Key -> isGoalMet (true/false)
        const starts = new Set<string>();

        logs.forEach(log => {
            const start = toDate(log.startDate);
            start.setHours(0,0,0,0);
            const startKey = getDateKey(start);
            starts.add(startKey);

            const end = log.endDate ? toDate(log.endDate) : new Date();
            end.setHours(0,0,0,0);

            if (log.endDate) {
                 const key = getDateKey(end);
                 ends.set(key, log.goalAchieved || false); // Default to false if undefined
            }

            const current = new Date(start);
            while (current <= end) {
                const key = getDateKey(current);
                active.add(key);
                current.setDate(current.getDate() + 1);
            }
        });
        return { activeDateSet: active, endDateMap: ends, startDateSet: starts };
    }, [logs]);

    // Calculate Goal Date Key
    const goalDateKey = useMemo(() => {
        if (userData.goalDate) {
             const parts = userData.goalDate.split('-').map(Number);
             const d = new Date(parts[0], parts[1] - 1, parts[2]);
             return getDateKey(d);
        }
        if (userData.goal) {
            const activeLog = logs.find(l => !l.endDate);
            if (activeLog) {
                const start = toDate(activeLog.startDate);
                const target = new Date(start);
                target.setDate(target.getDate() + userData.goal);
                return getDateKey(target);
            }
        }
        return null;
    }, [userData, logs]);

    const handlePrev = () => {
        const newDate = new Date(baseDate);
        if (viewMode === '1M') newDate.setMonth(newDate.getMonth() - 1);
        if (viewMode === '3M') newDate.setMonth(newDate.getMonth() - 3);
        if (viewMode === '12M') newDate.setFullYear(newDate.getFullYear() - 1);
        setBaseDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(baseDate);
        if (viewMode === '1M') newDate.setMonth(newDate.getMonth() + 1);
        if (viewMode === '3M') newDate.setMonth(newDate.getMonth() + 3);
        if (viewMode === '12M') newDate.setFullYear(newDate.getFullYear() + 1);
        setBaseDate(newDate);
    };

    const renderMonth = (offset: number) => {
        const displayDate = new Date(baseDate);
        displayDate.setMonth(baseDate.getMonth() + offset);
        
        const year = displayDate.getFullYear();
        const month = displayDate.getMonth();
        
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startDay = new Date(year, month, 1).getDay(); // 0 = Sunday
        
        const days = [];
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="aspect-square"></div>);
        }
        
        for (let d = 1; d <= daysInMonth; d++) {
            const currentDay = new Date(year, month, d);
            const dateKey = getDateKey(currentDay);
            const isActive = activeDateSet.has(dateKey);
            const isEnded = endDateMap.has(dateKey);
            const isGoalMet = endDateMap.get(dateKey); // Boolean or undefined
            const isStartDate = startDateSet.has(dateKey);
            
            const isGoalDay = dateKey === goalDateKey;
            const isToday = getDateKey(new Date()) === dateKey;
            
            let bgClass = 'text-gray-600 bg-[#0a0a0a]';
            let style = {};
            
            if (isActive) {
                bgClass = 'bg-neon text-black font-bold shadow-[0_0_5px_rgba(39,255,71,0.5)]';
            }

            // Streak End Visual Logic
            if (isEnded) {
                const met = isGoalMet === true; // Handle undefined as false
                const endColor = met ? '#ffd700' : '#ff3333';
                const startColor = '#27ff47'; // Neon Green

                if (met) {
                    bgClass = 'bg-gold text-black font-bold shadow-[0_0_5px_#ffd700]';
                } else {
                    bgClass = 'bg-error text-white font-bold shadow-[0_0_5px_#ff3333]';
                }
                
                // Overlap Visual: Streak Ended AND New Streak Started on same day
                // Ensure robustness by checking if the day is registered as both an end and a start
                if (isStartDate) {
                     bgClass = 'text-white font-bold'; 
                     // Use inline style for reliable gradient rendering
                     style = {
                        background: `linear-gradient(135deg, ${endColor} 50%, ${startColor} 50%)`
                     };
                }
            }
            
            days.push(
                <div 
                    key={d} 
                    className={`aspect-square relative flex items-center justify-center text-lg font-mono border border-transparent
                    ${bgClass}
                    ${isToday ? 'border-white' : ''}
                    hover:border-neonDim transition-colors cursor-default`}
                    style={style}
                    title={`${currentDay.toDateString()}`}
                >
                    {d}
                    {isStartDate && (
                        <span className="absolute top-0.5 left-0.5 text-[0.6rem] leading-none opacity-80" title="Streak Started">▶</span>
                    )}
                    {isEnded && (
                        <span className="absolute top-0.5 right-0.5 text-[0.6rem] leading-none opacity-90" title={isGoalMet ? "Goal Met" : "Streak Ended"}>
                            {isGoalMet ? '★' : '✕'}
                        </span>
                    )}
                    {isGoalDay && (
                        <span className="absolute -bottom-1 -right-1 text-base drop-shadow-md z-10" title="Goal Target">🎯</span>
                    )}
                </div>
            );
        }

        return (
            <div key={`${year}-${month}`} className="bg-panel border border-neonDim p-2 md:p-3">
                <h4 className="text-center font-retro text-lg md:text-2xl text-neon mb-4">
                    {displayDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}
                </h4>
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {['S','M','T','W','T','F','S'].map((d, i) => (
                        <div key={i} className="text-center text-xs md:text-base text-gray-500 font-bold">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {days}
                </div>
            </div>
        );
    };

    const numMonths = viewMode === '1M' ? 1 : viewMode === '3M' ? 3 : 12;

    return (
        <div className="space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold border-b border-dashed border-neon pb-2">DATA ANALYTICS</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="border border-neon p-4 text-center bg-panel">
                    <h3 className="text-neon font-retro text-base mb-2">CURRENT</h3>
                    <p className="text-4xl md:text-5xl font-bold text-white">{Math.floor(currentDays)}d</p>
                </div>
                <div className="border border-neon p-4 text-center bg-panel">
                    <h3 className="text-neon font-retro text-base mb-2">RECORD</h3>
                    <p className="text-4xl md:text-5xl font-bold text-white">{Math.floor(maxDays)}d</p>
                </div>
                <div className="border border-neon p-4 text-center bg-panel">
                    <h3 className="text-neon font-retro text-base mb-2">PEAK RANK</h3>
                    <p className="text-2xl md:text-3xl font-bold text-white pt-2">{peakLevel.title}</p>
                </div>
                <div className="border border-neon p-4 text-center bg-panel">
                    <h3 className="text-neon font-retro text-base mb-2">TOTAL (YTD)</h3>
                    <p className="text-4xl md:text-5xl font-bold text-white">{Math.floor(totalDaysYtd)}</p>
                </div>
                 <div className="border border-neon p-4 text-center bg-panel">
                    <h3 className="text-neon font-retro text-base mb-2">AVERAGE</h3>
                    <p className="text-4xl md:text-5xl font-bold text-white">{avgDays.toFixed(1)}d</p>
                </div>
            </div>

            {/* Calendar Section */}
            <div className="border-t border-neonDim pt-6">
                <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                    <h3 className="text-neon font-retro text-2xl">STREAK CALENDAR</h3>
                    
                    <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
                         <div className="flex border border-neon w-full md:w-auto justify-between md:justify-start">
                            <button onClick={handlePrev} className="px-4 py-2 hover:bg-neon hover:text-black text-neon text-lg transition-colors flex-grow md:flex-grow-0">
                                &lt;
                            </button>
                            <button onClick={handleNext} className="px-4 py-2 hover:bg-neon hover:text-black text-neon text-lg transition-colors border-l border-neonDim flex-grow md:flex-grow-0">
                                &gt;
                            </button>
                        </div>
                        <div className="flex border border-neon w-full md:w-auto">
                            {(['1M', '3M', '12M'] as const).map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`px-4 py-2 text-base font-bold transition-colors border-r border-neonDim last:border-r-0 flex-grow md:flex-grow-0
                                    ${viewMode === mode ? 'bg-neon text-black' : 'text-neon hover:bg-neonDim'}`}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className={`grid gap-4 ${
                    viewMode === '12M' ? 'grid-cols-1 md:grid-cols-3 lg:grid-cols-4' : 
                    viewMode === '3M' ? 'grid-cols-1 md:grid-cols-3' : 
                    'grid-cols-1'
                }`}>
                    {Array.from({ length: numMonths }).map((_, i) => renderMonth(i))}
                </div>
                
                <div className="mt-4 flex flex-wrap gap-4 text-sm font-mono text-gray-500">
                    <div className="flex items-center gap-2"><span className="text-[0.6rem]">▶</span> Start</div>
                    <div className="flex items-center gap-2"><span className="text-[0.6rem]">✕</span> End (Fail)</div>
                    <div className="flex items-center gap-2"><span className="text-[0.6rem]">★</span> Goal Met</div>
                    <div className="flex items-center gap-2"><span>🎯</span> Target</div>
                </div>
            </div>

            {/* Rank Projections */}
            {futureLevels.length > 0 && (
                <div className="mt-8 border-t border-neonDim pt-6">
                    <h3 className="text-neon font-retro text-2xl mb-4">RANK PROJECTIONS</h3>
                    <div className="overflow-x-auto bg-panel border border-neonDim">
                        <table className="w-full text-left border-collapse min-w-[500px]">
                            <thead>
                                <tr className="border-b border-neonDim">
                                    <th className="p-4 font-retro text-lg text-neon">RANK</th>
                                    <th className="p-4 font-retro text-lg text-gray-400">XP REQ</th>
                                    <th className="p-4 font-retro text-lg text-white">EST. DAYS</th>
                                    <th className="p-4 font-retro text-lg text-white">EST. DATE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {futureLevels.map(lvl => {
                                    let simDays = Math.floor(currentDays);
                                    let daysNeeded = 0;
                                    while (calculateActiveXp(simDays) < lvl.xp && daysNeeded < 5000) {
                                        simDays++;
                                        daysNeeded++;
                                    }
                                    
                                    const estDate = new Date();
                                    estDate.setDate(estDate.getDate() + daysNeeded);

                                    return (
                                        <tr key={lvl.level} className="border-b border-neonDim/30 hover:bg-neonDim/10 transition-colors">
                                            <td className="p-4 font-mono text-neon font-bold text-lg">{lvl.title}</td>
                                            <td className="p-4 font-mono text-gray-400 text-lg">{lvl.xp}</td>
                                            <td className="p-4 font-mono text-white text-lg">{daysNeeded > 4999 ? '> 13 YEARS' : `${daysNeeded} DAYS`}</td>
                                            <td className="p-4 font-mono text-white text-lg">{daysNeeded > 4999 ? 'UNKNOWN' : estDate.toLocaleDateString()}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-lg text-gray-500 mt-2 font-mono">
                        * Estimates based on current streak trajectory (Daily XP + Achievements + Goal Bonus).
                    </p>
                </div>
            )}
        </div>
    );
};
