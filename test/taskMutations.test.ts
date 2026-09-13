import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { TaskStatus } from "../src/types/Task.ts";
import type { Task } from "../src/types/Task.ts";
import { getDueDateUrgency } from "../src/utils/dateUtils.ts";
import { TaskCore } from "../src/context/taskCore.ts";

// In-memory mock for localStorage in Node environment
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, val: string) => {
    store.set(key, val);
  },
  removeItem: (key: string) => store.delete(key),
  clear: () => store.clear(),
  get length() {
    return store.size;
  },
  key: () => null,
};

const initialTask: Task = {
  id: "task-100",
  title: "Deadline Task",
  description: "Has a due date",
  category: "work",
  priority: "high",
  status: TaskStatus.Active,
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:00:00.000Z",
  dueDate: "2026-09-12",
};

describe("task mutations and edge cases using TaskCore production controller", () => {
  beforeEach(() => {
    store.clear();
    delete (globalThis as unknown as { __nextly_latest_tasks?: unknown }).__nextly_latest_tasks;
    delete (globalThis as unknown as { __nextly_emergency_recovery?: unknown }).__nextly_emergency_recovery;
  });

  // R05 regression check: explicit deadline clearing via TaskCore
  test("clearing dueDate with null or empty string removes deadline via TaskCore.updateTask", () => {
    const core = new TaskCore({
      tasks: [{ ...initialTask }],
      isCorrupted: false,
    });

    // Clear with null
    const updatedNull = core.updateTask("task-100", { dueDate: null });
    assert.strictEqual(updatedNull, true);
    const taskNull = core.getTask("task-100");
    assert.strictEqual(taskNull?.dueDate, undefined);
    assert.strictEqual(getDueDateUrgency(taskNull?.dueDate, "2026-09-12"), "none");

    // Re-set deadline and clear with empty string
    core.updateTask("task-100", { dueDate: "2026-09-15" });
    assert.strictEqual(core.getTask("task-100")?.dueDate, "2026-09-15");

    const updatedEmpty = core.updateTask("task-100", { dueDate: "" });
    assert.strictEqual(updatedEmpty, true);
    const taskEmpty = core.getTask("task-100");
    assert.strictEqual(taskEmpty?.dueDate, undefined);
    assert.strictEqual(getDueDateUrgency(taskEmpty?.dueDate, "2026-09-12"), "none");
  });

  // R06 regression check: duplicate ID prevention during restoration via TaskCore
  test("restoring a task does not allow duplicate ID if task already exists via TaskCore.restoreSpecificTask", () => {
    let errorToast = "";
    const core = new TaskCore(
      {
        tasks: [{ ...initialTask }],
        isCorrupted: false,
      },
      {
        onToastError: (msg) => {
          errorToast = msg;
        },
      }
    );

    const taskToRestore: Task = { ...initialTask };
    const restored = core.restoreSpecificTask(taskToRestore, 0);

    assert.strictEqual(restored, false);
    assert.ok(errorToast.includes("already exists"));
    assert.strictEqual(core.tasks.length, 1);
  });

  // R04 regression check: pure validation and deterministic update outcome via TaskCore
  test("updating task performs synchronous pure validation and rejects invalid title via TaskCore.updateTask", () => {
    let errorToast = "";
    const core = new TaskCore(
      {
        tasks: [{ ...initialTask }],
        isCorrupted: false,
      },
      {
        onToastError: (msg) => {
          errorToast = msg;
        },
      }
    );

    const invalidUpdate = core.updateTask("task-100", { title: "" });
    assert.strictEqual(invalidUpdate, false);
    assert.ok(errorToast.includes("Title is required"));

    const validUpdate = core.updateTask("task-100", {
      title: "Updated Title",
      priority: "low",
    });
    assert.strictEqual(validUpdate, true);
    const updated = core.getTask("task-100");
    assert.strictEqual(updated?.title, "Updated Title");
    assert.strictEqual(updated?.priority, "low");
  });

  // R04/M1 regression check: completedAt set on complete and cleared on reopen via TaskCore
  test("completion toggle sets completedAt timestamp and clearing sets it undefined via TaskCore.toggleTaskCompletion", () => {
    const core = new TaskCore({
      tasks: [{ ...initialTask }],
      isCorrupted: false,
    });

    // Active -> Completed
    const toggledComplete = core.toggleTaskCompletion("task-100");
    assert.strictEqual(toggledComplete, true);
    const completedTask = core.getTask("task-100");
    assert.strictEqual(completedTask?.status, TaskStatus.Completed);
    assert.ok(completedTask?.completedAt, "completedAt must be set on completion");
    assert.ok(typeof completedTask?.completedAt === "string");

    // Completed -> Active
    const toggledReopen = core.toggleTaskCompletion("task-100");
    assert.strictEqual(toggledReopen, true);
    const reopenedTask = core.getTask("task-100");
    assert.strictEqual(reopenedTask?.status, TaskStatus.Active);
    assert.strictEqual(reopenedTask?.completedAt, undefined);
  });

  // R09 regression check: day transition shifts urgency
  test("crossing midnight shifts task from due today to overdue without editing task", () => {
    const task: Task = {
      ...initialTask,
      dueDate: "2026-09-12",
    };

    // On Sep 12, urgency is today
    assert.strictEqual(getDueDateUrgency(task.dueDate, "2026-09-12"), "today");

    // On Sep 13 (crossing midnight), urgency becomes overdue
    assert.strictEqual(getDueDateUrgency(task.dueDate, "2026-09-13"), "overdue");
  });

  // V02 regression check: controller boundary rejects malformed dueDate suffix (e.g. 2026-09-15Tgarbage)
  test("V02: addTask and updateTask reject malformed dueDate suffix at controller boundary", () => {
    let errorToast = "";
    const core = new TaskCore(
      {
        tasks: [{ ...initialTask }],
        isCorrupted: false,
      },
      {
        onToastError: (msg) => {
          errorToast = msg;
        },
      }
    );

    // 1. addTask rejects malformed dueDate suffix
    const addResult = core.addTask({
      title: "Task with bad date",
      dueDate: "2026-09-15Tgarbage",
    });
    assert.strictEqual(addResult, null);
    assert.ok(errorToast.includes("dueDate"));

    // 2. updateTask rejects malformed dueDate suffix
    errorToast = "";
    const updateResult = core.updateTask("task-100", {
      dueDate: "2026-09-15Tgarbage",
    });
    assert.strictEqual(updateResult, false);
    assert.ok(errorToast.includes("dueDate"));

    // Task remains unmodified
    assert.strictEqual(core.getTask("task-100")?.dueDate, "2026-09-12");

    // 3. Valid ISO timestamp is accepted and canonicalized to YYYY-MM-DD
    const validUpdate = core.updateTask("task-100", {
      dueDate: "2026-09-20T10:00:00.000Z",
    });
    assert.strictEqual(validUpdate, true);
    assert.strictEqual(core.getTask("task-100")?.dueDate, "2026-09-20");
  });
});
