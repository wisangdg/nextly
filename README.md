# Nextly — Minimalist Task Manager with Smart Sorting

Nextly is a local-first, privacy-respecting task management web application designed to help users decide what to work on next through transparent, rule-based **Smart Sorting**.

No accounts, no external cloud sync, no mystery AI algorithms — just clean, reliable productivity directly in your browser.

---

## Key Features

- **Transparent Smart Sorting**: Automatically prioritizes your next best action without mystery scores:
  1. Active tasks before Completed tasks.
  2. Urgency buckets: Overdue → Due Today → Upcoming → No Deadline.
  3. Priority weights: High → Medium → Low.
  4. Due date proximity, then oldest backlog tasks first, with deterministic tie-breaking.
  5. Shows explicit "Why this task?" reason badges on every item.
- **Next Up Focus Panel**: A dedicated section spotlighting the top 3 actionable tasks on the Dashboard.
- **Saved View Filters**: Instant filtering by *All Tasks*, *Active*, *Due Today*, *Upcoming*, *Overdue*, and *Completed*.
- **Local-First Data Resilience**:
  - Schema-versioned browser storage (`localStorage` Envelope v1).
  - Corrupt data protection: never overwrites invalid JSON automatically; offers raw backup download and safe recovery.
  - Cross-tab synchronization via storage event listeners.
  - Versioned JSON Export and Import with structural validation, UTF-8 byte checking, and duplicate ID protection.
- **Calendar Date Accuracy**: Due dates (`YYYY-MM-DD`) are handled as local calendar dates to avoid timezone-shifting errors. Automatically refreshes on window focus, visibility change, and midnight rollover.
- **Safe Operations & Undo**: Non-destructive deletion with instant interactive "Undo" via toast notifications (specific per task with duplicate ID check).
- **Accessible & Responsive**: Headless UI dialogs with focus trapping, minimum 44px touch targets across primary interactive controls (including tabs, workspace actions, and task checkbox label targets), reduced-motion guards (drawers, charts, and layout transitions), dark/light theme toggle, and keyboard shortcuts (`Alt+N` for quick task creation).

---

## Tech Stack

- **Framework**: React 18
- **Language**: TypeScript 5
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS
- **Primitives & Motion**: Headless UI, Framer Motion, Heroicons
- **Testing**: Node.js Native Test Runner (`node --test`) with native type stripping

---

## Getting Started

### Prerequisites

- **For Running & Building**: [Node.js](https://nodejs.org/) version 18 or higher.
- **For Native Unit Tests**: [Node.js](https://nodejs.org/) version 22.6+ or Node 26+ (which provides native `--experimental-strip-types` and `node:test`).
- [npm](https://www.npmjs.com/) (version 9 or higher).

### Installation

```bash
git clone https://github.com/wisangdg/nextly.git
cd nextly
npm install
```

### Development Server

Start the local Vite development server:

```bash
npm run dev
```

Open your browser at `http://localhost:5173`.

### Running Automated Tests

Run the native unit test suite (testing date parsing, Smart Sort rules, storage resilience, and mutation edge cases):

```bash
npm test
```

### Linting

Verify ESLint compliance:

```bash
npm run lint
```

### Production Build

Create an optimized static bundle in the `dist` directory:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

---

## Design & Engineering Decisions

1. **Why Rule-Based Smart Sort instead of AI?**
   Predictable, instant, and transparent. Users shouldn't wonder why a critical task was hidden or delayed by a black-box model.
2. **Local-First Storage Trade-offs**:
   Your data never leaves your device. Data is preserved across sessions in this browser. To transfer between machines, use the built-in Export & Import JSON feature.
3. **Zero-Dependency Native Testing**:
   We utilize Node.js's native test runner (`node --experimental-strip-types --test`) for fast, zero-dependency unit testing without external test runner bloat.

---

## License

MIT License.
