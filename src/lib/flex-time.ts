import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    arrayUnion
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import {
    FlexTimeEntry,
    WeeklyFlexTime,
    WeeklyStats,
    MAX_FLEX_TIME_PER_WEEK,
    FLEX_TIME_INCREMENT,
    WEEKS_FOR_STREAK
} from '@/types';

// Re-export constants and config flag for convenience
export { MAX_FLEX_TIME_PER_WEEK, FLEX_TIME_INCREMENT, WEEKS_FOR_STREAK } from '@/types';
export { isFirebaseConfigured } from './firebase';

// Get the start of the current flex time week (Monday 12:00 AM)
export function getWeekStart(date: Date = new Date()): Date {
    const d = new Date(date);
    const day = d.getDay();
    // Adjust so Monday is the first day (0), Sunday is 6
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Get Sunday 12:00 PM (noon) when flex time resets
export function getWeekEnd(date: Date = new Date()): Date {
    const weekStart = getWeekStart(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Sunday
    weekEnd.setHours(12, 0, 0, 0); // Noon
    return weekEnd;
}

// Get the week ID for Firestore (e.g., "2026-W03")
export function getWeekId(date: Date = new Date()): string {
    const weekStart = getWeekStart(date);
    const year = weekStart.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const days = Math.floor((weekStart.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

// Check if we're currently in the flex time viewing window (Sat/Sun 10am-12pm)
export function isInViewingWindow(date: Date = new Date()): boolean {
    const day = date.getDay();
    const hours = date.getHours();

    // Saturday (6) or Sunday (0), between 10:00 AM and 12:00 PM
    if (day === 0 || day === 6) {
        return hours >= 10 && hours < 12;
    }
    return false;
}

// Check if flex time should be reset (after Sunday 12pm)
export function shouldResetFlexTime(lastWeekStart: Date, now: Date = new Date()): boolean {
    const currentWeekStart = getWeekStart(now);
    return lastWeekStart.getTime() < currentWeekStart.getTime();
}

// Get current weekly flex time data
export async function getWeeklyFlexTime(): Promise<WeeklyFlexTime> {
    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();

    // Return empty state if Firebase not configured
    if (!db) {
        return {
            weekStart,
            weekEnd,
            balance: 0,
            entries: [],
            lastUpdated: new Date()
        };
    }

    const weekId = getWeekId();
    const docRef = doc(db, 'flexTime', weekId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            weekStart: data.weekStart.toDate(),
            weekEnd: data.weekEnd.toDate(),
            balance: data.balance,
            entries: data.entries.map((e: FlexTimeEntry & { timestamp: { toDate: () => Date } }) => ({
                ...e,
                timestamp: e.timestamp.toDate()
            })),
            lastUpdated: data.lastUpdated.toDate()
        };
    }

    // No data for this week yet, return empty state
    return {
        weekStart,
        weekEnd,
        balance: 0,
        entries: [],
        lastUpdated: new Date()
    };
}

// Add flex time (10 minutes)
export async function addFlexTime(
    userId: string,
    userName: string,
    note?: string
): Promise<{ success: boolean; message: string; newBalance: number }> {
    if (!db) {
        return {
            success: false,
            message: 'Firebase not configured',
            newBalance: 0
        };
    }

    const weekId = getWeekId();
    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();

    const docRef = doc(db, 'flexTime', weekId);
    const docSnap = await getDoc(docRef);

    let currentBalance = 0;

    if (docSnap.exists()) {
        currentBalance = docSnap.data().balance;
    }

    // Check if at max
    if (currentBalance >= MAX_FLEX_TIME_PER_WEEK) {
        return {
            success: false,
            message: `Already at maximum flex time (${MAX_FLEX_TIME_PER_WEEK} minutes) for this week!`,
            newBalance: currentBalance
        };
    }

    const newBalance = Math.min(currentBalance + FLEX_TIME_INCREMENT, MAX_FLEX_TIME_PER_WEEK);

    const newEntry: FlexTimeEntry = {
        minutes: FLEX_TIME_INCREMENT,
        addedBy: userId,
        addedByName: userName,
        timestamp: new Date(),
        ...(note && { note })  // Only include note if it has a value
    };

    if (docSnap.exists()) {
        await updateDoc(docRef, {
            balance: newBalance,
            entries: arrayUnion(newEntry),
            lastUpdated: new Date()
        });
    } else {
        await setDoc(docRef, {
            weekStart,
            weekEnd,
            balance: newBalance,
            entries: [newEntry],
            lastUpdated: new Date()
        });
    }

    // Update weekly stats for streak tracking
    await updateWeeklyStats(weekId, weekStart, newBalance);

    return {
        success: true,
        message: `Added ${FLEX_TIME_INCREMENT} minutes! New balance: ${newBalance} minutes`,
        newBalance
    };
}

// Update weekly stats for streak tracking
async function updateWeeklyStats(weekId: string, weekStart: Date, totalEarned: number): Promise<void> {
    if (!db) return;

    const statsRef = doc(db, 'weeklyStats', weekId);
    await setDoc(statsRef, {
        weekId,
        weekStart,
        totalEarned,
        maxedOut: totalEarned >= MAX_FLEX_TIME_PER_WEEK
    }, { merge: true });
}

// Check if there's a streak (consecutive weeks of maxed flex time)
export async function checkStreak(): Promise<{ hasStreak: boolean; streakCount: number }> {
    if (!db) {
        return { hasStreak: false, streakCount: 0 };
    }

    const statsRef = collection(db, 'weeklyStats');
    const q = query(statsRef, orderBy('weekStart', 'desc'), limit(WEEKS_FOR_STREAK + 1));
    const querySnap = await getDocs(q);

    if (querySnap.empty) {
        return { hasStreak: false, streakCount: 0 };
    }

    const stats: WeeklyStats[] = [];
    querySnap.forEach((docSnap) => {
        const data = docSnap.data();
        stats.push({
            weekId: data.weekId,
            weekStart: data.weekStart.toDate(),
            totalEarned: data.totalEarned,
            maxedOut: data.maxedOut
        });
    });

    // Count consecutive maxed-out weeks (excluding current incomplete week)
    let streakCount = 0;
    const currentWeekId = getWeekId();

    for (const stat of stats) {
        // Skip current week if it's not maxed out yet
        if (stat.weekId === currentWeekId && !stat.maxedOut) {
            continue;
        }
        if (stat.maxedOut) {
            streakCount++;
        } else {
            break;
        }
    }

    return {
        hasStreak: streakCount >= WEEKS_FOR_STREAK,
        streakCount
    };
}

// Format minutes as human-readable string
export function formatMinutes(minutes: number): string {
    if (minutes < 60) {
        return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
        return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `${hours}h ${mins}m`;
}
