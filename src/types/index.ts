// Type definitions for FlexTime Tracker

export interface FlexTimeEntry {
    id?: string;
    minutes: number;
    note?: string;
    addedBy: string;
    addedByName?: string;
    timestamp: Date;
}

export interface WeeklyFlexTime {
    weekStart: Date;
    weekEnd: Date;
    balance: number; // minutes, max 120
    entries: FlexTimeEntry[];
    lastUpdated: Date;
}

export interface WeeklyStats {
    weekId: string;
    weekStart: Date;
    totalEarned: number;
    maxedOut: boolean;
}

export interface UserProfile {
    uid: string;
    email: string;
    name: string;
    createdAt: Date;
}

// Constants
export const MAX_FLEX_TIME_PER_WEEK = 120; // 2 hours in minutes
export const FLEX_TIME_INCREMENT = 10; // minutes per addition
export const WEEKS_FOR_STREAK = 2;
