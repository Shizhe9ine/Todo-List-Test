import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const taskId = Number(id);
  const data = await request.json();

  const updates: {
    title?: string;
    description?: string | null;
    status?: "todo" | "done";
    priority?: "low" | "medium" | "high";
    dueDate?: Date | null;
  } = {};

  if ("title" in data && typeof data.title === "string") updates.title = data.title.trim();
  if ("description" in data && typeof data.description === "string")
    updates.description = data.description.trim() || null;
  if ("status" in data && (data.status === "todo" || data.status === "done"))
    updates.status = data.status;
  if (
    "priority" in data &&
    (data.priority === "low" || data.priority === "medium" || data.priority === "high")
  )
    updates.priority = data.priority;
  if ("dueDate" in data) {
    if (data.dueDate === null) updates.dueDate = null;
    else if (typeof data.dueDate === "string" && data.dueDate.trim())
      updates.dueDate = new Date(data.dueDate);
  }

  try {
    const task = await prisma.task.update({
      where: { id: taskId },
      data: updates
    });
    return NextResponse.json(task);
  } catch {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const taskId = Number(id);
  try {
    await prisma.task.delete({ where: { id: taskId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
}
