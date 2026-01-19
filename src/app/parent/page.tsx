'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getWeeklyFlexTime, checkStreak, deleteFlexTimeEntry } from '@/lib/flex-time';
import { WeeklyFlexTime, FlexTimeEntry } from '@/types';
import FlexTimeBalance from '@/components/FlexTimeBalance';
import AddFlexTimeButton from '@/components/AddFlexTimeButton';
import WeeklyNotes from '@/components/WeeklyNotes';
import Link from 'next/link';

export default function ParentPage() {
    const { user, userProfile, loading: authLoading, signInWithGoogle, signOut, isConfigured } = useAuth();
    const [flexTime, setFlexTime] = useState<WeeklyFlexTime | null>(null);
    const [streak, setStreak] = useState({ hasStreak: false, streakCount: 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [authError, setAuthError] = useState('');
    const [entryToDelete, setEntryToDelete] = useState<FlexTimeEntry | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const loadFlexTime = async () => {
        setLoading(true);
        try {
            const [weeklyData, streakData] = await Promise.all([
                getWeeklyFlexTime(),
                checkStreak()
            ]);
            setFlexTime(weeklyData);
            setStreak(streakData);
            setError(null);
        } catch (err) {
            console.error('Failed to load flex time:', err);
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            loadFlexTime();
        }
    }, [user]);

    const handleGoogleSignIn = async () => {
        setAuthError('');
        try {
            await signInWithGoogle();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Sign in failed';
            setAuthError(errorMessage);
        }
    };

    const handleDeleteEntry = async () => {
        if (!entryToDelete) return;

        setDeleteLoading(true);
        try {
            const result = await deleteFlexTimeEntry(entryToDelete.timestamp);
            if (result.success) {
                await loadFlexTime();
            } else {
                setError(result.message);
            }
        } catch (err) {
            console.error('Failed to delete entry:', err);
            setError('Failed to delete entry');
        } finally {
            setDeleteLoading(false);
            setEntryToDelete(null);
        }
    };

    // Show loading while checking auth
    if (authLoading) {
        return (
            <div className="parent-page loading">
                <div className="loading-spinner">⏰</div>
            </div>
        );
    }

    // Show config instructions if Firebase not set up
    if (!isConfigured) {
        return (
            <div className="parent-page">
                <header className="parent-header">
                    <Link href="/" className="back-link">← Home</Link>
                    <h1>👨‍👩‍👧‍👦 Parent Setup</h1>
                </header>
                <main className="parent-main">
                    <div className="config-notice">
                        <h2>⚙️ Firebase Setup Required</h2>
                        <p>Please configure Firebase to continue.</p>
                    </div>
                </main>
            </div>
        );
    }

    // Show login button if not authenticated
    if (!user) {
        return (
            <div className="parent-page auth">
                <header className="parent-header">
                    <Link href="/" className="back-link">← Home</Link>
                    <h1>👨‍👩‍👧‍👦 Parent Login</h1>
                </header>

                <div className="auth-container">
                    <div className="auth-card">
                        <h2>Welcome, Parent!</h2>
                        <p>Sign in to manage flex time for your kids.</p>

                        <button className="google-sign-in" onClick={handleGoogleSignIn}>
                            <svg viewBox="0 0 24 24" width="24" height="24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Sign in with Google
                        </button>

                        {authError && <p className="auth-error">{authError}</p>}
                    </div>
                </div>
            </div>
        );
    }

    // Authenticated parent dashboard
    return (
        <div className="parent-page dashboard">
            <header className="parent-header">
                <Link href="/" className="back-link">← Home</Link>
                <div className="user-info">
                    <span>Hi, {userProfile?.name || user.displayName || 'Parent'}!</span>
                    <button onClick={signOut} className="sign-out-btn">Sign Out</button>
                </div>
            </header>

            <main className="parent-main">
                <h1>Flex Time Manager</h1>

                {streak.hasStreak && (
                    <div className="streak-banner">
                        🏆 {streak.streakCount}-week streak! Kids earned extra permissions!
                    </div>
                )}

                {loading ? (
                    <div className="loading-spinner">⏰</div>
                ) : error ? (
                    <p className="error">{error}</p>
                ) : flexTime && (
                    <>
                        <FlexTimeBalance balance={flexTime.balance} />

                        <AddFlexTimeButton
                            currentBalance={flexTime.balance}
                            onFlexTimeAdded={loadFlexTime}
                        />

                        <WeeklyNotes entries={flexTime.entries} />

                        <div className="history-section">
                            <h3>This Week&apos;s Activity</h3>
                            <ul className="activity-list">
                                {flexTime.entries.length === 0 ? (
                                    <li className="no-activity">No flex time added yet this week</li>
                                ) : (
                                    flexTime.entries.map((entry, index) => (
                                        <li key={index} className="activity-item">
                                            <div className="activity-details">
                                                <span className="activity-time">
                                                    {new Date(entry.timestamp).toLocaleString()}
                                                </span>
                                                <span className="activity-amount">+{entry.minutes} min</span>
                                                {entry.addedByName && (
                                                    <span className="activity-by">by {entry.addedByName}</span>
                                                )}
                                            </div>
                                            <button
                                                className="delete-entry-btn"
                                                onClick={() => setEntryToDelete(entry)}
                                                title="Delete entry"
                                            >
                                                &times;
                                            </button>
                                        </li>
                                    ))
                                )}
                            </ul>
                        </div>
                    </>
                )}
            </main>

            {/* Delete Confirmation Modal */}
            {entryToDelete && (
                <div className="delete-modal-overlay">
                    <div className="delete-modal">
                        <div className="delete-modal-warning">
                            <span className="warning-icon">⚠️</span>
                            <h3>Are you sure?</h3>
                        </div>
                        <p className="delete-modal-message">
                            Deleting flex time should only be done to correct a mistake,
                            not to take away time that was already earned. This action
                            cannot be undone.
                        </p>
                        <div className="delete-modal-details">
                            <strong>{entryToDelete.minutes} minutes</strong> added on{' '}
                            {new Date(entryToDelete.timestamp).toLocaleString()}
                            {entryToDelete.note && (
                                <div className="delete-modal-note">
                                    Note: &quot;{entryToDelete.note}&quot;
                                </div>
                            )}
                        </div>
                        <div className="delete-modal-buttons">
                            <button
                                className="cancel-button"
                                onClick={() => setEntryToDelete(null)}
                                disabled={deleteLoading}
                            >
                                Cancel
                            </button>
                            <button
                                className="delete-button"
                                onClick={handleDeleteEntry}
                                disabled={deleteLoading}
                            >
                                {deleteLoading ? 'Deleting...' : 'Delete Entry'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
