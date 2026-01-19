'use client';

import { useEffect, useState } from 'react';
import { getWeeklyFlexTime, checkStreak, getWeekEnd, isInViewingWindow, isFirebaseConfigured } from '@/lib/flex-time';
import { WeeklyFlexTime } from '@/types';
import FlexTimeBalance from '@/components/FlexTimeBalance';
import WeeklyNotes from '@/components/WeeklyNotes';
import StreakCelebration from '@/components/StreakCelebration';
import Link from 'next/link';

export default function KidsPage() {
    const [flexTime, setFlexTime] = useState<WeeklyFlexTime | null>(null);
    const [streak, setStreak] = useState({ hasStreak: false, streakCount: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeUntilReset, setTimeUntilReset] = useState('');

    useEffect(() => {
        async function loadData() {
            try {
                const [weeklyData, streakData] = await Promise.all([
                    getWeeklyFlexTime(),
                    checkStreak()
                ]);
                setFlexTime(weeklyData);
                setStreak(streakData);
            } catch (err) {
                console.error('Failed to load flex time data:', err);
                setError('Could not load flex time data.');
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);

    // Update countdown timer
    useEffect(() => {
        const updateCountdown = () => {
            const weekEnd = getWeekEnd();
            const now = new Date();
            const diff = weekEnd.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeUntilReset('Flex time has reset!');
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            if (days > 0) {
                setTimeUntilReset(`${days}d ${hours}h until reset`);
            } else if (hours > 0) {
                setTimeUntilReset(`${hours}h ${minutes}m until reset`);
            } else {
                setTimeUntilReset(`${minutes}m until reset`);
            }
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 60000);
        return () => clearInterval(interval);
    }, []);

    const inWindow = isInViewingWindow();

    if (loading) {
        return (
            <div className="kids-page loading">
                <div className="loading-spinner">⏰</div>
                <p>Loading your flex time...</p>
            </div>
        );
    }

    // Show config message if Firebase not set up
    if (!isFirebaseConfigured) {
        return (
            <div className="kids-page">
                <header className="kids-header">
                    <Link href="/" className="back-link">← Home</Link>
                    <h1>🎮 Your Flex Time</h1>
                </header>
                <main className="kids-main">
                    <div className="config-notice">
                        <h2>⚙️ Setup Required</h2>
                        <p>Ask a parent to set up Firebase to start tracking flex time!</p>
                        <p className="config-hint">Parents: Create a <code>.env.local</code> file with your Firebase config.</p>
                    </div>

                    <div className="screen-time-info">
                        <h3>📺 When Can You Play?</h3>
                        <div className="time-cards">
                            <div className="time-card">
                                <span className="time-label">Daily</span>
                                <span className="time-value">5:30 - 7:30 PM</span>
                            </div>
                            <div className="time-card">
                                <span className="time-label">Flex Time</span>
                                <span className="time-value">Sat/Sun 10 AM - 12 PM</span>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (error) {
        return (
            <div className="kids-page error">
                <h1>Oops!</h1>
                <p>{error}</p>
                <Link href="/" className="back-link">← Go Back</Link>
            </div>
        );
    }

    return (
        <div className="kids-page">
            <StreakCelebration show={streak.hasStreak} streakCount={streak.streakCount} />

            <header className="kids-header">
                <Link href="/" className="back-link">← Home</Link>
                <h1>🎮 Your Flex Time</h1>
            </header>

            <main className="kids-main">
                {inWindow && (
                    <div className="viewing-window-alert">
                        🎉 It&apos;s flex time window! You can use your extra screen time now!
                    </div>
                )}

                {flexTime && (
                    <>
                        <FlexTimeBalance balance={flexTime.balance} />

                        <div className="reset-timer">
                            {timeUntilReset}
                        </div>

                        <WeeklyNotes entries={flexTime.entries} />
                    </>
                )}

                <div className="screen-time-info">
                    <h3>📺 When Can You Play?</h3>
                    <div className="time-cards">
                        <div className="time-card">
                            <span className="time-label">Daily</span>
                            <span className="time-value">5:30 - 7:30 PM</span>
                        </div>
                        <div className="time-card">
                            <span className="time-label">Flex Time</span>
                            <span className="time-value">Sat/Sun 10 AM - 12 PM</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
