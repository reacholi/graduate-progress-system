export type UserRole = "学生" | "管理员" | "导师";
export type Degree = "博士" | "硕士";
export type TaskCategory =
  | "小论文/投稿"
  | "算法/模型构建"
  | "实验/数据采集"
  | "数据处理/统计分析"
  | "大论文写作"
  | "中期/预答辩/送审/答辩"
  | "备考/就业"
  | "休息/假期";
export type TaskStatus = "未开始" | "进行中" | "已完成" | "延期" | "需讨论" | "取消/归档";
export type RiskLevel = "正常" | "关注" | "预警" | "高风险";
export type LogAction = "修改任务" | "新增任务" | "删除任务";

export type StudentDto = {
  id: string;
  name: string;
  degree: Degree;
  thesisTopic: string;
  displayOrder: number;
};

export type TaskDto = {
  id: string;
  studentId: string;
  title: string;
  shortName?: string;
  category: TaskCategory;
  startDate: string;
  endDate: string;
  status: TaskStatus;
  progress: number;
  riskLevel: RiskLevel;
  deliverable: string;
  createdAt: string;
  updatedAt: string;
};

export type TaskLogDto = {
  id: string;
  changedAt: string;
  editor: string;
  target: string;
  action: LogAction;
  changes: string;
  reason: string;
};

type AnyRecord = Record<string, unknown>;

function readString(row: AnyRecord, key: string, fallback = "") {
  const value = row[key];
  return typeof value === "string" ? value : fallback;
}

function readNumber(row: AnyRecord, key: string, fallback = 0) {
  const value = row[key];
  return typeof value === "number" ? value : fallback;
}

export function mapStudent(row: AnyRecord): StudentDto {
  return {
    id: readString(row, "id"),
    name: readString(row, "name"),
    degree: readString(row, "degree") as Degree,
    thesisTopic: readString(row, "thesis_topic"),
    displayOrder: readNumber(row, "display_order"),
  };
}

export function mapTask(row: AnyRecord): TaskDto {
  return {
    id: readString(row, "id"),
    studentId: readString(row, "student_id"),
    title: readString(row, "title"),
    shortName: readString(row, "short_name") || undefined,
    category: readString(row, "category") as TaskCategory,
    startDate: readString(row, "start_date"),
    endDate: readString(row, "end_date"),
    status: readString(row, "status") as TaskStatus,
    progress: readNumber(row, "progress"),
    riskLevel: readString(row, "risk_level") as RiskLevel,
    deliverable: readString(row, "deliverable"),
    createdAt: readString(row, "created_at"),
    updatedAt: readString(row, "updated_at"),
  };
}

export function mapTaskLog(row: AnyRecord): TaskLogDto {
  const editorName = readString(row, "editor_name");
  const editorRole = readString(row, "editor_role");

  return {
    id: readString(row, "id"),
    changedAt: readString(row, "created_at"),
    editor: editorRole ? `${editorName}（${editorRole}）` : editorName,
    target: readString(row, "target"),
    action: readString(row, "action") as LogAction,
    changes: readString(row, "changes"),
    reason: readString(row, "reason"),
  };
}

export function toTaskInsert(values: Partial<TaskDto>) {
  return {
    id: values.id,
    student_id: values.studentId,
    title: values.title,
    short_name: values.shortName ?? null,
    category: values.category,
    start_date: values.startDate,
    end_date: values.endDate,
    status: values.status,
    progress: values.progress,
    risk_level: values.riskLevel,
    deliverable: values.deliverable,
    is_deleted: false,
  };
}

export function toTaskUpdate(values: Partial<TaskDto>) {
  return {
    title: values.title,
    short_name: values.shortName ?? null,
    category: values.category,
    start_date: values.startDate,
    end_date: values.endDate,
    status: values.status,
    progress: values.progress,
    risk_level: values.riskLevel,
    deliverable: values.deliverable,
    updated_at: new Date().toISOString(),
  };
}

export function toTaskLogInsert(values: {
  taskId: string;
  studentId: string;
  editorName: string;
  editorRole: UserRole;
  target: string;
  action: LogAction;
  changes: string;
  reason: string;
}) {
  return {
    task_id: values.taskId,
    student_id: values.studentId,
    editor_name: values.editorName,
    editor_role: values.editorRole,
    action: values.action,
    target: values.target,
    changes: values.changes,
    reason: values.reason,
  };
}
