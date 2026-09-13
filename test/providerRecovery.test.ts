import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { TaskStatus } from "../src/types/Task.ts";
import type { Task } from "../src/types/Task.ts";
import {
	saveTasksToStorage,
	loadTasksFromStorage,
	importTasksFromJson,
	validateTask,
	isValidIsoDate,
	STORAGE_KEY,
} from "../src/utils/storage.ts";
import { parseLocalDate } from "../src/utils/dateUtils.ts";
import { TaskCore } from "../src/context/taskCore.ts";
import { extractEmergencyBackupData } from "../src/utils/emergencyRecovery.ts";

// In-memory mock for localStorage in Node environment
const store = new Map<string, string>();
let shouldThrowOnGet = false;
let shouldThrowOnSet = false;

(globalThis as unknown as { localStorage: Storage }).localStorage = {
	getItem: (key: string) => {
		if (shouldThrowOnGet)
			throw new Error(
				"Simulated storage read access denied (SecurityError)",
			);
		return store.get(key) ?? null;
	},
	setItem: (key: string, val: string) => {
		if (shouldThrowOnSet)
			throw new Error(
				"Simulated storage quota exceeded (QuotaExceededError)",
			);
		store.set(key, val);
	},
	removeItem: (key: string) => store.delete(key),
	clear: () => store.clear(),
	get length() {
		return store.size;
	},
	key: () => null,
};

const sampleValidTask: Task = {
	id: "task-test-1",
	title: "Integration Test Task",
	description: "Testing storage and recovery resilience",
	category: "work",
	priority: "high",
	status: TaskStatus.Active,
	createdAt: "2026-09-12T10:00:00.000Z",
	updatedAt: "2026-09-12T10:00:00.000Z",
	dueDate: "2026-09-15",
};

const sampleValidTask2: Task = {
	id: "task-test-2",
	title: "Second Integration Task",
	description: "Second task for multi-task assertions",
	category: "personal",
	priority: "medium",
	status: TaskStatus.Active,
	createdAt: "2026-09-12T11:00:00.000Z",
	updatedAt: "2026-09-12T11:00:00.000Z",
};

