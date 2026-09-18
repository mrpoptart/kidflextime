import { KidName } from './flex-time';

// Column order for the checklist grid
export const CHECKLIST_KIDS = ['malcolm', 'henry', 'charlie'] as const satisfies readonly KidName[];

export const KID_LABELS: Record<KidName, string> = {
    malcolm: 'Malcolm',
    henry: 'Henry',
    charlie: 'Charlie'
};

export const DAY_NAMES = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
];

// Day indices match Date.getDay(): Sunday 0 ... Saturday 6
const SUNDAY = 0;
const MONDAY = 1;
const TUESDAY = 2;
const WEDNESDAY = 3;
const THURSDAY = 4;

// Shower nights, per kid
const SHOWER_NIGHTS: Record<KidName, number[]> = {
    charlie: [MONDAY, WEDNESDAY, SUNDAY],
    malcolm: [TUESDAY, THURSDAY, SUNDAY],
    henry: [TUESDAY, THURSDAY, SUNDAY]
};

export interface ChecklistRow {
    id: string;
    emoji: string;
    label: string;
    detail?: string;
    /** True for rows that only show up on certain days (showers, trash) */
    scheduled: boolean;
    /** Kids who owe this task today */
    owedBy: KidName[];
}

const EVERYONE: KidName[] = [...CHECKLIST_KIDS];

// Build today's checklist. Every task on this list has to be done before a
// parent starts verifying, or it comes out of the 2-hour timer.
export function getChecklistForDay(day: number): ChecklistRow[] {
    const rows: ChecklistRow[] = [
        {
            id: 'projector-room',
            emoji: '📽️',
            label: 'Projector room clean',
            scheduled: false,
            owedBy: EVERYONE
        },
        {
            id: 'bedroom',
            emoji: '🛏️',
            label: 'Bedroom clean',
            detail: 'Your own room',
            scheduled: false,
            owedBy: EVERYONE
        },
        {
            id: 'living-room',
            emoji: '🛋️',
            label: 'Living room clean',
            scheduled: false,
            owedBy: EVERYONE
        },
        {
            id: 'dining-room',
            emoji: '🍽️',
            label: 'Dining room clean',
            scheduled: false,
            owedBy: EVERYONE
        },
        {
            id: 'bathrooms',
            emoji: '🚽',
            label: 'Downstairs bathrooms tidy',
            scheduled: false,
            owedBy: EVERYONE
        }
    ];

    const showerKids = CHECKLIST_KIDS.filter((kid) => SHOWER_NIGHTS[kid].includes(day));
    if (showerKids.length > 0) {
        rows.push({
            id: 'shower',
            emoji: '🚿',
            label: 'Shower',
            detail: 'Tonight is a shower night',
            scheduled: true,
            owedBy: [...showerKids]
        });
    }

    if (day === THURSDAY) {
        rows.push({
            id: 'trash',
            emoji: '🗑️',
            label: 'Take the trash out',
            detail: 'Every can in the house emptied, cans out to the curb',
            scheduled: true,
            owedBy: EVERYONE
        });
    }

    return rows;
}

export function cellId(taskId: string, kid: KidName): string {
    return `${taskId}:${kid}`;
}

// Local calendar date, e.g. "2026-09-18". Used to throw the list out at midnight.
export function getDayKey(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function msUntilMidnight(date: Date = new Date()): number {
    const midnight = new Date(date);
    midnight.setHours(24, 0, 0, 0);
    return midnight.getTime() - date.getTime();
}

const STORAGE_KEY = 'kidflextime.checklist.v1';

export type ChecklistState = Record<string, boolean>;

// Checklist state never leaves the device, and anything from an earlier day is
// dropped on read so the list is always empty again after midnight.
export function loadChecklist(date: Date = new Date()): ChecklistState {
    if (typeof window === 'undefined') return {};

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};

        const parsed = JSON.parse(raw) as { day?: string; checked?: ChecklistState };
        if (parsed?.day !== getDayKey(date) || !parsed.checked) {
            window.localStorage.removeItem(STORAGE_KEY);
            return {};
        }

        return parsed.checked;
    } catch {
        return {};
    }
}

export function saveChecklist(checked: ChecklistState, date: Date = new Date()): void {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ day: getDayKey(date), checked })
        );
    } catch {
        // Private browsing or a full quota: the list still works for this session.
    }
}
