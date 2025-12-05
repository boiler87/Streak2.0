import React, { useState } from 'react';
import { collection, addDoc, updateDoc, doc, Timestamp, writeBatch, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { StreakLog, UserProfile, JournalEntry } from '../types';
import { LEVEL_CONFIG, ACHIEVEMENTS_CONFIG } from '../constants';

// Robust date parser
const toDate = (val: any): Date => {
    if (!val) return new Date();
    if (val instanceof Date) return val;
    if (typeof val.toDate === 'function') return val.toDate(); // Firestore Timestamp
    if (typeof val === 'object' && 'seconds' in val) return new Date(val.seconds * 1000); // Plain object timestamp
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
};

// Helper to compare dates (ignoring time)
const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
};

interface DashboardProps {
    logs: StreakLog[];
    userData: UserProfile;
    journalEntries: JournalEntry[];
}

export const Dashboard: React.FC<DashboardProps> = ({ logs, userData, journalEntries }) => {
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [goalType, setGoalType] = useState<'days' | 'date'>('days');
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
    const [visibleLogsCount, setVisibleLogsCount] = useState(7);

    // Sort logs descending
    const sortedLogs = [...logs].sort((a, b) => toDate(b.startDate).getTime() - toDate(a.startDate).getTime());
    const visibleLogs = sortedLogs.slice(0, visibleLogsCount);
    const activeLog = sortedLogs.find(l => !l.endDate);

    // Calculate duration
    const getDuration = (start: any, end?: any) => {
        const s = toDate(start).getTime();
        const e = end ? toDate(end).getTime() : new Date().getTime();
        const diff = Math.max(0, e - s);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return { days, hours, fmt: `${days}d ${hours}h` };
    };

    const duration = activeLog ? getDuration(activeLog.startDate) : { days: 0, hours: 0, fmt: "0d 0h" };

    // Calculate Active Streak XP
    const calculateActiveXp = (days: number) => {
        let xp = days * 2; // Base daily rate

        // Add Achievement XP
        ACHIEVEMENTS_CONFIG.forEach(ach => {
            if (ach.days && days >= ach.days) {
                xp += ach.xp;
            }
        });

        // Goal Bonus (Check against userData.goal if set)
        if (userData.goal && days >= userData.goal) {
            xp += 10;
        }

        return xp;
    };

    // Helper to generate detailed history for a log
    const generateStreakHistory = (log: StreakLog) => {
        const history: { date: Date, reason: string, xp: number }[] = [];
        const start = toDate(log.startDate);
        const logDuration = getDuration(log.startDate, log.endDate);
        const totalDays = logDuration.days;

        // Iterate from Day 0 (Start Date) to Total Days
        for (let i = 0; i <= totalDays; i++) {
            const currentDate = new Date(start);
            currentDate.setDate(currentDate.getDate() + i);

            // Do not show future dates for active streaks
            if (currentDate.getTime() > Date.now()) break;

            if (i > 0) { 
               history.push({ date: currentDate, reason: 'DAILY DISCIPLINE', xp: 2 });
            } else {
               history.push({ date: currentDate, reason: 'STREAK STARTED', xp: 0 }); 
            }

            // Achievements
            ACHIEVEMENTS_CONFIG.forEach(ach => {
                if (ach.days === i && i > 0) {
                    history.push({ date: currentDate, reason: `MEDAL: ${ach.name}`, xp: ach.xp });
                }
            });

            // Goal
            if (userData.goal && i === userData.goal) {
                history.push({ date: currentDate, reason: 'GOAL ACHIEVED', xp: 10 });
            }

            // Journal Entries
            const dailyEntries = journalEntries.filter(entry => isSameDay(toDate(entry.date), currentDate));
            dailyEntries.forEach(entry => {
                history.push({ date: currentDate, reason: 'LOG ENTRY UPLOAD', xp: 3 });
            });
        }
        
        return history.sort((a, b) => b.date.getTime() - a.date.getTime());
    };

    const currentXp = activeLog ? calculateActiveXp(duration.days) : 0;

    // Calculate XP Level based on Active Streak XP
    const currentLevel = LEVEL_CONFIG.slice().reverse().find(l => currentXp >= l.xp) || LEVEL_CONFIG[0];
    const nextLevel = LEVEL_CONFIG.find(l => l.level === currentLevel.level + 1);
    const progress = nextLevel 
        ? Math.round(((currentXp - currentLevel.xp) / (nextLevel.xp - currentLevel.xp)) * 100) 
        : 100;

    // Estimate next rank
    let rankEstimateText = "MAX RANK ACHIEVED";
    if (nextLevel) {
        let daysToNext = 0;
        let simDays = duration.days;
        while (calculateActiveXp(simDays) < nextLevel.xp && daysToNext < 5000) {
            simDays++;
            daysToNext++;
        }
        
        const nextRankDate = new Date();
        nextRankDate.setDate(nextRankDate.getDate() + daysToNext);
        rankEstimateText = `EST. RANK UP: ${daysToNext} DAYS (${nextRankDate.toLocaleDateString()})`;
    }

    // --- Goal Calculations ---
    let goalText = "NO GOAL SET";
    let goalProgress = 0;
    let goalTargetDisplay = "-- / --";

    if (userData.goal) {
        goalText = `${userData.goal} DAYS`;
        goalProgress = Math.min(100, (duration.days / userData.goal) * 100);
        goalTargetDisplay = `${duration.days} / ${userData.goal}`;
    } else if (userData.goalDate) {
        // Parse YYYY-MM-DD string explicitly
        const parts = userData.goalDate.split('-').map(Number);
        const targetDate = new Date(parts[0], parts[1] - 1, parts[2]);
        
        goalText = `UNTIL ${targetDate.toLocaleDateString()}`;
        if (activeLog) {
            const start = toDate(activeLog.startDate).getTime();
            const target = targetDate.getTime();
            const now = Date.now();
            const total = Math.max(1, target - start);
            const current = Math.max(0, now - start);
            goalProgress = Math.min(100, (current / total) * 100);
            
            const daysLeft = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
            goalTargetDisplay = daysLeft > 0 ? `${daysLeft} DAYS LEFT` : 'COMPLETED';
        }
    }

    const handleSaveGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.currentUser) return;
        const form = e.target as HTMLFormElement;
        
        const updates: any = { goal: null, goalDate: null };
        
        if (goalType === 'days') {
            const val = (form.elements.namedItem('goalDays') as HTMLInputElement).value;
            if (val) updates.goal = parseInt(val);
        } else {
            const val = (form.elements.namedItem('goalDate') as HTMLInputElement).value;
            if (val) updates.goalDate = val;
        }
        
        await updateDoc(doc(db, 'users', auth.currentUser.uid), updates);
        setIsEditingGoal(false);
    };

    const handleStartStreak = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const startVal = (form.elements.namedItem('startDate') as HTMLInputElement).value;
        if (startVal && auth.currentUser) {
            await addDoc(collection(db, 'users', auth.currentUser.uid, 'logs'), {
                startDate: Timestamp.fromDate(new Date(startVal)),
                endDate: null,
                finalXp: 0,
                goalAchieved: false
            });
            form.reset();
        }
    };

    const handleEndStreak = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!auth.currentUser || !window.confirm("TERMINATE STREAK?")) return;
        const batch = writeBatch(db);
        const logRef = doc(db, 'users', auth.currentUser.uid, 'logs', id);
        
        const finalXp = calculateActiveXp(duration.days);
        
        batch.update(logRef, { 
            endDate: Timestamp.now(),
            finalXp: finalXp
        });
        
        const newRef = doc(collection(db, 'users', auth.currentUser.uid, 'logs'));
        batch.set(newRef, { startDate: Timestamp.now(), endDate: null, finalXp: 0, goalAchieved: false });
        
        await batch.commit();
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (auth.currentUser && window.confirm("DELETE LOG PERMANENTLY?")) {
            await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'logs', id));
        }
    };

    return (
        <div className="space-y-6">
            {/* HUD */}
            <div className="border-2 border-neon bg-black p-4 shadow-[inset_0_0_20px_rgba(39,255,71,0.1)]">
                <div className="flex justify-between items-center mb-2">
                    <span className="font-retro text-sm text-neon tracking-widest">STATUS</span>
                    <span className={`font-bold font-mono text-xl ${activeLog ? 'text-neon' : 'text-error'}`}>
                        {activeLog ? '[ ACTIVE ]' : '[ STANDBY ]'}
                    </span>
                </div>
                <div className="flex justify-between items-center mb-4">
                    <span className="font-retro text-sm text-neon tracking-widest">SESSION</span>
                    <span className="font-mono text-3xl md:text-5xl text-white">{duration.fmt}</span>
                </div>
                
                <hr className="border-t border-dashed border-neonDim my-3" />
                
                {/* RANK SECTION */}
                <div className="flex justify-between items-center mb-1">
                    <span className="font-retro text-sm text-neon tracking-widest">RANK</span>
                    <span className="font-bold text-white text-lg md:text-xl">LVL {currentLevel.level} {currentLevel.title}</span>
                </div>
                <div className="w-full h-4 border border-neon bg-gray-900 p-[2px] mb-1">
                    <div 
                        className="h-full bg-neon shadow-[0_0_10px_#27ff47] transition-all duration-1000"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center text-sm text-gray-400 mb-3 gap-1">
                    <span className="text-base md:text-lg font-bold text-neon">{rankEstimateText}</span>
                    <span className="text-sm md:text-base">{currentXp} / {nextLevel?.xp || 'MAX'} XP</span>
                </div>

                <hr className="border-t border-dashed border-neonDim my-3" />

                {/* GOAL SECTION */}
                <div className="flex justify-between items-center mb-1">
                    <span className="font-retro text-sm text-neon tracking-widest">GOAL</span>
                    <button 
                        onClick={() => setIsEditingGoal(!isEditingGoal)} 
                        className="text-lg text-gold hover:text-white underline"
                    >
                        {isEditingGoal ? 'CANCEL' : '[EDIT]'}
                    </button>
                </div>

                {!isEditingGoal ? (
                    <>
                         <div className="text-center italic text-gray-400 text-lg mb-1">{goalText}</div>
                         <div className="w-full h-4 border border-neon bg-gray-900 p-[2px] mb-1">
                            <div 
                                className="h-full bg-gold shadow-[0_0_10px_#ffd700] transition-all duration-1000"
                                style={{ width: `${goalProgress}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between items-center text-lg text-gray-400">
                             <span>PROGRESS: {Math.round(goalProgress)}%</span>
                             <span>{goalTargetDisplay}</span>
                        </div>
                    </>
                ) : (
                    <form onSubmit={handleSaveGoal} className="mt-2 bg-[#0e0e0e] p-2 border border-neonDim">
                        <div className="flex gap-2 mb-2 justify-center">
                            <button 
                                type="button"
                                onClick={() => setGoalType('days')}
                                className={`text-sm px-3 py-1 border ${goalType === 'days' ? 'border-neon text-neon' : 'border-gray-700 text-gray-500'}`}
                            >
                                BY DAYS
                            </button>
                            <button 
                                type="button"
                                onClick={() => setGoalType('date')}
                                className={`text-sm px-3 py-1 border ${goalType === 'date' ? 'border-neon text-neon' : 'border-gray-700 text-gray-500'}`}
                            >
                                BY DATE
                            </button>
                        </div>
                        <div className="flex flex-col md:flex-row gap-2">
                            {goalType === 'days' ? (
                                <input 
                                    type="number" 
                                    name="goalDays" 
                                    placeholder="e.g. 30" 
                                    className="flex-grow bg-black border border-neon text-white px-2 py-2 text-base outline-none"
                                    defaultValue={userData.goal}
                                />
                            ) : (
                                <input 
                                    type="date" 
                                    name="goalDate" 
                                    className="flex-grow bg-black border border-neon text-white px-2 py-2 text-base outline-none"
                                    defaultValue={userData.goalDate}
                                />
                            )}
                            <button type="submit" className="bg-neon text-black text-sm px-4 py-2 font-bold hover:bg-white">SAVE</button>
                        </div>
                    </form>
                )}
            </div>

            {/* ACTIVITY LOG */}
            <div>
                <h2 className="text-2xl font-bold mb-3 border-b border-dashed border-neon pb-2">ACTIVITY LOG</h2>
                
                {/* Entry Form */}
                <form onSubmit={handleStartStreak} className="flex flex-col md:flex-row gap-2 mb-4">
                    <input 
                        type="datetime-local" 
                        name="startDate"
                        required 
                        className="flex-grow bg-black border border-neon text-white p-3 font-mono focus:shadow-[0_0_8px_#27ff47] outline-none text-base md:text-lg"
                    />
                    <button type="submit" className="border border-neon text-neon px-6 py-3 hover:bg-neon hover:text-black font-retro text-base">
                        LOG
                    </button>
                </form>

                <div className="space-y-3">
                    {visibleLogs.length === 0 && <p className="text-gray-500 text-center italic text-lg">NO DATA FOUND</p>}
                    {visibleLogs.map(log => {
                        const isActive = !log.endDate;
                        const d = getDuration(log.startDate, log.endDate);
                        const isExpanded = expandedLogId === log.id;
                        const history = isExpanded ? generateStreakHistory(log) : [];

                        return (
                            <div 
                                key={log.id} 
                                onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                className={`p-4 border border-neonDim bg-[#0e0e0e] hover:bg-neonDim/10 transition-colors cursor-pointer ${isActive ? 'border-l-4 border-l-neon' : ''}`}
                            >
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 gap-2">
                                    <div className="font-mono text-white text-lg md:text-xl">
                                        {toDate(log.startDate).toLocaleDateString()} - {isActive ? 'PRESENT' : toDate(log.endDate).toLocaleDateString()}
                                    </div>
                                    <span className={`font-mono font-bold text-xl ${isActive ? 'text-neon' : 'text-gray-500'}`}>
                                        {d.fmt}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-sm text-gray-500 font-mono">
                                        {isExpanded ? '▼ DETAILS' : '▶ DETAILS'}
                                    </span>
                                    <div className="flex gap-2">
                                        {isActive && (
                                            <button 
                                                onClick={(e) => handleEndStreak(log.id, e)}
                                                className="text-xs md:text-sm border border-neon text-neon px-3 py-1 hover:bg-neon hover:text-black"
                                            >
                                                END
                                            </button>
                                        )}
                                        <button 
                                            onClick={(e) => handleDelete(log.id, e)}
                                            className="text-xs md:text-sm text-error border border-error px-3 py-1 hover:bg-error hover:text-white"
                                        >
                                            DEL
                                        </button>
                                    </div>
                                </div>
                                
                                {isExpanded && (
                                    <div className="mt-4 border-t border-dashed border-gray-800 pt-2 overflow-x-auto">
                                        <table className="w-full text-sm md:text-base font-mono min-w-[300px]">
                                            <thead>
                                                <tr className="text-gray-500 text-left">
                                                    <th className="pb-2">DATE</th>
                                                    <th className="pb-2">EVENT</th>
                                                    <th className="pb-2 text-right">XP</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {history.length === 0 && (
                                                    <tr><td colSpan={3} className="text-center text-gray-600 py-2">NO XP GENERATED YET</td></tr>
                                                )}
                                                {history.map((h, i) => (
                                                    <tr key={i} className="border-b border-gray-900/50 last:border-0">
                                                        <td className="py-1 text-gray-400 whitespace-nowrap pr-2">{h.date.toLocaleDateString()}</td>
                                                        <td className="py-1 text-white">{h.reason}</td>
                                                        <td className="py-1 text-right text-neon">+{h.xp}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {sortedLogs.length > visibleLogsCount && (
                        <button 
                            onClick={() => setVisibleLogsCount(prev => prev + 7)}
                            className="w-full py-3 text-center text-neon border border-neonDim hover:bg-neonDim/20 text-base font-retro mt-2"
                        >
                            VIEW MORE
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};