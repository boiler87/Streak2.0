import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
    username?: string;
    xp?: number;
    goal?: number;
    goalDate?: string;
    publicProfile?: {
        enabled: boolean;
        showStats: boolean;
        showAwards: boolean;
        showCalendar: boolean;
    };
}

export interface StreakLog {
    id: string;
    startDate: Timestamp;
    endDate: Timestamp | null;
    finalXp: number;
    goalAchieved: boolean;
}

export interface JournalEntry {
    id: string;
    text: string;
    date: Timestamp;
    isPinned: boolean;
}

export interface CheckIn {
    id: string; // Date string YYYY-MM-DD
    date: Timestamp;
    locked: boolean;
    sex: boolean;
    edged: boolean;
}

export interface Achievement {
    name: string;
    days?: number;
    icon: string;
    xp: number;
    description?: string;
    type?: string;
    level?: number;
}
