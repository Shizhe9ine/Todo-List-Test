"use client";

import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Task = {
  id: number;
  title: string;
  description: string | null;
  status: "todo" | "done";
  priority: "low" | "medium" | "high";
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  sortOrder?: number;
};

type Filter = "all" | "todo" | "done" | "today";
type Priority = "low" | "medium" | "high";
type CalendarView = "week" | "month";
const priorityOptions: Priority[] = ["high", "medium", "low"];

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [calendarView, setCalendarView] = useState<CalendarView>("week");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "medium" as Priority
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "medium" as Priority
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/todos", { cache: "no-store" });
        const text = await res.text();
        if (!res.ok) {
          let message = "Failed to load tasks";
          try {
            const err = text ? JSON.parse(text) : null;
            if (err?.error) message = err.error;
          } catch {}
          setError(message);
          setTasks([]);
          return;
        }
        const data = text ? JSON.parse(text) : [];
        setTasks(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setError("Failed to load tasks");
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return tasks.filter((task) => {
      if (filter === "todo") return task.status === "todo";
      if (filter === "done") return task.status === "done";
      if (filter === "today") {
        if (!task.dueDate) return false;
        const due = new Date(task.dueDate);
        return due >= today && due < tomorrow;
      }
      return true;
    });
  }, [tasks, filter]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }
    })
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setError(null);
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          dueDate: form.dueDate || undefined,
          priority: form.priority
        })
      });
      const text = await res.text();
      if (!res.ok) {
        let message = "Failed to create task";
        try {
          const err = text ? JSON.parse(text) : null;
          if (err?.error) message = err.error;
        } catch {}
        setError(message);
        return;
      }
      const task: Task | null = text ? JSON.parse(text) : null;
      if (!task) {
        setError("Failed to create task");
        return;
      }
      setTasks((prev) =>
        [...prev, task].sort(
          (a, b) =>
            (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );
      setForm({ title: "", description: "", dueDate: "", priority: "medium" });
    } catch (err) {
      console.error(err);
      setError("Could not create task");
    }
  };

  const toggleStatus = async (task: Task) => {
    const nextStatus = task.status === "todo" ? "done" : "todo";
    try {
      const res = await fetch(`/api/todos/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      if (!res.ok) throw new Error("Failed to update task");
      const updated: Task = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (err) {
      console.error(err);
      setError("Could not update task");
    }
  };

  const deleteTask = async (id: number) => {
    try {
      const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete task");
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error(err);
      setError("Could not delete task");
    }
  };

  const startEdit = (task: Task) => {
    setError(null);
    setEditingId(task.id);
    setEditForm({
      title: task.title,
      description: task.description ?? "",
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
      priority: task.priority
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setError(null);
  };

  const saveEdit = async () => {
    if (editingId === null) return;
    if (!editForm.title.trim()) {
      setError("Title is required");
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/todos/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title.trim(),
          description: editForm.description.trim() || null,
          priority: editForm.priority,
          dueDate: editForm.dueDate || null
        })
      });
      if (!res.ok) throw new Error("Failed to update task");
      const updated: Task = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditingId(null);
    } catch (err) {
      console.error(err);
      setError("Could not update task");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (filter !== "all") return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex((t) => `${t.id}` === active.id);
    const newIndex = tasks.findIndex((t) => `${t.id}` === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(tasks, oldIndex, newIndex);
    setTasks(reordered);

    try {
      await fetch("/api/todos/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: reordered.map((t) => t.id) })
      });
    } catch (err) {
      console.error(err);
      setError("Could not reorder tasks");
    }
  };

  const priorityDot = (priority: Priority, label?: string) => (
    <span className={`priority-dot ${priority}`} aria-label={label} title={label} />
  );

  const prioritySelector = (
    current: Priority,
    onSelect: (p: Priority) => void,
    name: string
  ) => (
    <div className="priority-choices" role="group" aria-label={`${name} priority`}>
      {priorityOptions.map((level) => (
        <button
          key={level}
          type="button"
          className={`priority-choice ${level} ${current === level ? "selected" : ""}`}
          aria-label={`${level} priority`}
          onClick={() => onSelect(level)}
        >
          {priorityDot(level)}
        </button>
      ))}
    </div>
  );

  const calendarData = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      if (!task.dueDate) return;
      const key = task.dueDate.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    });
    return map;
  }, [tasks]);

  const today = new Date();
  const startOfWeek = (() => {
    const d = new Date(today);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  const weekDays = [...Array(7)].map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });

  const monthDays = (() => {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const days: Date[] = [];
    let cursor = new Date(start);
    while (cursor <= end) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  })();

  const renderCalendarDay = (d: Date) => {
    const key = d.toISOString().slice(0, 10);
    const dayTasks = calendarData.get(key) || [];
    return (
      <div key={key} className="cal-day">
        <div className="cal-date">{d.getDate()}</div>
        <div className="cal-dots">
          {dayTasks.map((task) => (
            <span
              key={task.id}
              className={`cal-dot ${task.priority}`}
              title={task.title}
              aria-label={`${task.title} (${task.priority})`}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <main className="page">
      <section className="panel">
        <header className="header">
          <div>
            <p className="eyebrow">MVP</p>
            <h1>Todos</h1>
          </div>
          <div className="filters">
            {["all", "todo", "done", "today"].map((key) => (
              <button
                key={key}
                className={filter === key ? "chip active" : "chip"}
                onClick={() => setFilter(key as Filter)}
                type="button"
              >
                {key === "all" && "All"}
                {key === "todo" && "Todo"}
                {key === "done" && "Done"}
                {key === "today" && "Due today"}
              </button>
            ))}
          </div>
        </header>

        <form className="form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label>
              Title
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Add a task"
              />
            </label>
          </div>
          <div className="form-row two-col">
            <label>
              Description
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional"
              />
            </label>
            <label>
              Due date
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </label>
            <div>
              <div className="label-inline">Priority</div>
              {prioritySelector(
                form.priority,
                (p) => setForm({ ...form, priority: p }),
                "New task"
              )}
            </div>
          </div>
          <div className="form-actions">
            <button type="submit">Add task</button>
          </div>
        </form>

        {error && <p className="error">{error}</p>}

        <div className="list">
          {loading && <p className="muted">Loading...</p>}
          {!loading && filtered.length === 0 && (
            <p className="muted">No tasks yet. Add your first one!</p>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filtered.map((t) => `${t.id}`)} strategy={rectSortingStrategy}>
              {filtered.map((task) => {
                const isEditing = editingId === task.id;
                return (
                  <SortableTask
                    key={task.id}
                    task={task}
                    isEditing={isEditing}
                    editForm={editForm}
                    priorityDot={priorityDot}
                    prioritySelector={prioritySelector}
                    onToggle={() => toggleStatus(task)}
                    onDelete={() => deleteTask(task.id)}
                    onStartEdit={() => startEdit(task)}
                    onCancelEdit={cancelEdit}
                    onSaveEdit={saveEdit}
                    onEditChange={setEditForm}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        </div>

        <section className="calendar">
          <div className="calendar-header">
            <div>
              <p className="eyebrow">Schedule</p>
              <h2>Due dates</h2>
            </div>
            <div className="filters">
              <button
                type="button"
                className={calendarView === "week" ? "chip active" : "chip"}
                onClick={() => setCalendarView("week")}
              >
                This week
              </button>
              <button
                type="button"
                className={calendarView === "month" ? "chip active" : "chip"}
                onClick={() => setCalendarView("month")}
              >
                This month
              </button>
            </div>
          </div>
          <div className={`calendar-grid ${calendarView}`}>
            {(calendarView === "week" ? weekDays : monthDays).map((d) => renderCalendarDay(d))}
          </div>
        </section>

        <section className="focus-timer">
          <div className="focus-header">
            <div>
              <p className="eyebrow">Focus mode</p>
              <h2>Focus Timer</h2>
            </div>
          </div>
          <FocusTimer />
        </section>
      </section>
    </main>
  );
}

type SortableTaskProps = {
  task: Task;
  isEditing: boolean;
  editForm: {
    title: string;
    description: string;
    dueDate: string;
    priority: Priority;
  };
  priorityDot: (p: Priority, label?: string) => JSX.Element;
  prioritySelector: (current: Priority, onSelect: (p: Priority) => void, name: string) => JSX.Element;
  onToggle: () => void;
  onDelete: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onEditChange: Dispatch<
    SetStateAction<{
      title: string;
      description: string;
      dueDate: string;
      priority: Priority;
    }>
  >;
};

function SortableTask(props: SortableTaskProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${props.task.id}`
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`card ${isDragging ? "dragging" : ""}`}
      {...attributes}
      {...listeners}
    >
      <div className="card-main" style={{ flex: 1 }}>
        {props.isEditing ? (
          <div className="edit-block" style={{ display: "grid", gap: "0.5rem" }}>
            <label>
              Title
              <input
                value={props.editForm.title}
                onChange={(e) =>
                  props.onEditChange((f) => ({ ...f, title: e.target.value }))
                }
              />
            </label>
            <label>
              Description
              <input
                value={props.editForm.description}
                onChange={(e) =>
                  props.onEditChange((f) => ({ ...f, description: e.target.value }))
                }
              />
            </label>
            <div className="form-row two-col" style={{ padding: 0 }}>
              <div>
                <div className="label-inline">Priority</div>
                {props.prioritySelector(
                  props.editForm.priority,
                  (p) => props.onEditChange((f) => ({ ...f, priority: p })),
                  "Edit task"
                )}
              </div>
              <label>
                Due date
                <input
                  type="date"
                  value={props.editForm.dueDate}
                  onChange={(e) =>
                    props.onEditChange((f) => ({ ...f, dueDate: e.target.value }))
                  }
                />
              </label>
            </div>
          </div>
        ) : (
          <div>
            <div className="title-row">
              <input type="checkbox" checked={props.task.status === "done"} onChange={props.onToggle} />
              {props.priorityDot(props.task.priority, `${props.task.priority} priority`)}
              <h3 className={props.task.status === "done" ? "muted line" : ""}>{props.task.title}</h3>
            </div>
            {props.task.description && <p className="description">{props.task.description}</p>}
            <div className="meta">
              {props.task.dueDate && (
                <span className="pill subtle">
                  Due {new Date(props.task.dueDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="card-actions" style={{ display: "flex", gap: "0.5rem" }}>
        {props.isEditing ? (
          <>
            <button className="link" onClick={props.onSaveEdit} type="button">
              Save
            </button>
            <button className="link" onClick={props.onCancelEdit} type="button">
              Cancel
            </button>
          </>
        ) : (
          <>
            <button className="link" onClick={props.onStartEdit} type="button">
              Edit
            </button>
            <button className="link danger" onClick={props.onDelete} type="button">
              Delete
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function FocusTimer() {
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [includeBreak, setIncludeBreak] = useState(true);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [remaining, setRemaining] = useState(focusMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  const totalSeconds = phase === "focus" ? focusMinutes * 60 : breakMinutes * 60;
  const progress = totalSeconds > 0 ? (1 - remaining / totalSeconds) * 100 : 0;

  useEffect(() => {
    // reset remaining if configs change while not running
    if (!isRunning) {
      setRemaining(phase === "focus" ? focusMinutes * 60 : breakMinutes * 60);
    }
  }, [focusMinutes, breakMinutes, phase, isRunning]);

  useEffect(() => {
    if (!isRunning) return;
    if (remaining <= 0) {
      if (phase === "focus" && includeBreak) {
        setPhase("break");
        setRemaining(breakMinutes * 60);
      } else if (phase === "break") {
        // end after one cycle
        handleReset();
      } else {
        handleReset();
      }
      return;
    }
    const id = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    setIntervalId(id);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, remaining, phase, includeBreak, breakMinutes]);

  const handleStart = () => {
    setPhase("focus");
    setRemaining(focusMinutes * 60);
    setIsRunning(true);
  };

  const handlePause = () => {
    if (intervalId) clearInterval(intervalId);
    setIntervalId(null);
    setIsRunning(false);
  };

  const handleResume = () => {
    if (remaining > 0) setIsRunning(true);
  };

  const handleReset = () => {
    if (intervalId) clearInterval(intervalId);
    setIntervalId(null);
    setIsRunning(false);
    setPhase("focus");
    setRemaining(focusMinutes * 60);
  };

  const minutes = Math.floor(remaining / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (remaining % 60).toString().padStart(2, "0");

  return (
    <div className="focus-card">
      <div className="focus-config">
        <label>
          Focus (min)
          <input
            type="number"
            min={1}
            max={180}
            value={focusMinutes}
            onChange={(e) => setFocusMinutes(Math.max(1, Number(e.target.value) || 1))}
          />
        </label>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={includeBreak}
            onChange={(e) => setIncludeBreak(e.target.checked)}
          />
          <span>Include break</span>
        </label>
        <label>
          Break (min)
          <input
            type="number"
            min={1}
            max={60}
            value={breakMinutes}
            disabled={!includeBreak}
            onChange={(e) => setBreakMinutes(Math.max(1, Number(e.target.value) || 1))}
          />
        </label>
      </div>

      <div className="focus-display">
        <div className="timer-phase">{phase === "focus" ? "Focus" : "Break"}</div>
        <div className="timer-time">{minutes}:{seconds}</div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="focus-actions">
        {!isRunning && remaining === focusMinutes * 60 ? (
          <button className="chip" onClick={handleStart} type="button">
            Start
          </button>
        ) : isRunning ? (
          <button className="chip" onClick={handlePause} type="button">
            Pause
          </button>
        ) : (
          <button className="chip" onClick={handleResume} type="button">
            Resume
          </button>
        )}
        <button className="chip" onClick={handleReset} type="button">
          Reset
        </button>
      </div>
    </div>
  );
}
