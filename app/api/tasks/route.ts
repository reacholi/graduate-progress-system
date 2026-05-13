import {
  mapTask,
  mapTaskLog,
  toTaskInsert,
  toTaskLogInsert,
  type TaskDto,
  type UserRole,
} from "@/src/lib/dbMappers";
import { supabaseAdmin } from "@/src/lib/supabaseAdmin";

type CreateTaskBody = Partial<TaskDto> & {
  editorName?: string;
  editorRole?: UserRole;
  note?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as CreateTaskBody | null;

  if (!body?.studentId || !body.title?.trim() || !body.startDate || !body.endDate) {
    return Response.json({ error: "任务名称、学生、开始日期和结束日期为必填项。" }, { status: 400 });
  }

  if (!body.editorName || !body.editorRole || !body.note?.trim()) {
    return Response.json({ error: "当前登录用户和修改说明为必填项。" }, { status: 400 });
  }

  const progress = body.status === "已完成" ? 100 : (body.progress ?? 0);
  const taskValues = {
    id: body.id ?? crypto.randomUUID(),
    studentId: body.studentId,
    title: body.title.trim(),
    shortName: body.shortName,
    category: body.category,
    startDate: body.startDate,
    endDate: body.endDate,
    status: body.status,
    deliverable: body.deliverable?.trim() ?? "",
    progress,
    riskLevel: body.riskLevel,
  };

  const { data: task, error: taskError } = await supabaseAdmin
    .from("tasks")
    .insert(toTaskInsert(taskValues))
    .select("*")
    .single();

  if (taskError) {
    return Response.json({ error: taskError.message }, { status: 500 });
  }

  const insertedTask = mapTask(task);
  const { data: student } = await supabaseAdmin
    .from("students")
    .select("name")
    .eq("id", insertedTask.studentId)
    .maybeSingle();

  const target = `${student?.name ?? "未指定学生"}｜${insertedTask.title}`;
  const { data: log, error: logError } = await supabaseAdmin
    .from("task_logs")
    .insert(
      toTaskLogInsert({
        taskId: insertedTask.id,
        studentId: insertedTask.studentId,
        editorName: body.editorName,
        editorRole: body.editorRole,
        target,
        action: "新增任务",
        changes: `新增任务：${insertedTask.title}`,
        reason: body.note.trim(),
      }),
    )
    .select("*")
    .single();

  if (logError) {
    return Response.json({ error: logError.message }, { status: 500 });
  }

  return Response.json({ task: insertedTask, log: mapTaskLog(log) }, { status: 201 });
}
