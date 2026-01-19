'use client';

import { FlexTimeEntry } from '@/types';

interface WeeklyNotesProps {
    entries: FlexTimeEntry[];
}

export default function WeeklyNotes({ entries }: WeeklyNotesProps) {
    const notesWithContent = entries.filter(e => e.note && e.note.trim());

    if (notesWithContent.length === 0) {
        return null;
    }

    return (
        <div className="weekly-notes">
            <h3>🌟 Why We Earned It</h3>
            <ul className="notes-list">
                {notesWithContent.map((entry, index) => (
                    <li key={index} className="note-item">
                        <span className="note-text">{entry.note}</span>
                        <span className="note-meta">
                            +{entry.minutes} min
                            {entry.addedByName && ` by ${entry.addedByName}`}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
