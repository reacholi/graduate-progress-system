import { supabaseAdmin } from "@/src/lib/supabaseAdmin";
import type { UserRole } from "@/src/lib/dbMappers";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return Response.json({ error: "请输入姓名。" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("authorized_users")
    .select("name, role")
    .eq("name", name)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return Response.json(
      { error: "姓名不在授权名单中，请确认后重新输入。" },
      { status: 401 },
    );
  }

  return Response.json({
    name: data.name as string,
    role: data.role as UserRole,
  });
}
