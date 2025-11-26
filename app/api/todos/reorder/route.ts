import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function PATCH(request: Request) {
  const body = await request.json();
  const ids = Array.isArray(body?.ids) ? body.ids : [];
  if (!ids.length) {
    return NextResponse.json({ error: "No ids provided" }, { status: 400 });
  }

  const updates = ids.map((id: string | number, index: number) =>
    prisma.task.update({
      where: { id: Number(id) },
      data: { sortOrder: index + 1 }
    })
  );

  try {
    await prisma.$transaction(updates);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to reorder" }, { status: 400 });
  }
}
