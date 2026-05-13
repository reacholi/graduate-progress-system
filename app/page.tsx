"use client";

import {
  Component,
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type Degree = "博士" | "硕士";
type DegreeFilter = "全部" | Degree;
type UserRole = "学生" | "管理员" | "导师";

type AuthorizedUser = {
  name: string;
  role: UserRole;
};

type TaskCategory =
  | "小论文/投稿"
  | "算法/模型构建"
  | "实验/数据采集"
  | "数据处理/统计分析"
  | "大论文写作"
  | "中期/预答辩/送审/答辩"
  | "备考/就业"
  | "休息/假期";

type TaskStatus = "未开始" | "进行中" | "已完成" | "延期" | "需讨论" | "取消/归档";
type RiskLevel = "正常" | "关注" | "预警" | "高风险";
type WarningType =
  | "已延期"
  | "未按时启动"
  | "进度滞后"
  | "临近截止低完成度";

type TaskWarning = {
  task: Task;
  warningType: WarningType;
  warningPriority: number;
  lagValue: number;
  suggestion: string;
};

type Student = {
  id: string;
  name: string;
  degree: Degree;
  thesisTopic: string;
};

type Task = {
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
  createdAt?: string;
  updatedAt?: string;
};

type ChangeRecord = {
  id: string;
  changedAt: string;
  editor: string;
  target: string;
  action: "修改任务" | "新增任务" | "删除任务";
  changes: string;
  reason: string;
};

type TaskForm = Pick<
  Task,
  | "studentId"
  | "title"
  | "category"
  | "startDate"
  | "endDate"
  | "status"
  | "progress"
  | "riskLevel"
  | "deliverable"
>;

type TaskDraft = Omit<TaskForm, "studentId" | "title">;

type DataResponse = {
  students: Student[];
  tasks: Task[];
  task_logs: ChangeRecord[];
};

type TaskMutationResponse = {
  task: Task;
  log?: ChangeRecord;
  logs?: ChangeRecord[];
  error?: string;
};

type SafeSectionProps = {
  children: ReactNode;
  fallback: string;
  name: string;
};

type SafeSectionState = {
  hasError: boolean;
  message: string;
};

const initialStudents: Student[] = [
  {
    id: "liu-yiwen",
    name: "刘一文",
    degree: "博士",
    thesisTopic: "人体行走姿态特征稳定性与特定性研究",
  },
  {
    id: "chen-shitao",
    name: "陈世韬",
    degree: "博士",
    thesisTopic: "变形指纹的细节特征位移量化、校正与三维接触力估计",
  },
  {
    id: "li-taize",
    name: "李肽泽",
    degree: "硕士",
    thesisTopic: "射击弹头痕迹分数似然比证据评价方法研究",
  },
  {
    id: "yang-hongxin",
    name: "杨洪鑫",
    degree: "硕士",
    thesisTopic: "基于纹线曲率变化规律的指纹变形评估方法研究",
  },
  {
    id: "liu-yuxi",
    name: "刘禹希",
    degree: "硕士",
    thesisTopic: "掌外侧细节特征规律及相似异源问题研究",
  },
];

const authStorageKey = "graduate-progress-current-user";

const categories: TaskCategory[] = [
  "小论文/投稿",
  "算法/模型构建",
  "实验/数据采集",
  "数据处理/统计分析",
  "大论文写作",
  "中期/预答辩/送审/答辩",
  "备考/就业",
  "休息/假期",
];

const categoryColors: Record<TaskCategory, string> = {
  "小论文/投稿": "#8B7FD7",
  "算法/模型构建": "#4F86C6",
  "实验/数据采集": "#2FA7B8",
  "数据处理/统计分析": "#D9A441",
  "大论文写作": "#E6864A",
  "中期/预答辩/送审/答辩": "#D95C5C",
  "备考/就业": "#4CAF6A",
  "休息/假期": "#A7A9B2",
};

const statusStyles: Record<TaskStatus, string> = {
  未开始: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  进行中: "bg-blue-50 text-blue-700 ring-blue-200",
  已完成: "bg-green-50 text-green-700 ring-green-200",
  延期: "bg-red-50 text-red-700 ring-red-200",
  需讨论: "bg-amber-50 text-amber-700 ring-amber-200",
  "取消/归档": "bg-slate-100 text-slate-600 ring-slate-200",
};

const riskStyles: Record<RiskLevel, string> = {
  正常: "bg-emerald-50 text-emerald-700",
  关注: "bg-amber-50 text-amber-700",
  预警: "bg-orange-50 text-orange-700",
  高风险: "bg-red-50 text-red-700",
};

const statusOptions: TaskStatus[] = [
  "未开始",
  "进行中",
  "已完成",
  "延期",
  "需讨论",
  "取消/归档",
];

const riskOptions: RiskLevel[] = ["正常", "关注", "预警", "高风险"];
const riskPriority: Record<RiskLevel, number> = {
  高风险: 0,
  预警: 1,
  关注: 2,
  正常: 3,
};

const ganttMonths = [
  "2026-05",
  "2026-06",
  "2026-07",
  "2026-08",
  "2026-09",
  "2026-10",
  "2026-11",
  "2026-12",
  "2027-01",
  "2027-02",
  "2027-03",
  "2027-04",
  "2027-05",
  "2027-06",
];

const fieldLabels: Record<keyof TaskDraft, string> = {
  category: "任务类别",
  startDate: "开始日期",
  endDate: "结束日期",
  status: "状态",
  progress: "完成比例",
  riskLevel: "人工风险备注",
  deliverable: "阶段成果",
};

type TaskStatusProgress = {
  status: TaskStatus;
  progress: number;
};

const today = new Date("2026-05-13T00:00:00");
const timelineStart = new Date("2026-05-01T00:00:00");
const millisecondsPerDay = 1000 * 60 * 60 * 24;
function createDefaultTaskForm(initialStudents: Student[]): TaskForm {
  return {
    studentId: initialStudents[0]?.id ?? "",
    title: "",
    category: "小论文/投稿",
    startDate: "2026-05-12",
    endDate: "2026-05-31",
    status: "未开始",
    progress: 0,
    riskLevel: "正常",
    deliverable: "",
  };
}

function monthOffset(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`);
  return (
    (date.getFullYear() - timelineStart.getFullYear()) * 12 +
    date.getMonth() -
    timelineStart.getMonth() +
    Math.max(0, date.getDate() - 1) / 30
  );
}

function formatShortDate(dateValue: string) {
  const [, month, day] = dateValue.split("-");
  return `${month}/${day}`;
}

function toDraft(task: Task): TaskDraft {
  return {
    category: task.category,
    startDate: task.startDate,
    endDate: task.endDate,
    status: task.status,
    progress: task.progress,
    riskLevel: task.riskLevel,
    deliverable: task.deliverable,
  };
}

function normalizeTaskBeforeSave<T extends TaskStatusProgress>(values: T) {
  const normalized = { ...values };
  const autoAdjustedFields: Partial<Record<keyof T, string>> = {};

  if (normalized.status === "已完成" && normalized.progress !== 100) {
    normalized.progress = 100;
    autoAdjustedFields.progress =
      "（系统根据已完成状态自动调整完成比例）";
  }

  if (normalized.progress === 100 && normalized.status !== "已完成") {
    normalized.status = "已完成";
    autoAdjustedFields.status =
      "（系统根据完成比例自动调整）";
  }

  if (
    normalized.progress > 0 &&
    normalized.progress < 100 &&
    normalized.status === "未开始"
  ) {
    normalized.status = "进行中";
    autoAdjustedFields.status =
      "（系统根据完成比例自动调整）";
  }

  return { normalized, autoAdjustedFields };
}

function normalizeStatusProgressOnChange<T extends TaskStatusProgress>(
  values: T,
  changedField: keyof T,
) {
  const normalized = { ...values };

  if (changedField === "status") {
    if (normalized.status === "已完成") {
      normalized.progress = 100;
    }

    if (normalized.status === "未开始") {
      normalized.progress = 0;
    }

    return normalized;
  }

  if (changedField === "progress") {
    return normalizeTaskBeforeSave(normalized).normalized;
  }

  return normalized;
}

function formatChangeValue(field: keyof TaskDraft, value: TaskDraft[keyof TaskDraft]) {
  return field === "progress" ? `${value}%` : String(value);
}

class SafeSection extends Component<SafeSectionProps, SafeSectionState> {
  state: SafeSectionState = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: unknown): SafeSectionState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "模块渲染失败。",
    };
  }

  componentDidCatch(error: unknown) {
    console.error(`${this.props.name} render error`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="rounded-md border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
          <p className="font-medium">{this.props.fallback}</p>
          {this.state.message && <p className="mt-1">{this.state.message}</p>}
        </section>
      );
    }

    return this.props.children;
  }
}

function getStoredUser() {
  if (typeof window === "undefined") {
    return null;
  }

  let storedUser: string | null = null;

  try {
    storedUser = window.localStorage.getItem(authStorageKey);
  } catch (error) {
    console.error("Failed to read login state from localStorage", error);
    return null;
  }

  if (!storedUser) {
    return null;
  }

  try {
    const parsedUser = JSON.parse(storedUser) as AuthorizedUser;
    return parsedUser.name && parsedUser.role ? parsedUser : null;
  } catch (error) {
    console.error("Failed to parse stored login state", error);
    try {
      window.localStorage.removeItem(authStorageKey);
    } catch (removeError) {
      console.error("Failed to clear invalid login state", removeError);
    }
    return null;
  }
}

function saveStoredUser(user: AuthorizedUser) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(authStorageKey, JSON.stringify(user));
  } catch (error) {
    console.error("Failed to save login state to localStorage", error);
  }
}

function clearStoredUser() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(authStorageKey);
  } catch (error) {
    console.error("Failed to clear login state from localStorage", error);
  }
}

function sortTasksByStudents(tasksToSort: Task[], studentsToOrder: Student[]) {
  return [...tasksToSort].sort((first, second) => {
    const firstStudentIndex = studentsToOrder.findIndex(
      (student) => student.id === first.studentId,
    );
    const secondStudentIndex = studentsToOrder.findIndex(
      (student) => student.id === second.studentId,
    );

    if (firstStudentIndex !== secondStudentIndex) {
      return firstStudentIndex - secondStudentIndex;
    }

    return first.startDate.localeCompare(second.startDate);
  });
}

function getDateTime(dateValue: string) {
  return new Date(`${dateValue}T00:00:00`).getTime();
}

function isActiveTask(task: Task) {
  return task.status !== "已完成" && task.status !== "取消/归档";
}

function getTaskTiming(task: Task) {
  const startTime = getDateTime(task.startDate);
  const endTime = getDateTime(task.endDate);
  const todayTime = today.getTime();
  const daysLeft = (endTime - todayTime) / millisecondsPerDay;
  const totalDays = Math.max(1, (endTime - startTime) / millisecondsPerDay);
  const elapsedDays = Math.max(0, todayTime - startTime) / millisecondsPerDay;
  const timeProgress = Math.min(100, (elapsedDays / totalDays) * 100);
  const lagValue = Math.round(timeProgress - task.progress);

  return {
    startTime,
    endTime,
    todayTime,
    daysLeft,
    timeProgress,
    lagValue,
  };
}

function getComputedRiskLevel(task: Task): RiskLevel {
  if (task.status === "已完成" || task.status === "取消/归档") {
    return "正常";
  }

  const { startTime, endTime, todayTime, daysLeft, lagValue } =
    getTaskTiming(task);

  if (task.status === "延期" || todayTime > endTime) {
    return "高风险";
  }

  if (todayTime < startTime && task.status === "未开始") {
    return "正常";
  }

  if (
    todayTime >= startTime &&
    (task.status === "未开始" || task.progress === 0)
  ) {
    const daysSinceStart = (todayTime - startTime) / millisecondsPerDay;
    return daysSinceStart > 7 ? "预警" : "关注";
  }

  if (daysLeft >= 0 && daysLeft <= 7 && task.progress < 70) {
    return "预警";
  }

  if (todayTime >= startTime && todayTime <= endTime) {
    if (lagValue >= 50) {
      return "预警";
    }

    if (lagValue >= 25) {
      return "关注";
    }
  }

  if (task.status === "需讨论") {
    return "关注";
  }

  return "正常";
}

function getTaskWarning(task: Task): TaskWarning | null {
  if (!isActiveTask(task)) {
    return null;
  }

  const { startTime, endTime, todayTime, daysLeft, lagValue } =
    getTaskTiming(task);

  if (todayTime > endTime) {
    return {
      task,
      warningType: "已延期",
      warningPriority: 0,
      lagValue,
      suggestion: "建议立即更新延期原因和下一步计划",
    };
  }

  if (
    todayTime >= startTime &&
    (task.status === "未开始" || task.progress === 0)
  ) {
    return {
      task,
      warningType: "未按时启动",
      warningPriority: 1,
      lagValue,
      suggestion: "建议确认任务是否已经实际开展",
    };
  }

  if (todayTime >= startTime && todayTime <= endTime && lagValue >= 25) {
    return {
      task,
      warningType: "进度滞后",
      warningPriority: 2,
      lagValue,
      suggestion: "建议检查任务推进瓶颈",
    };
  }

  if (daysLeft >= 0 && daysLeft <= 7 && task.progress < 70) {
    return {
      task,
      warningType: "临近截止低完成度",
      warningPriority: 3,
      lagValue,
      suggestion: "建议尽快确认能否按期完成",
    };
  }

  return null;
}

function getAverageProgress(tasksToAverage: Task[]) {
  if (tasksToAverage.length === 0) {
    return 0;
  }

  const total = tasksToAverage.reduce((sum, task) => sum + task.progress, 0);
  return Math.round(total / tasksToAverage.length);
}

function getSoftCategoryColor(category: TaskCategory) {
  return `${categoryColors[category]}1F`;
}

function getTaskShortName(task: Task) {
  if (task.shortName) {
    return task.shortName;
  }

  const taskTitle = task.title;
  const keywordShortNames: Array<[string, string]> = [
    ["综述小论文投稿", "综述投稿"],
    ["实验性小论文投稿", "实验投稿"],
    ["投稿文件", "投稿整理"],
    ["框架", "框架确认"],
    ["绪论", "绪论"],
    ["数据库", "数据库"],
    ["稳定性筛查", "稳定性"],
    ["低敏感", "低敏感"],
    ["一致性", "一致性"],
    ["分布规律", "分布分析"],
    ["SLR", "SLR"],
    ["概率评价", "概率评价"],
    ["完整初稿", "完整初稿"],
    ["预答辩", "预答辩"],
    ["查重", "查重润色"],
    ["送审", "送审"],
    ["答辩", "答辩准备"],
    ["算法整体", "算法构建"],
    ["轨迹提取", "轨迹提取"],
    ["变形校正", "变形校正"],
    ["接触力", "接触力"],
    ["全量数据", "全量数据"],
    ["批量处理", "批量处理"],
    ["统计分析", "统计分析"],
    ["可视化", "可视化"],
    ["小规模", "小规模验证"],
    ["预处理", "预处理"],
    ["曲率", "曲率分析"],
    ["中期", "中期准备"],
    ["休整", "休整"],
    ["备考", "备考就业"],
  ];
  const matched = keywordShortNames.find(([keyword]) =>
    taskTitle.includes(keyword),
  );

  if (matched) {
    return matched[1];
  }

  return taskTitle.length > 8 ? `${taskTitle.slice(0, 8)}…` : taskTitle;
}

function getGanttStatusStyle(task: Task) {
  const computedRisk = getComputedRiskLevel(task);

  if (task.status === "延期") {
    return {
      borderColor: "#DC2626",
      boxShadow: "0 8px 18px rgba(220, 38, 38, 0.22)",
      opacity: 1,
    };
  }

  if (task.status === "已完成") {
    return {
      borderColor: "rgba(255, 255, 255, 0.42)",
      boxShadow: "0 4px 12px rgba(15, 23, 42, 0.10)",
      opacity: 0.72,
    };
  }

  if (computedRisk === "高风险") {
    return {
      borderColor: "#DC2626",
      boxShadow: "0 8px 18px rgba(220, 38, 38, 0.18)",
      opacity: 1,
    };
  }

  if (computedRisk === "预警") {
    return {
      borderColor: "#F59E0B",
      boxShadow: "0 8px 18px rgba(245, 158, 11, 0.18)",
      opacity: 1,
    };
  }

  if (computedRisk === "关注") {
    return {
      borderColor: "#F3D37A",
      boxShadow: "0 6px 14px rgba(15, 23, 42, 0.12)",
      opacity: 1,
    };
  }

  return {
    borderColor: "rgba(255, 255, 255, 0.28)",
    boxShadow: "0 6px 14px rgba(15, 23, 42, 0.12)",
    opacity: 1,
  };
}

function getLatestTaskRecord(
  task: Task,
  student: Student,
  records: ChangeRecord[],
) {
  const exactTarget = `${student.name}｜${task.title}`;

  return (
    records.find((record) => record.target === exactTarget) ??
    records.find(
      (record) =>
        record.target.includes(student.name) && record.target.includes(task.title),
    ) ??
    null
  );
}

export default function Home() {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [records, setRecords] = useState<ChangeRecord[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TaskDraft | null>(null);
  const [originalUpdatedAt, setOriginalUpdatedAt] = useState("");
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState<TaskForm>(() =>
    createDefaultTaskForm(initialStudents),
  );
  const [degreeFilter, setDegreeFilter] = useState<DegreeFilter>("全部");
  const [studentFilter, setStudentFilter] = useState("全部学生");
  const [currentUser, setCurrentUser] = useState<AuthorizedUser | null>(null);
  const [loginName, setLoginName] = useState("");
  const [loginError, setLoginError] = useState("");
  const [editNote, setEditNote] = useState("");
  const [formError, setFormError] = useState("");
  const [dataError, setDataError] = useState("");
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGanttOpen, setIsGanttOpen] = useState(false);

  const defaultTaskForm = useMemo(
    () => createDefaultTaskForm(students),
    [students],
  );

  const getStudent = useCallback(
    (studentId: string) =>
      students.find((student) => student.id === studentId),
    [students],
  );

  const sortTasks = useCallback(
    (tasksToSort: Task[]) => sortTasksByStudents(tasksToSort, students),
    [students],
  );

  useEffect(() => {
    let isActive = true;

    async function restoreLoginState() {
      try {
        await Promise.resolve();
        const storedUser = getStoredUser();

        if (isActive) {
          setCurrentUser(storedUser);
        }
      } catch (error) {
        console.error("Failed to restore login state", error);
        if (isActive) {
          setCurrentUser(null);
        }
      } finally {
        if (isActive) {
          setIsAuthChecking(false);
        }
      }
    }

    restoreLoginState();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadData() {
      if (!currentUser) {
        setIsDataLoading(false);
        setHasLoadedData(false);
        return;
      }

      setIsDataLoading(true);
      setDataError("");

      try {
        const response = await fetch("/api/data", { cache: "no-store" });
        const data = (await response.json()) as DataResponse & { error?: string };

        if (!response.ok) {
          console.error("Data API returned an error", data.error);
          throw new Error("数据加载失败，请刷新页面或联系管理员。");
        }

        if (
          !Array.isArray(data.students) ||
          !Array.isArray(data.tasks) ||
          !Array.isArray(data.task_logs)
        ) {
          throw new Error("暂无任务数据或数据加载异常。");
        }

        if (!isActive) {
          return;
        }

        setStudents(data.students);
        setTasks(sortTasksByStudents(data.tasks, data.students));
        setRecords(data.task_logs);
        setNewTask(createDefaultTaskForm(data.students));
        setHasLoadedData(true);
      } catch (error) {
        console.error("Failed to load system data", error);
        if (isActive) {
          setHasLoadedData(false);
          setDataError(
            error instanceof Error
              ? error.message
              : "数据加载失败，请刷新页面或联系管理员。",
          );
        }
      } finally {
        if (isActive) {
          setIsDataLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isActive = false;
    };
  }, [currentUser]);

  const editingTask = tasks.find((task) => task.id === editingTaskId);
  const editingStudent = editingTask ? getStudent(editingTask.studentId) : null;
  const deletingTask = tasks.find((task) => task.id === deletingTaskId);
  const deletingStudent = deletingTask
    ? getStudent(deletingTask.studentId)
    : null;

  const filteredStudents = useMemo(() => {
    try {
      if (studentFilter !== "全部学生") {
        return students.filter((student) => student.id === studentFilter);
      }

      if (degreeFilter !== "全部") {
        return students.filter((student) => student.degree === degreeFilter);
      }

      return students;
    } catch (error) {
      console.error("Failed to filter students", error);
      return [];
    }
  }, [degreeFilter, studentFilter, students]);

  const filteredTasks = useMemo(() => {
    try {
      const studentIds = new Set(filteredStudents.map((student) => student.id));
      return tasks.filter((task) => studentIds.has(task.studentId));
    } catch (error) {
      console.error("Failed to filter tasks", error);
      return [];
    }
  }, [filteredStudents, tasks]);

  const delayedStartTasks = useMemo(
    () =>
      filteredTasks
        .map(getTaskWarning)
        .filter(
          (warning): warning is TaskWarning =>
            warning?.warningType === "未按时启动",
        )
        .sort((first, second) =>
          first.task.startDate.localeCompare(second.task.startDate),
        ),
    [filteredTasks],
  );

  const laggingTasks = useMemo(
    () =>
      filteredTasks
        .map(getTaskWarning)
        .filter(
          (warning): warning is TaskWarning =>
            warning?.warningType === "进度滞后",
        )
        .sort((first, second) => second.lagValue - first.lagValue),
    [filteredTasks],
  );

  const lowProgressDueSoonTasks = useMemo(
    () =>
      filteredTasks
        .map(getTaskWarning)
        .filter(
          (warning): warning is TaskWarning =>
            warning?.warningType === "临近截止低完成度",
        )
        .sort((first, second) =>
          first.task.endDate.localeCompare(second.task.endDate),
        ),
    [filteredTasks],
  );

  const overdueTasks = useMemo(
    () =>
      filteredTasks
        .map(getTaskWarning)
        .filter(
          (warning): warning is TaskWarning =>
            warning?.warningType === "已延期",
        )
        .sort((first, second) =>
          first.task.endDate.localeCompare(second.task.endDate),
        ),
    [filteredTasks],
  );

  const warningTasks = useMemo(
    () =>
      [
        ...overdueTasks,
        ...delayedStartTasks,
        ...laggingTasks,
        ...lowProgressDueSoonTasks,
      ].sort((first, second) => {
        if (first.warningPriority !== second.warningPriority) {
          return first.warningPriority - second.warningPriority;
        }

        if (first.warningType === "未按时启动") {
          return first.task.startDate.localeCompare(second.task.startDate);
        }

        if (first.warningType === "进度滞后") {
          return second.lagValue - first.lagValue;
        }

        return first.task.endDate.localeCompare(second.task.endDate);
      }),
    [delayedStartTasks, laggingTasks, lowProgressDueSoonTasks, overdueTasks],
  );

  const studentStageSummaries = useMemo(
    () => {
      try {
        return filteredStudents.map((student) => {
          const studentTasks = sortTasks(
            filteredTasks.filter((task) => task.studentId === student.id),
          );
          const currentTasks = studentTasks.filter((task) => {
            if (
              task.status === "已完成" ||
              task.status === "取消/归档" ||
              task.progress === 100
            ) {
              return false;
            }

            const isInCurrentDateRange =
              getDateTime(task.startDate) <= today.getTime() &&
              getDateTime(task.endDate) >= today.getTime();
            const isMarkedInProgress = task.status === "进行中";
            const hasPartialProgress = task.progress > 0 && task.progress < 100;

            return (
              isInCurrentDateRange || isMarkedInProgress || hasPartialProgress
            );
          });
          const sortedCurrentTasks = [...currentTasks].sort((first, second) => {
            const riskCompare =
              riskPriority[getComputedRiskLevel(first)] -
              riskPriority[getComputedRiskLevel(second)];

            if (riskCompare !== 0) {
              return riskCompare;
            }

            const endDateCompare = first.endDate.localeCompare(second.endDate);

            if (endDateCompare !== 0) {
              return endDateCompare;
            }

            return first.progress - second.progress;
          });
          const primaryTask = sortedCurrentTasks[0] ?? null;

          return {
            student,
            currentTasks: sortedCurrentTasks,
            primaryTask,
            averageProgress: getAverageProgress(studentTasks),
            currentRisk: primaryTask ? getComputedRiskLevel(primaryTask) : "正常",
          };
        });
      } catch (error) {
        console.error("Failed to build student summaries", error);
        return [];
      }
    },
    [filteredStudents, filteredTasks, sortTasks],
  );

  const stats = useMemo(() => {
    const filteredStudentIdsWithTasks = new Set(
      filteredTasks.map((task) => task.studentId),
    );
    const filteredStudentsWithTasks = filteredStudents.filter((student) =>
      filteredStudentIdsWithTasks.has(student.id),
    );
    const doctoralCount = filteredStudentsWithTasks.filter(
      (student) => student.degree === "博士",
    ).length;
    const masterCount = filteredStudentsWithTasks.filter(
      (student) => student.degree === "硕士",
    ).length;

    return [
      { label: "博士人数", value: doctoralCount, tone: "border-l-indigo-500" },
      { label: "硕士人数", value: masterCount, tone: "border-l-sky-500" },
      {
        label: "任务总数",
        value: filteredTasks.length,
        tone: "border-l-slate-500",
      },
      {
        label: "进度预警任务数",
        value: warningTasks.length,
        tone: "border-l-amber-500",
      },
      {
        label: "临近截止低完成度任务数",
        value: lowProgressDueSoonTasks.length,
        tone: "border-l-cyan-500",
      },
      {
        label: "已延期任务数",
        value: overdueTasks.length,
        tone: "border-l-red-500",
      },
    ];
  }, [
    filteredStudents,
    filteredTasks,
    lowProgressDueSoonTasks,
    overdueTasks,
    warningTasks,
  ]);

  const sortedTasks = useMemo(
    () => {
      try {
        return sortTasks(filteredTasks);
      } catch (error) {
        console.error("Failed to sort tasks", error);
        return [];
      }
    },
    [filteredTasks, sortTasks],
  );

  const groupedTasks = useMemo(() => {
    try {
      return filteredStudents.map((student) => ({
        student,
        tasks: sortedTasks.filter((task) => task.studentId === student.id),
      }));
    } catch (error) {
      console.error("Failed to group tasks", error);
      return [];
    }
  }, [filteredStudents, sortedTasks]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = loginName.trim();

    if (!trimmedName) {
      setLoginError("请输入姓名。");
      return;
    }

    setLoginError("");

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });
      const data = (await response.json()) as AuthorizedUser & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "姓名不在授权名单中，请确认后重新输入。");
      }

      const user = { name: data.name, role: data.role };
      setCurrentUser(user);
      setLoginName("");
      saveStoredUser(user);
    } catch (error) {
      console.error("Login failed", error);
      setLoginError(
        error instanceof Error
          ? error.message
          : "姓名不在授权名单中，请确认后重新输入。",
      );
    }
  }

  function logout() {
    clearStoredUser();
    setCurrentUser(null);
    setLoginName("");
    setLoginError("");
    setDataError("");
    setHasLoadedData(false);
    setEditingTaskId(null);
    setDeletingTaskId(null);
    setIsAddingTask(false);
    setTasks([]);
    setRecords([]);
  }

  function openEditor(task: Task) {
    setEditingTaskId(task.id);
    setDraft(toDraft(task));
    setOriginalUpdatedAt(task.updatedAt ?? "");
    setEditNote("");
    setFormError("");
  }

  function closeEditor() {
    setEditingTaskId(null);
    setDraft(null);
    setOriginalUpdatedAt("");
    setEditNote("");
    setFormError("");
  }

  function openDeleteDialog(task: Task) {
    setDeletingTaskId(task.id);
    setEditNote("");
    setFormError("");
  }

  function closeDeleteDialog() {
    setDeletingTaskId(null);
    setEditNote("");
    setFormError("");
  }

  function openTaskCreator() {
    setIsAddingTask(true);
    setNewTask(defaultTaskForm);
    setEditNote("");
    setFormError("");
  }

  function closeTaskCreator() {
    setIsAddingTask(false);
    setNewTask(defaultTaskForm);
    setEditNote("");
    setFormError("");
  }

  function updateDraft<K extends keyof TaskDraft>(field: K, value: TaskDraft[K]) {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      return normalizeStatusProgressOnChange(
        { ...current, [field]: value },
        field,
      );
    });
  }

  function updateNewTask<K extends keyof TaskForm>(field: K, value: TaskForm[K]) {
    setNewTask((current) =>
      normalizeStatusProgressOnChange({ ...current, [field]: value }, field),
    );
  }

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingTask || !draft || !editingStudent || !currentUser) {
      return;
    }

    if (!editNote.trim()) {
      setFormError("修改说明为必填项。");
      return;
    }

    const { normalized: normalizedDraft, autoAdjustedFields } =
      normalizeTaskBeforeSave(draft);

    const changedFields = (
      Object.keys(normalizedDraft) as Array<keyof TaskDraft>
    ).filter(
      (field) => String(editingTask[field]) !== String(normalizedDraft[field]),
    );

    if (changedFields.length === 0) {
      setFormError("请至少修改一个任务字段后再保存。");
      return;
    }

    const changes = changedFields.map((field) => ({
      field: fieldLabels[field],
      before: formatChangeValue(field, editingTask[field]),
      after: `${formatChangeValue(field, normalizedDraft[field])}${
        autoAdjustedFields[field] ?? ""
      }`,
    }));

    setIsSubmitting(true);
    setFormError("");

    try {
      const response = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PATCH",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...normalizedDraft,
          editorName: currentUser.name,
          editorRole: currentUser.role,
          note: editNote.trim(),
          originalUpdatedAt,
          changes,
        }),
      });
      const data = (await response.json()) as TaskMutationResponse;

      if (!response.ok) {
        throw new Error(
          data.error ??
            "该任务已被其他人更新，请刷新后再修改，避免覆盖他人内容。",
        );
      }

      setTasks((current) =>
        sortTasks(
          current.map((task) => (task.id === editingTask.id ? data.task : task)),
        ),
      );
      setRecords((current) => [...(data.logs ?? []), ...current]);
      closeEditor();
    } catch (error) {
      console.error("Failed to save task", error);
      setFormError(
        error instanceof Error
          ? error.message
          : "该任务已被其他人更新，请刷新后再修改，避免覆盖他人内容。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveNewTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newTask.studentId) {
      setFormError("请选择学生。");
      return;
    }

    if (!newTask.title.trim()) {
      setFormError("任务名称为必填项。");
      return;
    }

    if (!newTask.startDate || !newTask.endDate) {
      setFormError("开始日期和结束日期为必填项。");
      return;
    }

    if (newTask.startDate > newTask.endDate) {
      setFormError("结束日期不能早于开始日期。");
      return;
    }

    if (!currentUser) {
      return;
    }

    if (!editNote.trim()) {
      setFormError("修改说明为必填项。");
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    const { normalized: normalizedNewTask } = normalizeTaskBeforeSave({
      ...newTask,
      title: newTask.title.trim(),
      deliverable: newTask.deliverable.trim(),
    });

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...normalizedNewTask,
          editorName: currentUser.name,
          editorRole: currentUser.role,
          note: editNote.trim(),
        }),
      });
      const data = (await response.json()) as TaskMutationResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "新增任务失败。");
      }

      setTasks((current) => sortTasks([...current, data.task]));
      setRecords((current) => (data.log ? [data.log, ...current] : current));
      closeTaskCreator();
    } catch (error) {
      console.error("Failed to create task", error);
      setFormError(error instanceof Error ? error.message : "新增任务失败。");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!deletingTask || !deletingStudent || !currentUser) {
      return;
    }

    if (!editNote.trim()) {
      setFormError("删除说明为必填项。");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      const response = await fetch(`/api/tasks/${deletingTask.id}`, {
        method: "DELETE",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          editorName: currentUser.name,
          editorRole: currentUser.role,
          note: editNote.trim(),
        }),
      });
      const data = (await response.json()) as TaskMutationResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "删除任务失败。");
      }

      setTasks((current) =>
        current.filter((task) => task.id !== deletingTask.id),
      );
      setRecords((current) => (data.log ? [data.log, ...current] : current));
      closeDeleteDialog();
    } catch (error) {
      console.error("Failed to delete task", error);
      setFormError(error instanceof Error ? error.message : "删除任务失败。");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isAuthChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 text-slate-950">
        <p className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          正在加载系统数据...
        </p>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 text-slate-950">
        <section className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <div className="border-b border-slate-200 pb-5">
            <p className="text-sm font-medium text-slate-500">
              论文进度协同管理
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">
              研究生论文进度协同管理系统
            </h1>
            <p className="mt-3 text-sm text-slate-600">
              请输入姓名口令进入系统。
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-5 flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              姓名口令
              <input
                value={loginName}
                onChange={(event) => {
                  setLoginName(event.target.value);
                  setLoginError("");
                }}
                placeholder="请输入授权姓名"
                className="min-h-10 rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-slate-600"
              />
            </label>

            {loginError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="min-h-10 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              进入系统
            </button>
          </form>
        </section>
      </main>
      );
  }

  const hasDataIssue =
    !isDataLoading &&
    (!hasLoadedData || students.length === 0 || tasks.length === 0);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-6">
          <p className="text-sm font-medium text-slate-500">
            论文进度协同管理 · Supabase 数据库
          </p>
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
                研究生论文进度协同管理系统
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                面向导师的学生论文任务、风险、阶段成果与修改记录总览。
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600 sm:items-end sm:px-4">
              <p>当前周期：2026年5月 - 2027年6月</p>
              <div className="flex flex-wrap items-center gap-3">
                <span>
                  当前用户：{currentUser.name}｜{currentUser.role}
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="min-h-10 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-500 hover:bg-slate-100"
                >
                  退出登录
                </button>
              </div>
            </div>
          </div>
        </header>

        {(isDataLoading || dataError) && (
          <div
            className={`rounded-md border px-4 py-3 text-sm ${
              dataError
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            {dataError || "正在加载系统数据..."}
          </div>
        )}

        {hasDataIssue && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            暂无任务数据或数据加载异常。
          </div>
        )}

        <SafeSection
          name="Dashboard"
          fallback="首页统计模块加载失败，请刷新页面或联系管理员。"
        >
        <section aria-labelledby="dashboard-title">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="dashboard-title" className="text-xl font-semibold">
              首页 Dashboard
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {stats.map((item) => (
              <div
                key={item.label}
                className={`rounded-md border border-slate-200 border-l-4 ${item.tone} bg-white p-4 shadow-sm sm:p-5 xl:p-4`}
              >
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950 sm:text-3xl">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">
                  学生阶段进展概览
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  基于当前筛选范围汇总学生当前阶段、风险和综合完成度。
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {studentStageSummaries.map((summary) => {
                const riskBorder =
                  summary.currentRisk === "高风险"
                    ? "border-red-400"
                    : summary.currentRisk === "预警"
                      ? "border-orange-400"
                      : "border-slate-200";

                return (
                  <div
                    key={summary.student.id}
                  className={`rounded-md border ${riskBorder} bg-white p-3 shadow-sm sm:p-4 xl:p-3`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {summary.student.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {summary.student.degree}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ${riskStyles[summary.currentRisk]}`}
                      >
                        {summary.currentRisk}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2 text-xs text-slate-600">
                      <p className="font-medium text-slate-800">
                        当前进行中：{summary.currentTasks.length}项
                      </p>
                      {summary.currentTasks.length > 0 ? (
                        <div className="space-y-2">
                          {summary.currentTasks.slice(0, 3).map((task) => {
                            const computedRisk = getComputedRiskLevel(task);

                            return (
                              <button
                                key={task.id}
                                type="button"
                                onClick={() => openEditor(task)}
                                className="grid min-h-10 w-full grid-cols-[1fr_auto] gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-left transition hover:border-slate-300 hover:bg-white"
                              >
                                <span className="min-w-0 truncate font-medium text-slate-900">
                                  {getTaskShortName(task)}
                                </span>
                                <span
                                  className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${riskStyles[computedRisk]}`}
                                >
                                  {computedRisk}
                                </span>
                                <span className="text-slate-500">
                                  截止 {formatShortDate(task.endDate)}
                                </span>
                                <span className="text-right font-medium text-slate-700">
                                  {task.progress}%
                                </span>
                              </button>
                            );
                          })}
                          {summary.currentTasks.length > 3 && (
                            <p className="text-xs font-medium text-slate-500">
                              还有 {summary.currentTasks.length - 3} 项进行中任务
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="font-medium text-slate-800">
                          暂无进行中任务
                        </p>
                      )}
                    </div>

                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-slate-500">综合完成度</span>
                        <span className="font-semibold text-slate-900">
                          {summary.averageProgress}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-sm bg-slate-100">
                        <div
                          className="h-full rounded-sm bg-slate-800"
                          style={{ width: `${summary.averageProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {[
              {
                title: "进度预警任务明细",
                tasks: warningTasks,
                limit: 8,
                emptyText: "当前筛选范围内暂无进度预警任务。",
                accent: "border-l-amber-500",
                titleTone: "text-amber-700",
                itemTone: "hover:border-amber-300 hover:bg-amber-50/50",
              },
              {
                title: "临近截止低完成度任务明细",
                tasks: lowProgressDueSoonTasks,
                limit: 5,
                emptyText: "当前筛选范围内暂无临近截止且完成度偏低任务。",
                accent: "border-l-orange-500",
                titleTone: "text-orange-700",
                itemTone: "hover:border-orange-300 hover:bg-orange-50/50",
              },
              {
                title: "已延期任务明细",
                tasks: overdueTasks,
                limit: 5,
                emptyText: "当前筛选范围内暂无已延期任务。",
                accent: "border-l-red-500",
                titleTone: "text-red-700",
                itemTone: "hover:border-red-300 hover:bg-red-50/50",
              },
            ].map((card) => {
              const visibleTasks = card.tasks.slice(0, card.limit);
              const hiddenCount = Math.max(0, card.tasks.length - card.limit);

              return (
                <div
                  key={card.title}
                  className={`rounded-md border border-slate-200 border-l-4 ${card.accent} bg-white p-4 shadow-sm`}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className={`text-base font-semibold ${card.titleTone}`}>
                      {card.title}
                    </h3>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                      {card.tasks.length} 项
                    </span>
                  </div>

                  {visibleTasks.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {visibleTasks.map((taskWarning) => {
                        const task = taskWarning.task;
                        const student = getStudent(task.studentId);
                        const computedRisk = getComputedRiskLevel(task);

                        return (
                          <button
                            key={`${card.title}-${task.id}`}
                            type="button"
                            onClick={() => openEditor(task)}
                            className={`min-h-10 rounded-md border border-slate-200 bg-white p-3 text-left transition ${card.itemTone}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="line-clamp-2 text-sm font-semibold text-slate-950 sm:truncate">
                                  {getTaskShortName(task)}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {student?.name} · {student?.degree}
                                </p>
                              </div>
                              <span
                                className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ${
                                  taskWarning.warningType === "已延期"
                                    ? "bg-red-50 text-red-700"
                                    : taskWarning.warningType === "未按时启动"
                                      ? "bg-amber-50 text-amber-700"
                                      : taskWarning.warningType === "进度滞后"
                                        ? "bg-orange-50 text-orange-700"
                                        : "bg-yellow-50 text-yellow-700"
                                }`}
                              >
                                {taskWarning.warningType}
                              </span>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                              <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600">
                                截止 {task.endDate}
                              </span>
                              <span
                                className="rounded-md px-2 py-1 font-medium"
                                style={{
                                  backgroundColor: getSoftCategoryColor(
                                    task.category,
                                  ),
                                  color: categoryColors[task.category],
                                }}
                              >
                                {task.category}
                              </span>
                              <span
                                className={`rounded-md px-2 py-1 font-medium ring-1 ${statusStyles[task.status]}`}
                              >
                                {task.status}
                              </span>
                              <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600">
                                {task.progress}%
                              </span>
                              <span
                                className={`rounded-md px-2 py-1 font-medium ${riskStyles[computedRisk]}`}
                              >
                                {computedRisk}
                              </span>
                            </div>
                            <p className="mt-2 text-xs leading-5 text-slate-500">
                              {taskWarning.suggestion}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded-md bg-slate-50 px-3 py-4 text-sm text-slate-500">
                      {card.emptyText}
                    </p>
                  )}

                  {hiddenCount > 0 && (
                    <p className="mt-3 text-xs font-medium text-slate-500">
                      还有 {hiddenCount} 条未显示
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
        </SafeSection>

        <section
          aria-labelledby="filters-title"
          className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid w-full flex-1 gap-4 sm:grid-cols-2 lg:max-w-2xl">
              <div className="sm:col-span-2">
                <h2 id="filters-title" className="text-xl font-semibold">
                  筛选条件
                </h2>
              </div>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                学位层次
                <select
                  value={degreeFilter}
                  onChange={(event) =>
                    setDegreeFilter(event.target.value as DegreeFilter)
                  }
                  className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-slate-600"
                >
                  {(["全部", "博士", "硕士"] as const).map((degree) => (
                    <option key={degree} value={degree}>
                      {degree}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                学生
                <select
                  value={studentFilter}
                  onChange={(event) => setStudentFilter(event.target.value)}
                  className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-slate-600"
                >
                  <option value="全部学生">全部学生</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="button"
              onClick={() => {
                setDegreeFilter("全部");
                setStudentFilter("全部学生");
              }}
              className="inline-flex min-h-10 w-full items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-500 hover:bg-slate-100 lg:w-auto"
            >
              清除筛选
            </button>
          </div>
        </section>

        <SafeSection
          name="Gantt"
          fallback="甘特图加载失败，其他模块仍可继续使用。"
        >
        <section
          aria-labelledby="gantt-title"
          className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 id="gantt-title" className="text-xl font-semibold">
                甘特图总览
                <span className="md:hidden">（横向滑动查看）</span>
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                按学生分组展示任务时间、状态和完成比例。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsGanttOpen((current) => !current)}
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-500 hover:bg-slate-100 md:hidden"
            >
              {isGanttOpen ? "收起甘特图" : "展开甘特图"}
            </button>
            <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-xs sm:grid-cols-4">
              {categories.map((category) => (
                <div key={category} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-sm shadow-sm"
                    style={{ backgroundColor: categoryColors[category] }}
                  />
                  <span className="text-slate-600">{category}</span>
                </div>
              ))}
            </div>
          </div>

          {groupedTasks.length === 0 ? (
            <p className="rounded-md bg-slate-50 px-3 py-4 text-sm text-slate-500">
              暂无任务数据或数据加载异常。
            </p>
          ) : (
          <div className={`${isGanttOpen ? "block" : "hidden"} overflow-x-auto md:block`}>
            <div className="w-full min-w-[736px] md:min-w-[760px]">
              <div className="grid grid-cols-[120px_repeat(14,44px)] border-b border-slate-100 text-[11px] font-medium text-slate-500 md:grid-cols-[170px_repeat(14,minmax(48px,1fr))]">
                <div className="sticky left-0 z-10 bg-white py-3 pr-3">
                  学生 / 任务
                </div>
                {ganttMonths.map((month) => (
                  <div
                    key={month}
                    className="border-l border-slate-100/70 px-2 py-3 text-center"
                  >
                    {month.replace("-", ".")}
                  </div>
                ))}
              </div>

              <div className="divide-y divide-slate-100/80">
                {groupedTasks.map(({ student, tasks: studentTasks }) => (
                  <div
                    key={student.id}
                    className="grid grid-cols-[120px_1fr] bg-white md:grid-cols-[170px_1fr]"
                  >
                    <div className="sticky left-0 z-10 border-r border-slate-100/80 bg-white py-3 pr-3">
                      <p className="text-sm font-semibold text-slate-950">
                        {student.name}
                        <span className="ml-2 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500">
                          {student.degree}
                        </span>
                      </p>
                      <p className="mt-1 hidden text-[11px] leading-4 text-slate-400 md:line-clamp-2">
                        {student.thesisTopic}
                      </p>
                    </div>
                    <div className="relative py-3">
                      <div className="absolute inset-0 grid grid-cols-14">
                        {ganttMonths.map((month) => (
                          <div
                            key={month}
                            className="border-l border-slate-100/60"
                          />
                        ))}
                      </div>
                      <div className="relative flex flex-col gap-2.5 px-2">
                        {studentTasks.map((task) => {
                          const left = (monthOffset(task.startDate) / 14) * 100;
                          const width =
                            ((monthOffset(task.endDate) -
                              monthOffset(task.startDate) +
                              0.25) /
                              14) *
                            100;
                          const ganttStatusStyle = getGanttStatusStyle(task);
                          const taskLabel = getTaskShortName(task);
                          const latestRecord = getLatestTaskRecord(
                            task,
                            student,
                            records,
                          );
                          const computedRisk = getComputedRiskLevel(task);

                          return (
                            <div key={task.id} className="h-10">
                              <div
                                className="group absolute h-8 min-w-20"
                                style={{
                                  left: `${Math.max(0, left)}%`,
                                  width: `${Math.min(98 - left, Math.max(8, width))}%`,
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => openEditor(task)}
                                  className="flex h-full w-full items-center justify-between gap-1.5 overflow-hidden rounded-xl border px-2 text-left text-[11px] font-semibold text-white transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 md:px-2.5"
                                  style={{
                                    backgroundColor:
                                      categoryColors[task.category],
                                    borderColor: ganttStatusStyle.borderColor,
                                    boxShadow: ganttStatusStyle.boxShadow,
                                    opacity: ganttStatusStyle.opacity,
                                  }}
                                >
                                  <span className="min-w-0 truncate">
                                    {taskLabel}
                                  </span>
                                  <span className="shrink-0 rounded-md bg-white/20 px-1.5 py-0.5 tabular-nums">
                                    · {task.progress}%
                                  </span>
                                </button>

                                <div className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 hidden w-80 -translate-x-1/2 rounded-md border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600 shadow-xl md:group-hover:block">
                                  <div className="mb-2 flex items-start justify-between gap-3">
                                    <div>
                                      <p className="font-semibold text-slate-950">
                                        {student.name}
                                        <span className="ml-2 font-normal text-slate-500">
                                          {student.degree}
                                        </span>
                                      </p>
                                      <p className="mt-1 font-medium text-slate-900">
                                        {task.title}
                                      </p>
                                    </div>
                                    <span
                                      className="shrink-0 rounded-md px-2 py-1 font-medium"
                                      style={{
                                        backgroundColor: getSoftCategoryColor(
                                          task.category,
                                        ),
                                        color: categoryColors[task.category],
                                      }}
                                    >
                                      {task.category}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                    <span>开始日期：{task.startDate}</span>
                                    <span>结束日期：{task.endDate}</span>
                                    <span>当前状态：{task.status}</span>
                                    <span>完成比例：{task.progress}%</span>
                                    <span>系统风险：{computedRisk}</span>
                                    <span>人工风险备注：{task.riskLevel}</span>
                                  </div>
                                  <p className="mt-2 border-t border-slate-100 pt-2">
                                    阶段成果：{task.deliverable}
                                  </p>
                                  <div className="mt-2 border-t border-slate-100 pt-2">
                                    <p>
                                      最近修改人：
                                      {latestRecord?.editor ?? "暂无"}
                                    </p>
                                    <p>
                                      最近修改说明：
                                      {latestRecord?.reason ?? "暂无"}
                                    </p>
                                    <p>
                                      最近修改时间：
                                      {latestRecord?.changedAt ?? "暂无"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}
        </section>
        </SafeSection>

        <SafeSection
          name="Task table"
          fallback="任务表加载失败，其他模块仍可继续使用。"
        >
        <section
          aria-labelledby="task-table-title"
          className="rounded-md border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <h2 id="task-table-title" className="text-xl font-semibold">
              任务进度表
            </h2>
            <button
              type="button"
              onClick={openTaskCreator}
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              新增任务
            </button>
          </div>
          {sortedTasks.length === 0 ? (
            <p className="px-4 py-5 text-sm text-slate-500">
              暂无任务数据或数据加载异常。
            </p>
          ) : (
          <>
          <div className="block divide-y divide-slate-100 md:hidden">
            {sortedTasks.map((task) => {
              const student = getStudent(task.studentId);
              const computedRisk = getComputedRiskLevel(task);

              return (
                <article
                  key={task.id}
                  onClick={() => openEditor(task)}
                  className="cursor-pointer p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950">
                        {student?.name} · {student?.degree}
                      </p>
                      <h3 className="mt-2 line-clamp-3 text-base font-semibold leading-6 text-slate-950">
                        {task.title}
                      </h3>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ${riskStyles[computedRisk]}`}
                    >
                      {computedRisk}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600">
                      {formatShortDate(task.startDate)}-
                      {formatShortDate(task.endDate)}
                    </span>
                    <span
                      className="rounded-md px-2 py-1 font-medium"
                      style={{
                        backgroundColor: getSoftCategoryColor(task.category),
                        color: categoryColors[task.category],
                      }}
                    >
                      {task.category}
                    </span>
                    <span
                      className={`rounded-md px-2 py-1 font-medium ring-1 ${statusStyles[task.status]}`}
                    >
                      {task.status}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-slate-500">完成比例</span>
                      <span className="font-semibold text-slate-900">
                        {task.progress}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-sm bg-slate-100">
                      <div
                        className="h-full bg-slate-700"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditor(task);
                      }}
                      className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-500 hover:bg-slate-100"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openDeleteDialog(task);
                      }}
                      className="inline-flex min-h-10 items-center justify-center rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:border-red-300 hover:bg-red-50"
                    >
                      删除
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-slate-100 text-xs text-slate-500">
                <tr>
                  {[
                    "学生",
                    "任务名称",
                    "时间范围",
                    "任务类别",
                    "完成比例",
                    "系统风险",
                    "操作",
                  ].map((heading) => (
                    <th key={heading} className="px-3 py-3 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedTasks.map((task) => {
                  const student = getStudent(task.studentId);
                  const computedRisk = getComputedRiskLevel(task);

                  return (
                    <tr key={task.id} className="align-middle hover:bg-slate-50">
                      <td className="whitespace-nowrap px-3 py-3">
                        <p className="font-medium text-slate-950">
                          {student?.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {student?.degree}
                        </p>
                      </td>
                      <td className="max-w-[360px] px-3 py-3">
                        <p
                          className="truncate font-medium text-slate-900"
                          title={`${task.title} · ${student?.thesisTopic ?? ""} · 状态：${task.status} · 人工风险备注：${task.riskLevel} · 阶段成果：${task.deliverable}`}
                        >
                          {task.title}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {task.status}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-600">
                        {formatShortDate(task.startDate)}–
                        {formatShortDate(task.endDate)}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className="inline-flex rounded-md px-2 py-1 text-xs font-medium"
                          style={{
                            backgroundColor: getSoftCategoryColor(task.category),
                            color: categoryColors[task.category],
                          }}
                        >
                          {task.category}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 overflow-hidden rounded-sm bg-slate-100">
                            <div
                              className="h-full bg-slate-700"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                          <span className="text-slate-600">
                            {task.progress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${riskStyles[computedRisk]}`}
                          title={`人工风险备注：${task.riskLevel}`}
                        >
                          {computedRisk}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditor(task)}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-500 hover:bg-slate-100"
                          >
                            编辑
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteDialog(task)}
                            className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:border-red-300 hover:bg-red-50"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
          )}
        </section>
        </SafeSection>

        <SafeSection
          name="Change records"
          fallback="最近修改记录加载失败，其他模块仍可继续使用。"
        >
        <section
          aria-labelledby="records-title"
          className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
        >
          <h2 id="records-title" className="text-xl font-semibold">
            最近修改记录
          </h2>
          {records.length === 0 ? (
            <p className="mt-4 rounded-md bg-slate-50 px-3 py-4 text-sm text-slate-500">
              暂无修改记录或记录加载异常。
            </p>
          ) : (
          <>
          <div className="mt-4 block space-y-3 md:hidden">
            {records.map((record) => (
              <article
                key={record.id}
                className="rounded-md border border-slate-200 bg-white p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {record.action}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {record.changedAt}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    {record.editor}
                  </span>
                </div>
                <div className="mt-3 space-y-2 leading-6 text-slate-600">
                  <p>
                    <span className="font-medium text-slate-900">对象：</span>
                    {record.target}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">内容：</span>
                    {record.changes}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">说明：</span>
                    {record.reason}
                  </p>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead className="bg-slate-100 text-xs text-slate-500">
                <tr>
                  {[
                    "修改时间",
                    "编辑者",
                    "修改对象",
                    "操作内容",
                    "修改内容",
                    "修改说明",
                  ].map((heading) => (
                    <th key={heading} className="px-4 py-3 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((record) => (
                  <tr key={record.id}>
                    <td className="px-4 py-3 text-slate-600">
                      {record.changedAt}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {record.editor}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {record.target}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {record.action}
                    </td>
                    <td className="max-w-md px-4 py-3 leading-6 text-slate-900">
                      {record.changes}
                    </td>
                    <td className="max-w-sm px-4 py-3 leading-6 text-slate-600">
                      {record.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
          )}
        </section>
        </SafeSection>
      </div>

      {deletingTask && deletingStudent && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-3 py-4 sm:items-center sm:px-4 sm:py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <form
            onSubmit={deleteTask}
            className="max-h-[90vh] w-[95vw] max-w-none overflow-y-auto rounded-md bg-white shadow-xl sm:max-w-2xl"
          >
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 id="delete-dialog-title" className="text-xl font-semibold">
                删除任务
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                删除后该任务会被标记为已删除，并从当前列表中移除。
              </p>
            </div>

            <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
              <div className="rounded-md bg-slate-50 px-3 py-3 text-sm sm:col-span-2">
                <p className="font-semibold text-slate-950">
                  {deletingStudent.name} · {deletingTask.title}
                </p>
                <div className="mt-3 grid gap-2 text-slate-600 sm:grid-cols-2">
                  <p>开始日期：{deletingTask.startDate}</p>
                  <p>结束日期：{deletingTask.endDate}</p>
                  <p>完成比例：{deletingTask.progress}%</p>
                  <p>当前状态：{deletingTask.status}</p>
                </div>
              </div>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                删除说明
                <textarea
                  value={editNote}
                  onChange={(event) => setEditNote(event.target.value)}
                  required
                  rows={3}
                  placeholder="请说明为什么删除该任务"
                  className="resize-none rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-slate-600"
                />
              </label>

              {formError && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
                  {formError}
                </p>
              )}
            </div>

            <div className="sticky bottom-0 flex gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteDialog}
                className="min-h-10 flex-1 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 sm:flex-none"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-10 flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 sm:flex-none"
              >
                {isSubmitting ? "删除中..." : "确认删除"}
              </button>
            </div>
          </form>
        </div>
      )}

      {isAddingTask && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-3 py-4 sm:items-center sm:px-4 sm:py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-dialog-title"
        >
          <form
            onSubmit={saveNewTask}
            className="max-h-[90vh] w-[95vw] max-w-none overflow-y-auto rounded-md bg-white shadow-xl sm:max-w-3xl"
          >
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 id="add-dialog-title" className="text-xl font-semibold">
                新增任务
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                新任务会写入 Supabase 数据库，并同步生成修改记录。
              </p>
            </div>

            <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                学生
                <select
                  value={newTask.studentId}
                  onChange={(event) =>
                    updateNewTask("studentId", event.target.value)
                  }
                  className="min-h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-slate-600"
                >
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                任务类别
                <select
                  value={newTask.category}
                  onChange={(event) =>
                    updateNewTask("category", event.target.value as TaskCategory)
                  }
                  className="min-h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-slate-600"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                任务名称
                <input
                  value={newTask.title}
                  onChange={(event) => updateNewTask("title", event.target.value)}
                  required
                  className="min-h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-slate-600"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                开始日期
                <input
                  type="date"
                  value={newTask.startDate}
                  onChange={(event) =>
                    updateNewTask("startDate", event.target.value)
                  }
                  required
                  className="min-h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-slate-600"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                结束日期
                <input
                  type="date"
                  value={newTask.endDate}
                  onChange={(event) =>
                    updateNewTask("endDate", event.target.value)
                  }
                  required
                  className="min-h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-slate-600"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                状态
                <select
                  value={newTask.status}
                  onChange={(event) =>
                    updateNewTask("status", event.target.value as TaskStatus)
                  }
                  className="min-h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-slate-600"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                人工风险备注
                <select
                  value={newTask.riskLevel}
                  onChange={(event) =>
                    updateNewTask("riskLevel", event.target.value as RiskLevel)
                  }
                  className="min-h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-slate-600"
                >
                  {riskOptions.map((risk) => (
                    <option key={risk} value={risk}>
                      {risk}
                    </option>
                  ))}
                </select>
                <span className="text-xs font-normal text-slate-500">
                  页面展示风险由系统按进度自动计算，此项仅作人工备注。
                </span>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                完成比例：{newTask.progress}%
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={newTask.progress}
                  onChange={(event) =>
                    updateNewTask("progress", Number(event.target.value))
                  }
                  className="accent-slate-800"
                />
              </label>

              <p className="text-xs leading-5 text-slate-500 sm:col-span-2">
                系统会根据状态、时间节点和完成比例自动判断展示风险；人工风险备注仅作为补充说明。
              </p>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                阶段成果
                <input
                  value={newTask.deliverable}
                  onChange={(event) =>
                    updateNewTask("deliverable", event.target.value)
                  }
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-slate-600"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                修改说明
                <textarea
                  value={editNote}
                  onChange={(event) => setEditNote(event.target.value)}
                  required
                  rows={3}
                  placeholder="请说明新增该任务的原因或背景"
                  className="resize-none rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-slate-600"
                />
              </label>

              {formError && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
                  {formError}
                </p>
              )}
            </div>

            <div className="sticky bottom-0 flex gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:justify-end">
              <button
                type="button"
                onClick={closeTaskCreator}
                className="min-h-10 flex-1 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 sm:flex-none"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-10 flex-1 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 sm:flex-none"
              >
                {isSubmitting ? "保存中..." : "保存"}
              </button>
            </div>
          </form>
        </div>
      )}

      {editingTask && draft && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-3 py-4 sm:items-center sm:px-4 sm:py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-dialog-title"
        >
          <form
            onSubmit={saveTask}
            className="max-h-[90vh] w-[95vw] max-w-none overflow-y-auto rounded-md bg-white shadow-xl sm:max-w-3xl"
          >
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 id="edit-dialog-title" className="text-xl font-semibold">
                编辑任务
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                任务名称：{editingTask.title}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                系统风险：
                {getComputedRiskLevel({ ...editingTask, ...draft })}
              </p>
            </div>

            <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                任务类别
                <select
                  value={draft.category}
                  onChange={(event) =>
                    updateDraft("category", event.target.value as TaskCategory)
                  }
                  className="min-h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-slate-600"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                状态
                <select
                  value={draft.status}
                  onChange={(event) =>
                    updateDraft("status", event.target.value as TaskStatus)
                  }
                  className="min-h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-slate-600"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                开始日期
                <input
                  type="date"
                  value={draft.startDate}
                  onChange={(event) =>
                    updateDraft("startDate", event.target.value)
                  }
                  className="min-h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-slate-600"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                结束日期
                <input
                  type="date"
                  value={draft.endDate}
                  onChange={(event) =>
                    updateDraft("endDate", event.target.value)
                  }
                  className="min-h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-slate-600"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                完成比例：{draft.progress}%
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={draft.progress}
                  onChange={(event) =>
                    updateDraft("progress", Number(event.target.value))
                  }
                  className="accent-slate-800"
                />
              </label>

              <p className="text-xs leading-5 text-slate-500 sm:col-span-2">
                系统会根据状态、时间节点和完成比例自动判断展示风险；人工风险备注仅作为补充说明。
              </p>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                人工风险备注
                <select
                  value={draft.riskLevel}
                  onChange={(event) =>
                    updateDraft("riskLevel", event.target.value as RiskLevel)
                  }
                  className="min-h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-slate-600"
                >
                  {riskOptions.map((risk) => (
                    <option key={risk} value={risk}>
                      {risk}
                    </option>
                  ))}
                </select>
                <span className="text-xs font-normal text-slate-500">
                  页面展示风险由系统按进度自动计算，此项仅作人工备注。
                </span>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                阶段成果
                <input
                  value={draft.deliverable}
                  onChange={(event) =>
                    updateDraft("deliverable", event.target.value)
                  }
                  className="min-h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-slate-600"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                修改说明
                <textarea
                  value={editNote}
                  onChange={(event) => setEditNote(event.target.value)}
                  required
                  rows={3}
                  placeholder="说明为什么修改时间、状态或进度"
                  className="resize-none rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none transition focus:border-slate-600"
                />
              </label>

              {formError && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
                  {formError}
                </p>
              )}
            </div>

            <div className="sticky bottom-0 flex gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:justify-end">
              <button
                type="button"
                onClick={closeEditor}
                className="min-h-10 flex-1 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 sm:flex-none"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-10 flex-1 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 sm:flex-none"
              >
                {isSubmitting ? "保存中..." : "保存修改"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