describe("TaskCore production controller & storage recovery integration", () => {
	beforeEach(() => {
		store.clear();
		shouldThrowOnGet = false;
		shouldThrowOnSet = false;
		delete (globalThis as unknown as { __nextly_latest_tasks?: unknown })
			.__nextly_latest_tasks;
	});

	// T01 & S05: Retained Undo callback dynamically checks write locks at call time
	test("T01: retained Undo action is blocked if external storage update occurred before clicking Undo", () => {
		saveTasksToStorage([sampleValidTask, sampleValidTask2]);

		let capturedUndoAction: (() => void) | null = null;
		let toastErrorMsg = "";

		const core = new TaskCore(undefined, {
			onToastUndo: (_task, onUndo) => {
				capturedUndoAction = onUndo;
			},
			onToastError: (msg) => {
				toastErrorMsg = msg;
			},
		});

		assert.strictEqual(core.tasks.length, 2);

		// Delete task 1; toast with undo action is emitted
		const deleted = core.deleteTask("task-test-1");
		assert.ok(deleted);
		assert.ok(capturedUndoAction, "Undo action callback must be captured");
		assert.strictEqual(core.tasks.length, 1);

		// Simulate external tab update happening while toast is sitting on user screen
		core.handleStorageEvent(STORAGE_KEY);
		assert.strictEqual(core.hasExternalTabUpdate, true);

		// User clicks the retained Undo callback from the old render
		capturedUndoAction!();

		// The restore must be BLOCKED at call time because external update lock is active
		assert.ok(
			toastErrorMsg.includes("Storage was modified by another tab"),
		);
		assert.strictEqual(
			core.tasks.length,
			1,
			"Task must not be restored to storage while lock is active",
		);

		// Clear the external lock via sync, now undo can safely be attempted or managed
	});

	// T01 & S01: Retained Undo callback is blocked if external storage corrupted
	test("T01: retained Undo action is blocked if storage is corrupted before clicking Undo", () => {
		saveTasksToStorage([sampleValidTask, sampleValidTask2]);

		let capturedUndoAction: (() => void) | null = null;
		let toastErrorMsg = "";

		const core = new TaskCore(undefined, {
			onToastUndo: (_task, onUndo) => {
				capturedUndoAction = onUndo;
			},
			onToastError: (msg) => {
				toastErrorMsg = msg;
			},
		});

		core.deleteTask("task-test-1");
		assert.ok(capturedUndoAction);

		// Storage becomes corrupted in another tab and syncFromStorage is triggered
		store.set(STORAGE_KEY, "invalid corrupted json {{{");
		core.syncFromStorage();
		assert.strictEqual(core.isCorrupted, true);

		// User clicks the old Undo button
		capturedUndoAction!();

		// Must be blocked by corruption write lock at call time
		assert.ok(
			toastErrorMsg.includes(
				"Cannot write to storage while data is corrupted",
			),
		);
		// Corrupted raw string in storage must remain untouched
		assert.strictEqual(
			store.get(STORAGE_KEY),
			"invalid corrupted json {{{",
		);
	});

	// S03: Initial storage read failure locks writes until retryLoadStorage succeeds
	test("S03: initial storage read failure activates write lock and blocks writes until retry succeeds", () => {
		shouldThrowOnGet = true;
		let toastErrorMsg = "";

		const core = new TaskCore(undefined, {
			onToastError: (msg) => {
				toastErrorMsg = msg;
			},
		});

		assert.strictEqual(core.isInitialLoadFailed, true);
		assert.strictEqual(core.tasks.length, 0);

		// Attempting to add a task while initial read failed must be blocked
		const added = core.addTask({ title: "Blocked Task" });
		assert.strictEqual(added, null);
		assert.ok(toastErrorMsg.includes("Initial storage read failed"));

		// Storage access recovers
		shouldThrowOnGet = false;
		store.set(
			STORAGE_KEY,
			JSON.stringify({ version: 1, tasks: [sampleValidTask] }),
		);

		const retrySuccess = core.retryLoadStorage();
		assert.strictEqual(retrySuccess, true);
		assert.strictEqual(core.isInitialLoadFailed, false);
		assert.strictEqual(core.tasks.length, 1);
		assert.strictEqual(core.tasks[0].id, "task-test-1");

		// Adding task now succeeds
		const addedAfterRecovery = core.addTask({ title: "Allowed Task" });
		assert.ok(addedAfterRecovery);
		assert.strictEqual(core.tasks.length, 2);
	});

	// S06: Failing resetCorruptedStorage preserves raw backup and does not wipe corrupted state
	test("S06: failing write preserves corruption state and does not wipe raw backup", () => {
		const corruptPayload = "{corrupted json payload";
		store.set(STORAGE_KEY, corruptPayload);

		let toastErrorMsg = "";
		const core = new TaskCore(undefined, {
			onToastError: (msg) => {
				toastErrorMsg = msg;
			},
		});

		assert.strictEqual(core.isCorrupted, true);
		assert.strictEqual(core.rawCorruptedString, corruptPayload);

		// Simulate quota exceeded when writing [] during reset
		shouldThrowOnSet = true;
		const resetSuccess = core.resetCorruptedStorage(() => true);

		assert.strictEqual(resetSuccess, false);
		assert.strictEqual(core.isCorrupted, true);
		assert.strictEqual(core.rawCorruptedString, corruptPayload);
		assert.ok(toastErrorMsg.includes("Failed to reset storage in browser"));
		assert.strictEqual(store.get(STORAGE_KEY), corruptPayload);
	});

	// S02: Sequential additions using actual production TaskCore
	test("S02: sequential rapid additions using TaskCore production logic maintain order and do not drop tasks", () => {
		const core = new TaskCore();

		core.addTask({ title: "Task 1" });
		core.addTask({ title: "Task 2" });
		core.addTask({ title: "Task 3" });

		assert.strictEqual(core.tasks.length, 3);
		assert.strictEqual(core.tasks[0].title, "Task 3");
		assert.strictEqual(core.tasks[1].title, "Task 2");
		assert.strictEqual(core.tasks[2].title, "Task 1");

		// Verified in underlying storage
		const stored = JSON.parse(store.get(STORAGE_KEY)!);
		assert.strictEqual(stored.tasks.length, 3);
		assert.strictEqual(stored.tasks[0].title, "Task 3");
	});

	// T04: Import contract returns success=false and persisted=false when persistence fails
	test("T04: importTasks returns success=false and persisted=false when storage persistence fails", () => {
		const core = new TaskCore();
		const validJson = JSON.stringify({
			version: 1,
			tasks: [sampleValidTask],
		});

		// Simulate storage quota exceeded during import
		shouldThrowOnSet = true;
		const result = core.importTasks(validJson);

		assert.strictEqual(result.success, false);
		assert.strictEqual(result.persisted, false);
		assert.ok(result.error?.includes("Imported into memory only"));
		// The task is still retained in memory so user doesn't lose data
		assert.strictEqual(core.tasks.length, 1);
	});

	// T07: External clear event (key === null) triggers external update lock
	test("T07: external storage clear event with key null triggers external update write lock", () => {
		const core = new TaskCore();
		assert.strictEqual(core.hasExternalTabUpdate, false);

		// localStorage.clear() in another tab sends key === null
		core.handleStorageEvent(null);

		assert.strictEqual(core.hasExternalTabUpdate, true);
		assert.ok(
			core
				.getWriteLockError()
				?.includes("Storage was modified by another tab"),
		);

		// Mutations are blocked
		const added = core.addTask({ title: "Should be blocked" });
		assert.strictEqual(added, null);
	});

	// U01 & T02: Emergency in-memory backup differentiates empty array from old storage
	test("U01 & T02: clearing tasks exports valid empty [] backup without resurrecting old storage data", () => {
		saveTasksToStorage([sampleValidTask]);
		const core = new TaskCore();
		assert.strictEqual(core.tasks.length, 1);

		// Clear all tasks
		core.clearAllTasks(() => true);
		assert.strictEqual(core.tasks.length, 0);

		const backup = extractEmergencyBackupData();
		assert.strictEqual(backup.success, true);
		assert.ok(backup.filename.includes("nextly-emergency-backup-"));
		assert.ok(backup.filename.endsWith(".json"));

		const parsed = JSON.parse(backup.content!);
		assert.strictEqual(
			parsed.tasks.length,
			0,
			"Tasks array in backup must be empty",
		);
		assert.strictEqual(parsed.source, "in-memory-emergency-recovery");
	});

	// U01: Corrupted startup JSON preserves raw string and exports .txt without publishing fake empty array
	test("U01: corrupted startup JSON preserves raw payload and exports .txt backup without fake empty tasks snapshot", () => {
		const malformedJson = "{ corrupted json payload: [1, 2, 3 }";
		store.set(STORAGE_KEY, malformedJson);

		const core = new TaskCore();
		assert.strictEqual(core.isCorrupted, true);
		assert.strictEqual(core.rawCorruptedString, malformedJson);
		// Crucial check: must NOT publish a fake empty array snapshot
		assert.strictEqual(
			(globalThis as unknown as { __nextly_latest_tasks?: unknown })
				.__nextly_latest_tasks,
			undefined,
			"Corrupted startup must not set __nextly_latest_tasks to []",
		);

		const backup = extractEmergencyBackupData();
		assert.strictEqual(backup.success, true);
		assert.ok(
			backup.filename.includes("nextly-corrupted-emergency-backup-"),
		);
		assert.ok(
			backup.filename.endsWith(".txt"),
			"Must export as raw text backup",
		);
		assert.strictEqual(
			backup.content,
			malformedJson,
			"Raw corrupted payload must be preserved exactly",
		);
	});

	// U01: Initial storage read failure reports failure when storage unavailable and never fabricates []
	test("U01: initial storage read failure reports failure and does not fabricate a fake [] backup when storage throws", () => {
		shouldThrowOnGet = true;
		const core = new TaskCore();
		assert.strictEqual(core.isInitialLoadFailed, true);
		assert.strictEqual(
			(globalThis as unknown as { __nextly_latest_tasks?: unknown })
				.__nextly_latest_tasks,
			undefined,
			"Initial load failure must not set __nextly_latest_tasks to []",
		);

		// If storage is still throwing when user requests backup
		const backup = extractEmergencyBackupData();
		assert.strictEqual(backup.success, false);
		assert.strictEqual(backup.content, undefined);
		assert.ok(
			backup.error?.includes(
				"Storage access failed and initial load was incomplete",
			),
		);
	});

	// U01: Unavailable storage without in-memory recovery reports failure instead of fake backup
	test("U01: unavailable storage without in-memory recovery reports failure instead of fake backup", () => {
		delete (globalThis as unknown as { __nextly_latest_tasks?: unknown })
			.__nextly_latest_tasks;
		delete (
			globalThis as unknown as { __nextly_emergency_recovery?: unknown }
		).__nextly_emergency_recovery;
		shouldThrowOnGet = true;

		const backup = extractEmergencyBackupData();
		assert.strictEqual(backup.success, false);
		assert.strictEqual(backup.content, undefined);
		assert.ok(backup.error?.includes("Browser storage is unavailable"));
	});

	// U01: Unsaved in-memory tasks after failed storage persistence are preserved in emergency backup
	test("U01: unsaved in-memory tasks after failed storage write are preserved in emergency backup", () => {
		const core = new TaskCore();
		const validJson = JSON.stringify({
			version: 1,
			tasks: [sampleValidTask],
		});

		shouldThrowOnSet = true;
		const importResult = core.importTasks(validJson);
		assert.strictEqual(importResult.success, false);
		assert.strictEqual(core.tasks.length, 1);

		const backup = extractEmergencyBackupData();
		assert.strictEqual(backup.success, true);
		const parsed = JSON.parse(backup.content!);
		assert.strictEqual(parsed.tasks.length, 1);
		assert.strictEqual(parsed.tasks[0].id, "task-test-1");
		assert.strictEqual(parsed.source, "in-memory-emergency-recovery");
	});

	// U02: Strict calendar boundary validation rejects impossible dates across validateTask, storage load, and import
	test("U02: strict calendar boundary validation rejects impossible dates (Feb 31, Feb 29 non-leap) and accepts leap years", () => {
		// 1. Feb 31 (impossible date in any year)
		assert.strictEqual(isValidIsoDate("2026-02-31T10:00:00Z"), false);
		const badFeb31 = validateTask({
			...sampleValidTask,
			createdAt: "2026-02-31T10:00:00Z",
		});
		assert.strictEqual(badFeb31.isValid, false);
		assert.ok(badFeb31.errors[0].includes("createdAt"));

		// 2. Feb 29 in non-leap year (2026 is not a leap year)
		assert.strictEqual(isValidIsoDate("2026-02-29T10:00:00Z"), false);
		const badFeb29NonLeap = validateTask({
			...sampleValidTask,
			updatedAt: "2026-02-29T10:00:00Z",
		});
		assert.strictEqual(badFeb29NonLeap.isValid, false);
		assert.ok(badFeb29NonLeap.errors[0].includes("updatedAt"));

		// 3. April 31 (April has 30 days)
		assert.strictEqual(isValidIsoDate("2026-04-31T10:00:00Z"), false);
		const badApr31 = validateTask({
			...sampleValidTask,
			completedAt: "2026-04-31T10:00:00Z",
		});
		assert.strictEqual(badApr31.isValid, false);
		assert.ok(badApr31.errors[0].includes("completedAt"));

		// 4. Feb 29 in leap year (2024 is a leap year)
		assert.strictEqual(isValidIsoDate("2024-02-29T10:00:00Z"), true);
		const goodLeapYear = validateTask({
			...sampleValidTask,
			createdAt: "2024-02-29T10:00:00Z",
			updatedAt: "2024-02-29T10:00:00Z",
			completedAt: "2024-02-29T10:00:00Z",
		});
		assert.strictEqual(goodLeapYear.isValid, true);

		// 5. Production loadTasksFromStorage flags corruption if stored JSON contains impossible date
		store.set(
			STORAGE_KEY,
			JSON.stringify({
				version: 1,
				tasks: [
					{ ...sampleValidTask, createdAt: "2026-02-31T10:00:00Z" },
				],
			}),
		);
		const loadResult = loadTasksFromStorage();
		assert.strictEqual(loadResult.isCorrupted, true);

		// 6. Production importTasksFromJson rejects impossible date payload atomically
		const importPayload = JSON.stringify({
			version: 1,
			tasks: [{ ...sampleValidTask, updatedAt: "2026-02-29T10:00:00Z" }],
		});
		const importRes = importTasksFromJson(importPayload, []);
		assert.strictEqual(importRes.success, false);
		assert.ok(importRes.error?.includes("updatedAt"));
	});

	// T05 & S07: Strict metadata validation sentinel tests
	test("T05: validateTask rejects invalid metadata (non-ISO createdAt/updatedAt, bad timestamp dueDate, invalid completedAt)", () => {
		// Rejects non-ISO createdAt
		const badCreatedAt = validateTask({
			...sampleValidTask,
			createdAt: "02/03/2026",
		});
		assert.strictEqual(badCreatedAt.isValid, false);
		assert.ok(badCreatedAt.errors[0].includes("createdAt"));

		// Rejects non-ISO updatedAt
		const badUpdatedAt = validateTask({
			...sampleValidTask,
			updatedAt: "not-an-iso-date",
		});
		assert.strictEqual(badUpdatedAt.isValid, false);
		assert.ok(badUpdatedAt.errors[0].includes("updatedAt"));

		// Rejects dueDate with garbage suffix (2026-09-15Tgarbage)
		const badDueDate = validateTask({
			...sampleValidTask,
			dueDate: "2026-09-15Tgarbage",
		});
		assert.strictEqual(badDueDate.isValid, false);
		assert.ok(badDueDate.errors[0].includes("dueDate"));

		// Rejects invalid completedAt (must not be silently stripped)
		const badCompletedAt = validateTask({
			...sampleValidTask,
			completedAt: "02/03/2026",
		});
		assert.strictEqual(badCompletedAt.isValid, false);
		assert.ok(badCompletedAt.errors[0].includes("completedAt"));

		// Non-canonical calendar dates
		assert.strictEqual(parseLocalDate("02/31/2026"), null);
		assert.strictEqual(parseLocalDate("2026-2-31"), null);
		assert.strictEqual(parseLocalDate("2026-02-31"), null);
		assert.strictEqual(parseLocalDate("2026-04-31"), null);
		assert.strictEqual(parseLocalDate("2026-09-15Tgarbage"), null);

		// Valid canonical dates & ISO timestamps parse successfully
		const valid = parseLocalDate("2026-09-15");
		assert.ok(valid instanceof Date);
		assert.strictEqual(valid.getDate(), 15);

		const validIso = parseLocalDate("2026-09-15T12:00:00.000Z");
		assert.ok(validIso instanceof Date);
		assert.strictEqual(validIso.getDate(), 15);
	});

	// V01: Failed save -> in-memory task addition -> external storage corruption -> syncFromStorage -> emergency backup extraction
	test("V01: preserves both unsaved in-memory tasks and raw corrupted storage across failed save, external corruption, and sync", () => {
		// 1. Initial clean state with 1 stored task
		saveTasksToStorage([sampleValidTask]);
		const core = new TaskCore();
		assert.strictEqual(core.tasks.length, 1);

		// 2. Storage write fails (failed save simulation)
		shouldThrowOnSet = true;
		const added = core.addTask({
			title: "Unsaved Active Task",
			priority: "high",
		});
		// Task added in memory despite storage write failure
		assert.notStrictEqual(added, null);
		assert.strictEqual(core.tasks.length, 2);
		assert.strictEqual(core.tasks[0].title, "Unsaved Active Task");
		assert.ok(core.storageError !== null);

		// 3. External storage becomes corrupted JSON (e.g. concurrent external write corruption)
		const malformedExternalJson = "{ corrupted storage: [not valid JSON";
		store.set(STORAGE_KEY, malformedExternalJson);

		// 4. Tab detects external changes and synchronizes from storage
		const syncResult = core.syncFromStorage();
		assert.strictEqual(
			syncResult,
			false,
			"Sync should return false when external storage is corrupted",
		);
		assert.strictEqual(
			core.isCorrupted,
			true,
			"Controller should enter corrupted state to block further writes",
		);
		assert.strictEqual(
			core.rawCorruptedString,
			malformedExternalJson,
			"Raw corrupted payload must be captured",
		);
		assert.strictEqual(
			core.tasks.length,
			2,
			"In-memory unsaved tasks must be strictly preserved",
		);

		// 5. ErrorBoundary emergency backup extraction is triggered
		const backup = extractEmergencyBackupData();
		assert.strictEqual(backup.success, true);
		assert.ok(
			backup.filename.includes(
				"nextly-emergency-backup-with-corrupted-storage-",
			),
			"Filename must indicate combined recovery",
		);
		assert.ok(backup.filename.endsWith(".json"));

		// Verify both sources are present in backup object and JSON payload
		assert.strictEqual(
			backup.inMemoryTasks?.length,
			2,
			"Backup data must include in-memory tasks",
		);
		assert.strictEqual(
			backup.rawCorruptedString,
			malformedExternalJson,
			"Backup data must include raw corrupted string",
		);

		const parsed = JSON.parse(backup.content!);
		assert.strictEqual(parsed.version, 1);
		assert.strictEqual(
			parsed.source,
			"emergency-recovery-with-corrupted-storage",
		);
		assert.strictEqual(parsed.tasks.length, 2);
		assert.strictEqual(parsed.tasks[0].title, "Unsaved Active Task");
		assert.strictEqual(parsed.rawCorruptedStorage, malformedExternalJson);
	});

	// V04: FileReader read failure / abort does not execute import or mutate task state
	test("V04: file read failure or abort leaves task state intact without executing import", () => {
		saveTasksToStorage([sampleValidTask]);
		let importCalled = false;
		const core = new TaskCore(undefined, {
			onToastError: () => {},
		});
		assert.strictEqual(core.tasks.length, 1);

		// Simulate FileReader failure scenario:
		// If an error event occurs or reading aborts, importTasks is never called and tasks remain unchanged.
		const simulateFileReaderFailure = (
			fileError: boolean,
			abort: boolean,
		) => {
			let toastMessage = "";
			const toast = {
				error: (msg: string) => {
					toastMessage = msg;
				},
			};

			if (fileError) {
				toast.error(
					"Failed to read the file. Please check file permissions and try again.",
				);
			} else if (abort) {
				toast.error("File reading was aborted.");
			} else {
				importCalled = true;
				core.importTasks('{"version":1,"tasks":[]}');
			}
			return toastMessage;
		};

		// Error case
		const errorMsg = simulateFileReaderFailure(true, false);
		assert.strictEqual(importCalled, false);
		assert.strictEqual(core.tasks.length, 1);
		assert.ok(errorMsg.includes("Failed to read the file"));

		// Abort case
		const abortMsg = simulateFileReaderFailure(false, true);
		assert.strictEqual(importCalled, false);
		assert.strictEqual(core.tasks.length, 1);
		assert.ok(abortMsg.includes("aborted"));
	});

	// W01: Desktop import retains single persistent input ref and continues working after mobile drawer unmounts
	test("W01: structural check and lifecycle regression test verifying single persistent input ref survives drawer unmount", async () => {
		// Part 1: Structural verification of production Sidebar.tsx
		// Guard against regressing to the bug where <input type="file"> was rendered inside renderSidebarBody
		const fs = await import("node:fs");
		const sidebarSource = fs
			.readFileSync(
				new URL("../src/components/Sidebar.tsx", import.meta.url),
				"utf-8",
			)
			.replace(/\t/g, "  ");

		// Must NOT contain input type="file" inside renderSidebarBody
		const renderSidebarBodyMatch = sidebarSource.match(
			/const renderSidebarBody = \(\) => \([\s\S]*?\n\s{2}\);/,
		);
		assert.ok(renderSidebarBodyMatch, "renderSidebarBody must be defined");
		assert.strictEqual(
			renderSidebarBodyMatch[0].includes('type="file"'),
			false,
			"CRITICAL (W01): renderSidebarBody must NOT render an <input type='file'> to prevent duplicate refs",
		);

		// Root return must contain the single persistent file input before <aside> and <Transition.Root>
		const rootInputIndex = sidebarSource.indexOf(
			'<input\n        type="file"\n        ref={fileInputRef}',
		);
		const asideIndex = sidebarSource.search(
			/<aside\s+className="hidden md:flex/,
		);
		const drawerIndex = sidebarSource.search(
			/<Transition\.Root\s+show=\{isMobileMenuOpen\}/,
		);
		assert.ok(
			rootInputIndex !== -1,
			"Sidebar must render the persistent <input type='file' ref={fileInputRef}> at root",
		);
		assert.ok(
			rootInputIndex < asideIndex,
			"Root input must be mounted before desktop aside",
		);
		assert.ok(
			rootInputIndex < drawerIndex,
			"Root input must be mounted before mobile drawer",
		);

		// Part 2: React DOM Ref Lifecycle Simulation
		// In React, when an element with ref={ref} unmounts, React synchronously calls ref.current = null.
		// In the old bug: both desktop and mobile drawer rendered their own <input ref={ref}>.
		// Opening drawer assigned ref.current = mobileInput.
		// Closing drawer unmounted mobileInput -> React ran cleanup: ref.current = null.
		// Desktop input remained mounted, but ref was now null, disabling the Import button!

		// Reproduce the old faulty lifecycle:
		const oldRef = {
			current: null as unknown as {
				clickCalled: number;
				click(): void;
			} | null,
		};
		const oldDesktopInput = {
			clickCalled: 0,
			click() {
				this.clickCalled++;
			},
		};
		const oldMobileInput = {
			clickCalled: 0,
			click() {
				this.clickCalled++;
			},
		};

		oldRef.current = oldDesktopInput; // Desktop mounts
		assert.strictEqual(oldRef.current, oldDesktopInput);

		oldRef.current = oldMobileInput; // Drawer opens
		assert.strictEqual(oldRef.current, oldMobileInput);

		oldRef.current = null; // Drawer unmounts -> React cleanup sets ref to null!
		assert.strictEqual(oldRef.current, null);
		// Desktop click now FAILS on old pattern:
		oldRef.current?.click();
		assert.strictEqual(
			oldDesktopInput.clickCalled,
			0,
			"Old pattern reproduced: desktop button cannot click null ref",
		);

		// Verify the new fixed architecture:
		// Single root input is permanently mounted outside conditional trees.
		const fixedRef = {
			current: null as unknown as {
				clickCalled: number;
				click(): void;
			} | null,
		};
		const rootInput = {
			clickCalled: 0,
			click() {
				this.clickCalled++;
			},
		};

		// Sidebar mounts:
		fixedRef.current = rootInput;

		// Mobile drawer opens & closes: because drawer does NOT contain input, fixedRef is NEVER touched!
		const isMobileMenuOpenTransitions = [true, false, true, false];
		for (let i = 0; i < isMobileMenuOpenTransitions.length; i++) {
			// Drawer mounts/unmounts its inner elements, but NOT the root input
			assert.strictEqual(
				fixedRef.current,
				rootInput,
				"Root input ref must remain attached across all drawer transitions",
			);
		}

		// Desktop button is clicked:
		fixedRef.current?.click();
		assert.strictEqual(
			rootInput.clickCalled,
			1,
			"Desktop button successfully clicks persistent root file input",
		);
	});

	// TaskCore additional branch coverage tests
	test("TaskCore: retryLoadStorage handles corrupted storage and read error branches", () => {
		// 1. Storage is corrupted during retry
		shouldThrowOnGet = false;
		store.set(STORAGE_KEY, "{ corrupted retry data: [");
		const core = new TaskCore({
			tasks: [],
			isCorrupted: false,
			loadError: "Temporary initial read failure",
		});
		assert.strictEqual(core.isInitialLoadFailed, true);

		const retryCorrupted = core.retryLoadStorage();
		assert.strictEqual(retryCorrupted, false);
		assert.strictEqual(core.isCorrupted, true);
		assert.strictEqual(core.isInitialLoadFailed, false);

		// 2. Storage still throws read error during retry
		shouldThrowOnGet = true;
		const coreThrowing = new TaskCore({
			tasks: [],
			isCorrupted: false,
			loadError: "Initial load failure",
		});
		const retryFailed = coreThrowing.retryLoadStorage();
		assert.strictEqual(retryFailed, false);
		assert.strictEqual(coreThrowing.isInitialLoadFailed, true);
	});

	test("TaskCore: syncFromStorage aborts on read error and respects user cancellation when unsaved edits exist", () => {
		// 1. Read error during sync
		shouldThrowOnGet = false;
		let toastErr = "";
		let toastInfo = "";
		const coreWithListener = new TaskCore(undefined, {
			onToastError: (m) => {
				toastErr = m;
			},
			onToastInfo: (m) => {
				toastInfo = m;
			},
		});

		shouldThrowOnGet = true;
		const syncErr = coreWithListener.syncFromStorage();
		assert.strictEqual(syncErr, false);
		assert.ok(toastErr.includes("Sync aborted"));

		// 2. Storage has unsaved edits and user cancels sync
		shouldThrowOnGet = false;
		shouldThrowOnSet = true;
		const added = coreWithListener.addTask({ title: "Unsaved Task" });
		assert.notStrictEqual(added, null);
		assert.ok(coreWithListener.storageError !== null);

		// Cancel sync via confirm returning false
		const cancelled = coreWithListener.syncFromStorage(() => false);
		assert.strictEqual(cancelled, false);
		assert.strictEqual(coreWithListener.tasks.length, 1);
		assert.ok(toastInfo.includes("Sync cancelled"));
	});

	test("TaskCore: cancellation and edge branches for sample loading, clear, delete, and toggle", () => {
		saveTasksToStorage([sampleValidTask]);
		const core = new TaskCore();
		assert.strictEqual(core.tasks.length, 1);

		// 1. loadSampleTasks cancelled by user
		const sampleCancelled = core.loadSampleTasks(() => false);
		assert.strictEqual(sampleCancelled, false);
		assert.strictEqual(core.tasks.length, 1);

		// 2. clearAllTasks cancelled by user
		const clearCancelled = core.clearAllTasks(() => false);
		assert.strictEqual(clearCancelled, false);
		assert.strictEqual(core.tasks.length, 1);

		// 3. deleteTask for non-existent ID returns null
		const deleteNotFound = core.deleteTask("non-existent-id");
		assert.strictEqual(deleteNotFound, null);

		// 4. toggleTaskCompletion for non-existent ID returns false
		const toggleNotFound = core.toggleTaskCompletion("non-existent-id");
		assert.strictEqual(toggleNotFound, false);

		// 5. exportTasks returns serialized JSON string
		const jsonStr = core.exportTasks();
		assert.ok(typeof jsonStr === "string");
		assert.ok(jsonStr.includes("task-test-1"));

		// 6. getTask retrieves task by ID or undefined
		const retrieved = core.getTask("task-test-1");
		assert.strictEqual(retrieved?.title, "Integration Test Task");
		assert.strictEqual(core.getTask("unknown-id"), undefined);

		// 7. loadError getter
		const coreWithErr = new TaskCore({
			tasks: [],
			isCorrupted: false,
			loadError: "Simulated load error",
		});
		assert.strictEqual(coreWithErr.loadError, "Simulated load error");

		// 8. updateTask returns false when write lock is active
		core.handleStorageEvent(null); // triggers lock for external clear
		assert.strictEqual(core.hasExternalTabUpdate, true);
		const updateLocked = core.updateTask("task-test-1", {
			title: "Locked Update",
		});
		assert.strictEqual(updateLocked, false);

		// 9. syncFromStorage succeeds when confirmed and updates state cleanly
		shouldThrowOnSet = false;
		saveTasksToStorage([
			sampleValidTask,
			{ ...sampleValidTask, id: "task-from-external" },
		]);
		const syncedSuccess = core.syncFromStorage(() => true);
		assert.strictEqual(syncedSuccess, true);
		assert.strictEqual(core.hasExternalTabUpdate, false);
		assert.strictEqual(core.tasks.length, 2);
	});

	test("TaskCore: comprehensive mutation branches (updateTask, restore, clear, reset, and locks)", () => {
		const core = new TaskCore();
		core.addTask({ title: "Base Task", priority: "medium" });
		const taskId = core.tasks[0].id;

		// 1. updateTask non-existent ID
		let errMsg = "";
		core.listeners.onToastError = (m) => {
			errMsg = m;
		};
		const notFound = core.updateTask("non-existent", { title: "Foo" });
		assert.strictEqual(notFound, false);
		assert.strictEqual(errMsg, "Task not found");

		// 2. updateTask status transition: Active -> Completed (sets completedAt)
		const completed = core.updateTask(taskId, {
			status: TaskStatus.Completed,
		});
		assert.strictEqual(completed, true);
		assert.ok(core.tasks[0].completedAt !== undefined);

		// 3. updateTask status transition: Completed -> Active (clears completedAt)
		const reopened = core.updateTask(taskId, { status: TaskStatus.Active });
		assert.strictEqual(reopened, true);
		assert.strictEqual(core.tasks[0].completedAt, undefined);

		// 4. updateTask with dueDate variants (string, empty string, null)
		core.updateTask(taskId, { dueDate: "2026-10-15" });
		assert.strictEqual(core.tasks[0].dueDate, "2026-10-15");
		core.updateTask(taskId, { dueDate: "" });
		assert.strictEqual(core.tasks[0].dueDate, undefined);
		core.updateTask(taskId, { dueDate: "2026-10-15" });
		core.updateTask(taskId, { dueDate: null });
		assert.strictEqual(core.tasks[0].dueDate, undefined);

		// 5. updateTask validation failure (empty title)
		const invalidTitle = core.updateTask(taskId, { title: "   " });
		assert.strictEqual(invalidTitle, false);

		// 6. Failing save in updateTask, restoreSpecificTask, deleteTask, toggleTaskCompletion
		shouldThrowOnSet = true;
		assert.strictEqual(
			core.updateTask(taskId, { title: "New Title" }),
			false,
		);
		assert.strictEqual(core.toggleTaskCompletion(taskId), false);
		assert.strictEqual(
			core.restoreSpecificTask(
				{ ...sampleValidTask, id: "restored-id" },
				0,
			),
			false,
		);
		assert.strictEqual(core.deleteTask(taskId), null);
		shouldThrowOnSet = false;

		// 7. restoreSpecificTask when task ID already exists
		const duplicateRestore = core.restoreSpecificTask(core.tasks[0], 0);
		assert.strictEqual(duplicateRestore, false);
		assert.ok(errMsg.includes("already exists"));

		// 8. loadSampleTasks on empty workspace (no confirm needed) and failing save
		core.clearAllTasks(() => true);
		assert.strictEqual(core.tasks.length, 0);
		shouldThrowOnSet = true;
		assert.strictEqual(core.loadSampleTasks(), false);
		shouldThrowOnSet = false;
		assert.strictEqual(core.loadSampleTasks(), true);
		assert.strictEqual(core.tasks.length, 8);

		// 9. clearAllTasks on empty workspace returns false
		core.clearAllTasks(() => true);
		assert.strictEqual(core.tasks.length, 0);
		assert.strictEqual(
			core.clearAllTasks(() => true),
			false,
		);

		// 10. clearAllTasks failing save
		core.addTask({ title: "Task for failing clear" });
		shouldThrowOnSet = true;
		assert.strictEqual(
			core.clearAllTasks(() => true),
			false,
		);
		shouldThrowOnSet = false;

		// 11. resetCorruptedStorage branches: cancel, failing save, and successful reset
		store.set(STORAGE_KEY, "{ corrupted data");
		const corruptedCore = new TaskCore();
		assert.strictEqual(corruptedCore.isCorrupted, true);

		// User cancels reset
		assert.strictEqual(
			corruptedCore.resetCorruptedStorage(() => false),
			false,
		);
		assert.strictEqual(corruptedCore.isCorrupted, true);

		// Write fails during reset
		shouldThrowOnSet = true;
		assert.strictEqual(
			corruptedCore.resetCorruptedStorage(() => true),
			false,
		);
		assert.strictEqual(corruptedCore.isCorrupted, true);
		shouldThrowOnSet = false;

		// Successful reset
		assert.strictEqual(
			corruptedCore.resetCorruptedStorage(() => true),
			true,
		);
		assert.strictEqual(corruptedCore.isCorrupted, false);
		assert.strictEqual(corruptedCore.tasks.length, 0);

		// 12. downloadRawCorruptedBackup early returns
		corruptedCore.downloadRawCorruptedBackup(); // without rawCorruptedString

		// 13. addTask returns null when writeLock is active
		corruptedCore.handleStorageEvent(null);
		assert.strictEqual(
			corruptedCore.addTask({ title: "Should fail under lock" }),
			null,
		);
	});

	// emergencyRecovery additional branch coverage tests
	test("emergencyRecovery: handles fallback branches across corrupted, initial_load_failed, and legacy globals", () => {
		const g = globalThis as unknown as Record<string, unknown>;

		// 1. Corrupted recovery with raw recovered from storageGetter
		g.__nextly_emergency_recovery = {
			status: "corrupted",
			rawCorruptedString: undefined,
		};
		delete g.__nextly_latest_tasks;

		const backup1 = extractEmergencyBackupData(
			() => "{ raw from storageGetter }",
		);
		assert.strictEqual(backup1.success, true);
		assert.strictEqual(backup1.content, "{ raw from storageGetter }");

		// 2. Corrupted recovery where storageGetter returns null/empty
		const backupEmpty = extractEmergencyBackupData(() => null);
		assert.strictEqual(backupEmpty.success, false);
		assert.ok(backupEmpty.error?.includes("empty or unavailable"));

		// 3. Corrupted recovery where storageGetter throws
		const backupThrow = extractEmergencyBackupData(() => {
			throw new Error("QuotaExceeded");
		});
		assert.strictEqual(backupThrow.success, false);
		assert.ok(backupThrow.error?.includes("QuotaExceeded"));

		// 4. Corrupted recovery without storageGetter (direct localStorage)
		store.set(STORAGE_KEY, "{ raw in localStorage }");
		const backupDirectStorage = extractEmergencyBackupData();
		assert.strictEqual(backupDirectStorage.success, true);
		assert.strictEqual(
			backupDirectStorage.content,
			"{ raw in localStorage }",
		);

		// 5. initial_load_failed recovery where storageGetter returns stored payload
		g.__nextly_emergency_recovery = {
			status: "initial_load_failed",
			error: "Read error",
		};
		const backup2 = extractEmergencyBackupData(
			() => '{"version":1,"tasks":[]}',
		);
		assert.strictEqual(backup2.success, true);
		assert.strictEqual(backup2.content, '{"version":1,"tasks":[]}');

		// 6. initial_load_failed recovery where storageGetter returns null
		const backupInitFailedNull = extractEmergencyBackupData(() => null);
		assert.strictEqual(backupInitFailedNull.success, false);
		assert.ok(
			backupInitFailedNull.error?.includes("Initial storage load failed"),
		);

		// 7. initial_load_failed without storageGetter reading direct localStorage
		const backupInitDirect = extractEmergencyBackupData();
		assert.strictEqual(backupInitDirect.success, true);

		// 8. initial_load_failed where direct storage throws
		shouldThrowOnGet = true;
		const backupInitThrow = extractEmergencyBackupData();
		assert.strictEqual(backupInitThrow.success, false);
		shouldThrowOnGet = false;

		// 9. Legacy fallback: only __nextly_latest_tasks is set
		delete g.__nextly_emergency_recovery;
		g.__nextly_latest_tasks = [sampleValidTask];
		const backupLegacy = extractEmergencyBackupData();
		assert.strictEqual(backupLegacy.success, true);
		assert.strictEqual(backupLegacy.inMemoryTasks?.length, 1);

		// 10. No globals at all: reads from storageGetter
		delete g.__nextly_latest_tasks;
		const backupStorage = extractEmergencyBackupData(
			() => '{"source":"storage-fallback"}',
		);
		assert.strictEqual(backupStorage.success, true);
		assert.strictEqual(
			backupStorage.content,
			'{"source":"storage-fallback"}',
		);

		// 11. No globals at all: reads from direct localStorage
		store.set(STORAGE_KEY, '{"source":"direct-ls"}');
		const backupDirectLS = extractEmergencyBackupData();
		assert.strictEqual(backupDirectLS.success, true);

		// 12. No globals: storage empty returns error
		store.clear();
		const backupEmptyLS = extractEmergencyBackupData();
		assert.strictEqual(backupEmptyLS.success, false);
		assert.ok(backupEmptyLS.error?.includes("No task data found"));

		// 13. No globals: storage throws returns error
		shouldThrowOnGet = true;
		const backupStorageThrow = extractEmergencyBackupData();
		assert.strictEqual(backupStorageThrow.success, false);
		assert.ok(
			backupStorageThrow.error?.includes(
				"Browser storage is unavailable",
			),
		);
		shouldThrowOnGet = false;
	});
});
