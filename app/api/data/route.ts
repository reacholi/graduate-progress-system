import { mapStudent, mapTask, mapTaskLog } from "@/src/lib/dbMappers";
import { supabaseAdmin } from "@/src/lib/supabaseAdmin";

export async function GET() {
  const headers = {
    "Cache-Control": "no-store, max-age=0",
  };

  const [studentsResult, tasksResult, logsResult] = await Promise.all([
    supabaseAdmin.from("students").select("*").order("display_order", { ascending: true }),
    supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("is_deleted", false)
      .order("start_date", { ascending: true }),
    supabaseAdmin
      .from("task_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const firstError = studentsResult.error ?? tasksResult.error ?? logsResult.error;

  if (firstError) {
    return Response.json(
      { error: firstError.message },
      { status: 500, headers },
    );
  }

  return Response.json({
    students: (studentsResult.data ?? []).map(mapStudent),
    tasks: (tasksResult.data ?? []).map(mapTask),
    task_logs: (logsResult.data ?? []).map(mapTaskLog),
  }, { headers });
}
