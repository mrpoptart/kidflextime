# KidFlexTime - Project Guide for Claude

## Week & Date System

The app uses a **Saturday-to-Saturday week**:

- **Week start:** Saturday at 12:00 AM (midnight)
- **Week end:** The following Saturday at 12:00 AM (midnight)
- **Week ID:** The Saturday start date formatted as `YYYY-MM-DD`, used as the Firestore document key

### Day-of-week reference (JavaScript `Date.getDay()`)

| Day       | getDay() | Role in the app                        |
|-----------|----------|----------------------------------------|
| Saturday  | 6        | Week starts, flex time viewing window  |
| Sunday    | 0        | Flex time viewing window               |
| Monday    | 1        | Normal weekday                         |
| Tuesday   | 2        | Normal weekday                         |
| Wednesday | 3        | Normal weekday                         |
| Thursday  | 4        | Normal weekday                         |
| Friday    | 5        | Last day of the week                   |

### No locking

There is **NO locking of voting or flex time contributions at any point** in the week.
Voting and adding flex time are always available, every day, including weekends.
Do not add any locking, disabling, or gating of these features based on day of week or time.

### Weekend behavior

On Saturday and Sunday, both Kids and Parent pages show **two sections**:

1. **Last Week's Results** — a read-only summary showing the chosen flex time day and total time earned from the previous week
2. **This Week** — the normal current-week view with balance, voting, flex time additions, etc. (fully interactive, not locked)

The Last Week's Results section is **only shown on weekends** (Saturday/Sunday).
On weekdays (Monday–Friday), only the current week's section is shown.

### Time windows

- **Daily screen time:** There is no fixed start time. A kid asks a parent for screen time; the parent begins verifying chores as soon as they are able, and the **2-hour timer starts the moment verification begins**. If a chore is incomplete, the parent recommends a correction and the kid asks for re-evaluation — **the timer keeps running during fixes**, by design, so corrections eat into screen time. There is **no verification without the timer running** — no practice checks or previews; every check, re-evaluations included, happens on the running clock.
- **Screen time cutoff:** 8:30 PM on school nights, 9:30 PM on non-school nights. The 2 hours never runs past the cutoff, so a late verification means less than the full 2 hours.
- **Flex time viewing window:** Saturday or Sunday, 10:00 AM – 12:00 PM (based on the winning vote)

### Daily checklist

The Kids page shows a checklist of every chore owed **today**, as a grid with one row per task and one
column per kid (**Malcolm, Henry, Charlie** — that column order). It is **localStorage only** (key
`kidflextime.checklist.v1`, never Firestore) and **resets at midnight** every night: stored state is
stamped with the local date and discarded on read once that date has passed.

Task schedule (`src/lib/daily-checklist.ts`):

Rows are ordered **per-kid tasks first, then the shared house jobs**, so each kid sees what they
personally owe at the top.

- **Shared rows** (`shared: true`) get a **single checkbox for the whole house**, not one per kid — whoever does it, does it. They are stored under `<taskId>:house` and count once toward the total.
- **Every day, per kid:** own bedroom clean; 15 minutes of practice — music for Charlie and Henry, ASL for Malcolm (one row, with a per-kid icon above each checkbox via `kidTasks`). Charlie's icon is a drum 🥁 on Tue/Thu/Sat and a piano 🎹 on the rest.
- **Showers, per kid:** Charlie on Mon/Wed/Sun; Malcolm and Henry on Tue/Thu/Sun — only the kids who owe one that night get a checkbox
- **Every day, shared:** projector room clean, living room clean, dining room clean, black downstairs bathroom, other downstairs bathroom, and sweeping the dining room, living room, projector room, hallway and bedrooms
- **Thursday, shared:** trash — every can in the house emptied and the cans out to the curb

### Voting

- Three kids (Charlie, Malcolm, Henry) each vote for Saturday or Sunday
- Majority wins; ties default to Saturday
- Votes can be changed **any day of the week**, including weekends
- Votes reset with the week rollover on Saturday at midnight

## Tech Stack

- **Framework:** Next.js (App Router) with TypeScript
- **Styling:** Tailwind CSS + custom CSS in `globals.css`
- **Backend:** Firebase (Auth + Firestore)
- **State:** React Context for auth; direct Firestore calls for data

## Key Constants

- `MAX_FLEX_TIME_PER_WEEK = 120` (minutes, i.e., 2 hours)
- `FLEX_TIME_INCREMENT = 10` (minutes per addition)
- `WEEKS_FOR_STREAK = 2` (consecutive maxed weeks for streak celebration)
