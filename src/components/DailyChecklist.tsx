'use client';

import { useCallback, useEffect, useState } from 'react';
import { KidName } from '@/lib/flex-time';
import {
    CHECKLIST_KIDS,
    ChecklistState,
    DAY_NAMES,
    KID_LABELS,
    cellId,
    getChecklistForDay,
    getDayKey,
    loadChecklist,
    msUntilMidnight,
    saveChecklist,
    sharedCellId
} from '@/lib/daily-checklist';

export default function DailyChecklist() {
    const [day, setDay] = useState<number | null>(null);
    const [checked, setChecked] = useState<ChecklistState>({});

    // Load today's boxes on mount, then wipe them the moment the date rolls over.
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        let currentDayKey = '';

        const sync = () => {
            const now = new Date();
            currentDayKey = getDayKey(now);
            setDay(now.getDay());
            setChecked(loadChecklist(now));

            clearTimeout(timer);
            timer = setTimeout(sync, msUntilMidnight(now) + 1000);
        };

        // A sleeping device can miss the midnight timer, so re-check on wake.
        const syncIfNewDay = () => {
            if (getDayKey() !== currentDayKey) sync();
        };

        sync();
        window.addEventListener('focus', syncIfNewDay);
        document.addEventListener('visibilitychange', syncIfNewDay);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('focus', syncIfNewDay);
            document.removeEventListener('visibilitychange', syncIfNewDay);
        };
    }, []);

    const toggle = useCallback((key: string) => {
        setChecked((prev) => {
            const next = { ...prev };

            if (next[key]) {
                delete next[key];
            } else {
                next[key] = true;
            }

            saveChecklist(next);
            return next;
        });
    }, []);

    // Rendered only after mount: the day of the week is not known on the server.
    if (day === null) return null;

    const rows = getChecklistForDay(day);
    const total = rows.reduce((sum, row) => sum + (row.shared ? 1 : row.owedBy.length), 0);
    const done = rows.reduce((sum, row) => {
        if (row.shared) return sum + (checked[sharedCellId(row.id)] ? 1 : 0);
        return sum + row.owedBy.filter((kid) => checked[cellId(row.id, kid)]).length;
    }, 0);
    const allDone = done === total;

    return (
        <div className="checklist-section">
            <div className="checklist-heading">
                <h3>📋 Today&apos;s Checklist</h3>
                <span className="checklist-day">{DAY_NAMES[day]}</span>
            </div>

            <div className="checklist-progress">
                <div className="checklist-bar">
                    <div
                        className={`checklist-bar-fill ${allDone ? 'complete' : ''}`}
                        style={{ width: `${total === 0 ? 0 : (done / total) * 100}%` }}
                    />
                </div>
                <span className="checklist-count">{done} of {total} done</span>
            </div>

            <table className="checklist-table">
                <thead>
                    <tr>
                        <th scope="col" className="checklist-task-head">Task</th>
                        {CHECKLIST_KIDS.map((kid) => (
                            <th key={kid} scope="col">{KID_LABELS[kid]}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => {
                        const rowDone = row.shared
                            ? !!checked[sharedCellId(row.id)]
                            : row.owedBy.every((kid) => checked[cellId(row.id, kid)]);

                        return (
                            <tr key={row.id} className={rowDone ? 'row-done' : ''}>
                                <th scope="row" className="checklist-task">
                                    <span className="checklist-task-inner">
                                        <span className="checklist-emoji" aria-hidden="true">{row.emoji}</span>
                                        <span className="checklist-task-text">
                                            <span className="checklist-label">
                                                {row.label}
                                                {row.scheduled && <span className="checklist-badge">Tonight</span>}
                                            </span>
                                            {row.detail && <span className="checklist-detail">{row.detail}</span>}
                                        </span>
                                    </span>
                                </th>

                                {row.shared ? (
                                    <td className="checklist-cell checklist-shared-cell" colSpan={CHECKLIST_KIDS.length}>
                                        <span className="checklist-shared-inner">
                                            <label className="checklist-check">
                                                <input
                                                    type="checkbox"
                                                    checked={!!checked[sharedCellId(row.id)]}
                                                    onChange={() => toggle(sharedCellId(row.id))}
                                                    aria-label={`${row.label} (anyone can do it)`}
                                                />
                                                <span className="checklist-box" aria-hidden="true" />
                                            </label>
                                            <span className="checklist-shared-hint">Anyone</span>
                                        </span>
                                    </td>
                                ) : (
                                    CHECKLIST_KIDS.map((kid) => {
                                        if (!row.owedBy.includes(kid)) {
                                            return (
                                                <td key={kid} className="checklist-cell">
                                                    <span className="checklist-na" aria-label={`${KID_LABELS[kid]}: not today`}>—</span>
                                                </td>
                                            );
                                        }

                                        const key = cellId(row.id, kid);

                                        return (
                                            <td key={kid} className="checklist-cell">
                                                <label className="checklist-check">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!checked[key]}
                                                        onChange={() => toggle(key)}
                                                        aria-label={`${KID_LABELS[kid]}: ${row.label}`}
                                                    />
                                                    <span className="checklist-box" aria-hidden="true" />
                                                </label>
                                            </td>
                                        );
                                    })
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {allDone ? (
                <div className="checklist-complete">
                    🎉 Everything is done! Go ask a parent to start the timer.
                </div>
            ) : (
                <p className="checklist-note">
                    Everything on this list has to be done before you ask. Anything still unchecked when a parent
                    starts checking comes out of your 2 hours.
                </p>
            )}

            <p className="checklist-footnote">
                This list is saved on this device only and clears itself at midnight.
            </p>
        </div>
    );
}
