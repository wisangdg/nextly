import { test, describe } from "node:test";
import assert from "node:assert";
import { TaskStatus } from "../src/types/Task.ts";
import type { Task } from "../src/types/Task.ts";
import {
  validateTask,
  exportTasksToJson,
  importTasksFromJson,
} from "../src/utils/storage.ts";

const validTask: Task = {
  id: "t-1",
  title: "Valid Task",
  description: "Description here",
  category: "work",
  priority: "high",
  status: TaskStatus.Active,
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:00:00.000Z",
  dueDate: "2026-09-15",
};

describe("storage and validation", () => {
  test("validateTask passes for valid task", () => {
    const res = validateTask(validTask);
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.errors.length, 0);
  });

  test("validateTask rejects missing or empty title", () => {
    const res1 = validateTask({ ...validTask, title: "" });
    assert.strictEqual(res1.isValid, false);

    const res2 = validateTask({ ...validTask, title: "   " });
    assert.strictEqual(res2.isValid, false);
  });

  test("validateTask rejects invalid priority", () => {
    const res = validateTask({ ...validTask, priority: "super-urgent" });
    assert.strictEqual(res.isValid, false);
  });

  test("validateTask rejects invalid dates", () => {
    const res1 = validateTask({ ...validTask, createdAt: "not-a-date" });
    assert.strictEqual(res1.isValid, false);

    const res2 = validateTask({ ...validTask, dueDate: "invalid-due-date" });
    assert.strictEqual(res2.isValid, false);
  });

  // R08 regression check: calendar date accuracy
  test("validateTask rejects non-existent calendar dates like 2026-02-31 or 2026-99-99", () => {
    const res1 = validateTask({ ...validTask, dueDate: "2026-02-31" });
    assert.strictEqual(res1.isValid, false);

    const res2 = validateTask({ ...validTask, dueDate: "2026-99-99" });
    assert.strictEqual(res2.isValid, false);

    const res3 = validateTask({ ...validTask, dueDate: "2026-04-31" }); // April only has 30 days
    assert.strictEqual(res3.isValid, false);
  });

  test("export and import round-trip preserves tasks", () => {
    const tasks = [validTask];
    const jsonStr = exportTasksToJson(tasks);
    const importRes = importTasksFromJson(jsonStr, []);

    assert.strictEqual(importRes.success, true);
    assert.strictEqual(importRes.importedCount, 1);
    assert.strictEqual(importRes.newTasks.length, 1);
    assert.strictEqual(importRes.newTasks[0].id, validTask.id);
  });

  test("importTasksFromJson skips duplicate IDs when merging", () => {
    const jsonStr = exportTasksToJson([validTask]);
    const importRes = importTasksFromJson(jsonStr, [validTask]);

    assert.strictEqual(importRes.success, true);
    assert.strictEqual(importRes.importedCount, 0);
    assert.strictEqual(importRes.skippedDuplicateCount, 1);
    assert.strictEqual(importRes.newTasks.length, 1);
  });

  test("importTasksFromJson rejects invalid JSON syntax", () => {
    const importRes = importTasksFromJson("{invalid json", []);
    assert.strictEqual(importRes.success, false);
    assert.ok(importRes.error !== undefined);
  });

  // R08 regression check: unsupported envelope schema version
  test("importTasksFromJson rejects unsupported schema version", () => {
    const unsupportedPayload = JSON.stringify({
      version: 99,
      tasks: [validTask],
    });
    const importRes = importTasksFromJson(unsupportedPayload, [validTask]);
    assert.strictEqual(importRes.success, false);
    assert.ok(importRes.error?.includes("Unsupported storage version"));
  });

  // R08 regression check: atomic import failure on mixed valid/invalid payload
  test("importTasksFromJson atomically rejects mixed valid/invalid payload", () => {
    const mixedPayload = JSON.stringify({
      version: 1,
      tasks: [
        validTask,
        { id: "bad-task", title: "" }, // invalid item
      ],
    });
    const initialTasks = [validTask];
    const importRes = importTasksFromJson(mixedPayload, initialTasks);
    assert.strictEqual(importRes.success, false);
    assert.ok(importRes.error?.includes("invalid item(s)"));
    assert.strictEqual(importRes.newTasks, initialTasks); // existing tasks unchanged
  });

  // R08 regression check: multibyte and full field round-trip preservation
  test("export and import round-trip preserves all fields including multibyte characters", () => {
    const fullTask: Task = {
      id: "t-multibyte",
      title: "Task with emoji 🎯 & non-ascii: Jakarta café ☕",
      description: "Deskripsi lengkap dengan aksen & unicode: 日本語 / العربية",
      category: "personal",
      priority: "high",
      status: TaskStatus.Completed,
      createdAt: "2026-09-01T12:00:00.000Z",
      updatedAt: "2026-09-02T15:30:00.000Z",
      dueDate: "2026-09-20",
      completedAt: "2026-09-02T15:30:00.000Z",
    };

    const exported = exportTasksToJson([fullTask]);
    const imported = importTasksFromJson(exported, []);

    assert.strictEqual(imported.success, true);
    assert.strictEqual(imported.importedCount, 1);
    const restored = imported.newTasks[0];
    assert.strictEqual(restored.id, fullTask.id);
    assert.strictEqual(restored.title, fullTask.title);
    assert.strictEqual(restored.description, fullTask.description);
    assert.strictEqual(restored.category, fullTask.category);
    assert.strictEqual(restored.priority, fullTask.priority);
    assert.strictEqual(restored.status, fullTask.status);
    assert.strictEqual(restored.createdAt, fullTask.createdAt);
    assert.strictEqual(restored.updatedAt, fullTask.updatedAt);
    assert.strictEqual(restored.dueDate, fullTask.dueDate);
    assert.strictEqual(restored.completedAt, fullTask.completedAt);
  });
});
