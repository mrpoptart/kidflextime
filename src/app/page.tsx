'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="home-page">
      <div className="hero">
        <div className="logo">⏰</div>
        <h1>FlexTime Tracker</h1>
        <p className="tagline">Track your earned screen time rewards!</p>
      </div>

      <div className="nav-cards">
        <Link href="/kids" className="nav-card kids-card">
          <div className="card-icon">🎮</div>
          <h2>Kids View</h2>
          <p>See how much flex time you&apos;ve earned!</p>
        </Link>

        <Link href="/parent" className="nav-card parent-card">
          <div className="card-icon">👨‍👩‍👧‍👦</div>
          <h2>Parent Login</h2>
          <p>Add flex time rewards</p>
        </Link>
      </div>

      <div className="info-box">
        <h3>📅 Screen Time Rules</h3>
        <ul>
          <li><strong>Daily:</strong> 5:30 PM - 7:30 PM</li>
          <li><strong>Flex Time:</strong> Saturdays & Sundays, 10 AM - 12 PM</li>
          <li><strong>Max per week:</strong> 2 hours of flex time</li>
        </ul>
      </div>
    </div>
  );
}
