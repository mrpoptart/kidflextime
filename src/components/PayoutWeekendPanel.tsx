'use client';

import { useEffect, useState } from 'react';
import { getPayoutWeekend, formatMinutes, formatWeekLabel, PayoutWeekend } from '@/lib/flex-time';
import { MAX_FLEX_TIME_PER_WEEK } from '@/types';
import WeeklyNotes from '@/components/WeeklyNotes';

const DAY_LABEL = { saturday: 'Saturday', sunday: 'Sunday' } as const;

// The one line that has to be unambiguous: earned last week, and spendable
// today, tomorrow, or not any more.
function headline(payout: PayoutWeekend): { text: string; tone: string } {
    const day = DAY_LABEL[payout.payoutDay];

    if (payout.flexTime.balance === 0) {
        return { text: `No flex time was earned last week, so there is none to use this weekend.`, tone: 'empty' };
    }

    switch (payout.timing) {
        case 'today':
            return { text: `Use it TODAY (${day}) between 10:00 AM and 12:00 PM.`, tone: 'today' };
        case 'tomorrow':
            return { text: `Use it TOMORROW (${day}) between 10:00 AM and 12:00 PM.`, tone: 'tomorrow' };
        case 'passed':
            return { text: `${day}'s window has already passed for this weekend.`, tone: 'passed' };
        default:
            return { text: `This weekend's flex time is on ${day}.`, tone: 'today' };
    }
}

export default function PayoutWeekendPanel() {
    const [payout, setPayout] = useState<PayoutWeekend | null>(null);
    const [loading, setLoading] = useState(true);
    const [reflectionOpen, setReflectionOpen] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                setPayout(await getPayoutWeekend());
            } catch (error) {
                console.warn('Could not load this weekend\'s flex time:', error);
            } finally {
                setLoading(false);
            }
        }

        load();
    }, []);

    if (loading) {
        return (
            <div className="payout-weekend loading-summary">
                <p>Loading this weekend&apos;s flex time...</p>
            </div>
        );
    }

    // Weekday: there is no payout weekend in progress.
    if (!payout) return null;

    const { balance, entries } = payout.flexTime;
    const percentage = (balance / MAX_FLEX_TIME_PER_WEEK) * 100;
    const isMaxed = balance >= MAX_FLEX_TIME_PER_WEEK;
    const { text, tone } = headline(payout);

    return (
        <div className="payout-weekend">
            <h3>🎮 This Weekend&apos;s Flex Time</h3>
            <p className="payout-source">Earned last week &mdash; the week of {formatWeekLabel(payout.weekId)}</p>

            <div className={`payout-headline ${tone}`}>{text}</div>

            <div className="payout-earned">
                <div className="payout-earned-header">
                    <span className="payout-earned-label">Ready to spend:</span>
                    <span className="payout-earned-value">
                        {formatMinutes(balance)}
                        <span className="payout-earned-max"> / {formatMinutes(MAX_FLEX_TIME_PER_WEEK)}</span>
                    </span>
                </div>
                <div className="payout-progress-container">
                    <div
                        className={`payout-progress-bar ${isMaxed ? 'maxed' : ''}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                </div>
                {isMaxed && <div className="payout-maxed">MAX ACHIEVED!</div>}
            </div>

            <div className="payout-reflection">
                <button
                    className={`payout-reflection-toggle ${reflectionOpen ? 'open' : ''}`}
                    onClick={() => setReflectionOpen(!reflectionOpen)}
                    aria-expanded={reflectionOpen}
                >
                    <span>🌟 Why We Earned It</span>
                    <span className="payout-reflection-arrow">{reflectionOpen ? '▲' : '▼'}</span>
                </button>
                <div className={`payout-reflection-content ${reflectionOpen ? 'open' : ''}`}>
                    <WeeklyNotes entries={entries} emptyMessage="No flex time was added last week" />
                </div>
            </div>
        </div>
    );
}
