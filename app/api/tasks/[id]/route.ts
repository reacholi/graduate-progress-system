import {
  mapTask,
  mapTaskLog,
  toTaskLogInsert,
  toTaskUpdate,
  type TaskDto,
  type UserRole,
} from "@/src/lib/dbMappers";
import { supabaseAdmin } from "@/src/lib/supabaseAdmin";

const conflictMessage = "该任务已被其他人更新，请刷新后再修改，避免覆盖他人内容。";

type UpdateTaskBody = Partial<TaskDto> & {
  editorName?: string;
  editorRole?: UserRole;
  note?: string;
  originalUpdatedAt?: string;
  changes?: Array<{
    field: string;
    before: string;
    after: string;
  }>;
};

type DeleteTaskBody = {
  editorName?: string;
  editorRole?: UserRole;
  note?: string;
};

function formatTaskLogChanges(
  changes: NonNullable<UpdateTaskBody["changes"]>,
) {
  return changes
    .map((change) => `${change.field}：${change.before} → ${change.after}`)
    .join("；");
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/tasks/[id]">) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as UpdateTaskBody | null;

  if (!body?.editorName || !body.editorRole || !body.note?.trim()) {
    return Response.json({ error: "当前登录用户和修改说明为必填项。" }, { status: 400 });
  }

  if (!body.originalUpdatedAt) {
    return Response.json({ error: "缺少并发校验字段 originalUpdatedAt。" }, { status: 400 });
  }

  const { data: currentTaskRow, error: readError } = await supabaseAdmin
    .from("tasks")
    .select("*")
    .eq("id", id)
    .eq("is_deleted", false)
    .single();

  if (readError) {
    return Response.json({ error: readError.message }, { status: 500 });
  }

  const currentTask = mapTask(currentTaskRow);

  if (currentTask.updatedAt !== body.originalUpdatedAt) {
    return Response.json({ error: conflictMessage }, { status: 409 });
  }

  const progress = body.status === "已完成" ? 100 : (body.progress ?? currentTask.progress);
  const updateValues = {
    title: body.title?.trim() ?? currentTask.title,
    shortName: body.shortName ?? currentTask.shortName,
    category: body.category ?? currentTask.category,
    startDate: body.startDate ?? currentTask.startDate,
    endDate: body.endDate ?? currentTask.endDate,
    status: body.status ?? currentTask.status,
    progress,
    riskLevel: body.riskLevel ?? currentTask.riskLevel,
    deliverable: body.deliverable?.trim() ?? currentTask.deliverable,
  };

  const { data: updatedTaskRow, error: updateError } = await supabaseAdmin
    .from("tasks")
    .update(toTaskUpdate(updateValues))
    .eq("id", id)
    .select("*")
    .single();

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  const updatedTask = mapTask(updatedTaskRow);
  const { data: student } = await supabaseAdmin
    .from("students")
    .select("name")
    .eq("id", updatedTask.studentId)
    .maybeSingle();

  const target = `${student?.name ?? "未指定学生"}｜${updatedTask.title}`;
  const changes =
    body.changes && body.changes.length > 0
      ? body.changes
      : [{ field: "任务", before: currentTask.title, after: updatedTask.title }];

  const { data: log, error: logError } = await supabaseAdmin
    .from("task_logs")
    .insert(
      toTaskLogInsert({
        taskId: updatedTask.id,
        studentId: updatedTask.studentId,
        editorName: body.editorName,
        editorRole: body.editorRole,
        target,
        action: "修改任务",
        changes: formatTaskLogChanges(changes),
        reason: body.note.trim(),
      }),
    )
    .select("*")
    .single();

  if (logError) {
    return Response.json({ error: logError.message }, { status: 500 });
  }

  return Response.json({
    task: updatedTask,
    logs: log ? [mapTaskLog(log)] : [],
  });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/tasks/[id]">) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as DeleteTaskBody | null;

  if (!body?.editorName || !body.editorRole || !body.note?.trim()) {
    return Response.json({ error: "当前登录用户和删除说明为必填项。" }, { status: 400 });
  }

  const { data: currentTaskRow, error: readError } = await supabaseAdmin
    .from("tasks")
    .select("*")
    .eq("id", id)
    .eq("is_deleted", false)
    .single();

  if (readError) {
    return Response.json({ error: readError.message }, { status: 500 });
  }

  const currentTask = mapTask(currentTaskRow);
  const { data: updatedTaskRow, error: deleteError } = await supabaseAdmin
    .from("tasks")
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (deleteError) {
    return Response.json({ error: deleteError.message }, { status: 500 });
  }

  const { data: student } = await supabaseAdmin
    .from("students")
    .select("name")
    .eq("id", currentTask.studentId)
    .maybeSingle();

  const { data: log, error: logError } = await supabaseAdmin
    .from("task_logs")
    .insert(
      toTaskLogInsert({
        taskId: currentTask.id,
        studentId: currentTask.studentId,
        editorName: body.editorName,
        editorRole: body.editorRole,
        target: `${student?.name ?? "未指定学生"}｜${currentTask.title}`,
        action: "删除任务",
        changes: `删除任务：${currentTask.title}`,
        reason: body.note.trim(),
      }),
    )
    .select("*")
    .single();

  if (logError) {
    return Response.json({ error: logError.message }, { status: 500 });
  }

  return Response.json({ task: mapTask(updatedTaskRow), log: mapTaskLog(log) });
}
