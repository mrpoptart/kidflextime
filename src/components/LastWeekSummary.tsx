'use client';

import { useEffect, useState } from 'react';
import {
    getPreviousWeekId,
    getWeeklyFlexTimeForWeek,
    getDayPreferencesForWeek,
    calculateWinningDay,
    formatMinutes,
    DayPreferenceData,
} from '@/lib/flex-time';
import { WeeklyFlexTime, MAX_FLEX_TIME_PER_WEEK } from '@/types';

export default function LastWeekSummary() {
    const [lastWeekFlexTime, setLastWeekFlexTime] = useState<WeeklyFlexTime | null>(null);
    const [lastWeekPreferences, setLastWeekPreferences] = useState<DayPreferenceData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadLastWeekData() {
            try {
                const prevWeekId = getPreviousWeekId();
                const [flexData, prefData] = await Promise.all([
                    getWeeklyFlexTimeForWeek(prevWeekId),
                    getDayPreferencesForWeek(prevWeekId),
                ]);
                setLastWeekFlexTime(flexData);
                setLastWeekPreferences(prefData);
            } catch (error) {
                console.warn('Could not load last week data:', error);
            } finally {
                setLoading(false);
            }
        }

        loadLastWeekData();
    }, []);

    if (loading) {
        return (
            <div className="last-week-summary loading-summary">
                <p>Loading last week...</p>
            </div>
        );
    }

    if (!lastWeekFlexTime) return null;

    const winningDay = lastWeekPreferences
        ? calculateWinningDay(lastWeekPreferences.preferences)
        : 'saturday';

    const percentage = (lastWeekFlexTime.balance / MAX_FLEX_TIME_PER_WEEK) * 100;
    const isMaxed = lastWeekFlexTime.balance >= MAX_FLEX_TIME_PER_WEEK;

    return (
        <div className="last-week-summary">
            <h3>Last Week&apos;s Results</h3>

            <div className="last-week-content">
                <div className="last-week-day">
                    <span className="last-week-day-label">Flex time day was:</span>
                    <span className="last-week-day-value">
                        {winningDay === 'saturday' ? 'Saturday' : 'Sunday'}
                    </span>
                </div>

                <div className="last-week-earned">
                    <div className="last-week-earned-header">
                        <span className="last-week-earned-label">Time earned:</span>
                        <span className="last-week-earned-value">
                            {formatMinutes(lastWeekFlexTime.balance)}
                            <span className="last-week-earned-max"> / {formatMinutes(MAX_FLEX_TIME_PER_WEEK)}</span>
                        </span>
                    </div>
                    <div className="last-week-progress-container">
                        <div
                            className={`last-week-progress-bar ${isMaxed ? 'maxed' : ''}`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                    </div>
                    {isMaxed && (
                        <div className="last-week-maxed">MAX ACHIEVED!</div>
                    )}
                </div>
            </div>
        </div>
    );
}
