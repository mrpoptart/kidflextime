'use client';

import { MAX_FLEX_TIME_PER_WEEK, formatMinutes } from '@/lib/flex-time';

interface FlexTimeBalanceProps {
    balance: number;
    showMax?: boolean;
}

export default function FlexTimeBalance({ balance, showMax = true }: FlexTimeBalanceProps) {
    const percentage = (balance / MAX_FLEX_TIME_PER_WEEK) * 100;
    const isMaxed = balance >= MAX_FLEX_TIME_PER_WEEK;

    return (
        <div className="flex-time-balance">
            <div className="balance-header">
                <span className="balance-label">Flex Time Available</span>
                <span className="balance-value">
                    {formatMinutes(balance)}
                    {showMax && <span className="balance-max"> / {formatMinutes(MAX_FLEX_TIME_PER_WEEK)}</span>}
                </span>
            </div>

            <div className="progress-container">
                <div
                    className={`progress-bar ${isMaxed ? 'maxed' : ''}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>

            {isMaxed && (
                <div className="maxed-badge">
                    ⭐ MAX ACHIEVED! ⭐
                </div>
            )}
        </div>
    );
}
