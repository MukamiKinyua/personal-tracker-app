import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { LucideIcon } from "lucide-react";
import { COOKIE_NAME } from "@shared/const";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Clock3,
  Compass,
  Dumbbell,
  Flower2,
  HeartPulse,
  Home as HomeIcon,
  Menu,
  Moon,
  NotebookPen,
  Play,
  Plus,
  Sparkles,
  Target,
  TimerReset,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { AccountPanel } from "@/components/AccountPanel";
import { TodayPanel } from "@/components/TodayPanel";
import { InsightsPanel } from "@/components/InsightsPanel";
import { ReviewPanel } from "@/components/ReviewPanel";
import { JournalCalendar } from "@/components/JournalCalendar";
import { useRecordStore } from "@/contexts/RecordStoreContext";
import { computeStreak, type HabitDayState } from "@/lib/core/streaks";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useMongoJournalScope } from "../hooks/useMongoJournalScope";
import {
  pageTurnDestinationClass,
  pageTurnDuration,
} from "../lib/journalMotion";
import { portraitDayAnchors, portraitDayRegion } from "../lib/portraitScene";
import {
  pixelsCellKey,
  pixelsMonths,
  setPixelCell,
  type PixelCells,
  updatePixelCell,
} from "../lib/pixelsTracker";
import {
  formatSleepDuration,
  replaceSleepLog,
  sleepDurationBand,
  sleepDurationHours,
} from "../lib/sleepTracker";
import { addCycleContextTag, toggleCycleContextTag } from "../lib/cycleContext";
import {
  habitWeekSummary,
  setHabitDayState,
  type HabitDailyState,
  type HabitRecord,
} from "../lib/habitTracker";
import {
  moodContextOptions,
  moodPatternSummary,
  toggleMoodContext,
  type MoodEntry,
} from "../lib/moodTracker";
import { focusSummary, type FocusSession } from "../lib/productivityTracker";
import {
  avoidanceMilestone,
  elapsedAvoidanceSeconds,
  formatAvoidanceDuration,
  resetAvoidanceHabit,
  type AvoidanceHabit,
} from "../lib/avoidanceTracker";
import { digitalSummary, type DigitalEntry } from "../lib/digitalTracker";
import {
  assignmentDueStatus,
  assignmentWorkload,
  sortAssignmentsByDue,
  type AssignmentPlan,
} from "../lib/assignmentTracker";
import {
  examDueStatus,
  nextAcademicItem,
  weeklyRevisionMinutes,
  weightedStanding,
  type CourseAssessment,
  type CourseMilestone,
  type CourseWork,
  type ExamCheckpoint,
  type RevisionLog,
} from "../lib/academicTracker";
import {
  formatStudyTimer,
  studyTimeSummary,
  type StudySessionRecord,
} from "../lib/studyTracker";
import {
  normalizePlanningTasks,
  taskPlanningSummary,
  taskSection,
  type PlanningTask,
} from "../lib/taskTracker";
import {
  formatClockSeconds,
  isTimerRun,
  localTimingSummary,
  timerSecondsAt,
  type LocalTimerRecord,
  type TimerRun,
} from "../lib/timeTracker";
import {
  cashFlowSummary,
  cashOutByCategory,
  entriesForPeriod,
  periodLabel,
  runningBalanceSeries,
  type CashFlowEntry,
  type CashFlowPeriod,
} from "../lib/financeTracker";
import {
  documentReviewStatus,
  documentReviewSummary,
  sortDocumentsForReview,
  type DocumentAttachment,
  type RenewalRecord,
  type RenewalState,
} from "../lib/documentTracker";
import {
  learningPracticeSummary,
  mostRecentPractice,
} from "../lib/learningTracker";
import {
  factualGoalProgress,
  goalStateSummary,
  reviewGoals,
  type GoalMilestoneRecord,
  type GoalState,
} from "../lib/goalTracker";
import {
  appendSecurityReviewLog,
  securityReviewStatus,
  securityReviewSummary,
  type SecurityReviewStatus,
} from "../lib/securityTracker";
import {
  compareLocalActivitySources,
  descriptiveActivityTrend,
  filterAnalyticsActivityByPeriod,
  localActivitySummary,
  localPixelSummary,
  type AnalyticsPeriod,
} from "../lib/analyticsTracker";
import { eligibleRecommendationSourceKeys } from "../lib/recommendationTracker";
import {
  emptyIntegrationConsent,
  integrationConsentSummary,
  integrationOptions,
  toggleIntegrationConsent,
  type IntegrationConsent,
  type IntegrationKey,
} from "../lib/integrationTracker";
import {
  filterHistoryEntries,
  historyModuleTotals,
  readPersistedHistoryRecords,
} from "../lib/historyTracker";
import {
  removeWaterEntry,
  waterProgress,
  waterRemaining,
} from "../lib/waterTracker";
import { BicycleKicksMotionDemo } from "../components/BicycleKicksMotionDemo";
import { JackKnivesMotionDemo } from "../components/JackKnivesMotionDemo";
import { RussianTwistsMotionDemo } from "../components/RussianTwistsMotionDemo";
import { BicycleCrunchesMotionDemo } from "../components/BicycleCrunchesMotionDemo";
import { LegRaisesMotionDemo } from "../components/LegRaisesMotionDemo";
import { SingleLegCrunchMotionDemo } from "../components/SingleLegCrunchMotionDemo";
import { ScissorKicksMotionDemo } from "../components/ScissorKicksMotionDemo";
import { GluteDonkeyKicksMotionDemo } from "../components/GluteDonkeyKicksMotionDemo";
import { WorkoutVideoDemo } from "../components/WorkoutVideoDemo";
import { YogaPoseArtworkDemo } from "../components/YogaPoseArtworkDemo";
import {
  detailedDemoPlaybackState,
  detailedWorkoutDemoAssets,
  isDetailedWorkoutDemo,
} from "../lib/workoutDemoCatalog";
import {
  workoutCompletedCount,
  workoutRoutineById,
  workoutRoutines,
  type WorkoutMotion,
  type WorkoutRoutine,
} from "../lib/workoutStudio";
import {
  addPracticeSession,
  adjustManualCountdown,
  activePageAfterNavigation,
  estimateCycle,
  formatHistoryActivityMetric,
  portraitMonthsForYear,
  reflectionCarryForward,
  renameNamedEntry,
  resolveJournalView,
  saveReflectionEntry,
  toggleAnnualSlotFill,
  toggleDailySlotFill,
  toggleNamedCompletion,
  toggleQuickAddVisibility,
  type ReflectionEntry,
  type JournalView,
} from "../lib/journalState";
import "../journal.css";

type View = JournalView;

type TurnDirection = "forward" | "backward";

type ContentsGroup = {
  label: string;
  eyebrow: string;
  icon: LucideIcon;
  items: Array<{ label: string; view: View; note: string }>;
};

const groups: ContentsGroup[] = [
  {
    label: "Body",
    eyebrow: "care & energy",
    icon: HeartPulse,
    items: [
      {
        label: "Fitness & Portraits",
        view: "portraits",
        note: "movement, recovery & color",
      },
      {
        label: "Workout Studio",
        view: "workouts",
        note: "guided motion & routines",
      },
      { label: "Nutrition", view: "nutrition", note: "nourish & plan meals" },
      { label: "Water Intake", view: "water", note: "hydrate with intention" },
      { label: "Sleep", view: "sleep", note: "rest, routine & recovery" },
      {
        label: "Period & Cycle Tracker",
        view: "cycle",
        note: "private cycle overview",
      },
    ],
  },
  {
    label: "Mind",
    eyebrow: "focus & reflection",
    icon: Moon,
    items: [
      {
        label: "Weekly & Monthly Reflections",
        view: "reflections",
        note: "notice, learn & reset",
      },
      { label: "Wellbeing", view: "wellbeing", note: "mood & restful rituals" },
      { label: "Habits", view: "habits", note: "gentle consistency" },
      { label: "Productivity", view: "productivity", note: "focus & flow" },
      {
        label: "Digital Life",
        view: "digitalLife",
        note: "screen time & boundaries",
      },
    ],
  },
  {
    label: "Life",
    eyebrow: "plan & move",
    icon: CalendarDays,
    items: [
      {
        label: "Assignments",
        view: "assignments",
        note: "deadlines & next steps",
      },
      { label: "Courses", view: "courses", note: "subjects & materials" },
      { label: "Exams", view: "exams", note: "prepare with perspective" },
      {
        label: "Study Sessions",
        view: "studySessions",
        note: "focus & review",
      },
      { label: "Tasks", view: "tasks", note: "capture & complete" },
      { label: "Time", view: "time", note: "shape your day" },
      { label: "Finances", view: "finances", note: "private money notes" },
      { label: "Documents", view: "documents", note: "metadata & renewals" },
      { label: "Security", view: "security", note: "hygiene & privacy" },
      {
        label: "Environment",
        view: "environment",
        note: "care for your space",
      },
      { label: "Purchases", view: "purchases", note: "plan & reflect" },
      {
        label: "Responsibilities",
        view: "responsibilities",
        note: "repeat & follow through",
      },
      { label: "Career Goals", view: "career", note: "direction & evidence" },
      {
        label: "Portfolio",
        view: "portfolio",
        note: "projects & presentation",
      },
      { label: "Projects", view: "projects", note: "plan & make progress" },
      {
        label: "Certifications",
        view: "certifications",
        note: "prepare & renew",
      },
      { label: "CV", view: "cv", note: "shape your story" },
      {
        label: "Internship Applications",
        view: "internships",
        note: "apply & follow through",
      },
      {
        label: "Privacy Controls",
        view: "privacy",
        note: "sensitive data choices",
      },
      {
        label: "Reminder Preview",
        view: "notifications",
        note: "what a reminder reveals",
      },
      {
        label: "Export",
        view: "exportData",
        note: "download your local session",
      },
      { label: "History", view: "history", note: "session records & review" },
      { label: "Social Life", view: "social", note: "people & connection" },
      { label: "Family", view: "family", note: "shared care & dates" },
      { label: "Hobbies", view: "hobbies", note: "play & practice" },
      { label: "Experiences", view: "experiences", note: "plans & memories" },
      {
        label: "Achievements",
        view: "achievements",
        note: "notice your growth",
      },
      {
        label: "Personal Growth",
        view: "personalGrowth",
        note: "values & becoming",
      },
      {
        label: "Daily Dashboard",
        view: "dashboard",
        note: "your day in focus",
      },
    ],
  },
  {
    label: "Goals & Growth",
    eyebrow: "learn & become",
    icon: Compass,
    items: [
      {
        label: "Learning Something New",
        view: "learning",
        note: "skills, practice & milestones",
      },
      { label: "Goals", view: "goals", note: "progress with intention" },
    ],
  },
  {
    label: "Utilities",
    eyebrow: "review & guidance",
    icon: Sparkles,
    items: [
      { label: "Analytics", view: "analytics", note: "local facts & review" },
      { label: "Insights", view: "insights", note: "evidence with context" },
      {
        label: "Recommendations",
        view: "recommendations",
        note: "optional next steps",
      },
      {
        label: "Integrations",
        view: "integrations",
        note: "consent before connection",
      },
    ],
  },
];

const viewTitles: Record<View, string> = {
  cover: "Glory Mukami’s Personal Tracker",
  contents: "Table of Contents",
  dashboard: "Life Dashboard",
  portraits: "Fitness & Portraits",
  workouts: "Workout Studio",
  assignments: "Assignments",
  courses: "Courses",
  exams: "Exams",
  studySessions: "Study Sessions",
  goals: "Goals",
  time: "Time",
  finances: "Finances",
  documents: "Documents",
  security: "Security",
  environment: "Environment",
  purchases: "Purchases",
  responsibilities: "Responsibilities",
  career: "Career Goals",
  portfolio: "Portfolio",
  projects: "Projects",
  certifications: "Certifications",
  cv: "CV",
  internships: "Internship Applications",
  analytics: "Analytics",
  insights: "Insights",
  recommendations: "Recommendations",
  privacy: "Privacy Controls",
  notifications: "Reminder Preview",
  integrations: "Integrations",
  exportData: "Export",
  history: "History",
  social: "Social Life",
  family: "Family",
  hobbies: "Hobbies",
  experiences: "Experiences",
  achievements: "Achievements",
  personalGrowth: "Personal Growth",
  tasks: "Tasks",
  wellbeing: "Wellbeing",
  sleep: "Sleep",
  habits: "Habits",
  productivity: "Productivity",
  digitalLife: "Digital Life",
  learning: "Learning Something New",
  cycle: "Period & Cycle Tracker",
  nutrition: "Nutrition",
  water: "Water Intake",
  reflections: "Reflections",
  utilities: "Journal Tools",
};

const colorKey = [
  { name: "Quiet Rest", value: "#42305f" },
  { name: "Gentle", value: "#1987b9" },
  { name: "Strong", value: "#d238a4" },
  { name: "Peak", value: "#f1b633" },
];

const portraitThemes = [
  { id: "undersea", label: "Undersea", note: "Mermaids & coral" },
  { id: "nocturne", label: "Nocturne", note: "Moonlit garden" },
  { id: "peacock", label: "Peacock", note: "Feathers & bloom" },
] as const;

const quickItems = [
  "New task",
  "Log a workout",
  "Add assignment",
  "Track today",
  "Start focus timer",
];

const utilityItems: Array<{ label: string; note: string; view: View }> = [
  {
    label: "Tasks",
    note: "Capture and complete what needs attention.",
    view: "tasks",
  },
  {
    label: "Time",
    note: "Plan your day and make space for focus.",
    view: "time",
  },
  {
    label: "Security",
    note: "Review private account and safety habits.",
    view: "security",
  },
  {
    label: "Analytics",
    note: "See the local record across your journal.",
    view: "analytics",
  },
  {
    label: "Insights",
    note: "Notice evidence with context.",
    view: "insights",
  },
  {
    label: "Recommendations",
    note: "Choose one optional next step.",
    view: "recommendations",
  },
  {
    label: "Integrations",
    note: "Record consent before any future connection.",
    view: "integrations",
  },
];

type PixelsStatus = { label: string; color: string };

const pixelsProfiles = {
  movement: {
    title: "Movement Pixels",
    eyebrow: "fitness · shared with workout studio",
    statuses: [
      { label: "Strength", color: "#d94889" },
      { label: "Mobility", color: "#29a8ad" },
      { label: "Rest", color: "#efb93d" },
    ],
  },
  mood: {
    title: "Mood Pixels",
    eyebrow: "wellbeing · daily check-in",
    statuses: [
      { label: "Happy", color: "#e65c97" },
      { label: "Calm", color: "#3a9ba0" },
      { label: "Tender", color: "#9673c6" },
      { label: "Low energy", color: "#e6ae42" },
    ],
  },
  water: {
    title: "Hydration Pixels",
    eyebrow: "water · daily rhythm",
    statuses: [
      { label: "Goal met", color: "#32a7cf" },
      { label: "Some water", color: "#8fd4e7" },
      { label: "Gentle reminder", color: "#f0bd5d" },
    ],
  },
  nutrition: {
    title: "Nourishment Pixels",
    eyebrow: "nutrition · meal rhythm",
    statuses: [
      { label: "Balanced", color: "#e35d48" },
      { label: "Comfort", color: "#d34c93" },
      { label: "Something new", color: "#249a9e" },
    ],
  },
  sleep: {
    title: "Rest Pixels",
    eyebrow: "sleep · hours per night",
    statuses: [
      { label: "Under 5 h", color: "#df7c9e" },
      { label: "5–6 h 59", color: "#8e7ac0" },
      { label: "7–8 h 59", color: "#4b79b8" },
      { label: "9 h or more", color: "#29a8ad" },
    ],
  },
  habits: {
    title: "Habit Pixels",
    eyebrow: "habits · daily rhythm",
    statuses: [
      { label: "Complete", color: "#e75e93" },
      { label: "Partial", color: "#e3a83a" },
      { label: "Rest day", color: "#3c9aa1" },
      { label: "Skipped", color: "#8b7b82" },
    ],
  },
  focus: {
    title: "Focus Pixels",
    eyebrow: "productivity · practice rhythm",
    statuses: [
      { label: "Deep focus", color: "#5b63b9" },
      { label: "Gentle focus", color: "#d64496" },
      { label: "Reset", color: "#e9b640" },
    ],
  },
  learning: {
    title: "Practice Pixels",
    eyebrow: "learning · skill rhythm",
    statuses: [
      { label: "Practised", color: "#c94894" },
      { label: "Reviewed", color: "#2a9fa2" },
      { label: "Milestone", color: "#e5b13c" },
    ],
  },
} as const;

type PixelsProfileKey = keyof typeof pixelsProfiles;
type PixelsTrackerStore = {
  records: Record<string, PixelCells>;
  update: (
    tracker: PixelsProfileKey,
    monthIndex: number,
    day: number,
    color: string
  ) => void;
  set: (
    tracker: PixelsProfileKey,
    monthIndex: number,
    day: number,
    color: string
  ) => void;
};
const PixelsTrackerContext = createContext<PixelsTrackerStore | null>(null);
const pixelsTrackerForView: Partial<Record<View, PixelsProfileKey>> = {};

function PixelsGrid({
  tracker,
  inkText = true,
}: {
  tracker: PixelsProfileKey;
  inkText?: boolean;
}) {
  const store = useContext(PixelsTrackerContext);
  if (!store) return null;
  const profile = pixelsProfiles[tracker];
  const [selectedColor, setSelectedColor] = useState<string>(
    profile.statuses[0].color
  );
  const cells = store.records[tracker] || {};
  const textStyle = inkText
    ? {
        color: "#000000",
        WebkitTextFillColor: "#000000",
        opacity: 1,
        textShadow: "none",
      }
    : undefined;
  return (
    <section
      className={cn("pixels-tracker", inkText && "pixels-tracker-ink")}
      style={textStyle}
      aria-label={`${profile.title} year-at-a-glance tracker`}
    >
      <div className="pixels-tracker-heading">
        <div>
          <span style={textStyle}>{profile.eyebrow}</span>
          <h3 style={textStyle}>{profile.title}</h3>
        </div>
        <b style={textStyle}>{Object.keys(cells).length} marked</b>
      </div>
      <div className="pixels-key" aria-label={`${profile.title} status key`}>
        {profile.statuses.map((status: PixelsStatus) => (
          <button
            type="button"
            style={textStyle}
            className={cn(selectedColor === status.color && "selected")}
            onClick={() => setSelectedColor(status.color)}
            key={status.label}
          >
            <i style={{ background: status.color }} />
            <span style={textStyle}>{status.label}</span>
          </button>
        ))}
      </div>
      <div className="pixels-matrix" role="grid" aria-label="Days by month">
        <div className="pixels-month-row">
          <i aria-hidden="true" />
          {pixelsMonths.map((month, monthIndex) => (
            <span style={textStyle} key={`${month}-${monthIndex}`}>
              {month}
            </span>
          ))}
        </div>
        {Array.from({ length: 31 }, (_, index) => index + 1).map(day => (
          <div className="pixels-day-row" role="row" key={day}>
            <b style={textStyle}>{day}</b>
            {pixelsMonths.map((month, monthIndex) => {
              const key = pixelsCellKey(monthIndex, day);
              const fill = cells[key];
              return (
                <button
                  type="button"
                  role="gridcell"
                  key={`${monthIndex}-${day}`}
                  aria-label={`${month} ${day}`}
                  aria-pressed={Boolean(fill)}
                  style={fill ? { background: fill } : undefined}
                  onClick={() =>
                    store.update(tracker, monthIndex, day, selectedColor)
                  }
                />
              );
            })}
          </div>
        ))}
      </div>
      <p style={textStyle} className="pixels-help">
        Choose a key, then tap a day to fill it. Tap the same colour again to
        clear it.
      </p>
    </section>
  );
}

type InsightActivity = {
  id: string;
  module:
    | "Productivity"
    | "Habits"
    | "Learning"
    | "Reflections"
    | "Wellbeing"
    | "Sleep"
    | "Nutrition"
    | "Portrait"
    | "Tasks"
    | "Assignments"
    | "Study Sessions"
    | "Goals"
    | "Time"
    | "Finances";
  amount: number;
  label: string;
  createdAt: string;
  recordedOn?: string;
};
type ReminderPreferenceKey =
  | "assignments"
  | "habits"
  | "period"
  | "documents"
  | "responsibilities"
  | "security";
type ReminderPreferences = Record<
  ReminderPreferenceKey,
  { enabled: boolean; timing: string }
>;
type LocalReminder = {
  id: string;
  title: string;
  kind: string;
  dueAt: number;
  enabled: boolean;
  completed: boolean;
  deliveredAt?: number;
};
type JournalShellPayload = {
  insightActivity?: InsightActivity[];
  privateMode?: boolean;
  showSensitiveSummaries?: boolean;
  notificationPreviewMode?: string;
  reminderPreferences?: ReminderPreferences;
  localReminders?: LocalReminder[];
  pixelRecords?: Record<string, PixelCells>;
  contentsPreferences?: {
    expandedGroup: string;
    lastVisitedPage: View;
  };
};
const ReminderPreviewContext = createContext("Hide sensitive names");

function reminderNotificationBody(
  mode: string,
  reminder: LocalReminder
): string {
  if (mode === "Hide all reminder previews") return "Reminder due";
  if (mode === "Show a general reminder only")
    return "You have a private reminder";
  if (mode === "Hide sensitive names") return `${reminder.kind} reminder`;
  return reminder.title;
}

function ReminderPreviewText({
  kind,
  detail,
}: {
  kind: string;
  detail: string;
}) {
  const previewMode = useContext(ReminderPreviewContext);
  const text =
    previewMode === "Hide all reminder previews"
      ? "Reminder preview hidden"
      : previewMode === "Show a general reminder only"
        ? "You have a private reminder"
        : `${kind} reminder`;
  return (
    <span className="module-reminder-preview" title={detail}>
      {text}
    </span>
  );
}

function JournalActions({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  return (
    <div className="journal-actions" aria-label="Journal navigation">
      <button className="journal-action" onClick={onCover} type="button">
        <HomeIcon size={15} />
        <span>Cover</span>
      </button>
      <button className="journal-action" onClick={onContents} type="button">
        <BookOpen size={15} />
        <span>Contents</span>
      </button>
    </div>
  );
}

export default function Home() {
  const auth = useAuth();
  const [view, setView] = useState<View>(() =>
    resolveJournalView(window.location.search)
  );
  const [isTurning, setIsTurning] = useState(false);
  const [turnDirection, setTurnDirection] = useState<TurnDirection>("forward");
  const [turnDestination, setTurnDestination] = useState<View>("contents");
  const [expandedGroup, setExpandedGroup] = useState("Body");
  const [mobileContentsOpen, setMobileContentsOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [activePage, setActivePage] = useState<View>("dashboard");
  const [contentsPreferences, setContentsPreferences] = useState({
    expandedGroup: "Body",
    lastVisitedPage: "dashboard" as View,
  });
  const [insightActivity, setInsightActivity] = useState<InsightActivity[]>([]);
  const [privateMode, setPrivateMode] = useState(false);
  const [showSensitiveSummaries, setShowSensitiveSummaries] = useState(true);
  const [notificationPreviewMode, setNotificationPreviewMode] = useState(
    "Hide sensitive names"
  );
  const [reminderPreferences, setReminderPreferences] =
    useState<ReminderPreferences>({
      assignments: { enabled: true, timing: "1 day before" },
      habits: { enabled: true, timing: "Evening" },
      period: { enabled: true, timing: "Day of estimate" },
      documents: { enabled: true, timing: "30 days before" },
      responsibilities: { enabled: true, timing: "Day before" },
      security: { enabled: true, timing: "Monthly review" },
    });
  const [localReminders, setLocalReminders] = useState<LocalReminder[]>([]);
  const [reminderNotice, setReminderNotice] = useState<string | null>(null);
  const [pixelRecords, setPixelRecords] = useState<Record<string, PixelCells>>(
    {}
  );
  const hydratedOwnerRef = useRef<number | null>(null);
  const mongoConnection = trpc.journal.connection.useQuery(undefined, {
    retry: 1,
    retryDelay: 750,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
  const persistenceEnabled =
    auth.isAuthenticated && mongoConnection.data?.ready === true;
  const journalStateQuery = trpc.journal.state.get.useQuery(
    { scope: "journal-shell" },
    { enabled: persistenceEnabled, retry: false, refetchOnWindowFocus: false }
  );
  const saveJournalState = trpc.journal.state.upsert.useMutation({
    onError: error => {
      console.warn(
        "[Persistence] Could not save journal shell; local fallback remains active.",
        error
      );
    },
  });
  const recordJournalEvent = trpc.journal.events.record.useMutation();

  useEffect(() => {
    if (!persistenceEnabled || !auth.user || !journalStateQuery.isSuccess)
      return;
    if (hydratedOwnerRef.current === auth.user.id) return;
    const payload = (journalStateQuery.data?.payload ||
      {}) as JournalShellPayload;
    if (Array.isArray(payload.insightActivity))
      setInsightActivity(payload.insightActivity);
    if (typeof payload.privateMode === "boolean")
      setPrivateMode(payload.privateMode);
    if (typeof payload.showSensitiveSummaries === "boolean")
      setShowSensitiveSummaries(payload.showSensitiveSummaries);
    if (typeof payload.notificationPreviewMode === "string")
      setNotificationPreviewMode(payload.notificationPreviewMode);
    if (
      payload.reminderPreferences &&
      typeof payload.reminderPreferences === "object"
    )
      setReminderPreferences(payload.reminderPreferences);
    if (Array.isArray(payload.localReminders))
      setLocalReminders(payload.localReminders as LocalReminder[]);
    if (payload.pixelRecords && typeof payload.pixelRecords === "object")
      setPixelRecords(payload.pixelRecords);
    if (
      payload.contentsPreferences &&
      typeof payload.contentsPreferences === "object"
    )
      setContentsPreferences(payload.contentsPreferences);
    hydratedOwnerRef.current = auth.user.id;
  }, [
    auth.user,
    journalStateQuery.data,
    journalStateQuery.isSuccess,
    persistenceEnabled,
  ]);

  const journalShellPayload = useMemo<JournalShellPayload>(
    () => ({
      insightActivity,
      privateMode,
      showSensitiveSummaries,
      notificationPreviewMode,
      reminderPreferences,
      localReminders,
      pixelRecords,
      contentsPreferences,
    }),
    [
      insightActivity,
      privateMode,
      showSensitiveSummaries,
      notificationPreviewMode,
      reminderPreferences,
      localReminders,
      pixelRecords,
      contentsPreferences,
    ]
  );
  const shellLocalStorageKey = `glory-personal-tracker:journal-shell:${auth.user?.id ?? "guest"}`;
  const hydratedShellLocalKeyRef = useRef("");
  useEffect(() => {
    if (hydratedShellLocalKeyRef.current === shellLocalStorageKey) return;
    hydratedShellLocalKeyRef.current = shellLocalStorageKey;
    try {
      const raw = window.localStorage.getItem(shellLocalStorageKey);
      if (!raw) return;
      const payload = JSON.parse(raw) as JournalShellPayload;
      if (Array.isArray(payload.insightActivity))
        setInsightActivity(payload.insightActivity);
      if (typeof payload.privateMode === "boolean")
        setPrivateMode(payload.privateMode);
      if (typeof payload.showSensitiveSummaries === "boolean")
        setShowSensitiveSummaries(payload.showSensitiveSummaries);
      if (typeof payload.notificationPreviewMode === "string")
        setNotificationPreviewMode(payload.notificationPreviewMode);
      if (
        payload.reminderPreferences &&
        typeof payload.reminderPreferences === "object"
      )
        setReminderPreferences(payload.reminderPreferences);
      if (Array.isArray(payload.localReminders))
        setLocalReminders(payload.localReminders as LocalReminder[]);
      if (payload.pixelRecords && typeof payload.pixelRecords === "object")
        setPixelRecords(payload.pixelRecords);
      if (
        payload.contentsPreferences &&
        typeof payload.contentsPreferences === "object"
      )
        setContentsPreferences(payload.contentsPreferences);
    } catch {
      // A blocked or malformed browser-local store must not stop the journal shell.
    }
  }, [shellLocalStorageKey]);

  useEffect(() => {
    setExpandedGroup(contentsPreferences.expandedGroup);
  }, [contentsPreferences.expandedGroup]);

  useEffect(() => {
    if (hydratedShellLocalKeyRef.current !== shellLocalStorageKey) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          shellLocalStorageKey,
          JSON.stringify(journalShellPayload)
        );
      } catch {
        // Browser storage is an enhancement; the server path remains available.
      }
      if (
        persistenceEnabled &&
        auth.user &&
        hydratedOwnerRef.current === auth.user.id
      ) {
        saveJournalState.mutate({
          scope: "journal-shell",
          payload: journalShellPayload,
        });
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [
    auth.user,
    journalShellPayload,
    persistenceEnabled,
    saveJournalState,
    shellLocalStorageKey,
  ]);
  useEffect(() => {
    const flushJournalShell = () => {
      try {
        window.localStorage.setItem(
          shellLocalStorageKey,
          JSON.stringify(journalShellPayload)
        );
      } catch {
        // Browser storage may be unavailable; the UI remains usable.
      }
    };
    window.addEventListener("pagehide", flushJournalShell);
    return () => window.removeEventListener("pagehide", flushJournalShell);
  }, [journalShellPayload, shellLocalStorageKey]);
  useEffect(() => {
    const nextReminder = localReminders
      .filter(
        reminder =>
          reminder.enabled && !reminder.completed && !reminder.deliveredAt
      )
      .sort((first, second) => first.dueAt - second.dueAt)[0];
    if (!nextReminder) return;
    const delay = Math.max(
      0,
      Math.min(nextReminder.dueAt - Date.now(), 2_147_483_647)
    );
    const timer = window.setTimeout(() => {
      setLocalReminders(current =>
        current.map(reminder =>
          reminder.id === nextReminder.id
            ? { ...reminder, deliveredAt: Date.now() }
            : reminder
        )
      );
      const body = reminderNotificationBody(
        notificationPreviewMode,
        nextReminder
      );
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification("Glory Mukami’s Personal Tracker", { body });
        } catch {
          setReminderNotice(body);
        }
      } else {
        setReminderNotice(body);
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [localReminders, notificationPreviewMode]);

  function updatePixels(
    tracker: PixelsProfileKey,
    monthIndex: number,
    day: number,
    color: string
  ) {
    setPixelRecords(current => ({
      ...current,
      [tracker]: updatePixelCell(
        current[tracker] || {},
        monthIndex,
        day,
        color
      ),
    }));
  }

  function setPixels(
    tracker: PixelsProfileKey,
    monthIndex: number,
    day: number,
    color: string
  ) {
    setPixelRecords(current => ({
      ...current,
      [tracker]: setPixelCell(current[tracker] || {}, monthIndex, day, color),
    }));
  }

  function recordInsightActivity(
    activity: Omit<InsightActivity, "id" | "createdAt" | "recordedOn">
  ) {
    const now = new Date();
    const record = {
      ...activity,
      id: `${Date.now()}-${insightActivity.length}`,
      createdAt: now.toLocaleDateString("en", {
        month: "short",
        day: "numeric",
      }),
      recordedOn: now.toISOString().slice(0, 10),
    };
    setInsightActivity(current => [record, ...current]);
    if (persistenceEnabled) {
      recordJournalEvent.mutate({
        scope: "activity",
        kind: record.module.toLowerCase().replaceAll(" ", "-"),
        summary: record.label,
        metadata: { amount: record.amount, recordedOn: record.recordedOn },
      });
    }
  }

  useLayoutEffect(() => {
    if (view === "cover") return;
    const resetRightPaneScroll = () => {
      const stage = document.querySelector<HTMLElement>(
        `.journal-stage[data-journal-view="${view}"]`
      );
      if (!stage) return;
      const scrollables = [
        stage,
        ...Array.from(
          stage.querySelectorAll<HTMLElement>(
            ".journal-spread > .spread-page:last-child, .dashboard-page, .contents-list"
          )
        ),
      ];
      scrollables.forEach(element => {
        if (element.scrollHeight > element.clientHeight + 1)
          element.scrollTop = 0;
      });
    };
    resetRightPaneScroll();
    const frame = window.requestAnimationFrame(resetRightPaneScroll);
    const timer = window.setTimeout(resetRightPaneScroll, 0);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [view]);

  const activeLabel = useMemo(() => viewTitles[view], [view]);
  const activePixelsTracker = pixelsTrackerForView[view];
  const persistenceLabel = mongoConnection.isLoading
    ? "Checking sync…"
    : persistenceEnabled
      ? "Cloud sync ready"
      : auth.isAuthenticated
        ? "Saved locally · cloud sync unavailable"
        : "Saved locally";

  function turnTo(nextView: View, direction: TurnDirection = "forward") {
    if (isTurning || nextView === view) return;
    setMobileContentsOpen(false);
    setQuickAddOpen(false);
    const prefersReducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const duration = pageTurnDuration(Boolean(prefersReducedMotion));
    if (duration === 0) {
      setActivePage(currentPage =>
        activePageAfterNavigation(currentPage, nextView)
      );
      setView(nextView);
      return;
    }
    setTurnDirection(direction);
    setTurnDestination(nextView);
    setIsTurning(true);
    window.setTimeout(() => {
      setActivePage(currentPage =>
        activePageAfterNavigation(currentPage, nextView)
      );
      setView(nextView);
      setIsTurning(false);
    }, duration);
  }

  function selectContentsItem(nextView: View) {
    setContentsPreferences(prev => ({ ...prev, lastVisitedPage: nextView }));
    turnTo(nextView, "forward");
  }

  function renderPage() {
    switch (view) {
      case "cover":
        return (
          <section className="journal-cover" aria-labelledby="cover-title">
            <div className="cover-art" />
            <div className="cover-vignette" />
            <div className="cover-content">
              <div
                className="cover-emblem"
                aria-label="Glory Mukami personal journal emblem"
              >
                <span>GM</span>
                <i />
              </div>
              <p className="cover-kicker">a personal life journal</p>
              <h1 id="cover-title">
                Glory Mukami’s
                <br />
                Personal Tracker
              </h1>
              <p className="cover-copy">
                A beautifully practical place to notice your rhythms, plan with
                ease, and collect the moments that shape you.
              </p>
              <Button
                className="cover-button"
                onClick={() => turnTo("contents")}
              >
                Open journal <ArrowRight size={17} />
              </Button>
              <div className="cover-rhythm-index" aria-label="Journal chapters">
                <span>01 Body</span>
                <span>02 Mind</span>
                <span>03 Life</span>
                <span>04 Growth</span>
                <span>05 Utilities</span>
              </div>
            </div>
          </section>
        );

      case "contents":
        return (
          <section
            className="journal-spread contents-spread"
            aria-labelledby="contents-title"
          >
            <div className="spread-page contents-intro">
              <JournalActions
                onContents={() => turnTo("contents", "backward")}
                onCover={() => turnTo("cover", "backward")}
              />
              <p className="page-kicker">your journal index</p>
              <h2 id="contents-title">
                Table of
                <br />
                <em>Contents</em>
              </h2>
              <p className="page-intro">
                Open a chapter, then choose where you would like to spend time.
                Each page keeps the journal in view while making the day easier
                to manage.
              </p>
              <div className="contents-art-mark">
                <Flower2 size={34} strokeWidth={1.5} />
              </div>
              <p className="contents-note">
                Tip: every chapter has a path back to here.
              </p>
            </div>
            <div className="spread-page contents-list">
              <div className="contents-list-heading">
                <span>chapters</span>
                <span>01 — 05</span>
              </div>
              {groups.map((group, index) => {
                const Icon = group.icon;
                const isOpen = expandedGroup === group.label;
                return (
                  <div
                    className={cn("contents-group", isOpen && "is-open")}
                    key={group.label}
                  >
                    <button
                      className="contents-group-trigger"
                      type="button"
                      onClick={() => {
                        const newGroup = isOpen ? "" : group.label;
                        setExpandedGroup(newGroup);
                        setContentsPreferences(prev => ({
                          ...prev,
                          expandedGroup: newGroup,
                        }));
                      }}
                      aria-expanded={isOpen}
                      onKeyDown={e => {
                        if (e.key === " " || e.key === "Enter") {
                          e.preventDefault();
                          const newGroup = isOpen ? "" : group.label;
                          setExpandedGroup(newGroup);
                          setContentsPreferences(prev => ({
                            ...prev,
                            expandedGroup: newGroup,
                          }));
                        }
                      }}
                    >
                      <span className="contents-number">0{index + 1}</span>
                      <span className="contents-group-title">
                        <Icon size={17} />
                        <span>
                          <b>{group.label}</b>
                          <small>{group.eyebrow}</small>
                        </span>
                      </span>
                      {isOpen ? (
                        <ChevronDown size={17} />
                      ) : (
                        <ChevronRight size={17} />
                      )}
                    </button>
                    <div className="contents-subtopics">
                      {group.items.map(item => (
                        <button
                          key={item.label}
                          type="button"
                          className={cn(
                            "contents-subtopic",
                            activePage === item.view && "is-current"
                          )}
                          onClick={() => selectContentsItem(item.view)}
                          aria-current={
                            activePage === item.view ? "page" : undefined
                          }
                        >
                          <span>
                            <b>{item.label}</b>
                            <small>{item.note}</small>
                          </span>
                          {activePage === item.view ? (
                            <CircleCheck size={15} />
                          ) : (
                            <ArrowRight size={15} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );

      case "dashboard":
        return (
          <section
            className="journal-spread dashboard-spread"
            aria-labelledby="dashboard-title"
          >
            <div className="spread-page dashboard-intro">
              <JournalActions
                onContents={() => turnTo("contents", "backward")}
                onCover={() => turnTo("cover", "backward")}
              />
              <p className="page-kicker">your day · dashboard</p>
              <h2 id="dashboard-title">
                Good morning,
                <br />
                <em>Glory.</em>
              </h2>
              <p className="page-intro">
                Today's focus and what needs your attention. Open any chapter to
                dive deeper.
              </p>
            </div>
            <div className="spread-page dashboard-content">
              <TodayPanel />
              <div className="dashboard-heading">
                <div>
                  <p>Your focus for today:</p>
                </div>
                <button
                  className="quick-add-button"
                  onClick={() =>
                    setQuickAddOpen(current =>
                      toggleQuickAddVisibility(current)
                    )
                  }
                  type="button"
                >
                  <Plus size={18} /> Quick add
                </button>
              </div>
              <div className="dashboard-grid">
                <article className="dashboard-card attention-card">
                  <span className="card-label">what needs attention</span>
                  <div className="attention-row">
                    <span className="priority-dot magenta" />
                    <div>
                      <b>Database assignment</b>
                      <small>Due tomorrow · 2 hours left</small>
                    </div>
                    <ArrowRight size={16} />
                  </div>
                  <div className="attention-row">
                    <span className="priority-dot gold" />
                    <div>
                      <b>Review study plan</b>
                      <small>Suggested before 6:00 PM</small>
                    </div>
                    <ArrowRight size={16} />
                  </div>
                </article>
                <article className="dashboard-card wellbeing-card">
                  <span className="card-label">how you are doing</span>
                  {privateMode || !showSensitiveSummaries ? (
                    <div className="dashboard-private-mask">
                      <HeartPulse size={20} />
                      <b>Sensitive summary hidden</b>
                      <small>
                        Open Privacy Controls to change this display choice.
                      </small>
                    </div>
                  ) : (
                    <>
                      <div className="wellbeing-orbit">
                        <span className="orbit-orb one" />
                        <span className="orbit-orb two" />
                        <span className="wellbeing-score">
                          74<small>steady</small>
                        </span>
                      </div>
                      <p>
                        Your sleep and study rhythm are holding steady this
                        week.
                      </p>
                    </>
                  )}
                </article>
                <article className="dashboard-card next-card">
                  <span className="card-label">your next best step</span>
                  <Target size={26} />
                  <h3>Start with a 25-minute assignment sprint.</h3>
                  <p>
                    It protects tomorrow’s deadline and leaves the evening open.
                  </p>
                  <button type="button" onClick={() => turnTo("assignments")}>
                    Open assignments <ArrowRight size={15} />
                  </button>
                </article>
                <article className="dashboard-card goals-card">
                  <span className="card-label">toward your goals</span>
                  <div className="goal-line">
                    <span>Learning</span>
                    <b>68%</b>
                  </div>
                  <div className="progress-track">
                    <i style={{ width: "68%" }} />
                  </div>
                  <div className="goal-line">
                    <span>Movement</span>
                    <b>42%</b>
                  </div>
                  <div className="progress-track">
                    <i className="pink" style={{ width: "42%" }} />
                  </div>
                </article>
                <article className="dashboard-card trends-card">
                  <span className="card-label">what’s changing</span>
                  {privateMode || !showSensitiveSummaries ? (
                    <div className="dashboard-private-mask compact">
                      <HeartPulse size={17} />
                      <b>Sensitive health trend hidden</b>
                      <small>Private mode is active.</small>
                    </div>
                  ) : (
                    <div className="trend-item">
                      <span className="trend-glyph up">↗</span>
                      <p>
                        <b>Sleep is 36 min steadier</b>
                        <small>than last week’s average</small>
                      </p>
                    </div>
                  )}
                  <div className="trend-item">
                    <span className="trend-glyph soft">~</span>
                    <p>
                      <b>Learning rhythm is building</b>
                      <small>4 focused sessions this week</small>
                    </p>
                  </div>
                </article>
              </div>
              <div className="dashboard-bottom-bar">
                <span>
                  Today’s pattern: your focus grows after a calm start.
                </span>
                <button type="button" onClick={() => turnTo("reflections")}>
                  Write reflection <NotebookPen size={15} />
                </button>
              </div>
            </div>
            {quickAddOpen && (
              <div
                className="quick-add-panel"
                role="dialog"
                aria-modal="true"
                aria-label="Quick add"
              >
                <button
                  className="quick-add-close"
                  onClick={() => setQuickAddOpen(false)}
                  aria-label="Close quick add"
                >
                  <X size={17} />
                </button>
                <p className="page-kicker">capture a moment</p>
                <h3>What would you like to add?</h3>
                <div className="quick-options">
                  {quickItems.map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setQuickAddOpen(false)}
                    >
                      {item}
                      <Plus size={15} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        );

      case "portraits":
        return (
          <AnnualPortraitPage
            onRecord={recordInsightActivity}
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );

      case "workouts":
        return (
          <WorkoutPage
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "assignments":
        return (
          <EnhancedAssignmentsPage
            onFocus={() => turnTo("studySessions")}
            onRecord={recordInsightActivity}
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "courses":
        return (
          <CourseWorkspacePage
            onFocus={() => turnTo("studySessions")}
            onAssignments={() => turnTo("assignments")}
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "exams":
        return (
          <ExamPlannerPage
            onFocus={() => turnTo("studySessions")}
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "studySessions":
        return (
          <StudyWorkbenchPage
            onRecord={(minutes, label) =>
              recordInsightActivity({
                module: "Study Sessions",
                amount: minutes,
                label,
              })
            }
            onAssignments={() => turnTo("assignments")}
            onCourses={() => turnTo("courses")}
            onExams={() => turnTo("exams")}
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "goals":
        return (
          <GoalsWorkspacePage
            onRecord={label =>
              recordInsightActivity({ module: "Goals", amount: 1, label })
            }
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
            onTasks={() => turnTo("tasks")}
            onLearning={() => turnTo("learning")}
            onStudy={() => turnTo("studySessions")}
            onTime={() => turnTo("time")}
          />
        );
      case "time":
        return (
          <TimePage
            onRecord={(minutes, label) =>
              recordInsightActivity({ module: "Time", amount: minutes, label })
            }
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "finances":
        return (
          <FinanceCashflowPage
            onRecord={label =>
              recordInsightActivity({ module: "Finances", amount: 1, label })
            }
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "documents":
        return (
          <DocumentRenewalPage
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "security":
        return (
          <SecurityReviewWorkspacePage
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "environment":
        return (
          <EnvironmentPage
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "purchases":
        return (
          <PurchasesPage
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "responsibilities":
        return (
          <ResponsibilitiesPage
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "career":
        return (
          <CareerPage
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "portfolio":
        return (
          <PortfolioPage
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "projects":
        return (
          <ProjectsPage
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "certifications":
        return (
          <CertificationsPage
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "cv":
        return (
          <CvPage
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "internships":
        return (
          <InternshipsPage
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "analytics":
        return (
          <AnalyticsPage
            activity={insightActivity}
            onOpenSource={destination => turnTo(destination)}
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "insights":
        return (
          <InsightsPage
            activity={insightActivity}
            onOpenSource={destination => turnTo(destination)}
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "recommendations":
        return (
          <RecommendationsPage
            activity={insightActivity}
            onOpenSource={destination => turnTo(destination)}
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "privacy":
        return (
          <PrivacyPage
            privateMode={privateMode}
            setPrivateMode={setPrivateMode}
            sensitiveSummaries={showSensitiveSummaries}
            setSensitiveSummaries={setShowSensitiveSummaries}
            previewMode={notificationPreviewMode}
            setPreviewMode={setNotificationPreviewMode}
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "notifications":
        return (
          <NotificationPreviewPage
            previewMode={notificationPreviewMode}
            preferences={reminderPreferences}
            setPreferences={setReminderPreferences}
            localReminders={localReminders}
            setLocalReminders={setLocalReminders}
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "integrations":
        return (
          <IntegrationsPage
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "exportData":
        return (
          <ExportPage
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "history":
        return (
          <HistoryPage
            activity={insightActivity}
            ownerKey={String(auth.user?.id ?? "guest")}
            privateMode={privateMode}
            showSensitiveSummaries={showSensitiveSummaries}
            onOpen={nextView => turnTo(nextView)}
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "social":
        return (
          <SocialLifePage
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "family":
        return (
          <FamilyPage
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "hobbies":
        return (
          <HobbiesPage
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "experiences":
        return (
          <ExperiencesPage
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "achievements":
        return (
          <AchievementsPage
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "personalGrowth":
        return (
          <PersonalGrowthPage
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "tasks":
        return (
          <TasksPage
            onRecord={recordInsightActivity}
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "wellbeing":
        return (
          <WellbeingPage
            onRecord={recordInsightActivity}
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "sleep":
        return (
          <SleepPage
            onRecord={recordInsightActivity}
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "habits":
        return (
          <HabitsPage
            onRecordHabit={label =>
              recordInsightActivity({ module: "Habits", amount: 1, label })
            }
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "productivity":
        return (
          <ProductivityPage
            onRecordSession={(minutes, label) =>
              recordInsightActivity({
                module: "Productivity",
                amount: minutes,
                label,
              })
            }
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "digitalLife":
        return (
          <DigitalLifePage
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "learning":
        return (
          <LearningWorkbenchPage
            onRecordPractice={(minutes, label) =>
              recordInsightActivity({
                module: "Learning",
                amount: minutes,
                label,
              })
            }
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "cycle":
        return (
          <CyclePage
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "nutrition":
        return (
          <NutritionPage
            onRecord={recordInsightActivity}
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "water":
        return (
          <WaterIntakePage
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "reflections":
        return (
          <ReflectionPage
            onRecordReflection={label =>
              recordInsightActivity({ module: "Reflections", amount: 1, label })
            }
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
          />
        );
      case "utilities":
        return (
          <UtilitiesPage
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
            onNavigate={destination => turnTo(destination)}
          />
        );
    }
  }

  return (
    <PixelsTrackerContext.Provider
      value={{ records: pixelRecords, update: updatePixels, set: setPixels }}
    >
      <ReminderPreviewContext.Provider value={notificationPreviewMode}>
        <main
          data-reminder-preview={notificationPreviewMode}
          className={cn(
            "journal-app",
            privateMode && "private-mode-active",
            !showSensitiveSummaries && "sensitive-summaries-hidden"
          )}
        >
          <div
            className={cn("journal-stage", view !== "cover" && "journal-open")}
            data-journal-view={view}
          >
            {renderPage()}
            {activePixelsTracker && (
              <div className="pixels-floating">
                <PixelsGrid tracker={activePixelsTracker} />
              </div>
            )}
            {isTurning && (
              <div
                className={cn(
                  "page-turn",
                  "whole-page-turn",
                  "page-flip",
                  turnDirection,
                  pageTurnDestinationClass(turnDestination)
                )}
                aria-label={`Turning ${turnDirection} through the journal`}
              >
                <div className="flip-r1">
                  <div className="flip-p1">
                    <div>
                      <div />
                    </div>
                  </div>
                </div>
                <div className="flip-p2">
                  <div />
                </div>
                <div className="flip-r3">
                  <div className="flip-p3">
                    <div>
                      <div />
                    </div>
                  </div>
                </div>
                <div className="flip-shadow">
                  <div className="flip-s3">
                    <div className="flip-sp3" />
                  </div>
                </div>
                <div className="flip-shadow flip-s4">
                  <div className="flip-s2">
                    <div className="flip-sp2" />
                  </div>
                </div>
              </div>
            )}
          </div>
          {reminderNotice && (
            <div className="local-reminder-alert" role="status">
              <span>{reminderNotice}</span>
              <button
                type="button"
                onClick={() => setReminderNotice(null)}
                aria-label="Dismiss reminder notice"
              >
                Dismiss
              </button>
            </div>
          )}
          {view !== "cover" && (
            <button
              className="mobile-journal-menu"
              type="button"
              onClick={() => setMobileContentsOpen(true)}
              aria-label="Open journal contents"
            >
              <Menu size={20} />
            </button>
          )}
          {mobileContentsOpen && (
            <div className="mobile-contents" role="dialog" aria-modal="true">
              <div className="mobile-contents-sheet">
                <button
                  onClick={() => setMobileContentsOpen(false)}
                  aria-label="Close contents"
                >
                  <X size={19} />
                </button>
                <p className="page-kicker">journal navigation</p>
                <h3>Choose a chapter</h3>
                {groups.map(group => (
                  <div className="mobile-chapter" key={group.label}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedGroup(
                          expandedGroup === group.label ? "" : group.label
                        )
                      }
                      className="mobile-group"
                    >
                      <span>{group.label}</span>
                      {expandedGroup === group.label ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </button>
                    {expandedGroup === group.label &&
                      group.items.map(item => (
                        <button
                          type="button"
                          onClick={() => selectContentsItem(item.view)}
                          className={cn(
                            "mobile-subtopic",
                            activePage === item.view && "is-current"
                          )}
                          key={item.label}
                        >
                          {item.label}
                          <ArrowRight size={14} />
                        </button>
                      ))}
                  </div>
                ))}
                <div className="mobile-utility-block">
                  <span>shared tools</span>
                  {utilityItems.map(({ label }) => (
                    <button
                      type="button"
                      onClick={() => selectContentsItem("utilities")}
                      className={cn(
                        "mobile-subtopic",
                        activePage === "utilities" && "is-current"
                      )}
                      key={label}
                    >
                      {label}
                      <ArrowRight size={14} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="chapter-marker" aria-live="polite">
            {activeLabel}
          </div>
        </main>
      </ReminderPreviewContext.Provider>
    </PixelsTrackerContext.Provider>
  );
}

function LegacyWorkoutPage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const workouts = [
    ["Bicycle crunches", "3 × 12", "Keep the twist slow and long."],
    ["Glute bridge", "3 × 15", "Press evenly through both feet."],
    ["Side plank reach", "2 × 30 sec", "Keep your shoulder stacked."],
  ];
  const completedCount = workouts.filter(([name]) => completed[name]).length;
  return (
    <section
      className="journal-spread workout-spread"
      aria-labelledby="workout-title"
    >
      <div className="spread-page workout-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <div className="editorial-contrast-panel">
          <p className="page-kicker">fitness · workout studio</p>
          <h2 id="workout-title">
            Move with
            <br />
            <em>intention</em>
          </h2>
          <p className="page-intro">
            A short lower-body and core flow for a stronger, steadier day.
          </p>
          <div className="workout-stat">
            <TimerReset size={18} />
            <span>
              <b>{completedCount}/3 moves complete</b>
              <small>18 minutes · gentle core focus</small>
            </span>
          </div>
          <Button className="ink-button">
            <Play size={15} fill="currentColor" /> Begin today’s flow
          </Button>
        </div>
      </div>
      <div className="spread-page exercise-list">
        <PixelsGrid tracker="movement" />
        <div className="exercise-list-heading">
          <span>today’s sequence</span>
          <span>{completedCount} of 03 complete</span>
        </div>
        {workouts.map(([name, amount, cue], index) => (
          <article
            className={cn("exercise-card", completed[name] && "is-complete")}
            key={name}
          >
            <div className={cn("exercise-loop", `loop-${index + 1}`)}>
              <span className="figure-head" />
              <span className="figure-body" />
              <i />
              <i />
            </div>
            <div>
              <span>{amount}</span>
              <h3>{name}</h3>
              <p>{cue}</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setCompleted(current => toggleNamedCompletion(current, name))
              }
              aria-label={`Mark ${name} complete`}
              aria-pressed={Boolean(completed[name])}
            >
              <CircleCheck size={19} />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function WorkoutMotionLoop({
  motion,
  paused,
  label,
}: {
  motion: WorkoutMotion;
  paused: boolean;
  label: string;
}) {
  return (
    <div
      className={cn(
        "workout-motion-demo",
        `motion-${motion}`,
        paused && "is-paused"
      )}
      role="img"
      aria-label={`${label} animated movement preview`}
    >
      <span className="motion-surface" />
      <span className="motion-head" />
      <span className="motion-torso" />
      <span className="motion-arm motion-arm-left" />
      <span className="motion-arm motion-arm-right" />
      <span className="motion-leg motion-leg-left" />
      <span className="motion-leg motion-leg-right" />
      <span className="motion-path" aria-hidden="true" />
    </div>
  );
}

function BasicCrunchesMotionDemo({
  paused,
  onTogglePause,
  onReplay,
}: {
  paused: boolean;
  onTogglePause: () => void;
  onReplay: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    syncPreference();
    mediaQuery.addEventListener("change", syncPreference);
    return () => mediaQuery.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused || prefersReducedMotion) {
      video.pause();
      return;
    }
    void video.play().catch(() => undefined);
  }, [paused, prefersReducedMotion]);

  const replay = () => {
    const video = videoRef.current;
    if (!video || prefersReducedMotion) return;
    video.currentTime = 0;
    onReplay();
    void video.play().catch(() => undefined);
  };

  const status = prefersReducedMotion
    ? "Reduced motion is on — the tabletop start position is shown."
    : paused
      ? "Demonstration paused."
      : "Demonstration playing.";

  return (
    <figure
      className="basic-crunches-demo"
      aria-label="Basic Crunches detailed character demonstration"
    >
      <div className="basic-crunches-media">
        <video
          ref={videoRef}
          className="basic-crunches-video"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster={detailedWorkoutDemoAssets.basicCrunchesStill}
          aria-describedby="basic-crunches-form-cue"
        >
          <source
            src={detailedWorkoutDemoAssets.basicCrunchesVideo}
            type="video/mp4"
          />
        </video>
        <img
          className="basic-crunches-still"
          src={detailedWorkoutDemoAssets.basicCrunchesStill}
          alt="Basic Crunches tabletop start position: knees and hips at right angles, shins parallel to the floor, hands light at the sides of the head."
        />
      </div>
      <figcaption>
        <span className="basic-crunches-label">
          Detailed demo · first exercise under review
        </span>
        <p id="basic-crunches-form-cue">
          Tabletop legs at 90° · controlled curl · full return
        </p>
        <p className="basic-crunches-status" aria-live="polite">
          {status}
        </p>
        {!prefersReducedMotion && (
          <div className="basic-crunches-controls">
            <button type="button" onClick={onTogglePause} aria-pressed={paused}>
              {paused ? "Play" : "Pause"}
            </button>
            <button type="button" onClick={replay}>
              Replay
            </button>
          </div>
        )}
      </figcaption>
    </figure>
  );
}

function WorkoutPage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  const pixelStore = useContext(PixelsTrackerContext);
  const [started, setStarted] = useState(false);
  const [routineId, setRoutineId] = useState<WorkoutRoutine["id"]>("core");
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [rest, setRest] = useState(45);
  const [effort, setEffort] = useState("Moderate");
  const [note, setNote] = useState("");
  const [motionPaused, setMotionPaused] = useState(false);
  const routine = workoutRoutineById(routineId);
  const completedCount = workoutCompletedCount(completed, routine);
  useMongoJournalScope({
    scope: "workout-studio",
    payload: { completed, routineId, effort },
    hydrate: payload => {
      if (payload.completed && typeof payload.completed === "object")
        setCompleted(payload.completed as Record<string, boolean>);
      if (
        typeof payload.routineId === "string" &&
        workoutRoutines.some(item => item.id === payload.routineId)
      )
        setRoutineId(payload.routineId as WorkoutRoutine["id"]);
      if (typeof payload.effort === "string") setEffort(payload.effort);
    },
  });
  return (
    <section
      className="journal-spread workout-spread"
      aria-labelledby="workout-title"
    >
      <div className="spread-page workout-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <div className="editorial-contrast-panel">
          <p className="page-kicker">fitness · workout studio</p>
          <h2 id="workout-title">
            Move with
            <br />
            <em>intention</em>
          </h2>
          <p className="page-intro">
            Original instructional motion previews for the routines you
            selected. Choose one sequence, move at a pace you control, and stop
            if a movement feels painful.
          </p>
          <div className="workout-stat">
            <TimerReset size={18} />
            <span>
              <b>
                {completedCount}/{routine.exercises.length} moves marked
                complete
              </b>
              <small>{routine.label} · local session record</small>
            </span>
          </div>
          <Button
            className="ink-button"
            type="button"
            onClick={() => setStarted(value => !value)}
          >
            <Play size={15} fill="currentColor" />{" "}
            {started ? "Session in progress" : "Begin selected routine"}
          </Button>
        </div>
      </div>
      <div className="spread-page exercise-list workout-library-page">
        <div
          className="workout-routine-tabs"
          role="tablist"
          aria-label="Workout categories"
        >
          {workoutRoutines.map(item => (
            <button
              type="button"
              role="tab"
              aria-selected={routineId === item.id}
              key={item.id}
              className={cn(routineId === item.id && "active")}
              onClick={() => {
                setRoutineId(item.id);
                setMotionPaused(false);
              }}
            >
              {item.label}
              <small>{item.exercises.length} moves</small>
            </button>
          ))}
        </div>
        <div className="workout-guidance">
          <div>
            <span>{routine.eyebrow}</span>
            <b>{routine.warmup}</b>
          </div>
          <div>
            <span>Rest between sets</span>
            <div className="rest-control">
              <button
                type="button"
                onClick={() => setRest(value => Math.max(15, value - 15))}
                aria-label="Reduce rest by 15 seconds"
              >
                −
              </button>
              <b>{rest}s</b>
              <button
                type="button"
                onClick={() => setRest(value => value + 15)}
                aria-label="Increase rest by 15 seconds"
              >
                +
              </button>
            </div>
          </div>
        </div>
        <div className="exercise-list-heading">
          <span>{routine.label}</span>
          <span>
            {completedCount} of {routine.exercises.length} complete
          </span>
        </div>
        <div className="motion-library-controls">
          <span>
            Workout Studio motion · {motionPaused ? "paused" : "playing"}
          </span>
          <button
            type="button"
            onClick={() => setMotionPaused(value => !value)}
          >
            {motionPaused ? "Play motion" : "Pause motion"}
          </button>
          <small>
            Detailed references now include the supplied Core demonstrations,
            Donkey Kicks, Donkey Kick Pulses, Garland Pose, both Seated Figure 4
            variations, Bow Pose, Lizard Pose Variation, Pigeon Pose, Head to
            Knee, and Quad Stretch. Later cards remain simplified previews and
            will be replaced one at a time after review.
          </small>
        </div>
        <div className="workout-exercise-grid">
          {routine.exercises.map(exercise => {
            const isDetailed = isDetailedWorkoutDemo(exercise.id);
            return (
              <article
                className={cn(
                  "exercise-card detailed studio-exercise-card",
                  isDetailed && "is-detailed-demo",
                  completed[exercise.id] && "is-complete"
                )}
                key={exercise.id}
              >
                {exercise.id === "donkey-kicks" ? (
                  <GluteDonkeyKicksMotionDemo
                    variant="donkey-kicks"
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "donkey-kick-pulses" ? (
                  <GluteDonkeyKicksMotionDemo
                    variant="donkey-kick-pulses"
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "fire-hydrants" ? (
                  <WorkoutVideoDemo
                    label="Fire Hydrants"
                    videoUrl={detailedWorkoutDemoAssets.fireHydrantsVideo}
                    posterUrl={detailedWorkoutDemoAssets.fireHydrantsStill}
                    alt="Fire Hydrants demonstration from a quadruped position, lifting one bent knee out to the side while keeping the torso steady."
                    formCue="Hands under shoulders · knee stays bent · lift to a comfortable side range · lower with control"
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "fire-hydrant-pulses" ? (
                  <WorkoutVideoDemo
                    label="Fire Hydrant Pulses"
                    videoUrl={detailedWorkoutDemoAssets.fireHydrantPulsesVideo}
                    posterUrl={detailedWorkoutDemoAssets.fireHydrantPulsesStill}
                    alt="Fire Hydrant Pulses demonstration from a quadruped position, making short pulses at the top of a bent-knee side lift."
                    formCue="Hands under shoulders · hold your chosen high point · small controlled pulses · no twisting"
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "side-lying-big-circles" ? (
                  <WorkoutVideoDemo
                    label="Side-Lying Big Circles"
                    videoUrl={
                      detailedWorkoutDemoAssets.sideLyingBigCirclesVideo
                    }
                    posterUrl={
                      detailedWorkoutDemoAssets.sideLyingBigCirclesStill
                    }
                    alt="Side-Lying Big Circles demonstration, lying on the side and tracing a large slow circle with the top leg."
                    formCue="Keep hips stacked · trace a large, slow circle · move at a pace you control"
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "side-lying-small-circles" ? (
                  <WorkoutVideoDemo
                    label="Side-Lying Small Circles"
                    videoUrl={
                      detailedWorkoutDemoAssets.sideLyingSmallCirclesVideo
                    }
                    posterUrl={
                      detailedWorkoutDemoAssets.sideLyingSmallCirclesStill
                    }
                    alt="Side-Lying Small Circles demonstration, lying on the side and tracing a small controlled circle with the top leg."
                    formCue="Keep hips stacked · trace a small, controlled circle · keep the motion steady"
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "toe-taps" ? (
                  <WorkoutVideoDemo
                    label="Toe Taps"
                    videoUrl={detailedWorkoutDemoAssets.toeTapsVideo}
                    posterUrl={detailedWorkoutDemoAssets.toeTapsStill}
                    alt="Toe Taps demonstration from a tabletop-legs position, tapping one toe down to the mat at a time and returning to tabletop."
                    formCue="Keep the low back neutral · tap one toe down at a time · return to tabletop with control"
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "butterfly-kicks" ? (
                  <WorkoutVideoDemo
                    label="Butterfly Kicks"
                    videoUrl={detailedWorkoutDemoAssets.butterflyKicksVideo}
                    posterUrl={detailedWorkoutDemoAssets.butterflyKicksStill}
                    alt="Butterfly Kicks demonstration lying on the back, using short quick up-and-down leg motions close to the floor."
                    formCue="Keep the legs long and close to the floor · small quick kicks · move at a pace you control"
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "basic-crunches" ? (
                  <BasicCrunchesMotionDemo
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "bicycle-kicks" ? (
                  <BicycleKicksMotionDemo
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "jack-knives" ? (
                  <JackKnivesMotionDemo
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "russian-twists" ? (
                  <RussianTwistsMotionDemo
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "bicycle-crunches" ? (
                  <BicycleCrunchesMotionDemo
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "leg-raises" ? (
                  <LegRaisesMotionDemo
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "single-leg-crunch" ? (
                  <SingleLegCrunchMotionDemo
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "scissor-kicks" ? (
                  <ScissorKicksMotionDemo
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "bicep-curl" ? (
                  <WorkoutVideoDemo
                    label="Bicep Curl"
                    videoUrl={detailedWorkoutDemoAssets.bicepCurlVideo}
                    posterUrl={detailedWorkoutDemoAssets.bicepCurlStill}
                    alt="Bicep Curl demonstration with elbows close to the sides and controlled dumbbell curl."
                    formCue="Keep elbows close · curl without swinging · lower slowly"
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "hammer-curl" ? (
                  <WorkoutVideoDemo
                    label="Hammer Curl"
                    videoUrl={detailedWorkoutDemoAssets.hammerCurlVideo}
                    posterUrl={detailedWorkoutDemoAssets.hammerCurlStill}
                    alt="Hammer Curl demonstration with neutral palms, close elbows, and controlled dumbbell curl."
                    formCue="Keep palms facing each other · elbows close · control the return"
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "concentration-curl" ? (
                  <WorkoutVideoDemo
                    label="Concentration Curl"
                    videoUrl={detailedWorkoutDemoAssets.concentrationCurlVideo}
                    posterUrl={detailedWorkoutDemoAssets.concentrationCurlStill}
                    alt="Concentration Curl demonstration seated with the upper arm braced against the inner thigh."
                    formCue="Brace the upper arm on the inner thigh · curl with control · lower slowly"
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "drag-curl" ? (
                  <WorkoutVideoDemo
                    label="Drag Curl"
                    videoUrl={detailedWorkoutDemoAssets.dragCurlVideo}
                    posterUrl={detailedWorkoutDemoAssets.dragCurlStill}
                    alt="Drag Curl demonstration lifting dumbbells upward close to the body with the elbows drawing gently back."
                    formCue="Keep weights close · let elbows travel gently back · lower with control"
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "zottman-curl" ? (
                  <WorkoutVideoDemo
                    label="Zottman Curl"
                    videoUrl={detailedWorkoutDemoAssets.zottmanCurlVideo}
                    posterUrl={detailedWorkoutDemoAssets.zottmanCurlStill}
                    alt="Zottman Curl demonstration curling with palms up, rotating the hands at the top, and lowering with palms turned down."
                    formCue="Curl with palms up · rotate palms down at the top · lower under control"
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "tricep-kickback" ? (
                  <WorkoutVideoDemo
                    label="Tricep Kickback"
                    videoUrl={detailedWorkoutDemoAssets.tricepKickbackVideo}
                    posterUrl={detailedWorkoutDemoAssets.tricepKickbackStill}
                    alt="Tricep Kickback demonstration hinged forward with elbows high and arms extending backward."
                    formCue="Hinge with a long back · keep upper arms still · extend without swinging"
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "overhead-extension" ? (
                  <WorkoutVideoDemo
                    label="Overhead Extension"
                    videoUrl={detailedWorkoutDemoAssets.overheadExtensionVideo}
                    posterUrl={detailedWorkoutDemoAssets.overheadExtensionStill}
                    alt="Overhead Extension demonstration lowering and raising a weight behind the head with elbows comfortably close."
                    formCue="Keep elbows comfortably in · lower behind the head · extend without arching"
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "skull-crusher" ? (
                  <WorkoutVideoDemo
                    label="Skull Crusher"
                    videoUrl={detailedWorkoutDemoAssets.skullCrusherVideo}
                    posterUrl={detailedWorkoutDemoAssets.skullCrusherStill}
                    alt="Skull Crusher demonstration lying back and bending only at the elbows to lower the weights with control."
                    formCue="Keep upper arms steady · bend only at the elbows · lower slowly"
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "dumbbell-row" ? (
                  <WorkoutVideoDemo
                    label="Dumbbell Row"
                    videoUrl={detailedWorkoutDemoAssets.dumbbellRowVideo}
                    posterUrl={detailedWorkoutDemoAssets.dumbbellRowStill}
                    alt="Dumbbell Row demonstration hinged forward with a long back and the weight pulled toward the hip."
                    formCue="Keep a long back · pull toward the hip · lower without twisting"
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "close-grip-press" ? (
                  <WorkoutVideoDemo
                    label="Close-Grip Press"
                    videoUrl={detailedWorkoutDemoAssets.closeGripPressVideo}
                    posterUrl={detailedWorkoutDemoAssets.closeGripPressStill}
                    alt="Close-Grip Press demonstration pressing weights with elbows kept close to the body."
                    formCue="Keep weights close · elbows in · press through a comfortable range"
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "reverse-fly" ? (
                  <WorkoutVideoDemo
                    label="Reverse Fly"
                    videoUrl={detailedWorkoutDemoAssets.reverseFlyVideo}
                    posterUrl={detailedWorkoutDemoAssets.reverseFlyStill}
                    alt="Reverse Fly demonstration hinged forward and opening the weights wide with controlled shoulders."
                    formCue="Hinge forward · open wide without shrugging · lower slowly"
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "lateral-raise" ? (
                  <WorkoutVideoDemo
                    label="Lateral Raise"
                    videoUrl={detailedWorkoutDemoAssets.lateralRaiseVideo}
                    posterUrl={detailedWorkoutDemoAssets.lateralRaiseStill}
                    alt="Lateral Raise demonstration lifting the weights out to a comfortable shoulder height and lowering with control."
                    formCue="Raise to a comfortable height · keep shoulders relaxed · lower slowly"
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "front-raise" ? (
                  <WorkoutVideoDemo
                    label="Front Raise"
                    videoUrl={detailedWorkoutDemoAssets.frontRaiseVideo}
                    posterUrl={detailedWorkoutDemoAssets.frontRaiseStill}
                    alt="Front Raise demonstration lifting dumbbells forward through a controlled shoulder range from the camera perspective."
                    formCue="Lift forward to a comfortable height · keep the shoulders relaxed · lower slowly"
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "shoulder-press" ? (
                  <WorkoutVideoDemo
                    className="back-video-demo"
                    label="Shoulder Press"
                    videoUrl={detailedWorkoutDemoAssets.shoulderPressVideo}
                    posterUrl={detailedWorkoutDemoAssets.shoulderPressStill}
                    alt="Shoulder Press demonstration starting at shoulder level and pressing the weights overhead through a comfortable range."
                    formCue="Start at shoulder level · press smoothly · avoid locking out forcefully"
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "arnold-press" ? (
                  <WorkoutVideoDemo
                    className="back-video-demo"
                    label="Arnold Press"
                    videoUrl={detailedWorkoutDemoAssets.arnoldPressVideo}
                    posterUrl={detailedWorkoutDemoAssets.arnoldPressStill}
                    alt="Arnold Press demonstration starting with palms facing in at shoulder height, rotating outward while pressing overhead."
                    formCue="Start palms-in at shoulder height · rotate out while pressing · lower with control"
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "wrist-curl" ? (
                  <WorkoutVideoDemo
                    label="Wrist Curl"
                    videoUrl={detailedWorkoutDemoAssets.wristCurlVideo}
                    posterUrl={detailedWorkoutDemoAssets.wristCurlStill}
                    alt="Seated Wrist Curl demonstration with the forearms supported and the dumbbells moved through the wrists only."
                    formCue="Rest forearms on thighs · move only through the wrists · lower under control"
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "band-upper-back-pull" ? (
                  <WorkoutVideoDemo
                    className="back-video-demo"
                    label="Resistance-Band Upper-Back Pull"
                    videoUrl={detailedWorkoutDemoAssets.bandUpperBackPullVideo}
                    posterUrl={detailedWorkoutDemoAssets.bandUpperBackPullStill}
                    alt="Resistance-band upper-back pull demonstration viewed from behind, drawing the band down with controlled shoulders and upper-back engagement."
                    formCue="Use a secure band setup · pull with the upper back · keep shoulders controlled"
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "dumbbell-lat-pull" ? (
                  <WorkoutVideoDemo
                    className="back-video-demo"
                    label="Dumbbell Lat Pull"
                    videoUrl={detailedWorkoutDemoAssets.dumbbellLatPullVideo}
                    posterUrl={detailedWorkoutDemoAssets.dumbbellLatPullStill}
                    alt="Dumbbell Lat Pull demonstration viewed from behind, using dumbbells through a controlled lat-focused pulling path toward the sides."
                    formCue="Keep ribs steady · pull dumbbells down and back · control the return through the shoulders"
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "behind-back-band-pull-apart" ? (
                  <WorkoutVideoDemo
                    className="back-video-demo"
                    label="Behind-the-Back Band Pull-Apart"
                    videoUrl={
                      detailedWorkoutDemoAssets.behindBackBandPullApartVideo
                    }
                    posterUrl={
                      detailedWorkoutDemoAssets.behindBackBandPullApartStill
                    }
                    alt="Behind-the-back resistance-band pull-apart demonstration viewed from behind, drawing the hands apart horizontally with a stable upright posture."
                    formCue="Stand tall · pull the band ends apart behind the back · keep shoulders relaxed"
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "standing-band-pull-apart" ? (
                  <WorkoutVideoDemo
                    className="back-video-demo"
                    label="Standing Band Pull-Apart"
                    videoUrl={
                      detailedWorkoutDemoAssets.standingBandPullApartVideo
                    }
                    posterUrl={
                      detailedWorkoutDemoAssets.standingBandPullApartStill
                    }
                    alt="Standing resistance-band pull-apart demonstration from the back, drawing the hands outward from in front of the body to engage the upper back and rear shoulders."
                    formCue="Hold at shoulder height · pull hands apart across the upper back · return without shrugging"
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "behind-neck-band-lat-pulldown" ? (
                  <WorkoutVideoDemo
                    className="back-video-demo"
                    label="Behind-the-Neck Band Lat Pulldown"
                    videoUrl={
                      detailedWorkoutDemoAssets.behindNeckBandLatPulldownVideo
                    }
                    posterUrl={
                      detailedWorkoutDemoAssets.behindNeckBandLatPulldownStill
                    }
                    alt="Standing behind-the-neck resistance-band lat pulldown demonstration from the back, driving the elbows down and back toward the sides."
                    formCue="Keep spine neutral · draw elbows down and back · use a comfortable range behind the neck"
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "dumbbell-round-the-world" ? (
                  <WorkoutVideoDemo
                    className="back-video-demo"
                    label="Dumbbell Round the World"
                    videoUrl={
                      detailedWorkoutDemoAssets.dumbbellRoundTheWorldVideo
                    }
                    posterUrl={
                      detailedWorkoutDemoAssets.dumbbellRoundTheWorldStill
                    }
                    alt="Dumbbell Round the World demonstration, tracing a slow wide circle around the head with a light dumbbell while keeping the shoulders steady."
                    formCue="Use a light weight · trace a slow, wide circle · keep shoulders steady throughout"
                    paused={motionPaused}
                    onTogglePause={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "toggle")
                      )
                    }
                    onReplay={() =>
                      setMotionPaused(value =>
                        detailedDemoPlaybackState(value, "replay")
                      )
                    }
                  />
                ) : exercise.id === "garland-pose" ? (
                  <YogaPoseArtworkDemo
                    className="garland-pose-demo"
                    label="Garland Pose"
                    imageUrl={detailedWorkoutDemoAssets.garlandPoseStill}
                    alt="Garland Pose artwork: a person in a supported wide squat with palms together at the chest."
                    formCue="Wide supported squat · palms together · keep the range comfortable"
                  />
                ) : exercise.id === "seated-figure-four-one" ? (
                  <YogaPoseArtworkDemo
                    className="seated-figure-four-demo"
                    label="Seated Figure 4 Variation"
                    imageUrl={detailedWorkoutDemoAssets.seatedFigureFourStill}
                    alt="Seated Figure 4 Variation artwork: a seated figure-four hip-opening position on a mat."
                    formCue="Sit tall · cross one ankle over the opposite thigh · breathe without forcing the hip"
                  />
                ) : exercise.id === "seated-figure-four-two" ? (
                  <YogaPoseArtworkDemo
                    className="seated-figure-four-fold-demo"
                    label="Seated Figure 4 Variation · Fold"
                    imageUrl={
                      detailedWorkoutDemoAssets.seatedFigureFourFoldStill
                    }
                    alt="Seated Figure 4 Variation fold artwork: a seated figure-four position with the torso folded gently over the crossed leg."
                    formCue="Support the seat · fold only within a comfortable range · breathe slowly"
                  />
                ) : exercise.id === "twisted-pigeon" ? (
                  <YogaPoseArtworkDemo
                    className="twisted-pigeon-demo"
                    label="Twisted Pigeon Pose"
                    imageUrl={detailedWorkoutDemoAssets.twistedPigeonStill}
                    alt="Twisted Pigeon Pose artwork: a seated figure with one leg folded in front, the other extended back, and the torso gently rotated."
                    formCue="Support the hips · rotate gently through the torso · avoid forcing the twist"
                  />
                ) : exercise.id === "bow-pose" ? (
                  <YogaPoseArtworkDemo
                    className="bow-pose-demo"
                    label="Bow Pose"
                    imageUrl={detailedWorkoutDemoAssets.bowPoseStill}
                    alt="Bow Pose artwork: a figure lying on the front, holding the ankles while lifting the chest and thighs from the mat."
                    formCue="Hold the ankles · lift chest and thighs gently · keep the breath steady"
                  />
                ) : exercise.id === "lizard" ? (
                  <YogaPoseArtworkDemo
                    className="lizard-pose-demo"
                    label="Lizard Pose Variation"
                    imageUrl={detailedWorkoutDemoAssets.lizardPoseStill}
                    alt="Lizard Pose Variation artwork: a figure in a low lunge supported on the forearms with the back leg extended behind."
                    formCue="Support on the forearms · keep the front knee comfortable · breathe steadily"
                  />
                ) : exercise.id === "pigeon" ? (
                  <YogaPoseArtworkDemo
                    className="pigeon-pose-demo"
                    label="Pigeon Pose"
                    imageUrl={detailedWorkoutDemoAssets.pigeonPoseStill}
                    alt="Pigeon Pose artwork: a figure in a supported hip-opening lunge with the front leg folded and the back leg extended."
                    formCue="Square the hips gently · support the front side · never force the range"
                  />
                ) : exercise.id === "head-to-knee" ? (
                  <YogaPoseArtworkDemo
                    className="head-to-knee-demo"
                    label="Head to Knee"
                    imageUrl={detailedWorkoutDemoAssets.headToKneeStill}
                    alt="Head to Knee artwork: a seated figure folds toward one extended leg while the opposite leg remains comfortably bent."
                    formCue="Extend one leg · keep the opposite knee comfortable · fold only as far as the breath stays easy"
                  />
                ) : exercise.id === "quad-stretch" ? (
                  <YogaPoseArtworkDemo
                    className="quad-stretch-demo"
                    label="Quad Stretch"
                    imageUrl={detailedWorkoutDemoAssets.quadStretchStill}
                    alt="Quad Stretch artwork: an upright supported kneeling lunge with one rear heel drawn gently toward the glute."
                    formCue="Keep the torso tall · draw one heel toward the glute · keep the front knee stacked over the ankle"
                  />
                ) : exercise.id === "frog-legs" ? (
                  <YogaPoseArtworkDemo
                    className="frog-legs-demo"
                    label="Frog Legs Pose"
                    imageUrl={detailedWorkoutDemoAssets.frogLegsStill}
                    alt="Frog Legs Pose artwork: a prone figure with both knees opened wide, shins bent backward, and heels turned inward toward the glutes."
                    formCue="Open the knees wide · turn both heels inward toward the glutes · keep the pelvis and chest comfortable"
                  />
                ) : exercise.id === "lotus-upward-dog" ? (
                  <YogaPoseArtworkDemo
                    className="lotus-upward-dog-demo"
                    label="Lotus in Upward Dog"
                    imageUrl={detailedWorkoutDemoAssets.lotusUpwardDogStill}
                    alt="Lotus in Upward Dog artwork: a prone figure lifts the chest gently with the legs extended behind and the feet resting comfortably."
                    formCue="Press through the hands · lift the chest gently · keep the backbend comfortable"
                  />
                ) : exercise.id === "happy-baby" ? (
                  <YogaPoseArtworkDemo
                    className="happy-baby-demo"
                    label="Happy Baby Pose"
                    imageUrl={detailedWorkoutDemoAssets.happyBabyStill}
                    alt="Happy Baby Pose artwork: a figure lies on the back with knees bent wide, legs lifted, and hands holding the feet."
                    formCue="Keep the low back comfortable · hold the feet gently · stay within a relaxed range"
                  />
                ) : exercise.id === "butterfly-pose" ? (
                  <YogaPoseArtworkDemo
                    className="butterfly-pose-demo"
                    label="Butterfly Pose"
                    imageUrl={detailedWorkoutDemoAssets.butterflyPoseStill}
                    alt="Butterfly Pose artwork: a seated figure folds forward with the soles of the feet together and knees opening outward."
                    formCue="Let the knees open naturally · keep the soles together · make the forward fold optional"
                  />
                ) : (
                  <WorkoutMotionLoop
                    motion={exercise.motion}
                    paused={motionPaused}
                    label={exercise.name}
                  />
                )}
                <div className="studio-exercise-copy">
                  <span>{exercise.target}</span>
                  <h3>{exercise.name}</h3>
                  <p>{exercise.cue}</p>
                  <button
                    type="button"
                    className="workout-complete-toggle"
                    onClick={() =>
                      setCompleted(current => ({
                        ...current,
                        [exercise.id]: !current[exercise.id],
                      }))
                    }
                    aria-pressed={Boolean(completed[exercise.id])}
                  >
                    {completed[exercise.id] ? <CircleCheck size={15} /> : null}
                    {completed[exercise.id]
                      ? "Marked complete"
                      : "Mark complete"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        <div className="workout-log">
          <div>
            <span>Cool down</span>
            <b>{routine.cooldown} Stop if movement feels painful.</b>
          </div>
          <label>
            Difficulty
            <select
              value={effort}
              onChange={event => setEffort(event.target.value)}
            >
              <option>Easy</option>
              <option>Moderate</option>
              <option>Challenging</option>
            </select>
          </label>
          <label>
            Session note
            <input
              value={note}
              onChange={event => setNote(event.target.value)}
              placeholder="Energy, form, or a small win"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setStarted(false);
              setNote("");
              const monthIndex = new Date().getMonth();
              const day = new Date().getDate();
              pixelStore?.set("movement", monthIndex, day, "#06b6d4");
            }}
          >
            Save local workout note
          </button>
        </div>
      </div>
    </section>
  );
}

function EnhancedAssignmentsPage({
  onContents,
  onCover,
  onRecord,
  onFocus,
}: {
  onContents: () => void;
  onCover: () => void;
  onRecord: (activity: Omit<InsightActivity, "id" | "createdAt">) => void;
  onFocus: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const emptyDraft = {
    title: "",
    subject: "",
    due: "",
    priority: "Medium" as AssignmentPlan["priority"],
    nextAction: "",
    startBy: "",
    effortMinutes: "45",
    notes: "",
    subtasks: [] as AssignmentPlan["subtasks"],
  };
  const [assignments, setAssignments] = useState<AssignmentPlan[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [showPlanning, setShowPlanning] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [lastAssignments, setLastAssignments] = useState<
    AssignmentPlan[] | null
  >(null);
  function cloneAssignments(items: AssignmentPlan[]) {
    return items.map(item => ({
      ...item,
      subtasks: item.subtasks.map(subtask => ({ ...subtask })),
    }));
  }
  function rememberAssignments() {
    setLastAssignments(cloneAssignments(assignments));
  }
  function undoLastAssignmentChange() {
    if (!lastAssignments) return;
    setAssignments(cloneAssignments(lastAssignments));
    setLastAssignments(null);
  }
  useMongoJournalScope({
    scope: "assignments",
    payload: { assignments },
    hydrate: payload => {
      if (Array.isArray(payload.assignments))
        setAssignments(payload.assignments as AssignmentPlan[]);
    },
  });
  const workload = assignmentWorkload(assignments, today);
  const activeAssignments = sortAssignmentsByDue(
    assignments.filter(item => !item.completed)
  );
  const completedAssignments = sortAssignmentsByDue(
    assignments.filter(item => item.completed)
  );
  function resetComposer() {
    setDraft(emptyDraft);
    setSubtaskDraft("");
    setFormOpen(false);
    setShowPlanning(false);
    setEditingId(null);
  }
  function addDraftSubtask() {
    const label = subtaskDraft.trim();
    if (!label) return;
    setDraft(current => ({
      ...current,
      subtasks: [
        ...current.subtasks,
        { id: `${Date.now()}-${label}`, label, done: false },
      ],
    }));
    setSubtaskDraft("");
  }
  function saveAssignment(event: React.FormEvent) {
    event.preventDefault();
    if (
      !draft.title.trim() ||
      !draft.subject.trim() ||
      !draft.due ||
      !draft.nextAction.trim()
    )
      return;
    const plan: AssignmentPlan = {
      id: editingId || `${Date.now()}-assignment`,
      title: draft.title.trim(),
      subject: draft.subject.trim(),
      notes: draft.notes.trim(),
      due: draft.due,
      priority: draft.priority,
      nextAction: draft.nextAction.trim(),
      startBy: draft.startBy,
      effortMinutes: Math.max(0, Number(draft.effortMinutes) || 0),
      subtasks: draft.subtasks,
      completed: editingId
        ? assignments.find(item => item.id === editingId)?.completed || false
        : false,
    };
    rememberAssignments();
    setAssignments(current =>
      editingId
        ? current.map(item => (item.id === editingId ? plan : item))
        : [...current, plan]
    );
    onRecord({
      module: "Assignments",
      amount: 1,
      label: `${plan.title} ${editingId ? "updated" : "created"}`,
    });
    resetComposer();
  }
  function beginEdit(assignment: AssignmentPlan) {
    setDraft({
      title: assignment.title,
      subject: assignment.subject,
      due: assignment.due,
      priority: assignment.priority,
      nextAction: assignment.nextAction,
      startBy: assignment.startBy,
      effortMinutes: String(assignment.effortMinutes),
      notes: assignment.notes,
      subtasks: assignment.subtasks,
    });
    setEditingId(assignment.id);
    setFormOpen(true);
    setShowPlanning(true);
  }
  function toggleSubtask(assignmentId: string, subtaskId: string) {
    rememberAssignments();
    setAssignments(current =>
      current.map(item =>
        item.id === assignmentId
          ? {
              ...item,
              subtasks: item.subtasks.map(subtask =>
                subtask.id === subtaskId
                  ? { ...subtask, done: !subtask.done }
                  : subtask
              ),
            }
          : item
      )
    );
  }
  function toggleComplete(assignmentId: string) {
    const assignment = assignments.find(item => item.id === assignmentId);
    rememberAssignments();
    setAssignments(current =>
      current.map(item =>
        item.id === assignmentId
          ? { ...item, completed: !item.completed }
          : item
      )
    );
    onRecord({
      module: "Assignments",
      amount: 1,
      label: `${assignment?.title || "Assignment"} ${assignment?.completed ? "reopened" : "completed"}`,
    });
  }
  function assignmentCard(assignment: AssignmentPlan) {
    const completeCount = assignment.subtasks.filter(item => item.done).length;
    return (
      <article
        className={cn(
          "assignment-plan-card",
          assignment.completed && "completed"
        )}
        key={assignment.id}
      >
        <div className="assignment-card-top">
          <div>
            <span
              className={cn(
                "assignment-due",
                assignmentDueStatus(assignment.due, today)
                  .toLowerCase()
                  .replaceAll(" ", "-")
              )}
            >
              {assignmentDueStatus(assignment.due, today)}
            </span>
            <b>{assignment.title}</b>
            <small>
              {assignment.subject} · due {assignment.due.replace("T", " at ")}
            </small>
          </div>
          <span
            className={cn(
              "assignment-priority",
              assignment.priority.toLowerCase()
            )}
          >
            {assignment.priority}
          </span>
        </div>
        <p>
          <strong>Next:</strong> {assignment.nextAction}
        </p>
        {assignment.notes ? (
          <small className="assignment-note">{assignment.notes}</small>
        ) : null}
        <div className="assignment-progress">
          <span>
            {completeCount} of {assignment.subtasks.length} steps done
          </span>
          <i>
            <b
              style={{
                width: `${assignment.subtasks.length ? (completeCount / assignment.subtasks.length) * 100 : 0}%`,
              }}
            />
          </i>
        </div>
        {assignment.subtasks.length ? (
          <div className="assignment-subtasks">
            {assignment.subtasks.map(subtask => (
              <button
                type="button"
                key={subtask.id}
                className={cn(subtask.done && "done")}
                onClick={() => toggleSubtask(assignment.id, subtask.id)}
              >
                {subtask.done ? "✓" : ""}
                <span>{subtask.label}</span>
              </button>
            ))}
          </div>
        ) : null}
        <div className="assignment-plan-meta">
          <span>
            {assignment.effortMinutes
              ? `${assignment.effortMinutes} min planned`
              : "No effort set"}
          </span>
          <span>
            {assignment.startBy
              ? `Start by ${assignment.startBy}`
              : "Choose a start date"}
          </span>
        </div>
        <div className="assignment-card-actions">
          <button type="button" onClick={() => beginEdit(assignment)}>
            Edit
          </button>
          <button type="button" onClick={() => toggleComplete(assignment.id)}>
            {assignment.completed ? "Reopen" : "Complete"}
          </button>
          {!assignment.completed ? (
            <button
              type="button"
              className="assignment-focus"
              onClick={onFocus}
            >
              Focus on next step
            </button>
          ) : null}
        </div>
      </article>
    );
  }
  return (
    <section
      className="journal-spread assignment-spread"
      aria-labelledby="assignment-title"
    >
      <div className="spread-page assignment-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">education · assignments</p>
        <h2 id="assignment-title">
          Make space for
          <br />
          <em>what matters.</em>
        </h2>
        <p className="page-intro">
          Deadlines stay visible, but never louder than they need to be.
        </p>
        <div className="assignment-quote">
          “One focused start changes the whole afternoon.”
        </div>
      </div>
      <div className="spread-page assignments-workflow">
        <section className="assignment-overview">
          <div>
            <span>Due next</span>
            <b>
              {activeAssignments.length} open assignment
              {activeAssignments.length === 1 ? "" : "s"}
            </b>
          </div>
          <p>
            {workload.dueThisWeek} due in the next 7 days ·{" "}
            {workload.effortMinutes} planned minutes
          </p>
          <span className="assignment-overview-actions">
            {lastAssignments ? (
              <button
                type="button"
                className="local-undo"
                onClick={undoLastAssignmentChange}
              >
                Undo last change
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                resetComposer();
                setFormOpen(true);
              }}
            >
              New assignment
            </button>
          </span>
        </section>
        {formOpen ? (
          <form className="assignment-composer" onSubmit={saveAssignment}>
            <div className="assignment-composer-heading">
              <span>
                {editingId ? "Edit assignment" : "Plan an assignment"}
              </span>
              <button type="button" onClick={resetComposer}>
                Close
              </button>
            </div>
            <div className="assignment-core-fields">
              <label>
                Assignment
                <input
                  required
                  value={draft.title}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Assignment title"
                />
              </label>
              <label>
                Course
                <input
                  required
                  value={draft.subject}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      subject: event.target.value,
                    }))
                  }
                  placeholder="Course or subject"
                />
              </label>
              <label>
                Due date & time
                <input
                  required
                  type="datetime-local"
                  value={draft.due}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      due: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Next action
                <input
                  required
                  value={draft.nextAction}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      nextAction: event.target.value,
                    }))
                  }
                  placeholder="Smallest useful step"
                />
              </label>
            </div>
            <button
              type="button"
              className="assignment-planning-toggle"
              onClick={() => setShowPlanning(current => !current)}
            >
              {showPlanning ? "Hide planning details" : "Add planning details"}
            </button>
            {showPlanning ? (
              <div className="assignment-planning-fields">
                <label>
                  Priority
                  <select
                    value={draft.priority}
                    onChange={event =>
                      setDraft(current => ({
                        ...current,
                        priority: event.target
                          .value as AssignmentPlan["priority"],
                      }))
                    }
                  >
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </label>
                <label>
                  Estimated minutes
                  <input
                    type="number"
                    min="0"
                    step="15"
                    value={draft.effortMinutes}
                    onChange={event =>
                      setDraft(current => ({
                        ...current,
                        effortMinutes: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Start by
                  <input
                    type="date"
                    value={draft.startBy}
                    onChange={event =>
                      setDraft(current => ({
                        ...current,
                        startBy: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Definition / notes
                  <textarea
                    value={draft.notes}
                    onChange={event =>
                      setDraft(current => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    placeholder="What would a good finished version look like?"
                  />
                </label>
                <div className="assignment-draft-subtasks">
                  <label>
                    Break it into steps
                    <input
                      value={subtaskDraft}
                      onChange={event => setSubtaskDraft(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addDraftSubtask();
                        }
                      }}
                      placeholder="Add a step"
                    />
                  </label>
                  <button type="button" onClick={addDraftSubtask}>
                    Add step
                  </button>
                  {draft.subtasks.map(subtask => (
                    <button
                      type="button"
                      key={subtask.id}
                      className="draft-step"
                      onClick={() =>
                        setDraft(current => ({
                          ...current,
                          subtasks: current.subtasks.filter(
                            item => item.id !== subtask.id
                          ),
                        }))
                      }
                    >
                      {subtask.label} <X size={12} />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="assignment-composer-actions">
              <button type="button" onClick={resetComposer}>
                Cancel
              </button>
              <Button type="submit" className="ink-button">
                Save assignment
              </Button>
            </div>
          </form>
        ) : null}
        <section className="assignment-active-list">
          {activeAssignments.length === 0 ? (
            <small>
              There are no open local assignments. Add one when a deadline needs
              a place to live.
            </small>
          ) : (
            activeAssignments.map(assignmentCard)
          )}
        </section>
        <section className="assignment-archive">
          <div>
            <span>Completed archive</span>
            <button
              type="button"
              onClick={() => setShowCompleted(current => !current)}
            >
              {showCompleted
                ? "Hide completed"
                : `${completedAssignments.length} completed`}
            </button>
          </div>
          {showCompleted ? (
            completedAssignments.length ? (
              completedAssignments.map(assignmentCard)
            ) : (
              <small>
                Completed assignments will gather here and can be reopened if
                needed.
              </small>
            )
          ) : null}
        </section>
      </div>
    </section>
  );
}

function AssignmentsPage({
  onContents,
  onCover,
  onRecord,
}: {
  onContents: () => void;
  onCover: () => void;
  onRecord: (activity: Omit<InsightActivity, "id" | "createdAt">) => void;
}) {
  type Assignment = {
    id: string;
    title: string;
    subject: string;
    notes: string;
    due: string;
    priority: "High" | "Medium" | "Low";
    subtasks: string[];
    reminder: string;
    completed: boolean;
  };
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    subject: "",
    notes: "",
    due: "",
    priority: "Medium" as Assignment["priority"],
    reminder: "1 day before",
    subtasks: [] as string[],
  });
  const [subtask, setSubtask] = useState("");
  const [lastAssignments, setLastAssignments] = useState<Assignment[] | null>(
    null
  );

  function addSubtask() {
    const trimmed = subtask.trim();
    if (!trimmed) return;
    setDraft(current => ({
      ...current,
      subtasks: [...current.subtasks, trimmed],
    }));
    setSubtask("");
  }

  function addAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.subject.trim() || !draft.due) return;
    const title = draft.title.trim();
    const subject = draft.subject.trim();
    setLastAssignments(assignments);
    setAssignments([
      ...assignments,
      { ...draft, id: `${Date.now()}`, title, subject, completed: false },
    ]);
    onRecord({ module: "Assignments", amount: 1, label: `${title} created` });
    setDraft({
      title: "",
      subject: "",
      notes: "",
      due: "",
      priority: "Medium",
      reminder: "1 day before",
      subtasks: [],
    });
    setFormOpen(false);
  }

  function toggleAssignment(id: string) {
    const assignment = assignments.find(item => item.id === id);
    setLastAssignments(assignments);
    setAssignments(
      assignments.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
    onRecord({
      module: "Assignments",
      amount: 1,
      label: `${assignment?.title || "Assignment"} ${assignment?.completed ? "reopened" : "completed"}`,
    });
  }
  return (
    <section
      className="journal-spread assignment-spread"
      aria-labelledby="assignment-title"
    >
      <div className="spread-page assignment-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">education · assignments</p>
        <h2 id="assignment-title">
          Make space for
          <br />
          <em>what matters.</em>
        </h2>
        <p className="page-intro">
          Deadlines stay visible, but never louder than they need to be.
        </p>
        <div className="assignment-quote">
          “One focused start changes the whole afternoon.”
        </div>
      </div>
      <div className="spread-page assignment-list">
        <div className="assignment-list-heading">
          <span>this week</span>
          <span>
            <button
              type="button"
              onClick={() => setFormOpen(current => !current)}
            >
              <Plus size={15} /> New assignment
            </button>
            {lastAssignments ? (
              <button
                type="button"
                className="local-undo"
                onClick={() => {
                  setAssignments(lastAssignments);
                  setLastAssignments(null);
                }}
              >
                Undo last
              </button>
            ) : null}
          </span>
        </div>
        {formOpen && (
          <form className="assignment-form" onSubmit={addAssignment}>
            <div className="assignment-form-grid">
              <label>
                Assignment
                <input
                  required
                  value={draft.title}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="e.g. Database design brief"
                />
              </label>
              <label>
                Subject
                <input
                  required
                  value={draft.subject}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      subject: event.target.value,
                    }))
                  }
                  placeholder="Course or subject"
                />
              </label>
              <label>
                Due date & time
                <input
                  required
                  type="datetime-local"
                  value={draft.due}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      due: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Priority
                <select
                  value={draft.priority}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      priority: event.target.value as Assignment["priority"],
                    }))
                  }
                >
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </label>
            </div>
            <label className="full-field">
              Notes
              <textarea
                value={draft.notes}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="What does a good finished version look like?"
              />
            </label>
            <div className="assignment-form-grid">
              <label>
                Reminder
                <select
                  value={draft.reminder}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      reminder: event.target.value,
                    }))
                  }
                >
                  <option>1 week before</option>
                  <option>3 days before</option>
                  <option>1 day before</option>
                  <option>Morning of</option>
                </select>
              </label>
              <label>
                Subtask
                <input
                  value={subtask}
                  onChange={event => setSubtask(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addSubtask();
                    }
                  }}
                  placeholder="Add a step"
                />
              </label>
            </div>
            <div className="subtask-pills">
              {draft.subtasks.map(item => (
                <button
                  type="button"
                  key={item}
                  onClick={() =>
                    setDraft(current => ({
                      ...current,
                      subtasks: current.subtasks.filter(
                        subtaskItem => subtaskItem !== item
                      ),
                    }))
                  }
                >
                  {item}
                  <X size={12} />
                </button>
              ))}
              <button
                type="button"
                className="add-subtask"
                onClick={addSubtask}
              >
                Add subtask
              </button>
            </div>
            <div className="assignment-form-actions">
              <button type="button" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <Button type="submit" className="ink-button">
                Save assignment
              </Button>
            </div>
          </form>
        )}
        {assignments.map(assignment => (
          <article
            className={cn(
              "assignment-row detailed",
              assignment.completed && "is-complete"
            )}
            key={assignment.id}
          >
            <button
              type="button"
              onClick={() => toggleAssignment(assignment.id)}
              className="check-ring"
              aria-label={`Complete ${assignment.title}`}
              aria-pressed={assignment.completed}
            >
              {assignment.completed && <CircleCheck size={16} />}
            </button>
            <div>
              <b>{assignment.title}</b>
              <small>
                {assignment.subject} · {assignment.due.replace("T", " at ")}
              </small>
              <p>{assignment.notes}</p>
              <div className="assignment-meta">
                <span>{assignment.subtasks.length} subtasks</span>
                <span>Remind {assignment.reminder}</span>
              </div>
            </div>
            <span className={cn("due-tag", assignment.priority.toLowerCase())}>
              {assignment.priority}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}

function LearningPage({
  onContents,
  onCover,
  onRecordPractice,
}: {
  onContents: () => void;
  onCover: () => void;
  onRecordPractice: (minutes: number, label: string) => void;
}) {
  const pixelStore = useContext(PixelsTrackerContext);
  type PracticeEntry = { date: string; minutes: number; note: string };
  type Skill = {
    id: string;
    name: string;
    goal: string;
    level: string;
    progress: number;
    color: string;
    milestone: string;
    practice: number;
    resources: string;
    notes: string;
    logs: PracticeEntry[];
  };
  const [skills, setSkills] = useState<Skill[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    goal: "",
    level: "Beginner",
    milestone: "",
    resources: "",
    notes: "",
  });
  const [progressView, setProgressView] = useState<
    "percentage" | "level" | "milestone"
  >("percentage");
  const [activeLog, setActiveLog] = useState<string | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [logDraft, setLogDraft] = useState({
    date: new Date().toISOString().slice(0, 10),
    minutes: "25",
    note: "",
  });
  function addSkill(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim()) return;
    setSkills(current => [
      ...current,
      {
        id: `${Date.now()}`,
        ...draft,
        name: draft.name.trim(),
        progress: 0,
        color: ["#d238a4", "#1987b9", "#f1b633", "#5ca99d"][current.length % 4],
        practice: 0,
        logs: [],
      },
    ]);
    setDraft({
      name: "",
      goal: "",
      level: "Beginner",
      milestone: "",
      resources: "",
      notes: "",
    });
    setFormOpen(false);
  }
  function savePractice(skillId: string) {
    const minutes = Math.max(1, Number(logDraft.minutes) || 0);
    const skill = skills.find(item => item.id === skillId);
    setSkills(current =>
      current.map(item =>
        item.id === skillId
          ? addPracticeSession(item, {
              date: logDraft.date || new Date().toISOString().slice(0, 10),
              minutes,
              note: logDraft.note || "Focused practice session.",
            })
          : item
      )
    );
    onRecordPractice(
      minutes,
      skill ? `${skill.name} practice` : "Learning practice"
    );
    setLogDraft({
      date: new Date().toISOString().slice(0, 10),
      minutes: "25",
      note: "",
    });
    setActiveLog(null);
    setExpandedHistory(skillId);
    const monthIndex = new Date().getMonth();
    const day = new Date().getDate();
    pixelStore?.set("learning", monthIndex, day, "#8b5cf6");
  }
  return (
    <section
      className="journal-spread learning-spread"
      aria-labelledby="learning-title"
    >
      <div className="spread-page learning-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">growth · learning something new</p>
        <h2 id="learning-title">
          Your curiosity
          <br />
          <em>has a home.</em>
        </h2>
        <p className="page-intro">
          Every skill has its own path, its own pace, and its own reasons for
          mattering.
        </p>
        <button
          className="ink-button add-skill"
          type="button"
          onClick={() => setFormOpen(current => !current)}
        >
          <Plus size={15} /> Add a skill
        </button>
        <div className="learning-overview">
          <span>{skills.length} active skills</span>
          <b>
            {skills.reduce((total, skill) => total + skill.practice, 0)}{" "}
            practice logs
          </b>
        </div>
        <div
          className="learning-view-switch"
          role="group"
          aria-label="Learning progress view"
        >
          {(["percentage", "level", "milestone"] as const).map(option => (
            <button
              type="button"
              key={option}
              onClick={() => setProgressView(option)}
              className={cn(progressView === option && "active")}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <div className="spread-page skill-list">
        {formOpen && (
          <form className="learning-form" onSubmit={addSkill}>
            <div>
              <label>
                Skill
                <input
                  required
                  value={draft.name}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="What are you learning?"
                />
              </label>
              <label>
                Level
                <select
                  value={draft.level}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      level: event.target.value,
                    }))
                  }
                >
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </label>
            </div>
            <label>
              Goal
              <input
                value={draft.goal}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    goal: event.target.value,
                  }))
                }
                placeholder="What does progress mean to you?"
              />
            </label>
            <label>
              Next milestone
              <input
                value={draft.milestone}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    milestone: event.target.value,
                  }))
                }
                placeholder="A small next step"
              />
            </label>
            <label>
              Resources
              <textarea
                value={draft.resources}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    resources: event.target.value,
                  }))
                }
                placeholder="Links, books, courses, or people"
              />
            </label>
            <label>
              Notes
              <textarea
                value={draft.notes}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="Anything you want to remember"
              />
            </label>
            <div className="learning-form-actions">
              <button type="button" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <Button type="submit" className="ink-button">
                Save skill
              </Button>
            </div>
          </form>
        )}
        {skills.map(skill => (
          <article className="skill-card detailed" key={skill.id}>
            <div className="skill-symbol" style={{ background: skill.color }}>
              <Sparkles size={18} />
            </div>
            <div className="skill-body">
              <span>
                {skill.level} · {skill.goal || "Personal learning path"}
              </span>
              <h3>{skill.name}</h3>
              {progressView === "percentage" && (
                <>
                  <div className="skill-progress">
                    <i
                      style={{
                        width: `${skill.progress}%`,
                        background: skill.color,
                      }}
                    />
                  </div>
                  <small>
                    {skill.progress}% complete · {skill.logs.length} logged
                    sessions
                  </small>
                </>
              )}
              {progressView === "level" && (
                <div className="learning-view-readout">
                  <b>{skill.level} stage</b>
                  <small>
                    {skill.practice} practice logs supporting your next level
                  </small>
                </div>
              )}
              {progressView === "milestone" && (
                <div className="learning-view-readout">
                  <b>Next milestone</b>
                  <small>{skill.milestone || "Set a milestone"}</small>
                </div>
              )}
              <div className="skill-details">
                <b>Next: {skill.milestone || "Set a milestone"}</b>
                <small>Resources: {skill.resources || "Add resources"}</small>
                <small>Notes: {skill.notes || "Add a note"}</small>
              </div>
              <div className="practice-history">
                <span>
                  {expandedHistory === skill.id
                    ? "Full practice history"
                    : "Recent practice"}
                </span>
                {skill.logs
                  .slice(
                    0,
                    expandedHistory === skill.id ? skill.logs.length : 2
                  )
                  .map((entry, index) => (
                    <p key={`${entry.date}-${index}`}>
                      <b>
                        {entry.date} · {entry.minutes} min
                      </b>
                      <small>{entry.note}</small>
                    </p>
                  ))}
                {skill.logs.length > 2 && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedHistory(current =>
                        current === skill.id ? null : skill.id
                      )
                    }
                  >
                    {expandedHistory === skill.id
                      ? "Show recent"
                      : `View all ${skill.logs.length} sessions`}
                  </button>
                )}
              </div>
            </div>
            {activeLog === skill.id ? (
              <div className="practice-log-form">
                <label>
                  Date
                  <input
                    type="date"
                    value={logDraft.date}
                    onChange={event =>
                      setLogDraft(current => ({
                        ...current,
                        date: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Minutes
                  <input
                    type="number"
                    min="1"
                    value={logDraft.minutes}
                    onChange={event =>
                      setLogDraft(current => ({
                        ...current,
                        minutes: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Session note
                  <input
                    value={logDraft.note}
                    onChange={event =>
                      setLogDraft(current => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                    placeholder="What did you practice?"
                  />
                </label>
                <div>
                  <button type="button" onClick={() => setActiveLog(null)}>
                    Cancel
                  </button>
                  <button type="button" onClick={() => savePractice(skill.id)}>
                    Save log
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="practice-button"
                onClick={() => setActiveLog(skill.id)}
              >
                Log practice
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function LearningWorkbenchPage({
  onContents,
  onCover,
  onRecordPractice,
}: {
  onContents: () => void;
  onCover: () => void;
  onRecordPractice: (minutes: number, label: string) => void;
}) {
  type PracticeEntry = { date: string; minutes: number; note: string };
  type Skill = {
    id: string;
    name: string;
    goal: string;
    level: string;
    progress: number;
    color: string;
    milestone: string;
    practice: number;
    resources: string;
    notes: string;
    logs: PracticeEntry[];
  };
  const [skills, setSkills] = useState<Skill[]>([]);
  const [activeSkillId, setActiveSkillId] = useState("javascript");
  const [skillFormOpen, setSkillFormOpen] = useState(false);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  useMongoJournalScope({
    scope: "learning",
    payload: { skills, activeSkillId },
    hydrate: payload => {
      if (Array.isArray(payload.skills)) setSkills(payload.skills as Skill[]);
      if (typeof payload.activeSkillId === "string")
        setActiveSkillId(payload.activeSkillId);
    },
  });
  const [form, setForm] = useState({
    name: "",
    goal: "",
    level: "Beginner",
    milestone: "",
    resources: "",
    notes: "",
  });
  const [logDraft, setLogDraft] = useState({
    date: new Date().toISOString().slice(0, 10),
    minutes: "25",
    note: "",
  });
  const activeSkill =
    skills.find(skill => skill.id === activeSkillId) || skills[0];
  const summary = useMemo(() => learningPracticeSummary(skills), [skills]);
  const recentlyPractised = useMemo(() => mostRecentPractice(skills), [skills]);
  function resetForm() {
    setEditingSkillId(null);
    setForm({
      name: "",
      goal: "",
      level: "Beginner",
      milestone: "",
      resources: "",
      notes: "",
    });
    setSkillFormOpen(false);
  }
  function saveSkill(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return;
    const colour = ["#d238a4", "#1987b9", "#f1b633", "#5ca99d"][
      skills.length % 4
    ];
    if (editingSkillId)
      setSkills(current =>
        current.map(skill =>
          skill.id === editingSkillId
            ? { ...skill, ...form, name: form.name.trim() }
            : skill
        )
      );
    else {
      const id = `${Date.now()}-skill`;
      setSkills(current => [
        ...current,
        {
          id,
          ...form,
          name: form.name.trim(),
          progress: 0,
          color: colour,
          practice: 0,
          logs: [],
        },
      ]);
      setActiveSkillId(id);
    }
    resetForm();
  }
  function editSkill(skill: Skill) {
    setEditingSkillId(skill.id);
    setForm({
      name: skill.name,
      goal: skill.goal,
      level: skill.level,
      milestone: skill.milestone,
      resources: skill.resources,
      notes: skill.notes,
    });
    setSkillFormOpen(true);
  }
  function savePractice() {
    if (!activeSkill) return;
    const minutes = Math.max(1, Number(logDraft.minutes) || 0);
    const entry = {
      date: logDraft.date || new Date().toISOString().slice(0, 10),
      minutes,
      note: logDraft.note.trim() || "Focused practice session.",
    };
    setSkills(current =>
      current.map(skill =>
        skill.id === activeSkill.id ? addPracticeSession(skill, entry) : skill
      )
    );
    onRecordPractice(minutes, `${activeSkill.name} practice`);
    setLogDraft({
      date: new Date().toISOString().slice(0, 10),
      minutes: "25",
      note: "",
    });
    setLogOpen(false);
    setHistoryOpen(true);
  }
  function updateProgress(value: number) {
    if (!activeSkill) return;
    setSkills(current =>
      current.map(skill =>
        skill.id === activeSkill.id ? { ...skill, progress: value } : skill
      )
    );
  }
  return (
    <section
      className="journal-spread learning-spread"
      aria-labelledby="learning-title"
    >
      <div className="spread-page learning-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">growth · learning something new</p>
        <h2 id="learning-title">
          Your curiosity
          <br />
          <em>has a home.</em>
        </h2>
        <p className="page-intro">
          Every skill has its own path, pace, and reason for mattering. Keep the
          next small practice clear without copying a course platform.
        </p>
        <div className="learning-intro-note">
          <Sparkles size={15} />
          <span>
            Local practice record · no lesson imports or pressure streaks
          </span>
        </div>
      </div>
      <div className="spread-page learning-workbench">
        <section className="learning-today-summary">
          <div>
            <span>Practice, factually</span>
            <b>{summary.todayMinutes} min today</b>
          </div>
          <p>
            <strong>This week:</strong> {summary.weekMinutes} minutes ·{" "}
            <strong>All local records:</strong> {summary.sessions} sessions
          </p>
          <small>
            {recentlyPractised
              ? `Most recent: ${recentlyPractised.name}`
              : "Choose a skill to begin."}
          </small>
        </section>
        <section className="learning-skill-chooser">
          <div>
            <span>Your skills</span>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setSkillFormOpen(current => !current);
              }}
            >
              <Plus size={13} /> Add skill
            </button>
          </div>
          <div className="learning-skill-tabs">
            {skills.map(skill => (
              <button
                type="button"
                key={skill.id}
                className={cn(activeSkill?.id === skill.id && "active")}
                onClick={() => {
                  setActiveSkillId(skill.id);
                  setLogOpen(false);
                }}
              >
                <i style={{ background: skill.color }} />
                <span>
                  <b>{skill.name}</b>
                  <small>
                    {skill.progress}% · {skill.level}
                  </small>
                </span>
              </button>
            ))}
          </div>
        </section>
        {skillFormOpen ? (
          <section className="learning-skill-form">
            <div>
              <span>
                {editingSkillId ? "Edit local skill" : "Add local skill"}
              </span>
              <button type="button" onClick={resetForm}>
                Cancel
              </button>
            </div>
            <form onSubmit={saveSkill}>
              <div className="learning-form-grid">
                <label>
                  Skill
                  <input
                    required
                    value={form.name}
                    onChange={event =>
                      setForm(current => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="What are you learning?"
                  />
                </label>
                <label>
                  Stage
                  <select
                    value={form.level}
                    onChange={event =>
                      setForm(current => ({
                        ...current,
                        level: event.target.value,
                      }))
                    }
                  >
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </label>
              </div>
              <input
                value={form.goal}
                onChange={event =>
                  setForm(current => ({ ...current, goal: event.target.value }))
                }
                placeholder="What does progress mean to you?"
              />
              <input
                value={form.milestone}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    milestone: event.target.value,
                  }))
                }
                placeholder="Smallest next practice or milestone"
              />
              <input
                value={form.resources}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    resources: event.target.value,
                  }))
                }
                placeholder="Optional resource or material"
              />
              <input
                value={form.notes}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="Optional note"
              />
              <button type="submit">
                {editingSkillId ? "Save changes" : "Add skill"}
              </button>
            </form>
          </section>
        ) : null}
        {activeSkill ? (
          <>
            <section className="learning-active-skill">
              <div className="learning-active-heading">
                <i style={{ background: activeSkill.color }}>
                  <Sparkles size={15} />
                </i>
                <div>
                  <span>Current practice</span>
                  <h3>{activeSkill.name}</h3>
                  <small>
                    {activeSkill.level} ·{" "}
                    {activeSkill.goal || "Personal learning path"}
                  </small>
                </div>
                <button type="button" onClick={() => editSkill(activeSkill)}>
                  Edit
                </button>
              </div>
              <div className="learning-next-action">
                <span>Smallest next action</span>
                <b>
                  {activeSkill.milestone || "Name one practical next action"}
                </b>
                <small>
                  {activeSkill.resources
                    ? `Material: ${activeSkill.resources}`
                    : "Add a material only if it helps."}
                </small>
              </div>
              <div className="learning-progress-control">
                <div>
                  <span>Progress, as you define it</span>
                  <b>{activeSkill.progress}%</b>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={activeSkill.progress}
                  onChange={event => updateProgress(Number(event.target.value))}
                  style={{ accentColor: activeSkill.color }}
                />
                <small>
                  This is your own progress estimate—not a prediction or course
                  score.
                </small>
              </div>
            </section>
            <section className="learning-practice-session">
              <div>
                <span>Record a practice session</span>
                <b>
                  {logOpen ? "Details ready" : "One small session is enough"}
                </b>
              </div>
              {logOpen ? (
                <div className="learning-log-form">
                  <label>
                    Date
                    <input
                      type="date"
                      value={logDraft.date}
                      onChange={event =>
                        setLogDraft(current => ({
                          ...current,
                          date: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Minutes
                    <input
                      type="number"
                      min="1"
                      value={logDraft.minutes}
                      onChange={event =>
                        setLogDraft(current => ({
                          ...current,
                          minutes: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <input
                    value={logDraft.note}
                    onChange={event =>
                      setLogDraft(current => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                    placeholder="What did you practice?"
                  />
                  <div>
                    <button type="button" onClick={() => setLogOpen(false)}>
                      Cancel
                    </button>
                    <button type="button" onClick={savePractice}>
                      Save local practice
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setLogOpen(true)}>
                  Log practice
                </button>
              )}
            </section>
            <section className="learning-history">
              <div>
                <span>Recent practice</span>
                <button
                  type="button"
                  onClick={() => setHistoryOpen(current => !current)}
                >
                  {historyOpen
                    ? "Show less"
                    : `View all ${activeSkill.logs.length}`}
                </button>
              </div>
              {activeSkill.logs.length ? (
                activeSkill.logs
                  .slice(0, historyOpen ? activeSkill.logs.length : 3)
                  .map((entry, index) => (
                    <article key={`${entry.date}-${index}`}>
                      <b>
                        {entry.date} · {entry.minutes} min
                      </b>
                      <small>{entry.note}</small>
                    </article>
                  ))
              ) : (
                <small>Your local practice notes will appear here.</small>
              )}
            </section>
          </>
        ) : null}
        <section className="learning-year">
          <div>
            <span>Year in practice</span>
            <b>Optional consistency record</b>
          </div>
          <p>
            Choose a colour and mark the days you practised. It is a factual
            record, not a streak to protect.
          </p>
          <PixelsGrid tracker="learning" />
        </section>
      </div>
    </section>
  );
}

function PersonalGrowthPage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  type GrowthEntry = {
    value: string;
    area: string;
    practice: string;
    reflection: string;
    nextStep: string;
  };
  const [entries, setEntries] = useState<GrowthEntry[]>([]);
  const [draft, setDraft] = useState<GrowthEntry>({
    value: "",
    area: "",
    practice: "",
    reflection: "",
    nextStep: "",
  });
  useMongoJournalScope({
    scope: "personal-growth",
    payload: { entries },
    hydrate: payload => {
      if (Array.isArray(payload.entries))
        setEntries(payload.entries as GrowthEntry[]);
    },
  });
  function addEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.value.trim() && !draft.area.trim()) return;
    setEntries(current => [
      { ...draft, value: draft.value.trim(), area: draft.area.trim() },
      ...current,
    ]);
    setDraft({
      value: "",
      area: "",
      practice: "",
      reflection: "",
      nextStep: "",
    });
  }
  return (
    <section
      className="journal-spread growth-spread"
      aria-labelledby="growth-title"
    >
      <div className="spread-page growth-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">goals & growth · personal growth</p>
        <h2 id="growth-title">
          Grow in a way
          <br />
          <em>that feels like you.</em>
        </h2>
        <p className="page-intro">
          Come back to the values you want to live by, notice a growth edge, and
          choose a practice or next step that meets you where you are.
        </p>
        <div className="growth-spark">
          <Sparkles size={15} />
          <span>{entries.length} growth notes held</span>
        </div>
      </div>
      <div className="spread-page growth-page">
        <form className="growth-form" onSubmit={addEntry}>
          <label>
            Value you want to live by
            <input
              value={draft.value}
              onChange={event =>
                setDraft(current => ({ ...current, value: event.target.value }))
              }
              placeholder="e.g. Courage, steadiness, generosity"
            />
          </label>
          <label>
            Growth area
            <input
              value={draft.area}
              onChange={event =>
                setDraft(current => ({ ...current, area: event.target.value }))
              }
              placeholder="What are you exploring or strengthening?"
            />
          </label>
          <label>
            Supportive practice
            <input
              value={draft.practice}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  practice: event.target.value,
                }))
              }
              placeholder="A small action that would help"
            />
          </label>
          <label>
            Reflection
            <input
              value={draft.reflection}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  reflection: event.target.value,
                }))
              }
              placeholder="What are you noticing?"
            />
          </label>
          <label>
            Gentle next step
            <input
              value={draft.nextStep}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  nextStep: event.target.value,
                }))
              }
              placeholder="Keep it small and possible"
            />
          </label>
          <Button type="submit" className="ink-button">
            <Plus size={15} /> Save growth note
          </Button>
        </form>
        <div className="growth-list">
          <div>
            <span>becoming notebook</span>
            <b>{entries.length} notes</b>
          </div>
          {entries.length === 0 ? (
            <small>
              Start with a value or area of growth that you would like to meet
              with more curiosity.
            </small>
          ) : (
            entries.map((entry, index) => (
              <article key={`${entry.value}-${entry.area}-${index}`}>
                <i>{(entry.value || entry.area).slice(0, 1)}</i>
                <p>
                  <b>{entry.value || "Growth note"}</b>
                  <small>{entry.area || "Area to be named"}</small>
                  <em>
                    Practice: {entry.practice || "Add a supportive practice"}
                  </em>
                  <em>
                    Reflection: {entry.reflection || "Add what you notice"}
                  </em>
                  <em>Next: {entry.nextStep || "Choose your next step"}</em>
                </p>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function AchievementsPage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  type Achievement = {
    title: string;
    date: string;
    evidence: string;
    gratitude: string;
    meaning: string;
  };
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [draft, setDraft] = useState<Achievement>({
    title: "",
    date: new Date().toISOString().slice(0, 10),
    evidence: "",
    gratitude: "",
    meaning: "",
  });
  useMongoJournalScope({
    scope: "achievements",
    payload: { achievements },
    hydrate: payload => {
      if (Array.isArray(payload.achievements))
        setAchievements(payload.achievements as Achievement[]);
    },
  });
  function addAchievement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    setAchievements(current => [
      { ...draft, title: draft.title.trim() },
      ...current,
    ]);
    setDraft({
      title: "",
      date: new Date().toISOString().slice(0, 10),
      evidence: "",
      gratitude: "",
      meaning: "",
    });
  }
  return (
    <section
      className="journal-spread achievements-spread"
      aria-labelledby="achievements-title"
    >
      <div className="spread-page achievements-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">goals & growth · achievements</p>
        <h2 id="achievements-title">
          Let yourself
          <br />
          <em>notice the win.</em>
        </h2>
        <p className="page-intro">
          A place to record a milestone, the evidence you are proud of, and the
          meaning you want to carry forward—big or small.
        </p>
        <div className="achievement-spark">
          <Sparkles size={15} />
          <span>{achievements.length} moments celebrated</span>
        </div>
      </div>
      <div className="spread-page achievements-page">
        <form className="achievement-form" onSubmit={addAchievement}>
          <label>
            Achievement or milestone
            <input
              value={draft.title}
              onChange={event =>
                setDraft(current => ({ ...current, title: event.target.value }))
              }
              placeholder="e.g. Submitted my first portfolio project"
            />
          </label>
          <label>
            Date
            <input
              type="date"
              value={draft.date}
              onChange={event =>
                setDraft(current => ({ ...current, date: event.target.value }))
              }
            />
          </label>
          <label>
            Evidence or detail
            <input
              value={draft.evidence}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  evidence: event.target.value,
                }))
              }
              placeholder="What makes this feel real?"
            />
          </label>
          <label>
            Gratitude
            <input
              value={draft.gratitude}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  gratitude: event.target.value,
                }))
              }
              placeholder="Who or what helped?"
            />
          </label>
          <label>
            Personal meaning
            <input
              value={draft.meaning}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  meaning: event.target.value,
                }))
              }
              placeholder="What does this teach you about yourself?"
            />
          </label>
          <Button className="ink-button" type="submit">
            <Plus size={15} /> Celebrate this moment
          </Button>
        </form>
        <div className="achievement-list">
          <div>
            <span>celebration history</span>
            <b>{achievements.length} wins</b>
          </div>
          {achievements.length === 0 ? (
            <small>
              Your wins are allowed to have a place here before you move on to
              the next thing.
            </small>
          ) : (
            achievements.map((achievement, index) => (
              <article key={`${achievement.title}-${index}`}>
                <i>✦</i>
                <p>
                  <b>{achievement.title}</b>
                  <small>{achievement.date}</small>
                  <em>
                    Evidence:{" "}
                    {achievement.evidence || "Add detail when you want"}
                  </em>
                  <em>
                    Gratitude: {achievement.gratitude || "Add a thank-you"}
                  </em>
                  <em>
                    Meaning: {achievement.meaning || "Add what this means"}
                  </em>
                </p>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function ExperiencesPage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  type Experience = {
    title: string;
    date: string;
    detail: string;
    anticipation: string;
    memory: string;
    reflection: string;
  };
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [draft, setDraft] = useState<Experience>({
    title: "",
    date: "",
    detail: "",
    anticipation: "",
    memory: "",
    reflection: "",
  });
  useMongoJournalScope({
    scope: "experiences",
    payload: { experiences },
    hydrate: payload => {
      if (Array.isArray(payload.experiences))
        setExperiences(payload.experiences as Experience[]);
    },
  });
  function addExperience(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    setExperiences(current => [
      ...current,
      { ...draft, title: draft.title.trim() },
    ]);
    setDraft({
      title: "",
      date: "",
      detail: "",
      anticipation: "",
      memory: "",
      reflection: "",
    });
  }
  return (
    <section
      className="journal-spread experiences-spread"
      aria-labelledby="experiences-title"
    >
      <div className="spread-page experiences-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">goals & growth · experiences</p>
        <h2 id="experiences-title">
          Collect the moments
          <br />
          <em>that open you up.</em>
        </h2>
        <p className="page-intro">
          Keep an experience as a plan, a memory, or both. Add only the
          practical detail and meaning you would like to return to later.
        </p>
        <div className="experience-spark">
          <Sparkles size={15} />
          <span>{experiences.length} moments held</span>
        </div>
      </div>
      <div className="spread-page experiences-page">
        <form className="experience-form" onSubmit={addExperience}>
          <label>
            Experience or plan
            <input
              value={draft.title}
              onChange={event =>
                setDraft(current => ({ ...current, title: event.target.value }))
              }
              placeholder="e.g. Visit a new art exhibition"
            />
          </label>
          <div>
            <label>
              Date
              <input
                type="date"
                value={draft.date}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Practical detail
              <input
                value={draft.detail}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    detail: event.target.value,
                  }))
                }
                placeholder="Place, booking, or packing note"
              />
            </label>
          </div>
          <label>
            Anticipation
            <input
              value={draft.anticipation}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  anticipation: event.target.value,
                }))
              }
              placeholder="What are you looking forward to?"
            />
          </label>
          <label>
            Memory
            <input
              value={draft.memory}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  memory: event.target.value,
                }))
              }
              placeholder="A moment, detail, or photo reminder"
            />
          </label>
          <label>
            Reflection
            <input
              value={draft.reflection}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  reflection: event.target.value,
                }))
              }
              placeholder="What did this give you?"
            />
          </label>
          <Button className="ink-button" type="submit">
            <Plus size={15} /> Save experience
          </Button>
        </form>
        <div className="experience-list">
          <div>
            <span>memory map</span>
            <b>{experiences.length} moments</b>
          </div>
          {experiences.length === 0 ? (
            <small>
              Start with an experience you want to look forward to or remember
              with a little more care.
            </small>
          ) : (
            experiences.map((experience, index) => (
              <article key={`${experience.title}-${index}`}>
                <i>{experience.title.slice(0, 1)}</i>
                <p>
                  <b>{experience.title}</b>
                  <small>
                    {experience.date || "Date open"} ·{" "}
                    {experience.detail || "Detail to be added"}
                  </small>
                  <em>
                    Looking forward to:{" "}
                    {experience.anticipation || "Add a small anticipation"}
                  </em>
                  <em>Memory: {experience.memory || "Add a moment"}</em>
                  <em>
                    Reflection: {experience.reflection || "Add a reflection"}
                  </em>
                </p>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function HobbiesPage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  type Hobby = {
    title: string;
    project: string;
    rhythm: string;
    supplies: string;
    inspiration: string;
    reflection: string;
  };
  const [hobbies, setHobbies] = useState<Hobby[]>([]);
  const [draft, setDraft] = useState<Hobby>({
    title: "",
    project: "",
    rhythm: "When I have time",
    supplies: "",
    inspiration: "",
    reflection: "",
  });
  useMongoJournalScope({
    scope: "hobbies",
    payload: { hobbies },
    hydrate: payload => {
      if (Array.isArray(payload.hobbies))
        setHobbies(payload.hobbies as Hobby[]);
    },
  });
  function addHobby(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    setHobbies(current => [
      ...current,
      { ...draft, title: draft.title.trim() },
    ]);
    setDraft({
      title: "",
      project: "",
      rhythm: "When I have time",
      supplies: "",
      inspiration: "",
      reflection: "",
    });
  }
  return (
    <section
      className="journal-spread hobbies-spread"
      aria-labelledby="hobbies-title"
    >
      <div className="spread-page hobbies-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">goals & growth · hobbies</p>
        <h2 id="hobbies-title">
          Make space for
          <br />
          <em>what lights you up.</em>
        </h2>
        <p className="page-intro">
          Hold a hobby without turning it into another demand. Keep a project,
          supplies, and a small spark of inspiration where you can find them.
        </p>
        <div className="hobby-spark">
          <Sparkles size={15} />
          <span>{hobbies.length} creative spaces held</span>
        </div>
      </div>
      <div className="spread-page hobbies-page">
        <form className="hobby-form" onSubmit={addHobby}>
          <label>
            Hobby or interest
            <input
              value={draft.title}
              onChange={event =>
                setDraft(current => ({ ...current, title: event.target.value }))
              }
              placeholder="e.g. Painting, baking, or film photography"
            />
          </label>
          <label>
            Current project
            <input
              value={draft.project}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  project: event.target.value,
                }))
              }
              placeholder="What would be fun to make or explore?"
            />
          </label>
          <div>
            <label>
              Practice rhythm
              <select
                value={draft.rhythm}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    rhythm: event.target.value,
                  }))
                }
              >
                <option>When I have time</option>
                <option>Weekly</option>
                <option>Twice a month</option>
                <option>Daily, lightly</option>
              </select>
            </label>
            <label>
              Supplies or setup
              <input
                value={draft.supplies}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    supplies: event.target.value,
                  }))
                }
                placeholder="Optional"
              />
            </label>
          </div>
          <label>
            Inspiration
            <input
              value={draft.inspiration}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  inspiration: event.target.value,
                }))
              }
              placeholder="A prompt, artist, place, or idea"
            />
          </label>
          <label>
            Small reflection
            <input
              value={draft.reflection}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  reflection: event.target.value,
                }))
              }
              placeholder="How did this feel or what do you want to try?"
            />
          </label>
          <Button className="ink-button" type="submit">
            <Plus size={15} /> Save hobby space
          </Button>
        </form>
        <div className="hobby-list">
          <div>
            <span>creative notebook</span>
            <b>{hobbies.length} interests</b>
          </div>
          {hobbies.length === 0 ? (
            <small>
              Start with the interest that would feel good to return to, even
              briefly.
            </small>
          ) : (
            hobbies.map((hobby, index) => (
              <article key={`${hobby.title}-${index}`}>
                <i>{hobby.title.slice(0, 1)}</i>
                <p>
                  <b>{hobby.title}</b>
                  <small>
                    {hobby.project || "Project to be chosen"} · {hobby.rhythm}
                  </small>
                  <em>Supplies: {hobby.supplies || "Noted when useful"}</em>
                  <em>Inspiration: {hobby.inspiration || "Add a spark"}</em>
                  <em>Reflection: {hobby.reflection || "Add a small note"}</em>
                </p>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function FamilyPage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  type FamilyPlan = {
    label: string;
    plan: string;
    date: string;
    care: string;
    followThrough: string;
    reminder: string;
  };
  const [plans, setPlans] = useState<FamilyPlan[]>([]);
  const [draft, setDraft] = useState<FamilyPlan>({
    label: "",
    plan: "",
    date: "",
    care: "",
    followThrough: "",
    reminder: "No reminder",
  });
  useMongoJournalScope({
    scope: "family",
    payload: { plans },
    hydrate: payload => {
      if (Array.isArray(payload.plans)) setPlans(payload.plans as FamilyPlan[]);
    },
  });
  function addPlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.label.trim() || !draft.plan.trim()) return;
    setPlans(current => [
      ...current,
      { ...draft, label: draft.label.trim(), plan: draft.plan.trim() },
    ]);
    setDraft({
      label: "",
      plan: "",
      date: "",
      care: "",
      followThrough: "",
      reminder: "No reminder",
    });
  }
  return (
    <section
      className="journal-spread family-spread"
      aria-labelledby="family-title"
    >
      <div className="spread-page family-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">life · family</p>
        <h2 id="family-title">
          Keep shared care
          <br />
          <em>within reach.</em>
        </h2>
        <p className="page-intro">
          A private place for important dates, small ways to show care, and
          shared plans. Use names, initials, or only the detail you feel
          comfortable holding here.
        </p>
        <div className="family-signal">
          <HeartPulse size={15} />
          <span>{plans.length} shared moments noted</span>
        </div>
      </div>
      <div className="spread-page family-page">
        <form className="family-form" onSubmit={addPlan}>
          <label>
            Person or family label
            <input
              value={draft.label}
              onChange={event =>
                setDraft(current => ({ ...current, label: event.target.value }))
              }
              placeholder="Name, initials, or a private label"
            />
          </label>
          <label>
            Plan or important date
            <input
              value={draft.plan}
              onChange={event =>
                setDraft(current => ({ ...current, plan: event.target.value }))
              }
              placeholder="e.g. Sunday call or birthday dinner"
            />
          </label>
          <div>
            <label>
              Date
              <input
                type="date"
                value={draft.date}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Optional reminder
              <select
                value={draft.reminder}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    reminder: event.target.value,
                  }))
                }
              >
                <option>No reminder</option>
                <option>Week before</option>
                <option>Day before</option>
                <option>Morning of</option>
              </select>
            </label>
          </div>
          <label>
            Care note
            <input
              value={draft.care}
              onChange={event =>
                setDraft(current => ({ ...current, care: event.target.value }))
              }
              placeholder="What might feel supportive or meaningful?"
            />
          </label>
          <label>
            Follow-through
            <input
              value={draft.followThrough}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  followThrough: event.target.value,
                }))
              }
              placeholder="A small next action"
            />
          </label>
          <Button className="ink-button" type="submit">
            <Plus size={15} /> Save family note
          </Button>
        </form>
        <div className="family-list">
          <div>
            <span>family notebook</span>
            <b>{plans.length} notes</b>
          </div>
          {plans.length === 0 ? (
            <small>
              Start with a person, date, or shared plan you would like to hold
              with care.
            </small>
          ) : (
            plans.map((plan, index) => (
              <article key={`${plan.label}-${index}`}>
                <i>{plan.label.slice(0, 1)}</i>
                <p>
                  <b>{plan.label}</b>
                  <small>
                    {plan.plan}
                    {plan.date ? ` · ${plan.date}` : ""} · {plan.reminder}
                  </small>
                  <em>Care: {plan.care || "Add a care note if helpful"}</em>
                  <em>
                    Next:{" "}
                    {plan.followThrough || "Choose a small follow-through"}
                  </em>
                </p>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function InternshipsPage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  type Application = {
    role: string;
    organization: string;
    deadline: string;
    material: string;
    followUp: string;
    status: string;
    reflection: string;
  };
  const [applications, setApplications] = useState<Application[]>([]);
  const [draft, setDraft] = useState<Application>({
    role: "",
    organization: "",
    deadline: "",
    material: "",
    followUp: "",
    status: "Considering",
    reflection: "",
  });
  useMongoJournalScope({
    scope: "internships",
    payload: { applications },
    hydrate: payload => {
      if (Array.isArray(payload.applications))
        setApplications(payload.applications as Application[]);
    },
  });
  function saveApplication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.role.trim() || !draft.organization.trim()) return;
    setApplications(current => [
      ...current,
      {
        ...draft,
        role: draft.role.trim(),
        organization: draft.organization.trim(),
      },
    ]);
    setDraft({
      role: "",
      organization: "",
      deadline: "",
      material: "",
      followUp: "",
      status: "Considering",
      reflection: "",
    });
  }
  return (
    <section
      className="journal-spread internships-spread"
      aria-labelledby="internships-title"
    >
      <div className="spread-page internships-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">life · career · internship applications</p>
        <h2 id="internships-title">
          Apply with
          <br />
          <em>room to reflect.</em>
        </h2>
        <p className="page-intro">
          Hold an opportunity, its deadline, your prepared materials, and the
          follow-up you want to make—without turning your search into a verdict
          on yourself.
        </p>
        <div className="internships-signal">
          <Sparkles size={15} />
          <span>{applications.length} applications held with care</span>
        </div>
      </div>
      <div className="spread-page internships-page">
        <form className="internships-form" onSubmit={saveApplication}>
          <div>
            <label>
              Role
              <input
                value={draft.role}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    role: event.target.value,
                  }))
                }
                placeholder="e.g. Product design intern"
              />
            </label>
            <label>
              Organisation
              <input
                value={draft.organization}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    organization: event.target.value,
                  }))
                }
                placeholder="Where you are applying"
              />
            </label>
          </div>
          <label>
            Deadline
            <input
              type="date"
              value={draft.deadline}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  deadline: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Prepared material
            <input
              value={draft.material}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  material: event.target.value,
                }))
              }
              placeholder="CV version, portfolio, or note"
            />
          </label>
          <label>
            Follow-up
            <input
              value={draft.followUp}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  followUp: event.target.value,
                }))
              }
              placeholder="A respectful next action"
            />
          </label>
          <label>
            Status
            <select
              value={draft.status}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  status: event.target.value,
                }))
              }
            >
              <option>Considering</option>
              <option>Preparing</option>
              <option>Applied</option>
              <option>Interviewing</option>
              <option>Closed</option>
            </select>
          </label>
          <label>
            Reflection
            <input
              value={draft.reflection}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  reflection: event.target.value,
                }))
              }
              placeholder="What did you learn from this application?"
            />
          </label>
          <Button type="submit" className="ink-button">
            <Plus size={15} /> Save application
          </Button>
        </form>
        <div className="internships-list">
          <div>
            <span>application notes</span>
            <b>{applications.length} roles</b>
          </div>
          {applications.length === 0 ? (
            <small>
              Start with one opportunity that feels worth exploring at your own
              pace.
            </small>
          ) : (
            applications.map((application, index) => (
              <article
                key={`${application.role}-${application.organization}-${index}`}
              >
                <i>{application.organization.slice(0, 1)}</i>
                <p>
                  <b>{application.role}</b>
                  <small>
                    {application.organization} · {application.status} ·{" "}
                    {application.deadline || "No deadline added"}
                  </small>
                  <em>
                    Materials:{" "}
                    {application.material || "Add what you are preparing"}
                  </em>
                  <em>
                    Follow-up: {application.followUp || "Add a next step"}
                  </em>
                  <em>
                    Reflection: {application.reflection || "Add a reflection"}
                  </em>
                </p>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function CvPage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  const [profile, setProfile] = useState({
    summary: "",
    experience: "",
    skills: "",
    education: "",
    readiness: "Drafting",
  });
  const [saved, setSaved] = useState(false);
  useMongoJournalScope({
    scope: "cv",
    payload: { profile },
    hydrate: payload => {
      if (payload.profile && typeof payload.profile === "object")
        setProfile(payload.profile as typeof profile);
    },
  });
  function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(true);
  }
  return (
    <section className="journal-spread cv-spread" aria-labelledby="cv-title">
      <div className="spread-page cv-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">life · career · CV</p>
        <h2 id="cv-title">
          Tell your story
          <br />
          <em>with quiet clarity.</em>
        </h2>
        <p className="page-intro">
          Shape a private CV outline around your strengths, evidence, and
          education. This prototype keeps it local and does not publish or
          submit it anywhere.
        </p>
        <div className="cv-signal">
          <Sparkles size={15} />
          <span>
            {saved
              ? "Local CV outline saved"
              : "Build a private working outline"}
          </span>
        </div>
      </div>
      <div className="spread-page cv-page">
        <form className="cv-form" onSubmit={saveProfile}>
          <label>
            Profile summary
            <textarea
              value={profile.summary}
              onChange={event =>
                setProfile(current => ({
                  ...current,
                  summary: event.target.value,
                }))
              }
              placeholder="The work you want to be known for"
            />
          </label>
          <label>
            Experience evidence
            <input
              value={profile.experience}
              onChange={event =>
                setProfile(current => ({
                  ...current,
                  experience: event.target.value,
                }))
              }
              placeholder="Role, project, impact, or responsibility"
            />
          </label>
          <label>
            Skills
            <input
              value={profile.skills}
              onChange={event =>
                setProfile(current => ({
                  ...current,
                  skills: event.target.value,
                }))
              }
              placeholder="Tools, strengths, or capabilities"
            />
          </label>
          <label>
            Education & learning
            <input
              value={profile.education}
              onChange={event =>
                setProfile(current => ({
                  ...current,
                  education: event.target.value,
                }))
              }
              placeholder="Programme, course, credential, or study focus"
            />
          </label>
          <label>
            Application readiness
            <select
              value={profile.readiness}
              onChange={event =>
                setProfile(current => ({
                  ...current,
                  readiness: event.target.value,
                }))
              }
            >
              <option>Drafting</option>
              <option>Needs a review</option>
              <option>Ready to tailor</option>
            </select>
          </label>
          <Button type="submit" className="ink-button">
            <Plus size={15} /> Save CV outline
          </Button>
        </form>
        <div className="cv-preview">
          <div>
            <span>local CV preview</span>
            <b>{profile.readiness}</b>
          </div>
          <p>
            <b>Summary</b>
            {profile.summary || "Add a clear first impression."}
          </p>
          <p>
            <b>Evidence</b>
            {profile.experience || "Add a role, project, or impact."}
          </p>
          <p>
            <b>Skills</b>
            {profile.skills || "Add strengths you want to foreground."}
          </p>
          <p>
            <b>Education</b>
            {profile.education || "Add a learning milestone."}
          </p>
        </div>
      </div>
    </section>
  );
}

function CertificationsPage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  type Certification = {
    name: string;
    status: string;
    date: string;
    evidence: string;
    renewal: string;
    reflection: string;
  };
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [draft, setDraft] = useState<Certification>({
    name: "",
    status: "Exploring",
    date: "",
    evidence: "",
    renewal: "",
    reflection: "",
  });
  useMongoJournalScope({
    scope: "certifications",
    payload: { certifications },
    hydrate: payload => {
      if (Array.isArray(payload.certifications))
        setCertifications(payload.certifications as Certification[]);
    },
  });
  function saveCertification(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim()) return;
    setCertifications(current => [
      ...current,
      { ...draft, name: draft.name.trim() },
    ]);
    setDraft({
      name: "",
      status: "Exploring",
      date: "",
      evidence: "",
      renewal: "",
      reflection: "",
    });
  }
  return (
    <section
      className="journal-spread certifications-spread"
      aria-labelledby="certifications-title"
    >
      <div className="spread-page certifications-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">life · career · certifications</p>
        <h2 id="certifications-title">
          Mark the learning
          <br />
          <em>you worked for.</em>
        </h2>
        <p className="page-intro">
          Track a credential’s preparation and evidence, plus any renewal date
          or lesson that helps you continue growing without storing the
          credential itself.
        </p>
        <div className="certifications-signal">
          <Sparkles size={15} />
          <span>{certifications.length} credentials in view</span>
        </div>
      </div>
      <div className="spread-page certifications-page">
        <form className="certifications-form" onSubmit={saveCertification}>
          <label>
            Certification or credential
            <input
              value={draft.name}
              onChange={event =>
                setDraft(current => ({ ...current, name: event.target.value }))
              }
              placeholder="e.g. UX design foundations"
            />
          </label>
          <label>
            Status
            <select
              value={draft.status}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  status: event.target.value,
                }))
              }
            >
              <option>Exploring</option>
              <option>Preparing</option>
              <option>Earned</option>
              <option>Renewal due</option>
            </select>
          </label>
          <label>
            Exam, award, or target date
            <input
              type="date"
              value={draft.date}
              onChange={event =>
                setDraft(current => ({ ...current, date: event.target.value }))
              }
            />
          </label>
          <label>
            Evidence note
            <input
              value={draft.evidence}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  evidence: event.target.value,
                }))
              }
              placeholder="Course, score, badge, or outcome"
            />
          </label>
          <label>
            Renewal timing
            <input
              value={draft.renewal}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  renewal: event.target.value,
                }))
              }
              placeholder="Optional renewal month or reminder"
            />
          </label>
          <label>
            Growth note
            <input
              value={draft.reflection}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  reflection: event.target.value,
                }))
              }
              placeholder="What did this teach you?"
            />
          </label>
          <Button type="submit" className="ink-button">
            <Plus size={15} /> Save certification
          </Button>
        </form>
        <div className="certifications-list">
          <div>
            <span>credential notebook</span>
            <b>{certifications.length} items</b>
          </div>
          {certifications.length === 0 ? (
            <small>
              Start with a credential you are curious to explore or already
              proud to have earned.
            </small>
          ) : (
            certifications.map((certification, index) => (
              <article key={`${certification.name}-${index}`}>
                <i>{certification.name.slice(0, 1)}</i>
                <p>
                  <b>{certification.name}</b>
                  <small>
                    {certification.status} · {certification.date || "Date open"}
                  </small>
                  <em>
                    Evidence: {certification.evidence || "Add an evidence note"}
                  </em>
                  <em>
                    Renewal:{" "}
                    {certification.renewal || "No renewal timing added"}
                  </em>
                  <em>
                    Growth: {certification.reflection || "Add a growth note"}
                  </em>
                </p>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function ProjectsPage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  type Project = {
    title: string;
    status: string;
    milestone: string;
    evidence: string;
    closeout: string;
  };
  const [projects, setProjects] = useState<Project[]>([]);
  const [draft, setDraft] = useState<Project>({
    title: "",
    status: "Planning",
    milestone: "",
    evidence: "",
    closeout: "",
  });
  useMongoJournalScope({
    scope: "projects",
    payload: { projects },
    hydrate: payload => {
      if (Array.isArray(payload.projects))
        setProjects(payload.projects as Project[]);
    },
  });
  function saveProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    setProjects(current => [
      ...current,
      { ...draft, title: draft.title.trim() },
    ]);
    setDraft({
      title: "",
      status: "Planning",
      milestone: "",
      evidence: "",
      closeout: "",
    });
  }
  return (
    <section
      className="journal-spread projects-spread"
      aria-labelledby="projects-title"
    >
      <div className="spread-page projects-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">life · career · projects</p>
        <h2 id="projects-title">
          Make the work
          <br />
          <em>visible while it grows.</em>
        </h2>
        <p className="page-intro">
          Keep project direction, the next milestone, evidence of progress, and
          what you want to remember when a chapter closes.
        </p>
        <div className="projects-signal">
          <Sparkles size={15} />
          <span>{projects.length} projects in motion</span>
        </div>
      </div>
      <div className="spread-page projects-page">
        <form className="projects-form" onSubmit={saveProject}>
          <label>
            Project title
            <input
              value={draft.title}
              onChange={event =>
                setDraft(current => ({ ...current, title: event.target.value }))
              }
              placeholder="e.g. Illustrate a personal story"
            />
          </label>
          <label>
            Status
            <select
              value={draft.status}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  status: event.target.value,
                }))
              }
            >
              <option>Planning</option>
              <option>In progress</option>
              <option>Paused</option>
              <option>Complete</option>
            </select>
          </label>
          <label>
            Next milestone
            <input
              value={draft.milestone}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  milestone: event.target.value,
                }))
              }
              placeholder="One clear progress marker"
            />
          </label>
          <label>
            Evidence or artifact
            <input
              value={draft.evidence}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  evidence: event.target.value,
                }))
              }
              placeholder="Link title, note, or outcome"
            />
          </label>
          <label>
            Close-out reflection
            <input
              value={draft.closeout}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  closeout: event.target.value,
                }))
              }
              placeholder="What do you want to carry forward?"
            />
          </label>
          <Button type="submit" className="ink-button">
            <Plus size={15} /> Save project
          </Button>
        </form>
        <div className="projects-list">
          <div>
            <span>project field notes</span>
            <b>{projects.length} items</b>
          </div>
          {projects.length === 0 ? (
            <small>
              Start with one project that deserves a clear next milestone.
            </small>
          ) : (
            projects.map((project, index) => (
              <article key={`${project.title}-${index}`}>
                <i>{project.title.slice(0, 1)}</i>
                <p>
                  <b>{project.title}</b>
                  <small>
                    {project.status} · Next:{" "}
                    {project.milestone || "Add a milestone"}
                  </small>
                  <em>Evidence: {project.evidence || "Add an artifact"}</em>
                  <em>
                    Close-out: {project.closeout || "Keep a note for later"}
                  </em>
                </p>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function HistoryPage({
  onContents,
  onCover,
  activity,
  ownerKey,
  privateMode,
  showSensitiveSummaries,
  onOpen,
}: {
  onContents: () => void;
  onCover: () => void;
  activity: InsightActivity[];
  ownerKey: string;
  privateMode: boolean;
  showSensitiveSummaries: boolean;
  onOpen: (view: View) => void;
}) {
  const recent = activity;
  const [savedRecords, setSavedRecords] = useState<
    ReturnType<typeof readPersistedHistoryRecords>
  >([]);
  const [historyQuery, setHistoryQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("All");
  useEffect(() => {
    setSavedRecords(readPersistedHistoryRecords(window.localStorage, ownerKey));
  }, [ownerKey, recent.length]);
  const unifiedEntries = useMemo(
    () => [
      ...recent.map(entry => ({
        ...entry,
        detail: formatHistoryActivityMetric(entry.module, entry.amount),
        view: undefined,
      })),
      ...savedRecords,
    ],
    [recent, savedRecords]
  );
  const visibleEntries = useMemo(() => {
    const sensitiveModules = new Set([
      "Wellbeing",
      "Sleep",
      "Menstrual health",
      "Finances",
      "Documents",
      "Security",
    ]);
    const shouldMask = privateMode || !showSensitiveSummaries;
    return unifiedEntries.map(entry =>
      shouldMask && sensitiveModules.has(entry.module)
        ? {
            ...entry,
            label: "Private entry",
            detail: "Hidden by privacy controls.",
          }
        : entry
    );
  }, [privateMode, showSensitiveSummaries, unifiedEntries]);
  const moduleOptions = useMemo(
    () => Array.from(new Set(visibleEntries.map(entry => entry.module))).sort(),
    [visibleEntries]
  );
  const filteredRecent = useMemo(
    () => filterHistoryEntries(visibleEntries, historyQuery, moduleFilter),
    [historyQuery, moduleFilter, visibleEntries]
  );
  const moduleTotals = useMemo(
    () => historyModuleTotals(visibleEntries),
    [visibleEntries]
  );
  const destinations: Array<{ label: string; note: string; view: View }> = [
    {
      label: "Fitness & Portraits",
      note: "movement pixels and recovery",
      view: "portraits",
    },
    {
      label: "Workout Studio",
      note: "guided movement completion",
      view: "workouts",
    },
    {
      label: "Assignments",
      note: "coursework and completed items",
      view: "assignments",
    },
    { label: "Tasks", note: "captured work and completions", view: "tasks" },
    {
      label: "Study sessions",
      note: "planned focus and reviews",
      view: "studySessions",
    },
    { label: "Learning", note: "dated practice sessions", view: "learning" },
    {
      label: "Reflections",
      note: "weekly & monthly entries",
      view: "reflections",
    },
    { label: "Habits", note: "gentle consistency", view: "habits" },
    {
      label: "Productivity",
      note: "focus-session history",
      view: "productivity",
    },
    { label: "Sleep", note: "rest history", view: "sleep" },
    { label: "Wellbeing", note: "private check-ins", view: "wellbeing" },
    { label: "Menstrual health", note: "private cycle history", view: "cycle" },
    { label: "Water", note: "hydration log", view: "water" },
    { label: "Nutrition", note: "meal and grocery entries", view: "nutrition" },
    {
      label: "Environment",
      note: "care completion history",
      view: "environment",
    },
    {
      label: "Responsibilities",
      note: "recurring follow-through",
      view: "responsibilities",
    },
    { label: "Purchases", note: "plans and review notes", view: "purchases" },
    {
      label: "Personal growth",
      note: "values and growth notes",
      view: "personalGrowth",
    },
  ];
  return (
    <section
      className="journal-spread history-spread"
      aria-labelledby="history-title"
    >
      <div className="spread-page history-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">utilities · history</p>
        <h2 id="history-title">
          Look back
          <br />
          <em>with useful context.</em>
        </h2>
        <p className="page-intro">
          This durable ledger gathers tracked entries, reflections, completed
          work, and annual portrait progress. Each recorded workspace has its
          own detailed history below. Your activity is saved to your private
          journal and restores across reloads.
        </p>
        <div className="history-signal">
          <Clock3 size={15} />
          <span>{visibleEntries.length} durable records to review</span>
        </div>
      </div>
      <div className="spread-page history-page">
        <div className="history-filters" aria-label="History filters">
          <label>
            Search history
            <input
              value={historyQuery}
              onChange={event => setHistoryQuery(event.target.value)}
              placeholder="Module, action, or date"
            />
          </label>
          <label>
            Module
            <select
              value={moduleFilter}
              onChange={event =>
                setModuleFilter(
                  event.target.value as "All" | InsightActivity["module"]
                )
              }
            >
              <option>All</option>
              {moduleOptions.map(module => (
                <option key={module}>{module}</option>
              ))}
            </select>
          </label>
          {historyQuery || moduleFilter !== "All" ? (
            <button
              type="button"
              onClick={() => {
                setHistoryQuery("");
                setModuleFilter("All");
              }}
            >
              Clear filters
            </button>
          ) : null}
        </div>
        <div
          className="history-module-summary"
          aria-label="Activity totals by module"
        >
          {moduleTotals.length ? (
            moduleTotals.map(([module, count]) => (
              <span key={module}>
                <b>{count}</b>
                {module}
              </span>
            ))
          ) : (
            <small>No activity totals yet.</small>
          )}
        </div>
        <div className="session-history">
          <div>
            <span>durable journal activity</span>
            <b>
              {filteredRecent.length} shown · {visibleEntries.length} total
            </b>
          </div>
          {visibleEntries.length === 0 ? (
            <small>
              Save a tracker record, complete a task or habit, fill a portrait
              mark, practise, focus, or reflect to see it appear in this
              journal.
            </small>
          ) : filteredRecent.length === 0 ? (
            <small>
              No durable activity matches these filters. Clear them to see the
              full ledger.
            </small>
          ) : (
            filteredRecent.map(entry => (
              <article key={entry.id}>
                <i>{entry.module.slice(0, 1)}</i>
                <p>
                  <b>{entry.module}</b>
                  <small>
                    {entry.label} · {entry.detail} · {entry.createdAt}
                  </small>
                  {entry.view ? (
                    <button
                      type="button"
                      onClick={() => onOpen(entry.view as View)}
                    >
                      Open source
                    </button>
                  ) : null}
                </p>
              </article>
            ))
          )}
        </div>
        <div className="history-destinations">
          <span>recorded workspaces</span>
          {destinations.map(destination => (
            <button
              key={destination.label}
              type="button"
              onClick={() => onOpen(destination.view)}
            >
              <p>
                <b>{destination.label}</b>
                <small>{destination.note}</small>
              </p>
              <ArrowRight size={14} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function RecommendationsPage({
  onContents,
  onCover,
  activity,
  onOpenSource,
}: {
  onContents: () => void;
  onCover: () => void;
  activity: InsightActivity[];
  onOpenSource: (destination: View) => void;
}) {
  const [enabled, setEnabled] = useState(true);
  const [state, setState] = useState<"shown" | "snoozed" | "dismissed">(
    "shown"
  );
  const [duration, setDuration] = useState("15 minutes");
  const [modules, setModules] = useState({
    productivity: true,
    habits: true,
    learning: false,
    study: false,
    goals: false,
    time: false,
  });
  const [showLessFrom, setShowLessFrom] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState("");
  useMongoJournalScope({
    scope: "recommendations",
    payload: { enabled, state, duration, modules, showLessFrom },
    hydrate: payload => {
      if (typeof payload.enabled === "boolean") setEnabled(payload.enabled);
      if (
        payload.state === "shown" ||
        payload.state === "snoozed" ||
        payload.state === "dismissed"
      )
        setState(payload.state);
      if (typeof payload.duration === "string") setDuration(payload.duration);
      if (payload.modules && typeof payload.modules === "object")
        setModules(payload.modules as typeof modules);
      if (payload.showLessFrom && typeof payload.showLessFrom === "object")
        setShowLessFrom(payload.showLessFrom as Record<string, boolean>);
    },
  });
  const recommendationSources = [
    {
      key: "productivity",
      label: "Productivity",
      module: "Productivity",
      destination: "productivity" as View,
      title: `Try one ${duration.toLowerCase()} focus block when you are ready`,
      starter: "No recorded focus sessions yet.",
    },
    {
      key: "habits",
      label: "Habits",
      module: "Habits",
      destination: "habits" as View,
      title: "Choose one habit for its smallest version",
      starter: "No recorded habits yet.",
    },
    {
      key: "learning",
      label: "Learning",
      module: "Learning",
      destination: "learning" as View,
      title: "Give one skill a small practice moment",
      starter: "No saved practice session is available.",
    },
    {
      key: "study",
      label: "Study sessions",
      module: "Study Sessions",
      destination: "studySessions" as View,
      title: "Open one brief study session when ready",
      starter: "No completed study session is available.",
    },
    {
      key: "goals",
      label: "Goals",
      module: "Goals",
      destination: "goals" as View,
      title: "Name one smallest next action for a goal",
      starter: "No goal activity is available.",
    },
    {
      key: "time",
      label: "Time",
      module: "Time",
      destination: "time" as View,
      title: `Start a local ${duration.toLowerCase()} timer`,
      starter: "No completed timer is available.",
    },
  ] as const;
  const eligibleKeys = eligibleRecommendationSourceKeys(
    recommendationSources.map(source => source.key),
    modules,
    showLessFrom
  );
  const eligibleSources = recommendationSources.filter(source =>
    eligibleKeys.includes(source.key)
  );
  const primary = eligibleSources[0];
  const alternative = eligibleSources[1];
  const sourceCount = primary
    ? activity.filter(entry => entry.module === primary.module).length
    : 0;
  const rationale = primary
    ? sourceCount
      ? `${sourceCount} explicit ${primary.label} ${sourceCount === 1 ? "record" : "records"} saved in this open journal session.`
      : primary.starter
    : "Choose at least one source to make a local optional prompt available.";
  const chooseFeedback = (message: string) => {
    setFeedback(message);
  };
  const showLess = () => {
    if (!primary) return;
    setShowLessFrom(current => ({ ...current, [primary.key]: true }));
    setFeedback(
      `Showing less from ${primary.label} for this open journal session.`
    );
    setState("shown");
  };
  return (
    <section
      className="journal-spread recommendations-spread"
      aria-labelledby="recommendations-title"
    >
      <div className="spread-page recommendations-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">utilities · recommendations</p>
        <h2 id="recommendations-title">
          A next step,
          <br />
          <em>never an order.</em>
        </h2>
        <p className="page-intro">
          Recommendations are optional prompts informed only by the local
          sources you choose. You can adjust, pause, dismiss, show less from a
          source, or turn them off at any time.
        </p>
        <div className="recommendations-signal">
          <Sparkles size={15} />
          <span>
            {enabled
              ? `${eligibleSources.length} local source${eligibleSources.length === 1 ? "" : "s"} available`
              : "Optional prompts are off"}
          </span>
        </div>
      </div>
      <div className="spread-page recommendations-page">
        <div className="recommendation-header">
          <div>
            <span>Optional recommendations</span>
            <small>local to this open journal session</small>
          </div>
          <button
            type="button"
            className={cn(enabled && "on")}
            onClick={() => {
              setEnabled(current => !current);
              setState("shown");
            }}
          >
            {enabled ? "On" : "Off"}
          </button>
        </div>
        <section className="recommendation-source-panel">
          <div>
            <span>Included sources</span>
            <small>Only checked sources can make a prompt available.</small>
          </div>
          <div className="recommendation-module-pills">
            {recommendationSources.map(source => (
              <label key={source.key}>
                <input
                  type="checkbox"
                  disabled={!enabled}
                  checked={modules[source.key]}
                  onChange={() =>
                    setModules(current => ({
                      ...current,
                      [source.key]: !current[source.key],
                    }))
                  }
                />
                <span>{source.label}</span>
              </label>
            ))}
          </div>
          {Object.values(showLessFrom).some(Boolean) ? (
            <button
              type="button"
              className="restore-sources"
              onClick={() => {
                setShowLessFrom({});
                setFeedback(
                  "All selected sources are available again for this open session."
                );
              }}
            >
              Restore muted sources
            </button>
          ) : null}
        </section>
        {enabled && state === "shown" && primary ? (
          <>
            <article className="recommendation-card">
              <span>Optional next step · {primary.label}</span>
              <b>{primary.title}</b>
              <small>
                Why this appears: {rationale} This is an optional prompt, not an
                assessment or instruction.
              </small>
              {primary.key === "productivity" || primary.key === "time" ? (
                <label>
                  Adjust focus size
                  <select
                    value={duration}
                    onChange={event => setDuration(event.target.value)}
                  >
                    <option>10 minutes</option>
                    <option>15 minutes</option>
                    <option>25 minutes</option>
                  </select>
                </label>
              ) : null}
              <div className="recommendation-actions">
                <button
                  type="button"
                  className="recommendation-open"
                  onClick={() => onOpenSource(primary.destination)}
                >
                  Open {primary.label}
                  <ArrowRight size={13} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    chooseFeedback(
                      `Marked helpful locally. ${primary.label} stays available in this open session.`
                    )
                  }
                >
                  Helpful
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setState("snoozed");
                    chooseFeedback(
                      "Not now. You can show it again whenever you choose."
                    );
                  }}
                >
                  Not now
                </button>
                <button type="button" onClick={showLess}>
                  Show less
                </button>
                <button type="button" onClick={() => setState("dismissed")}>
                  Dismiss
                </button>
              </div>
            </article>
            {alternative ? (
              <article className="recommendation-alternative">
                <span>One alternative · {alternative.label}</span>
                <b>{alternative.title}</b>
                <small>
                  {activity.filter(entry => entry.module === alternative.module)
                    .length
                    ? `${activity.filter(entry => entry.module === alternative.module).length} explicit ${alternative.label} record${activity.filter(entry => entry.module === alternative.module).length === 1 ? "" : "s"} saved in this open session.`
                    : alternative.starter}
                </small>
                <button
                  type="button"
                  onClick={() => onOpenSource(alternative.destination)}
                >
                  Open alternative <ArrowRight size={13} />
                </button>
              </article>
            ) : null}
          </>
        ) : enabled && state === "shown" ? (
          <div className="recommendation-return">
            <b>No source is currently included.</b>
            <small>
              Choose one or more local sources above. Recommendations never fill
              this space with a generic score or hidden data.
            </small>
          </div>
        ) : enabled ? (
          <div className="recommendation-return">
            <b>
              {state === "snoozed"
                ? "Recommendation paused for now"
                : "Recommendation dismissed"}
            </b>
            <small>
              {feedback || "You can bring it back whenever you choose."}
            </small>
            <button type="button" onClick={() => setState("shown")}>
              Show again
            </button>
          </div>
        ) : (
          <div className="recommendation-return">
            <b>Recommendations are off</b>
            <small>
              No optional next steps will appear until you switch them on.
            </small>
          </div>
        )}
        {feedback && enabled && state === "shown" ? (
          <p className="recommendation-feedback">{feedback}</p>
        ) : null}
        <section className="recommendation-boundary">
          <b>How these prompts work</b>
          <span>
            They use only the sources you include and entries you explicitly
            saved in this open journal session. They do not inspect devices,
            accounts, health data, or background activity, and they do not
            predict what will work for you.
          </span>
        </section>
      </div>
    </section>
  );
}

function ExportPage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  const [selected, setSelected] = useState({
    journal: true,
    sensitive: false,
    settings: true,
  });
  const [exported, setExported] = useState(false);
  useMongoJournalScope({
    scope: "export",
    payload: { selected },
    hydrate: payload => {
      if (payload.selected && typeof payload.selected === "object")
        setSelected(payload.selected as typeof selected);
    },
  });
  function downloadExport() {
    const payload = {
      exportedAt: new Date().toISOString(),
      scope: Object.entries(selected)
        .filter(([, included]) => included)
        .map(([section]) => section),
      note: "Local prototype export only. Persistent data integration has not been approved or configured.",
      records: {
        journal: selected.journal
          ? "Current local journal interface state"
          : undefined,
        sensitive: selected.sensitive
          ? "Sensitive module selections included by user choice"
          : undefined,
        settings: selected.settings
          ? "Local display and reminder-preview preferences"
          : undefined,
      },
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "glory-personal-tracker-prototype-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setExported(true);
  }
  return (
    <section
      className="journal-spread export-spread"
      aria-labelledby="export-title"
    >
      <div className="spread-page export-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">utilities · export</p>
        <h2 id="export-title">
          Keep a copy
          <br />
          <em>on your terms.</em>
        </h2>
        <p className="page-intro">
          Choose what to package from this local prototype. This export is a
          transparent JSON handoff for future data integration—not a promise of
          persisted records.
        </p>
        <div className="export-signal">
          <Sparkles size={15} />
          <span>
            {exported
              ? "Local export prepared"
              : "Nothing leaves this prototype until you choose download"}
          </span>
        </div>
      </div>
      <div className="spread-page export-page">
        <div className="export-scope">
          <span>Choose export scope</span>
          <label>
            <input
              type="checkbox"
              checked={selected.journal}
              onChange={() =>
                setSelected(current => ({
                  ...current,
                  journal: !current.journal,
                }))
              }
            />
            <b>Journal activity</b>
            <small>Local tracker and reflection interface state</small>
          </label>
          <label>
            <input
              type="checkbox"
              checked={selected.sensitive}
              onChange={() =>
                setSelected(current => ({
                  ...current,
                  sensitive: !current.sensitive,
                }))
              }
            />
            <b>Sensitive module selections</b>
            <small>
              Only include if you choose; health, finance, documents, and
              security
            </small>
          </label>
          <label>
            <input
              type="checkbox"
              checked={selected.settings}
              onChange={() =>
                setSelected(current => ({
                  ...current,
                  settings: !current.settings,
                }))
              }
            />
            <b>Privacy & reminder settings</b>
            <small>Local display and preview choices</small>
          </label>
        </div>
        <div className="export-note">
          <b>Before you download</b>
          <small>
            Current tracker records are local prototype state. MongoDB or
            another persistence model will be decided only after UX rules are
            approved.
          </small>
        </div>
        <Button type="button" className="ink-button" onClick={downloadExport}>
          <ArrowRight size={15} /> Download JSON export
        </Button>
        {exported ? (
          <small className="export-confirmation">
            Prepared locally. Review the downloaded file before sharing it
            anywhere.
          </small>
        ) : null}
      </div>
    </section>
  );
}

function NotificationPreviewPage({
  onContents,
  onCover,
  previewMode,
  preferences,
  setPreferences,
  localReminders,
  setLocalReminders,
}: {
  onContents: () => void;
  onCover: () => void;
  previewMode: string;
  preferences: ReminderPreferences;
  setPreferences: React.Dispatch<React.SetStateAction<ReminderPreferences>>;
  localReminders: LocalReminder[];
  setLocalReminders: React.Dispatch<React.SetStateAction<LocalReminder[]>>;
}) {
  const reminders = [
    ["assignments", "Assignment", "Database design brief due tomorrow"],
    ["habits", "Habit", "Evening reset is ready"],
    ["period", "Period", "Cycle check-in"],
    ["documents", "Document", "Passport renewal is approaching"],
    ["responsibilities", "Responsibility", "Review household supplies"],
    ["security", "Security", "Main email security review"],
  ] as const;
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >(() =>
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported"
  );
  const [draftTitle, setDraftTitle] = useState("");
  const [draftKind, setDraftKind] = useState("General");
  const [draftDueAt, setDraftDueAt] = useState(() => {
    const date = new Date(Date.now() + 60 * 60 * 1000);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  });
  const [draftMessage, setDraftMessage] = useState("");
  function visibleText(kind: string, detail: string) {
    if (previewMode === "Hide all reminder previews")
      return "Reminder preview hidden";
    if (previewMode === "Show a general reminder only")
      return "You have a private reminder";
    if (previewMode === "Hide sensitive names") return `${kind} reminder`;
    return detail;
  }
  function saveLocalReminder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const dueAt = new Date(draftDueAt).getTime();
    if (!draftTitle.trim() || !Number.isFinite(dueAt) || dueAt <= Date.now()) {
      setDraftMessage("Add a title and choose a future time.");
      return;
    }
    setLocalReminders(current => [
      {
        id: `${Date.now()}-reminder`,
        title: draftTitle.trim(),
        kind: draftKind,
        dueAt,
        enabled: true,
        completed: false,
      },
      ...current,
    ]);
    setDraftTitle("");
    setDraftMessage("Reminder saved locally.");
  }
  function requestReminderPermission() {
    if (typeof Notification === "undefined") return;
    void Notification.requestPermission().then(nextPermission =>
      setPermission(nextPermission)
    );
  }
  return (
    <section
      className="journal-spread notifications-spread"
      aria-labelledby="notifications-title"
    >
      <div className="spread-page notifications-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">utilities · reminder preview</p>
        <h2 id="notifications-title">
          Decide what a<br />
          <em>reminder reveals.</em>
        </h2>
        <p className="page-intro">
          Choose visible local reminder preferences for each journal area, or
          add a local due-time reminder. Browser delivery is best-effort while
          this site can run; guaranteed operating-system delivery remains
          outside the web scope.
        </p>
        <div className="notification-signal">
          <HeartPulse size={15} />
          <span>{previewMode}</span>
        </div>
      </div>
      <div className="spread-page notifications-page">
        <div className="notification-preview-title">
          <span>local reminder preferences</span>
          <b>Preview mode: {previewMode}</b>
        </div>
        {reminders.map(([key, kind, detail]) => {
          const preference = preferences[key];
          return (
            <article
              className={cn(
                "notification-preview",
                !preference.enabled && "is-paused"
              )}
              key={key}
            >
              <i>{kind.slice(0, 1)}</i>
              <p>
                <b>Glory Mukami’s Personal Tracker</b>
                <small>
                  {preference.enabled
                    ? visibleText(kind, detail)
                    : "Reminder preference is off"}
                </small>
              </p>
              <div className="notification-controls">
                <label>
                  <input
                    type="checkbox"
                    checked={preference.enabled}
                    onChange={() =>
                      setPreferences(current => ({
                        ...current,
                        [key]: {
                          ...current[key],
                          enabled: !current[key].enabled,
                        },
                      }))
                    }
                  />{" "}
                  <span>{preference.enabled ? "On" : "Off"}</span>
                </label>
                <select
                  aria-label={`${kind} reminder timing`}
                  disabled={!preference.enabled}
                  value={preference.timing}
                  onChange={event =>
                    setPreferences(current => ({
                      ...current,
                      [key]: { ...current[key], timing: event.target.value },
                    }))
                  }
                >
                  <option>1 week before</option>
                  <option>3 days before</option>
                  <option>1 day before</option>
                  <option>Morning of</option>
                  <option>Evening</option>
                  <option>Day of estimate</option>
                  <option>30 days before</option>
                  <option>Monthly review</option>
                </select>
              </div>
            </article>
          );
        })}
        <section
          className="local-reminder-workbench"
          aria-labelledby="local-reminders-title"
        >
          <div className="notification-preview-title">
            <span id="local-reminders-title">your local reminder queue</span>
            <b>Best effort in this browser</b>
          </div>
          <p className="local-reminder-boundary">
            These reminders are stored in this journal and checked while the
            site can run. They can notify this browser when permission is
            granted, but closing the browser or device may stop delivery. Native
            home-screen widgets and guaranteed operating-system alarms are
            outside the current web scope.
          </p>
          <form className="local-reminder-form" onSubmit={saveLocalReminder}>
            <label>
              Reminder title
              <input
                required
                value={draftTitle}
                onChange={event => setDraftTitle(event.target.value)}
                placeholder="e.g. Review passport renewal"
              />
            </label>
            <div>
              <label>
                Area
                <select
                  value={draftKind}
                  onChange={event => setDraftKind(event.target.value)}
                >
                  <option>General</option>
                  <option>Assignment</option>
                  <option>Habit</option>
                  <option>Period</option>
                  <option>Document</option>
                  <option>Responsibility</option>
                  <option>Security</option>
                </select>
              </label>
              <label>
                Due date & time
                <input
                  required
                  type="datetime-local"
                  value={draftDueAt}
                  onChange={event => setDraftDueAt(event.target.value)}
                />
              </label>
            </div>
            <Button type="submit" className="ink-button">
              <Plus size={15} /> Save local reminder
            </Button>
            {draftMessage ? (
              <small className="local-reminder-message">{draftMessage}</small>
            ) : null}
          </form>
          {permission === "unsupported" ? (
            <small className="local-reminder-message">
              This browser does not support notifications. The reminder remains
              visible in the queue.
            </small>
          ) : permission !== "granted" ? (
            <button
              type="button"
              className="local-reminder-permission"
              onClick={requestReminderPermission}
            >
              Allow browser notifications
            </button>
          ) : (
            <small className="local-reminder-message">
              Browser notifications are enabled on this device.
            </small>
          )}
          <div className="local-reminder-list">
            {localReminders.length === 0 ? (
              <small>
                No local reminders yet. Add one when a date deserves a gentle
                nudge.
              </small>
            ) : (
              localReminders
                .slice()
                .sort((first, second) => first.dueAt - second.dueAt)
                .map(reminder => (
                  <article
                    className={cn(
                      "local-reminder-row",
                      reminder.completed && "is-complete",
                      reminder.deliveredAt && "is-delivered"
                    )}
                    key={reminder.id}
                  >
                    <div>
                      <b>{reminder.title}</b>
                      <small>
                        {reminder.kind} ·{" "}
                        {new Date(reminder.dueAt).toLocaleString()}
                      </small>
                      <em>
                        {reminder.completed
                          ? "Completed"
                          : reminder.deliveredAt
                            ? "Checked by this browser"
                            : "Pending"}
                      </em>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          setLocalReminders(current =>
                            current.map(item =>
                              item.id === reminder.id
                                ? { ...item, completed: !item.completed }
                                : item
                            )
                          )
                        }
                      >
                        {reminder.completed ? "Reopen" : "Complete"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setLocalReminders(current =>
                            current.map(item =>
                              item.id === reminder.id
                                ? {
                                    ...item,
                                    deliveredAt: undefined,
                                    completed: false,
                                  }
                                : item
                            )
                          )
                        }
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setLocalReminders(current =>
                            current.filter(item => item.id !== reminder.id)
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))
            )}
          </div>
        </section>
        <small className="notification-footnote">
          These assignment, habit, period, document, responsibility, and
          security choices now have a durable local preference and reminder
          queue. Automatic delivery remains best-effort within browser limits;
          guaranteed delivery and native widgets are intentionally deferred.
        </small>
      </div>
    </section>
  );
}

function PrivacyPage({
  onContents,
  onCover,
  privateMode,
  setPrivateMode,
  sensitiveSummaries,
  setSensitiveSummaries,
  previewMode,
  setPreviewMode,
}: {
  onContents: () => void;
  onCover: () => void;
  privateMode: boolean;
  setPrivateMode: React.Dispatch<React.SetStateAction<boolean>>;
  sensitiveSummaries: boolean;
  setSensitiveSummaries: React.Dispatch<React.SetStateAction<boolean>>;
  previewMode: string;
  setPreviewMode: React.Dispatch<React.SetStateAction<string>>;
}) {
  const [modules, setModules] = useState({
    menstrual: true,
    wellbeing: true,
    finances: true,
    documents: true,
    security: true,
  });
  useMongoJournalScope({
    scope: "privacy",
    payload: { modules },
    hydrate: payload => {
      if (payload.modules && typeof payload.modules === "object")
        setModules(payload.modules as typeof modules);
    },
  });
  return (
    <section
      className="journal-spread privacy-spread"
      aria-labelledby="privacy-title"
    >
      <div className="spread-page privacy-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">utilities · privacy controls</p>
        <h2 id="privacy-title">
          Keep sensitive
          <br />
          <em>things in your hands.</em>
        </h2>
        <p className="page-intro">
          These are prototype display preferences for your private journal. They
          control what this interface shows; no production persistence or
          notifications are active yet.
        </p>
        <div className="privacy-signal">
          <HeartPulse size={15} />
          <span>
            {privateMode ? "Private mode is on" : "Private mode is off"}
          </span>
        </div>
      </div>
      <div className="spread-page privacy-page">
        <AccountPanel />
        <label className="privacy-toggle">
          <input
            type="checkbox"
            checked={privateMode}
            onChange={event => setPrivateMode(event.target.checked)}
          />
          <span>
            <b>Private mode</b>
            <small>Hide sensitive summaries while this journal is open.</small>
          </span>
        </label>
        <label className="privacy-toggle">
          <input
            type="checkbox"
            checked={sensitiveSummaries}
            disabled={privateMode}
            onChange={event => setSensitiveSummaries(event.target.checked)}
          />
          <span>
            <b>Show sensitive dashboard summaries</b>
            <small>
              {privateMode
                ? "Private mode currently overrides this choice."
                : "Applies to health, finance, documents, and security summaries."}
            </small>
          </span>
        </label>
        <label className="preview-choice">
          Lock-screen notification preview
          <select
            value={previewMode}
            onChange={event => setPreviewMode(event.target.value)}
          >
            <option>Hide sensitive names</option>
            <option>Show a general reminder only</option>
            <option>Hide all reminder previews</option>
          </select>
        </label>
        <div className="privacy-modules">
          <span>Protect these sensitive modules</span>
          {(
            [
              "menstrual",
              "wellbeing",
              "finances",
              "documents",
              "security",
            ] as const
          ).map(module => (
            <label key={module}>
              <input
                type="checkbox"
                checked={modules[module]}
                onChange={() =>
                  setModules(current => ({
                    ...current,
                    [module]: !current[module],
                  }))
                }
              />
              <b>{module}</b>
              <small>
                {modules[module]
                  ? "private display rule active"
                  : "not included"}
              </small>
            </label>
          ))}
        </div>
        <div className="privacy-summary">
          <span>Current interface rule</span>
          <b>
            {privateMode
              ? "Sensitive summaries hidden"
              : sensitiveSummaries
                ? "Sensitive summaries visible in this prototype"
                : "Sensitive summaries hidden"}
          </b>
          <small>
            Preview setting: {previewMode}. This is an interface preference only
            until a storage and notification design is approved.
          </small>
        </div>
      </div>
    </section>
  );
}

function InsightsPage({
  onContents,
  onCover,
  activity,
  onOpenSource,
}: {
  onContents: () => void;
  onCover: () => void;
  activity: InsightActivity[];
  onOpenSource: (destination: View) => void;
}) {
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [muted, setMuted] = useState<Record<string, boolean>>({});
  const [period, setPeriod] = useState<AnalyticsPeriod>("7d");
  const [firstSource, setFirstSource] = useState("Productivity");
  const [secondSource, setSecondSource] = useState("Habits");
  useMongoJournalScope({
    scope: "insights",
    payload: { saved, muted, period, firstSource, secondSource },
    hydrate: payload => {
      if (payload.saved && typeof payload.saved === "object")
        setSaved(payload.saved as Record<string, boolean>);
      if (payload.muted && typeof payload.muted === "object")
        setMuted(payload.muted as Record<string, boolean>);
      if (
        payload.period === "today" ||
        payload.period === "7d" ||
        payload.period === "30d" ||
        payload.period === "all"
      )
        setPeriod(payload.period);
      if (typeof payload.firstSource === "string")
        setFirstSource(payload.firstSource);
      if (typeof payload.secondSource === "string")
        setSecondSource(payload.secondSource);
    },
  });
  const reviewActivity = filterAnalyticsActivityByPeriod(activity, period);
  const activitySummary = localActivitySummary(reviewActivity);
  const sourceOptions = Array.from(
    new Set([
      "Productivity",
      "Habits",
      "Learning",
      "Study Sessions",
      "Time",
      "Goals",
      "Finances",
      "Tasks",
      "Assignments",
      "Reflections",
      "Wellbeing",
      "Sleep",
      "Nutrition",
      "Portrait",
      ...activity.map(entry => entry.module),
    ])
  ).sort();
  const sourceComparison = compareLocalActivitySources(
    reviewActivity,
    firstSource,
    secondSource
  );
  const sourceDestinations: Record<string, View | undefined> = {
    Productivity: "productivity",
    Habits: "habits",
    Learning: "learning",
    Reflections: "reflections",
    Wellbeing: "wellbeing",
    Sleep: "sleep",
    Nutrition: "nutrition",
    Portrait: "portraits",
    Tasks: "tasks",
    Assignments: "assignments",
    "Study Sessions": "studySessions",
    Goals: "goals",
    Time: "time",
    Finances: "finances",
  };
  const evidenceLabel =
    reviewActivity.length >= 6
      ? "descriptive evidence"
      : reviewActivity.length >= 3
        ? "early evidence"
        : "too little for a pattern";
  const visibleDates =
    Array.from(new Set(reviewActivity.map(entry => entry.createdAt)))
      .slice(0, 4)
      .join(", ") || "No saved dates";
  const periodLabel: Record<AnalyticsPeriod, string> = {
    today: "Today",
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    all: "This open session",
  };
  const insights = reviewActivity.length
    ? [
        {
          id: "local-ledger",
          label: "Direct local summary",
          title: `${activitySummary.recordCount} saved action${activitySummary.recordCount === 1 ? "" : "s"} across ${activitySummary.moduleSummaries.length} journal area${activitySummary.moduleSummaries.length === 1 ? "" : "s"}`,
          source: `Source: ${activitySummary.recordCount} explicit saved entries from ${visibleDates}. This is a record summary, not a pattern or a judgement.`,
          evidence: "direct records",
          destination: undefined,
        },
        ...activitySummary.moduleSummaries.slice(0, 3).map(summary => ({
          id: `area-${summary.module}`,
          label: "Local record detail",
          title: `${summary.module} · ${summary.records} saved ${summary.records === 1 ? "record" : "records"}`,
          source: `Source: ${summary.total} ${summary.unit === "minutes" ? "recorded minutes" : summary.total === 1 ? "entry" : "entries"} in ${summary.module}. This describes what was saved; it does not explain why it happened or what to do next.`,
          evidence:
            summary.records >= 3 && reviewActivity.length >= 6
              ? "descriptive evidence"
              : "early evidence",
          destination: sourceDestinations[summary.module],
        })),
      ]
    : [
        {
          id: "insight-empty",
          label: "Data availability",
          title: "No local activity record yet",
          source:
            "Source: 0 connected actions saved in this open journal session. Analytics and Insights intentionally leave this empty instead of assuming a pattern.",
          evidence: "not available",
          destination: undefined,
        },
      ];

  return (
    <section
      className="journal-spread insights-spread"
      aria-labelledby="insights-title"
    >
      <div className="spread-page insights-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">utilities · insights</p>
        <h2 id="insights-title">
          Observe a pattern,
          <br />
          <em>keep your agency.</em>
        </h2>
        <p className="page-intro">
          An insight begins with the records you chose to save. Each card names
          its source, its evidence level, and what it cannot conclude.
        </p>
        <div className="insights-signal">
          <Sparkles size={15} />
          <span>
            {Object.values(saved).filter(Boolean).length} insights kept ·{" "}
            {evidenceLabel}
          </span>
        </div>
      </div>
      <div className="spread-page insights-page">
        <header className="insights-evidence-ledger">
          <div>
            <span>evidence ledger</span>
            <b>
              {activitySummary.recordCount} saved actions ·{" "}
              {activitySummary.moduleSummaries.length} areas
            </b>
          </div>
          <small>
            {reviewActivity.length >= 6
              ? "There is enough local activity to describe repeated records, but not to claim cause."
              : "A repeated pattern needs a longer, user-chosen local record. No causal claim is shown here."}
          </small>
        </header>
        <section
          className="insights-review-controls"
          aria-label="Insights review controls"
        >
          <div>
            <span>Review period</span>
            <small>{periodLabel[period]}</small>
          </div>
          <div>
            {(["today", "7d", "30d", "all"] as AnalyticsPeriod[]).map(
              option => (
                <button
                  key={option}
                  type="button"
                  className={cn(period === option && "active")}
                  onClick={() => setPeriod(option)}
                >
                  {option === "7d"
                    ? "7 days"
                    : option === "30d"
                      ? "30 days"
                      : option === "all"
                        ? "Session"
                        : "Today"}
                </button>
              )
            )}
          </div>
        </section>
        <section
          className="insights-comparison"
          aria-labelledby="insights-comparison-title"
        >
          <div className="insights-comparison-heading">
            <span id="insights-comparison-title">
              Choose a local count comparison
            </span>
            <small>compares saved record counts only</small>
          </div>
          <div className="insights-comparison-selects">
            <label>
              First source
              <select
                value={firstSource}
                onChange={event => setFirstSource(event.target.value)}
              >
                {sourceOptions.map(source => (
                  <option key={source}>{source}</option>
                ))}
              </select>
            </label>
            <label>
              Second source
              <select
                value={secondSource}
                onChange={event => setSecondSource(event.target.value)}
              >
                {sourceOptions.map(source => (
                  <option key={source}>{source}</option>
                ))}
              </select>
            </label>
          </div>
          {sourceComparison.evidence === "descriptive" ? (
            <p>
              <b>
                {sourceComparison.direction === "first"
                  ? firstSource
                  : sourceComparison.direction === "second"
                    ? secondSource
                    : "The two sources"}{" "}
                has{" "}
                {sourceComparison.direction === "similar"
                  ? "a similar"
                  : "a higher"}{" "}
                saved-record count.
              </b>
              <span>
                {firstSource}: {sourceComparison.firstCount} · {secondSource}:{" "}
                {sourceComparison.secondCount} in{" "}
                {periodLabel[period].toLowerCase()}. This is a count difference,
                not a relationship, effect, or recommendation.
              </span>
            </p>
          ) : (
            <p>
              <b>Not enough local coverage for this comparison.</b>
              <span>
                {firstSource}: {sourceComparison.firstCount} · {secondSource}:{" "}
                {sourceComparison.secondCount}. Choose two different sources and
                record at least three entries in each within this review period.
              </span>
            </p>
          )}
        </section>
        <div className="insight-list">
          {insights.map(insight =>
            muted[insight.id] ? null : (
              <article key={insight.id}>
                <span>{insight.label}</span>
                <b>{insight.title}</b>
                <small>{insight.source}</small>
                <em>Evidence: {insight.evidence}</em>
                <div>
                  <button
                    type="button"
                    className={cn(saved[insight.id] && "saved")}
                    onClick={() =>
                      setSaved(current => ({
                        ...current,
                        [insight.id]: !current[insight.id],
                      }))
                    }
                  >
                    {saved[insight.id] ? "Kept" : "Keep"}
                  </button>
                  {insight.destination ? (
                    <button
                      type="button"
                      onClick={() => onOpenSource(insight.destination!)}
                    >
                      Open source
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      setMuted(current => ({ ...current, [insight.id]: true }))
                    }
                  >
                    Mute
                  </button>
                </div>
              </article>
            )
          )}
        </div>
        <section className="insight-method-note">
          <b>How to read this page</b>
          <span>
            It can summarise or describe repeated local records. It does not
            infer health effects, productivity quality, security status, or a
            reason behind an observation.
          </span>
        </section>
        {Object.values(muted).some(Boolean) ? (
          <button
            className="restore-insights"
            type="button"
            onClick={() => setMuted({})}
          >
            Restore muted insights
          </button>
        ) : null}
      </div>
    </section>
  );
}

function LegacyInsightsPage({
  onContents,
  onCover,
  activity,
}: {
  onContents: () => void;
  onCover: () => void;
  activity: InsightActivity[];
}) {
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [muted, setMuted] = useState<Record<string, boolean>>({});
  const focusSessions = activity.filter(
    entry => entry.module === "Productivity"
  );
  const habitCompletions = activity.filter(entry => entry.module === "Habits");
  const focusMinutes = focusSessions.reduce(
    (total, entry) => total + entry.amount,
    0
  );
  const focusConfidence =
    focusSessions.length >= 3
      ? "moderate"
      : focusSessions.length > 0
        ? "early"
        : "not available";
  const habitConfidence =
    habitCompletions.length >= 3
      ? "moderate"
      : habitCompletions.length > 0
        ? "early"
        : "not available";
  const insights = [
    focusSessions.length > 0
      ? {
          id: "focus-activity",
          label: "Recorded activity",
          title: `${focusSessions.length} focus session${focusSessions.length === 1 ? "" : "s"} · ${focusMinutes} total minutes`,
          source: `Source: ${focusSessions.map(entry => entry.createdAt).join(", ")} Productivity records. Confidence: ${focusConfidence}; this is a direct session summary, not a performance judgement.`,
          action: "Review your next focus intention",
        }
      : {
          id: "focus-empty",
          label: "Data availability",
          title: "No focus sessions recorded in this journal session yet",
          source:
            "Source: 0 saved Productivity completions. Confidence: not available until you record a session.",
          action: "Complete a focus session when ready",
        },
    habitCompletions.length > 0
      ? {
          id: "habit-activity",
          label: "Recorded activity",
          title: `${habitCompletions.length} habit completion${habitCompletions.length === 1 ? "" : "s"} recorded`,
          source: `Source: ${habitCompletions.map(entry => entry.label).join(", ")}. Confidence: ${habitConfidence}; this counts recorded completions only.`,
          action: "Choose a habit for today",
        }
      : {
          id: "habit-empty",
          label: "Data availability",
          title:
            "No newly completed habits recorded in this journal session yet",
          source:
            "Source: 0 new Habit completions captured after the journal opened. Confidence: not available.",
          action: "Mark a habit complete if it helps",
        },
  ];
  return (
    <section
      className="journal-spread insights-spread"
      aria-labelledby="insights-title"
    >
      <div className="spread-page insights-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">utilities · insights</p>
        <h2 id="insights-title">
          Observe a pattern,
          <br />
          <em>keep your agency.</em>
        </h2>
        <p className="page-intro">
          Insights are not instructions. Each one names its source and
          uncertainty, and you decide whether to save it, mute it, or take a
          small next step.
        </p>
        <div className="insights-signal">
          <Sparkles size={15} />
          <span>
            {Object.values(saved).filter(Boolean).length} insights kept for
            later
          </span>
        </div>
      </div>
      <div className="spread-page insights-page">
        <div className="insight-list">
          {insights.map(insight =>
            muted[insight.id] ? null : (
              <article key={insight.id}>
                <span>{insight.label}</span>
                <b>{insight.title}</b>
                <small>{insight.source}</small>
                <div>
                  <button
                    type="button"
                    className={cn(saved[insight.id] && "saved")}
                    onClick={() =>
                      setSaved(current => ({
                        ...current,
                        [insight.id]: !current[insight.id],
                      }))
                    }
                  >
                    {saved[insight.id] ? "Saved" : "Save insight"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setMuted(current => ({ ...current, [insight.id]: true }))
                    }
                  >
                    Mute
                  </button>
                </div>
                <em>Optional follow-up: {insight.action}</em>
              </article>
            )
          )}
        </div>
        {Object.values(muted).some(Boolean) ? (
          <button
            className="restore-insights"
            type="button"
            onClick={() => setMuted({})}
          >
            Restore muted insights
          </button>
        ) : null}
      </div>
    </section>
  );
}

function AnalyticsPage({
  activity,
  onContents,
  onCover,
  onOpenSource,
}: {
  activity: InsightActivity[];
  onContents: () => void;
  onCover: () => void;
  onOpenSource: (destination: View) => void;
}) {
  const pixelStore = useContext(PixelsTrackerContext);
  const [period, setPeriod] = useState<AnalyticsPeriod>("7d");
  useMongoJournalScope({
    scope: "analytics",
    payload: { period },
    hydrate: payload => {
      if (
        payload.period === "today" ||
        payload.period === "7d" ||
        payload.period === "30d" ||
        payload.period === "all"
      )
        setPeriod(payload.period);
    },
  });
  const filteredActivity = filterAnalyticsActivityByPeriod(activity, period);
  const activitySummary = localActivitySummary(filteredActivity);
  const pixelsSummary = localPixelSummary(pixelStore?.records ?? {});
  const trend = descriptiveActivityTrend(activity);
  const periodLabel: Record<AnalyticsPeriod, string> = {
    today: "Today",
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    all: "This open session",
  };
  const sourceDestinations: Record<string, View | undefined> = {
    Productivity: "productivity",
    Habits: "habits",
    Learning: "learning",
    Reflections: "reflections",
    Wellbeing: "wellbeing",
    Sleep: "sleep",
    Nutrition: "nutrition",
    Portrait: "portraits",
    Tasks: "tasks",
    Assignments: "assignments",
    "Study Sessions": "studySessions",
    Goals: "goals",
    Time: "time",
    Finances: "finances",
  };
  const isTimedModule = (module: string) =>
    ["Productivity", "Learning", "Study Sessions", "Time"].includes(module);

  return (
    <section
      className="journal-spread analytics-spread"
      aria-labelledby="analytics-title"
    >
      <div className="spread-page analytics-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">utilities · analytics</p>
        <h2 id="analytics-title">
          Read what you
          <br />
          <em>actually recorded.</em>
        </h2>
        <p className="page-intro">
          A private reading room for the local actions you explicitly save.
          Review windows, sources, and low-data limits stay visible so a count
          never pretends to be more than it is.
        </p>
        <div className="analytics-signal">
          <Compass size={15} />
          <span>Local records only · no score or prediction</span>
        </div>
      </div>
      <div className="spread-page analytics-page">
        <InsightsPanel />
        <ReviewPanel />
        <header className="analytics-page-heading">
          <span>your local record</span>
          <b>Quiet facts, kept in context</b>
          <small>
            This page reads only the actions connected during this open journal
            session and the shared annual Pixels marks. It does not inspect
            accounts, devices, or any external service.
          </small>
        </header>
        <section
          className="analytics-periods"
          aria-label="Analytics review period"
        >
          <div>
            <span>Review period</span>
            <small>{periodLabel[period]}</small>
          </div>
          <div>
            {(["today", "7d", "30d", "all"] as AnalyticsPeriod[]).map(
              option => (
                <button
                  key={option}
                  type="button"
                  className={cn(period === option && "active")}
                  onClick={() => setPeriod(option)}
                >
                  {option === "7d"
                    ? "7 days"
                    : option === "30d"
                      ? "30 days"
                      : option === "all"
                        ? "Session"
                        : "Today"}
                </button>
              )
            )}
          </div>
        </section>
        <div className="analytics-ledger" aria-label="Local analytics overview">
          <article>
            <span>recorded moments</span>
            <b>{activitySummary.recordCount}</b>
            <small>{periodLabel[period].toLowerCase()} · saved actions</small>
          </article>
          <article>
            <span>timed practice</span>
            <b>{activitySummary.trackedMinutes}</b>
            <small>
              minutes from linked focus, study, learning, and time logs
            </small>
          </article>
          <article>
            <span>year marks</span>
            <b>{pixelsSummary.markedDays}</b>
            <small>
              all recorded annual marks · {pixelsSummary.activeTrackers} active{" "}
              {pixelsSummary.activeTrackers === 1 ? "tracker" : "trackers"}
            </small>
          </article>
        </div>
        <section
          className="analytics-trend"
          aria-labelledby="analytics-comparison"
        >
          <div className="analytics-section-heading">
            <span id="analytics-comparison">7-day record comparison</span>
            <small>descriptive count only</small>
          </div>
          {trend.evidence === "descriptive" ? (
            <p>
              <b>
                {trend.direction === "more"
                  ? "More"
                  : trend.direction === "fewer"
                    ? "Fewer"
                    : "A similar number of"}{" "}
                saved actions
              </b>
              <span>
                {trend.currentCount} in the most recent 7 days compared with{" "}
                {trend.previousCount} in the prior 7 days. This does not explain
                why the count changed.
              </span>
            </p>
          ) : (
            <p>
              <b>Not enough local history for a comparison.</b>
              <span>
                {trend.currentCount} recent and {trend.previousCount}{" "}
                prior-period records are available. A descriptive comparison
                needs at least three in each 7-day window.
              </span>
            </p>
          )}
        </section>
        <section
          className="analytics-section"
          aria-labelledby="analytics-by-module"
        >
          <div className="analytics-section-heading">
            <span id="analytics-by-module">by journal area</span>
            <small>open a source to review its local record</small>
          </div>
          {activitySummary.moduleSummaries.length ? (
            <div className="analytics-module-list">
              {activitySummary.moduleSummaries.map(summary => {
                const destination =
                  sourceDestinations[
                    summary.module as InsightActivity["module"]
                  ];
                return (
                  <article key={summary.module}>
                    <div>
                      <b>{summary.module}</b>
                      <small>
                        {summary.records}{" "}
                        {summary.records === 1 ? "record" : "records"}
                      </small>
                    </div>
                    <strong>
                      {summary.total}{" "}
                      {summary.unit === "minutes"
                        ? "min"
                        : summary.total === 1
                          ? "entry"
                          : "entries"}
                    </strong>
                    {destination ? (
                      <button
                        type="button"
                        onClick={() => onOpenSource(destination)}
                      >
                        Open
                      </button>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="analytics-empty">
              <b>No saved actions in this review period.</b>
              <small>
                Choose another period, or finish a linked local action to begin
                this record. Analytics never fills a gap with assumed activity.
              </small>
            </div>
          )}
        </section>
        <section
          className="analytics-section analytics-source-ledger"
          aria-labelledby="analytics-sources"
        >
          <div className="analytics-section-heading">
            <span id="analytics-sources">connected sources</span>
            <small>what this page can and cannot read</small>
          </div>
          <article>
            <b>Connected saved actions</b>
            <small>
              Productivity, Habits, Learning, Reflections, Wellbeing, Sleep,
              Nutrition, Portraits, Tasks, Assignments, Study Sessions, Goals,
              Time, and Finances contribute only when an action is explicitly
              saved.
            </small>
          </article>
          <article>
            <b>Connected annual marks</b>
            <small>
              Movement, mood, water, nourishment, sleep, habit, focus, and
              learning Pixels are counted as an all-time annual record.
            </small>
          </article>
          <article className="is-unavailable">
            <b>Not connected to Analytics yet</b>
            <small>
              Documents, Security, Digital Life, Courses, Exams, Period & Cycle,
              and other private workspaces remain outside this reading room
              until a future local source is deliberately added.
            </small>
          </article>
        </section>
        <section
          className="analytics-section"
          aria-labelledby="analytics-recent"
        >
          <div className="analytics-section-heading">
            <span id="analytics-recent">recent local activity</span>
            <small>latest three in this review period</small>
          </div>
          {activitySummary.recent.length ? (
            <div className="analytics-recent-list">
              {activitySummary.recent.map(record => {
                const destination = sourceDestinations[record.module];
                return (
                  <article key={record.id}>
                    <i>{record.module.slice(0, 1)}</i>
                    <div>
                      <b>{record.label}</b>
                      <small>
                        {record.module} · {record.createdAt}
                      </small>
                    </div>
                    <strong>
                      {isTimedModule(record.module)
                        ? `${record.amount} min`
                        : `${record.amount} ${record.amount === 1 ? "entry" : "entries"}`}
                    </strong>
                    {destination ? (
                      <button
                        type="button"
                        onClick={() => onOpenSource(destination)}
                      >
                        Open
                      </button>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="analytics-empty compact">
              <b>Nothing saved in this review period.</b>
              <small>
                Your record will appear after you explicitly save an activity in
                a connected workspace.
              </small>
            </div>
          )}
        </section>
        <p className="analytics-boundary">
          These are descriptive local counts, not an assessment of you.
          Analytics offers no score, automated recommendation, causal
          explanation, health conclusion, productivity judgement, or security
          claim.
        </p>
      </div>
    </section>
  );
}

function LegacyFactualAnalyticsPage({
  activity,
  onContents,
  onCover,
  onOpenSource,
}: {
  activity: InsightActivity[];
  onContents: () => void;
  onCover: () => void;
  onOpenSource: (destination: View) => void;
}) {
  const pixelStore = useContext(PixelsTrackerContext);
  const activitySummary = localActivitySummary(activity);
  const pixelsSummary = localPixelSummary(pixelStore?.records ?? {});

  return (
    <section
      className="journal-spread analytics-spread"
      aria-labelledby="analytics-title"
    >
      <div className="spread-page analytics-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">utilities · analytics</p>
        <h2 id="analytics-title">
          Read what you
          <br />
          <em>actually recorded.</em>
        </h2>
        <p className="page-intro">
          A private reading room for the local journal entries you create in
          this visit. Totals show their source and stay empty when there is
          nothing to read.
        </p>
        <div className="analytics-signal">
          <Compass size={15} />
          <span>Local records only · no score or prediction</span>
        </div>
      </div>
      <div className="spread-page analytics-page">
        <header className="analytics-page-heading">
          <span>your local record</span>
          <b>Quiet facts, kept in context</b>
          <small>
            This page reads in-session activity and the shared year-at-a-glance
            marks only. It does not inspect accounts, devices, or any external
            service.
          </small>
        </header>
        <div className="analytics-ledger" aria-label="Local analytics overview">
          <article>
            <span>recorded moments</span>
            <b>{activitySummary.recordCount}</b>
            <small>saved activity items</small>
          </article>
          <article>
            <span>timed practice</span>
            <b>{activitySummary.trackedMinutes}</b>
            <small>minutes from focus and learning</small>
          </article>
          <article>
            <span>year marks</span>
            <b>{pixelsSummary.markedDays}</b>
            <small>
              across {pixelsSummary.activeTrackers} active{" "}
              {pixelsSummary.activeTrackers === 1 ? "tracker" : "trackers"}
            </small>
          </article>
        </div>
        <section
          className="analytics-section"
          aria-labelledby="analytics-by-module"
        >
          <div className="analytics-section-heading">
            <span id="analytics-by-module">by journal area</span>
            <small>from local activity records</small>
          </div>
          {activitySummary.moduleSummaries.length ? (
            <div className="analytics-module-list">
              {activitySummary.moduleSummaries.map(summary => (
                <article key={summary.module}>
                  <div>
                    <b>{summary.module}</b>
                    <small>
                      {summary.records}{" "}
                      {summary.records === 1 ? "record" : "records"}
                    </small>
                  </div>
                  <strong>
                    {summary.total}{" "}
                    {summary.unit === "minutes"
                      ? "min"
                      : summary.total === 1
                        ? "entry"
                        : "entries"}
                  </strong>
                </article>
              ))}
            </div>
          ) : (
            <div className="analytics-empty">
              <b>No activity entries yet.</b>
              <small>
                Finish or save a focus, learning, reflection, or other linked
                journal action to see it here.
              </small>
            </div>
          )}
        </section>
        <section
          className="analytics-section"
          aria-labelledby="analytics-recent"
        >
          <div className="analytics-section-heading">
            <span id="analytics-recent">recent local activity</span>
            <small>latest three saved items</small>
          </div>
          {activitySummary.recent.length ? (
            <div className="analytics-recent-list">
              {activitySummary.recent.map(record => (
                <article key={record.id}>
                  <i>{record.module.slice(0, 1)}</i>
                  <div>
                    <b>{record.label}</b>
                    <small>
                      {record.module} · {record.createdAt}
                    </small>
                  </div>
                  <strong>
                    {["Productivity", "Learning"].includes(record.module)
                      ? `${record.amount} min`
                      : `${record.amount} ${record.amount === 1 ? "entry" : "entries"}`}
                  </strong>
                </article>
              ))}
            </div>
          ) : (
            <div className="analytics-empty compact">
              <b>Nothing saved in this visit.</b>
              <small>
                Your record will appear after you explicitly save an activity in
                a linked workspace.
              </small>
            </div>
          )}
        </section>
        <p className="analytics-boundary">
          These are descriptive local counts, not an assessment of you.
          Analytics does not offer automated recommendations or make health,
          productivity, or security claims.
        </p>
      </div>
    </section>
  );
}

function LegacyAnalyticsPage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  const [recommendationsEnabled, setRecommendationsEnabled] = useState(false);
  const [includedModules, setIncludedModules] = useState({
    habits: true,
    sleep: true,
    water: false,
    productivity: true,
  });
  const [recommendationState, setRecommendationState] = useState<
    "shown" | "snoozed" | "dismissed"
  >("shown");
  const [suggestionSize, setSuggestionSize] = useState("15 minutes");
  return (
    <section
      className="journal-spread analytics-spread"
      aria-labelledby="analytics-title"
    >
      <div className="spread-page analytics-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">utilities · analytics</p>
        <h2 id="analytics-title">
          See the signal,
          <br />
          <em>keep the context.</em>
        </h2>
        <p className="page-intro">
          Every card says what it is: a fact you recorded, a calculation, a
          pattern from enough entries, or an optional suggestion you can
          control.
        </p>
        <div className="analytics-signal">
          <Sparkles size={15} />
          <span>Prototype explanations · no hidden scoring</span>
        </div>
      </div>
      <div className="spread-page analytics-page">
        <div className="analytic-stack">
          <article className="analytic-card fact">
            <span>Recorded fact</span>
            <b>2 completed focus sessions</b>
            <small>Source: your saved Productivity entries today.</small>
          </article>
          <article className="analytic-card calculation">
            <span>Calculated summary</span>
            <b>46% of your water goal</b>
            <small>Math: logged water ÷ the goal you set.</small>
          </article>
          <article className="analytic-card pattern">
            <span>Observed pattern</span>
            <b>Not enough history yet</b>
            <small>
              Patterns appear only after several saved entries and will always
              show the modules used.
            </small>
          </article>
        </div>
        <div className="recommendation-control">
          <div>
            <span>Optional recommendations</span>
            <button
              type="button"
              className={cn(recommendationsEnabled && "on")}
              onClick={() => {
                setRecommendationsEnabled(current => !current);
                setRecommendationState("shown");
              }}
              aria-pressed={recommendationsEnabled}
            >
              {recommendationsEnabled ? "On" : "Off"}
            </button>
          </div>
          <p>
            {recommendationsEnabled
              ? "You control which modules can inform a suggestion."
              : "Suggestions remain off until you choose to enable them."}
          </p>
          <div className="analytic-modules">
            {(["habits", "sleep", "water", "productivity"] as const).map(
              module => (
                <label key={module}>
                  <input
                    type="checkbox"
                    checked={includedModules[module]}
                    disabled={!recommendationsEnabled}
                    onChange={() =>
                      setIncludedModules(current => ({
                        ...current,
                        [module]: !current[module],
                      }))
                    }
                  />
                  <span>{module}</span>
                </label>
              )
            )}
          </div>
          {recommendationsEnabled && recommendationState === "shown" ? (
            <article className="analytic-card recommendation">
              <span>Optional recommendation</span>
              <b>Start with one {suggestionSize.toLowerCase()} focus block</b>
              <small>
                Why: you enabled Productivity in this prototype. Adjust, snooze,
                dismiss, or disable this any time.
              </small>
              <label className="suggestion-adjust">
                Adjust size
                <select
                  value={suggestionSize}
                  onChange={event => setSuggestionSize(event.target.value)}
                >
                  <option>10 minutes</option>
                  <option>15 minutes</option>
                  <option>25 minutes</option>
                </select>
              </label>
              <div className="recommendation-actions">
                <button
                  type="button"
                  onClick={() => setRecommendationState("snoozed")}
                >
                  Snooze
                </button>
                <button
                  type="button"
                  onClick={() => setRecommendationState("dismissed")}
                >
                  Dismiss
                </button>
              </div>
            </article>
          ) : recommendationsEnabled ? (
            <div className="recommendation-paused">
              <span>
                {recommendationState === "snoozed"
                  ? "Suggestion snoozed for this check-in."
                  : "Suggestion dismissed."}
              </span>
              <button
                type="button"
                onClick={() => setRecommendationState("shown")}
              >
                Show again
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function PortfolioPage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  type PortfolioProject = {
    title: string;
    role: string;
    evidence: string;
    presentation: string;
    readiness: string;
  };
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [draft, setDraft] = useState<PortfolioProject>({
    title: "",
    role: "",
    evidence: "",
    presentation: "",
    readiness: "Private draft",
  });
  useMongoJournalScope({
    scope: "portfolio",
    payload: { projects },
    hydrate: payload => {
      if (Array.isArray(payload.projects))
        setProjects(payload.projects as PortfolioProject[]);
    },
  });
  function addProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    setProjects(current => [
      ...current,
      { ...draft, title: draft.title.trim() },
    ]);
    setDraft({
      title: "",
      role: "",
      evidence: "",
      presentation: "",
      readiness: "Private draft",
    });
  }
  return (
    <section
      className="journal-spread portfolio-spread"
      aria-labelledby="portfolio-title"
    >
      <div className="spread-page portfolio-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">life · career · portfolio</p>
        <h2 id="portfolio-title">
          Let your work
          <br />
          <em>be easy to find.</em>
        </h2>
        <p className="page-intro">
          Keep project evidence, the role you played, and the presentation note
          that would help you share your work—without publishing anything from
          this prototype.
        </p>
        <div className="portfolio-signal">
          <Sparkles size={15} />
          <span>{projects.length} projects in your portfolio</span>
        </div>
      </div>
      <div className="spread-page portfolio-page">
        <form className="portfolio-form" onSubmit={addProject}>
          <label>
            Project title
            <input
              value={draft.title}
              onChange={event =>
                setDraft(current => ({ ...current, title: event.target.value }))
              }
              placeholder="e.g. Habit tracker case study"
            />
          </label>
          <label>
            Your role or contribution
            <input
              value={draft.role}
              onChange={event =>
                setDraft(current => ({ ...current, role: event.target.value }))
              }
              placeholder="What did you make, lead, or learn?"
            />
          </label>
          <label>
            Evidence or outcome
            <input
              value={draft.evidence}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  evidence: event.target.value,
                }))
              }
              placeholder="A result, artifact, or proof point"
            />
          </label>
          <label>
            Presentation note
            <input
              value={draft.presentation}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  presentation: event.target.value,
                }))
              }
              placeholder="What would help you explain it clearly?"
            />
          </label>
          <label>
            Visibility readiness
            <select
              value={draft.readiness}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  readiness: event.target.value,
                }))
              }
            >
              <option>Private draft</option>
              <option>Needs a revision</option>
              <option>Ready to share</option>
            </select>
          </label>
          <Button type="submit" className="ink-button">
            <Plus size={15} /> Save portfolio project
          </Button>
        </form>
        <div className="portfolio-list">
          <div>
            <span>portfolio shelf</span>
            <b>{projects.length} projects</b>
          </div>
          {projects.length === 0 ? (
            <small>
              Start with a project that would be useful to see in one clear,
              proud place.
            </small>
          ) : (
            projects.map((project, index) => (
              <article key={`${project.title}-${index}`}>
                <i>{project.title.slice(0, 1)}</i>
                <p>
                  <b>{project.title}</b>
                  <small>
                    {project.role || "Role to be described"} ·{" "}
                    {project.readiness}
                  </small>
                  <em>Evidence: {project.evidence || "Add an outcome"}</em>
                  <em>
                    Presentation:{" "}
                    {project.presentation || "Add a presentation note"}
                  </em>
                </p>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function SocialLifePage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  type ConnectionPlan = {
    person: string;
    plan: string;
    date: string;
    followThrough: string;
    note: string;
    reminder: string;
  };
  const [plans, setPlans] = useState<ConnectionPlan[]>([]);
  const [draft, setDraft] = useState<ConnectionPlan>({
    person: "",
    plan: "",
    date: "",
    followThrough: "",
    note: "",
    reminder: "No reminder",
  });
  useMongoJournalScope({
    scope: "social-life",
    payload: { plans },
    hydrate: payload => {
      if (Array.isArray(payload.plans))
        setPlans(payload.plans as ConnectionPlan[]);
    },
  });
  function addPlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.person.trim() || !draft.plan.trim()) return;
    setPlans(current => [
      ...current,
      { ...draft, person: draft.person.trim(), plan: draft.plan.trim() },
    ]);
    setDraft({
      person: "",
      plan: "",
      date: "",
      followThrough: "",
      note: "",
      reminder: "No reminder",
    });
  }
  return (
    <section
      className="journal-spread social-spread"
      aria-labelledby="social-title"
    >
      <div className="spread-page social-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">life · social life</p>
        <h2 id="social-title">
          Let connection
          <br />
          <em>have a place.</em>
        </h2>
        <p className="page-intro">
          Keep plans, follow-through, and a small note about how connection
          felt—without turning relationships into a scorecard.
        </p>
        <div className="social-signal">
          <HeartPulse size={15} />
          <span>{plans.length} connection plans held</span>
        </div>
      </div>
      <div className="spread-page social-page">
        <form className="social-form" onSubmit={addPlan}>
          <label>
            Person or group
            <input
              value={draft.person}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  person: event.target.value,
                }))
              }
              placeholder="Use a name, initials, or a group"
            />
          </label>
          <label>
            Plan or intention
            <input
              value={draft.plan}
              onChange={event =>
                setDraft(current => ({ ...current, plan: event.target.value }))
              }
              placeholder="e.g. Call, coffee, or send a message"
            />
          </label>
          <div>
            <label>
              Date
              <input
                type="date"
                value={draft.date}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Optional reminder
              <select
                value={draft.reminder}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    reminder: event.target.value,
                  }))
                }
              >
                <option>No reminder</option>
                <option>Day before</option>
                <option>Morning of</option>
              </select>
            </label>
          </div>
          <label>
            Follow-through
            <input
              value={draft.followThrough}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  followThrough: event.target.value,
                }))
              }
              placeholder="A small next action"
            />
          </label>
          <label>
            Connection note
            <input
              value={draft.note}
              onChange={event =>
                setDraft(current => ({ ...current, note: event.target.value }))
              }
              placeholder="What would you like to remember?"
            />
          </label>
          <Button className="ink-button" type="submit">
            <Plus size={15} /> Save connection plan
          </Button>
        </form>
        <div className="social-list">
          <div>
            <span>connection notebook</span>
            <b>{plans.length} plans</b>
          </div>
          {plans.length === 0 ? (
            <small>
              Start with a person or group you would like to make space for.
            </small>
          ) : (
            plans.map((plan, index) => (
              <article key={`${plan.person}-${index}`}>
                <i>{plan.person.slice(0, 1)}</i>
                <p>
                  <b>{plan.person}</b>
                  <small>
                    {plan.plan}
                    {plan.date ? ` · ${plan.date}` : ""} · {plan.reminder}
                  </small>
                  <em>
                    Next:{" "}
                    {plan.followThrough || "Choose a small follow-through"}
                  </em>
                  <em>Note: {plan.note || "Add a note whenever you want"}</em>
                </p>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function CareerPage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  type CareerEntry = {
    direction: string;
    milestone: string;
    evidence: string;
    application: string;
    reflection: string;
  };
  const [entries, setEntries] = useState<CareerEntry[]>([]);
  const [draft, setDraft] = useState<CareerEntry>({
    direction: "",
    milestone: "",
    evidence: "",
    application: "",
    reflection: "",
  });
  useMongoJournalScope({
    scope: "career",
    payload: { entries },
    hydrate: payload => {
      if (Array.isArray(payload.entries))
        setEntries(payload.entries as CareerEntry[]);
    },
  });
  function addEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.direction.trim()) return;
    setEntries(current => [
      ...current,
      { ...draft, direction: draft.direction.trim() },
    ]);
    setDraft({
      direction: "",
      milestone: "",
      evidence: "",
      application: "",
      reflection: "",
    });
  }
  return (
    <section
      className="journal-spread career-spread"
      aria-labelledby="career-title"
    >
      <div className="spread-page career-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">life · career goals</p>
        <h2 id="career-title">
          Build a direction
          <br />
          <em>you can recognise.</em>
        </h2>
        <p className="page-intro">
          Collect the work you want to move toward, small evidence of your
          skills, and applications or conversations worth following through on.
        </p>
        <div className="career-signal">
          <Sparkles size={15} />
          <span>{entries.length} career directions held</span>
        </div>
      </div>
      <div className="spread-page career-page">
        <form className="career-form" onSubmit={addEntry}>
          <label>
            Role or direction
            <input
              value={draft.direction}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  direction: event.target.value,
                }))
              }
              placeholder="e.g. Junior product designer"
            />
          </label>
          <label>
            Next milestone
            <input
              value={draft.milestone}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  milestone: event.target.value,
                }))
              }
              placeholder="e.g. Refresh case study"
            />
          </label>
          <label>
            Portfolio evidence or proof of work
            <input
              value={draft.evidence}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  evidence: event.target.value,
                }))
              }
              placeholder="A project, course, or result to keep visible"
            />
          </label>
          <label>
            Application or follow-through
            <input
              value={draft.application}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  application: event.target.value,
                }))
              }
              placeholder="e.g. Apply, reach out, or prepare CV"
            />
          </label>
          <label>
            Reflective progress note
            <input
              value={draft.reflection}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  reflection: event.target.value,
                }))
              }
              placeholder="What did you learn or move forward?"
            />
          </label>
          <Button type="submit" className="ink-button">
            <Plus size={15} /> Save career direction
          </Button>
        </form>
        <div className="career-list">
          <div>
            <span>career notebook</span>
            <b>{entries.length} directions</b>
          </div>
          {entries.length === 0 ? (
            <small>
              Start with a direction that deserves a little more space in your
              week.
            </small>
          ) : (
            entries.map((entry, index) => (
              <article key={`${entry.direction}-${index}`}>
                <i>{entry.direction.slice(0, 1)}</i>
                <p>
                  <b>{entry.direction}</b>
                  <small>
                    Milestone: {entry.milestone || "Choose a next milestone"}
                  </small>
                  <em>Evidence: {entry.evidence || "Add evidence"}</em>
                  <em>
                    Follow-through: {entry.application || "Choose one action"}
                  </em>
                  <em>
                    Reflection: {entry.reflection || "Add a progress note"}
                  </em>
                </p>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function ResponsibilitiesPage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  type Responsibility = {
    title: string;
    owner: string;
    cadence: string;
    reminder: string;
    done: boolean;
  };
  const [responsibilities, setResponsibilities] = useState<Responsibility[]>(
    []
  );
  const [history, setHistory] = useState<
    Array<{ title: string; date: string }>
  >([]);
  const [draft, setDraft] = useState<Responsibility>({
    title: "",
    owner: "Me",
    cadence: "Weekly",
    reminder: "Day before",
    done: false,
  });
  useMongoJournalScope({
    scope: "responsibilities",
    payload: { responsibilities, history },
    hydrate: payload => {
      if (Array.isArray(payload.responsibilities))
        setResponsibilities(payload.responsibilities as Responsibility[]);
      if (Array.isArray(payload.history))
        setHistory(payload.history as Array<{ title: string; date: string }>);
    },
  });
  function addResponsibility(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    setResponsibilities(current => [
      ...current,
      { ...draft, title: draft.title.trim() },
    ]);
    setDraft({
      title: "",
      owner: "Me",
      cadence: "Weekly",
      reminder: "Day before",
      done: false,
    });
  }
  function toggleResponsibility(index: number) {
    const item = responsibilities[index];
    if (!item) return;
    if (!item.done)
      setHistory(current => [
        {
          title: item.title,
          date: new Date().toLocaleDateString("en", {
            month: "short",
            day: "numeric",
          }),
        },
        ...current,
      ]);
    setResponsibilities(current =>
      current.map((entry, position) =>
        position === index ? { ...entry, done: !entry.done } : entry
      )
    );
  }
  return (
    <section
      className="journal-spread responsibilities-spread"
      aria-labelledby="responsibilities-title"
    >
      <div className="spread-page responsibilities-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">life · responsibilities</p>
        <h2 id="responsibilities-title">
          Let repetition
          <br />
          <em>feel manageable.</em>
        </h2>
        <p className="page-intro">
          Keep recurring obligations distinct from one-off tasks. Name who owns
          it, how often it comes around, and how you want to be reminded.
        </p>
        <div className="responsibility-quote">
          <Sparkles size={15} />
          <span>{history.length} follow-through moments recorded</span>
        </div>
      </div>
      <div className="spread-page responsibilities-page">
        <form className="responsibility-form" onSubmit={addResponsibility}>
          <label>
            Responsibility
            <input
              value={draft.title}
              onChange={event =>
                setDraft(current => ({ ...current, title: event.target.value }))
              }
              placeholder="e.g. Review household supplies"
            />
          </label>
          <div>
            <label>
              Owned by
              <input
                value={draft.owner}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    owner: event.target.value,
                  }))
                }
                placeholder="Me or shared"
              />
            </label>
            <label>
              Repeats
              <select
                value={draft.cadence}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    cadence: event.target.value,
                  }))
                }
              >
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
                <option>Seasonally</option>
              </select>
            </label>
          </div>
          <label>
            Reminder preference
            <select
              value={draft.reminder}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  reminder: event.target.value,
                }))
              }
            >
              <option>Day before</option>
              <option>Morning of</option>
              <option>At due time</option>
              <option>No reminder</option>
            </select>
          </label>
          <Button className="ink-button" type="submit">
            <Plus size={15} /> Add responsibility
          </Button>
        </form>
        <div className="responsibility-list">
          <div>
            <span>current responsibilities</span>
            <b>{responsibilities.length} listed</b>
          </div>
          {responsibilities.length === 0 ? (
            <small>
              Start with one repeating obligation that deserves a steadier home.
            </small>
          ) : (
            responsibilities.map((item, index) => (
              <article
                className={cn(item.done && "done")}
                key={`${item.title}-${index}`}
              >
                <button
                  type="button"
                  onClick={() => toggleResponsibility(index)}
                >
                  {item.done ? "✓" : ""}
                </button>
                <p>
                  <b>{item.title}</b>
                  <small>
                    {item.owner} · {item.cadence} · {item.reminder}
                  </small>
                </p>
              </article>
            ))
          )}
        </div>
        <div className="responsibility-history">
          <div>
            <span>completion history</span>
            <b>{history.length} recorded</b>
          </div>
          {history.length === 0 ? (
            <small>
              When you complete a responsibility, it will stay here as a dated
              record.
            </small>
          ) : (
            history.slice(0, 3).map((item, index) => (
              <p key={`${item.title}-${index}`}>
                {item.date} · {item.title}
              </p>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function PurchasesPage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  type Purchase = {
    id: string;
    title: string;
    stage: string;
    returnDate: string;
    warranty: string;
    receipt: string;
    reflection: string;
  };
  type PurchaseDraft = Omit<Purchase, "id">;
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [draft, setDraft] = useState<PurchaseDraft>({
    title: "",
    stage: "Planned",
    returnDate: "",
    warranty: "",
    receipt: "",
    reflection: "",
  });
  useMongoJournalScope({
    scope: "purchases",
    payload: { purchases },
    hydrate: payload => {
      if (Array.isArray(payload.purchases))
        setPurchases(payload.purchases as Purchase[]);
    },
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<PurchaseDraft>({
    title: "",
    stage: "Planned",
    returnDate: "",
    warranty: "",
    receipt: "",
    reflection: "",
  });
  function addPurchase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    setPurchases(current => [
      ...current,
      { id: `${Date.now()}`, ...draft, title: draft.title.trim() },
    ]);
    setDraft({
      title: "",
      stage: "Planned",
      returnDate: "",
      warranty: "",
      receipt: "",
      reflection: "",
    });
  }
  function saveEdit(id: string) {
    if (!editDraft.title.trim()) return;
    setPurchases(current =>
      current.map(item =>
        item.id === id
          ? { id, ...editDraft, title: editDraft.title.trim() }
          : item
      )
    );
    setEditingId(null);
  }
  return (
    <section
      className="journal-spread purchases-spread"
      aria-labelledby="purchases-title"
    >
      <div className="spread-page purchases-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">life · purchases</p>
        <h2 id="purchases-title">
          Buy with a little
          <br />
          <em>more clarity.</em>
        </h2>
        <p className="page-intro">
          Keep a quiet record of planned or completed purchases, practical
          dates, and a later reflection—without storing receipt images or
          payment details.
        </p>
        <div className="purchase-note">
          <Sparkles size={15} />
          <span>Metadata only · no payment or receipt-file storage</span>
        </div>
      </div>
      <div className="spread-page purchases-page">
        <form className="purchase-form" onSubmit={addPurchase}>
          <label>
            Item or purchase
            <input
              value={draft.title}
              onChange={event =>
                setDraft(current => ({ ...current, title: event.target.value }))
              }
              placeholder="e.g. Desk lamp"
            />
          </label>
          <div>
            <label>
              Stage
              <select
                value={draft.stage}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    stage: event.target.value,
                  }))
                }
              >
                <option>Planned</option>
                <option>Purchased</option>
                <option>Returned</option>
              </select>
            </label>
            <label>
              Return-by date
              <input
                type="date"
                value={draft.returnDate}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    returnDate: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <label>
            Warranty or cover note
            <input
              value={draft.warranty}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  warranty: event.target.value,
                }))
              }
              placeholder="e.g. 12 months, keep provider name"
            />
          </label>
          <label>
            Receipt metadata
            <input
              value={draft.receipt}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  receipt: event.target.value,
                }))
              }
              placeholder="Store name, purchase date, or reference label only"
            />
          </label>
          <label>
            Later reflection
            <input
              value={draft.reflection}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  reflection: event.target.value,
                }))
              }
              placeholder="Was it useful, enjoyable, or worth repeating?"
            />
          </label>
          <Button className="ink-button" type="submit">
            <Plus size={15} /> Save purchase note
          </Button>
        </form>
        <div className="purchase-list">
          <div>
            <span>purchase notes</span>
            <b>{purchases.length} saved</b>
          </div>
          {purchases.length === 0 ? (
            <small>
              Add a future purchase, a return date, or a reflection only when it
              would help you decide or remember.
            </small>
          ) : (
            purchases.map(purchase => (
              <article key={purchase.id}>
                <i>{purchase.stage.slice(0, 1)}</i>
                {editingId === purchase.id ? (
                  <div className="purchase-review-form">
                    <input
                      value={editDraft.title}
                      onChange={event =>
                        setEditDraft(current => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                    />
                    <select
                      value={editDraft.stage}
                      onChange={event =>
                        setEditDraft(current => ({
                          ...current,
                          stage: event.target.value,
                        }))
                      }
                    >
                      <option>Planned</option>
                      <option>Purchased</option>
                      <option>Returned</option>
                    </select>
                    <input
                      type="date"
                      value={editDraft.returnDate}
                      onChange={event =>
                        setEditDraft(current => ({
                          ...current,
                          returnDate: event.target.value,
                        }))
                      }
                    />
                    <input
                      value={editDraft.warranty}
                      onChange={event =>
                        setEditDraft(current => ({
                          ...current,
                          warranty: event.target.value,
                        }))
                      }
                      placeholder="Warranty note"
                    />
                    <input
                      value={editDraft.receipt}
                      onChange={event =>
                        setEditDraft(current => ({
                          ...current,
                          receipt: event.target.value,
                        }))
                      }
                      placeholder="Receipt metadata"
                    />
                    <input
                      value={editDraft.reflection}
                      onChange={event =>
                        setEditDraft(current => ({
                          ...current,
                          reflection: event.target.value,
                        }))
                      }
                      placeholder="Later reflection"
                    />
                    <div>
                      <button type="button" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEdit(purchase.id)}
                      >
                        Save update
                      </button>
                    </div>
                  </div>
                ) : (
                  <p>
                    <b>{purchase.title}</b>
                    <small>
                      {purchase.stage}
                      {purchase.returnDate
                        ? ` · return by ${purchase.returnDate}`
                        : ""}
                    </small>
                    <em>Warranty: {purchase.warranty || "Not noted"}</em>
                    <em>Receipt metadata: {purchase.receipt || "Not noted"}</em>
                    <em>
                      Reflection: {purchase.reflection || "Not added yet"}
                    </em>
                    <button
                      type="button"
                      className="review-purchase"
                      onClick={() => {
                        const { id: _id, ...saved } = purchase;
                        setEditDraft(saved);
                        setEditingId(purchase.id);
                      }}
                    >
                      Review / update
                    </button>
                  </p>
                )}
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function EnvironmentPage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  type CareItem = {
    title: string;
    area: string;
    recurring: boolean;
    supply: string;
    done: boolean;
  };
  const [items, setItems] = useState<CareItem[]>([]);
  const [history, setHistory] = useState<
    Array<{ title: string; date: string; recurring: boolean }>
  >([]);
  const [draft, setDraft] = useState<CareItem>({
    title: "",
    area: "Workspace",
    recurring: false,
    supply: "",
    done: false,
  });
  useMongoJournalScope({
    scope: "environment",
    payload: { items, history },
    hydrate: payload => {
      if (Array.isArray(payload.items)) setItems(payload.items as CareItem[]);
      if (Array.isArray(payload.history))
        setHistory(
          payload.history as Array<{
            title: string;
            date: string;
            recurring: boolean;
          }>
        );
    },
  });
  function addItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    setItems(current => [...current, { ...draft, title: draft.title.trim() }]);
    setDraft({
      title: "",
      area: "Workspace",
      recurring: false,
      supply: "",
      done: false,
    });
  }
  function toggleItem(index: number) {
    const item = items[index];
    if (!item) return;
    if (!item.done)
      setHistory(current => [
        {
          title: item.title,
          date: new Date().toLocaleDateString("en", {
            month: "short",
            day: "numeric",
          }),
          recurring: item.recurring,
        },
        ...current,
      ]);
    setItems(current =>
      current.map((entry, position) =>
        position === index ? { ...entry, done: !entry.done } : entry
      )
    );
  }
  const upkeep = items.filter(item => !item.done || item.recurring);
  return (
    <section
      className="journal-spread environment-spread"
      aria-labelledby="environment-title"
    >
      <div className="spread-page environment-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">life · environment</p>
        <h2 id="environment-title">
          Care for the
          <br />
          <em>space that holds you.</em>
        </h2>
        <p className="page-intro">
          A gentle home-care list for clearing a desk, remembering a supply, or
          keeping a recurring task from becoming invisible.
        </p>
        <div className="environment-status">
          <Flower2 size={16} />
          <span>{history.length} care moments recorded</span>
        </div>
      </div>
      <div className="spread-page environment-page">
        <form className="environment-form" onSubmit={addItem}>
          <label>
            Care task
            <input
              value={draft.title}
              onChange={event =>
                setDraft(current => ({ ...current, title: event.target.value }))
              }
              placeholder="e.g. Clear my desk"
            />
          </label>
          <div>
            <label>
              Area
              <select
                value={draft.area}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    area: event.target.value,
                  }))
                }
              >
                <option>Workspace</option>
                <option>Bedroom</option>
                <option>Kitchen</option>
                <option>Laundry</option>
                <option>Home</option>
              </select>
            </label>
            <label>
              Supply note
              <input
                value={draft.supply}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    supply: event.target.value,
                  }))
                }
                placeholder="Optional"
              />
            </label>
          </div>
          <label className="recurring-care">
            <input
              type="checkbox"
              checked={draft.recurring}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  recurring: event.target.checked,
                }))
              }
            />
            <span>
              <b>Repeating upkeep</b>
              <small>Keep this task visible after completion.</small>
            </span>
          </label>
          <Button type="submit" className="ink-button">
            <Plus size={15} /> Add care task
          </Button>
        </form>
        <div className="care-list">
          <div>
            <span>current upkeep</span>
            <b>{upkeep.length} visible</b>
          </div>
          {upkeep.length === 0 ? (
            <small>
              Start with one small task that would make your space feel lighter.
            </small>
          ) : (
            upkeep.map(item => {
              const index = items.indexOf(item);
              return (
                <article
                  className={cn(item.done && "done")}
                  key={`${item.title}-${index}`}
                >
                  <button type="button" onClick={() => toggleItem(index)}>
                    {item.done ? "✓" : ""}
                  </button>
                  <p>
                    <b>{item.title}</b>
                    <small>
                      {item.area}
                      {item.recurring ? " · repeats" : ""}
                      {item.supply ? ` · Supply: ${item.supply}` : ""}
                    </small>
                  </p>
                </article>
              );
            })
          )}
        </div>
        <div className="care-history">
          <div>
            <span>care history</span>
            <b>{history.length} moments</b>
          </div>
          {history.length === 0 ? (
            <small>
              Completed care moments will collect here with their date.
            </small>
          ) : (
            history.slice(0, 3).map((entry, index) => (
              <p key={`${entry.title}-${index}`}>
                <b>
                  {entry.date} · {entry.title}
                </b>
                <small>
                  {entry.recurring
                    ? "Recurring upkeep completed"
                    : "One-time care completed"}
                </small>
              </p>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function SecurityPage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  type Account = {
    label: string;
    kind: string;
    cadence: string;
    twoFactor: boolean;
    updateCheck: boolean;
    privacyCheck: boolean;
    passwordHygiene: boolean;
  };
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [draft, setDraft] = useState<Account>({
    label: "",
    kind: "Email",
    cadence: "Every 3 months",
    twoFactor: false,
    updateCheck: false,
    privacyCheck: false,
    passwordHygiene: false,
  });
  function addAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.label.trim()) return;
    setAccounts(current => [
      ...current,
      { ...draft, label: draft.label.trim() },
    ]);
    setDraft({
      label: "",
      kind: "Email",
      cadence: "Every 3 months",
      twoFactor: false,
      updateCheck: false,
      privacyCheck: false,
      passwordHygiene: false,
    });
  }
  return (
    <section
      className="journal-spread security-spread"
      aria-labelledby="security-title"
    >
      <div className="spread-page security-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">life · security</p>
        <h2 id="security-title">
          Keep your digital
          <br />
          <em>space cared for.</em>
        </h2>
        <p className="page-intro">
          A gentle security-hygiene list for your own awareness. This journal
          never stores passwords, recovery codes, or other account secrets.
        </p>
        <div className="security-safety">
          <HeartPulse size={15} />
          <span>No passwords or credentials are collected here.</span>
        </div>
      </div>
      <div className="spread-page security-page">
        <form className="security-form" onSubmit={addAccount}>
          <label>
            Account or service label
            <input
              value={draft.label}
              onChange={event =>
                setDraft(current => ({ ...current, label: event.target.value }))
              }
              placeholder="e.g. Main email"
            />
          </label>
          <label>
            Account type
            <select
              value={draft.kind}
              onChange={event =>
                setDraft(current => ({ ...current, kind: event.target.value }))
              }
            >
              <option>Email</option>
              <option>School</option>
              <option>Finance</option>
              <option>Social</option>
              <option>Shopping</option>
              <option>Other</option>
            </select>
          </label>
          <label>
            Security review cadence
            <select
              value={draft.cadence}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  cadence: event.target.value,
                }))
              }
            >
              <option>Monthly</option>
              <option>Every 3 months</option>
              <option>Every 6 months</option>
              <option>Yearly</option>
            </select>
          </label>
          <div className="security-checks">
            <label>
              <input
                type="checkbox"
                checked={draft.twoFactor}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    twoFactor: event.target.checked,
                  }))
                }
              />
              <span>
                <b>Two-factor protection</b>
                <small>Mark when enabled or reviewed</small>
              </span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={draft.updateCheck}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    updateCheck: event.target.checked,
                  }))
                }
              />
              <span>
                <b>Software update checked</b>
                <small>Keep devices current</small>
              </span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={draft.privacyCheck}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    privacyCheck: event.target.checked,
                  }))
                }
              />
              <span>
                <b>Privacy settings reviewed</b>
                <small>Choose what you want shared</small>
              </span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={draft.passwordHygiene}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    passwordHygiene: event.target.checked,
                  }))
                }
              />
              <span>
                <b>Password-hygiene reminder</b>
                <small>
                  Review uniqueness or a password manager—never enter passwords
                  here.
                </small>
              </span>
            </label>
          </div>
          <Button className="ink-button" type="submit">
            <Plus size={15} /> Save review reminder
          </Button>
        </form>
        <div className="security-shelf">
          <div>
            <span>security hygiene list</span>
            <b>{accounts.length} private entries</b>
          </div>
          {accounts.length === 0 ? (
            <small>
              Add an account label only when a future security or privacy review
              would help.
            </small>
          ) : (
            accounts.map((account, index) => (
              <article key={`${account.label}-${index}`}>
                <i>{account.kind.slice(0, 1)}</i>
                <p>
                  <b>{account.label}</b>
                  <small>
                    {account.kind} · review {account.cadence} ·{" "}
                    {account.twoFactor
                      ? "two-factor marked"
                      : "two-factor to review"}
                  </small>
                  <em>
                    {account.updateCheck
                      ? "Updates checked"
                      : "Update check pending"}{" "}
                    ·{" "}
                    {account.privacyCheck
                      ? "privacy reviewed"
                      : "privacy review pending"}{" "}
                    ·{" "}
                    {account.passwordHygiene
                      ? "password hygiene marked"
                      : "password hygiene to review"}
                  </em>
                </p>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function SecurityWorkspacePage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  type ReviewState = "Review now" | "In progress" | "Reviewed" | "Archived";
  type SecurityRecord = {
    id: string;
    label: string;
    kind: string;
    domain: string;
    reviewDate: string;
    cadence: string;
    nextAction: string;
    whereToReview: string;
    twoFactor: boolean;
    updateCheck: boolean;
    privacyCheck: boolean;
    recoveryPlan: boolean;
    connectedDevices: boolean;
    thirdPartyAccess: boolean;
    sharingPermissions: boolean;
    note: string;
    reviewHistory: { date: string; note: string }[];
    completedAt: string;
    state: ReviewState;
  };
  const blankDraft = () => ({
    label: "",
    kind: "Email",
    domain: "Account access",
    reviewDate: "",
    cadence: "Every 3 months",
    nextAction: "",
    whereToReview: "",
    twoFactor: false,
    updateCheck: false,
    privacyCheck: false,
    recoveryPlan: false,
    connectedDevices: false,
    thirdPartyAccess: false,
    sharingPermissions: false,
    note: "",
  });
  const [records, setRecords] = useState<SecurityRecord[]>([]);
  const [draft, setDraft] = useState(blankDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const summary = securityReviewSummary(records);
  const activeRecords = records.filter(
    record => record.state === "Review now" || record.state === "In progress"
  );
  const reviewNow = activeRecords.filter(
    record => securityReviewStatus(record.reviewDate) !== "Later"
  );
  const later = activeRecords.filter(
    record => securityReviewStatus(record.reviewDate) === "Later"
  );
  const reviewed = records.filter(record => record.state === "Reviewed");
  const archived = records.filter(record => record.state === "Archived");

  function resetDraft() {
    setDraft(blankDraft());
    setEditingId(null);
  }

  function saveRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.label.trim()) return;
    if (editingId) {
      setRecords(current =>
        current.map(record =>
          record.id === editingId
            ? { ...record, ...draft, label: draft.label.trim() }
            : record
        )
      );
    } else {
      setRecords(current => [
        ...current,
        {
          ...draft,
          id: `security-${Date.now()}`,
          label: draft.label.trim(),
          reviewHistory: [],
          completedAt: "",
          state: "Review now",
        },
      ]);
    }
    resetDraft();
  }

  function editRecord(record: SecurityRecord) {
    setEditingId(record.id);
    setDraft({
      label: record.label,
      kind: record.kind,
      domain: record.domain,
      reviewDate: record.reviewDate,
      cadence: record.cadence,
      nextAction: record.nextAction,
      whereToReview: record.whereToReview,
      twoFactor: record.twoFactor,
      updateCheck: record.updateCheck,
      privacyCheck: record.privacyCheck,
      recoveryPlan: record.recoveryPlan,
      connectedDevices: record.connectedDevices,
      thirdPartyAccess: record.thirdPartyAccess,
      sharingPermissions: record.sharingPermissions,
      note: record.note,
    });
  }

  function updateRecord(
    id: string,
    update: (record: SecurityRecord) => SecurityRecord
  ) {
    setRecords(current =>
      current.map(record => (record.id === id ? update(record) : record))
    );
  }

  function RecordCard({ record }: { record: SecurityRecord }) {
    const status: SecurityReviewStatus = securityReviewStatus(
      record.reviewDate
    );
    return (
      <article
        className={cn(
          "security-workspace-card",
          `is-${record.state.toLowerCase().replace(" ", "-")}`
        )}
      >
        <div className="security-card-heading">
          <div>
            <span>
              {record.kind} · {record.state}
            </span>
            <b>{record.label}</b>
          </div>
          <button type="button" onClick={() => editRecord(record)}>
            Edit
          </button>
        </div>
        <p className="security-date">
          <b>{status}</b>
          {record.reviewDate
            ? ` · ${record.reviewDate}`
            : " · add a date only if it helps you review later"}
        </p>
        <div className="security-status-checks">
          <span className={cn(record.twoFactor && "done")}>
            {record.twoFactor ? "✓" : "○"} Two-factor
          </span>
          <span className={cn(record.updateCheck && "done")}>
            {record.updateCheck ? "✓" : "○"} Updates
          </span>
          <span className={cn(record.privacyCheck && "done")}>
            {record.privacyCheck ? "✓" : "○"} Privacy settings
          </span>
          <span className={cn(record.recoveryPlan && "done")}>
            {record.recoveryPlan ? "✓" : "○"} Recovery route
          </span>
        </div>
        {record.note ? (
          <p className="security-card-note">{record.note}</p>
        ) : null}
        <small>
          Local cadence · {record.cadence}. This page does not send reminders
          automatically.
        </small>
        <div className="security-card-actions">
          {record.state === "Review now" ? (
            <button
              type="button"
              onClick={() =>
                updateRecord(record.id, item => ({
                  ...item,
                  state: "In progress",
                }))
              }
            >
              Start review
            </button>
          ) : null}
          {record.state === "In progress" ? (
            <button
              type="button"
              onClick={() =>
                updateRecord(record.id, item => ({
                  ...item,
                  state: "Reviewed",
                }))
              }
            >
              Mark reviewed
            </button>
          ) : null}
          {record.state === "Reviewed" ? (
            <button
              type="button"
              onClick={() =>
                updateRecord(record.id, item => ({
                  ...item,
                  state: "Review now",
                }))
              }
            >
              Review again
            </button>
          ) : null}
          {record.state !== "Archived" ? (
            <button
              type="button"
              onClick={() =>
                updateRecord(record.id, item => ({
                  ...item,
                  state: "Archived",
                }))
              }
            >
              Archive
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                updateRecord(record.id, item => ({
                  ...item,
                  state: "Review now",
                }))
              }
            >
              Restore
            </button>
          )}
          <button
            type="button"
            className="remove"
            onClick={() =>
              setRecords(current =>
                current.filter(item => item.id !== record.id)
              )
            }
          >
            Remove
          </button>
        </div>
      </article>
    );
  }

  return (
    <section
      className="journal-spread security-spread security-workspace-spread"
      aria-labelledby="security-title"
    >
      <div className="spread-page security-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">life · security</p>
        <h2 id="security-title">
          Keep your digital
          <br />
          <em>space cared for.</em>
        </h2>
        <p className="page-intro">
          A private, local review space for ordinary security habits. It never
          asks for passwords, authentication codes, account numbers, or recovery
          secrets.
        </p>
        <div className="security-safety">
          <HeartPulse size={15} />
          <span>
            {summary.reviewNow} local review{summary.reviewNow === 1 ? "" : "s"}{" "}
            to consider
          </span>
        </div>
      </div>
      <div className="spread-page security-workspace-page">
        <section className="security-review-summary">
          <div>
            <span>Review, factually</span>
            <b>{summary.reviewNow} to consider now</b>
          </div>
          <p>
            {records.length
              ? `${summary.reviewNow} review now · ${summary.later} later · ${summary.reviewed} marked reviewed.`
              : "Add only a label and review context you want to remember."}
          </p>
          <div>
            <span>Review now {summary.reviewNow}</span>
            <span>Later {summary.later}</span>
            <span>Reviewed {summary.reviewed}</span>
          </div>
        </section>
        <section className="security-review-form">
          <div className="security-section-heading">
            <div>
              <span>
                {editingId ? "Edit private review" : "Add a private review"}
              </span>
              <b>Labels and checklists only</b>
            </div>
            {editingId ? (
              <button type="button" onClick={resetDraft}>
                Cancel edit
              </button>
            ) : (
              <small>No account details or credentials are collected.</small>
            )}
          </div>
          <form onSubmit={saveRecord}>
            <label>
              Account or service label
              <input
                value={draft.label}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                placeholder="e.g. Main email"
              />
            </label>
            <div className="security-form-pair">
              <label>
                Account type
                <select
                  value={draft.kind}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      kind: event.target.value,
                    }))
                  }
                >
                  <option>Email</option>
                  <option>School</option>
                  <option>Finance</option>
                  <option>Social</option>
                  <option>Shopping</option>
                  <option>Other</option>
                </select>
              </label>
              <label>
                Review date <small>Optional</small>
                <input
                  type="date"
                  value={draft.reviewDate}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      reviewDate: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <label>
              Local review cadence
              <select
                value={draft.cadence}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    cadence: event.target.value,
                  }))
                }
              >
                <option>Monthly</option>
                <option>Every 3 months</option>
                <option>Every 6 months</option>
                <option>Yearly</option>
              </select>
            </label>
            <div className="security-review-checks">
              <label>
                <input
                  type="checkbox"
                  checked={draft.twoFactor}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      twoFactor: event.target.checked,
                    }))
                  }
                />
                <span>
                  <b>Two-factor protection</b>
                  <small>Mark only when enabled or reviewed.</small>
                </span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={draft.updateCheck}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      updateCheck: event.target.checked,
                    }))
                  }
                />
                <span>
                  <b>Software updates checked</b>
                  <small>A local note, not a device scan.</small>
                </span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={draft.privacyCheck}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      privacyCheck: event.target.checked,
                    }))
                  }
                />
                <span>
                  <b>Privacy settings reviewed</b>
                  <small>Keep a note of your own review.</small>
                </span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={draft.recoveryPlan}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      recoveryPlan: event.target.checked,
                    }))
                  }
                />
                <span>
                  <b>Recovery route considered</b>
                  <small>
                    Never enter codes, answers, or recovery details.
                  </small>
                </span>
              </label>
            </div>
            <label>
              Private note <small>Optional</small>
              <input
                value={draft.note}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                placeholder="e.g. Review sharing settings"
              />
            </label>
            <small className="security-form-note">
              This is a local review record. It cannot scan accounts, schedule
              alerts, or verify protection.
            </small>
            <button type="submit">
              <Plus size={14} />{" "}
              {editingId ? "Save local review" : "Add local review"}
            </button>
          </form>
        </section>
        <section className="security-review-section">
          <div className="security-section-heading">
            <div>
              <span>Review now</span>
              <b>{reviewNow.length} local records</b>
            </div>
            <small>Dates reflect only what you entered.</small>
          </div>
          {reviewNow.length ? (
            reviewNow.map(record => (
              <RecordCard key={record.id} record={record} />
            ))
          ) : (
            <div className="security-empty">
              <b>Nothing needs a local review now</b>
              <span>
                Records without a date or within their local review window
                appear here.
              </span>
            </div>
          )}
        </section>
        <section className="security-review-section later">
          <div className="security-section-heading">
            <div>
              <span>Later</span>
              <b>{later.length} local records</b>
            </div>
            <small>
              Future dates stay visible without an automatic reminder.
            </small>
          </div>
          {later.length ? (
            later.map(record => <RecordCard key={record.id} record={record} />)
          ) : (
            <div className="security-empty">
              <b>No later reviews</b>
              <span>Future-dated records will appear here.</span>
            </div>
          )}
        </section>
        <section className="security-reviewed-log">
          <div className="security-section-heading">
            <div>
              <span>Reviewed locally</span>
              <b>{reviewed.length} records</b>
            </div>
            <small>
              Mark a review complete only when you decide it is complete.
            </small>
          </div>
          {reviewed.length ? (
            reviewed.map(record => (
              <RecordCard key={record.id} record={record} />
            ))
          ) : (
            <div className="security-empty">
              <b>No reviewed records yet</b>
              <span>Completed local reviews remain visible here.</span>
            </div>
          )}
        </section>
        <section className="security-archive">
          <button
            type="button"
            onClick={() => setArchiveOpen(current => !current)}
          >
            <span>Archived local records</span>
            <b>
              {archiveOpen ? "−" : "+"} {archived.length} saved
            </b>
          </button>
          {archiveOpen ? (
            archived.length ? (
              archived.map(record => (
                <RecordCard key={record.id} record={record} />
              ))
            ) : (
              <div className="security-empty">
                <b>No archived records</b>
                <span>
                  Archive a record when it no longer needs regular attention.
                </span>
              </div>
            )
          ) : null}
        </section>
      </div>
    </section>
  );
}

function SecurityReviewWorkspacePage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  type ReviewState = "Review now" | "In progress" | "Reviewed" | "Archived";
  type ReviewLog = { date: string; note: string };
  type SecurityRecord = {
    id: string;
    label: string;
    kind: string;
    domain: string;
    reviewDate: string;
    cadence: string;
    nextAction: string;
    whereToReview: string;
    note: string;
    state: ReviewState;
    completedAt: string;
    reviewHistory: ReviewLog[];
    twoFactor: boolean;
    updateCheck: boolean;
    privacyCheck: boolean;
    recoveryPlan: boolean;
    connectedDevices: boolean;
    thirdPartyAccess: boolean;
    sharingPermissions: boolean;
  };
  const emptyDraft = () => ({
    label: "",
    kind: "Email",
    domain: "Account access",
    reviewDate: "",
    cadence: "Every 3 months",
    nextAction: "",
    whereToReview: "",
    note: "",
    twoFactor: false,
    updateCheck: false,
    privacyCheck: false,
    recoveryPlan: false,
    connectedDevices: false,
    thirdPartyAccess: false,
    sharingPermissions: false,
  });
  const [records, setRecords] = useState<SecurityRecord[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  useMongoJournalScope({
    scope: "security",
    payload: { records },
    hydrate: payload => {
      if (Array.isArray(payload.records))
        setRecords(payload.records as SecurityRecord[]);
    },
  });
  const summary = securityReviewSummary(records);
  const active = records.filter(
    record => record.state === "Review now" || record.state === "In progress"
  );
  const reviewNow = active.filter(
    record => securityReviewStatus(record.reviewDate) !== "Later"
  );
  const later = active.filter(
    record => securityReviewStatus(record.reviewDate) === "Later"
  );
  const reviewed = records.filter(record => record.state === "Reviewed");
  const archived = records.filter(record => record.state === "Archived");

  function resetDraft() {
    setDraft(emptyDraft());
    setEditingId(null);
  }
  function saveRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.label.trim()) return;
    if (editingId)
      setRecords(current =>
        current.map(record =>
          record.id === editingId
            ? { ...record, ...draft, label: draft.label.trim() }
            : record
        )
      );
    else
      setRecords(current => [
        ...current,
        {
          ...draft,
          id: `security-${Date.now()}`,
          label: draft.label.trim(),
          state: "Review now",
          completedAt: "",
          reviewHistory: [],
        },
      ]);
    resetDraft();
  }
  function editRecord(record: SecurityRecord) {
    setEditingId(record.id);
    setDraft({
      label: record.label,
      kind: record.kind,
      domain: record.domain,
      reviewDate: record.reviewDate,
      cadence: record.cadence,
      nextAction: record.nextAction,
      whereToReview: record.whereToReview,
      note: record.note,
      twoFactor: record.twoFactor,
      updateCheck: record.updateCheck,
      privacyCheck: record.privacyCheck,
      recoveryPlan: record.recoveryPlan,
      connectedDevices: record.connectedDevices,
      thirdPartyAccess: record.thirdPartyAccess,
      sharingPermissions: record.sharingPermissions,
    });
  }
  function updateRecord(
    id: string,
    update: (record: SecurityRecord) => SecurityRecord
  ) {
    setRecords(current =>
      current.map(record => (record.id === id ? update(record) : record))
    );
  }
  function markReviewed(record: SecurityRecord) {
    const history = appendSecurityReviewLog(record.reviewHistory, record.note);
    updateRecord(record.id, item => ({
      ...item,
      state: "Reviewed",
      completedAt: history[history.length - 1].date,
      reviewHistory: history,
    }));
  }
  function RecordCard({ record }: { record: SecurityRecord }) {
    const status = securityReviewStatus(record.reviewDate);
    const checks = [
      [record.twoFactor, "Two-factor"],
      [record.updateCheck, "Updates"],
      [record.privacyCheck, "Privacy"],
      [record.recoveryPlan, "Recovery route"],
      [record.connectedDevices, "Connected devices"],
      [record.thirdPartyAccess, "Third-party access"],
      [record.sharingPermissions, "Sharing permissions"],
    ];
    return (
      <article
        className={cn(
          "security-workspace-card",
          `is-${record.state.toLowerCase().replace(" ", "-")}`
        )}
      >
        <div className="security-card-heading">
          <div>
            <span>
              {record.domain} · {record.kind} · {record.state}
            </span>
            <b>{record.label}</b>
          </div>
          <button type="button" onClick={() => editRecord(record)}>
            Edit
          </button>
        </div>
        <p className="security-date">
          <b>{status}</b>
          {record.reviewDate
            ? ` · ${record.reviewDate}`
            : " · no review date added"}
        </p>
        {record.nextAction ? (
          <div className="security-action-cue">
            <span>Next local action</span>
            <b>{record.nextAction}</b>
          </div>
        ) : null}
        {record.whereToReview ? (
          <p className="security-where">
            <b>Where to review</b> · {record.whereToReview}
          </p>
        ) : null}
        <div className="security-status-checks">
          {checks.map(([done, label]) => (
            <span key={String(label)} className={cn(Boolean(done) && "done")}>
              {done ? "✓" : "○"} {label}
            </span>
          ))}
        </div>
        {record.completedAt ? (
          <p className="security-completed">
            Last marked reviewed locally · {record.completedAt}
          </p>
        ) : null}
        {record.reviewHistory.length ? (
          <div className="security-note-history">
            <span>Local review notes</span>
            {record.reviewHistory
              .slice(-2)
              .reverse()
              .map(entry => (
                <p key={`${entry.date}-${entry.note}`}>
                  <b>{entry.date}</b> · {entry.note}
                </p>
              ))}
          </div>
        ) : null}
        <small>
          Local cadence · {record.cadence}. This page does not verify settings
          or send reminders.
        </small>
        <div className="security-card-actions">
          {record.state === "Review now" ? (
            <button
              type="button"
              onClick={() =>
                updateRecord(record.id, item => ({
                  ...item,
                  state: "In progress",
                }))
              }
            >
              Start review
            </button>
          ) : null}
          {record.state === "In progress" ? (
            <button type="button" onClick={() => markReviewed(record)}>
              Mark reviewed
            </button>
          ) : null}
          {record.state === "Reviewed" ? (
            <button
              type="button"
              onClick={() =>
                updateRecord(record.id, item => ({
                  ...item,
                  state: "Review now",
                }))
              }
            >
              Review again
            </button>
          ) : null}
          {record.state !== "Archived" ? (
            <button
              type="button"
              onClick={() =>
                updateRecord(record.id, item => ({
                  ...item,
                  state: "Archived",
                }))
              }
            >
              Archive
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                updateRecord(record.id, item => ({
                  ...item,
                  state: "Review now",
                }))
              }
            >
              Restore
            </button>
          )}
          <button
            type="button"
            className="remove"
            onClick={() =>
              setRecords(current =>
                current.filter(item => item.id !== record.id)
              )
            }
          >
            Remove
          </button>
        </div>
      </article>
    );
  }

  const checks: Array<{
    key:
      | "twoFactor"
      | "updateCheck"
      | "privacyCheck"
      | "recoveryPlan"
      | "connectedDevices"
      | "thirdPartyAccess"
      | "sharingPermissions";
    title: string;
    detail: string;
  }> = [
    {
      key: "twoFactor",
      title: "Two-factor protection",
      detail: "Mark only when enabled or reviewed.",
    },
    {
      key: "updateCheck",
      title: "Software updates checked",
      detail: "A local note, not a device scan.",
    },
    {
      key: "privacyCheck",
      title: "Privacy settings reviewed",
      detail: "Keep a note of your own review.",
    },
    {
      key: "recoveryPlan",
      title: "Recovery route considered",
      detail: "Never enter codes or recovery details.",
    },
    {
      key: "connectedDevices",
      title: "Connected devices considered",
      detail: "Check in the relevant account or device settings.",
    },
    {
      key: "thirdPartyAccess",
      title: "Third-party access considered",
      detail: "Review apps connected to the relevant service.",
    },
    {
      key: "sharingPermissions",
      title: "Sharing permissions considered",
      detail: "Review sharing where it matters to you.",
    },
  ];

  return (
    <section
      className="journal-spread security-spread security-workspace-spread"
      aria-labelledby="security-title"
    >
      <div className="spread-page security-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">life · security</p>
        <h2 id="security-title">
          Keep your digital
          <br />
          <em>space cared for.</em>
        </h2>
        <p className="page-intro">
          A private, local review space for ordinary security habits. It never
          asks for passwords, authentication codes, account numbers, or recovery
          secrets.
        </p>
        <div className="security-safety">
          <HeartPulse size={15} />
          <span>
            {summary.reviewNow} local review{summary.reviewNow === 1 ? "" : "s"}{" "}
            to consider
          </span>
        </div>
      </div>
      <div className="spread-page security-workspace-page">
        <section className="security-review-summary">
          <div>
            <span>Review, factually</span>
            <b>{summary.reviewNow} to consider now</b>
          </div>
          <p>
            {records.length
              ? `${summary.reviewNow} review now · ${summary.later} later · ${summary.reviewed} marked reviewed.`
              : "Add only a label and review context you want to remember."}
          </p>
          <div>
            <span>Review now {summary.reviewNow}</span>
            <span>Later {summary.later}</span>
            <span>Reviewed {summary.reviewed}</span>
          </div>
        </section>
        <section className="security-review-form">
          <div className="security-section-heading">
            <div>
              <span>
                {editingId ? "Edit private review" : "Add a private review"}
              </span>
              <b>Labels and checklists only</b>
            </div>
            {editingId ? (
              <button type="button" onClick={resetDraft}>
                Cancel edit
              </button>
            ) : (
              <small>No account details or credentials are collected.</small>
            )}
          </div>
          <form onSubmit={saveRecord}>
            <label>
              Account or service label
              <input
                value={draft.label}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                placeholder="e.g. Main email"
              />
            </label>
            <div className="security-form-pair">
              <label>
                Account type
                <select
                  value={draft.kind}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      kind: event.target.value,
                    }))
                  }
                >
                  <option>Email</option>
                  <option>School</option>
                  <option>Finance</option>
                  <option>Social</option>
                  <option>Shopping</option>
                  <option>Other</option>
                </select>
              </label>
              <label>
                Review focus
                <select
                  value={draft.domain}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      domain: event.target.value,
                    }))
                  }
                >
                  <option>Account access</option>
                  <option>Device updates</option>
                  <option>Privacy and sharing</option>
                  <option>Recovery readiness</option>
                  <option>Scam awareness</option>
                </select>
              </label>
            </div>
            <div className="security-form-pair">
              <label>
                Review date <small>Optional</small>
                <input
                  type="date"
                  value={draft.reviewDate}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      reviewDate: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Local review cadence
                <select
                  value={draft.cadence}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      cadence: event.target.value,
                    }))
                  }
                >
                  <option>Monthly</option>
                  <option>Every 3 months</option>
                  <option>Every 6 months</option>
                  <option>Yearly</option>
                </select>
              </label>
            </div>
            <label>
              Smallest next action <small>Optional</small>
              <input
                value={draft.nextAction}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    nextAction: event.target.value,
                  }))
                }
                placeholder="e.g. Review connected devices"
              />
            </label>
            <label>
              Where to review <small>Optional; do not enter a login link</small>
              <input
                value={draft.whereToReview}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    whereToReview: event.target.value,
                  }))
                }
                placeholder="e.g. Device Settings or account security page"
              />
            </label>
            <div className="security-review-checks">
              {checks.map(check => (
                <label key={check.key}>
                  <input
                    type="checkbox"
                    checked={draft[check.key]}
                    onChange={event =>
                      setDraft(current => ({
                        ...current,
                        [check.key]: event.target.checked,
                      }))
                    }
                  />
                  <span>
                    <b>{check.title}</b>
                    <small>{check.detail}</small>
                  </span>
                </label>
              ))}
            </div>
            <label>
              Review note{" "}
              <small>
                Optional; becomes a dated local note when marked reviewed
              </small>
              <input
                value={draft.note}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                placeholder="e.g. Reviewed sharing choices"
              />
            </label>
            <small className="security-form-note">
              This is a local review record. It cannot scan accounts, verify
              protection, schedule alerts, or take action in another app.
            </small>
            <button type="submit">
              <Plus size={14} />{" "}
              {editingId ? "Save local review" : "Add local review"}
            </button>
          </form>
        </section>
        <section className="security-review-section">
          <div className="security-section-heading">
            <div>
              <span>Review now</span>
              <b>{reviewNow.length} local records</b>
            </div>
            <small>Dates reflect only what you entered.</small>
          </div>
          {reviewNow.length ? (
            reviewNow.map(record => (
              <RecordCard key={record.id} record={record} />
            ))
          ) : (
            <div className="security-empty">
              <b>Nothing needs a local review now</b>
              <span>
                Records without a date or within their local review window
                appear here.
              </span>
            </div>
          )}
        </section>
        <section className="security-review-section later">
          <div className="security-section-heading">
            <div>
              <span>Later</span>
              <b>{later.length} local records</b>
            </div>
            <small>
              Future dates stay visible without an automatic reminder.
            </small>
          </div>
          {later.length ? (
            later.map(record => <RecordCard key={record.id} record={record} />)
          ) : (
            <div className="security-empty">
              <b>No later reviews</b>
              <span>Future-dated records will appear here.</span>
            </div>
          )}
        </section>
        <section className="security-reviewed-log">
          <div className="security-section-heading">
            <div>
              <span>Reviewed locally</span>
              <b>{reviewed.length} records</b>
            </div>
            <small>
              Completion dates and notes reflect only what you marked.
            </small>
          </div>
          {reviewed.length ? (
            reviewed.map(record => (
              <RecordCard key={record.id} record={record} />
            ))
          ) : (
            <div className="security-empty">
              <b>No reviewed records yet</b>
              <span>Completed local reviews remain visible here.</span>
            </div>
          )}
        </section>
        <section className="security-archive">
          <button
            type="button"
            onClick={() => setArchiveOpen(current => !current)}
          >
            <span>Archived local records</span>
            <b>
              {archiveOpen ? "−" : "+"} {archived.length} saved
            </b>
          </button>
          {archiveOpen ? (
            archived.length ? (
              archived.map(record => (
                <RecordCard key={record.id} record={record} />
              ))
            ) : (
              <div className="security-empty">
                <b>No archived records</b>
                <span>
                  Archive a record when it no longer needs regular attention.
                </span>
              </div>
            )
          ) : null}
        </section>
      </div>
    </section>
  );
}

function DocumentsPage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  type DocumentRecord = {
    title: string;
    type: string;
    date: string;
    timing: string;
    preview: boolean;
  };
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [draft, setDraft] = useState<DocumentRecord>({
    title: "",
    type: "Identity",
    date: "",
    timing: "30 days before",
    preview: false,
  });
  function addDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.date) return;
    setDocuments(current => [
      ...current,
      { ...draft, title: draft.title.trim() },
    ]);
    setDraft({
      title: "",
      type: "Identity",
      date: "",
      timing: "30 days before",
      preview: false,
    });
  }
  return (
    <section
      className="journal-spread documents-spread"
      aria-labelledby="documents-title"
    >
      <div className="spread-page documents-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">life · documents</p>
        <h2 id="documents-title">
          Keep the dates,
          <br />
          <em>not the files.</em>
        </h2>
        <p className="page-intro">
          Track only the metadata that helps you renew or review important
          records. This prototype never asks you to upload or store sensitive
          documents.
        </p>
        <div className="document-safety">
          <HeartPulse size={15} />
          <span>Private metadata only · no file storage</span>
        </div>
      </div>
      <div className="spread-page documents-page">
        <form className="document-form" onSubmit={addDocument}>
          <label>
            Document label
            <input
              value={draft.title}
              onChange={event =>
                setDraft(current => ({ ...current, title: event.target.value }))
              }
              placeholder="e.g. Passport or student card"
            />
          </label>
          <div>
            <label>
              Type
              <select
                value={draft.type}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    type: event.target.value,
                  }))
                }
              >
                <option>Identity</option>
                <option>Education</option>
                <option>Health</option>
                <option>Financial</option>
                <option>Home</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              Expiry or renewal date
              <input
                type="date"
                value={draft.date}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <label>
            Reminder timing
            <select
              value={draft.timing}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  timing: event.target.value,
                }))
              }
            >
              <option>90 days before</option>
              <option>30 days before</option>
              <option>7 days before</option>
              <option>On the date</option>
            </select>
          </label>
          <label className="preview-toggle">
            <input
              type="checkbox"
              checked={draft.preview}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  preview: event.target.checked,
                }))
              }
            />
            <span>
              <b>Show a discreet notification preview</b>
              <small>Off keeps document names off lock-screen previews.</small>
            </span>
          </label>
          <Button className="ink-button" type="submit">
            <Plus size={15} /> Save metadata
          </Button>
        </form>
        <div className="document-shelf">
          <div>
            <span>private document shelf</span>
            <b>{documents.length} records</b>
          </div>
          {documents.length === 0 ? (
            <small>
              Add only labels and dates you want a future reminder to help you
              remember.
            </small>
          ) : (
            documents.map((document, index) => (
              <article key={`${document.title}-${index}`}>
                <i>{document.type.slice(0, 1)}</i>
                <p>
                  <b>{document.title}</b>
                  <small>
                    {document.type} · {document.date} · remind {document.timing}
                  </small>
                  <em>
                    {document.preview
                      ? "Discreet preview enabled"
                      : "Name hidden in preview"}
                  </em>
                </p>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function DocumentRenewalPage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [records, setRecords] = useState<RenewalRecord[]>([]);
  const [customTypes, setCustomTypes] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    title: "",
    type: "Identity",
    customType: "",
    reviewDate: "",
    reviewWindow: "30 days before",
    nextAction: "",
    note: "",
    state: "Not started" as RenewalState,
  });
  useMongoJournalScope({
    scope: "documents",
    payload: { records, customTypes },
    hydrate: payload => {
      if (Array.isArray(payload.records))
        setRecords(payload.records as RenewalRecord[]);
      if (Array.isArray(payload.customTypes))
        setCustomTypes(payload.customTypes as string[]);
    },
  });
  const types = [
    "Identity",
    "Education",
    "Financial",
    "Health",
    "Home",
    "Warranty",
    "Other",
    ...customTypes,
  ];
  const sorted = useMemo(() => sortDocumentsForReview(records), [records]);
  const summary = useMemo(() => documentReviewSummary(records), [records]);
  const reviewNow = sorted.filter(
    record =>
      ["Past due", "Approaching"].includes(documentReviewStatus(record)) ||
      record.state === "In progress"
  );
  const later = sorted.filter(
    record =>
      !reviewNow.some(item => item.id === record.id) &&
      !["Renewed", "Archived"].includes(documentReviewStatus(record))
  );
  const renewed = sorted.filter(
    record => documentReviewStatus(record) === "Renewed"
  );
  const archived = sorted.filter(
    record => documentReviewStatus(record) === "Archived"
  );
  function resetDraft() {
    setEditingId(null);
    setDraft({
      title: "",
      type: "Identity",
      customType: "",
      reviewDate: "",
      reviewWindow: "30 days before",
      nextAction: "",
      note: "",
      state: "Not started",
    });
  }
  function saveRecord(event: React.FormEvent) {
    event.preventDefault();
    const type = draft.type === "Custom" ? draft.customType.trim() : draft.type;
    if (!draft.title.trim() || !type) return;
    if (draft.type === "Custom" && !customTypes.includes(type))
      setCustomTypes(current => [...current, type]);
    const existing = records.find(record => record.id === editingId);
    const next: RenewalRecord = {
      id: editingId || `${Date.now()}-document`,
      title: draft.title.trim(),
      type,
      reviewDate: draft.reviewDate,
      reviewWindow: draft.reviewWindow,
      nextAction: draft.nextAction.trim(),
      note: draft.note.trim(),
      state: draft.state,
      renewals: existing?.renewals || [],
      attachment: existing?.attachment,
    };
    setRecords(current =>
      editingId
        ? current.map(record => (record.id === editingId ? next : record))
        : [next, ...current]
    );
    resetDraft();
  }
  function editRecord(record: RenewalRecord) {
    setEditingId(record.id);
    setDraft({
      title: record.title,
      type: types.includes(record.type) ? record.type : "Custom",
      customType: types.includes(record.type) ? "" : record.type,
      reviewDate: record.reviewDate,
      reviewWindow: record.reviewWindow,
      nextAction: record.nextAction,
      note: record.note,
      state: record.state,
    });
  }
  function updateRecord(
    id: string,
    updater: (record: RenewalRecord) => RenewalRecord
  ) {
    setRecords(current =>
      current.map(record => (record.id === id ? updater(record) : record))
    );
  }
  function previewAuthHeader(): Record<string, string> {
    try {
      const raw = sessionStorage.getItem("manus-cookie");
      const prefix = `${COOKIE_NAME}=`;
      const pair = raw
        ?.split(";")
        .find(value => value.trim().startsWith(prefix));
      const token = pair?.trim().slice(prefix.length);
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  }
  async function uploadAttachment(
    record: RenewalRecord,
    file: File | undefined
  ) {
    if (!file) return;
    const allowedTypes = new Set([
      "application/pdf",
      "application/octet-stream",
      "text/plain",
      "text/markdown",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]);
    if (file.size === 0 || file.size > 15 * 1024 * 1024) {
      setUploadMessage("Choose a file smaller than 15 MB.");
      return;
    }
    if (!allowedTypes.has(file.type || "application/octet-stream")) {
      setUploadMessage(
        "This file type is not supported. Use PDF, an image, text, or an Office document."
      );
      return;
    }
    setUploadingId(record.id);
    setUploadMessage(null);
    try {
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "X-File-Name": encodeURIComponent(file.name),
          ...previewAuthHeader(),
        },
        body: file,
      });
      const result = (await response.json()) as {
        key?: string;
        url?: string;
        originalName?: string;
        mimeType?: string;
        size?: number;
        uploadedAt?: string;
        error?: string;
      };
      if (response.status === 401 || response.status === 403) {
        setUploadMessage(
          "Please sign in to the journal to use private document storage."
        );
        return;
      }
      if (
        !response.ok ||
        !result.key ||
        !result.url ||
        !result.originalName ||
        !result.mimeType ||
        typeof result.size !== "number" ||
        !result.uploadedAt
      )
        throw new Error(result.error || "Upload failed");
      const attachment: DocumentAttachment = {
        key: result.key,
        url: result.url,
        originalName: result.originalName,
        mimeType: result.mimeType,
        size: result.size,
        uploadedAt: result.uploadedAt,
      };
      updateRecord(record.id, current => ({ ...current, attachment }));
      setUploadMessage(
        `${attachment.originalName} attached to ${record.title}.`
      );
    } catch {
      setUploadMessage(
        "The file could not be stored. Your metadata record was kept unchanged."
      );
    } finally {
      setUploadingId(null);
    }
  }
  function RecordCard({ record }: { record: RenewalRecord }) {
    const status = documentReviewStatus(record);
    return (
      <article
        className={cn(
          "document-renewal-card",
          status.toLowerCase().replace(" ", "-")
        )}
      >
        <i>{record.type.slice(0, 1)}</i>
        <div className="document-renewal-copy">
          <div>
            <b>{record.title}</b>
            <span>{status}</span>
          </div>
          <small>
            {record.type} · {record.reviewDate || "No review date"} ·{" "}
            {record.reviewWindow}
          </small>
          {record.nextAction ? (
            <em>Next: {record.nextAction}</em>
          ) : (
            <em>Add a smallest next action when it would help.</em>
          )}
          {record.note ? <p>{record.note}</p> : null}
          {record.renewals.length ? (
            <small>
              {record.renewals.length} local renewal
              {record.renewals.length === 1 ? "" : "s"} recorded
            </small>
          ) : null}
          {record.attachment ? (
            <div className="document-attachment">
              <a href={record.attachment.url} target="_blank" rel="noreferrer">
                Open {record.attachment.originalName}
              </a>
              <small>
                {Math.ceil(record.attachment.size / 1024)} KB ·{" "}
                {record.attachment.mimeType}
              </small>
              <button
                type="button"
                onClick={() =>
                  updateRecord(record.id, current => ({
                    ...current,
                    attachment: undefined,
                  }))
                }
              >
                Remove file reference
              </button>
            </div>
          ) : (
            <label className="document-attachment-upload">
              {uploadingId === record.id ? "Storing file…" : "Attach a file"}
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp,text/plain,text/markdown,.docx,.xlsx"
                disabled={uploadingId !== null}
                onChange={event => {
                  void uploadAttachment(record, event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          )}
        </div>
        <div className="document-renewal-actions">
          <button type="button" onClick={() => editRecord(record)}>
            Edit
          </button>
          {record.state === "Not started" ? (
            <button
              type="button"
              onClick={() =>
                updateRecord(record.id, current => ({
                  ...current,
                  state: "In progress",
                }))
              }
            >
              Start
            </button>
          ) : null}
          {record.state === "In progress" ? (
            <button
              type="button"
              onClick={() =>
                updateRecord(record.id, current => ({
                  ...current,
                  state: "Renewed",
                  renewals: [...current.renewals, today],
                }))
              }
            >
              Mark renewed
            </button>
          ) : null}
          {record.state === "Renewed" ? (
            <button
              type="button"
              onClick={() =>
                updateRecord(record.id, current => ({
                  ...current,
                  state: "Not started",
                }))
              }
            >
              Set next review
            </button>
          ) : null}
          {record.state !== "Archived" ? (
            <button
              type="button"
              onClick={() =>
                updateRecord(record.id, current => ({
                  ...current,
                  state: "Archived",
                }))
              }
            >
              Archive
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                updateRecord(record.id, current => ({
                  ...current,
                  state: "Not started",
                }))
              }
            >
              Restore
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              setRecords(current =>
                current.filter(item => item.id !== record.id)
              )
            }
          >
            Remove
          </button>
        </div>
      </article>
    );
  }
  return (
    <section
      className="journal-spread documents-spread"
      aria-labelledby="documents-title"
    >
      <div className="spread-page documents-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">life · documents</p>
        <h2 id="documents-title">
          Keep the dates,
          <br />
          <em>not the files.</em>
        </h2>
        <p className="page-intro">
          Track the metadata that helps you review or renew an important record,
          then optionally attach a file to managed private storage. The journal
          keeps only a storage reference—not document bytes in the database.
        </p>
        <div className="document-safety">
          <HeartPulse size={15} />
          <span>Owner-scoped metadata + managed file reference</span>
        </div>
      </div>
      <div className="spread-page documents-workbench">
        <section className="document-review-summary">
          <div>
            <span>Review, factually</span>
            <b>{summary.pastDue + summary.approaching} to review now</b>
          </div>
          <p>
            {summary.pastDue
              ? `${summary.pastDue} record${summary.pastDue === 1 ? " is" : "s are"} past the date you entered.`
              : summary.approaching
                ? `${summary.approaching} record${summary.approaching === 1 ? " is" : "s are"} within its local review window.`
                : "No local record is currently marked past due or approaching."}
          </p>
          <div>
            <span>Past due {summary.pastDue}</span>
            <span>Approaching {summary.approaching}</span>
            <span>Later {summary.upcoming}</span>
          </div>
        </section>
        <section className="document-renewal-form">
          <div>
            <span>{editingId ? "Edit metadata" : "Add metadata"}</span>
            {editingId ? (
              <button type="button" onClick={resetDraft}>
                Cancel edit
              </button>
            ) : (
              <b>Private local record</b>
            )}
          </div>
          <form onSubmit={saveRecord}>
            <input
              value={draft.title}
              onChange={event =>
                setDraft(current => ({ ...current, title: event.target.value }))
              }
              placeholder="Document label, e.g. passport or student card"
            />
            <div className="document-renewal-core">
              <label>
                Type
                <select
                  value={draft.type}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      type: event.target.value,
                    }))
                  }
                >
                  {types.map(type => (
                    <option key={type}>{type}</option>
                  ))}
                  <option>Custom</option>
                </select>
              </label>
              <label>
                Review or expiry date
                <input
                  type="date"
                  value={draft.reviewDate}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      reviewDate: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Review window
                <select
                  value={draft.reviewWindow}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      reviewWindow: event.target.value,
                    }))
                  }
                >
                  <option>Review when ready</option>
                  <option>90 days before</option>
                  <option>30 days before</option>
                  <option>14 days before</option>
                  <option>7 days before</option>
                </select>
              </label>
            </div>
            {draft.type === "Custom" ? (
              <input
                value={draft.customType}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    customType: event.target.value,
                  }))
                }
                placeholder="Name a local type"
              />
            ) : null}
            <input
              value={draft.nextAction}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  nextAction: event.target.value,
                }))
              }
              placeholder="Smallest next action, optional"
            />
            <input
              value={draft.note}
              onChange={event =>
                setDraft(current => ({ ...current, note: event.target.value }))
              }
              placeholder="Optional renewal note"
            />
            <label>
              Review state
              <select
                value={draft.state}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    state: event.target.value as RenewalState,
                  }))
                }
              >
                <option>Not started</option>
                <option>In progress</option>
                <option>Renewed</option>
                <option>Archived</option>
              </select>
            </label>
            <small>
              Save metadata first, then optionally attach a PDF, image, text, or
              Office file to its record. Files are stored separately from
              journal metadata.
            </small>
            <button type="submit">
              <Plus size={14} />{" "}
              {editingId ? "Save metadata" : "Add local record"}
            </button>
          </form>
        </section>
        {uploadMessage ? (
          <div className="document-upload-message" role="status">
            {uploadMessage}
          </div>
        ) : null}
        <section className="document-review-section">
          <div>
            <span>Review now</span>
            <b>{reviewNow.length} records</b>
          </div>
          {reviewNow.length ? (
            reviewNow.map(record => (
              <RecordCard key={record.id} record={record} />
            ))
          ) : (
            <small>
              Nothing needs a local review now. Add only dates you want to keep
              visible.
            </small>
          )}
        </section>
        <section className="document-review-section later">
          <div>
            <span>Later or no date</span>
            <b>{later.length} records</b>
          </div>
          {later.length ? (
            later.map(record => <RecordCard key={record.id} record={record} />)
          ) : (
            <small>Records with future or no dates will appear here.</small>
          )}
        </section>
        <section className="document-renewed-log">
          <div>
            <span>Renewed locally</span>
            <b>{renewed.length} records</b>
          </div>
          {renewed.length ? (
            renewed.map(record => (
              <RecordCard key={record.id} record={record} />
            ))
          ) : (
            <small>
              Mark a record renewed when your own review is complete, then set
              its next date when you are ready.
            </small>
          )}
        </section>
        <section className="document-archive">
          <button
            type="button"
            onClick={() => setArchiveOpen(current => !current)}
          >
            <span>Archived local records</span>
            <b>
              {archiveOpen ? "−" : "+"} {archived.length} saved
            </b>
          </button>
          {archiveOpen ? (
            archived.length ? (
              archived.map(record => (
                <RecordCard key={record.id} record={record} />
              ))
            ) : (
              <small>No archived local records.</small>
            )
          ) : null}
        </section>
      </div>
    </section>
  );
}

function FinancesPage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  type Expense = {
    title: string;
    amount: string;
    category: string;
    recurring: boolean;
  };
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [draft, setDraft] = useState<Expense>({
    title: "",
    amount: "",
    category: "Everyday",
    recurring: false,
  });
  const [savings, setSavings] = useState("");
  function addExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.amount.trim()) return;
    setExpenses(current => [
      { ...draft, title: draft.title.trim(), amount: draft.amount.trim() },
      ...current,
    ]);
    setDraft({ title: "", amount: "", category: "Everyday", recurring: false });
  }
  return (
    <section
      className="journal-spread finances-spread"
      aria-labelledby="finances-title"
    >
      <div className="spread-page finances-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">life · finances</p>
        <h2 id="finances-title">
          Know the flow
          <br />
          <em>without the pressure.</em>
        </h2>
        <p className="page-intro">
          A private place to notice what moves through your life, remember
          recurring bills, and name a saving intention if you have one.
        </p>
        <div className="finance-privacy">
          <HeartPulse size={15} />
          <span>Private local prototype · no financial advice</span>
        </div>
      </div>
      <div className="spread-page finances-page">
        <form className="expense-form" onSubmit={addExpense}>
          <label>
            What was it?
            <input
              value={draft.title}
              onChange={event =>
                setDraft(current => ({ ...current, title: event.target.value }))
              }
              placeholder="e.g. Transport card"
            />
          </label>
          <div>
            <label>
              Amount
              <input
                inputMode="decimal"
                value={draft.amount}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                placeholder="e.g. 25"
              />
            </label>
            <label>
              Category
              <select
                value={draft.category}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
              >
                <option>Everyday</option>
                <option>Food</option>
                <option>Transport</option>
                <option>Learning</option>
                <option>Home</option>
                <option>Joy</option>
              </select>
            </label>
          </div>
          <label className="recurring-bill">
            <input
              type="checkbox"
              checked={draft.recurring}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  recurring: event.target.checked,
                }))
              }
            />
            <span>
              <b>Recurring bill or subscription</b>
              <small>Keep it visible in this private list</small>
            </span>
          </label>
          <Button className="ink-button" type="submit">
            <Plus size={15} /> Add entry
          </Button>
        </form>
        <label className="saving-intention">
          Saving intention{" "}
          <small>optional; not a target or recommendation</small>
          <input
            value={savings}
            onChange={event => setSavings(event.target.value)}
            placeholder="e.g. Put aside for a course or weekend trip"
          />
        </label>
        <div className="expense-list">
          <div>
            <span>private money notes</span>
            <b>{expenses.length} entries</b>
          </div>
          {expenses.length === 0 ? (
            <small>
              Add only what feels useful to notice. You can keep this as light
              as you need.
            </small>
          ) : (
            expenses.map((expense, index) => (
              <article key={`${expense.title}-${index}`}>
                <i>{expense.category.slice(0, 1)}</i>
                <p>
                  <b>{expense.title}</b>
                  <small>
                    {expense.category}
                    {expense.recurring ? " · recurring" : ""}
                  </small>
                </p>
                <em>{expense.amount}</em>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function FinanceCashflowPage({
  onContents,
  onCover,
  onRecord,
}: {
  onContents: () => void;
  onCover: () => void;
  onRecord: (label: string) => void;
}) {
  const [period, setPeriod] = useState<CashFlowPeriod>("weekly");
  const [openings, setOpenings] = useState<Record<CashFlowPeriod, string>>({
    daily: "",
    weekly: "",
    monthly: "",
  });
  const [entries, setEntries] = useState<CashFlowEntry[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [savingIntent, setSavingIntent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    title: "",
    amount: "",
    direction: "out" as CashFlowEntry["direction"],
    category: "Everyday",
    customCategory: "",
    date: new Date().toISOString().slice(0, 10),
    note: "",
    recurring: false,
  });
  useMongoJournalScope({
    scope: "finances",
    payload: { period, openings, entries, customCategories, savingIntent },
    hydrate: payload => {
      if (
        payload.period === "daily" ||
        payload.period === "weekly" ||
        payload.period === "monthly"
      )
        setPeriod(payload.period);
      if (payload.openings && typeof payload.openings === "object")
        setOpenings(payload.openings as Record<CashFlowPeriod, string>);
      if (Array.isArray(payload.entries))
        setEntries(payload.entries as CashFlowEntry[]);
      if (Array.isArray(payload.customCategories))
        setCustomCategories(payload.customCategories as string[]);
      if (typeof payload.savingIntent === "string")
        setSavingIntent(payload.savingIntent);
    },
  });
  const categories = [
    "Everyday",
    "Food",
    "Transport",
    "Learning",
    "Home",
    "Joy",
    "Health",
    "Income",
    ...customCategories,
  ];
  const periodEntries = useMemo(
    () => entriesForPeriod(entries, period),
    [entries, period]
  );
  const openingAmount = Math.max(0, Number(openings[period]) || 0);
  const summary = useMemo(
    () => cashFlowSummary(openingAmount, periodEntries),
    [openingAmount, periodEntries]
  );
  const categoryTotals = useMemo(
    () => cashOutByCategory(periodEntries),
    [periodEntries]
  );
  const runningBalance = useMemo(
    () => runningBalanceSeries(openingAmount, periodEntries),
    [openingAmount, periodEntries]
  );
  const graphRange = Math.max(
    1,
    ...runningBalance.map(point => Math.abs(point.balance)),
    Math.abs(openingAmount)
  );
  function resetDraft() {
    setEditingId(null);
    setDraft({
      title: "",
      amount: "",
      direction: "out",
      category: "Everyday",
      customCategory: "",
      date: new Date().toISOString().slice(0, 10),
      note: "",
      recurring: false,
    });
  }
  function saveEntry(event: React.FormEvent) {
    event.preventDefault();
    const amount = Number(draft.amount);
    const category =
      draft.category === "Custom"
        ? draft.customCategory.trim()
        : draft.category;
    if (
      !draft.title.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !category
    )
      return;
    if (draft.category === "Custom" && !customCategories.includes(category))
      setCustomCategories(current => [...current, category]);
    const entry: CashFlowEntry = {
      id: editingId || `${Date.now()}-cashflow`,
      title: draft.title.trim(),
      amount,
      direction: draft.direction,
      category,
      date: draft.date,
      note: draft.note.trim(),
      recurring: draft.recurring,
    };
    setEntries(current =>
      editingId
        ? current.map(item => (item.id === editingId ? entry : item))
        : [entry, ...current]
    );
    if (!editingId)
      onRecord(
        `${entry.direction === "in" ? "Money in" : "Money out"} · ${entry.title}`
      );
    resetDraft();
  }
  function editEntry(entry: CashFlowEntry) {
    setEditingId(entry.id);
    setDraft({
      title: entry.title,
      amount: String(entry.amount),
      direction: entry.direction,
      category: categories.includes(entry.category) ? entry.category : "Custom",
      customCategory: categories.includes(entry.category) ? "" : entry.category,
      date: entry.date,
      note: entry.note,
      recurring: entry.recurring,
    });
  }
  const chartPoints = runningBalance.length
    ? runningBalance
        .map(
          (point, index) =>
            `${runningBalance.length === 1 ? 50 : 6 + index * (88 / (runningBalance.length - 1))},${88 - ((point.balance + graphRange) / (graphRange * 2)) * 76}`
        )
        .join(" ")
    : "";
  return (
    <section
      className="journal-spread finances-spread"
      aria-labelledby="finances-title"
    >
      <div className="spread-page finances-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">life · finances</p>
        <h2 id="finances-title">
          Know the flow
          <br />
          <em>without the pressure.</em>
        </h2>
        <p className="page-intro">
          A private local cash-flow journal for the amounts you choose to
          record. It does not connect to a bank, give financial advice, or make
          predictions.
        </p>
        <div className="finance-privacy">
          <HeartPulse size={15} />
          <span>Private local entries · no bank connection</span>
        </div>
      </div>
      <div className="spread-page finances-workbench">
        <section className="finance-period-setup">
          <div>
            <span>Set this period</span>
            <b>{periodLabel(period)}</b>
          </div>
          <p>
            Choose a rhythm, then enter the amount you started this current
            period with.
          </p>
          <div className="finance-period-controls">
            <button
              type="button"
              className={cn(period === "daily" && "active")}
              onClick={() => setPeriod("daily")}
            >
              Daily
            </button>
            <button
              type="button"
              className={cn(period === "weekly" && "active")}
              onClick={() => setPeriod("weekly")}
            >
              Weekly
            </button>
            <button
              type="button"
              className={cn(period === "monthly" && "active")}
              onClick={() => setPeriod("monthly")}
            >
              Monthly
            </button>
            <label>
              Opening amount
              <input
                inputMode="decimal"
                value={openings[period]}
                onChange={event =>
                  setOpenings(current => ({
                    ...current,
                    [period]: event.target.value,
                  }))
                }
                placeholder="e.g. 100"
              />
            </label>
          </div>
        </section>
        <section className="finance-balance-summary">
          <article>
            <span>Opening</span>
            <b>
              {openings[period].trim()
                ? openingAmount.toLocaleString()
                : "Not set"}
            </b>
          </article>
          <article className="in">
            <span>Money in</span>
            <b>{summary.moneyIn.toLocaleString()}</b>
          </article>
          <article className="out">
            <span>Money out</span>
            <b>{summary.moneyOut.toLocaleString()}</b>
          </article>
          <article className="balance">
            <span>Current local balance</span>
            <b>
              {openings[period].trim()
                ? summary.currentBalance.toLocaleString()
                : "Set opening amount"}
            </b>
          </article>
        </section>
        <section className="finance-entry-form">
          <div>
            <span>{editingId ? "Edit local record" : "Record cash flow"}</span>
            {editingId ? (
              <button type="button" onClick={resetDraft}>
                Cancel edit
              </button>
            ) : (
              <b>Manual only</b>
            )}
          </div>
          <form onSubmit={saveEntry}>
            <div className="finance-direction">
              <button
                type="button"
                className={cn(draft.direction === "out" && "active out")}
                onClick={() =>
                  setDraft(current => ({
                    ...current,
                    direction: "out",
                    category:
                      current.category === "Income"
                        ? "Everyday"
                        : current.category,
                  }))
                }
              >
                Money out
              </button>
              <button
                type="button"
                className={cn(draft.direction === "in" && "active in")}
                onClick={() =>
                  setDraft(current => ({
                    ...current,
                    direction: "in",
                    category:
                      current.category === "Everyday"
                        ? "Income"
                        : current.category,
                  }))
                }
              >
                Money in
              </button>
            </div>
            <input
              value={draft.title}
              onChange={event =>
                setDraft(current => ({ ...current, title: event.target.value }))
              }
              placeholder={
                draft.direction === "out"
                  ? "e.g. Transport card"
                  : "e.g. Pay or cash added"
              }
            />
            <div className="finance-entry-core">
              <label>
                Amount
                <input
                  inputMode="decimal"
                  value={draft.amount}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  placeholder="e.g. 25"
                />
              </label>
              <label>
                Category
                <select
                  value={draft.category}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                >
                  {categories.map(category => (
                    <option key={category}>{category}</option>
                  ))}
                  <option>Custom</option>
                </select>
              </label>
              <label>
                Date
                <input
                  type="date"
                  value={draft.date}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            {draft.category === "Custom" ? (
              <input
                value={draft.customCategory}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    customCategory: event.target.value,
                  }))
                }
                placeholder="Name a local category"
              />
            ) : null}
            <input
              value={draft.note}
              onChange={event =>
                setDraft(current => ({ ...current, note: event.target.value }))
              }
              placeholder="Optional note"
            />
            <label className="finance-recurring">
              <input
                type="checkbox"
                checked={draft.recurring}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    recurring: event.target.checked,
                  }))
                }
              />{" "}
              Recurring item
            </label>
            <button type="submit">
              <Plus size={14} />{" "}
              {editingId ? "Save record" : "Add local record"}
            </button>
          </form>
        </section>
        <section className="finance-visuals">
          <div className="finance-chart-heading">
            <div>
              <span>Balance movement</span>
              <b>{periodLabel(period)}</b>
            </div>
            <small>
              Changes only reflect the local records in this period.
            </small>
          </div>
          {runningBalance.length ? (
            <svg
              viewBox="0 0 100 100"
              role="img"
              aria-label="Local running balance chart"
            >
              <line x1="4" x2="96" y1="88" y2="88" />
              <line x1="4" x2="96" y1="50" y2="50" />
              <polyline
                points={`4,${88 - ((openingAmount + graphRange) / (graphRange * 2)) * 76} ${chartPoints}`}
              />
            </svg>
          ) : (
            <p>Add a local record to draw this period’s balance movement.</p>
          )}
          <div className="finance-category-bars">
            <div>
              <span>Spending by category</span>
              <b>{categoryTotals.length} categories</b>
            </div>
            {categoryTotals.length ? (
              categoryTotals.map(item => (
                <article key={item.category}>
                  <p>
                    <b>{item.category}</b>
                    <small>{item.amount.toLocaleString()}</small>
                  </p>
                  <i>
                    <em
                      style={{
                        width: `${(item.amount / categoryTotals[0].amount) * 100}%`,
                      }}
                    />
                  </i>
                </article>
              ))
            ) : (
              <small>
                Money-out categories will appear here when you add them.
              </small>
            )}
          </div>
        </section>
        <label className="finance-saving-intention">
          Saving intention{" "}
          <small>Optional and separate from this local balance</small>
          <input
            value={savingIntent}
            onChange={event => setSavingIntent(event.target.value)}
            placeholder="e.g. Put aside for a course or weekend trip"
          />
        </label>
        <section className="finance-history">
          <div>
            <span>Local money history</span>
            <b>{entries.length} saved</b>
          </div>
          {entries.length ? (
            entries.map(entry => (
              <article key={entry.id}>
                <i className={entry.direction}>
                  {entry.direction === "in" ? "+" : "−"}
                </i>
                <p>
                  <b>{entry.title}</b>
                  <small>
                    {entry.direction === "in" ? "Money in" : "Money out"} ·{" "}
                    {entry.category} · {entry.date}
                    {entry.recurring ? " · recurring" : ""}
                  </small>
                  {entry.note ? <em>{entry.note}</em> : null}
                </p>
                <strong>{entry.amount.toLocaleString()}</strong>
                <div>
                  <button type="button" onClick={() => editEntry(entry)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEntries(current =>
                        current.filter(item => item.id !== entry.id)
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))
          ) : (
            <small>
              There are no local money records yet. Add only amounts you want
              this journal to reflect.
            </small>
          )}
        </section>
      </div>
    </section>
  );
}

function TimePage({
  onContents,
  onCover,
  onRecord,
}: {
  onContents: () => void;
  onCover: () => void;
  onRecord: (minutes: number, label: string) => void;
}) {
  type TimeBlock = {
    id: string;
    title: string;
    category: string;
    minutes: number;
    time: string;
    done: boolean;
  };
  const today = new Date().toISOString().slice(0, 10);
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [draft, setDraft] = useState({
    title: "",
    category: "Study",
    minutes: 60,
    time: "",
  });
  const [mode, setMode] = useState<"countdown" | "countup">("countdown");
  const [timingLabel, setTimingLabel] = useState("");
  const [timingCategory, setTimingCategory] = useState("Study");
  const [countdownMinutes, setCountdownMinutes] = useState(25);
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [alarmMessage, setAlarmMessage] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >(() =>
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported"
  );
  const [records, setRecords] = useState<LocalTimerRecord[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [persistedRun, setPersistedRun] = useState<TimerRun | null>(null);
  const timerRunRef = useRef<TimerRun | null>(null);
  useMongoJournalScope({
    scope: "time",
    payload: {
      blocks,
      records,
      mode,
      timingLabel,
      timingCategory,
      countdownMinutes,
      alarmEnabled,
      activeBlockId,
      timerRun: persistedRun,
    },
    hydrate: payload => {
      if (Array.isArray(payload.blocks))
        setBlocks(payload.blocks as TimeBlock[]);
      if (Array.isArray(payload.records))
        setRecords(payload.records as LocalTimerRecord[]);
      if (payload.mode === "countdown" || payload.mode === "countup")
        setMode(payload.mode);
      if (typeof payload.timingLabel === "string")
        setTimingLabel(payload.timingLabel);
      if (typeof payload.timingCategory === "string")
        setTimingCategory(payload.timingCategory);
      if (
        typeof payload.countdownMinutes === "number" &&
        payload.countdownMinutes > 0
      ) {
        setCountdownMinutes(payload.countdownMinutes);
        setSeconds(payload.countdownMinutes * 60);
      }
      if (typeof payload.alarmEnabled === "boolean")
        setAlarmEnabled(payload.alarmEnabled);
      if (
        typeof payload.activeBlockId === "string" ||
        payload.activeBlockId === null
      )
        setActiveBlockId(payload.activeBlockId);
      if (payload.timerRun === null || isTimerRun(payload.timerRun))
        setPersistedRun(payload.timerRun);
    },
  });
  const alarmContextRef = useRef<AudioContext | null>(null);
  const totalMinutes = blocks.reduce(
    (total, block) => total + block.minutes,
    0
  );
  const summary = localTimingSummary(records, today);
  const activeBlock = blocks.find(block => block.id === activeBlockId) || null;
  const displaySeconds = seconds;
  function playTimerAlarm() {
    if (!alarmEnabled) return;
    if (alarmContextRef.current) {
      try {
        const oscillator = alarmContextRef.current.createOscillator();
        const gain = alarmContextRef.current.createGain();
        oscillator.frequency.value = 740;
        gain.gain.setValueAtTime(0.08, alarmContextRef.current.currentTime);
        oscillator.connect(gain).connect(alarmContextRef.current.destination);
        oscillator.start();
        oscillator.stop(alarmContextRef.current.currentTime + 0.45);
      } catch {
        // The visible end state remains available if a browser blocks audio.
      }
    }
    if (
      notificationPermission === "granted" &&
      typeof Notification !== "undefined"
    ) {
      try {
        new Notification("Timer complete", {
          body:
            timingLabel.trim() ||
            activeBlock?.title ||
            "Your local countdown has ended.",
        });
      } catch {
        /* Notification delivery is browser-controlled. */
      }
    }
  }
  function completeCountdown() {
    timerRunRef.current = null;
    setPersistedRun(null);
    setRunning(false);
    setSeconds(0);
    setAlarmMessage("Countdown complete");
    playTimerAlarm();
  }
  useEffect(() => {
    if (!persistedRun || running) return;
    const restoredSeconds = timerSecondsAt(persistedRun, Date.now());
    if (persistedRun.mode === "countdown" && restoredSeconds === 0) {
      setSeconds(0);
      setPersistedRun(null);
      setAlarmMessage("Countdown complete while the page was closed");
      return;
    }
    timerRunRef.current = persistedRun;
    setSeconds(restoredSeconds);
    setRunning(true);
  }, [persistedRun, running]);
  useEffect(() => {
    if (!running || !timerRunRef.current) return;
    let cancelled = false;
    let timeout: number | undefined;
    const tick = () => {
      if (cancelled || !timerRunRef.current) return;
      const next = timerSecondsAt(timerRunRef.current, Date.now());
      setSeconds(next);
      if (timerRunRef.current.mode === "countdown" && next === 0) {
        completeCountdown();
        return;
      }
      timeout = window.setTimeout(tick, 250);
    };
    timeout = window.setTimeout(tick, 0);
    const onVisibilityChange = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      if (timeout !== undefined) window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [running, notificationPermission]);
  function addBlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    const block: TimeBlock = {
      id: `${Date.now()}-block`,
      ...draft,
      title: draft.title.trim(),
      done: false,
    };
    setBlocks(current =>
      [...current, block].sort((first, second) =>
        first.time.localeCompare(second.time)
      )
    );
    setDraft({ title: "", category: "Study", minutes: 60, time: "" });
  }
  function chooseCountdown(value: number) {
    if (running) return;
    setMode("countdown");
    setCountdownMinutes(value);
    setSeconds(value * 60);
    setAlarmMessage(null);
  }
  function prepareAudio() {
    if (!alarmEnabled || alarmContextRef.current) return;
    try {
      const context = new AudioContext();
      void context.resume();
      alarmContextRef.current = context;
    } catch {
      /* A visible end state still records the completed countdown. */
    }
  }
  function beginTimer() {
    prepareAudio();
    setAlarmMessage(null);
    const run: TimerRun = {
      mode,
      baseSeconds: seconds,
      startedAt: Date.now(),
      targetSeconds: mode === "countdown" ? seconds : undefined,
    };
    timerRunRef.current = run;
    setPersistedRun(run);
    setRunning(true);
  }
  function pauseTimer() {
    if (timerRunRef.current)
      setSeconds(timerSecondsAt(timerRunRef.current, Date.now()));
    timerRunRef.current = null;
    setPersistedRun(null);
    setRunning(false);
  }
  function resetTimer() {
    timerRunRef.current = null;
    setPersistedRun(null);
    setRunning(false);
    setSeconds(mode === "countdown" ? countdownMinutes * 60 : 0);
    setAlarmMessage(null);
  }
  function requestBrowserNotifications() {
    if (typeof Notification === "undefined") return;
    void Notification.requestPermission().then(permission =>
      setNotificationPermission(permission)
    );
  }
  function beginBlockTimer(block: TimeBlock) {
    setActiveBlockId(block.id);
    setTimingLabel(block.title);
    setTimingCategory(block.category);
    chooseCountdown(block.minutes);
  }
  function saveTimingRecord() {
    const currentSeconds = timerRunRef.current
      ? timerSecondsAt(timerRunRef.current, Date.now())
      : seconds;
    const recordedSeconds =
      mode === "countdown"
        ? Math.max(1, countdownMinutes * 60 - currentSeconds)
        : currentSeconds;
    if (recordedSeconds <= 0) return;
    const label =
      timingLabel.trim() || activeBlock?.title || "Local timing session";
    setRecords(current => [
      {
        id: `${Date.now()}-time`,
        date: today,
        label,
        category: timingCategory,
        mode,
        seconds: recordedSeconds,
      },
      ...current,
    ]);
    onRecord(Math.max(1, Math.round(recordedSeconds / 60)), label);
    if (activeBlockId)
      setBlocks(current =>
        current.map(block =>
          block.id === activeBlockId ? { ...block, done: true } : block
        )
      );
    resetTimer();
    setActiveBlockId(null);
    setTimingLabel("");
  }
  return (
    <section
      className="journal-spread time-spread"
      aria-labelledby="time-title"
    >
      <div className="spread-page time-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">life · time</p>
        <h2 id="time-title">
          Let the day
          <br />
          <em>have some air.</em>
        </h2>
        <p className="page-intro">
          Make room for study, care, work, movement, and unplanned time. A day
          can be shaped without being overfilled.
        </p>
        <div className="time-sundial">
          <span>
            {Math.floor(totalMinutes / 60)}
            <small>h</small>
          </span>
          <b>{totalMinutes % 60} min planned</b>
        </div>
      </div>
      <div className="spread-page time-clock-page">
        <JournalCalendar />
        <section className="time-clock">
          <div className="time-clock-heading">
            <div>
              <span>Local task clock</span>
              <b>
                {mode === "countdown"
                  ? "Choose a window"
                  : "Track elapsed time"}
              </b>
            </div>
            <small>
              Best effort while this browser tab can run, including when hidden.
              Closing the browser or device stops it.
            </small>
          </div>
          <div className="time-mode-switch">
            <button
              type="button"
              className={cn(mode === "countdown" && "active")}
              onClick={() => {
                if (!running) {
                  setMode("countdown");
                  setSeconds(countdownMinutes * 60);
                }
              }}
            >
              Countdown
            </button>
            <button
              type="button"
              className={cn(mode === "countup" && "active")}
              onClick={() => {
                if (!running) {
                  setMode("countup");
                  setSeconds(0);
                  setAlarmMessage(null);
                }
              }}
            >
              Count up
            </button>
          </div>
          <label className="time-clock-label">
            What are you timing?
            <input
              value={timingLabel}
              onChange={event => setTimingLabel(event.target.value)}
              placeholder="e.g. Revision notes or a small admin task"
            />
          </label>
          <div className="time-clock-controls">
            <label>
              Category
              <select
                value={timingCategory}
                onChange={event => setTimingCategory(event.target.value)}
              >
                <option>Study</option>
                <option>Work</option>
                <option>Movement</option>
                <option>Rest</option>
                <option>Social</option>
                <option>Life admin</option>
              </select>
            </label>
            {mode === "countdown" ? (
              <div className="time-presets">
                {[5, 15, 25, 45, 60].map(value => (
                  <button
                    key={value}
                    type="button"
                    className={cn(countdownMinutes === value && "active")}
                    onClick={() => chooseCountdown(value)}
                    disabled={running}
                  >
                    {value} min
                  </button>
                ))}
              </div>
            ) : (
              <label className="time-alarm-toggle">
                <input
                  type="checkbox"
                  checked={alarmEnabled}
                  onChange={event => setAlarmEnabled(event.target.checked)}
                />{" "}
                Sound when a countdown ends
              </label>
            )}
          </div>
          <div
            className={cn(
              "time-clock-face",
              running && "running",
              alarmMessage && "alarming"
            )}
          >
            <span>
              {alarmMessage ||
                (running
                  ? mode === "countdown"
                    ? "Countdown in progress"
                    : "Count-up in progress"
                  : "Ready when you are")}
            </span>
            <b>{formatClockSeconds(displaySeconds)}</b>
            <small>
              {mode === "countdown"
                ? `${countdownMinutes} min chosen`
                : "Elapsed local time"}
            </small>
          </div>
          <label className="time-alarm-toggle">
            <input
              type="checkbox"
              checked={alarmEnabled}
              onChange={event => setAlarmEnabled(event.target.checked)}
            />{" "}
            Page-active sound alarm when a countdown ends
          </label>
          {notificationPermission === "unsupported" ? (
            <small className="time-notification-note">
              This browser does not support notifications; the in-page
              completion state still appears.
            </small>
          ) : notificationPermission !== "granted" ? (
            <button
              type="button"
              className="time-notification-button"
              onClick={requestBrowserNotifications}
            >
              Allow browser reminder
            </button>
          ) : (
            <small className="time-notification-note">
              Browser reminder enabled for this device.
            </small>
          )}
          <div className="time-clock-actions">
            {running ? (
              <button type="button" onClick={pauseTimer}>
                Pause
              </button>
            ) : (
              <button type="button" onClick={beginTimer}>
                {seconds > 0 &&
                (mode === "countup" || seconds < countdownMinutes * 60)
                  ? "Resume"
                  : "Start"}
              </button>
            )}
            <button type="button" onClick={resetTimer}>
              Reset
            </button>
            <button
              type="button"
              className="time-save"
              onClick={saveTimingRecord}
              disabled={
                mode === "countup"
                  ? seconds === 0
                  : seconds === countdownMinutes * 60
              }
            >
              Save to local time log
            </button>
          </div>
          {alarmMessage ? (
            <div className="time-alarm-state">
              <b>Timer ended</b>
              <span>
                Dismiss it or save this local timing session. No alert is sent
                outside this open page.
              </span>
              <button type="button" onClick={() => setAlarmMessage(null)}>
                Dismiss
              </button>
            </div>
          ) : null}
        </section>
        <section className="time-block-planner">
          <div className="time-section-heading">
            <div>
              <span>Plan a block</span>
              <b>Optional structure</b>
            </div>
            <small>A plan can become a timer when you are ready.</small>
          </div>
          <form className="time-form" onSubmit={addBlock}>
            <label>
              Time block
              <input
                value={draft.title}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="e.g. Review lecture notes"
              />
            </label>
            <div>
              <label>
                Start time
                <input
                  type="time"
                  value={draft.time}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      time: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Category
                <select
                  value={draft.category}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                >
                  <option>Study</option>
                  <option>Work</option>
                  <option>Movement</option>
                  <option>Rest</option>
                  <option>Social</option>
                  <option>Life admin</option>
                </select>
              </label>
            </div>
            <label className="duration-control">
              Planned duration <b>{draft.minutes} min</b>
              <input
                type="range"
                min="15"
                max="240"
                step="15"
                value={draft.minutes}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    minutes: Number(event.target.value),
                  }))
                }
              />
            </label>
            <Button className="ink-button" type="submit">
              <Plus size={15} /> Add block
            </Button>
          </form>
        </section>
        <section className="time-facts">
          <div>
            <span>Time, factually</span>
            <b>{formatClockSeconds(summary.todaySeconds)} today</b>
          </div>
          <p>
            {summary.todaySessions
              ? `${summary.todaySessions} local session${summary.todaySessions === 1 ? "" : "s"} saved · ${formatClockSeconds(summary.countdownSeconds)} countdown · ${formatClockSeconds(summary.countupSeconds)} count-up.`
              : "Save a local timing session to see a factual picture of your day here."}
          </p>
        </section>
        <section className="time-ribbon">
          <div>
            <span>Today’s blocks</span>
            <b>{blocks.filter(block => !block.done).length} open</b>
          </div>
          {blocks.length === 0 ? (
            <small>
              Start with one block that would make your day feel more
              intentional.
            </small>
          ) : (
            blocks.map(block => (
              <article
                className={cn(
                  block.category.toLowerCase().replace(" ", "-"),
                  block.done && "done",
                  activeBlockId === block.id && "is-active"
                )}
                key={block.id}
              >
                <i>{block.time || "—"}</i>
                <p>
                  <b>{block.title}</b>
                  <small>
                    {block.category} · {block.minutes} minutes
                  </small>
                </p>
                <button
                  type="button"
                  onClick={() => beginBlockTimer(block)}
                  disabled={running || block.done}
                >
                  {block.done
                    ? "Saved"
                    : activeBlockId === block.id
                      ? "Ready"
                      : "Use timer"}
                </button>
              </article>
            ))
          )}
        </section>
        <section className="time-history">
          <div>
            <span>Recent local timing</span>
            <b>· {records.length} saved</b>
          </div>
          {records.length === 0 ? (
            <small>
              Saved countdowns and count-up sessions remain on this page only.
            </small>
          ) : (
            records.slice(0, 5).map(record => (
              <article key={record.id}>
                <div>
                  <b>
                    {formatClockSeconds(record.seconds)} · {record.label}
                  </b>
                  <small>
                    {record.date} · {record.category} ·{" "}
                    {record.mode === "countdown" ? "Countdown" : "Count up"}
                  </small>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setRecords(current =>
                      current.filter(item => item.id !== record.id)
                    )
                  }
                >
                  Remove
                </button>
              </article>
            ))
          )}
        </section>
      </div>
    </section>
  );
}

function GoalsPage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  type Goal = {
    title: string;
    category: string;
    deadline: string;
    priority: string;
    progress: number;
    nextAction: string;
    nextActionDone: boolean;
    obstacle: string;
    note: string;
    milestones: string[];
  };
  const [goals, setGoals] = useState<Goal[]>([]);
  const [draft, setDraft] = useState({
    title: "",
    category: "Growth",
    deadline: "",
    priority: "Meaningful",
    progress: 0,
    nextAction: "",
    obstacle: "",
    note: "",
  });
  const [milestone, setMilestone] = useState("");
  const [milestones, setMilestones] = useState<string[]>([]);
  function addMilestone() {
    if (!milestone.trim()) return;
    setMilestones(current => [...current, milestone.trim()]);
    setMilestone("");
  }
  function addGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    setGoals(current => [
      ...current,
      {
        ...draft,
        title: draft.title.trim(),
        milestones,
        nextActionDone: false,
      },
    ]);
    setDraft({
      title: "",
      category: "Growth",
      deadline: "",
      priority: "Meaningful",
      progress: 0,
      nextAction: "",
      obstacle: "",
      note: "",
    });
    setMilestones([]);
  }
  return (
    <section
      className="journal-spread goals-spread"
      aria-labelledby="goals-title"
    >
      <div className="spread-page goals-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">goals & growth · goals</p>
        <h2 id="goals-title">
          Let the future
          <br />
          <em>meet your next step.</em>
        </h2>
        <p className="page-intro">
          A goal is not a score. Name what matters, notice what makes it hard,
          and choose a next action gentle enough to begin.
        </p>
        <div className="goal-spark">
          <Target size={17} />
          <span>{goals.length} intentions in bloom</span>
        </div>
      </div>
      <div className="spread-page goals-page">
        <form className="goal-form" onSubmit={addGoal}>
          <label>
            What matters now?
            <input
              value={draft.title}
              onChange={event =>
                setDraft(current => ({ ...current, title: event.target.value }))
              }
              placeholder="Name a goal in your own words"
            />
          </label>
          <div>
            <label>
              Category
              <select
                value={draft.category}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
              >
                <option>Growth</option>
                <option>Learning</option>
                <option>Health</option>
                <option>Career</option>
                <option>Home</option>
              </select>
            </label>
            <label>
              Deadline
              <input
                type="date"
                value={draft.deadline}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    deadline: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <div>
            <label>
              Priority
              <select
                value={draft.priority}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    priority: event.target.value,
                  }))
                }
              >
                <option>Meaningful</option>
                <option>Steady</option>
                <option>Time-sensitive</option>
              </select>
            </label>
            <label>
              Next action
              <input
                value={draft.nextAction}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    nextAction: event.target.value,
                  }))
                }
                placeholder="A 10-minute beginning"
              />
            </label>
          </div>
          <label className="goal-progress">
            Progress <b>{draft.progress}%</b>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={draft.progress}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  progress: Number(event.target.value),
                }))
              }
            />
          </label>
          <label>
            Possible obstacle
            <input
              value={draft.obstacle}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  obstacle: event.target.value,
                }))
              }
              placeholder="What might get in the way?"
            />
          </label>
          <label>
            Note
            <input
              value={draft.note}
              onChange={event =>
                setDraft(current => ({ ...current, note: event.target.value }))
              }
              placeholder="Why does this matter?"
            />
          </label>
          <div className="goal-milestone">
            <span>Milestones</span>
            <div>
              <input
                value={milestone}
                onChange={event => setMilestone(event.target.value)}
                onKeyDown={event => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addMilestone();
                  }
                }}
                placeholder="A marker along the way"
              />
              <button type="button" onClick={addMilestone}>
                <Plus size={14} />
              </button>
            </div>
            {milestones.map((item, index) => (
              <p key={`${item}-${index}`}>
                {item}
                <button
                  type="button"
                  onClick={() =>
                    setMilestones(current =>
                      current.filter((_, position) => position !== index)
                    )
                  }
                >
                  <X size={12} />
                </button>
              </p>
            ))}
          </div>
          <Button className="ink-button" type="submit">
            <Plus size={15} /> Save goal
          </Button>
        </form>
        <div className="goal-garden">
          <div>
            <span>your intention garden</span>
            <b>{goals.length} growing</b>
          </div>
          {goals.length === 0 ? (
            <small>
              Start with one thing that would make the next season feel more
              like yours.
            </small>
          ) : (
            goals.map((goal, index) => (
              <article key={`${goal.title}-${index}`}>
                <i>{goal.category.slice(0, 1)}</i>
                <p>
                  <b>{goal.title}</b>
                  <small>
                    {goal.priority}
                    {goal.deadline ? ` · by ${goal.deadline}` : ""} ·{" "}
                    {goal.progress}%
                  </small>
                  <em>
                    {goal.note ||
                      "Why this matters can be added whenever you are ready."}
                  </em>
                  <small>
                    {goal.obstacle
                      ? `Obstacle: ${goal.obstacle}`
                      : "No obstacle noted yet."}
                  </small>
                  {goal.nextAction && (
                    <button
                      type="button"
                      className={cn(
                        "goal-action-link",
                        goal.nextActionDone && "done"
                      )}
                      onClick={() =>
                        setGoals(current =>
                          current.map((item, position) =>
                            position === index
                              ? {
                                  ...item,
                                  nextActionDone: !item.nextActionDone,
                                }
                              : item
                          )
                        )
                      }
                    >
                      {goal.nextActionDone
                        ? "✓ Completed linked action"
                        : `○ Do next: ${goal.nextAction}`}
                    </button>
                  )}
                </p>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function GoalsWorkspacePage({
  onContents,
  onCover,
  onTasks,
  onLearning,
  onStudy,
  onTime,
  onRecord,
}: {
  onContents: () => void;
  onCover: () => void;
  onTasks: () => void;
  onLearning: () => void;
  onStudy: () => void;
  onTime: () => void;
  onRecord: (label: string) => void;
}) {
  type GoalType =
    | "intention"
    | "milestone-project"
    | "practice-goal"
    | "measurable-target";
  type GoalRecord = {
    id: string;
    title: string;
    type: GoalType;
    category: string;
    deadline: string;
    nextAction: string;
    nextActionDone: boolean;
    why: string;
    obstacle: string;
    state: GoalState;
    manualProgress: number;
    milestones: GoalMilestoneRecord[];
    reviewNote: string;
  };
  const newDraft = () => ({
    title: "",
    type: "intention" as GoalType,
    category: "Growth",
    deadline: "",
    nextAction: "",
    why: "",
    obstacle: "",
  });
  const [goals, setGoals] = useState<GoalRecord[]>([]);
  const [draft, setDraft] = useState(newDraft);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [draftMilestones, setDraftMilestones] = useState<GoalMilestoneRecord[]>(
    []
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentGoalId, setCurrentGoalId] = useState<string | null>(null);
  const [reviewText, setReviewText] = useState("");
  useMongoJournalScope({
    scope: "goals",
    payload: { goals, currentGoalId },
    hydrate: payload => {
      if (Array.isArray(payload.goals)) setGoals(payload.goals as GoalRecord[]);
      if (
        typeof payload.currentGoalId === "string" ||
        payload.currentGoalId === null
      )
        setCurrentGoalId(payload.currentGoalId);
    },
  });
  const activeGoals = goals.filter(goal => goal.state === "active");
  const currentGoal =
    activeGoals.find(goal => goal.id === currentGoalId) ??
    activeGoals[0] ??
    null;
  const otherActiveGoals = activeGoals.filter(
    goal => goal.id !== currentGoal?.id
  );
  const reviewItems = reviewGoals(goals);
  const summary = goalStateSummary(goals);
  const typeLabel: Record<GoalType, string> = {
    intention: "Intention",
    "milestone-project": "Milestone project",
    "practice-goal": "Practice goal",
    "measurable-target": "Measurable target",
  };

  function addDraftMilestone() {
    const title = milestoneTitle.trim();
    if (!title) return;
    setDraftMilestones(current => [
      ...current,
      { id: `milestone-${Date.now()}-${current.length}`, title, done: false },
    ]);
    setMilestoneTitle("");
  }

  function resetEditor() {
    setDraft(newDraft());
    setDraftMilestones([]);
    setMilestoneTitle("");
    setEditingId(null);
  }

  function saveGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    if (editingId) {
      setGoals(current =>
        current.map(goal =>
          goal.id === editingId
            ? {
                ...goal,
                ...draft,
                title: draft.title.trim(),
                milestones: draftMilestones,
              }
            : goal
        )
      );
    } else {
      const id = `goal-${Date.now()}`;
      setGoals(current => [
        ...current,
        {
          ...draft,
          id,
          title: draft.title.trim(),
          state: "active",
          manualProgress: 0,
          nextActionDone: false,
          milestones: draftMilestones,
          reviewNote: "",
        },
      ]);
      setCurrentGoalId(current => current ?? id);
      onRecord(draft.title.trim());
    }
    resetEditor();
  }

  function beginEditing(goal: GoalRecord) {
    setEditingId(goal.id);
    setDraft({
      title: goal.title,
      type: goal.type,
      category: goal.category,
      deadline: goal.deadline,
      nextAction: goal.nextAction,
      why: goal.why,
      obstacle: goal.obstacle,
    });
    setDraftMilestones(goal.milestones);
    setMilestoneTitle("");
  }

  function updateGoal(id: string, update: (goal: GoalRecord) => GoalRecord) {
    setGoals(current =>
      current.map(goal => (goal.id === id ? update(goal) : goal))
    );
  }

  function renderGoalCard(goal: GoalRecord, current = false) {
    const progress = factualGoalProgress(goal.milestones, goal.manualProgress);
    const completedMilestones = goal.milestones.filter(
      milestone => milestone.done
    ).length;
    return (
      <article
        className={cn(
          "goal-workspace-card",
          current && "is-current",
          goal.state !== "active" && `is-${goal.state}`
        )}
        key={goal.id}
      >
        <div className="goal-card-title">
          <div>
            <span>
              {typeLabel[goal.type]} · {goal.category}
            </span>
            <b>{goal.title}</b>
          </div>
          <button type="button" onClick={() => beginEditing(goal)}>
            Edit
          </button>
        </div>
        <p className="goal-card-why">
          {goal.why || "Why this matters can be added whenever you are ready."}
        </p>
        {goal.deadline ? (
          <small className="goal-date">
            Review or target date · {goal.deadline}
          </small>
        ) : (
          <small className="goal-date">
            No date set · this can remain an open intention.
          </small>
        )}
        {goal.nextAction ? (
          <button
            type="button"
            className={cn("goal-next-action", goal.nextActionDone && "done")}
            onClick={() =>
              updateGoal(goal.id, item => ({
                ...item,
                nextActionDone: !item.nextActionDone,
              }))
            }
          >
            {goal.nextActionDone
              ? "✓ Next action noted as done"
              : `○ Do next · ${goal.nextAction}`}
          </button>
        ) : (
          <small className="goal-next-action empty">
            Add a small next action when you are ready.
          </small>
        )}
        {goal.milestones.length ? (
          <div className="goal-milestone-list">
            <div>
              <span>Milestones</span>
              <b>
                {completedMilestones} of {goal.milestones.length} complete
              </b>
            </div>
            {goal.milestones.map(milestone => (
              <label key={milestone.id}>
                <input
                  type="checkbox"
                  checked={milestone.done}
                  onChange={() =>
                    updateGoal(goal.id, item => ({
                      ...item,
                      milestones: item.milestones.map(entry =>
                        entry.id === milestone.id
                          ? { ...entry, done: !entry.done }
                          : entry
                      ),
                    }))
                  }
                />
                <span>{milestone.title}</span>
              </label>
            ))}
          </div>
        ) : (
          <label className="goal-manual-progress">
            Your own progress estimate <b>{progress}%</b>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={goal.manualProgress}
              onChange={event =>
                updateGoal(goal.id, item => ({
                  ...item,
                  manualProgress: Number(event.target.value),
                }))
              }
            />
          </label>
        )}
        {goal.obstacle ? (
          <small className="goal-obstacle">
            Possible obstacle · {goal.obstacle}
          </small>
        ) : null}
        <div className="goal-card-actions">
          {goal.state === "active" ? (
            <>
              <button type="button" onClick={() => setCurrentGoalId(goal.id)}>
                {current ? "Current focus" : "Make current"}
              </button>
              <button
                type="button"
                onClick={() =>
                  updateGoal(goal.id, item => ({ ...item, state: "paused" }))
                }
              >
                Pause
              </button>
              <button
                type="button"
                onClick={() =>
                  updateGoal(goal.id, item => ({ ...item, state: "completed" }))
                }
              >
                Complete
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() =>
                  updateGoal(goal.id, item => ({ ...item, state: "active" }))
                }
              >
                Continue
              </button>
              <button
                type="button"
                onClick={() =>
                  updateGoal(goal.id, item => ({ ...item, state: "archived" }))
                }
              >
                Archive
              </button>
            </>
          )}
          <button
            type="button"
            className="remove"
            onClick={() =>
              setGoals(items => items.filter(item => item.id !== goal.id))
            }
          >
            Remove
          </button>
        </div>
        {goal.state !== "active" ? (
          <div className="goal-review-note">
            <input
              value={currentGoal?.id === goal.id ? reviewText : goal.reviewNote}
              onChange={event => {
                setReviewText(event.target.value);
                updateGoal(goal.id, item => ({
                  ...item,
                  reviewNote: event.target.value,
                }));
              }}
              placeholder="Brief review note: what changed?"
            />
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <section
      className="journal-spread goals-spread goals-workspace-spread"
      aria-labelledby="goals-title"
    >
      <div className="spread-page goals-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">goals & growth · goals</p>
        <h2 id="goals-title">
          Let the future
          <br />
          <em>meet your next step.</em>
        </h2>
        <p className="page-intro">
          A goal is not a score. Name what matters, notice what makes it hard,
          and choose a next action gentle enough to begin.
        </p>
        <div className="goal-spark">
          <Target size={17} />
          <span>
            {summary.active} active intention{summary.active === 1 ? "" : "s"} ·{" "}
            {summary.completed} complete
          </span>
        </div>
      </div>
      <div className="spread-page goals-workspace-page">
        <section className="goal-capture">
          <div className="goal-section-heading">
            <div>
              <span>What matters now</span>
              <b>
                {editingId
                  ? "Refine this goal"
                  : "Start with one clear intention"}
              </b>
            </div>
            <small>
              Dates and measures are optional unless they help this goal.
            </small>
          </div>
          <form onSubmit={saveGoal}>
            <label>
              Goal in your own words
              <input
                value={draft.title}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="e.g. Build a portfolio I feel good about"
              />
            </label>
            <div className="goal-form-pair">
              <label>
                Goal shape
                <select
                  value={draft.type}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      type: event.target.value as GoalType,
                    }))
                  }
                >
                  <option value="intention">Intention</option>
                  <option value="milestone-project">Milestone project</option>
                  <option value="practice-goal">Practice goal</option>
                  <option value="measurable-target">Measurable target</option>
                </select>
              </label>
              <label>
                Area
                <select
                  value={draft.category}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                >
                  <option>Growth</option>
                  <option>Learning</option>
                  <option>Health</option>
                  <option>Career</option>
                  <option>Home</option>
                  <option>Relationships</option>
                </select>
              </label>
            </div>
            <div className="goal-form-pair">
              <label>
                Target or review date <small>Optional</small>
                <input
                  type="date"
                  value={draft.deadline}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      deadline: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Smallest next action
                <input
                  value={draft.nextAction}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      nextAction: event.target.value,
                    }))
                  }
                  placeholder="A beginning that feels possible"
                />
              </label>
            </div>
            <label>
              Why does this matter?
              <input
                value={draft.why}
                onChange={event =>
                  setDraft(current => ({ ...current, why: event.target.value }))
                }
                placeholder="A short note to your future self"
              />
            </label>
            <label>
              Possible obstacle <small>Optional</small>
              <input
                value={draft.obstacle}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    obstacle: event.target.value,
                  }))
                }
                placeholder="What might make this harder?"
              />
            </label>
            <div className="goal-draft-milestones">
              <div>
                <span>
                  Milestones <small>Optional</small>
                </span>
                <div>
                  <input
                    value={milestoneTitle}
                    onChange={event => setMilestoneTitle(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addDraftMilestone();
                      }
                    }}
                    placeholder="Add a marker along the way"
                  />
                  <button type="button" onClick={addDraftMilestone}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              {draftMilestones.length ? (
                <div className="goal-draft-tags">
                  {draftMilestones.map(milestone => (
                    <button
                      type="button"
                      key={milestone.id}
                      onClick={() =>
                        setDraftMilestones(current =>
                          current.filter(item => item.id !== milestone.id)
                        )
                      }
                    >
                      {milestone.title} <X size={12} />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="goal-form-actions">
              <Button className="ink-button" type="submit">
                <Plus size={15} /> {editingId ? "Save changes" : "Save goal"}
              </Button>
              {editingId ? (
                <button type="button" onClick={resetEditor}>
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        </section>
        <section className="goal-current-focus">
          <div className="goal-section-heading">
            <div>
              <span>Current focus</span>
              <b>
                {currentGoal
                  ? "One place to return to"
                  : "Choose a goal when one is ready"}
              </b>
            </div>
            <small>
              Progress is a record of your check-ins and completed milestones,
              not a prediction.
            </small>
          </div>
          {currentGoal ? (
            renderGoalCard(currentGoal, true)
          ) : (
            <div className="goal-empty">
              <b>No current focus yet</b>
              <span>
                Save one goal, then make it your current focus when it is
                useful.
              </span>
            </div>
          )}
          <div className="goal-handoffs">
            <span>Open a related local workspace</span>
            <div>
              <button type="button" onClick={onTasks}>
                Tasks
              </button>
              <button type="button" onClick={onLearning}>
                Learning
              </button>
              <button type="button" onClick={onStudy}>
                Study sessions
              </button>
              <button type="button" onClick={onTime}>
                Time
              </button>
            </div>
          </div>
        </section>
        <section className="goal-garden-workspace">
          <div className="goal-section-heading">
            <div>
              <span>Growing goals</span>
              <b>{otherActiveGoals.length} other active</b>
            </div>
            <small>Each card holds only what you created here.</small>
          </div>
          {otherActiveGoals.length ? (
            otherActiveGoals.map(goal => renderGoalCard(goal))
          ) : (
            <div className="goal-empty">
              <b>
                {goals.length
                  ? "No other active goals"
                  : "Your intention garden is clear"}
              </b>
              <span>
                {goals.length
                  ? "Keep one current focus, or save another goal when it matters."
                  : "Start with one thing that would make the next season feel more like yours."}
              </span>
            </div>
          )}
        </section>
        <section className="goal-review-shelf">
          <div className="goal-section-heading">
            <div>
              <span>Review and archive</span>
              <b>{reviewItems.length} to revisit</b>
            </div>
            <small>
              Pause, complete, revise, or archive without treating a change of
              plan as failure.
            </small>
          </div>
          {reviewItems.length ? (
            reviewItems.map(goal => renderGoalCard(goal))
          ) : (
            <div className="goal-empty">
              <b>No paused or completed goals yet</b>
              <span>
                When a goal changes shape, its review note can stay here
                locally.
              </span>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function StudyWorkbenchPage({
  onContents,
  onCover,
  onCourses,
  onAssignments,
  onExams,
  onRecord,
}: {
  onContents: () => void;
  onCover: () => void;
  onCourses: () => void;
  onAssignments: () => void;
  onExams: () => void;
  onRecord: (minutes: number, label: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [topic, setTopic] = useState("");
  const [contextType, setContextType] = useState("Course");
  const [contextName, setContextName] = useState("");
  const [method, setMethod] = useState("Active recall");
  const [nextStep, setNextStep] = useState("");
  const [interruption, setInterruption] = useState("");
  const [duration, setDuration] = useState(25);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [awaitingOutcome, setAwaitingOutcome] = useState(false);
  const [sessions, setSessions] = useState<StudySessionRecord[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({
    outcome: "Finished",
    nextStep: "",
  });
  useMongoJournalScope({
    scope: "study-sessions",
    payload: { sessions },
    hydrate: payload => {
      if (Array.isArray(payload.sessions))
        setSessions(payload.sessions as StudySessionRecord[]);
    },
  });
  const summary = studyTimeSummary(sessions, today);
  const allMinutes = sessions.reduce(
    (total, session) => total + session.minutes,
    0
  );
  useEffect(() => {
    if (!isRunning || remainingSeconds <= 0) return;
    const timer = window.setInterval(
      () => setRemainingSeconds(current => Math.max(0, current - 1)),
      1000
    );
    return () => window.clearInterval(timer);
  }, [isRunning, remainingSeconds]);
  useEffect(() => {
    if (!isRunning || remainingSeconds !== 0) return;
    setIsRunning(false);
    if (isBreak) {
      setIsBreak(false);
      setRemainingSeconds(duration * 60);
    } else {
      setAwaitingOutcome(true);
    }
  }, [duration, isBreak, isRunning, remainingSeconds]);
  function selectDuration(value: number) {
    setDuration(value);
    if (!isRunning && !awaitingOutcome && !isBreak)
      setRemainingSeconds(value * 60);
  }
  function startSession() {
    if (!topic.trim()) return;
    setIsBreak(false);
    setAwaitingOutcome(false);
    setRemainingSeconds(duration * 60);
    setIsRunning(true);
  }
  function saveOutcome(outcome: string) {
    const completedMinutes = Math.max(
      1,
      Math.round((duration * 60 - remainingSeconds) / 60) || duration
    );
    const record: StudySessionRecord = {
      id: `${Date.now()}-study`,
      date: today,
      minutes: completedMinutes,
      topic: topic.trim() || "Study session",
      contextType,
      contextName: contextName.trim(),
      method,
      outcome,
      nextStep: nextStep.trim(),
      interruption: interruption.trim(),
    };
    setSessions(current => [record, ...current]);
    onRecord(completedMinutes, record.topic);
    setIsRunning(false);
    setAwaitingOutcome(false);
    setRemainingSeconds(duration * 60);
    setTopic("");
    setContextName("");
    setNextStep("");
    setInterruption("");
  }
  function beginBreak() {
    setIsBreak(true);
    setAwaitingOutcome(false);
    setRemainingSeconds(5 * 60);
    setIsRunning(true);
  }
  function saveEdit(id: string) {
    setSessions(current =>
      current.map(session =>
        session.id === id
          ? {
              ...session,
              outcome: editDraft.outcome,
              nextStep: editDraft.nextStep.trim(),
            }
          : session
      )
    );
    setEditId(null);
  }
  return (
    <section
      className="journal-spread study-spread"
      aria-labelledby="study-title"
    >
      <div className="spread-page study-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">life · education · study sessions</p>
        <h2 id="study-title">
          Give focus
          <br />
          <em>one clear shape.</em>
        </h2>
        <p className="page-intro">
          Plan one intention, choose a small window, and notice distractions
          without turning them into a failure.
        </p>
        <div className="study-orbit">
          <span>{allMinutes}</span>
          <small>minutes held</small>
        </div>
      </div>
      <div className="spread-page study-workbench">
        <section className="study-context">
          <div>
            <span>What are you studying?</span>
            <b>Local academic focus</b>
          </div>
          <input
            value={topic}
            onChange={event => setTopic(event.target.value)}
            placeholder="Topic or study intention"
          />
          <div className="study-context-fields">
            <label>
              Connected to
              <select
                value={contextType}
                onChange={event => setContextType(event.target.value)}
              >
                <option>Course</option>
                <option>Assignment</option>
                <option>Exam</option>
                <option>Independent study</option>
              </select>
            </label>
            <label>
              Course, assignment, or exam
              <input
                value={contextName}
                onChange={event => setContextName(event.target.value)}
                placeholder="Optional context"
              />
            </label>
            <label>
              Method
              <select
                value={method}
                onChange={event => setMethod(event.target.value)}
              >
                <option>Active recall</option>
                <option>Practice questions</option>
                <option>Reading</option>
                <option>Mock exam</option>
                <option>Review notes</option>
              </select>
            </label>
          </div>
          <label className="study-next-step">
            Next smallest action
            <input
              value={nextStep}
              onChange={event => setNextStep(event.target.value)}
              placeholder="e.g. Answer questions 1–5"
            />
          </label>
        </section>
        <section className={cn("study-timer", isBreak && "break-mode")}>
          <div className="study-timer-top">
            <div>
              <span>
                {isBreak
                  ? "Gentle break"
                  : awaitingOutcome
                    ? "Session ready"
                    : isRunning
                      ? "Focus in progress"
                      : "Ready when you are"}
              </span>
              <b>{formatStudyTimer(remainingSeconds)}</b>
              <small>
                {isBreak
                  ? "A short pause is part of the work."
                  : `${duration} minute local session`}
              </small>
            </div>
            <div className="study-lengths">
              {[15, 25, 45, 60].map(value => (
                <button
                  type="button"
                  className={cn(duration === value && "active")}
                  onClick={() => selectDuration(value)}
                  disabled={isRunning || isBreak}
                >
                  {value} min
                </button>
              ))}
            </div>
          </div>
          {awaitingOutcome ? (
            <div className="study-outcomes">
              <span>How should this session be held?</span>
              <button type="button" onClick={() => saveOutcome("Finished")}>
                Finished
              </button>
              <button
                type="button"
                onClick={() => saveOutcome("Continue later")}
              >
                Continue later
              </button>
              <button
                type="button"
                onClick={() => saveOutcome("Choose next step")}
              >
                Choose next step
              </button>
            </div>
          ) : (
            <div className="study-timer-actions">
              {isRunning ? (
                <button type="button" onClick={() => setIsRunning(false)}>
                  Pause
                </button>
              ) : !isBreak ? (
                <button
                  type="button"
                  onClick={startSession}
                  disabled={!topic.trim()}
                >
                  {remainingSeconds < duration * 60
                    ? "Resume focus"
                    : "Start focus"}
                </button>
              ) : (
                <button type="button" onClick={() => setIsRunning(true)}>
                  Resume break
                </button>
              )}
              {!isBreak &&
              !awaitingOutcome &&
              (isRunning || remainingSeconds < duration * 60) ? (
                <button type="button" onClick={() => setAwaitingOutcome(true)}>
                  End session
                </button>
              ) : null}
              {!isBreak && !awaitingOutcome && !isRunning ? (
                <button
                  type="button"
                  className="study-break"
                  onClick={beginBreak}
                >
                  Take 5 min break
                </button>
              ) : null}
            </div>
          )}
        </section>
        <section className="study-session-note">
          <label>
            If something pulled you away{" "}
            <small>optional, simply notice it</small>
            <input
              value={interruption}
              onChange={event => setInterruption(event.target.value)}
              placeholder="e.g. Notifications, tiredness, an errand"
            />
          </label>
        </section>
        <section className="study-summary">
          <div>
            <span>Study time, factually</span>
            <b>
              {summary.todayMinutes} min today · {summary.weekMinutes} min this
              week
            </b>
          </div>
          <p>
            {summary.dominantContext
              ? `${summary.dominantContext} is the largest local study context in this seven-day view.`
              : "Finish a local session to see a factual study pattern here."}
          </p>
          <div>
            <button type="button" onClick={onCourses}>
              Courses
            </button>
            <button type="button" onClick={onAssignments}>
              Assignments
            </button>
            <button type="button" onClick={onExams}>
              Exams
            </button>
          </div>
        </section>
        <section className="study-history-workbench">
          <div>
            <span>Recent study sessions</span>
            <b>· {sessions.length} saved</b>
          </div>
          {sessions.length === 0 ? (
            <small>
              Your completed sessions will build a kinder local record of your
              effort here.
            </small>
          ) : (
            sessions.slice(0, 6).map(session => (
              <article key={session.id}>
                <div>
                  <b>
                    {session.minutes} min · {session.topic}
                  </b>
                  <small>
                    {session.date} · {session.contextType}
                    {session.contextName
                      ? `: ${session.contextName}`
                      : ""} · {session.method} · {session.outcome}
                  </small>
                  {session.nextStep ? <em>Next: {session.nextStep}</em> : null}
                  {session.interruption ? (
                    <em>Noticed: {session.interruption}</em>
                  ) : null}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditId(session.id);
                      setEditDraft({
                        outcome: session.outcome,
                        nextStep: session.nextStep,
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSessions(current =>
                        current.filter(item => item.id !== session.id)
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
                {editId === session.id ? (
                  <div className="study-edit">
                    <select
                      value={editDraft.outcome}
                      onChange={event =>
                        setEditDraft(current => ({
                          ...current,
                          outcome: event.target.value,
                        }))
                      }
                    >
                      <option>Finished</option>
                      <option>Continue later</option>
                      <option>Choose next step</option>
                    </select>
                    <input
                      value={editDraft.nextStep}
                      onChange={event =>
                        setEditDraft(current => ({
                          ...current,
                          nextStep: event.target.value,
                        }))
                      }
                      placeholder="Next step"
                    />
                    <button type="button" onClick={() => saveEdit(session.id)}>
                      Save
                    </button>
                  </div>
                ) : null}
              </article>
            ))
          )}
        </section>
      </div>
    </section>
  );
}

function StudySessionsPage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  type Session = {
    topic: string;
    duration: number;
    distraction: string;
    completedAt: string;
  };
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState(25);
  const [distraction, setDistraction] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  function saveSession() {
    if (!topic.trim()) return;
    setSessions(current => [
      {
        topic: topic.trim(),
        duration,
        distraction,
        completedAt: new Date().toLocaleDateString("en", {
          month: "short",
          day: "numeric",
        }),
      },
      ...current,
    ]);
    setTopic("");
    setDistraction("");
  }
  return (
    <section
      className="journal-spread study-spread"
      aria-labelledby="study-title"
    >
      <div className="spread-page study-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">life · education · study sessions</p>
        <h2 id="study-title">
          Give focus
          <br />
          <em>one clear shape.</em>
        </h2>
        <p className="page-intro">
          Plan one intention, choose a small window, and notice distractions
          without turning them into a failure.
        </p>
        <div className="study-orbit">
          <span>
            {sessions.reduce((total, session) => total + session.duration, 0)}
          </span>
          <small>minutes held</small>
        </div>
      </div>
      <div className="spread-page study-page">
        <label className="study-topic">
          Today’s focus
          <input
            value={topic}
            onChange={event => setTopic(event.target.value)}
            placeholder="What will you study or review?"
          />
        </label>
        <div className="study-length">
          <span>Session length</span>
          <div>
            {[15, 25, 45, 60].map(value => (
              <button
                type="button"
                className={cn(duration === value && "active")}
                onClick={() => setDuration(value)}
                key={value}
              >
                {value} min
              </button>
            ))}
          </div>
        </div>
        <label className="study-distraction">
          If something pulled you away <small>optional, just notice it</small>
          <input
            value={distraction}
            onChange={event => setDistraction(event.target.value)}
            placeholder="e.g. Notifications, tiredness, an errand"
          />
        </label>
        <Button className="ink-button" type="button" onClick={saveSession}>
          <CircleCheck size={15} /> Complete session
        </Button>
        <div className="study-history">
          <div>
            <span>session history</span>
            <b>{sessions.length} complete</b>
          </div>
          {sessions.length === 0 ? (
            <small>
              Your completed sessions will build a kinder record of your effort
              here.
            </small>
          ) : (
            sessions.map((session, index) => (
              <article key={`${session.topic}-${index}`}>
                <i>{session.duration}</i>
                <p>
                  <b>{session.topic}</b>
                  <small>
                    {session.completedAt}
                    {session.distraction
                      ? ` · Noticed: ${session.distraction}`
                      : " · Clear focus"}
                  </small>
                </p>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function ExamPlannerPage({
  onContents,
  onCover,
  onFocus,
}: {
  onContents: () => void;
  onCover: () => void;
  onFocus: () => void;
}) {
  type Topic = {
    id: string;
    label: string;
    status: "Needs practice" | "Revising" | "Confident";
  };
  type ExamPlan = {
    id: string;
    title: string;
    date: string;
    focus: string;
    readiness: number;
    topics: Topic[];
    checkpoints: ExamCheckpoint[];
    logs: RevisionLog[];
    reflection: string;
    completed: boolean;
  };
  const today = new Date().toISOString().slice(0, 10);
  const emptyDraft = {
    title: "",
    date: "",
    focus: "",
    readiness: "3",
    topics: [] as Topic[],
    checkpoints: [] as ExamCheckpoint[],
  };
  const [exams, setExams] = useState<ExamPlan[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [topicDraft, setTopicDraft] = useState("");
  const [checkpointDraft, setCheckpointDraft] = useState({
    label: "",
    date: "",
    minutes: "30",
  });
  const [openComposer, setOpenComposer] = useState(false);
  const [planningOpen, setPlanningOpen] = useState(false);
  const [logOpen, setLogOpen] = useState<string | null>(null);
  const [logDraft, setLogDraft] = useState({
    minutes: "30",
    method: "Practice questions",
    note: "",
  });
  const [reflectionOpen, setReflectionOpen] = useState<string | null>(null);
  const [reflectionDraft, setReflectionDraft] = useState("");
  const [showArchive, setShowArchive] = useState(false);
  useMongoJournalScope({
    scope: "exams",
    payload: { exams },
    hydrate: payload => {
      if (Array.isArray(payload.exams)) setExams(payload.exams as ExamPlan[]);
    },
  });
  const active = [...exams]
    .filter(item => !item.completed)
    .sort((first, second) => first.date.localeCompare(second.date));
  const completed = exams.filter(item => item.completed);
  const revisionMinutes = weeklyRevisionMinutes(
    exams.flatMap(exam => exam.logs),
    today
  );
  function resetComposer() {
    setDraft(emptyDraft);
    setTopicDraft("");
    setCheckpointDraft({ label: "", date: "", minutes: "30" });
    setOpenComposer(false);
    setPlanningOpen(false);
  }
  function addTopic() {
    const label = topicDraft.trim();
    if (!label) return;
    setDraft(current => ({
      ...current,
      topics: [
        ...current.topics,
        { id: `${Date.now()}-${label}`, label, status: "Needs practice" },
      ],
    }));
    setTopicDraft("");
  }
  function addCheckpoint() {
    const label = checkpointDraft.label.trim();
    if (!label) return;
    setDraft(current => ({
      ...current,
      checkpoints: [
        ...current.checkpoints,
        {
          id: `${Date.now()}-${label}`,
          label,
          date: checkpointDraft.date,
          done: false,
          minutes: Math.max(0, Number(checkpointDraft.minutes) || 0),
        },
      ],
    }));
    setCheckpointDraft({ label: "", date: "", minutes: "30" });
  }
  function saveExam(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.date || !draft.focus.trim()) return;
    setExams(current => [
      ...current,
      {
        id: `${Date.now()}-exam`,
        title: draft.title.trim(),
        date: draft.date,
        focus: draft.focus.trim(),
        readiness: Number(draft.readiness),
        topics: draft.topics,
        checkpoints: draft.checkpoints,
        logs: [],
        reflection: "",
        completed: false,
      },
    ]);
    resetComposer();
  }
  function updateExam(id: string, updater: (exam: ExamPlan) => ExamPlan) {
    setExams(current =>
      current.map(exam => (exam.id === id ? updater(exam) : exam))
    );
  }
  function saveLog(examId: string) {
    const minutes = Number(logDraft.minutes);
    if (!minutes || minutes < 1) return;
    updateExam(examId, exam => ({
      ...exam,
      logs: [
        {
          id: `${Date.now()}-revision`,
          date: today,
          minutes,
          method: logDraft.method,
          note: logDraft.note.trim(),
        },
        ...exam.logs,
      ],
    }));
    setLogDraft({ minutes: "30", method: "Practice questions", note: "" });
    setLogOpen(null);
  }
  function examCard(exam: ExamPlan) {
    const completeCheckpoints = exam.checkpoints.filter(
      item => item.done
    ).length;
    const weekMinutes = weeklyRevisionMinutes(exam.logs, today);
    return (
      <article
        className={cn("exam-plan-card", exam.completed && "completed")}
        key={exam.id}
      >
        <div className="exam-plan-top">
          <div>
            <span>{examDueStatus(exam.date, today)}</span>
            <b>{exam.title}</b>
            <small>
              {exam.date} · readiness {exam.readiness}/5
            </small>
          </div>
          <button
            type="button"
            onClick={() =>
              updateExam(exam.id, item => ({
                ...item,
                completed: !item.completed,
              }))
            }
          >
            {exam.completed ? "Reopen" : "Complete"}
          </button>
        </div>
        <p>
          <strong>Today’s revision focus:</strong> {exam.focus}
        </p>
        <div className="exam-revision-summary">
          <span>
            {completeCheckpoints} of {exam.checkpoints.length} checkpoints
            complete
          </span>
          <span>{weekMinutes} min studied this week</span>
        </div>
        {exam.checkpoints.length ? (
          <div className="exam-checkpoints">
            {exam.checkpoints.map(checkpoint => (
              <button
                type="button"
                key={checkpoint.id}
                className={cn(checkpoint.done && "done")}
                onClick={() =>
                  updateExam(exam.id, item => ({
                    ...item,
                    checkpoints: item.checkpoints.map(entry =>
                      entry.id === checkpoint.id
                        ? { ...entry, done: !entry.done }
                        : entry
                    ),
                  }))
                }
              >
                {checkpoint.done ? "✓" : ""}
                <span>
                  {checkpoint.label}
                  {checkpoint.date ? ` · ${checkpoint.date}` : ""}
                  {checkpoint.minutes ? ` · ${checkpoint.minutes} min` : ""}
                </span>
              </button>
            ))}
          </div>
        ) : null}
        {exam.topics.length ? (
          <div className="exam-topics">
            <span>Topic readiness</span>
            {exam.topics.map(topic => (
              <button
                type="button"
                key={topic.id}
                className={topic.status.toLowerCase().replaceAll(" ", "-")}
                onClick={() =>
                  updateExam(exam.id, item => ({
                    ...item,
                    topics: item.topics.map(entry =>
                      entry.id === topic.id
                        ? {
                            ...entry,
                            status:
                              entry.status === "Needs practice"
                                ? "Revising"
                                : entry.status === "Revising"
                                  ? "Confident"
                                  : "Needs practice",
                          }
                        : entry
                    ),
                  }))
                }
              >
                {topic.label} · {topic.status}
              </button>
            ))}
          </div>
        ) : null}
        <div className="exam-card-actions">
          <button type="button" onClick={onFocus}>
            Start focus session
          </button>
          <button
            type="button"
            onClick={() => setLogOpen(logOpen === exam.id ? null : exam.id)}
          >
            Log revision
          </button>
          <button
            type="button"
            onClick={() => {
              setReflectionOpen(reflectionOpen === exam.id ? null : exam.id);
              setReflectionDraft(exam.reflection);
            }}
          >
            Post-exam reflection
          </button>
        </div>
        {logOpen === exam.id ? (
          <div className="revision-log-form">
            <input
              type="number"
              min="1"
              value={logDraft.minutes}
              onChange={event =>
                setLogDraft(current => ({
                  ...current,
                  minutes: event.target.value,
                }))
              }
              aria-label="Revision minutes"
            />
            <select
              value={logDraft.method}
              onChange={event =>
                setLogDraft(current => ({
                  ...current,
                  method: event.target.value,
                }))
              }
            >
              <option>Practice questions</option>
              <option>Active recall</option>
              <option>Mock exam</option>
              <option>Review notes</option>
            </select>
            <input
              value={logDraft.note}
              onChange={event =>
                setLogDraft(current => ({
                  ...current,
                  note: event.target.value,
                }))
              }
              placeholder="Optional note"
            />
            <button type="button" onClick={() => saveLog(exam.id)}>
              Save local revision
            </button>
          </div>
        ) : null}
        {reflectionOpen === exam.id ? (
          <div className="exam-reflection">
            <textarea
              value={reflectionDraft}
              onChange={event => setReflectionDraft(event.target.value)}
              placeholder="What helped, surprised you, or is worth remembering?"
            />
            <button
              type="button"
              onClick={() => {
                updateExam(exam.id, item => ({
                  ...item,
                  reflection: reflectionDraft.trim(),
                }));
                setReflectionOpen(null);
              }}
            >
              Save reflection
            </button>
          </div>
        ) : exam.reflection ? (
          <p className="saved-exam-reflection">Reflection: {exam.reflection}</p>
        ) : null}
      </article>
    );
  }
  return (
    <section
      className="journal-spread exams-spread"
      aria-labelledby="exams-title"
    >
      <div className="spread-page exams-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">life · education · exams</p>
        <h2 id="exams-title">
          Prepare with
          <br />
          <em>a little more ease.</em>
        </h2>
        <p className="page-intro">
          Collect the exam dates that matter, choose one focused preparation
          step, and leave space to reflect after the work is done.
        </p>
        <div className="exam-mantra">
          Readiness can grow one session at a time.
        </div>
      </div>
      <div className="spread-page exams-workspace">
        <section className="exam-dashboard">
          <div>
            <span>Next exam</span>
            <b>
              {active[0]
                ? `${active[0].title} · ${examDueStatus(active[0].date, today)}`
                : "No exam added yet"}
            </b>
          </div>
          <p>{revisionMinutes} local revision minutes in the last 7 days</p>
          <button type="button" onClick={() => setOpenComposer(true)}>
            Add exam
          </button>
        </section>
        {openComposer ? (
          <form className="exam-composer" onSubmit={saveExam}>
            <div>
              <span>Plan an exam</span>
              <button type="button" onClick={resetComposer}>
                Close
              </button>
            </div>
            <label>
              Exam or assessment
              <input
                required
                value={draft.title}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="e.g. Data Structures midterm"
              />
            </label>
            <label>
              Date
              <input
                required
                type="date"
                value={draft.date}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Today’s revision focus
              <input
                required
                value={draft.focus}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    focus: event.target.value,
                  }))
                }
                placeholder="e.g. Practice tree problems"
              />
            </label>
            <label>
              Readiness today{" "}
              <input
                type="range"
                min="1"
                max="5"
                value={draft.readiness}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    readiness: event.target.value,
                  }))
                }
              />
              <b>{draft.readiness}/5</b>
            </label>
            <button
              type="button"
              className="exam-planning-toggle"
              onClick={() => setPlanningOpen(current => !current)}
            >
              {planningOpen
                ? "Hide preparation details"
                : "Add topics and checkpoints"}
            </button>
            {planningOpen ? (
              <div className="exam-planning">
                <div>
                  <label>
                    Topic
                    <label>
                      <input
                        value={topicDraft}
                        onChange={event => setTopicDraft(event.target.value)}
                        placeholder="Topic to revise"
                      />
                    </label>
                  </label>
                  <button type="button" onClick={addTopic}>
                    Add topic
                  </button>
                  {draft.topics.map(topic => (
                    <button
                      type="button"
                      className="planning-chip"
                      key={topic.id}
                      onClick={() =>
                        setDraft(current => ({
                          ...current,
                          topics: current.topics.filter(
                            item => item.id !== topic.id
                          ),
                        }))
                      }
                    >
                      {topic.label} <X size={12} />
                    </button>
                  ))}
                </div>
                <div>
                  <label>
                    Checkpoint
                    <input
                      value={checkpointDraft.label}
                      onChange={event =>
                        setCheckpointDraft(current => ({
                          ...current,
                          label: event.target.value,
                        }))
                      }
                      placeholder="Revision checkpoint"
                    />
                  </label>
                  <input
                    type="date"
                    value={checkpointDraft.date}
                    onChange={event =>
                      setCheckpointDraft(current => ({
                        ...current,
                        date: event.target.value,
                      }))
                    }
                  />
                  <input
                    type="number"
                    min="0"
                    step="15"
                    value={checkpointDraft.minutes}
                    onChange={event =>
                      setCheckpointDraft(current => ({
                        ...current,
                        minutes: event.target.value,
                      }))
                    }
                    aria-label="Checkpoint minutes"
                  />
                  <button type="button" onClick={addCheckpoint}>
                    Add checkpoint
                  </button>
                  {draft.checkpoints.map(checkpoint => (
                    <button
                      type="button"
                      className="planning-chip"
                      key={checkpoint.id}
                      onClick={() =>
                        setDraft(current => ({
                          ...current,
                          checkpoints: current.checkpoints.filter(
                            item => item.id !== checkpoint.id
                          ),
                        }))
                      }
                    >
                      {checkpoint.label} <X size={12} />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <button type="submit">Save exam</button>
          </form>
        ) : null}
        <section className="exam-active-list">
          {active.length ? (
            active.map(examCard)
          ) : (
            <small>Add an exam to create a calm, local revision plan.</small>
          )}
        </section>
        <section className="exam-archive">
          <div>
            <span>Completed exams</span>
            <button
              type="button"
              onClick={() => setShowArchive(current => !current)}
            >
              {showArchive ? "Hide archive" : `${completed.length} complete`}
            </button>
          </div>
          {showArchive ? (
            completed.length ? (
              completed.map(examCard)
            ) : (
              <small>Completed exams and reflections will gather here.</small>
            )
          ) : null}
        </section>
      </div>
    </section>
  );
}

function ExamsPage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  type Checkpoint = { label: string; date: string; done: boolean };
  type Exam = {
    id: string;
    title: string;
    date: string;
    focus: string;
    readiness: number;
    checkpoints: Checkpoint[];
    reflection: string;
  };
  const [exams, setExams] = useState<Exam[]>([]);
  const [draft, setDraft] = useState({
    title: "",
    date: "",
    focus: "",
    readiness: 3,
  });
  const [checkpointDraft, setCheckpointDraft] = useState({
    label: "",
    date: "",
  });
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [reflectionOpen, setReflectionOpen] = useState<string | null>(null);
  const [reflectionDraft, setReflectionDraft] = useState("");
  function addCheckpoint() {
    if (!checkpointDraft.label.trim() || !checkpointDraft.date) return;
    setCheckpoints(current => [
      ...current,
      {
        label: checkpointDraft.label.trim(),
        date: checkpointDraft.date,
        done: false,
      },
    ]);
    setCheckpointDraft({ label: "", date: "" });
  }
  function addExam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.date) return;
    setExams(current => [
      ...current,
      {
        id: `${Date.now()}`,
        title: draft.title.trim(),
        date: draft.date,
        focus: draft.focus,
        readiness: draft.readiness,
        checkpoints,
        reflection: "",
      },
    ]);
    setDraft({ title: "", date: "", focus: "", readiness: 3 });
    setCheckpoints([]);
  }
  function saveReflection(examId: string) {
    if (!reflectionDraft.trim()) return;
    setExams(current =>
      current.map(exam =>
        exam.id === examId
          ? { ...exam, reflection: reflectionDraft.trim() }
          : exam
      )
    );
    setReflectionDraft("");
    setReflectionOpen(null);
  }
  return (
    <section
      className="journal-spread exams-spread"
      aria-labelledby="exams-title"
    >
      <div className="spread-page exams-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">life · education · exams</p>
        <h2 id="exams-title">
          Prepare with
          <br />
          <em>a little more ease.</em>
        </h2>
        <p className="page-intro">
          Collect the exam dates that matter, choose one focused preparation
          step, and leave space to reflect after the work is done.
        </p>
        <div className="exam-mantra">
          <Sparkles size={15} />
          <span>Readiness can grow one session at a time.</span>
        </div>
      </div>
      <div className="spread-page exams-page">
        <form className="exam-form" onSubmit={addExam}>
          <label>
            Exam or assessment
            <input
              value={draft.title}
              onChange={event =>
                setDraft(current => ({ ...current, title: event.target.value }))
              }
              placeholder="e.g. Data Structures midterm"
            />
          </label>
          <label>
            Date
            <input
              type="date"
              value={draft.date}
              onChange={event =>
                setDraft(current => ({ ...current, date: event.target.value }))
              }
            />
          </label>
          <label>
            Most helpful preparation focus
            <input
              value={draft.focus}
              onChange={event =>
                setDraft(current => ({ ...current, focus: event.target.value }))
              }
              placeholder="e.g. Practise recursion problems"
            />
          </label>
          <label className="exam-readiness">
            Readiness today <b>{draft.readiness}/5</b>
            <input
              type="range"
              min="1"
              max="5"
              value={draft.readiness}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  readiness: Number(event.target.value),
                }))
              }
            />
          </label>
          <div className="checkpoint-composer">
            <span>Preparation checkpoints</span>
            <div>
              <input
                value={checkpointDraft.label}
                onChange={event =>
                  setCheckpointDraft(current => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                placeholder="Study checkpoint"
              />
              <input
                type="date"
                value={checkpointDraft.date}
                onChange={event =>
                  setCheckpointDraft(current => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
              />
              <button type="button" onClick={addCheckpoint}>
                <Plus size={14} />
              </button>
            </div>
            {checkpoints.map((checkpoint, index) => (
              <p key={`${checkpoint.label}-${index}`}>
                {checkpoint.date} · {checkpoint.label}
                <button
                  type="button"
                  onClick={() =>
                    setCheckpoints(current =>
                      current.filter((_, position) => position !== index)
                    )
                  }
                >
                  <X size={12} />
                </button>
              </p>
            ))}
          </div>
          <Button type="submit" className="ink-button">
            <Plus size={15} /> Add exam
          </Button>
        </form>
        <div className="exam-list">
          <div>
            <span>exam desk</span>
            <b>{exams.length} saved</b>
          </div>
          {exams.length === 0 ? (
            <small>
              When an exam appears, give it a place here before it starts to
              take up all the room in your mind.
            </small>
          ) : (
            exams.map(exam => (
              <article key={exam.id}>
                <i>{exam.readiness}/5</i>
                <div>
                  <b>{exam.title}</b>
                  <small>
                    {exam.date} ·{" "}
                    {exam.focus || "Preparation focus to be chosen"}
                  </small>
                  <div className="exam-checkpoints">
                    {exam.checkpoints.length === 0 ? (
                      <small>
                        No checkpoints yet—add what would make starting easier
                        next time.
                      </small>
                    ) : (
                      exam.checkpoints.map((checkpoint, index) => (
                        <button
                          type="button"
                          className={cn(checkpoint.done && "done")}
                          key={`${checkpoint.label}-${index}`}
                          onClick={() =>
                            setExams(current =>
                              current.map(item =>
                                item.id === exam.id
                                  ? {
                                      ...item,
                                      checkpoints: item.checkpoints.map(
                                        (step, position) =>
                                          position === index
                                            ? { ...step, done: !step.done }
                                            : step
                                      ),
                                    }
                                  : item
                              )
                            )
                          }
                        >
                          {checkpoint.done ? "✓" : "○"} {checkpoint.date} ·{" "}
                          {checkpoint.label}
                        </button>
                      ))
                    )}
                  </div>
                  {reflectionOpen === exam.id ? (
                    <div className="post-exam-reflection">
                      <textarea
                        value={reflectionDraft}
                        onChange={event =>
                          setReflectionDraft(event.target.value)
                        }
                        placeholder="After the exam: what helped, surprised you, or is worth remembering?"
                      />
                      <button
                        type="button"
                        onClick={() => saveReflection(exam.id)}
                      >
                        Save reflection
                      </button>
                    </div>
                  ) : exam.reflection ? (
                    <>
                      <em>{exam.reflection}</em>
                      <button
                        type="button"
                        className="open-reflection"
                        onClick={() => {
                          setReflectionOpen(exam.id);
                          setReflectionDraft(exam.reflection);
                        }}
                      >
                        Edit post-exam reflection
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="open-reflection"
                      onClick={() => {
                        setReflectionOpen(exam.id);
                        setReflectionDraft("");
                      }}
                    >
                      Add post-exam reflection
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function CourseWorkspacePage({
  onContents,
  onCover,
  onFocus,
  onAssignments,
}: {
  onContents: () => void;
  onCover: () => void;
  onFocus: () => void;
  onAssignments: () => void;
}) {
  type Material = { id: string; type: string; label: string; done: boolean };
  type CoursePlan = {
    id: string;
    title: string;
    code: string;
    target: string;
    focus: string;
    weeklyGoal: number;
    termEnd: string;
    milestones: CourseMilestone[];
    materials: Material[];
    assessments: CourseAssessment[];
    work: CourseWork[];
    archived: boolean;
  };
  const emptyDraft = {
    title: "",
    code: "",
    target: "",
    focus: "",
    weeklyGoal: "90",
    termEnd: "",
    milestones: [] as CourseMilestone[],
    materials: [] as Material[],
    assessments: [] as CourseAssessment[],
    work: [] as CourseWork[],
  };
  const [courses, setCourses] = useState<CoursePlan[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [milestoneDraft, setMilestoneDraft] = useState({ label: "", due: "" });
  useMongoJournalScope({
    scope: "courses",
    payload: { courses },
    hydrate: payload => {
      if (Array.isArray(payload.courses))
        setCourses(payload.courses as CoursePlan[]);
    },
  });
  const [materialDraft, setMaterialDraft] = useState({
    label: "",
    type: "Notes",
  });
  const [workDraft, setWorkDraft] = useState({ label: "", due: "" });
  const [assessmentDraft, setAssessmentDraft] = useState({
    name: "",
    weight: "20",
    score: "",
  });
  const active = courses.filter(course => !course.archived);
  function resetComposer() {
    setDraft(emptyDraft);
    setEditingId(null);
    setDetailsOpen(false);
    setFormOpen(false);
  }
  function updateDraftList<
    Key extends "milestones" | "materials" | "work" | "assessments",
  >(key: Key, item: CoursePlan[Key][number]) {
    setDraft(current => ({ ...current, [key]: [...current[key], item] }));
  }
  function saveCourse(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.focus.trim()) return;
    const next: CoursePlan = {
      id: editingId || `${Date.now()}-course`,
      title: draft.title.trim(),
      code: draft.code.trim(),
      target: draft.target.trim(),
      focus: draft.focus.trim(),
      weeklyGoal: Math.max(0, Number(draft.weeklyGoal) || 0),
      termEnd: draft.termEnd,
      milestones: draft.milestones,
      materials: draft.materials,
      assessments: draft.assessments,
      work: draft.work,
      archived: editingId
        ? courses.find(item => item.id === editingId)?.archived || false
        : false,
    };
    setCourses(current =>
      editingId
        ? current.map(item => (item.id === editingId ? next : item))
        : [...current, next]
    );
    resetComposer();
  }
  function beginEdit(course: CoursePlan) {
    setDraft({
      title: course.title,
      code: course.code,
      target: course.target,
      focus: course.focus,
      weeklyGoal: String(course.weeklyGoal),
      termEnd: course.termEnd,
      milestones: course.milestones,
      materials: course.materials,
      assessments: course.assessments,
      work: course.work,
    });
    setEditingId(course.id);
    setDetailsOpen(true);
    setFormOpen(true);
  }
  function updateCourse(
    id: string,
    updater: (course: CoursePlan) => CoursePlan
  ) {
    setCourses(current =>
      current.map(course => (course.id === id ? updater(course) : course))
    );
  }
  function courseCard(course: CoursePlan) {
    const standing = weightedStanding(course.assessments);
    const nextItem = nextAcademicItem([...course.milestones, ...course.work]);
    const milestoneDone = course.milestones.filter(item => item.done).length;
    return (
      <article className="course-work-card" key={course.id}>
        <div className="course-work-top">
          <div>
            <span>{course.code || "Course"}</span>
            <b>{course.title}</b>
            <small>
              {course.target || "Set a course outcome whenever you are ready."}
            </small>
          </div>
          {standing !== null ? (
            <em>{standing}% weighted standing</em>
          ) : (
            <em>{course.weeklyGoal} min weekly goal</em>
          )}
        </div>
        <p>
          <strong>Current focus:</strong> {course.focus}
        </p>
        <div className="course-next-item">
          <span>Next academic item</span>
          <b>
            {nextItem
              ? `${nextItem.label}${nextItem.due ? ` · ${nextItem.due}` : ""}`
              : "Add a milestone or course-work item"}
          </b>
        </div>
        {course.work.length ? (
          <div className="course-work-items">
            <span>Course-linked work</span>
            {course.work.map(item => (
              <button
                type="button"
                key={item.id}
                className={cn(item.done && "done")}
                onClick={() =>
                  updateCourse(course.id, current => ({
                    ...current,
                    work: current.work.map(entry =>
                      entry.id === item.id
                        ? { ...entry, done: !entry.done }
                        : entry
                    ),
                  }))
                }
              >
                {item.done ? "✓" : ""}
                <b>{item.label}</b>
                <small>{item.due || "No due date"}</small>
              </button>
            ))}
          </div>
        ) : null}
        {course.milestones.length ? (
          <div className="course-milestones">
            <span>
              {milestoneDone} of {course.milestones.length} milestones complete
            </span>
            {course.milestones.map(item => (
              <button
                type="button"
                key={item.id}
                className={cn(item.done && "done")}
                onClick={() =>
                  updateCourse(course.id, current => ({
                    ...current,
                    milestones: current.milestones.map(entry =>
                      entry.id === item.id
                        ? { ...entry, done: !entry.done }
                        : entry
                    ),
                  }))
                }
              >
                {item.done ? "✓" : ""}
                {item.label}
                {item.due ? ` · ${item.due}` : ""}
              </button>
            ))}
          </div>
        ) : null}
        {course.materials.length ? (
          <div className="course-materials">
            <span>Materials</span>
            {course.materials.map(item => (
              <button
                type="button"
                key={item.id}
                className={cn(item.done && "done")}
                onClick={() =>
                  updateCourse(course.id, current => ({
                    ...current,
                    materials: current.materials.map(entry =>
                      entry.id === item.id
                        ? { ...entry, done: !entry.done }
                        : entry
                    ),
                  }))
                }
              >
                {item.done ? "✓" : ""}
                {item.type} · {item.label}
              </button>
            ))}
          </div>
        ) : null}
        <div className="course-card-actions">
          <button type="button" onClick={() => beginEdit(course)}>
            Edit
          </button>
          <button type="button" onClick={onAssignments}>
            Open assignments
          </button>
          <button type="button" onClick={onFocus}>
            Start focus session
          </button>
          <button
            type="button"
            onClick={() =>
              updateCourse(course.id, current => ({
                ...current,
                archived: true,
              }))
            }
          >
            Archive
          </button>
        </div>
      </article>
    );
  }
  return (
    <section
      className="journal-spread courses-spread"
      aria-labelledby="courses-title"
    >
      <div className="spread-page courses-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">life · education · courses</p>
        <h2 id="courses-title">
          Make each
          <br />
          <em>course feel held.</em>
        </h2>
        <p className="page-intro">
          Keep subjects, materials, and the outcome you are working toward in
          one calm semester view.
        </p>
        <div className="semester-swatch">
          <span>semester page</span>
          <b>{active.length} active courses</b>
        </div>
      </div>
      <div className="spread-page courses-workspace">
        <section className="course-dashboard">
          <div>
            <span>Semester work</span>
            <b>
              {active.length} active course{active.length === 1 ? "" : "s"}
            </b>
          </div>
          <p>
            {active.reduce((total, course) => total + course.weeklyGoal, 0)}{" "}
            planned weekly minutes across local courses
          </p>
          <button
            type="button"
            onClick={() => {
              resetComposer();
              setFormOpen(true);
            }}
          >
            Add course
          </button>
        </section>
        {formOpen ? (
          <form className="course-composer" onSubmit={saveCourse}>
            <div>
              <span>{editingId ? "Edit course" : "Add a course"}</span>
              <button type="button" onClick={resetComposer}>
                Close
              </button>
            </div>
            <label>
              Course name
              <input
                required
                value={draft.title}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="e.g. Database Systems"
              />
            </label>
            <label>
              Current focus
              <input
                required
                value={draft.focus}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    focus: event.target.value,
                  }))
                }
                placeholder="What needs attention this week?"
              />
            </label>
            <div className="course-composer-core">
              <label>
                Weekly study goal
                <input
                  type="number"
                  min="0"
                  step="15"
                  value={draft.weeklyGoal}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      weeklyGoal: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Term ends
                <input
                  type="date"
                  value={draft.termEnd}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      termEnd: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <button
              type="button"
              className="course-details-toggle"
              onClick={() => setDetailsOpen(current => !current)}
            >
              {detailsOpen ? "Hide course details" : "Add course details"}
            </button>
            {detailsOpen ? (
              <div className="course-details">
                <label>
                  Course code
                  <input
                    value={draft.code}
                    onChange={event =>
                      setDraft(current => ({
                        ...current,
                        code: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Course outcome
                  <input
                    value={draft.target}
                    onChange={event =>
                      setDraft(current => ({
                        ...current,
                        target: event.target.value,
                      }))
                    }
                    placeholder="What are you working toward?"
                  />
                </label>
                <div className="course-detail-list">
                  <label>
                    Course-linked work
                    <input
                      value={workDraft.label}
                      onChange={event =>
                        setWorkDraft(current => ({
                          ...current,
                          label: event.target.value,
                        }))
                      }
                      placeholder="Assignment or project"
                    />
                  </label>
                  <input
                    type="date"
                    value={workDraft.due}
                    onChange={event =>
                      setWorkDraft(current => ({
                        ...current,
                        due: event.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!workDraft.label.trim()) return;
                      updateDraftList("work", {
                        id: `${Date.now()}-work`,
                        label: workDraft.label.trim(),
                        due: workDraft.due,
                        done: false,
                      });
                      setWorkDraft({ label: "", due: "" });
                    }}
                  >
                    Add work
                  </button>
                  {draft.work.map(item => (
                    <button
                      type="button"
                      className="course-chip"
                      key={item.id}
                      onClick={() =>
                        setDraft(current => ({
                          ...current,
                          work: current.work.filter(
                            entry => entry.id !== item.id
                          ),
                        }))
                      }
                    >
                      {item.label} <X size={12} />
                    </button>
                  ))}
                </div>
                <div className="course-detail-list">
                  <label>
                    Milestone
                    <input
                      value={milestoneDraft.label}
                      onChange={event =>
                        setMilestoneDraft(current => ({
                          ...current,
                          label: event.target.value,
                        }))
                      }
                      placeholder="Checkable milestone"
                    />
                  </label>
                  <input
                    type="date"
                    value={milestoneDraft.due}
                    onChange={event =>
                      setMilestoneDraft(current => ({
                        ...current,
                        due: event.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!milestoneDraft.label.trim()) return;
                      updateDraftList("milestones", {
                        id: `${Date.now()}-milestone`,
                        label: milestoneDraft.label.trim(),
                        due: milestoneDraft.due,
                        done: false,
                      });
                      setMilestoneDraft({ label: "", due: "" });
                    }}
                  >
                    Add milestone
                  </button>
                  {draft.milestones.map(item => (
                    <button
                      type="button"
                      className="course-chip"
                      key={item.id}
                      onClick={() =>
                        setDraft(current => ({
                          ...current,
                          milestones: current.milestones.filter(
                            entry => entry.id !== item.id
                          ),
                        }))
                      }
                    >
                      {item.label} <X size={12} />
                    </button>
                  ))}
                </div>
                <div className="course-detail-list">
                  <label>
                    Material
                    <input
                      value={materialDraft.label}
                      onChange={event =>
                        setMaterialDraft(current => ({
                          ...current,
                          label: event.target.value,
                        }))
                      }
                      placeholder="Title or reference"
                    />
                  </label>
                  <select
                    value={materialDraft.type}
                    onChange={event =>
                      setMaterialDraft(current => ({
                        ...current,
                        type: event.target.value,
                      }))
                    }
                  >
                    <option>Notes</option>
                    <option>Reading</option>
                    <option>Slides</option>
                    <option>Textbook</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (!materialDraft.label.trim()) return;
                      updateDraftList("materials", {
                        id: `${Date.now()}-material`,
                        label: materialDraft.label.trim(),
                        type: materialDraft.type,
                        done: false,
                      });
                      setMaterialDraft({ label: "", type: "Notes" });
                    }}
                  >
                    Add material
                  </button>
                  {draft.materials.map(item => (
                    <button
                      type="button"
                      className="course-chip"
                      key={item.id}
                      onClick={() =>
                        setDraft(current => ({
                          ...current,
                          materials: current.materials.filter(
                            entry => entry.id !== item.id
                          ),
                        }))
                      }
                    >
                      {item.label} <X size={12} />
                    </button>
                  ))}
                </div>
                <div className="course-detail-list">
                  <label>
                    Assessment
                    <input
                      value={assessmentDraft.name}
                      onChange={event =>
                        setAssessmentDraft(current => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Quiz, essay, exam"
                    />
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={assessmentDraft.weight}
                    onChange={event =>
                      setAssessmentDraft(current => ({
                        ...current,
                        weight: event.target.value,
                      }))
                    }
                    aria-label="Assessment weight"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={assessmentDraft.score}
                    onChange={event =>
                      setAssessmentDraft(current => ({
                        ...current,
                        score: event.target.value,
                      }))
                    }
                    aria-label="Assessment score"
                    placeholder="Score"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!assessmentDraft.name.trim()) return;
                      updateDraftList("assessments", {
                        id: `${Date.now()}-assessment`,
                        name: assessmentDraft.name.trim(),
                        weight: Math.max(
                          0,
                          Number(assessmentDraft.weight) || 0
                        ),
                        score:
                          assessmentDraft.score === ""
                            ? null
                            : Math.max(0, Number(assessmentDraft.score) || 0),
                      });
                      setAssessmentDraft({ name: "", weight: "20", score: "" });
                    }}
                  >
                    Add assessment
                  </button>
                  {draft.assessments.map(item => (
                    <button
                      type="button"
                      className="course-chip"
                      key={item.id}
                      onClick={() =>
                        setDraft(current => ({
                          ...current,
                          assessments: current.assessments.filter(
                            entry => entry.id !== item.id
                          ),
                        }))
                      }
                    >
                      {item.name} <X size={12} />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <button type="submit">Save course</button>
          </form>
        ) : null}
        <section className="course-active-list">
          {active.length ? (
            active.map(courseCard)
          ) : (
            <small>
              Start with the course that needs a clearer home this term.
            </small>
          )}
        </section>
      </div>
    </section>
  );
}

function CoursesPage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  type Course = {
    title: string;
    code: string;
    target: string;
    standing: string;
    termStart: string;
    termEnd: string;
    materials: string[];
    checkpoints: string[];
  };
  const [courses, setCourses] = useState<Course[]>([]);
  const [draft, setDraft] = useState({
    title: "",
    code: "",
    target: "",
    standing: "",
    termStart: "",
    termEnd: "",
    materials: "",
    checkpoints: "",
  });
  function addCourse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    setCourses(current => [
      ...current,
      {
        title: draft.title.trim(),
        code: draft.code,
        target: draft.target,
        standing: draft.standing,
        termStart: draft.termStart,
        termEnd: draft.termEnd,
        materials: draft.materials
          .split("\n")
          .map(item => item.trim())
          .filter(Boolean),
        checkpoints: draft.checkpoints
          .split("\n")
          .map(item => item.trim())
          .filter(Boolean),
      },
    ]);
    setDraft({
      title: "",
      code: "",
      target: "",
      standing: "",
      termStart: "",
      termEnd: "",
      materials: "",
      checkpoints: "",
    });
  }
  return (
    <section
      className="journal-spread courses-spread"
      aria-labelledby="courses-title"
    >
      <div className="spread-page courses-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">life · education · courses</p>
        <h2 id="courses-title">
          Make each
          <br />
          <em>course feel held.</em>
        </h2>
        <p className="page-intro">
          Keep subjects, materials, and the outcome you are working toward in
          one calm semester view.
        </p>
        <div className="semester-swatch">
          <span>semester page</span>
          <b>{courses.length} courses in view</b>
        </div>
      </div>
      <div className="spread-page courses-page">
        <form className="course-form" onSubmit={addCourse}>
          <label>
            Course name
            <input
              value={draft.title}
              onChange={event =>
                setDraft(current => ({ ...current, title: event.target.value }))
              }
              placeholder="e.g. Database Systems"
            />
          </label>
          <div>
            <label>
              Course code
              <input
                value={draft.code}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    code: event.target.value,
                  }))
                }
                placeholder="Optional"
              />
            </label>
            <label>
              Current standing
              <input
                value={draft.standing}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    standing: event.target.value,
                  }))
                }
                placeholder="Optional, e.g. 72%"
              />
            </label>
          </div>
          <label>
            Target
            <input
              value={draft.target}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  target: event.target.value,
                }))
              }
              placeholder="e.g. Understand SQL"
            />
          </label>
          <div>
            <label>
              Term begins
              <input
                type="date"
                value={draft.termStart}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    termStart: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Term ends
              <input
                type="date"
                value={draft.termEnd}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    termEnd: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <label>
            Materials <small>one per line</small>
            <textarea
              value={draft.materials}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  materials: event.target.value,
                }))
              }
              placeholder="Lecture notes&#10;Textbook chapter 1"
            />
          </label>
          <label>
            Roadmap checkpoints <small>one per line</small>
            <textarea
              value={draft.checkpoints}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  checkpoints: event.target.value,
                }))
              }
              placeholder="Quiz 1 · 12 Sep&#10;Midterm · 17 Oct"
            />
          </label>
          <Button className="ink-button" type="submit">
            <Plus size={15} /> Add course
          </Button>
        </form>
        <div className="course-shelf">
          <div>
            <span>your course shelf</span>
            <b>{courses.length} saved</b>
          </div>
          {courses.length === 0 ? (
            <small>
              Start with the course that needs a clearer home this term.
            </small>
          ) : (
            courses.map((course, index) => (
              <article key={`${course.title}-${index}`}>
                <i>{course.code || "01"}</i>
                <p>
                  <b>{course.title}</b>
                  <small>
                    {course.target || "Set an outcome whenever you are ready."}
                    {course.standing
                      ? ` · Current standing ${course.standing}`
                      : ""}
                  </small>
                  <em>
                    {course.termStart || course.termEnd
                      ? `${course.termStart || "Start"} → ${course.termEnd || "End"}`
                      : "Term dates not set"}{" "}
                    · {course.materials.length} materials ·{" "}
                    {course.checkpoints.length} checkpoints
                  </em>
                </p>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function TasksPage({
  onContents,
  onCover,
  onRecord,
}: {
  onContents: () => void;
  onCover: () => void;
  onRecord: (activity: Omit<InsightActivity, "id" | "createdAt">) => void;
}) {
  /**
   * Tasks live in the shared store, so the page inherits undo, the offline
   * queue and sync — and the whole list becomes available to Today, the
   * calendar and the charts without any of them reaching into this page.
   *
   * The richer parts of a task (subtasks, next step, notes) ride along in the
   * record body, so nothing the page could do before is given up.
   */
  const journal = useRecordStore();

  const tasks: PlanningTask[] = normalizePlanningTasks(
    journal
      .inScope("task")
      .map(record => ({ ...(record.body as object), id: record.id }))
  );
  const [draft, setDraft] = useState({
    title: "",
    when: "today" as PlanningTask["when"],
    due: "Today",
    area: "Life admin",
    priority: "Medium" as PlanningTask["priority"],
    nextStep: "",
    note: "",
    subtasks: "",
  });
  const [section, setSection] = useState<"today" | "later" | "completed">(
    "today"
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const planningSummary = taskPlanningSummary(tasks);
  const visibleTasks = taskSection(tasks, section);
  function resetTaskDraft() {
    setDraft({
      title: "",
      when: "today",
      due: "Today",
      area: "Life admin",
      priority: "Medium",
      nextStep: "",
      note: "",
      subtasks: "",
    });
    setEditingId(null);
  }
  function taskFromDraft(id: string): PlanningTask {
    return {
      id,
      title: draft.title.trim(),
      when: draft.when,
      due: draft.due.trim() || (draft.when === "today" ? "Today" : "Later"),
      area: draft.area.trim() || "Life admin",
      priority: draft.priority,
      nextStep: draft.nextStep.trim(),
      note: draft.note.trim(),
      done: false,
      subtasks: draft.subtasks
        .split("\\n")
        .map(label => label.trim())
        .filter(Boolean)
        .map((label, index) => ({
          id: `${id}-subtask-${index + 1}`,
          label,
          done: false,
        })),
    };
  }
  function addTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    // The record store issues the id, so a task created offline keeps the
    // same identity once it reaches the server.
    const { id: _drafted, ...body } = taskFromDraft("pending");

    journal.add({
      scope: "task",
      body,
      undoLabel: `Added ${body.title}`,
    });

    onRecord({
      module: "Tasks",
      amount: 1,
      label: `${body.title} created`,
    });
    resetTaskDraft();
  }
  function toggleTask(id: string) {
    const task = tasks.find(item => item.id === id);
    if (!task) return;
    journal.edit(
      id,
      { ...task, done: !task.done },
      task.done ? `Reopened ${task.title}` : `Completed ${task.title}`
    );
    onRecord({
      module: "Tasks",
      amount: 1,
      label: `${task.title} ${task.done ? "reopened" : "completed"}`,
    });
  }
  function beginTaskEdit(task: PlanningTask) {
    setEditingId(task.id);
    setDraft({
      title: task.title,
      when: task.when,
      due: task.due,
      area: task.area,
      priority: task.priority,
      nextStep: task.nextStep,
      note: task.note,
      subtasks: task.subtasks.map(item => item.label).join("\n"),
    });
  }
  function saveTaskEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId || !draft.title.trim()) return;
    const previous = tasks.find(task => task.id === editingId);
    const replacement = taskFromDraft(editingId);
    if (!previous) return;
    replacement.done = previous.done;
    const { id: _unused, ...body } = replacement;
    journal.edit(editingId, body, `Updated ${previous.title}`);
    onRecord({
      module: "Tasks",
      amount: 1,
      label: `${previous.title} updated`,
    });
    resetTaskDraft();
  }
  function toggleSubtask(taskId: string, subtaskId: string) {
    const task = tasks.find(item => item.id === taskId);
    if (!task) return;

    journal.edit(
      taskId,
      {
        ...task,
        subtasks: task.subtasks.map(subtask =>
          subtask.id === subtaskId
            ? { ...subtask, done: !subtask.done }
            : subtask
        ),
      },
      "Subtask updated"
    );
  }
  return (
    <section
      className="journal-spread tasks-spread"
      aria-labelledby="tasks-title"
    >
      <div className="spread-page tasks-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">life · tasks</p>
        <h2 id="tasks-title">
          Keep the next
          <br />
          <em>small thing clear.</em>
        </h2>
        <p className="page-intro">
          A practical task page for capturing what matters, seeing what is
          urgent, and completing things without carrying them all in your head.
        </p>
        <div className="tasks-summary">
          <span>
            {planningSummary.todayOpen + planningSummary.laterOpen} open tasks
          </span>
          <b>{planningSummary.timeBoundToday} time-bound today</b>
        </div>
      </div>
      <div className="spread-page tasks-page">
        <form
          className="task-capture task-capture-structured"
          onSubmit={editingId ? saveTaskEdit : addTask}
        >
          <label>
            Task
            <input
              value={draft.title}
              onChange={event =>
                setDraft(current => ({ ...current, title: event.target.value }))
              }
              placeholder="The next thing"
              required
            />
          </label>
          <div className="task-capture-grid">
            <label>
              Plan
              <select
                value={draft.when}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    when: event.target.value as PlanningTask["when"],
                    due:
                      event.target.value === "today"
                        ? current.due === "Later"
                          ? "Today"
                          : current.due
                        : current.due === "Today"
                          ? "Later"
                          : current.due,
                  }))
                }
              >
                <option value="today">Today</option>
                <option value="later">Later</option>
              </select>
            </label>
            <label>
              Due cue
              <input
                value={draft.due}
                onChange={event =>
                  setDraft(current => ({ ...current, due: event.target.value }))
                }
                placeholder="Today · 5:00 PM"
              />
            </label>
            <label>
              Area
              <input
                value={draft.area}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    area: event.target.value,
                  }))
                }
                placeholder="Study, home, life…"
              />
            </label>
            <label>
              Priority
              <select
                value={draft.priority}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    priority: event.target.value as PlanningTask["priority"],
                  }))
                }
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </label>
          </div>
          <label>
            Next action <small>Optional</small>
            <input
              value={draft.nextStep}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  nextStep: event.target.value,
                }))
              }
              placeholder="The smallest visible start"
            />
          </label>
          <label>
            Notes <small>Optional</small>
            <textarea
              value={draft.note}
              onChange={event =>
                setDraft(current => ({ ...current, note: event.target.value }))
              }
              placeholder="Context to keep nearby"
              rows={2}
            />
          </label>
          <label>
            Subtasks <small>One per line · optional</small>
            <textarea
              value={draft.subtasks}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  subtasks: event.target.value,
                }))
              }
              placeholder="Gather materials\nMake the first pass"
              rows={2}
            />
          </label>
          <div className="task-capture-actions">
            <Button type="submit" className="ink-button">
              <Plus size={15} /> {editingId ? "Save changes" : "Add task"}
            </Button>
            {editingId ? (
              <button type="button" onClick={resetTaskDraft}>
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
        <div
          className="task-planning-tabs"
          role="tablist"
          aria-label="Task sections"
        >
          {(
            [
              ["today", `Today · ${planningSummary.todayOpen}`],
              ["later", `Later · ${planningSummary.laterOpen}`],
              ["completed", `Completed · ${planningSummary.completed}`],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              role="tab"
              aria-selected={section === value}
              className={cn(section === value && "active")}
              onClick={() => setSection(value)}
              key={value}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="task-section-heading">
          <span>
            {section === "today"
              ? "Today’s focus"
              : section === "later"
                ? "Later, when it has room"
                : "Completed archive"}
          </span>
          <b>
            {section === "today"
              ? `${planningSummary.timeBoundToday} time-bound`
              : section === "later"
                ? "No urgency added"
                : `${planningSummary.completed} finished`}
          </b>
        </div>
        <div className="task-list">
          {visibleTasks.length === 0 ? (
            <div className="task-empty">
              <b>
                {section === "completed"
                  ? "Nothing completed yet"
                  : section === "today"
                    ? "Today is clear"
                    : "Nothing parked for later"}
              </b>
              <small>Add a task above when something needs a place.</small>
            </div>
          ) : (
            visibleTasks.map(task => {
              const completedSubtasks = task.subtasks.filter(
                item => item.done
              ).length;
              return (
                <article
                  className={cn("task-card", task.done && "done")}
                  key={task.id}
                >
                  <button
                    type="button"
                    className="task-complete-toggle"
                    aria-pressed={task.done}
                    aria-label={`${task.done ? "Reopen" : "Complete"} ${task.title}`}
                    onClick={() => toggleTask(task.id)}
                  >
                    {task.done ? "✓" : ""}
                  </button>
                  <div className="task-card-main">
                    <div className="task-card-heading">
                      <b>{task.title}</b>
                      <span className={`task-due task-due-${task.when}`}>
                        {task.due}
                      </span>
                    </div>
                    <small className="task-meta">
                      {task.area} · {task.priority} priority
                    </small>
                    {task.nextStep ? (
                      <p className="task-next-step">
                        <strong>Next:</strong> {task.nextStep}
                      </p>
                    ) : null}
                    {task.note ? (
                      <p className="task-note">{task.note}</p>
                    ) : null}
                    {task.subtasks.length ? (
                      <div className="task-subtasks">
                        <small>
                          {completedSubtasks}/{task.subtasks.length} subtasks
                        </small>
                        {task.subtasks.map(subtask => (
                          <button
                            type="button"
                            className={cn(subtask.done && "done")}
                            key={subtask.id}
                            onClick={() => toggleSubtask(task.id, subtask.id)}
                          >
                            <span>{subtask.done ? "✓" : ""}</span>
                            {subtask.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="task-edit"
                    onClick={() => beginTaskEdit(task)}
                  >
                    Edit
                  </button>
                </article>
              );
            })
          )}
        </div>
        <div className="task-footnote">
          <Sparkles size={14} /> Start with the task that makes tomorrow easier.
        </div>
      </div>
    </section>
  );
}

function DigitalLifePage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  const [goal, setGoal] = useState(120);
  const [boundary, setBoundary] = useState(true);
  const [boundaryTime, setBoundaryTime] = useState("21:30");
  const [entries, setEntries] = useState<DigitalEntry[]>([]);
  const [draft, setDraft] = useState({
    minutes: "30",
    category: "Study",
    purpose: "Intentional",
    note: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  useMongoJournalScope({
    scope: "digital-life",
    payload: { goal, boundary, boundaryTime, entries },
    hydrate: payload => {
      if (typeof payload.goal === "number") setGoal(payload.goal);
      if (typeof payload.boundary === "boolean") setBoundary(payload.boundary);
      if (typeof payload.boundaryTime === "string")
        setBoundaryTime(payload.boundaryTime);
      if (Array.isArray(payload.entries))
        setEntries(payload.entries as DigitalEntry[]);
    },
  });
  const today = new Date().toISOString().slice(0, 10);
  const summary = digitalSummary(entries, today);
  const progress = Math.min(
    100,
    Math.round((summary.todayMinutes / goal) * 100)
  );
  function resetDraft() {
    setDraft({
      minutes: "30",
      category: "Study",
      purpose: "Intentional",
      note: "",
    });
    setEditingId(null);
  }
  function saveEntry(event: React.FormEvent) {
    event.preventDefault();
    const minutes = Number(draft.minutes);
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    const entry: DigitalEntry = {
      id: editingId || `${Date.now()}-digital`,
      date: today,
      minutes,
      category: draft.category,
      purpose: draft.purpose,
      note: draft.note.trim(),
    };
    setEntries(current =>
      editingId
        ? current.map(item => (item.id === editingId ? entry : item))
        : [entry, ...current]
    );
    resetDraft();
  }
  function beginEdit(entry: DigitalEntry) {
    setDraft({
      minutes: String(entry.minutes),
      category: entry.category,
      purpose: entry.purpose,
      note: entry.note,
    });
    setEditingId(entry.id);
  }
  return (
    <section
      className="journal-spread digital-life-spread"
      aria-labelledby="digital-life-title"
    >
      <div className="spread-page digital-life-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">mind · digital life</p>
        <h2 id="digital-life-title">
          Use your attention
          <br />
          <em>on purpose.</em>
        </h2>
        <p className="page-intro">
          A private screen-time check-in that makes space for boundaries, focus,
          and the parts of life that do not live behind a screen.
        </p>
        <div className="digital-sparkle">✦ ✦ ✦</div>
      </div>
      <div className="spread-page digital-life-page">
        <section className="digital-today">
          <div>
            <span>Today’s digital time</span>
            <b>
              {summary.todayMinutes} <small>of {goal} min</small>
            </b>
            <strong>
              {summary.todayMinutes > goal
                ? `${summary.todayMinutes - goal} min above the chosen goal`
                : `${goal - summary.todayMinutes} min remaining within the chosen goal`}
            </strong>
          </div>
          <i>
            <span style={{ width: `${progress}%` }} />
          </i>
          <label>
            Daily goal <b>{goal} min</b>
            <input
              type="range"
              min="30"
              max="360"
              step="15"
              value={goal}
              onChange={event => setGoal(Number(event.target.value))}
            />
          </label>
        </section>
        <section className="digital-entry">
          <div className="digital-section-heading">
            <div>
              <span>Log time with context</span>
              <b>Private and local</b>
            </div>
            <small>Record what the time was for, not just the number.</small>
          </div>
          <form onSubmit={saveEntry}>
            <div className="digital-quick-times">
              {[15, 30, 60].map(value => (
                <button
                  type="button"
                  key={value}
                  className={cn(draft.minutes === String(value) && "active")}
                  onClick={() =>
                    setDraft(current => ({
                      ...current,
                      minutes: String(value),
                    }))
                  }
                >
                  {value} min
                </button>
              ))}
            </div>
            <label>
              Minutes
              <input
                type="number"
                min="1"
                step="5"
                inputMode="numeric"
                value={draft.minutes}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    minutes: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Category
              <select
                value={draft.category}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
              >
                <option>Study</option>
                <option>Social</option>
                <option>Entertainment</option>
                <option>Communication</option>
                <option>Creative</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              Purpose
              <select
                value={draft.purpose}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    purpose: event.target.value,
                  }))
                }
              >
                <option>Intentional</option>
                <option>Connection</option>
                <option>Rest</option>
                <option>Necessary</option>
                <option>Unplanned</option>
              </select>
            </label>
            <label className="digital-entry-note">
              A little context{" "}
              <input
                value={draft.note}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                placeholder="Optional note"
              />
            </label>
            <button type="submit">
              {editingId ? "Update entry" : "Save time"}
            </button>
            {editingId ? (
              <button
                type="button"
                className="digital-cancel"
                onClick={resetDraft}
              >
                Cancel
              </button>
            ) : null}
          </form>
        </section>
        <section className="digital-boundary">
          <label>
            <input
              type="checkbox"
              checked={boundary}
              onChange={event => setBoundary(event.target.checked)}
            />
            <span>
              <b>Evening boundary</b>
              <small>
                {boundary
                  ? `Local preference on · from ${boundaryTime}`
                  : "Local preference off"}
              </small>
            </span>
          </label>
          <label>
            Boundary time
            <input
              type="time"
              value={boundaryTime}
              onChange={event => setBoundaryTime(event.target.value)}
              disabled={!boundary}
            />
          </label>
        </section>
        <section className="digital-week">
          <div>
            <span>Last 7 days, factually</span>
            <b>{summary.weekMinutes} min logged</b>
          </div>
          {summary.topCategory ? (
            <p>
              <strong>{summary.topCategory}</strong> is the largest logged
              category in this seven-day view.
            </p>
          ) : (
            <p>
              Add a few local entries to see a simple category pattern here.
            </p>
          )}
        </section>
        <section className="digital-history">
          <div>
            <span>Recent digital activity</span>
            <b>{entries.length} saved</b>
          </div>
          {entries.length === 0 ? (
            <small>Your local activity entries will appear here.</small>
          ) : (
            entries.slice(0, 5).map(entry => (
              <article key={entry.id}>
                <div>
                  <b>
                    {entry.minutes} min · {entry.category} · {entry.purpose}
                  </b>
                  <small>
                    {entry.date}
                    {entry.note ? ` · ${entry.note}` : ""}
                  </small>
                </div>
                <div>
                  <button type="button" onClick={() => beginEdit(entry)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEntries(current =>
                        current.filter(item => item.id !== entry.id)
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </section>
  );
}

function ProductivityPage({
  onContents,
  onCover,
  onRecordSession,
}: {
  onContents: () => void;
  onCover: () => void;
  onRecordSession: (minutes: number, label: string) => void;
}) {
  const taskInputRef = useRef<HTMLInputElement>(null);
  const pixelStore = useContext(PixelsTrackerContext);
  const [minutes, setMinutes] = useState(25);
  const [taskDraft, setTaskDraft] = useState(
    "Finish the next small assignment step"
  );
  const [stepDraft, setStepDraft] = useState(
    "Open the brief and outline three points"
  );
  const [tasks, setTasks] = useState<
    { id: string; label: string; nextStep: string; done: boolean }[]
  >([]);
  const [activeTaskId, setActiveTaskId] = useState("");
  const [isFocusing, setIsFocusing] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [lastOutcome, setLastOutcome] = useState<
    FocusSession["outcome"] | null
  >(null);
  useMongoJournalScope({
    scope: "productivity",
    payload: { tasks, activeTaskId, sessions },
    hydrate: payload => {
      if (Array.isArray(payload.tasks)) setTasks(payload.tasks as typeof tasks);
      if (typeof payload.activeTaskId === "string")
        setActiveTaskId(payload.activeTaskId);
      if (Array.isArray(payload.sessions))
        setSessions(payload.sessions as FocusSession[]);
    },
  });
  const today = new Date().toISOString().slice(0, 10);
  const activeTask = tasks.find(task => task.id === activeTaskId) || tasks[0];
  const summary = focusSummary(sessions, today);
  const todaySummary = focusSummary(
    sessions.filter(session => session.date === today),
    today
  );
  useEffect(() => {
    if (!isFocusing) setSecondsLeft(minutes * 60);
  }, [isFocusing, minutes]);
  useEffect(() => {
    if (!isFocusing || secondsLeft <= 0) return;
    const timer = window.setInterval(
      () => setSecondsLeft(current => Math.max(0, current - 1)),
      1000
    );
    return () => window.clearInterval(timer);
  }, [isFocusing, secondsLeft]);
  useEffect(() => {
    if (isFocusing && secondsLeft === 0) finishSession("continued");
  }, [secondsLeft]);
  function formatRemaining() {
    const totalMinutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    return `${totalMinutes}:${String(seconds).padStart(2, "0")}`;
  }
  function addTask(event: React.FormEvent) {
    event.preventDefault();
    if (!taskDraft.trim()) return;
    const id = `${Date.now()}-task`;
    setTasks(current => [
      ...current,
      {
        id,
        label: taskDraft.trim(),
        nextStep: stepDraft.trim() || "Choose the next small step",
        done: false,
      },
    ]);
    setActiveTaskId(id);
    setTaskDraft("");
    setStepDraft("");
  }
  function finishSession(outcome: FocusSession["outcome"]) {
    if (!activeTask) return;
    const session: FocusSession = {
      id: `${Date.now()}-focus`,
      date: today,
      minutes,
      taskId: activeTask.id,
      taskLabel: activeTask.label,
      nextStep: activeTask.nextStep,
      outcome,
    };
    setSessions(current => [session, ...current]);
    onRecordSession(minutes, activeTask.label);
    const monthIndex = new Date().getMonth();
    const day = new Date().getDate();
    pixelStore?.set("focus", monthIndex, day, "#8b5cf6");
    const now = new Date();
    pixelStore?.set(
      "focus",
      now.getMonth(),
      now.getDate(),
      outcome === "completed"
        ? "#5b63b9"
        : outcome === "continued"
          ? "#d64496"
          : "#e9b640"
    );
    if (outcome === "completed")
      setTasks(current =>
        current.map(task =>
          task.id === activeTask.id ? { ...task, done: true } : task
        )
      );
    setLastOutcome(outcome);
    setIsFocusing(false);
  }
  return (
    <section
      className="journal-spread productivity-spread"
      aria-labelledby="productivity-title"
    >
      <div className="spread-page productivity-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">mind · productivity</p>
        <h2 id="productivity-title">
          Make room for
          <br />
          <em>deep attention.</em>
        </h2>
        <p className="page-intro">
          A quieter way to plan work: choose one meaningful next step, protect a
          little time, and return when you are ready.
        </p>
        <button
          type="button"
          className="ink-button"
          onClick={() => taskInputRef.current?.focus()}
        >
          <Plus size={15} /> Add task
        </button>
      </div>
      <div className="spread-page productivity-page">
        <section className="focus-plan">
          <div className="focus-plan-heading">
            <div>
              <span>Today’s focus</span>
              <b>
                {tasks.filter(task => !task.done).length} open task
                {tasks.filter(task => !task.done).length === 1 ? "" : "s"}
              </b>
            </div>
            <small>Choose one task, then protect a small block of time.</small>
          </div>
          <div className="focus-task-list">
            {tasks.length === 0 ? (
              <p className="task-empty">
                No tasks yet. Add one below and it will appear here.
              </p>
            ) : null}
            {tasks.map(task => (
              <button
                type="button"
                className={cn(
                  activeTaskId === task.id && "active",
                  task.done && "done"
                )}
                key={task.id}
                onClick={() => setActiveTaskId(task.id)}
              >
                <span>{task.done ? "✓" : ""}</span>
                <div>
                  <b>{task.label}</b>
                  <small>Next: {task.nextStep}</small>
                </div>
              </button>
            ))}
          </div>
          <form className="focus-task-form" onSubmit={addTask}>
            <input
              ref={taskInputRef}
              value={taskDraft}
              onChange={event => setTaskDraft(event.target.value)}
              placeholder="Add a local task"
            />
            <input
              value={stepDraft}
              onChange={event => setStepDraft(event.target.value)}
              placeholder="Smallest next step"
            />
            <button type="submit">Add</button>
          </form>
        </section>
        <section className="focus-session">
          <div className="focus-session-heading">
            <div>
              <span>Now focusing</span>
              <b>{activeTask?.label || "Choose a task"}</b>
            </div>
            <small>{activeTask?.nextStep || "Add a small next step"}</small>
          </div>
          <div className="duration-picker">
            <span>Focus duration</span>
            <div>
              {[15, 25, 45, 60].map(value => (
                <button
                  key={value}
                  type="button"
                  className={cn(minutes === value && "active")}
                  onClick={() => setMinutes(value)}
                  disabled={isFocusing}
                >
                  {value} min
                </button>
              ))}
            </div>
          </div>
          <div className={cn("focus-clock", isFocusing && "running")}>
            <span>
              {isFocusing ? "Focus in progress" : "Ready when you are"}
            </span>
            <b>{isFocusing ? formatRemaining() : `${minutes}:00`}</b>
            <small>{isFocusing ? "remaining" : "chosen session"}</small>
          </div>
          {isFocusing ? (
            <div className="focus-outcomes">
              <Button
                type="button"
                className="ink-button"
                onClick={() => finishSession("completed")}
              >
                Task finished
              </Button>
              <button type="button" onClick={() => finishSession("continued")}>
                Continue later
              </button>
              <button type="button" onClick={() => finishSession("next-step")}>
                Choose next step
              </button>
            </div>
          ) : (
            <Button
              type="button"
              className="ink-button"
              onClick={() => {
                setLastOutcome(null);
                setIsFocusing(true);
              }}
            >
              Start focus session
            </Button>
          )}
          {lastOutcome ? (
            <p className="focus-complete-note">
              Session saved locally ·{" "}
              {lastOutcome === "completed"
                ? "task marked complete"
                : lastOutcome === "continued"
                  ? "ready to continue later"
                  : "next step can be chosen when you return"}
              .
            </p>
          ) : null}
        </section>
        <section className="focus-summary">
          <div>
            <span>Focus, factually</span>
            <b>This week</b>
          </div>
          <p>
            <strong>Today:</strong> {todaySummary.sessions} session
            {todaySummary.sessions === 1 ? "" : "s"} · {todaySummary.minutes}{" "}
            minutes <span /> <strong>Week:</strong> {summary.sessions} sessions
            · {summary.minutes} minutes · {summary.completed} task
            {summary.completed === 1 ? "" : "s"} finished
          </p>
        </section>
        <section className="focus-history">
          <div>
            <span>Recent focus sessions</span>
            <b>{sessions.length} saved</b>
          </div>
          {sessions.length === 0 ? (
            <small>Your local sessions will gather here.</small>
          ) : (
            sessions.slice(0, 5).map(session => (
              <article key={session.id}>
                <div>
                  <b>
                    {session.minutes} minutes · {session.taskLabel}
                  </b>
                  <small>
                    {session.nextStep} ·{" "}
                    {session.outcome === "completed"
                      ? "Task finished"
                      : session.outcome === "continued"
                        ? "Continue later"
                        : "Next step chosen"}
                  </small>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSessions(current =>
                      current.filter(item => item.id !== session.id)
                    )
                  }
                >
                  Remove
                </button>
              </article>
            ))
          )}
        </section>
        <section className="focus-year">
          <div>
            <span>Year in focus</span>
            <b>Long-term practice</b>
          </div>
          <PixelsGrid tracker="focus" />
        </section>
      </div>
    </section>
  );
}

function HabitsPage({
  onContents,
  onCover,
  onRecordHabit,
}: {
  onContents: () => void;
  onCover: () => void;
  onRecordHabit: (label: string) => void;
}) {
  const pixelStore = useContext(PixelsTrackerContext);
  const today = new Date().toISOString().slice(0, 10);
  const [habits, setHabits] = useState<
    {
      id: string;
      name: string;
      schedule: string;
      minimum: string;
      cue: string;
      archived: boolean;
    }[]
  >([]);
  const [states, setStates] = useState<Record<string, HabitDailyState>>({});
  const [records, setRecords] = useState<HabitRecord[]>([]);
  const [avoidanceHabits, setAvoidanceHabits] = useState<AvoidanceHabit[]>([]);
  const [avoidanceName, setAvoidanceName] = useState("");
  const [avoidanceReason, setAvoidanceReason] = useState("");
  const [avoidanceNotes, setAvoidanceNotes] = useState<Record<string, string>>(
    {}
  );
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState({
    name: "",
    schedule: "Every day",
    minimum: "",
    cue: "",
  });
  useMongoJournalScope({
    scope: "habits",
    payload: { habits, states, records, avoidanceHabits },
    hydrate: payload => {
      if (Array.isArray(payload.habits))
        setHabits(payload.habits as typeof habits);
      if (payload.states && typeof payload.states === "object")
        setStates(payload.states as Record<string, HabitDailyState>);
      if (Array.isArray(payload.records))
        setRecords(payload.records as HabitRecord[]);
      if (Array.isArray(payload.avoidanceHabits))
        setAvoidanceHabits(payload.avoidanceHabits as AvoidanceHabit[]);
    },
  });
  const activeHabits = habits.filter(habit => !habit.archived);
  const activeAvoidanceHabits = avoidanceHabits.filter(
    habit => !habit.archived
  );
  const weekly = habitWeekSummary(records);
  const statusOptions: Array<{
    value: HabitDailyState;
    label: string;
    color: string;
  }> = [
    { value: "complete", label: "Complete", color: "#e75e93" },
    { value: "partial", label: "Partial", color: "#e3a83a" },
    { value: "rest", label: "Planned rest", color: "#3c9aa1" },
    { value: "skipped", label: "Skipped", color: "#8b7b82" },
  ];
  /**
   * The streak for one habit.
   *
   * Delegated to the shared engine rather than counted here, because the rule
   * is subtler than "how many complete days in a row". A planned rest and a
   * skip are deliberate choices and must not break a streak — the earlier
   * version broke on anything that was not `complete`, which punished the user
   * for using the rest option the page itself offers.
   */
  function calculateStreak(habitId: string) {
    const dayStates: Record<string, HabitDayState> = {};
    for (const record of records) {
      if (record.habitId === habitId) {
        dayStates[record.date] = record.state as HabitDayState;
      }
    }

    const result = computeStreak({ states: dayStates, today });
    const loggedToday = records.some(
      record => record.habitId === habitId && record.date === today
    );

    return {
      streak: result.current,
      // Only a nudge, never a failure: today is still the user's to log.
      inDanger: result.current > 0 && !loggedToday,
    };
  }

  function selectState(habitId: string, state: HabitDailyState) {
    setStates(current => ({ ...current, [habitId]: state }));
    setRecords(current => setHabitDayState(current, habitId, today, state));
    const monthIndex = new Date().getMonth();
    const day = new Date().getDate();
    const status = statusOptions.find(option => option.value === state)!;
    pixelStore?.set("habits", monthIndex, day, status.color);
    if (state === "complete")
      onRecordHabit(
        habits.find(habit => habit.id === habitId)?.name || "Habit"
      );
  }
  function addAvoidanceHabit(event: React.FormEvent) {
    event.preventDefault();
    const name = avoidanceName.trim();
    if (!name) return;
    const startedAt = Date.now();
    setAvoidanceHabits(current => [
      ...current,
      {
        id: `${startedAt}-avoidance`,
        name,
        reason: avoidanceReason.trim(),
        startedAt,
        history: [
          { id: `${startedAt}-avoidance-${startedAt}`, resetAt: startedAt },
        ],
        archived: false,
      },
    ]);
    setAvoidanceName("");
    setAvoidanceReason("");
  }
  function resetAvoidance(habitId: string) {
    const resetAt = Date.now();
    setAvoidanceHabits(current =>
      current.map(habit =>
        habit.id === habitId
          ? resetAvoidanceHabit(habit, resetAt, avoidanceNotes[habitId] || "")
          : habit
      )
    );
    setAvoidanceNotes(current => {
      const next = { ...current };
      delete next[habitId];
      return next;
    });
  }
  function beginEdit(habit?: (typeof habits)[number]) {
    setDraft(
      habit
        ? {
            name: habit.name,
            schedule: habit.schedule,
            minimum: habit.minimum,
            cue: habit.cue,
          }
        : { name: "", schedule: "Every day", minimum: "", cue: "" }
    );
    setEditingId(habit?.id || "new");
  }
  function saveHabit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.name.trim()) return;
    if (editingId === "new")
      setHabits(current => [
        ...current,
        {
          id: `${Date.now()}-habit`,
          name: draft.name.trim(),
          schedule: draft.schedule,
          minimum: draft.minimum.trim() || "One small version",
          cue: draft.cue.trim(),
          archived: false,
        },
      ]);
    else if (editingId)
      setHabits(current =>
        current.map(habit =>
          habit.id === editingId
            ? {
                ...habit,
                name: draft.name.trim(),
                schedule: draft.schedule,
                minimum: draft.minimum.trim() || "One small version",
                cue: draft.cue.trim(),
              }
            : habit
        )
      );
    setEditingId(null);
  }
  return (
    <section
      className="journal-spread habits-spread"
      aria-labelledby="habits-title"
    >
      <div className="spread-page habits-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">mind · habits</p>
        <h2 id="habits-title">
          Small rituals,
          <br />
          <em>real momentum.</em>
        </h2>
        <p className="page-intro">
          Track what you return to—not as pressure, but as proof that care can
          be built one ordinary day at a time.
        </p>
        <button
          type="button"
          className="ink-button"
          onClick={() => setEditingId("new")}
        >
          <Plus size={15} /> Add habit
        </button>
      </div>
      <div className="spread-page habits-page">
        <section
          className="avoidance-tracker"
          aria-labelledby="avoidance-title"
        >
          <div className="avoidance-heading">
            <div>
              <span className="page-kicker">private reset space</span>
              <h3 id="avoidance-title">Things I’m choosing to avoid</h3>
              <p>
                Each timer starts from its own saved moment and keeps counting
                while you are away.
              </p>
            </div>
            <TimerReset size={18} aria-hidden="true" />
          </div>
          <form className="avoidance-add" onSubmit={addAvoidanceHabit}>
            <input
              value={avoidanceName}
              onChange={event => setAvoidanceName(event.target.value)}
              placeholder="What would you like to avoid?"
              aria-label="Avoided habit name"
            />
            <input
              value={avoidanceReason}
              onChange={event => setAvoidanceReason(event.target.value)}
              placeholder="Why it matters (optional)"
              aria-label="Reason for avoiding this habit"
            />
            <button type="submit">
              <Plus size={14} /> Add timer
            </button>
          </form>
          {activeAvoidanceHabits.length ? (
            <div
              className="avoidance-list"
              aria-label={`${activeAvoidanceHabits.length} independent avoided-habit timers`}
            >
              {activeAvoidanceHabits.map(habit => {
                const seconds = elapsedAvoidanceSeconds(habit.startedAt, now);
                return (
                  <article className="avoidance-card" key={habit.id}>
                    <div className="avoidance-card-top">
                      <div>
                        <b>{habit.name}</b>
                        {habit.reason ? <small>{habit.reason}</small> : null}
                      </div>
                      <span className="avoidance-milestone">
                        {avoidanceMilestone(seconds)}
                      </span>
                    </div>
                    <strong
                      aria-label={`${habit.name}: ${formatAvoidanceDuration(seconds)}`}
                    >
                      {formatAvoidanceDuration(seconds)}
                    </strong>
                    <small className="avoidance-started">
                      Counting since{" "}
                      {new Date(habit.startedAt).toLocaleString()}
                    </small>
                    <div className="avoidance-card-actions">
                      <input
                        value={avoidanceNotes[habit.id] || ""}
                        onChange={event =>
                          setAvoidanceNotes(current => ({
                            ...current,
                            [habit.id]: event.target.value,
                          }))
                        }
                        placeholder="Optional reset note"
                        aria-label={`Reset note for ${habit.name}`}
                      />
                      <button
                        type="button"
                        onClick={() => resetAvoidance(habit.id)}
                      >
                        Reset timer
                      </button>
                    </div>
                    {habit.history.length > 1 ? (
                      <small className="avoidance-history">
                        {habit.history.length - 1} previous reset
                        {habit.history.length === 2 ? "" : "s"} saved privately.
                      </small>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="avoidance-empty">
              Add one thing when you are ready. There is no judgment here—only a
              clear starting point.
            </p>
          )}
        </section>
        <section className="habit-today">
          <div>
            <span>Today’s rhythm</span>
            <b>
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </b>
          </div>
          <small>Choose the most honest version of each habit today.</small>
        </section>
        <section className="habit-list">
          {activeHabits.length === 0 ? (
            <p className="habit-empty">
              No habits yet. Add one gentle habit below — one is easier to keep
              than five.
            </p>
          ) : null}
          {activeHabits.map(habit => {
            const { streak, inDanger } = calculateStreak(habit.id);
            return (
              <article className="habit-card" key={habit.id}>
                <div className="habit-card-heading">
                  <div>
                    <b>
                      {habit.name}
                      {streak > 0 && (
                        <span
                          className={cn(
                            "streak-badge",
                            inDanger && "in-danger"
                          )}
                        >
                          🔥 {streak}-day streak
                        </span>
                      )}
                    </b>
                    <small>
                      {habit.schedule} · smallest version: {habit.minimum}
                    </small>
                    {habit.cue ? <em>Best cue: {habit.cue}</em> : null}
                  </div>
                  <button type="button" onClick={() => beginEdit(habit)}>
                    Edit
                  </button>
                </div>
                <div
                  className="habit-states"
                  aria-label={`Set today's state for ${habit.name}`}
                >
                  {statusOptions.map(option => (
                    <button
                      type="button"
                      key={option.value}
                      className={cn(
                        states[habit.id] === option.value && "active",
                        option.value
                      )}
                      onClick={() => selectState(habit.id, option.value)}
                      aria-pressed={states[habit.id] === option.value}
                    >
                      <i style={{ background: option.color }} />
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="habit-card-foot">
                  <span>
                    {states[habit.id]
                      ? `${statusOptions.find(option => option.value === states[habit.id])!.label} today`
                      : "Not logged today"}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setHabits(current =>
                        current.map(item =>
                          item.id === habit.id
                            ? { ...item, archived: true }
                            : item
                        )
                      )
                    }
                  >
                    Pause
                  </button>
                </div>
              </article>
            );
          })}
        </section>
        {editingId ? (
          <form className="habit-editor" onSubmit={saveHabit}>
            <div>
              <span>{editingId === "new" ? "Add a habit" : "Edit habit"}</span>
              <button type="button" onClick={() => setEditingId(null)}>
                Close
              </button>
            </div>
            <input
              value={draft.name}
              onChange={event =>
                setDraft(current => ({ ...current, name: event.target.value }))
              }
              placeholder="Habit name"
              autoFocus
            />
            <select
              value={draft.schedule}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  schedule: event.target.value,
                }))
              }
            >
              <option>Every day</option>
              <option>Weekdays</option>
              <option>Weekends</option>
              <option>3 times a week</option>
              <option>Selected days</option>
            </select>
            <input
              value={draft.minimum}
              onChange={event =>
                setDraft(current => ({
                  ...current,
                  minimum: event.target.value,
                }))
              }
              placeholder="Smallest version, e.g. one page"
            />
            <input
              value={draft.cue}
              onChange={event =>
                setDraft(current => ({ ...current, cue: event.target.value }))
              }
              placeholder="Optional cue, e.g. after breakfast"
            />
            <button type="submit">Save habit</button>
          </form>
        ) : (
          <button
            type="button"
            className="habit-add"
            onClick={() => beginEdit()}
          >
            <Plus size={15} /> Add a gentle habit
          </button>
        )}
        <section className="habit-weekly">
          <div>
            <span>This week, factually</span>
            <b>{records.length} local records</b>
          </div>
          <p>
            {weekly.complete} complete · {weekly.partial} partial ·{" "}
            {weekly.rest} planned rest · {weekly.skipped} skipped
          </p>
          <small>
            Planned rest is part of the rhythm, not a broken streak.
          </small>
        </section>
        <section className="habit-year">
          <div>
            <span>Year in habits</span>
            <b>Overall rhythm</b>
          </div>
          <PixelsGrid tracker="habits" />
        </section>
      </div>
    </section>
  );
}

function SleepPage({
  onContents,
  onCover,
  onRecord,
}: {
  onContents: () => void;
  onCover: () => void;
  onRecord: (activity: Omit<InsightActivity, "id" | "createdAt">) => void;
}) {
  // The intro button used to call a setter this component never had. The
  // form is always visible, so the useful thing it can do is put the caret
  // in the first field.
  const bedtimeInputRef = useRef<HTMLInputElement>(null);
  const pixelStore = useContext(PixelsTrackerContext);
  const [bedtime, setBedtime] = useState("23:15");
  const [wakeTime, setWakeTime] = useState("07:10");
  const [quality, setQuality] = useState("Restful");
  const [windDown, setWindDown] = useState(true);
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  /**
   * Each night is a record in the shared store. That gives the page undo, the
   * offline queue and sync for free, and — because a night has a real start
   * and end — it also gives the calendar and the timeline something to show.
   */
  const journal = useRecordStore();

  const logs = journal
    .inScope("sleep")
    .slice()
    .sort((a, b) => b.period.start.localeCompare(a.period.start))
    .map(record => ({
      id: record.id,
      date: new Date(record.period.start).toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      bedtime: String(record.body.bedtime ?? ""),
      wakeTime: String(record.body.wakeTime ?? ""),
      hours: Number(record.body.hours) || 0,
      quality: String(record.body.quality ?? ""),
      windDown: Boolean(record.body.windDown),
      note: String(record.body.note ?? ""),
    }));
  const qualityOptions = ["Restless", "Light", "Restful", "Deep"];
  const hours = sleepDurationHours(bedtime, wakeTime);
  const lastNight = logs[0] || { hours, quality };
  function saveSleep() {
    const now = new Date();
    const editing = editingId
      ? logs.find(log => log.id === editingId)
      : undefined;
    // Bedtime and wake time become a real period, so a night that crosses
    // midnight is one record spanning two days rather than two half-nights.
    const body = { bedtime, wakeTime, hours, quality, windDown, note };

    if (editingId) {
      journal.edit(editingId, body, "Sleep updated");
    } else {
      const start = new Date(now);
      const [bedHour, bedMinute] = bedtime.split(":").map(Number);
      start.setHours(bedHour, bedMinute, 0, 0);
      // A bedtime later than now belongs to the night before.
      if (hours > 0 && start.getTime() > now.getTime()) {
        start.setDate(start.getDate() - 1);
      }
      const end = new Date(start.getTime() + hours * 3_600_000);

      journal.add({
        scope: "sleep",
        body,
        period: { start: start.toISOString(), end: end.toISOString() },
        undoLabel: `Saved ${formatSleepDuration(hours)} of sleep`,
      });
    }

    setEditingId(null);
    pixelStore?.set(
      "sleep",
      now.getMonth(),
      now.getDate(),
      sleepDurationBand(hours).color
    );
    if (!editingId) {
      onRecord({
        module: "Sleep",
        amount: hours,
        label: `${formatSleepDuration(hours)} · ${quality} sleep log`,
      });
    }
    setNote("");
  }
  function editSleepLog(log: (typeof logs)[number]) {
    setEditingId(log.id);
    setBedtime(log.bedtime);
    setWakeTime(log.wakeTime);
    setQuality(log.quality);
    setWindDown(log.windDown);
    setNote(log.note);
  }
  return (
    <section
      className="journal-spread sleep-spread"
      aria-labelledby="sleep-title"
    >
      <div className="spread-page sleep-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">body · sleep</p>
        <h2 id="sleep-title">
          Let rest be
          <br />
          <em>part of the plan.</em>
        </h2>
        <p className="page-intro">
          Notice your evenings, record your rest, and recognise the routines
          that help you wake with more ease.
        </p>
        <button
          type="button"
          className="ink-button"
          onClick={() => bedtimeInputRef.current?.focus()}
        >
          <Plus size={15} /> Log sleep
        </button>
      </div>
      <div className="spread-page sleep-page">
        <section className="sleep-summary">
          <span>Last night</span>
          <b>{formatSleepDuration(lastNight.hours)}</b>
          <small>
            {lastNight.quality} rest ·{" "}
            {sleepDurationBand(lastNight.hours).label}
          </small>
        </section>
        <section className="sleep-capture">
          <div className="sleep-time-fields">
            <label>
              Bedtime
              <input
                type="time"
                ref={bedtimeInputRef}
                value={bedtime}
                onChange={event => setBedtime(event.target.value)}
              />
            </label>
            <label>
              Wake time
              <input
                type="time"
                value={wakeTime}
                onChange={event => setWakeTime(event.target.value)}
              />
            </label>
          </div>
          <p className="sleep-duration">
            <span>Calculated rest</span>
            <b>{formatSleepDuration(hours)}</b>
          </p>
          <div className="sleep-quality">
            <span>How did it feel?</span>
            <div>
              {qualityOptions.map(option => (
                <button
                  type="button"
                  key={option}
                  className={cn(quality === option && "active")}
                  onClick={() => setQuality(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <label className="wind-down-toggle">
            <input
              type="checkbox"
              checked={windDown}
              onChange={event => setWindDown(event.target.checked)}
            />
            <span>
              <b>Wind-down routine</b>
              <small>
                {windDown ? "Protected before sleep" : "Skipped last night"}
              </small>
            </span>
          </label>
          <label className="sleep-note">
            A little context{" "}
            <input
              value={note}
              onChange={event => setNote(event.target.value)}
              placeholder="Optional note, e.g. late study session"
            />
          </label>
          <div className="tracker-action-row">
            <Button type="button" className="ink-button" onClick={saveSleep}>
              {editingId ? "Save edited log" : "Save last night"}
            </Button>
            {editingId ? (
              <button
                type="button"
                className="local-undo"
                onClick={() => {
                  setEditingId(null);
                  setNote("");
                }}
              >
                Cancel edit
              </button>
            ) : null}
            {/* Undo now comes from the store's toast after every save, so a
                page-local copy of the previous list would be a second,
                competing history. */}
          </div>
        </section>
        <section className="sleep-history">
          <div>
            <span>Recent rest</span>
            <b>{logs.length} saved</b>
          </div>
          {logs.length === 0 ? (
            <small>Your private sleep rhythm will appear here.</small>
          ) : (
            logs.slice(0, 4).map(log => (
              <article key={log.id}>
                <div>
                  <b>
                    {log.date} · {formatSleepDuration(log.hours)} ·{" "}
                    {log.quality}
                  </b>
                  <small>
                    {log.bedtime}–{log.wakeTime} ·{" "}
                    {log.windDown
                      ? "Wind-down protected"
                      : "No wind-down logged"}
                    {log.note ? ` · ${log.note}` : ""}
                  </small>
                </div>
                <div className="sleep-log-actions">
                  <button type="button" onClick={() => editSleepLog(log)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      journal.remove(log.id, `Removed sleep from ${log.date}`)
                    }
                    aria-label={`Remove sleep log from ${log.date}`}
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
        <section className="sleep-pattern">
          <div>
            <span>Year in rest</span>
            <b>Filled by hours slept</b>
          </div>
          <PixelsGrid tracker="sleep" />
        </section>
      </div>
    </section>
  );
}

function WellbeingPage({
  onContents,
  onCover,
  onRecord,
}: {
  onContents: () => void;
  onCover: () => void;
  onRecord: (activity: Omit<InsightActivity, "id" | "createdAt">) => void;
}) {
  const pixelStore = useContext(PixelsTrackerContext);
  const [mood, setMood] = useState("Steady");
  const [energy, setEnergy] = useState(3);
  const [note, setNote] = useState("");
  const [contexts, setContexts] = useState<string[]>([]);
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [lastEntries, setLastEntries] = useState<MoodEntry[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  useMongoJournalScope({
    scope: "wellbeing",
    payload: { entries },
    hydrate: payload => {
      if (Array.isArray(payload.entries))
        setEntries(payload.entries as MoodEntry[]);
    },
  });
  const moods = ["Low", "Tender", "Steady", "Bright", "Joyful"];
  const pattern = moodPatternSummary(entries);
  function clearForm() {
    setMood("Steady");
    setEnergy(3);
    setNote("");
    setContexts([]);
    setEditingId(null);
  }
  function saveCheckIn() {
    const savedNote = note.trim();
    const entry: MoodEntry = {
      id: editingId || `${Date.now()}-${mood}`,
      date: new Date().toISOString().slice(0, 10),
      mood,
      energy,
      note: savedNote,
      contexts,
    };
    setLastEntries(entries);
    setEntries(current =>
      editingId
        ? current.map(item => (item.id === editingId ? entry : item))
        : [entry, ...current]
    );
    onRecord({ module: "Wellbeing", amount: 1, label: `${mood} check-in` });
    clearForm();
    const monthIndex = new Date().getMonth();
    const day = new Date().getDate();
    const moodColors: Record<string, string> = {
      Low: "#ef4444",
      Tender: "#f97316",
      Steady: "#eab308",
      Bright: "#84cc16",
      Joyful: "#22c55e",
    };
    pixelStore?.set("mood", monthIndex, day, moodColors[mood] || "#eab308");
  }
  function editEntry(entry: MoodEntry) {
    setMood(entry.mood);
    setEnergy(entry.energy);
    setNote(entry.note);
    setContexts(entry.contexts);
    setEditingId(entry.id);
  }
  return (
    <section
      className="journal-spread wellbeing-spread"
      aria-labelledby="wellbeing-title"
    >
      <div className="spread-page wellbeing-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <div className="editorial-contrast-panel">
          <p className="page-kicker">mind · wellbeing</p>
          <h2 id="wellbeing-title">
            Meet yourself
            <br />
            <em>where you are.</em>
          </h2>
          <p className="page-intro">
            A calm daily check-in for noticing your emotional weather, energy,
            and what could care for you next.
          </p>
          <button
            type="button"
            className="ink-button"
            onClick={() => setEditingId(null)}
          >
            <Plus size={15} /> Save check-in
          </button>
        </div>
      </div>
      <div className="spread-page wellbeing-page">
        <section className="mood-checkin">
          <div className="mood-checkin-heading">
            <div>
              <span>Today’s check-in</span>
              <b>
                {editingId ? "Editing a saved check-in" : "Private and local"}
              </b>
            </div>
            <small>Choose what fits. Leave the rest blank.</small>
          </div>
          <div className="wellbeing-section">
            <span>How do you feel?</span>
            <div className="mood-pills">
              {moods.map(item => (
                <button
                  key={item}
                  type="button"
                  className={cn(mood === item && "active")}
                  onClick={() => setMood(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="wellbeing-section">
            <span>Energy today · {energy}/5</span>
            <div className="energy-scale">
              {[1, 2, 3, 4, 5].map(value => (
                <button
                  key={value}
                  type="button"
                  className={cn(value <= energy && "active")}
                  onClick={() => setEnergy(value)}
                  aria-label={`${value} out of 5 energy`}
                >
                  ✦
                </button>
              ))}
            </div>
          </div>
          <div className="mood-context">
            <span>
              What may have shaped today? <small>Optional</small>
            </span>
            <div>
              {moodContextOptions.map(context => (
                <button
                  type="button"
                  key={context}
                  className={cn(contexts.includes(context) && "active")}
                  onClick={() =>
                    setContexts(current => toggleMoodContext(current, context))
                  }
                >
                  {context}
                </button>
              ))}
            </div>
          </div>
          <label className="wellbeing-note">
            A small note
            <textarea
              value={note}
              onChange={event => setNote(event.target.value)}
              placeholder="What would make today feel a little kinder?"
            />
          </label>
          <div className="tracker-action-row">
            <Button type="button" className="ink-button" onClick={saveCheckIn}>
              {editingId ? "Update check-in" : "Save check-in"}
            </Button>
            {editingId ? (
              <button type="button" className="local-undo" onClick={clearForm}>
                Cancel edit
              </button>
            ) : lastEntries ? (
              <button
                type="button"
                className="local-undo"
                onClick={() => {
                  setEntries(lastEntries);
                  setLastEntries(null);
                }}
              >
                Undo last
              </button>
            ) : null}
          </div>
        </section>
        <section className="mood-pattern">
          <div>
            <span>Recent pattern</span>
            <b>Last {pattern?.count || 0} check-ins</b>
          </div>
          {pattern ? (
            <p>
              <strong>{pattern.commonMood}</strong> appeared most often. Average
              energy was <strong>{pattern.averageEnergy.toFixed(1)}/5</strong>.
            </p>
          ) : (
            <p>Save a few check-ins to see a simple factual pattern here.</p>
          )}
        </section>
        <section className="wellbeing-history">
          <div>
            <span>Recent check-ins</span>
            <b>{entries.length} saved</b>
          </div>
          {entries.length === 0 ? (
            <small>Your private check-ins will appear here.</small>
          ) : (
            entries.slice(0, 5).map(entry => (
              <article key={entry.id}>
                <div>
                  <b>
                    {entry.date} · {entry.mood} · {entry.energy}/5 energy
                  </b>
                  <small>
                    {entry.contexts.length
                      ? `${entry.contexts.join(" · ")}${entry.note ? " · " : ""}`
                      : ""}
                    {entry.note || "Quiet check-in"}
                  </small>
                </div>
                <div>
                  <button type="button" onClick={() => editEntry(entry)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEntries(current =>
                        current.filter(item => item.id !== entry.id)
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
        <section className="mood-year">
          <div>
            <span>Year in mood</span>
            <b>Long-term pattern</b>
          </div>
          <PixelsGrid tracker="mood" />
        </section>
      </div>
    </section>
  );
}

function CyclePage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  type CycleEntry = {
    id: string;
    start: string;
    end: string;
    flow: string;
    symptoms: string;
  };
  type CycleContextEntry = {
    id: string;
    date: string;
    symptoms: string[];
    tags: string[];
    note: string;
  };
  const [entries, setEntries] = useState<CycleEntry[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const [draft, setDraft] = useState({
    start: "",
    end: "",
    flow: "Moderate",
    symptoms: "",
  });
  const [contextDate, setContextDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [contextSymptoms, setContextSymptoms] = useState<string[]>([]);
  const [contextTags, setContextTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [contextNote, setContextNote] = useState("");
  const [contextEntries, setContextEntries] = useState<CycleContextEntry[]>([]);
  useMongoJournalScope({
    scope: "cycle",
    payload: { entries, contextEntries },
    hydrate: payload => {
      if (Array.isArray(payload.entries))
        setEntries(payload.entries as CycleEntry[]);
      if (Array.isArray(payload.contextEntries))
        setContextEntries(payload.contextEntries as CycleContextEntry[]);
    },
  });
  const symptomOptions = [
    "Cramps",
    "Tenderness",
    "Low energy",
    "Headache",
    "Bloating",
  ];
  function saveEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.start) return;
    setEntries(current => [{ id: `${Date.now()}`, ...draft }, ...current]);
    setDraft({ start: "", end: "", flow: "Moderate", symptoms: "" });
    setLogOpen(false);
  }
  function saveContext() {
    if (!contextSymptoms.length && !contextTags.length && !contextNote.trim())
      return;
    setContextEntries(current => [
      {
        id: `${Date.now()}`,
        date: contextDate,
        symptoms: contextSymptoms,
        tags: contextTags,
        note: contextNote.trim(),
      },
      ...current,
    ]);
    setContextSymptoms([]);
    setContextTags([]);
    setCustomTag("");
    setContextNote("");
  }
  const estimate = estimateCycle(entries);
  return (
    <section
      className="journal-spread cycle-spread"
      aria-labelledby="cycle-title"
    >
      <div className="spread-page cycle-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">body · period &amp; cycle tracker</p>
        <h2 id="cycle-title">
          In rhythm with
          <br />
          <em>yourself.</em>
        </h2>
        <p className="page-intro">
          A private, gentle view of your cycle—shown as an estimate based on
          your recent entries.
        </p>
        <button
          type="button"
          className="ink-button cycle-log-button"
          onClick={() => setLogOpen(current => !current)}
        >
          <Plus size={15} /> Log cycle entry
        </button>
      </div>
      <div className="spread-page cycle-ring-page">
        <div className="cycle-ring">
          <div className="cycle-ring-inner">
            <span>today</span>
            <b>{estimate?.phase || "Cycle estimate"}</b>
            <small>estimated phase</small>
          </div>
        </div>
        <div className="cycle-facts">
          <span>
            <b>Day {estimate?.cycleDay || "—"}</b> of your current cycle
          </span>
          <span>
            <b>{estimate?.estimatedNextPeriod || "—"}</b> estimated next period
          </span>
          <span>
            <b>{entries.length}</b> private recorded cycles
          </span>
        </div>
        <p className="estimate-note">
          {estimate?.wording ||
            "Add a period entry to begin your private estimate."}
        </p>
        <section className="cycle-daily-context">
          <div className="cycle-context-heading">
            <span>Daily context</span>
            <b>Private · optional</b>
          </div>
          <label className="cycle-context-date">
            Date
            <input
              type="date"
              value={contextDate}
              onChange={event => setContextDate(event.target.value)}
            />
          </label>
          <div className="cycle-context-choice">
            <span>What showed up?</span>
            <div>
              {symptomOptions.map(symptom => (
                <button
                  type="button"
                  key={symptom}
                  className={cn(contextSymptoms.includes(symptom) && "active")}
                  onClick={() =>
                    setContextSymptoms(current =>
                      toggleCycleContextTag(current, symptom)
                    )
                  }
                >
                  {symptom}
                </button>
              ))}
            </div>
          </div>
          <div className="cycle-context-choice">
            <span>Personal tags</span>
            <div>
              {contextTags.map(tag => (
                <button
                  type="button"
                  key={tag}
                  className="active"
                  onClick={() =>
                    setContextTags(current =>
                      toggleCycleContextTag(current, tag)
                    )
                  }
                >
                  {tag} ×
                </button>
              ))}
            </div>
            <div className="cycle-custom-tag">
              <input
                value={customTag}
                onChange={event => setCustomTag(event.target.value)}
                placeholder="Add a personal tag"
              />
              <button
                type="button"
                onClick={() => {
                  setContextTags(current =>
                    addCycleContextTag(current, customTag)
                  );
                  setCustomTag("");
                }}
              >
                Add tag
              </button>
            </div>
          </div>
          <label className="cycle-context-note">
            A little context
            <textarea
              value={contextNote}
              onChange={event => setContextNote(event.target.value)}
              placeholder="Optional private note"
            />
          </label>
          <Button type="button" className="ink-button" onClick={saveContext}>
            Save daily context
          </Button>
          {contextEntries.length > 0 && (
            <div className="cycle-context-history">
              <span>Recent context</span>
              {contextEntries.slice(0, 3).map(entry => (
                <article key={entry.id}>
                  <b>{entry.date}</b>
                  <small>
                    {[...entry.symptoms, ...entry.tags].join(" · ") ||
                      "Private note"}
                    {entry.note ? ` · ${entry.note}` : ""}
                  </small>
                </article>
              ))}
            </div>
          )}
        </section>
        {logOpen && (
          <form className="cycle-log-form" onSubmit={saveEntry}>
            <label>
              Period start
              <input
                required
                type="date"
                value={draft.start}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    start: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Period end
              <input
                type="date"
                value={draft.end}
                onChange={event =>
                  setDraft(current => ({ ...current, end: event.target.value }))
                }
              />
            </label>
            <label>
              Flow
              <select
                value={draft.flow}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    flow: event.target.value,
                  }))
                }
              >
                <option>Light</option>
                <option>Moderate</option>
                <option>Heavy</option>
              </select>
            </label>
            <label>
              Symptoms
              <textarea
                value={draft.symptoms}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    symptoms: event.target.value,
                  }))
                }
                placeholder="Optional notes"
              />
            </label>
            <div>
              <button type="button" onClick={() => setLogOpen(false)}>
                Cancel
              </button>
              <Button type="submit" className="ink-button">
                Save private entry
              </Button>
            </div>
          </form>
        )}
        <CycleCalendar entries={entries} />
        <div className="cycle-history">
          <div>
            <span>recent cycle history</span>
            <b>{entries.length} entries</b>
          </div>
          {entries.length === 0 ? (
            <p className="cycle-empty">
              No cycles recorded yet. Add a start date above and this history
              fills in as you go.
            </p>
          ) : null}
          {entries.map(entry => (
            <article key={entry.id}>
              <i />
              <p>
                <b>
                  {entry.start} {entry.end && `— ${entry.end}`}
                </b>
                <small>
                  {entry.flow} flow · {entry.symptoms || "No symptoms recorded"}
                </small>
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CycleCalendar({
  entries,
}: {
  entries: Array<{ start: string; end: string }>;
}) {
  const [month, setMonth] = useState(7);
  const [year, setYear] = useState(2026);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startsOn = new Date(year, month, 1).getDay();
  const loggedDays = new Set<number>();
  entries.forEach(entry => {
    const start = new Date(`${entry.start}T12:00:00`);
    const end = new Date(`${entry.end || entry.start}T12:00:00`);
    for (
      let day = new Date(start);
      day <= end;
      day.setDate(day.getDate() + 1)
    ) {
      if (day.getFullYear() === year && day.getMonth() === month)
        loggedDays.add(day.getDate());
    }
  });
  const monthLabel = new Date(year, month, 1).toLocaleString("en", {
    month: "long",
    year: "numeric",
  });
  function moveMonth(delta: number) {
    const next = new Date(year, month + delta, 1);
    setMonth(next.getMonth());
    setYear(next.getFullYear());
  }
  return (
    <div className="cycle-calendar" aria-label="Private period calendar">
      <div className="cycle-calendar-heading">
        <button
          type="button"
          onClick={() => moveMonth(-1)}
          aria-label="Previous month"
        >
          ←
        </button>
        <b>{monthLabel}</b>
        <button
          type="button"
          onClick={() => moveMonth(1)}
          aria-label="Next month"
        >
          →
        </button>
      </div>
      <div className="calendar-weekdays">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>
      <div className="calendar-days">
        {Array.from({ length: startsOn }, (_, index) => (
          <i key={`blank-${index}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, index) => index + 1).map(
          day => (
            <span className={cn(loggedDays.has(day) && "is-period")} key={day}>
              {day}
            </span>
          )
        )}
      </div>
      <small>
        <i /> Logged period day · private
      </small>
    </div>
  );
}

function LegacyNutritionPage({
  onContents,
  onCover,
  onRecord,
}: {
  onContents: () => void;
  onCover: () => void;
  onRecord: (activity: Omit<InsightActivity, "id" | "createdAt">) => void;
}) {
  const pixelStore = useContext(PixelsTrackerContext);
  const [meal, setMeal] = useState("Lunch");
  const [note, setNote] = useState("");
  const [mealGroups, setMealGroups] = useState<string[]>([]);
  const [meals, setMeals] = useState<
    Array<{ name: string; note: string; groups: string[]; color: string }>
  >([]);
  const [lastMeals, setLastMeals] = useState<Array<{
    name: string;
    note: string;
    groups: string[];
    color: string;
  }> | null>(null);
  const [grocery, setGrocery] = useState("");
  const [groceries, setGroceries] = useState<string[]>([]);
  const varietyChoices = [
    "Fruit / veg",
    "Protein",
    "Wholegrain",
    "Comfort",
    "Something new",
  ];
  function addMeal() {
    if (!note.trim()) return;
    const savedNote = note.trim();
    setLastMeals(meals);
    setMeals([
      ...meals,
      {
        name: meal,
        note: savedNote,
        groups: mealGroups,
        color: mealGroups.includes("Fruit / veg")
          ? "leaf"
          : mealGroups.includes("Protein")
            ? "sun"
            : "berry",
      },
    ]);
    onRecord({ module: "Nutrition", amount: 1, label: `${meal} meal note` });
    setNote("");
    setMealGroups([]);
    const monthIndex = new Date().getMonth();
    const day = new Date().getDate();
    pixelStore?.set("nutrition", monthIndex, day, "#ec4899");
  }
  function addGrocery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!grocery.trim()) return;
    setGroceries(current => [...current, grocery.trim()]);
    setGrocery("");
  }
  return (
    <section
      className="journal-spread nutrition-spread"
      aria-labelledby="nutrition-title"
    >
      <div className="spread-page nutrition-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <div className="editorial-contrast-panel">
          <p className="page-kicker">body · nutrition</p>
          <h2 id="nutrition-title">
            Nourish the
            <br />
            <em>whole rhythm.</em>
          </h2>
          <p className="page-intro">
            A flexible place to notice meals, make room for variety, and set up
            the next grocery run—without rules, scores, or restriction.
          </p>
          <button
            type="button"
            className="ink-button"
            onClick={() => setMeal("Breakfast")}
          >
            <Plus size={15} /> Log meal
          </button>
        </div>
      </div>
      <div className="spread-page nutrition-page">
        <div className="meal-composer">
          <div className="meal-picker">
            {["Breakfast", "Lunch", "Dinner", "Snack"].map(item => (
              <button
                type="button"
                className={cn(meal === item && "active")}
                onClick={() => setMeal(item)}
                key={item}
              >
                {item}
              </button>
            ))}
          </div>
          <label>
            What nourished you?
            <input
              value={note}
              onChange={event => setNote(event.target.value)}
              placeholder="A meal, snack, or something you enjoyed"
            />
          </label>
          <div className="variety-picker">
            <span>
              What showed up? <small>optional, no score</small>
            </span>
            <div>
              {varietyChoices.map(choice => (
                <button
                  type="button"
                  className={cn(mealGroups.includes(choice) && "active")}
                  onClick={() =>
                    setMealGroups(current =>
                      current.includes(choice)
                        ? current.filter(item => item !== choice)
                        : [...current, choice]
                    )
                  }
                  key={choice}
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
          <div className="tracker-action-row">
            <Button type="button" className="ink-button" onClick={addMeal}>
              Add meal
            </Button>
            {lastMeals ? (
              <button
                type="button"
                className="local-undo"
                onClick={() => {
                  setMeals(lastMeals);
                  setLastMeals(null);
                }}
              >
                Undo last
              </button>
            ) : null}
          </div>
        </div>
        <div className="meal-rhythm">
          <div>
            <span>today’s rhythm</span>
            <b>{meals.length} moments</b>
          </div>
          {meals.length === 0 ? (
            <small className="nutrition-empty">
              Your first meal note will appear here—there is no ideal day to
              meet.
            </small>
          ) : (
            meals.map((entry, index) => (
              <article key={`${entry.name}-${index}`}>
                <i className={entry.color} />
                <p>
                  <b>{entry.name}</b>
                  <small>
                    {entry.note}
                    {entry.groups.length ? ` · ${entry.groups.join(", ")}` : ""}
                  </small>
                </p>
              </article>
            ))
          )}
        </div>
        <form className="grocery-plan" onSubmit={addGrocery}>
          <div>
            <span>Next grocery note</span>
            <b>{groceries.length} planned</b>
          </div>
          <div>
            <input
              value={grocery}
              onChange={event => setGrocery(event.target.value)}
              placeholder="Add an ingredient or household food"
            />
            <button type="submit" aria-label="Add grocery item">
              <Plus size={15} />
            </button>
          </div>
          <p>
            {groceries.length
              ? groceries.join(" · ")
              : "Add what would make the next meals easier."}
          </p>
        </form>
      </div>
    </section>
  );
}

function NutritionPage({
  onContents,
  onCover,
  onRecord,
}: {
  onContents: () => void;
  onCover: () => void;
  onRecord: (activity: Omit<InsightActivity, "id" | "createdAt">) => void;
}) {
  const pixelStore = useContext(PixelsTrackerContext);
  type MealEntry = {
    id: string;
    meal: string;
    note: string;
    time: string;
    tags: string[];
  };
  type GroceryItem = {
    id: string;
    title: string;
    quantity: string;
    category: string;
    done: boolean;
  };
  const [meal, setMeal] = useState("Lunch");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [intention, setIntention] = useState("");
  const [reflection, setReflection] = useState("");
  const [groceryTitle, setGroceryTitle] = useState("");
  const [groceryQuantity, setGroceryQuantity] = useState("");
  const [groceryCategory, setGroceryCategory] = useState("Produce");
  const [groceries, setGroceries] = useState<GroceryItem[]>([]);
  useMongoJournalScope({
    scope: "nutrition",
    payload: { meals, groceries, intention, reflection },
    hydrate: payload => {
      if (Array.isArray(payload.meals)) setMeals(payload.meals as MealEntry[]);
      if (Array.isArray(payload.groceries))
        setGroceries(payload.groceries as GroceryItem[]);
      if (typeof payload.intention === "string")
        setIntention(payload.intention);
      if (typeof payload.reflection === "string")
        setReflection(payload.reflection);
    },
  });
  const tagsAvailable = [
    "Fruit / veg",
    "Protein",
    "Wholegrain",
    "Comfort",
    "Something new",
  ];
  const recent = Array.from(new Set(meals.map(entry => entry.note))).slice(
    0,
    4
  );
  function addMeal(text = note) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const entry = {
      id: `${Date.now()}-${trimmed}`,
      meal,
      note: trimmed,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      tags,
    };
    setMeals(current => [entry, ...current]);
    onRecord({ module: "Nutrition", amount: 1, label: `${meal} meal note` });
    setNote("");
    setTags([]);
    const monthIndex = new Date().getMonth();
    const day = new Date().getDate();
    pixelStore?.set("nutrition", monthIndex, day, "#ec4899");
  }
  function addGrocery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!groceryTitle.trim()) return;
    setGroceries(current => [
      {
        id: `${Date.now()}-${groceryTitle}`,
        title: groceryTitle.trim(),
        quantity: groceryQuantity.trim(),
        category: groceryCategory,
        done: false,
      },
      ...current,
    ]);
    setGroceryTitle("");
    setGroceryQuantity("");
  }
  return (
    <section
      className="journal-spread nutrition-spread"
      aria-labelledby="nutrition-title"
    >
      <div className="spread-page nutrition-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <div className="editorial-contrast-panel">
          <p className="page-kicker">body · nutrition</p>
          <h2 id="nutrition-title">
            Nourish the
            <br />
            <em>whole rhythm.</em>
          </h2>
          <p className="page-intro">
            A flexible place to notice meals, make room for variety, and prepare
            what will make the next week easier—without rules, scores, or
            restriction.
          </p>
          <div className="nutrition-note">
            <Sparkles size={15} />
            <span>Food is care, connection, energy, and enjoyment.</span>
          </div>
        </div>
      </div>
      <div className="spread-page nutrition-page nutrition-workflow">
        <section className="nutrition-compass">
          <div>
            <span>This week’s gentle intention</span>
            <input
              value={intention}
              onChange={event => setIntention(event.target.value)}
              placeholder="e.g. Make lunches easier"
            />
          </div>
          <div>
            <span>Food-life reflection</span>
            <input
              value={reflection}
              onChange={event => setReflection(event.target.value)}
              placeholder="What made eating easier lately?"
            />
          </div>
        </section>
        <section className="nutrition-section meal-composer">
          <div className="nutrition-section-heading">
            <span>Log a meal</span>
            <b>Today</b>
          </div>
          <div className="meal-picker">
            {["Breakfast", "Lunch", "Dinner", "Snack"].map(item => (
              <button
                type="button"
                className={cn(meal === item && "active")}
                onClick={() => setMeal(item)}
                key={item}
              >
                {item}
              </button>
            ))}
          </div>
          <label>
            What nourished you?
            <input
              value={note}
              onChange={event => setNote(event.target.value)}
              onKeyDown={event => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addMeal();
                }
              }}
              placeholder="A meal, snack, or something you enjoyed"
            />
          </label>
          <div className="variety-picker">
            <span>
              What showed up? <small>optional, no score</small>
            </span>
            <div>
              {tagsAvailable.map(tag => (
                <button
                  type="button"
                  className={cn(tags.includes(tag) && "active")}
                  onClick={() =>
                    setTags(current =>
                      current.includes(tag)
                        ? current.filter(value => value !== tag)
                        : [...current, tag]
                    )
                  }
                  key={tag}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div className="meal-action-row">
            <Button
              type="button"
              className="ink-button"
              onClick={() => addMeal()}
            >
              Save {meal.toLowerCase()}
            </Button>
            {recent.length > 0 && (
              <div className="recent-meals">
                <span>Repeat</span>
                {recent.map(item => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => addMeal(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
        <section className="nutrition-section meal-rhythm">
          <div className="nutrition-section-heading">
            <span>Today’s rhythm</span>
            <b>{meals.length} moments</b>
          </div>
          {meals.length === 0 ? (
            <small className="nutrition-empty">
              Start with a meal you remember. There is no ideal day to meet.
            </small>
          ) : (
            meals.map(entry => (
              <article key={entry.id}>
                <div>
                  <b>{entry.meal}</b>
                  <small>
                    {entry.time} · {entry.note}
                    {entry.tags.length ? ` · ${entry.tags.join(", ")}` : ""}
                  </small>
                </div>
                <div className="meal-entry-actions">
                  <button
                    type="button"
                    onClick={() =>
                      setGroceries(current => [
                        {
                          id: `${Date.now()}-${entry.note}`,
                          title: entry.note,
                          quantity: "",
                          category: "Pantry",
                          done: false,
                        },
                        ...current,
                      ])
                    }
                  >
                    To grocery
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setMeals(current =>
                        current.filter(item => item.id !== entry.id)
                      )
                    }
                    aria-label={`Remove ${entry.meal}`}
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
        <section className="nutrition-section grocery-plan">
          <div className="nutrition-section-heading">
            <span>Next grocery run</span>
            <b>{groceries.filter(item => !item.done).length} to pick up</b>
          </div>
          <form onSubmit={addGrocery}>
            <input
              value={groceryTitle}
              onChange={event => setGroceryTitle(event.target.value)}
              placeholder="Ingredient or household food"
            />
            <input
              value={groceryQuantity}
              onChange={event => setGroceryQuantity(event.target.value)}
              placeholder="Quantity"
            />
            <select
              value={groceryCategory}
              onChange={event => setGroceryCategory(event.target.value)}
            >
              <option>Produce</option>
              <option>Pantry</option>
              <option>Protein</option>
              <option>Dairy / alternative</option>
              <option>Household</option>
            </select>
            <button type="submit">Add</button>
          </form>
          {groceries.length === 0 ? (
            <small>Add what would make the next meals easier.</small>
          ) : (
            <div className="grocery-items">
              {groceries.map(item => (
                <article key={item.id} className={cn(item.done && "is-done")}>
                  <button
                    type="button"
                    onClick={() =>
                      setGroceries(current =>
                        current.map(value =>
                          value.id === item.id
                            ? { ...value, done: !value.done }
                            : value
                        )
                      )
                    }
                    aria-label={`Mark ${item.title} ${item.done ? "not done" : "done"}`}
                  >
                    {item.done ? "✓" : ""}
                  </button>
                  <p>
                    <b>{item.title}</b>
                    <small>
                      {item.quantity || "No quantity"} · {item.category}
                    </small>
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setGroceries(current =>
                        current.filter(value => value.id !== item.id)
                      )
                    }
                  >
                    Remove
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="nutrition-pattern nutrition-pattern-visible">
          <div className="nutrition-pattern-heading">
            <span>Year in meals</span>
            <small>Long-term meal pattern</small>
          </div>
          <PixelsGrid tracker="nutrition" />
        </section>
      </div>
    </section>
  );
}

function WaterIntakePage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  const pixelStore = useContext(PixelsTrackerContext);
  const [customAmount, setCustomAmount] = useState("300");

  /**
   * Every sip is its own record in the shared store, rather than a running
   * total in this page's state. That is what gives the page undo, an offline
   * queue and sync across devices without any of it living here — and what
   * lets Today, the timeline and the charts read the same entries.
   */
  const journal = useRecordStore();
  const waterRecords = journal.onDay("water", journal.today);

  const goal = journal.preferences.waterGoalMl;
  const setGoal = (next: number) =>
    journal.updatePreferences({ waterGoalMl: next });

  const remindersOn = journal.preferences.notifications.enabled;
  const setRemindersOn = (next: boolean) =>
    journal.updatePreferences({ notifications: { enabled: next } });

  // Derived from the records, never stored separately: a total kept alongside
  // the entries it sums is one undo away from disagreeing with them.
  const intake = waterRecords.reduce(
    (total, record) => total + (Number(record.body.amountMl) || 0),
    0
  );

  const entries = waterRecords
    .slice()
    .sort((a, b) => b.period.start.localeCompare(a.period.start))
    .map(record => ({
      id: record.id,
      amount: Number(record.body.amountMl) || 0,
      time: new Date(record.period.start).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));
  const progress = waterProgress(intake, goal);
  const remaining = waterRemaining(intake, goal);
  function addWater(amount: number) {
    if (!Number.isFinite(amount) || amount <= 0) return;

    journal.add({
      scope: "water",
      body: { amountMl: Math.round(amount) },
      undoLabel: `Added ${Math.round(amount)} ml`,
    });

    const now = new Date();
    pixelStore?.set("water", now.getMonth(), now.getDate(), "#16a8a8");
  }

  return (
    <section
      className="journal-spread water-spread"
      aria-labelledby="water-title"
    >
      <div className="spread-page water-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">body · nutrition & hydration</p>
        <h2 id="water-title">
          A little more
          <br />
          <em>life in every sip.</em>
        </h2>
        <p className="page-intro">
          A gentle water log for your day. Choose a goal that feels right for
          you and adjust it whenever you need to.
        </p>
        <button
          type="button"
          className="ink-button"
          onClick={() => addWater(250)}
        >
          <Plus size={15} /> Log water
        </button>
      </div>
      <div className="spread-page water-page">
        <section className="water-progress-hero">
          <div
            className="water-orb"
            style={{ "--fill": `${progress}%` } as React.CSSProperties}
          >
            <div>
              <span>today</span>
              <b>{intake} ml</b>
              <small>{progress}% complete</small>
            </div>
          </div>
          <div className="water-progress-copy">
            <span>Today’s water</span>
            <b>
              {intake} ml <small>of {goal} ml</small>
            </b>
            <strong>
              {remaining > 0
                ? `${remaining} ml remaining`
                : "Goal met for today"}
            </strong>
          </div>
        </section>
        <section className="water-log-panel" aria-label="Log water">
          <div className="water-actions">
            <button type="button" onClick={() => addWater(250)}>
              +250 ml
            </button>
            <button type="button" onClick={() => addWater(350)}>
              +350 ml
            </button>
            <button type="button" onClick={() => addWater(500)}>
              +500 ml
            </button>
          </div>
          <div className="water-entry">
            <label>
              Custom amount
              <input
                type="number"
                min="1"
                step="25"
                inputMode="numeric"
                value={customAmount}
                onChange={event => setCustomAmount(event.target.value)}
                aria-label="Custom water amount in millilitres"
              />
              <span>ml</span>
            </label>
            <button
              type="button"
              onClick={() => {
                addWater(Number(customAmount));
                setCustomAmount("");
              }}
            >
              Add
            </button>
          </div>
        </section>
        <section className="water-setup">
          <div className="water-goal-control">
            <label>
              Daily goal <b>{goal} ml</b>
              <input
                type="range"
                min="1200"
                max="3500"
                step="100"
                value={goal}
                onChange={event => setGoal(Number(event.target.value))}
              />
            </label>
          </div>
          <label className="hydration-reminder">
            <input
              type="checkbox"
              checked={remindersOn}
              onChange={event => setRemindersOn(event.target.checked)}
            />
            <span>
              <b>Gentle reminders</b>
              <small>
                {remindersOn
                  ? "Preference on · every 2 hours"
                  : "Preference off for today"}
              </small>
            </span>
          </label>
        </section>
        <section className="water-pattern">
          <div>
            <span>Year in hydration</span>
            <b>Long-term consistency</b>
          </div>
          <PixelsGrid tracker="water" />
        </section>
        <div className="water-history">
          <div>
            <span>Today’s sips</span>
            <b>{entries.length} logged</b>
            <button
              type="button"
              onClick={() => {
                // Each sip is removed as its own record, so every one of
                // them stays individually undoable rather than vanishing
                // together with no way back.
                for (const entry of entries) {
                  journal.remove(entry.id, `Removed ${entry.amount} ml`);
                }
              }}
            >
              Clear today
            </button>
          </div>
          {entries.length === 0 ? (
            <small>No water logged yet today.</small>
          ) : (
            entries.map(entry => (
              <article key={entry.id}>
                <i />
                <span>{entry.time}</span>
                <b>+{entry.amount} ml</b>
                <button
                  type="button"
                  onClick={() => {
                    journal.remove(entry.id, `Removed ${entry.amount} ml`);
                  }}
                  aria-label={`Remove ${entry.amount} ml at ${entry.time}`}
                >
                  Remove
                </button>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function ReflectionPage({
  onContents,
  onCover,
  onRecordReflection,
}: {
  onContents: () => void;
  onCover: () => void;
  onRecordReflection: (label: string) => void;
}) {
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [isWriting, setIsWriting] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [entries, setEntries] = useState<ReflectionEntry[]>([]);
  const [customPrompts, setCustomPrompts] = useState<
    Record<
      "weekly" | "monthly",
      Array<{ key: string; title: string; prompt: string }>
    >
  >({ weekly: [], monthly: [] });
  const [promptDraft, setPromptDraft] = useState("");
  const [archiveQuery, setArchiveQuery] = useState("");
  const [selectedArchive, setSelectedArchive] =
    useState<ReflectionEntry | null>(null);
  const [lastSaved, setLastSaved] = useState<ReflectionEntry | null>(null);
  useMongoJournalScope({
    scope: "reflections",
    payload: { entries, customPrompts },
    hydrate: payload => {
      if (Array.isArray(payload.entries))
        setEntries(payload.entries as ReflectionEntry[]);
      if (payload.customPrompts && typeof payload.customPrompts === "object")
        setCustomPrompts(payload.customPrompts as typeof customPrompts);
    },
  });
  const baseFields =
    period === "weekly"
      ? [
          {
            key: "highlights",
            title: "Highlights",
            prompt: "What moments felt meaningful or worth celebrating?",
          },
          {
            key: "challenges",
            title: "Challenges",
            prompt: "What felt difficult, and what support would help?",
          },
          {
            key: "notes",
            title: "Notes",
            prompt: "What did you notice about your energy, rhythm, or needs?",
          },
          {
            key: "intentions",
            title: "Next-week intentions",
            prompt: "What is one gentle intention for the week ahead?",
          },
        ]
      : [
          {
            key: "progress",
            title: "Progress summary",
            prompt: "What moved forward this month?",
          },
          {
            key: "highlights",
            title: "Highlights",
            prompt: "What are you proud of or glad you experienced?",
          },
          {
            key: "lessons",
            title: "Lessons",
            prompt: "What did the month teach you?",
          },
          {
            key: "gratitude",
            title: "Gratitude",
            prompt: "What are you grateful for right now?",
          },
          {
            key: "intentions",
            title: "Next-month intentions",
            prompt: "What intention will guide the month ahead?",
          },
        ];
  const fieldSet = [...baseFields, ...customPrompts[period]];
  const hasDraft = Object.values(draft).some(Boolean);
  const carryForward = reflectionCarryForward(entries);
  const archiveEntries = entries.filter(entry =>
    `${entry.period} ${entry.date} ${Object.values(entry.fields).join(" ")}`
      .toLowerCase()
      .includes(archiveQuery.toLowerCase())
  );
  function saveReflection() {
    if (!hasDraft) return;
    const saved = {
      period,
      date: new Date().toISOString().slice(0, 10),
      fields: draft,
    };
    setEntries(current => saveReflectionEntry(current, saved));
    setLastSaved(saved);
    onRecordReflection(
      `${period === "weekly" ? "Weekly" : "Monthly"} reflection saved`
    );
    setDraft({});
    setIsWriting(false);
  }
  function addPrompt() {
    const prompt = promptDraft.trim();
    if (!prompt) return;
    setCustomPrompts(current => ({
      ...current,
      [period]: [
        ...current[period],
        { key: `custom-${Date.now()}`, title: "Your prompt", prompt },
      ],
    }));
    setPromptDraft("");
  }
  return (
    <section
      className="journal-spread reflection-spread"
      aria-label="Weekly and monthly reflections"
    >
      <div className="spread-page reflection-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <div className="reflection-editorial-copy" aria-hidden="true">
          <p className="reflection-kicker">Mind · reflections</p>
          <div
            id="reflection-title"
            className="reflection-title"
            role="heading"
            aria-level={2}
          >
            <span>Pause.</span>
            <em>Begin again.</em>
          </div>
          <p className="reflection-summary">
            A weekly and monthly place to notice what moved you, what helped,
            and what you want next.
          </p>
          <div className="reflection-history-count">
            <span>{entries.length} saved entries</span>
            <b>{period === "weekly" ? "Weekly ritual" : "Monthly reset"}</b>
          </div>
          <button
            type="button"
            className="ink-button"
            onClick={() => setIsWriting(true)}
          >
            <Plus size={15} /> Write reflection
          </button>
        </div>
      </div>
      <div className="spread-page reflection-prompts">
        <div className="reflection-tabs">
          <button
            className={cn(period === "weekly" && "active")}
            type="button"
            onClick={() => {
              setPeriod("weekly");
              setIsWriting(false);
              setDraft({});
              setLastSaved(null);
            }}
          >
            Weekly
          </button>
          <button
            className={cn(period === "monthly" && "active")}
            type="button"
            onClick={() => {
              setPeriod("monthly");
              setIsWriting(false);
              setDraft({});
              setLastSaved(null);
            }}
          >
            Monthly
          </button>
        </div>
        <div className="reflection-rhythm">
          <span>
            {isWriting
              ? "A draft is open"
              : hasDraft
                ? "Your draft is saved locally"
                : "A quiet moment, when you are ready"}
          </span>
          <b>{period === "weekly" ? "Weekly review" : "Monthly review"}</b>
        </div>
        {period === "monthly" && carryForward.length > 0 && (
          <section className="reflection-carry-forward">
            <div>
              <span>From recent weeks</span>
              <b>{carryForward.length} moments to carry forward</b>
            </div>
            {carryForward.map(item => (
              <p key={item.date}>
                <strong>{item.date}</strong>
                {item.text}
              </p>
            ))}
            {isWriting && (
              <button
                type="button"
                onClick={() =>
                  setDraft(current => ({
                    ...current,
                    progress: [
                      current.progress,
                      ...carryForward.map(item => item.text),
                    ]
                      .filter(Boolean)
                      .join("\n"),
                  }))
                }
              >
                Bring into summary
              </button>
            )}
          </section>
        )}
        {fieldSet.map((field, index) => (
          <div className="prompt structured" key={field.key}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <b>{field.title}</b>
              <p>{field.prompt}</p>
              {isWriting && (
                <textarea
                  value={draft[field.key] || ""}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                  placeholder="Write freely…"
                />
              )}
            </div>
          </div>
        ))}
        <div className="reflection-custom-prompt">
          <label>
            Your own prompt
            <input
              value={promptDraft}
              onChange={event => setPromptDraft(event.target.value)}
              placeholder="A question you want to return to"
            />
          </label>
          <button type="button" onClick={addPrompt}>
            Add prompt
          </button>
        </div>
        {isWriting ? (
          <div className="reflection-actions">
            <button type="button" onClick={() => setIsWriting(false)}>
              Save for later
            </button>
            <Button
              className="ink-button"
              type="button"
              onClick={saveReflection}
            >
              Save {period} reflection
            </Button>
          </div>
        ) : (
          <button
            className="ink-button"
            type="button"
            onClick={() => {
              setIsWriting(true);
              setLastSaved(null);
            }}
          >
            <NotebookPen size={15} /> {hasDraft ? "Resume" : "Start"} {period}{" "}
            reflection
          </button>
        )}
        {lastSaved && (
          <div className="reflection-complete">
            <b>
              {lastSaved.period === "weekly" ? "Weekly" : "Monthly"} reflection
              saved
            </b>
            <span>
              {Object.values(lastSaved.fields).filter(Boolean).length} prompts
              held for later review.
            </span>
          </div>
        )}
        <section className="reflection-archive">
          <div>
            <span>Reflection archive</span>
            <b>{entries.length} saved</b>
          </div>
          <input
            value={archiveQuery}
            onChange={event => setArchiveQuery(event.target.value)}
            placeholder="Search your reflections"
          />
          {archiveEntries.length === 0 ? (
            <small>
              {entries.length
                ? "No saved reflection matches that search."
                : "Saved reflections will gather here."}
            </small>
          ) : (
            <div className="reflection-archive-list">
              {archiveEntries.map((entry, index) => (
                <button
                  type="button"
                  className={cn(selectedArchive === entry && "active")}
                  onClick={() => setSelectedArchive(entry)}
                  key={`${entry.period}-${entry.date}-${index}`}
                >
                  <b>
                    {entry.period} · {entry.date}
                  </b>
                  <small>
                    {Object.values(entry.fields).find(Boolean) || "Reflection"}
                  </small>
                </button>
              ))}
            </div>
          )}
          {selectedArchive && (
            <article className="reflection-archive-detail">
              <b>
                {selectedArchive.period} · {selectedArchive.date}
              </b>
              {Object.entries(selectedArchive.fields)
                .filter(([, value]) => value)
                .map(([key, value]) => (
                  <small key={key}>
                    <strong>{key.replace(/([A-Z])/g, " $1")}: </strong>
                    {value}
                  </small>
                ))}
            </article>
          )}
        </section>
      </div>
    </section>
  );
}

function IntegrationsPage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  const [consents, setConsents] = useState<
    Record<IntegrationKey, IntegrationConsent>
  >(() => emptyIntegrationConsent());
  useMongoJournalScope({
    scope: "integrations",
    payload: { consents },
    hydrate: payload => {
      if (payload.consents && typeof payload.consents === "object")
        setConsents(current => ({
          ...current,
          ...(payload.consents as Partial<
            Record<IntegrationKey, IntegrationConsent>
          >),
        }));
    },
  });
  const summary = useMemo(
    () => integrationConsentSummary(consents),
    [consents]
  );
  function toggleConsent(key: IntegrationKey) {
    setConsents(current =>
      toggleIntegrationConsent(current, key, new Date().toISOString())
    );
  }
  return (
    <section
      className="journal-spread integrations-spread"
      aria-labelledby="integrations-title"
    >
      <div className="spread-page integrations-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">utilities · integrations</p>
        <h2 id="integrations-title">
          Choose what
          <br />
          <em>stays yours.</em>
        </h2>
        <p className="page-intro">
          A local consent ledger for possible future connections. Record what
          you may want to explore without linking an account or handing over
          credentials.
        </p>
        <div className="integration-safety">
          <HeartPulse size={15} />
          <span>
            Nothing connected · {summary.recorded} local consent
            {summary.recorded === 1 ? "" : "s"} recorded
          </span>
        </div>
      </div>
      <div className="spread-page integrations-page">
        <section className="integration-boundary">
          <div>
            <span>Connection boundary</span>
            <b>Setup only</b>
          </div>
          <p>
            This workspace does not start OAuth, request passwords or tokens,
            read another service, or import records. A future connection would
            require a separate provider, clear permissions, and your
            confirmation.
          </p>
        </section>
        <section
          className="integration-list"
          aria-label="Optional integration setup states"
        >
          {integrationOptions.map(option => {
            const consent = consents[option.key];
            const isRecorded = consent?.state === "consent-recorded";
            return (
              <article
                key={option.key}
                className={cn("integration-card", isRecorded && "is-consented")}
              >
                <div className="integration-card-heading">
                  <div>
                    <span>
                      {isRecorded ? "Local consent recorded" : "Not considered"}
                    </span>
                    <b>{option.title}</b>
                  </div>
                  <button
                    type="button"
                    aria-pressed={isRecorded}
                    onClick={() => toggleConsent(option.key)}
                  >
                    {isRecorded
                      ? "Clear local consent"
                      : "Record local consent"}
                  </button>
                </div>
                <p>{option.note}</p>
                <small>{option.boundary}</small>
                {isRecorded ? (
                  <em>
                    Recorded locally on{" "}
                    {new Date(consent.consentAt).toLocaleString()} · no
                    connection exists.
                  </em>
                ) : null}
              </article>
            );
          })}
        </section>
        <p className="integration-footer-note">
          You can use every journal module without connecting anything. These
          states only help you remember which future options deserve a
          deliberate conversation.
        </p>
      </div>
    </section>
  );
}

function UtilitiesPage({
  onContents,
  onCover,
  onNavigate,
}: {
  onContents: () => void;
  onCover: () => void;
  onNavigate: (destination: View) => void;
}) {
  return (
    <section
      className="journal-spread utilities-spread"
      aria-labelledby="utilities-title"
    >
      <div className="spread-page utilities-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker">shared tools</p>
        <h2 id="utilities-title">
          Quick access,
          <br />
          <em>with purpose.</em>
        </h2>
        <p className="page-intro">
          A quiet index for the tools that support more than one chapter of your
          journal.
        </p>
        <p className="utility-purpose">7 shared tools · one clear way in</p>
      </div>
      <div className="spread-page utility-grid-page">
        <div className="utility-grid-heading">
          <p>Shared index</p>
          <h3>Choose a tool</h3>
          <span>Use these when something crosses chapters.</span>
        </div>
        <div className="utility-grid">
          {utilityItems.map(({ label, note, view }, index) => (
            <button
              type="button"
              key={label}
              className="utility-tile"
              aria-label={`Open ${label}`}
              onClick={() => onNavigate(view)}
            >
              <span className="utility-tile-index">0{index + 1}</span>
              <span className="utility-tile-copy">
                <b>{label}</b>
                <small>{note}</small>
              </span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

const portraitMonthPositions = [
  [74, 132, -12],
  [224, 107, 6],
  [374, 140, 12],
  [112, 263, 9],
  [250, 244, -5],
  [390, 270, 7],
  [76, 405, -10],
  [224, 388, 4],
  [374, 410, -6],
  [118, 532, 5],
  [258, 525, -9],
  [394, 530, 9],
] as const;

function AnnualPortraitPage({
  onContents,
  onCover,
  onRecord,
}: {
  onContents: () => void;
  onCover: () => void;
  onRecord: (activity: Omit<InsightActivity, "id" | "createdAt">) => void;
}) {
  const [portraitYear, setPortraitYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(7);
  const [selectedColor, setSelectedColor] = useState(colorKey[2].value);
  const [theme, setTheme] = useState<(typeof portraitThemes)[number]["id"]>(
    () => {
      const requestedTheme = new URLSearchParams(window.location.search).get(
        "portraitTheme"
      );
      return portraitThemes.some(option => option.id === requestedTheme)
        ? (requestedTheme as (typeof portraitThemes)[number]["id"])
        : "undersea";
    }
  );
  const [fills, setFills] = useState<Record<string, string>>({
    "7-2": "#d238a4",
    "7-4": "#1987b9",
    "7-7": "#f1b633",
  });
  const [lastFills, setLastFills] = useState<Record<string, string> | null>(
    null
  );
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [startOffset, setStartOffset] = useState({ x: 0, y: 0 });
  const portraitMonths = useMemo(
    () => portraitMonthsForYear(portraitYear),
    [portraitYear]
  );
  const [monthName, daysInMonth] = portraitMonths[selectedMonth];

  function updateFill(monthIndex: number, day: number) {
    const key = `${monthIndex}-${day}`;
    const monthName = portraitMonths[monthIndex]?.[0] || "Portrait";
    setLastFills(fills);
    setFills(current =>
      toggleAnnualSlotFill(current, monthIndex, day, selectedColor)
    );
    onRecord({
      module: "Portrait",
      amount: 1,
      label: `${monthName} ${day} ${fills[key] ? "cleared" : "filled"}`,
    });
  }

  function beginPan(event: React.PointerEvent<HTMLDivElement>) {
    setIsDragging(true);
    setStartPoint({ x: event.clientX, y: event.clientY });
    setStartOffset(offset);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function continuePan(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    setOffset({
      x: startOffset.x + (event.clientX - startPoint.x) / scale,
      y: startOffset.y + (event.clientY - startPoint.y) / scale,
    });
  }

  return (
    <section
      className="journal-spread annual-portrait-spread"
      aria-labelledby="portrait-title"
    >
      <div className="spread-page portrait-copy-page">
        <JournalActions onContents={onContents} onCover={onCover} />
        <div className="portrait-editorial-surface">
          <p className="page-kicker">fitness · annual portrait</p>
          <h2 id="portrait-title">
            A year of
            <br />
            <em>movement</em>
          </h2>
          <p className="page-intro">
            All twelve months live inside one painted world. Select a year,
            choose your movement colour, then fill or clear any dated slot.
          </p>
          <button
            type="button"
            className="ink-button"
            onClick={() => setTheme(portraitThemes[0].id)}
          >
            <Plus size={15} /> Create portrait
          </button>
          <div className="portrait-year-select">
            <span>Portrait year</span>
            <button
              type="button"
              onClick={() => setPortraitYear(year => year - 1)}
              aria-label="Previous portrait year"
            >
              −
            </button>
            <b>{portraitYear}</b>
            <button
              type="button"
              onClick={() => setPortraitYear(year => year + 1)}
              aria-label="Next portrait year"
            >
              +
            </button>
          </div>
          <div className="portrait-theme-selector" aria-label="Portrait theme">
            {portraitThemes.map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => setTheme(option.id)}
                className={cn(theme === option.id && "selected")}
              >
                <b>{option.label}</b>
                <small>{option.note}</small>
              </button>
            ))}
          </div>
          <div className="color-key" aria-label="Workout colour key">
            {colorKey.map(color => (
              <button
                type="button"
                key={color.value}
                onClick={() => setSelectedColor(color.value)}
                className={cn(selectedColor === color.value && "selected")}
              >
                <i style={{ background: color.value }} />
                <span>{color.name}</span>
              </button>
            ))}
          </div>
          <div className="portrait-tools">
            <button
              type="button"
              onClick={() => {
                setLastFills(fills);
                setFills({});
              }}
            >
              Clear year
            </button>
            <button
              type="button"
              onClick={() =>
                updateFill(
                  selectedMonth,
                  new Date().getDate() > daysInMonth
                    ? daysInMonth
                    : new Date().getDate()
                )
              }
            >
              Log today <ArrowRight size={14} />
            </button>
            {lastFills ? (
              <button
                type="button"
                className="local-undo"
                onClick={() => {
                  setFills(lastFills);
                  setLastFills(null);
                }}
              >
                Undo last
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <div className="spread-page annual-canvas-page">
        <PixelsGrid tracker="movement" />
        <FitnessOverview onRecord={onRecord} />
        <div className="canvas-toolbar">
          <span>
            {monthName} · {daysInMonth} days
          </span>
          <div>
            <button
              type="button"
              onClick={() => setScale(value => Math.max(0.75, value - 0.15))}
              aria-label="Zoom out"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => setScale(value => Math.min(1.55, value + 0.15))}
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => {
                setScale(1);
                setOffset({ x: 0, y: 0 });
              }}
              aria-label="Reset portrait view"
            >
              Reset
            </button>
          </div>
        </div>
        <div className="annual-portrait-viewport">
          <div
            className={cn("annual-portrait-canvas", `theme-${theme}`)}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            }}
            onPointerDown={beginPan}
            onPointerMove={continuePan}
            onPointerUp={() => setIsDragging(false)}
            onPointerCancel={() => setIsDragging(false)}
          >
            <div className="annual-canvas-title">
              <span>{portraitYear} movement story</span>
              <b>drag to explore</b>
            </div>
            <svg
              className="annual-scene-svg"
              viewBox="0 0 500 640"
              role="img"
              aria-label={`${portraitThemes.find(option => option.id === theme)?.label} annual movement portrait with all twelve monthly daily regions`}
            >
              <PortraitSceneBackdrop theme={theme} />
              {portraitMonths.map(([name, dayCount], monthIndex) => (
                <AnnualMonthObject
                  key={name}
                  name={name}
                  dayCount={dayCount}
                  monthIndex={monthIndex}
                  theme={theme}
                  position={portraitMonthPositions[monthIndex]!}
                  isSelected={selectedMonth === monthIndex}
                  fills={fills}
                  onSelect={() => setSelectedMonth(monthIndex)}
                  onFill={day => updateFill(monthIndex, day)}
                />
              ))}
            </svg>
          </div>
        </div>
        <div className="selected-month-detail">
          <div>
            <p>
              {monthName} {portraitYear} · {daysInMonth} exact daily regions
            </p>
            <b>Tap a coloured scene mark to fill or clear it</b>
            <small>
              Each small shell, bloom, or feather-mark represents one dated day;
              the selected colour fills that bounded illustration region.
            </small>
          </div>
        </div>
      </div>
    </section>
  );
}

function FitnessOverview({
  onRecord,
}: {
  onRecord: (activity: Omit<InsightActivity, "id" | "createdAt">) => void;
}) {
  const [focus, setFocus] = useState("Mobility");
  const [time, setTime] = useState("18 min");
  const [recovery, setRecovery] = useState("Steady");
  const [minutes, setMinutes] = useState(38);
  const [workouts, setWorkouts] = useState(2);
  const [note, setNote] = useState("");
  const recommendation =
    focus === "Strength"
      ? "Glute bridge + side plank foundation"
      : focus === "Core"
        ? "Bicycle crunches + side plank reach"
        : "Gentle mobility and lower-body flow";
  function logSession() {
    const addedMinutes = Number.parseInt(time, 10) || 15;
    setMinutes(value => value + addedMinutes);
    setWorkouts(value => value + 1);
    onRecord({
      module: "Portrait",
      amount: 1,
      label: `${focus} session logged · ${addedMinutes} min${note ? ` · ${note}` : ""}`,
    });
    setNote("");
  }
  return (
    <section className="fitness-overview" aria-label="Fitness overview">
      <div className="fitness-overview-heading">
        <span>Fitness overview</span>
        <b>This week</b>
      </div>
      <div className="fitness-summary">
        <article>
          <b>{minutes}</b>
          <small>movement min</small>
        </article>
        <article>
          <b>{workouts}</b>
          <small>workouts</small>
        </article>
        <article>
          <b>{recovery}</b>
          <small>recovery</small>
        </article>
      </div>
      <div className="fitness-progress">
        <span>Weekly movement goal</span>
        <b>{workouts}/3 sessions</b>
        <i>
          <em style={{ width: `${Math.min(100, (workouts / 3) * 100)}%` }} />
        </i>
        <small>
          {workouts >= 3
            ? "Weekly movement milestone reached."
            : `${3 - workouts} session${3 - workouts === 1 ? "" : "s"} to the next milestone.`}
        </small>
      </div>
      <div className="fitness-plan">
        <label>
          Focus
          <select
            value={focus}
            onChange={event => setFocus(event.target.value)}
          >
            <option>Mobility</option>
            <option>Strength</option>
            <option>Core</option>
          </select>
        </label>
        <label>
          Time
          <select value={time} onChange={event => setTime(event.target.value)}>
            <option>10 min</option>
            <option>18 min</option>
            <option>30 min</option>
          </select>
        </label>
      </div>
      <div className="fitness-recovery">
        <span>How does recovery feel?</span>
        <div>
          {["Low", "Steady", "Energised"].map(option => (
            <button
              type="button"
              key={option}
              onClick={() => setRecovery(option)}
              className={cn(recovery === option && "selected")}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <div className="fitness-recommendation">
        <span>Today’s suggestion</span>
        <b>{recommendation}</b>
        <small>
          Start with 2 minutes of easy warm-up; choose a lower-impact option if
          you need one.
        </small>
      </div>
      <label className="fitness-note">
        Session note
        <input
          value={note}
          onChange={event => setNote(event.target.value)}
          placeholder="Energy, comfort, or a small win"
        />
      </label>
      <button type="button" className="fitness-log-button" onClick={logSession}>
        <Dumbbell size={15} /> Log this session
      </button>
    </section>
  );
}

function PortraitSceneBackdrop({
  theme,
}: {
  theme: (typeof portraitThemes)[number]["id"];
}) {
  if (theme === "undersea")
    return (
      <>
        <defs>
          <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#0f235d" />
            <stop offset=".58" stopColor="#116b91" />
            <stop offset="1" stopColor="#142451" />
          </linearGradient>
          <radialGradient id="shell" cx="45%" cy="35%">
            <stop stopColor="#f2c7df" />
            <stop offset=".65" stopColor="#c55d9c" />
            <stop offset="1" stopColor="#522852" />
          </radialGradient>
        </defs>
        <rect width="500" height="640" fill="url(#sea)" />
        <path
          d="M0 80 C100 40 150 122 255 78 S410 40 500 88V0H0Z"
          fill="#7ad2df"
          opacity=".2"
        />
        <path
          d="M0 530 C100 480 172 560 276 510 S405 492 500 540V640H0Z"
          fill="#1e436c"
        />
        <path
          d="M22 610 C58 515 32 500 70 433 M455 608 C428 532 472 492 430 435 M76 630 C126 566 102 535 143 472"
          fill="none"
          stroke="#f18cba"
          strokeWidth="8"
          opacity=".72"
        />
        <path
          d="M16 618 C46 540 72 555 90 480 M460 616 C440 552 398 562 384 489"
          fill="none"
          stroke="#e5b44f"
          strokeWidth="5"
          opacity=".75"
        />
        <circle cx="250" cy="565" r="42" fill="#e16aa7" opacity=".78" />
        <path
          d="M250 526 C226 491 218 448 232 409 M250 526 C273 490 287 449 270 406"
          fill="none"
          stroke="#f8d4e8"
          strokeWidth="6"
          strokeLinecap="round"
          opacity=".82"
        />
        <circle cx="250" cy="380" r="22" fill="#e6b2cd" opacity=".83" />
      </>
    );
  if (theme === "nocturne")
    return (
      <>
        <defs>
          <linearGradient id="night" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#17153d" />
            <stop offset=".55" stopColor="#3d286d" />
            <stop offset="1" stopColor="#201948" />
          </linearGradient>
          <radialGradient id="moon" cx="35%" cy="32%">
            <stop stopColor="#fff7bd" />
            <stop offset="1" stopColor="#d7ad5e" />
          </radialGradient>
        </defs>
        <rect width="500" height="640" fill="url(#night)" />
        <circle cx="375" cy="86" r="58" fill="url(#moon)" opacity=".96" />
        <g fill="#fff8c8" opacity=".85">
          <circle cx="44" cy="62" r="2" />
          <circle cx="124" cy="126" r="2" />
          <circle cx="198" cy="46" r="3" />
          <circle cx="288" cy="96" r="2" />
          <circle cx="452" cy="190" r="2" />
          <circle cx="55" cy="325" r="2" />
          <circle cx="447" cy="388" r="3" />
        </g>
        <path
          d="M0 570 C72 508 122 584 188 530 S314 560 394 516 S454 521 500 492V640H0Z"
          fill="#16113a"
        />
        <path
          d="M22 624 C45 531 98 550 122 456 M452 630 C428 548 383 566 356 462 M120 637 C150 575 198 544 228 464"
          fill="none"
          stroke="#8493dd"
          strokeWidth="5"
          opacity=".75"
        />
        <path
          d="M260 627 C254 545 282 501 315 456"
          fill="none"
          stroke="#d768b0"
          strokeWidth="6"
          opacity=".7"
        />
      </>
    );
  return (
    <>
      <defs>
        <linearGradient id="peacock-sky" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#143b67" />
          <stop offset=".58" stopColor="#275e79" />
          <stop offset="1" stopColor="#30205f" />
        </linearGradient>
        <radialGradient id="feather-eye">
          <stop stopColor="#f5d353" />
          <stop offset=".35" stopColor="#d05ea7" />
          <stop offset=".67" stopColor="#266ba1" />
          <stop offset="1" stopColor="#182c66" />
        </radialGradient>
      </defs>
      <rect width="500" height="640" fill="url(#peacock-sky)" />
      <path
        d="M250 620 C160 530 130 350 190 198 C228 102 273 96 315 191 C375 337 344 535 250 620Z"
        fill="#1a7d86"
        opacity=".86"
      />
      <path
        d="M250 612 C222 520 219 398 250 294 C281 398 278 520 250 612Z"
        fill="#23335d"
      />
      <circle cx="250" cy="262" r="49" fill="url(#feather-eye)" opacity=".96" />
      <path
        d="M14 601 C88 532 111 570 155 462 M486 601 C412 532 389 570 345 462 M27 424 C82 374 97 302 116 240 M474 424 C418 374 403 302 384 240"
        fill="none"
        stroke="#51c9bf"
        strokeWidth="10"
        opacity=".62"
      />
      <path
        d="M0 570 C94 536 162 602 251 564 S398 541 500 578V640H0Z"
        fill="#221943"
        opacity=".86"
      />
    </>
  );
}

function monthBodyPath(theme: (typeof portraitThemes)[number]["id"]) {
  if (theme === "undersea")
    return "M50 5 C88 7 96 31 94 59 C92 91 74 108 50 113 C26 108 8 91 6 59 C4 31 12 7 50 5Z";
  if (theme === "nocturne")
    return "M50 4 C64 23 83 15 93 35 C96 55 79 66 92 87 C75 99 65 95 50 112 C35 95 25 99 8 87 C21 66 4 55 7 35 C17 15 36 23 50 4Z";
  return "M50 3 C89 20 95 76 50 114 C5 76 11 20 50 3Z";
}

function AnnualMonthObject({
  name,
  dayCount,
  monthIndex,
  theme,
  position,
  isSelected,
  fills,
  onSelect,
  onFill,
}: {
  name: string;
  dayCount: number;
  monthIndex: number;
  theme: (typeof portraitThemes)[number]["id"];
  position: readonly [number, number, number];
  isSelected: boolean;
  fills: Record<string, string>;
  onSelect: () => void;
  onFill: (day: number) => void;
}) {
  const [x, y, rotation] = position;
  const anchors = portraitDayAnchors(theme);
  return (
    <g
      className={cn(
        "annual-month-illustration",
        `illustration-${theme}`,
        isSelected && "selected"
      )}
      transform={`translate(${x - 50} ${y - 58}) rotate(${rotation} 50 58)`}
      role="group"
      aria-label={`${name}, ${dayCount} daily regions`}
      onClick={onSelect}
    >
      <path className="month-body" d={monthBodyPath(theme)} />
      {theme === "undersea" && (
        <>
          {[20, 34, 50, 66, 80].map(xPosition => (
            <path
              key={xPosition}
              className="shell-ridge"
              d={`M50 9 Q${xPosition} 48 ${xPosition} 96`}
            />
          ))}
          <circle className="shell-pearl" cx="50" cy="21" r="6" />
        </>
      )}
      {theme === "nocturne" && (
        <>
          <circle className="bloom-core" cx="50" cy="58" r="13" />
          {[0, 72, 144, 216, 288].map(rotationAngle => (
            <path
              key={rotationAngle}
              className="bloom-vein"
              transform={`rotate(${rotationAngle} 50 58)`}
              d="M50 11 Q56 35 50 52"
            />
          ))}
        </>
      )}
      {theme === "peacock" && (
        <>
          <ellipse className="feather-eye" cx="50" cy="34" rx="17" ry="21" />
          <path className="feather-spine" d="M50 9 L50 105" />
        </>
      )}
      <text x="50" y="101" textAnchor="middle" className="month-label">
        {name.slice(0, 3)}
      </text>
      <g className="daily-region-group">
        {anchors.slice(0, dayCount).map((_, index) => {
          const day = index + 1;
          const region = portraitDayRegion(theme, monthIndex, day)!;
          return (
            <path
              key={region.key}
              d={region.path}
              fill={fills[region.key] || "rgba(255,255,255,.24)"}
              onPointerDown={event => event.stopPropagation()}
              onClick={event => {
                event.stopPropagation();
                onSelect();
                onFill(day);
              }}
              onKeyDown={event => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect();
                  onFill(day);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`${name} ${day}, ${fills[region.key] ? "filled" : "unfilled"}`}
            />
          );
        })}
      </g>
    </g>
  );
}
