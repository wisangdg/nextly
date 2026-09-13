# Nextly — Features Catalog

Status: Shipped / In Progress
Last Updated: 12 September 2026

## 1. Core Architecture & Local-First Resilience

| Feature | Status | Details & Contract |
| --- | --- | --- |
| **Local Storage Envelope v1** | Shipped | Data stored under `{ version: 1, tasks: Task[] }` schema envelope. Validates all tasks strictly upon read and write. Backward-compatible reading of legacy flat task arrays. |
| **Corruption Protection** | Shipped | If stored data is corrupt or fails to parse, raw data is preserved without overwriting. Mutating actions are blocked to prevent data loss, and user is offered a raw backup download or storage reset. |
| **Synchronous Persistence Verification** | Shipped | Centralized `persistAndCommit` guarantees state and storage consistency. Success notifications are only displayed after successful write; storage failures leave clear warnings. |
| **Cross-Tab Synchronization** | Shipped | Listens to storage events across browser tabs. Aborts gracefully without wiping current state if external storage is corrupted or unreadable. |
| **Render Error Boundary** | Shipped | Top-level `ErrorBoundary` catches unexpected React rendering errors, allowing users to safely download their current raw task backup before reloading the page. |

## 2. Task Management & Mutations

| Feature | Status | Details & Contract |
| --- | --- | --- |
| **Quick Add & Detailed Creation** | Shipped | Title input with keyboard submission (`Enter`) and "Add details" modal option for description, priority, category, and due date. |
| **Deterministic Updates** | Shipped | Synchronous validation prevents invalid state from persisting. Updates preserve task IDs and creation timestamps. |
| **Deadline Clearing** | Shipped | Explicitly supports clearing task deadlines (`dueDate: null`), updating urgency to `none`. |
| **Per-Task Closure Undo** | Shipped | Deleting a task triggers a 5-second toast with an Undo action bound to that specific task's closure. Restores prevent duplicate IDs. |
| **Completion Toggle & Tracking** | Shipped | Marks task complete with `completedAt` timestamp. Reopening active task clears `completedAt`. |

## 3. Explainable Smart Sorting & Saved Views

| Feature | Status | Details & Contract |
| --- | --- | --- |
| **Smart Sort (Urgency-First)** | Shipped | Deterministic multi-factor rule: Active > Urgency (Overdue > Today > Upcoming > None) > Priority (High > Medium > Low) > Due date > Created date > Stable ID tie-breaker. |
| **Transparent Reasons** | Shipped | Each task displays a human-readable reason tag explaining why it appears in its position (e.g. "Overdue · High priority"). |
| **Next Up Recommendation** | Shipped | Highlights the top 3 actionable tasks directly on the Dashboard for immediate focus. |
| **Saved Views** | Shipped | Preset views: Today, Upcoming, Active, All, and Completed. Consistent between Dashboard stat card clicks and Task List tabs. |
| **Dynamic Date Transitions** | Shipped | `useLocalDate` hook automatically refreshes date calculations on window focus, tab visibility change, and across midnight intervals. |

## 4. Import, Export & Workspace Demo

| Feature | Status | Details & Contract |
| --- | --- | --- |
| **JSON Export** | Shipped | Exports workspace tasks into formatted versioned JSON with timestamp. |
| **Atomic JSON Import** | Shipped | Validates all tasks prior to merging. Pre-checks `File.size` (< 2MB) and rejects corrupt or unsupported schema versions atomically without altering existing tasks. Skips duplicate IDs safely. |
| **Opt-In Sample Workspace** | Shipped | Provides 8 realistic demo tasks spanning overdue, today, upcoming, high/medium/low priority, and completed. Requires confirmation if workspace has existing tasks. |

## 5. Accessibility & Responsive UX

| Feature | Status | Details & Contract |
| --- | --- | --- |
| **Accessible Touch Targets** | Shipped | Primary interactive controls (including task checkbox 44×44px label touch targets, navigation tabs, and workspace action buttons) meet or exceed minimum 44px touch targets. |
| **Keyboard Navigation & Dialogs** | Shipped | Modal dialogs with accessible titles (`aria-labelledby`), escape key listener, and keyboard shortcuts (`Alt+N`). |
| **Reduced Motion Support** | Shipped | Respects `prefers-reduced-motion` via Framer Motion and CSS, removing jarring layout transitions and animations. |
| **Responsive Design** | Shipped | Adaptive layout supporting mobile drawers (closing on item click) up to 1440px+ desktop layouts. |

---

## Planned Future Improvements (Deferred)

- [ ] Multi-device sync / cloud backup (requires authentication & end-to-end encryption design)
- [ ] Subtasks and recurring tasks
- [ ] PWA offline service worker caching
- [ ] Interactive timeline / calendar view
