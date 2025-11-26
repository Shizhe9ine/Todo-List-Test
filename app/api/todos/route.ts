import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }]
    });
    return NextResponse.json(tasks);
  } catch (err) {
    console.error("GET /api/todos failed", err);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const title = typeof data.title === "string" ? data.title.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const description =
      typeof data.description === "string" && data.description.trim()
        ? data.description.trim()
        : null;
    const status =
      data.status === "done" || data.status === "todo" ? data.status : "todo";
    const priority: "low" | "medium" | "high" =
      data.priority === "low" || data.priority === "high" ? data.priority : "medium";
    const dueDate =
      typeof data.dueDate === "string" && data.dueDate.trim()
        ? new Date(data.dueDate)
        : null;

    const maxOrder = await prisma.task.aggregate({ _max: { sortOrder: true } });
    const nextOrder = (maxOrder._max.sortOrder ?? 0) + 1;

    const task = await prisma.task.create({
      data: { title, description, status, priority, dueDate, sortOrder: nextOrder }
    });
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    console.error("POST /api/todos failed", err);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
