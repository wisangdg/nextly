import { test, describe } from "node:test";
import assert from "node:assert";
import { TaskStatus } from "../src/types/Task.ts";
import type { Task } from "../src/types/Task.ts";
import {
	sortTasks,
	compareDueDate,
	getSmartSortReason,
} from "../src/utils/taskSorting.ts";
import { generateSampleTasks } from "../src/utils/sampleData.ts";

const sampleTask = (overrides: Partial<Task>): Task => ({
	id: "t-1",
	title: "Test Task",
	description: "",
	category: "work",
	priority: "medium",
	status: TaskStatus.Active,
	createdAt: "2026-09-01T10:00:00.000Z",
	updatedAt: "2026-09-01T10:00:00.000Z",
	...overrides,
});

describe("taskSorting", () => {
	const today = "2026-09-12";

	test("Smart Sort places active before completed", () => {
		const t1 = sampleTask({ id: "1", status: TaskStatus.Completed });
		const t2 = sampleTask({ id: "2", status: TaskStatus.Active });
		const sorted = sortTasks([t1, t2], "smart", today);
		assert.strictEqual(sorted[0].id, "2");
		assert.strictEqual(sorted[1].id, "1");
	});

	test("Smart Sort orders by urgency: overdue -> today -> upcoming -> none", () => {
		const overdue = sampleTask({
			id: "overdue",
			dueDate: "2026-09-10",
			priority: "low",
		});
		const dueToday = sampleTask({
			id: "today",
			dueDate: "2026-09-12",
			priority: "high",
		});
		const upcoming = sampleTask({
			id: "upcoming",
			dueDate: "2026-09-15",
			priority: "high",
		});
		const noDate = sampleTask({
			id: "nodate",
			dueDate: undefined,
			priority: "high",
		});

		const sorted = sortTasks(
			[noDate, upcoming, dueToday, overdue],
			"smart",
			today,
		);
		assert.strictEqual(sorted[0].id, "overdue");
		assert.strictEqual(sorted[1].id, "today");
		assert.strictEqual(sorted[2].id, "upcoming");
		assert.strictEqual(sorted[3].id, "nodate");
	});

	test("Smart Sort breaks ties within same urgency by priority high > medium > low", () => {
		const low = sampleTask({
			id: "low",
			dueDate: "2026-09-12",
			priority: "low",
		});
		const med = sampleTask({
			id: "med",
			dueDate: "2026-09-12",
			priority: "medium",
		});
		const high = sampleTask({
			id: "high",
			dueDate: "2026-09-12",
			priority: "high",
		});

		const sorted = sortTasks([low, high, med], "smart", today);
		assert.strictEqual(sorted[0].id, "high");
		assert.strictEqual(sorted[1].id, "med");
		assert.strictEqual(sorted[2].id, "low");
	});

	test("F03 fix: compareDueDate handles two tasks with no dueDate deterministically", () => {
		const a = sampleTask({
			id: "a",
			dueDate: undefined,
			createdAt: "2026-09-02T00:00:00.000Z",
		});
		const b = sampleTask({
			id: "b",
			dueDate: undefined,
			createdAt: "2026-09-01T00:00:00.000Z",
		});

		// Should be deterministic: b is older or by ID
		const diffAB = compareDueDate(a, b);
		const diffBA = compareDueDate(b, a);
		assert.strictEqual(Math.sign(diffAB), -Math.sign(diffBA));
	});

	test("sortTasks does not mutate original array", () => {
		const original = [
			sampleTask({ id: "b", priority: "low" }),
			sampleTask({ id: "a", priority: "high" }),
		];
		const originalOrder = original.map((t) => t.id);
		sortTasks(original, "smart", today);
		assert.deepStrictEqual(
			original.map((t) => t.id),
			originalOrder,
		);
	});

	test("getSmartSortReason provides clear reason", () => {
		const overdue = sampleTask({ dueDate: "2026-09-10", priority: "high" });
		assert.strictEqual(
			getSmartSortReason(overdue, today),
			"Overdue · High priority",
		);

		const todayTask = sampleTask({
			dueDate: "2026-09-12",
			priority: "medium",
		});
		assert.strictEqual(
			getSmartSortReason(todayTask, today),
			"Due today · Medium priority",
		);

		const tomorrowTask = sampleTask({
			dueDate: "2026-09-13",
			priority: "low",
		});
		assert.strictEqual(
			getSmartSortReason(tomorrowTask, today),
			"Due tomorrow · Low priority",
		);

		const upcomingTask = sampleTask({
			dueDate: "2026-09-20",
			priority: "high",
		});
		assert.strictEqual(
			getSmartSortReason(upcomingTask, today),
			"Due Sep 20, 2026 · High priority",
		);

		const noDeadlineTask = sampleTask({
			dueDate: undefined,
			priority: "medium",
		});
		assert.strictEqual(
			getSmartSortReason(noDeadlineTask, today),
			"No deadline · Medium priority",
		);

		const completed = sampleTask({ status: TaskStatus.Completed });
		assert.strictEqual(getSmartSortReason(completed, today), "Completed");
	});

	test("sortTasks supports dueDate, priority, and newest modes", () => {
		const t1 = sampleTask({
			id: "1",
			priority: "low",
			dueDate: "2026-09-20",
			createdAt: "2026-09-01T10:00:00.000Z",
		});
		const t2 = sampleTask({
			id: "2",
			priority: "high",
			dueDate: "2026-09-10",
			createdAt: "2026-09-05T10:00:00.000Z",
		});
		const t3 = sampleTask({
			id: "3",
			priority: "medium",
			dueDate: undefined,
			createdAt: "2026-09-03T10:00:00.000Z",
		});
		const tCompleted = sampleTask({
			id: "4",
			status: TaskStatus.Completed,
		});

		// DueDate sort: nearest date first, active before completed, undefined at end
		const sortedDue = sortTasks([t3, t1, t2, tCompleted], "dueDate");
		assert.strictEqual(sortedDue[0].id, "2"); // Sep 10
		assert.strictEqual(sortedDue[1].id, "1"); // Sep 20
		assert.strictEqual(sortedDue[2].id, "3"); // undefined
		assert.strictEqual(sortedDue[3].id, "4"); // completed

		// Priority sort: high > medium > low, active before completed
		const sortedPriority = sortTasks([t1, t2, t3, tCompleted], "priority");
		assert.strictEqual(sortedPriority[0].id, "2"); // high
		assert.strictEqual(sortedPriority[1].id, "3"); // medium
		assert.strictEqual(sortedPriority[2].id, "1"); // low
		assert.strictEqual(sortedPriority[3].id, "4"); // completed

		// Newest sort: newest createdAt first, active before completed
		const sortedNewest = sortTasks([t1, t2, t3, tCompleted], "newest");
		assert.strictEqual(sortedNewest[0].id, "2"); // Sep 05
		assert.strictEqual(sortedNewest[1].id, "3"); // Sep 03
		assert.strictEqual(sortedNewest[2].id, "1"); // Sep 01
		assert.strictEqual(sortedNewest[3].id, "4"); // completed
	});

	test("compareSmartSort deterministically sorts completed tasks and handles secondary tie-breakers", () => {
		// Completed tasks: newest completedAt first, fallback to updatedAt, then ID
		const c1 = sampleTask({
			id: "c1",
			status: TaskStatus.Completed,
			completedAt: "2026-09-10T12:00:00.000Z",
		});
		const c2 = sampleTask({
			id: "c2",
			status: TaskStatus.Completed,
			completedAt: "2026-09-12T12:00:00.000Z",
		});
		const c3 = sampleTask({
			id: "c3",
			status: TaskStatus.Completed,
			completedAt: undefined,
			updatedAt: "2026-09-08T00:00:00.000Z",
		});
		const c4 = sampleTask({
			id: "c4",
			status: TaskStatus.Completed,
			completedAt: "2026-09-12T12:00:00.000Z",
		}); // tie with c2 by date, ID tie-breaker

		const sortedCompleted = sortTasks([c1, c3, c2, c4], "smart", today);
		assert.strictEqual(sortedCompleted[0].id, "c2"); // c2 before c4 by localeCompare
		assert.strictEqual(sortedCompleted[1].id, "c4");
		assert.strictEqual(sortedCompleted[2].id, "c1");
		assert.strictEqual(sortedCompleted[3].id, "c3");

		// Active tasks: same urgency & priority, tie break by due date, then creation date, then ID
		const a1 = sampleTask({
			id: "a1",
			priority: "high",
			dueDate: "2026-09-15",
			createdAt: "2026-09-01T00:00:00.000Z",
		});
		const a2 = sampleTask({
			id: "a2",
			priority: "high",
			dueDate: "2026-09-18",
			createdAt: "2026-09-01T00:00:00.000Z",
		});
		const a3 = sampleTask({
			id: "a3",
			priority: "high",
			dueDate: "2026-09-15",
			createdAt: "2026-09-02T00:00:00.000Z",
		});
		const a4 = sampleTask({
			id: "a4",
			priority: "high",
			dueDate: "2026-09-15",
			createdAt: "2026-09-01T00:00:00.000Z",
		}); // tie with a1 by dates, ID tie-breaker

		const sortedActive = sortTasks([a2, a3, a4, a1], "smart", today);
		assert.strictEqual(sortedActive[0].id, "a1"); // a1 before a4 by ID
		assert.strictEqual(sortedActive[1].id, "a4");
		assert.strictEqual(sortedActive[2].id, "a3"); // older createdAt first
		assert.strictEqual(sortedActive[3].id, "a2"); // later dueDate last
	});

	test("generateSampleTasks generates 8 realistic sample tasks with all urgency and priority levels", () => {
		const samples = generateSampleTasks();
		assert.strictEqual(samples.length, 8);
		assert.ok(samples.some((t) => t.priority === "high"));
		assert.ok(samples.some((t) => t.priority === "medium"));
		assert.ok(samples.some((t) => t.priority === "low"));
		assert.ok(samples.some((t) => !t.dueDate)); // no deadline task
		assert.ok(
			samples.every((t) => t.id && t.title && t.createdAt && t.updatedAt),
		);
	});
});
