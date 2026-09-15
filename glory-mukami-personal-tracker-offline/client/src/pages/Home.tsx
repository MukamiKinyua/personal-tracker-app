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
  Search,
  Sparkles,
  Star,
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
import { SettingsPanel } from "@/components/SettingsPanel";
import { DayPlanner } from "@/components/DayPlanner";
import { WorkoutStudio } from "@/components/WorkoutStudio";
import { apiUrl, authHeaders } from "@/lib/api";
import { useRecordStore } from "@/contexts/RecordStoreContext";
import type { AnyRecord } from "@/lib/core/recordStore";
import { toCSV } from "@/lib/core/exportData";
import { eraseLocalJournalData } from "@/lib/core/storage";
import { localCalendarDay, shiftDayKey } from "@/lib/core/datetime";
import {
  computeStreak,
  isDueOn,
  type HabitDayState,
  type Schedule as HabitSchedule,
} from "@/lib/core/streaks";
import { suggestMeals } from "@/lib/core/mealMemory";
import { fromMeal, fromMealMessage } from "@/lib/core/grocery";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useMongoJournalScope } from "../hooks/useMongoJournalScope";
import {
  pageTurnDestinationClass,
  pageTurnDuration,
} from "../lib/journalMotion";
import { portraitDayAnchors, portraitDayRegion } from "../lib/portraitScene";
import {
  migratePixelRecords,
  pixelsCellKey,
  pixelsDaysInMonth,
  pixelsMonthNames,
  pixelsMonths,
  setPixelCell,
  type PixelCells,
  updatePixelCell,
} from "../lib/pixelsTracker";
import {
  formatSleepDuration,
  sleepDateInputValue,
  sleepDurationBand,
  sleepDurationCheck,
  sleepDurationHours,
  sleepNightStart,
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
  assignmentDueDetail,
  assignmentWorkload,
  sortAssignments,
  sortAssignmentsByDue,
  type AssignmentSort,
  type AssignmentPlan,
} from "../lib/assignmentTracker";
import {
  nextAcademicItem,
  standingDetail,
  weeklyRevisionMinutes,
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
  cashFlowCsv,
  cashFlowSummary,
  cashOutByCategory,
  entriesForPeriod,
  formatMoney,
  periodLabel,
  periodWindowDescription,
  roundMoney,
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
  type GoalWorkspaceRecord,
} from "../lib/goalTracker";
import {
  appendSecurityReviewLog,
  nextSecurityReviewDate,
  securityReviewStatus,
  securityReviewSummary,
} from "../lib/securityTracker";
import {
  compareLocalActivitySources,
  activityCoverage,
  analyticsCsv,
  descriptiveActivityTrend,
  filterAnalyticsActivityByPeriod,
  localActivitySummary,
  localPixelSummary,
  periodDays,
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
  practiceProgress,
  practiceTotals,
  type PracticeMilestone,
  activePageAfterNavigation,
  estimateCycle,
  formatHistoryActivityMetric,
  portraitMonthsForYear,
  reflectionCarryForward,
  resolveJournalView,
  saveReflectionEntry,
  toggleAnnualSlotFill,
  toggleQuickAddVisibility,
  journalViews,
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

const allContentsItems = groups.flatMap(group =>
  group.items.map(item => ({ ...item, groupLabel: group.label }))
);

function findContentsItem(view: View) {
  return allContentsItems.find(item => item.view === view);
}

function contentsGroupsMatchingSearch(query: string): ContentsGroup[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return groups;
  return groups
    .map(group => ({
      ...group,
      items: group.items.filter(
        item =>
          item.label.toLowerCase().includes(normalized) ||
          item.note.toLowerCase().includes(normalized) ||
          group.label.toLowerCase().includes(normalized)
      ),
    }))
    .filter(group => group.items.length > 0);
}

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
    source:
      "A day fills in as “Session logged” when you save a Workout Studio note. Strength, Mobility and Rest are set by hand here.",
    statuses: [
      { label: "Session logged", color: "#06b6d4" },
      { label: "Strength", color: "#d94889" },
      { label: "Mobility", color: "#29a8ad" },
      { label: "Rest", color: "#efb93d" },
    ],
  },
  mood: {
    title: "Check-in Pixels",
    eyebrow: "wellbeing · daily check-in",
    source:
      "Days fill in with the word you chose at check-in, or by hand here. The colours are just labels — there is no good end or bad end.",
    statuses: [
      { label: "Low", color: "#e6ae42" },
      { label: "Tender", color: "#9673c6" },
      { label: "Steady", color: "#3a9ba0" },
      { label: "Bright", color: "#e65c97" },
      { label: "Joyful", color: "#e35d48" },
    ],
  },
  water: {
    title: "Hydration Pixels",
    eyebrow: "water · daily rhythm",
    source: "Days fill in when you log water, or by hand here.",
    statuses: [
      { label: "Goal met", color: "#32a7cf" },
      { label: "Some water", color: "#8fd4e7" },
      { label: "Gentle reminder", color: "#f0bd5d" },
    ],
  },
  nutrition: {
    title: "Nourishment Pixels",
    eyebrow: "nutrition · meal rhythm",
    source:
      "A day fills in as “Meal noted” when you log a meal. The other keys are optional notes you add by hand — none of them is a score.",
    statuses: [
      { label: "Meal noted", color: "#ec4899" },
      { label: "Fruit / veg", color: "#e35d48" },
      { label: "Comfort", color: "#d34c93" },
      { label: "Something new", color: "#249a9e" },
    ],
  },
  sleep: {
    title: "Rest Pixels",
    eyebrow: "sleep · hours per night",
    source: "Days fill in when you log a night's sleep, or by hand here.",
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
    source: "Days fill in from your habit check-ins, or by hand here.",
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
    source: "Days fill in when you finish a focus session, or by hand here.",
    statuses: [
      { label: "Deep focus", color: "#5b63b9" },
      { label: "Gentle focus", color: "#d64496" },
      { label: "Reset", color: "#e9b640" },
    ],
  },
  learning: {
    title: "Practice Pixels",
    eyebrow: "learning · skill rhythm",
    source: "Days fill in when you log practice, or by hand here.",
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
  describeDay,
}: {
  tracker: PixelsProfileKey;
  inkText?: boolean;
  /** The entry behind a cell, for its label and tooltip — so a colour is
   * never the only way to find out what a day held. */
  describeDay?: (monthIndex: number, day: number) => string | undefined;
}) {
  const store = useContext(PixelsTrackerContext);
  if (!store) return null;
  const profile = pixelsProfiles[tracker];
  const [selectedColor, setSelectedColor] = useState<string>(
    profile.statuses[0].color
  );
  const cells = store.records[tracker] || {};
  const statusByColor = useMemo(
    () =>
      new Map<string, PixelsStatus>(
        profile.statuses.map(status => [status.color as string, status])
      ),
    [profile]
  );
  const { countsByStatus, unlabelledCount } = useMemo(() => {
    const counts = new Map<string, number>();
    let unlabelled = 0;
    for (const color of Object.values(cells)) {
      const status = statusByColor.get(color);
      if (!status) {
        unlabelled += 1;
        continue;
      }
      counts.set(status.label, (counts.get(status.label) ?? 0) + 1);
    }
    return { countsByStatus: counts, unlabelledCount: unlabelled };
  }, [cells, statusByColor]);
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
      <p style={textStyle} className="pixels-summary">
        {Object.keys(cells).length === 0
          ? "Nothing logged yet — every day starts blank."
          : [
              ...profile.statuses.map(
                status =>
                  `${countsByStatus.get(status.label) ?? 0} ${status.label}`
              ),
              ...(unlabelledCount > 0
                ? [`${unlabelledCount} marked with a retired colour`]
                : []),
            ].join(" · ")}
      </p>
      <div className="pixels-key" aria-label={`${profile.title} status key`}>
        {profile.statuses.map((status: PixelsStatus) => (
          <button
            type="button"
            style={textStyle}
            className={cn(selectedColor === status.color && "selected")}
            onClick={() => setSelectedColor(status.color)}
            key={status.label}
            aria-pressed={selectedColor === status.color}
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
            <span
              style={textStyle}
              key={`${month}-${monthIndex}`}
              title={pixelsMonthNames[monthIndex]}
            >
              {month}
            </span>
          ))}
        </div>
        {Array.from({ length: 31 }, (_, index) => index + 1).map(day => (
          <div className="pixels-day-row" role="row" key={day}>
            <b style={textStyle}>{day}</b>
            {pixelsMonths.map((_month, monthIndex) => {
              if (day > pixelsDaysInMonth(monthIndex)) {
                return (
                  <span
                    aria-hidden="true"
                    className="pixels-day-empty"
                    key={`${monthIndex}-${day}`}
                  />
                );
              }
              const key = pixelsCellKey(monthIndex, day);
              const fill = cells[key];
              const status = fill ? statusByColor.get(fill) : undefined;
              const fullMonth = pixelsMonthNames[monthIndex];
              const detail = fill ? describeDay?.(monthIndex, day) : undefined;
              const label = status
                ? `${fullMonth} ${day}, ${status.label} logged${detail ? ` — ${detail}` : ""}`
                : fill
                  ? `${fullMonth} ${day}, logged with a retired colour — tap to relabel`
                  : `${fullMonth} ${day}, not logged`;
              return (
                <button
                  type="button"
                  role="gridcell"
                  key={`${monthIndex}-${day}`}
                  aria-label={label}
                  title={label}
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
        clear it. {profile.source}
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
/**
 * Activity saved before createdAt was an instant holds "Sep 13"-style
 * strings, and some rows have no recordedOn at all. Rebuild whichever half
 * is missing from the other — createdAt from the recorded day so sorting
 * and formatting work, recordedOn from the instant's local day so the
 * period filters (which read recordedOn only) stop dropping the row. An
 * existing recordedOn is left as it is: a day off in old data is better
 * than a guessed correction.
 */
function normalizeInsightActivity(records: InsightActivity[]): InsightActivity[] {
  return records.map(record => {
    const isInstant = /^\d{4}-\d{2}-\d{2}T/.test(record.createdAt);
    const hasDay =
      typeof record.recordedOn === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(record.recordedOn);
    if (isInstant && hasDay) return record;
    if (isInstant) {
      const at = new Date(record.createdAt);
      return Number.isNaN(at.getTime())
        ? record
        : { ...record, recordedOn: localCalendarDay(at) };
    }
    return hasDay
      ? { ...record, createdAt: `${record.recordedOn}T12:00:00.000Z` }
      : record;
  });
}

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
    favorites?: View[];
    recentPages?: View[];
  };
};
const ReminderPreviewContext = createContext("Hide sensitive names");

// Annotated as View[] (not Exclude<View, "cover" | "contents">[]) so it can
// still be searched with a plain View, e.g. `chapterViews.indexOf(nav.view)`
// when nav.view happens to be "cover" or "contents" — TS would otherwise
// auto-narrow the filtered array's element type and reject that lookup.
const chapterViews: View[] = journalViews.filter(
  candidate => candidate !== "cover" && candidate !== "contents"
);

const JournalNavContext = createContext<{
  view: View;
  turnTo: (nextView: View, direction?: TurnDirection) => void;
} | null>(null);

/**
 * Carry across the live state cloneNode leaves behind, so a copy of a page
 * looks like the page did at that instant and not like a fresh render of
 * it: scroll offsets, what has been typed into fields, and canvas bitmaps.
 * The copy must already be in the document - scroll offsets need layout.
 */
function syncLiveState(source: Element, copy: Element) {
  const originals = [source, ...Array.from(source.querySelectorAll("*"))];
  const twins = [copy, ...Array.from(copy.querySelectorAll("*"))];
  if (originals.length !== twins.length) return;
  originals.forEach((original, index) => {
    const twin = twins[index];
    if (original.scrollTop || original.scrollLeft) {
      twin.scrollTop = original.scrollTop;
      twin.scrollLeft = original.scrollLeft;
    }
    if (
      original instanceof HTMLInputElement &&
      twin instanceof HTMLInputElement
    ) {
      twin.value = original.value;
      twin.checked = original.checked;
    } else if (
      (original instanceof HTMLTextAreaElement &&
        twin instanceof HTMLTextAreaElement) ||
      (original instanceof HTMLSelectElement &&
        twin instanceof HTMLSelectElement)
    ) {
      twin.value = original.value;
    } else if (
      original instanceof HTMLCanvasElement &&
      twin instanceof HTMLCanvasElement
    ) {
      twin.getContext("2d")?.drawImage(original, 0, 0);
    }
  });
  // Looping CSS animations (the cover art's slow drift) restart from zero on
  // a fresh clone; put the copy's clocks where the originals' are.
  const sourceAnimations = source.getAnimations({ subtree: true });
  copy.getAnimations({ subtree: true }).forEach((animation, index) => {
    const twin = sourceAnimations[index];
    if (twin) animation.currentTime = twin.currentTime;
  });
}

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

function JournalActions({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  const nav = useContext(JournalNavContext);
  const chapterIndex = nav ? chapterViews.indexOf(nav.view) : -1;
  const previousView = chapterIndex > 0 ? chapterViews[chapterIndex - 1] : null;
  const nextView =
    chapterIndex >= 0 && chapterIndex < chapterViews.length - 1
      ? chapterViews[chapterIndex + 1]
      : null;

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
      {chapterIndex >= 0 && (
        <>
          <button
            className="journal-action journal-action-prev"
            type="button"
            disabled={!previousView}
            onClick={() => previousView && nav?.turnTo(previousView, "backward")}
            aria-label="Previous chapter"
          >
            <ArrowLeft size={14} />
          </button>
          <span className="journal-action-chapter">
            {chapterIndex + 1} / {chapterViews.length}
          </span>
          <button
            className="journal-action journal-action-next"
            type="button"
            disabled={!nextView}
            onClick={() => nextView && nav?.turnTo(nextView)}
            aria-label="Next chapter"
          >
            <ArrowRight size={14} />
          </button>
        </>
      )}
    </div>
  );
}

/**
 * The dashboard's cards, computed from what the journal actually holds.
 * Every line either comes from a saved record or says that nothing is saved
 * yet; nothing here is invented, scored, or predicted.
 */
function DashboardCards({
  activity,
  ownerKey,
  privateMode,
  showSensitiveSummaries,
  onOpen,
}: {
  activity: InsightActivity[];
  ownerKey: string;
  privateMode: boolean;
  showSensitiveSummaries: boolean;
  onOpen: (view: View) => void;
}) {
  const journal = useRecordStore();
  const today = journal.today;
  const localToday = localCalendarDay(new Date());
  const masked = privateMode || !showSensitiveSummaries;

  function readScope<T>(scope: string): T | null {
    try {
      const raw = window.localStorage.getItem(
        `glory-personal-tracker:${scope}:${ownerKey}`
      );
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  // What needs attention: open assignments by due date, plus today's open tasks.
  const assignments = (
    readScope<{ assignments?: AssignmentPlan[] }>("assignments")?.assignments ??
    []
  ).filter(item => !item.completed);
  const dueSoon = sortAssignments(assignments, "due")
    .map(item => ({ item, due: assignmentDueDetail(item.due, localToday) }))
    .filter(({ due }) => due.kind !== "none")
    .slice(0, 2);
  const openTasksToday = journal
    .inScope("task")
    .filter(
      record => record.body.when === "today" && !record.body.done
    ).length;

  // How you are doing: the latest check-in, in the user's own words.
  const checkIns =
    readScope<{ entries?: MoodEntry[] }>("wellbeing")?.entries ?? [];
  const latestCheckIn = [...checkIns].sort((a, b) =>
    b.date.localeCompare(a.date)
  )[0];

  // Toward your goals: active goals with milestone-derived progress.
  const goals = (
    readScope<{ goals?: GoalWorkspaceRecord[] }>("goals")?.goals ?? []
  ).filter(goal => goal.state === "active");
  const goalLines = goals.slice(0, 2).map(goal => ({
    title: goal.title,
    percent: factualGoalProgress(goal.milestones, goal.manualProgress),
    fromMilestones: goal.milestones.length > 0,
  }));

  // What's changing: saved actions this 7 days vs the 7 before, and sleep.
  const trend = descriptiveActivityTrend(activity);
  const weekAgo = shiftDayKey(today, -6);
  const twoWeeksAgo = shiftDayKey(today, -13);
  const nightHours = (records: AnyRecord[]) =>
    records
      .map(record => Number(record.body.hours))
      .filter(value => Number.isFinite(value) && value > 0);
  const thisWeekNights = nightHours(journal.between("sleep", weekAgo, today));
  const lastWeekNights = nightHours(
    journal.between("sleep", twoWeeksAgo, shiftDayKey(weekAgo, -1))
  );
  const average = (values: number[]) =>
    values.reduce((total, value) => total + value, 0) / values.length;
  const sleepDelta =
    thisWeekNights.length >= 3 && lastWeekNights.length >= 3
      ? Math.round((average(thisWeekNights) - average(lastWeekNights)) * 60)
      : null;

  const savedToday = activity.filter(
    record => record.recordedOn === localToday
  ).length;
  const savedThisWeek = activity.filter(
    record => record.recordedOn && record.recordedOn >= weekAgo
  ).length;

  // Next best step: the nearest deadline's next action, else a goal's, else
  // a plain suggestion — and it says which.
  const nextStep = dueSoon[0]
    ? {
        title: dueSoon[0].item.nextAction || `Open ${dueSoon[0].item.title}`,
        why: `${dueSoon[0].item.title} is ${dueSoon[0].due.label.toLowerCase()}.`,
        view: "assignments" as View,
        label: "Open assignments",
      }
    : goals[0]
      ? {
          title: (goals[0] as GoalWorkspaceRecord & { nextAction?: string })
            .nextAction || `Move “${goals[0].title}” one step`,
          why: "From your active goals.",
          view: "goals" as View,
          label: "Open goals",
        }
      : {
          title: "Choose one small task for today.",
          why: "Nothing is due and no goal is active, so today is yours to shape.",
          view: "tasks" as View,
          label: "Open tasks",
        };

  return (
    <>
      <div className="dashboard-grid">
        <article className="dashboard-card attention-card">
          <span className="card-label">what needs attention</span>
          {dueSoon.length === 0 && openTasksToday === 0 ? (
            <div className="attention-row">
              <span className="priority-dot gold" aria-hidden="true" />
              <div>
                <b>Nothing due</b>
                <small>No open assignment has a date, and no task is set for today.</small>
              </div>
            </div>
          ) : null}
          {dueSoon.map(({ item, due }) => (
            <button
              type="button"
              className="attention-row"
              key={item.id}
              onClick={() => onOpen("assignments")}
            >
              <span
                className={cn(
                  "priority-dot",
                  due.kind === "overdue" || due.kind === "today"
                    ? "magenta"
                    : "gold"
                )}
                aria-hidden="true"
              />
              <div>
                <b>{item.title}</b>
                <small>
                  {due.label} · {due.exact}
                </small>
              </div>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          ))}
          {openTasksToday > 0 ? (
            <button
              type="button"
              className="attention-row"
              onClick={() => onOpen("tasks")}
            >
              <span className="priority-dot gold" aria-hidden="true" />
              <div>
                <b>
                  {openTasksToday} task{openTasksToday === 1 ? "" : "s"} for
                  today
                </b>
                <small>Open in Tasks</small>
              </div>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          ) : null}
        </article>
        <article className="dashboard-card wellbeing-card">
          <span className="card-label">how you are doing</span>
          {masked ? (
            <div className="dashboard-private-mask">
              <HeartPulse size={20} aria-hidden="true" />
              <b>Sensitive summary hidden</b>
              <small>Open Privacy Controls to change this display choice.</small>
            </div>
          ) : latestCheckIn ? (
            <>
              <div className="wellbeing-orbit">
                <span className="orbit-orb one" aria-hidden="true" />
                <span className="orbit-orb two" aria-hidden="true" />
                <span className="wellbeing-score">
                  {latestCheckIn.mood}
                  <small>energy {latestCheckIn.energy}/5</small>
                </span>
              </div>
              <p>
                Your last check-in, in your own words —{" "}
                {latestCheckIn.date === localToday
                  ? "today"
                  : new Date(`${latestCheckIn.date}T12:00:00`).toLocaleDateString(
                      undefined,
                      { weekday: "short", day: "numeric", month: "short" }
                    )}
                . Not a score.
              </p>
            </>
          ) : (
            <p>
              No check-in yet. When you save one on the Wellbeing page, the
              word you chose shows here — never a score.
            </p>
          )}
        </article>
        <article className="dashboard-card next-card">
          <span className="card-label">your next best step</span>
          <Target size={26} aria-hidden="true" />
          <h3>{nextStep.title}</h3>
          <p>{nextStep.why}</p>
          <button type="button" onClick={() => onOpen(nextStep.view)}>
            {nextStep.label} <ArrowRight size={15} aria-hidden="true" />
          </button>
        </article>
        <article className="dashboard-card goals-card">
          <span className="card-label">toward your goals</span>
          {goalLines.length === 0 ? (
            <p>No active goal yet. Set one and its progress appears here.</p>
          ) : (
            goalLines.map((goal, index) => (
              <div key={goal.title}>
                <div className="goal-line">
                  <span>{goal.title}</span>
                  <b>
                    {goal.percent}%
                    <small>
                      {goal.fromMilestones ? " of milestones" : " estimated"}
                    </small>
                  </b>
                </div>
                <div
                  className="progress-track"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={goal.percent}
                  aria-label={`${goal.title}, ${goal.percent}%`}
                >
                  <i
                    className={cn(index % 2 === 1 && "pink")}
                    style={{ width: `${goal.percent}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </article>
        <article className="dashboard-card trends-card">
          <span className="card-label">what’s changing</span>
          {masked ? (
            <div className="dashboard-private-mask compact">
              <HeartPulse size={17} aria-hidden="true" />
              <b>Sensitive health trend hidden</b>
              <small>Private mode is active.</small>
            </div>
          ) : (
            <div className="trend-item">
              <span
                className={cn(
                  "trend-glyph",
                  sleepDelta === null ? "soft" : sleepDelta >= 0 ? "up" : "soft"
                )}
                aria-hidden="true"
              >
                {sleepDelta === null ? "~" : sleepDelta >= 0 ? "↗" : "↘"}
              </span>
              <p>
                <b>
                  {sleepDelta === null
                    ? "Sleep: not enough nights to compare"
                    : `Sleep averages ${Math.abs(sleepDelta)} min ${sleepDelta >= 0 ? "longer" : "shorter"}`}
                </b>
                <small>
                  {sleepDelta === null
                    ? `${thisWeekNights.length} logged this week, ${lastWeekNights.length} the week before; 3 each are needed`
                    : "this 7 days against the 7 before, from logged nights"}
                </small>
              </p>
            </div>
          )}
          <div className="trend-item">
            <span
              className={cn(
                "trend-glyph",
                trend.direction === "more" ? "up" : "soft"
              )}
              aria-hidden="true"
            >
              {trend.direction === "more" ? "↗" : trend.direction === "fewer" ? "↘" : "~"}
            </span>
            <p>
              <b>
                {trend.evidence === "descriptive"
                  ? `${trend.direction === "more" ? "More" : trend.direction === "fewer" ? "Fewer" : "About as many"} actions saved this week`
                  : "Not enough saved actions to compare weeks"}
              </b>
              <small>
                {trend.currentCount} this 7 days · {trend.previousCount} the 7
                before
              </small>
            </p>
          </div>
        </article>
      </div>
      <div className="dashboard-bottom-bar">
        <span>
          {savedToday} action{savedToday === 1 ? "" : "s"} saved today ·{" "}
          {savedThisWeek} this week. Counts, not conclusions.
        </span>
        <button type="button" onClick={() => onOpen("reflections")}>
          Write reflection <NotebookPen size={15} aria-hidden="true" />
        </button>
      </div>
    </>
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
  const [turnCarriesContent, setTurnCarriesContent] = useState(false);
  const journalStageRef = useRef<HTMLDivElement>(null);
  const flipFrontHostRef = useRef<HTMLDivElement>(null);
  const flipBackStandInRef = useRef<HTMLDivElement>(null);
  const flipRevealHostRef = useRef<HTMLDivElement>(null);
  const [expandedGroup, setExpandedGroup] = useState("Body");
  const [mobileContentsOpen, setMobileContentsOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [activePage, setActivePage] = useState<View>("dashboard");
  const [contentsPreferences, setContentsPreferences] = useState({
    expandedGroup: "Body",
    lastVisitedPage: "dashboard" as View,
    favorites: [] as View[],
    recentPages: [] as View[],
    /** Page-turn motion: follow the OS setting, always fade, or always flip. */
    motion: "system" as "system" | "reduced" | "full",
  });
  const [isFading, setIsFading] = useState(false);
  const [contentsSearch, setContentsSearch] = useState("");
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
      setInsightActivity(normalizeInsightActivity(payload.insightActivity));
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
      setPixelRecords(migratePixelRecords(payload.pixelRecords));
    if (
      payload.contentsPreferences &&
      typeof payload.contentsPreferences === "object"
    )
      setContentsPreferences(prev => ({
        ...prev,
        ...payload.contentsPreferences,
        favorites: payload.contentsPreferences?.favorites ?? [],
        recentPages: payload.contentsPreferences?.recentPages ?? [],
      }));
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
        setInsightActivity(normalizeInsightActivity(payload.insightActivity));
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
        setPixelRecords(migratePixelRecords(payload.pixelRecords));
      if (
        payload.contentsPreferences &&
        typeof payload.contentsPreferences === "object"
      )
        setContentsPreferences(prev => ({
          ...prev,
          ...payload.contentsPreferences,
          favorites: payload.contentsPreferences?.favorites ?? [],
          recentPages: payload.contentsPreferences?.recentPages ?? [],
        }));
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
      // A real instant, not "Sep 13": History sorts on it and every
      // reader formats it. recordedOn is the local calendar day the
      // period filters key on; the UTC day was a day early east of
      // Greenwich in the evening.
      createdAt: now.toISOString(),
      recordedOn: localCalendarDay(now),
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
  /**
   * After a turn lands, put keyboard focus on the new page's heading so a
   * keyboard or screen-reader user isn't left on an element that no longer
   * exists, and the live chapter marker announces the page name.
   */
  function focusArrivedPage() {
    window.requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>(
        '.journal-stage h2, .journal-stage [role="heading"]'
      );
      if (!heading) return;
      if (!heading.hasAttribute("tabindex"))
        heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    });
  }
  /**
   * The turning leaf's front face carries the page it is lifting off, so the
   * first frame of a turn is the resting page itself rather than a blank
   * sheet dropped over it. The whole spread is cloned inside a stand-in
   * .journal-stage that repeats the real stage's classes and
   * data-journal-view, so every ancestor-dependent rule (scene art,
   * per-view colours, glass buttons) resolves exactly as it does on the
   * real page; the stand-in is then slid so the spine lands on the leaf's
   * hinge. This runs as a layout effect because the overlay - and with it
   * the host element - only exists once isTurning has rendered, and it has
   * to be populated before that first frame paints.
   */
  useLayoutEffect(() => {
    if (!isTurning || !turnCarriesContent) return;
    const host = flipFrontHostRef.current;
    const stage = journalStageRef.current;
    if (!host || !stage) return;
    const standIn = document.createElement("div");
    standIn.className = stage.className;
    standIn.dataset.journalView = stage.dataset.journalView ?? "";
    standIn.setAttribute("aria-hidden", "true");
    const pairs: Array<[Element, Element]> = [];
    for (const selector of [
      ":scope > .journal-spread",
      ":scope > .journal-cover",
      ":scope > .pixels-floating",
    ]) {
      const original = stage.querySelector(selector);
      if (!original) continue;
      const copy = original.cloneNode(true) as Element;
      standIn.append(copy);
      pairs.push([original, copy]);
    }
    host.replaceChildren(standIn);
    // cloneNode copies markup, not the live state a reader would notice
    // missing: scroll offsets need layout, so they are copied only now
    // that the copy is in the document.
    pairs.forEach(([original, copy]) => syncLiveState(original, copy));
    // The slot the sheet lifts from uncovers the destination page: a static
    // copy of the flap's stand-in, so the page is rendered only once.
    const reveal = flipRevealHostRef.current;
    const back = flipBackStandInRef.current;
    if (reveal && back) reveal.replaceChildren(back.cloneNode(true));
  }, [isTurning, turnCarriesContent]);

  function turnTo(nextView: View, direction: TurnDirection = "forward") {
    if (isTurning || isFading || nextView === view) return;
    setMobileContentsOpen(false);
    setQuickAddOpen(false);
    const systemReduced = Boolean(
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    );
    const reduced =
      contentsPreferences.motion === "reduced" ||
      (contentsPreferences.motion === "system" && systemReduced);
    const duration = pageTurnDuration(reduced);
    if (duration === 0) {
      // A short crossfade rather than a hard cut: no movement, but still a
      // cue that the page changed.
      setIsFading(true);
      window.setTimeout(() => {
        setActivePage(currentPage =>
          activePageAfterNavigation(currentPage, nextView)
        );
        setView(nextView);
        window.setTimeout(() => {
          setIsFading(false);
          focusArrivedPage();
        }, 20);
      }, 140);
      return;
    }
    // Below 821px the spread collapses to one column and "the half the
    // leaf sits in" no longer means anything.
    setTurnCarriesContent(
      Boolean(window.matchMedia?.("(min-width: 821px)").matches)
    );
    setTurnDirection(direction);
    setTurnDestination(nextView);
    setIsTurning(true);
    window.setTimeout(() => {
      setActivePage(currentPage =>
        activePageAfterNavigation(currentPage, nextView)
      );
      setView(nextView);
      setIsTurning(false);
      focusArrivedPage();
    }, duration);
  }

  function selectContentsItem(nextView: View) {
    setContentsPreferences(prev => ({
      ...prev,
      lastVisitedPage: nextView,
      recentPages: [
        nextView,
        ...(prev.recentPages ?? []).filter(page => page !== nextView),
      ].slice(0, 5),
    }));
    turnTo(nextView, "forward");
  }

  function toggleFavoritePage(view: View) {
    setContentsPreferences(prev => {
      const favorites = prev.favorites ?? [];
      const isFavorite = favorites.includes(view);
      return {
        ...prev,
        favorites: isFavorite
          ? favorites.filter(page => page !== view)
          : [...favorites, view],
      };
    });
  }

  function renderPage(pageView: View = view) {
    switch (pageView) {
      case "cover":
        const lastVisitedPage = contentsPreferences?.lastVisitedPage;
        const canResumeSession = lastVisitedPage && lastVisitedPage !== "cover";
        return (
          <section
            className="journal-cover"
            aria-labelledby="cover-title"
            role="main"
          >
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

              <div className="cover-action-group">
                {canResumeSession ? (
                  <>
                    <Button
                      className="cover-button cover-button-primary"
                      onClick={() => turnTo(lastVisitedPage)}
                      aria-label={`Continue where you left off in ${lastVisitedPage}`}
                    >
                      Continue where you left off
                      <ArrowRight size={17} />
                    </Button>
                    <Button
                      variant="outline"
                      className="cover-button cover-button-secondary"
                      onClick={() => turnTo("contents")}
                      aria-label="Open journal table of contents"
                    >
                      Open journal
                    </Button>
                  </>
                ) : (
                  <Button
                    className="cover-button cover-button-primary"
                    onClick={() => turnTo("contents")}
                    aria-label="Open journal to table of contents"
                  >
                    Open journal <ArrowRight size={17} />
                  </Button>
                )}
              </div>

              <div className="cover-rhythm-index" aria-label="Journal chapters">
                <span>01 Body</span>
                <span>02 Mind</span>
                <span>03 Life</span>
                <span>04 Growth</span>
                <span>05 Utilities</span>
              </div>

              {!navigator.onLine && (
                <div className="cover-offline-notice" role="status" aria-live="polite">
                  <span aria-label="Offline status">●</span> You are offline — your journal will load from local storage
                </div>
              )}
            </div>
          </section>
        );

      case "contents": {
        const favorites = contentsPreferences.favorites ?? [];
        const recentPages = (contentsPreferences.recentPages ?? []).filter(
          page => page !== "contents"
        );
        const isSearching = contentsSearch.trim().length > 0;
        const filteredGroups = contentsGroupsMatchingSearch(contentsSearch);
        return (
          <section
            className="journal-spread contents-spread glass-scope"
            aria-labelledby="contents-title"
          >
            <div className="spread-page contents-intro">
              <JournalActions
                onContents={() => turnTo("contents", "backward")}
                onCover={() => turnTo("cover", "backward")}
              />
              <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">your journal index</p>
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
            </div>
            <div className="spread-page contents-list">
              <label className="contents-search" htmlFor="contents-search-input">
                <Search size={16} aria-hidden="true" />
                <input
                  id="contents-search-input"
                  type="search"
                  placeholder="Search your journal…"
                  value={contentsSearch}
                  onChange={e => setContentsSearch(e.target.value)}
                  aria-label="Search chapters and pages"
                />
                {isSearching && (
                  <button
                    type="button"
                    className="contents-search-clear"
                    onClick={() => setContentsSearch("")}
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </label>
              <div
                className="contents-motion"
                role="radiogroup"
                aria-labelledby="contents-motion-label"
              >
                <span id="contents-motion-label">Page turns</span>
                {(
                  [
                    ["system", "Follow device"],
                    ["reduced", "Fade only"],
                    ["full", "Flip"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    role="radio"
                    aria-checked={contentsPreferences.motion === value}
                    className={cn(
                      contentsPreferences.motion === value && "active"
                    )}
                    onClick={() =>
                      setContentsPreferences(prev => ({
                        ...prev,
                        motion: value,
                      }))
                    }
                  >
                    {label}
                  </button>
                ))}
                <small>
                  {contentsPreferences.motion === "system"
                    ? "Uses your device’s reduce-motion setting: a fade when it’s on, a page flip when it’s off."
                    : contentsPreferences.motion === "reduced"
                      ? "A short fade, no movement — whatever the device says."
                      : "Always the page flip, even if the device asks for less motion."}
                </small>
              </div>

              {!isSearching && favorites.length > 0 && (
                <div className="contents-quick-section" aria-label="Favorite pages">
                  <div className="contents-quick-heading">
                    <Star size={13} /> <span>Favorites</span>
                  </div>
                  <div className="contents-quick-row">
                    {favorites.map(view => {
                      const item = findContentsItem(view);
                      if (!item) return null;
                      return (
                        <button
                          key={view}
                          type="button"
                          className={cn(
                            "contents-quick-chip",
                            activePage === view && "is-current"
                          )}
                          onClick={() => selectContentsItem(view)}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {!isSearching && recentPages.length > 0 && (
                <div className="contents-quick-section" aria-label="Recently visited pages">
                  <div className="contents-quick-heading">
                    <Clock3 size={13} /> <span>Recently visited</span>
                  </div>
                  <div className="contents-quick-row">
                    {recentPages.map(view => {
                      const item = findContentsItem(view);
                      if (!item) return null;
                      return (
                        <button
                          key={view}
                          type="button"
                          className={cn(
                            "contents-quick-chip",
                            activePage === view && "is-current"
                          )}
                          onClick={() => selectContentsItem(view)}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="contents-list-heading">
                <span>chapters</span>
                <span>
                  {isSearching
                    ? `${filteredGroups.reduce((sum, group) => sum + group.items.length, 0)} match${filteredGroups.reduce((sum, group) => sum + group.items.length, 0) === 1 ? "" : "es"}`
                    : "01 — 05"}
                </span>
              </div>

              {filteredGroups.length === 0 && (
                <p className="contents-empty-state" role="status">
                  No pages match “{contentsSearch}”. Try a different word.
                </p>
              )}

              {filteredGroups.map((group, index) => {
                const Icon = group.icon;
                const isOpen = isSearching || expandedGroup === group.label;
                return (
                  <div
                    className={cn("contents-group", isOpen && "is-open")}
                    key={group.label}
                  >
                    <button
                      className="contents-group-trigger"
                      type="button"
                      onClick={() => {
                        const newGroup =
                          expandedGroup === group.label ? "" : group.label;
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
                          const newGroup =
                            expandedGroup === group.label ? "" : group.label;
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
                      {group.items.map(item => {
                        const isFavorite = favorites.includes(item.view);
                        return (
                          <div
                            key={item.label}
                            className={cn(
                              "contents-subtopic-row",
                              activePage === item.view && "is-current"
                            )}
                          >
                            <button
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
                            <button
                              type="button"
                              className={cn(
                                "contents-favorite-toggle",
                                isFavorite && "is-favorite"
                              )}
                              onClick={() => toggleFavoritePage(item.view)}
                              aria-pressed={isFavorite}
                              aria-label={
                                isFavorite
                                  ? `Remove ${item.label} from favorites`
                                  : `Add ${item.label} to favorites`
                              }
                            >
                              <Star size={15} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      }

      case "dashboard":
        return (
          <section
            className="journal-spread dashboard-spread glass-scope"
            aria-labelledby="dashboard-title"
          >
            <div className="spread-page dashboard-intro">
              <JournalActions
                onContents={() => turnTo("contents", "backward")}
                onCover={() => turnTo("cover", "backward")}
              />
              <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">your day · dashboard</p>
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
              <DashboardCards
                activity={insightActivity}
                ownerKey={String(auth.user?.id ?? "guest")}
                privateMode={privateMode}
                showSensitiveSummaries={showSensitiveSummaries}
                onOpen={destination => turnTo(destination)}
              />
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
                <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">capture a moment</p>
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
            onNavigate={destination => turnTo(destination)}
          />
        );
      case "exportData":
        return (
          <ExportPage
            onContents={() => turnTo("contents", "backward")}
            onCover={() => turnTo("cover", "backward")}
            onNavigate={destination => turnTo(destination)}
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
    <JournalNavContext.Provider value={{ view, turnTo }}>
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
          {/* Shared Liquid Glass defs, rendered once for the whole app so
              every page's .glass-scope elements can reference them by id
              without duplicating the filter/gradients per page. */}
          <svg
            role="presentation"
            aria-hidden="true"
            style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
          >
            <defs>
              <filter id="glass-distortion-fit" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
                <feTurbulence type="fractalNoise" baseFrequency="0.001 0.005" numOctaves={1} seed={17} result="turbulence" />
                <feComponentTransfer in="turbulence" result="mapped">
                  <feFuncR type="gamma" amplitude={1} exponent={10} offset={0.5} />
                  <feFuncG type="gamma" amplitude={0} exponent={1} offset={0} />
                  <feFuncB type="gamma" amplitude={0} exponent={1} offset={0.5} />
                </feComponentTransfer>
                <feGaussianBlur in="turbulence" stdDeviation={3} result="softMap" />
                <feSpecularLighting in="softMap" surfaceScale={5} specularConstant={1} specularExponent={100} lightingColor="white" result="specLight">
                  <fePointLight x={-200} y={-200} z={300} />
                </feSpecularLighting>
                <feComposite in="specLight" operator="arithmetic" k1={0} k2={1} k3={1} k4={0} result="litImage" />
                <feDisplacementMap in="SourceGraphic" in2="softMap" scale={200} xChannelSelector="R" yChannelSelector="G" />
              </filter>
              <linearGradient id="glassTopLeft" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="white" stopOpacity={0.72} />
                <stop offset="32%" stopColor="white" stopOpacity={0.48} />
                <stop offset="55%" stopColor="white" stopOpacity={0} />
                <stop offset="100%" stopColor="white" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="glassBottomRight" x1="1" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="white" stopOpacity={0.58} />
                <stop offset="28%" stopColor="white" stopOpacity={0.42} />
                <stop offset="52%" stopColor="white" stopOpacity={0} />
                <stop offset="100%" stopColor="white" stopOpacity={0} />
              </linearGradient>
            </defs>
          </svg>

          <div
            ref={journalStageRef}
            className={cn(
              "journal-stage",
              view !== "cover" && "journal-open",
              isFading && "is-fading"
            )}
            data-journal-view={view}
          >
            {renderPage()}
            {activePixelsTracker && (
              <div className="pixels-floating">
                <PixelsGrid tracker={activePixelsTracker} />
              </div>
            )}
          </div>
          {/* The turn overlay sits beside the stage, not inside it: its
              stand-in stages carry the destination's data-journal-view, and
              nested inside the real stage they would also match every rule
              keyed on the *outgoing* view (descendant selectors), with the
              later rule in the file winning. */}
          {isTurning && (
              <div
                className={cn(
                  "page-turn",
                  "whole-page-turn",
                  "page-flip",
                  turnDirection,
                  turnCarriesContent && "carries-content",
                  pageTurnDestinationClass(turnDestination)
                )}
                aria-label={`Turning ${turnDirection} through the journal`}
              >
                {/* Under the leaves, in the slot the sheet lifts from: the
                    page being uncovered. A copy of the flap's stand-in,
                    filled in by the layout effect below. */}
                <div className="flip-reveal" ref={flipRevealHostRef} />
                <div className="flip-r1">
                  <div className="flip-p1">
                    <div>
                      <div className="flip-face-content" ref={flipFrontHostRef} />
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
                      {turnCarriesContent && (
                        // The flap's underside is the page it lands on. That
                        // page is not in the document yet (the real view
                        // swaps when the turn ends), so it is rendered here,
                        // inside a stand-in stage that repeats the real
                        // stage's classes and data-journal-view so every
                        // ancestor-keyed rule resolves as it will on arrival.
                        <div className="flip-face-content">
                          <div
                            ref={flipBackStandInRef}
                            className={cn(
                              "journal-stage",
                              turnDestination !== "cover" && "journal-open"
                            )}
                            data-journal-view={turnDestination}
                            aria-hidden="true"
                            inert
                          >
                            {renderPage(turnDestination)}
                          </div>
                        </div>
                      )}
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
                <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">journal navigation</p>
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
            Now on: {activeLabel}
          </div>
        </main>
      </ReminderPreviewContext.Provider>
    </PixelsTrackerContext.Provider>
    </JournalNavContext.Provider>
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
  const [completedAt, setCompletedAt] = useState<Record<string, number>>({});
  const [rest, setRest] = useState(45);
  const [effort, setEffort] = useState("Moderate");
  const [note, setNote] = useState("");
  type WorkoutSessionNote = {
    at: string;
    routineId: WorkoutRoutine["id"];
    effort: string;
    note: string;
    completedCount: number;
  };
  const [sessionNotes, setSessionNotes] = useState<WorkoutSessionNote[]>([]);
  // One snapshot behind, so saving a session (which clears the ticks) or
  // removing a logged session can be taken back.
  const [lastStudio, setLastStudio] = useState<{
    completed: Record<string, boolean>;
    completedAt: Record<string, number>;
    sessionNotes: WorkoutSessionNote[];
  } | null>(null);
  const [motionPaused, setMotionPaused] = useState(false);
  const routine = workoutRoutineById(routineId);
  const completedCount = workoutCompletedCount(completed, routine);
  useMongoJournalScope({
    scope: "workout-studio",
    payload: { completed, completedAt, routineId, effort, sessionNotes, rest },
    hydrate: payload => {
      if (
        typeof payload.rest === "number" &&
        Number.isInteger(payload.rest) &&
        payload.rest >= 15
      )
        setRest(payload.rest);
      if (payload.completed && typeof payload.completed === "object")
        setCompleted(payload.completed as Record<string, boolean>);
      if (payload.completedAt && typeof payload.completedAt === "object")
        setCompletedAt(payload.completedAt as Record<string, number>);
      if (
        typeof payload.routineId === "string" &&
        workoutRoutines.some(item => item.id === payload.routineId)
      )
        setRoutineId(payload.routineId as WorkoutRoutine["id"]);
      if (typeof payload.effort === "string") setEffort(payload.effort);
      if (Array.isArray(payload.sessionNotes))
        setSessionNotes(payload.sessionNotes as WorkoutSessionNote[]);
    },
  });

  function saveSessionNote() {
    const trimmed = note.trim();
    if (completedCount === 0 && !trimmed) {
      toast("Mark a move complete or add a note before saving a session");
      return;
    }
    setLastStudio({ completed, completedAt, sessionNotes });
    setSessionNotes(current =>
      [
        {
          at: new Date().toISOString(),
          routineId,
          effort,
          note: trimmed,
          completedCount,
        },
        ...current,
      ].slice(0, 30)
    );
    // The ticks belong to the session just logged; a fresh routine starts
    // blank rather than opening already "5/5 complete" tomorrow.
    setCompleted({});
    setCompletedAt({});
    setStarted(false);
    setNote("");
    const monthIndex = new Date().getMonth();
    const day = new Date().getDate();
    // "Session logged" is the automatic mark; a Strength/Mobility/Rest key the
    // user set by hand for today is left alone.
    const existing =
      pixelStore?.records.movement?.[pixelsCellKey(monthIndex, day)];
    if (!existing) pixelStore?.set("movement", monthIndex, day, "#06b6d4");
    toast(
      `${trimmed ? "Session note saved" : "Session logged"} · ${completedCount} move${completedCount === 1 ? "" : "s"} · ticks cleared for next time`
    );
  }

  function removeSessionNote(entry: WorkoutSessionNote) {
    setLastStudio({ completed, completedAt, sessionNotes });
    setSessionNotes(current => current.filter(item => item.at !== entry.at));
    toast("Session removed — Undo last brings it back");
  }

  function undoStudio() {
    if (!lastStudio) return;
    setCompleted(lastStudio.completed);
    setCompletedAt(lastStudio.completedAt);
    setSessionNotes(lastStudio.sessionNotes);
    setLastStudio(null);
    toast("Workout Studio restored");
  }

  const formatCompletedAt = (timestamp: number) => {
    const at = new Date(timestamp);
    const sameDay = localCalendarDay(at) === localCalendarDay(new Date());
    return sameDay
      ? at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : at.toLocaleString([], {
          day: "numeric",
          month: "short",
          hour: "numeric",
          minute: "2-digit",
        });
  };

  function toggleExerciseComplete(exerciseId: string, exerciseName: string) {
    const willComplete = !completed[exerciseId];
    setCompleted(current => ({ ...current, [exerciseId]: willComplete }));
    setCompletedAt(current => {
      if (!willComplete) {
        const next = { ...current };
        delete next[exerciseId];
        return next;
      }
      return { ...current, [exerciseId]: Date.now() };
    });
    toast(
      willComplete
        ? `${exerciseName} marked complete`
        : `${exerciseName} completion undone`
    );
  }
  return (
    <section
      className="journal-spread workout-spread glass-scope"
      aria-labelledby="workout-title"
    >
      <div className="spread-page workout-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <div className="editorial-contrast-panel">
          <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">fitness · workout studio</p>
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
            {started ? "Stop session" : "Begin selected routine"}
          </Button>
          {started ? (
            <small className="workout-session-state" aria-live="polite">
              Session in progress · tick moves as you finish them, then save
              below.
            </small>
          ) : null}
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
                      toggleExerciseComplete(exercise.id, exercise.name)
                    }
                    aria-pressed={Boolean(completed[exercise.id])}
                  >
                    {completed[exercise.id] ? <CircleCheck size={15} /> : null}
                    {completed[exercise.id]
                      ? "Marked complete"
                      : "Mark complete"}
                  </button>
                  {completed[exercise.id] && completedAt[exercise.id] && (
                    <small className="workout-complete-timestamp">
                      Completed {formatCompletedAt(completedAt[exercise.id])}
                    </small>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        <WorkoutStudio />
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
          <button type="button" onClick={saveSessionNote}>
            Save session {note.trim() ? "note" : "log"}
          </button>
          {lastStudio ? (
            <button type="button" className="local-undo" onClick={undoStudio}>
              Undo last
            </button>
          ) : null}
          {sessionNotes.length > 0 && (
            <div className="workout-session-notes">
              <span>
                Recent sessions · {sessionNotes.length} kept
              </span>
              {sessionNotes.slice(0, 3).map(entry => (
                <article key={entry.at}>
                  <b>
                    {new Date(entry.at).toLocaleString([], {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    · {workoutRoutineById(entry.routineId).label} ·{" "}
                    {entry.effort}
                  </b>
                  <small>
                    {entry.completedCount} move
                    {entry.completedCount === 1 ? "" : "s"} complete
                    {entry.note ? ` · ${entry.note}` : ""}
                  </small>
                  <button
                    type="button"
                    onClick={() => removeSessionNote(entry)}
                    aria-label={`Remove session from ${new Date(entry.at).toLocaleString()}`}
                  >
                    Remove
                  </button>
                </article>
              ))}
            </div>
          )}
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
  const today = sleepDateInputValue(new Date());
  const [sortBy, setSortBy] = useState<AssignmentSort>("due");
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
  const activeAssignments = sortAssignments(
    assignments.filter(item => !item.completed),
    sortBy
  );
  const completedAssignments = sortAssignmentsByDue(
    assignments.filter(item => item.completed)
  );
  const overdueCount = activeAssignments.filter(
    item => assignmentDueDetail(item.due, today).kind === "overdue"
  ).length;
  const undatedCount = activeAssignments.filter(item => !item.due).length;
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
    // A due date is optional: some work has no deadline yet, and forcing a
    // made-up one produces a false "Due today" later.
    if (!draft.title.trim() || !draft.subject.trim() || !draft.nextAction.trim())
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
    const due = assignmentDueDetail(assignment.due, today);
    const priorityGlyph = { High: "!!!", Medium: "!!", Low: "!" }[
      assignment.priority
    ];
    return (
      <article
        className={cn(
          "assignment-plan-card",
          assignment.completed && "completed",
          !assignment.completed && `is-${due.kind}`
        )}
        key={assignment.id}
      >
        <div className="assignment-card-top">
          <div>
            <span
              className={cn(
                "assignment-due",
                assignment.completed ? "is-completed" : `is-${due.kind}`
              )}
              title={due.exact}
            >
              {assignment.completed ? "Completed" : due.label}
            </span>
            <b>{assignment.title}</b>
            <small>
              {assignment.subject} ·{" "}
              {assignment.due ? (
                <time dateTime={assignment.due}>{due.exact}</time>
              ) : (
                "no due date"
              )}
            </small>
          </div>
          <span
            className={cn(
              "assignment-priority",
              assignment.priority.toLowerCase()
            )}
            aria-label={`${assignment.priority} priority`}
            title={`${assignment.priority} priority`}
          >
            <span aria-hidden="true">{priorityGlyph}</span> {assignment.priority}
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
      className="journal-spread assignment-spread glass-scope"
      aria-labelledby="assignment-title"
    >
      <div className="spread-page assignment-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">education · assignments</p>
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
            {overdueCount > 0
              ? ` · ${overdueCount} past due`
              : ""}
            {undatedCount > 0
              ? ` · ${undatedCount} without a date`
              : ""}
          </p>
          <label className="assignment-sort">
            Sort by
            <select
              value={sortBy}
              onChange={event =>
                setSortBy(event.target.value as AssignmentSort)
              }
            >
              <option value="due">Due date (soonest first)</option>
              <option value="priority">Priority (High first)</option>
              <option value="course">Course (A–Z)</option>
            </select>
          </label>
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
                Due date & time <small>optional · your local time</small>
                <input
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

function LearningWorkbenchPage({
  onContents,
  onCover,
  onRecordPractice,
}: {
  onContents: () => void;
  onCover: () => void;
  onRecordPractice: (minutes: number, label: string) => void;
}) {
  type PracticeEntry = {
    date: string;
    minutes: number;
    note: string;
    link?: string;
  };
  type Skill = {
    id: string;
    name: string;
    goal: string;
    level: string;
    progress: number;
    color: string;
    /** Legacy single "next action" text; kept as the smallest next step. */
    milestone: string;
    milestones?: PracticeMilestone[];
    practice: number;
    resources: string;
    notes: string;
    logs: PracticeEntry[];
  };
  const [milestoneDraft, setMilestoneDraft] = useState("");
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
    date: sleepDateInputValue(new Date()),
    minutes: "25",
    note: "",
    link: "",
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
    const link = logDraft.link.trim();
    const entry: PracticeEntry = {
      date: logDraft.date || sleepDateInputValue(new Date()),
      minutes,
      note: logDraft.note.trim() || "Focused practice session.",
      ...(link ? { link } : {}),
    };
    setSkills(current =>
      current.map(skill =>
        skill.id === activeSkill.id ? addPracticeSession(skill, entry) : skill
      )
    );
    onRecordPractice(minutes, `${activeSkill.name} practice`);
    setLogDraft({
      date: sleepDateInputValue(new Date()),
      minutes: "25",
      note: "",
      link: "",
    });
    setLogOpen(false);
    setHistoryOpen(true);
    toast(`${minutes} min of ${activeSkill.name} logged`);
  }
  function updateProgress(value: number) {
    if (!activeSkill) return;
    setSkills(current =>
      current.map(skill =>
        skill.id === activeSkill.id ? { ...skill, progress: value } : skill
      )
    );
  }
  function updateActiveSkill(update: (skill: Skill) => Skill) {
    if (!activeSkill) return;
    setSkills(current =>
      current.map(skill => (skill.id === activeSkill.id ? update(skill) : skill))
    );
  }
  function addMilestone() {
    const label = milestoneDraft.trim();
    if (!label) return;
    updateActiveSkill(skill => ({
      ...skill,
      milestones: [
        ...(skill.milestones ?? []),
        { id: `${Date.now()}-milestone`, label, done: false },
      ],
    }));
    setMilestoneDraft("");
  }
  function toggleMilestone(id: string) {
    updateActiveSkill(skill => ({
      ...skill,
      milestones: (skill.milestones ?? []).map(item =>
        item.id === id ? { ...item, done: !item.done } : item
      ),
    }));
  }
  function removeMilestone(id: string) {
    updateActiveSkill(skill => ({
      ...skill,
      milestones: (skill.milestones ?? []).filter(item => item.id !== id),
    }));
  }
  const progress = activeSkill ? practiceProgress(activeSkill) : null;
  const totals = activeSkill ? practiceTotals(activeSkill) : null;
  return (
    <section
      className="journal-spread learning-spread glass-scope"
      aria-labelledby="learning-title"
    >
      <div className="spread-page learning-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">growth · learning something new</p>
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
                <i style={{ background: skill.color }} aria-hidden="true" />
                <span>
                  <b>{skill.name}</b>
                  <small>
                    {practiceProgress(skill).percent}%
                    {practiceProgress(skill).source === "milestones"
                      ? " of milestones"
                      : " estimated"}{" "}
                    · {skill.level}
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
                  <span>
                    {progress?.source === "milestones"
                      ? "Progress, from your milestones"
                      : "Progress, as you estimate it"}
                  </span>
                  <b>
                    {progress?.percent ?? 0}%
                    {progress?.source === "milestones"
                      ? ` · ${progress.done} of ${progress.total}`
                      : ""}
                  </b>
                </div>
                {progress?.source === "milestones" ? (
                  <div
                    className="learning-progress-bar"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={progress.total}
                    aria-valuenow={progress.done}
                    aria-valuetext={`${progress.done} of ${progress.total} milestones done, ${progress.percent}%`}
                  >
                    <i
                      style={{
                        width: `${progress.percent}%`,
                        background: activeSkill.color,
                      }}
                    />
                  </div>
                ) : (
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={activeSkill.progress}
                    onChange={event =>
                      updateProgress(Number(event.target.value))
                    }
                    style={{ accentColor: activeSkill.color }}
                    aria-label="Your progress estimate"
                    aria-valuetext={`${activeSkill.progress} percent, your own estimate`}
                  />
                )}
                <small>
                  {progress?.source === "milestones"
                    ? `${progress.percent}% is simply ${progress.done} ticked of ${progress.total} milestones you wrote. Untick or remove one and it moves back — nothing is inferred.`
                    : "A number you set by hand, not a prediction or a course score. Add milestones below and it becomes a count of them instead."}
                </small>
              </div>
              <div className="learning-milestones">
                <div>
                  <span>Milestones</span>
                  <b>
                    {(activeSkill.milestones ?? []).length
                      ? `${(activeSkill.milestones ?? []).filter(item => item.done).length} done`
                      : "None yet"}
                  </b>
                </div>
                {(activeSkill.milestones ?? []).map(item => (
                  <div className="learning-milestone-row" key={item.id}>
                    <button
                      type="button"
                      className={cn(item.done && "done")}
                      onClick={() => toggleMilestone(item.id)}
                      aria-pressed={item.done}
                    >
                      <span aria-hidden="true">{item.done ? "✓" : ""}</span>
                      {item.label}
                    </button>
                    <button
                      type="button"
                      className="learning-milestone-remove"
                      onClick={() => removeMilestone(item.id)}
                      aria-label={`Remove milestone ${item.label}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <div className="learning-milestone-add">
                  <input
                    value={milestoneDraft}
                    onChange={event => setMilestoneDraft(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addMilestone();
                      }
                    }}
                    placeholder="A concrete step, e.g. build a working demo"
                    aria-label="New milestone"
                  />
                  <button type="button" onClick={addMilestone}>
                    Add milestone
                  </button>
                </div>
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
                  <input
                    type="url"
                    inputMode="url"
                    value={logDraft.link}
                    onChange={event =>
                      setLogDraft(current => ({
                        ...current,
                        link: event.target.value,
                      }))
                    }
                    placeholder="Evidence link, optional — a repo, doc, recording"
                    aria-label="Evidence link"
                  />
                  <div>
                    <button type="button" onClick={() => setLogOpen(false)}>
                      Cancel
                    </button>
                    <button type="button" onClick={savePractice}>
                      Save practice
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
              {totals && totals.sessions > 0 && (
                <p className="learning-totals">
                  {totals.sessions} session{totals.sessions === 1 ? "" : "s"} ·{" "}
                  {totals.minutes >= 60
                    ? `${Math.floor(totals.minutes / 60)} h ${totals.minutes % 60} min`
                    : `${totals.minutes} min`}{" "}
                  in all · last practised {totals.lastDate}
                </p>
              )}
              {activeSkill.logs.length ? (
                activeSkill.logs
                  .slice(0, historyOpen ? activeSkill.logs.length : 3)
                  .map((entry, index) => (
                    <article key={`${entry.date}-${index}`}>
                      <b>
                        {entry.date} · {entry.minutes} min
                      </b>
                      <small>
                        {entry.note}
                        {entry.link ? (
                          <>
                            {" · "}
                            <a
                              href={entry.link}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              evidence ↗
                            </a>
                          </>
                        ) : null}
                      </small>
                    </article>
                  ))
              ) : (
                <small>Your practice notes will appear here.</small>
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
    id?: string;
    value: string;
    area: string;
    practice: string;
    reflection: string;
    nextStep: string;
    createdAt?: string;
    updatedAt?: string;
  };
  const [entries, setEntries] = useState<GrowthEntry[]>([]);
  const [lastEntries, setLastEntries] = useState<GrowthEntry[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const today = sleepDateInputValue(new Date());
  const growthEntryName = (entry: GrowthEntry) =>
    entry.value || entry.area || "growth note";
  const formatDay = (value?: string) =>
    value && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;
  function editGrowthEntry(entry: GrowthEntry) {
    setEditingId(entry.id ?? null);
    setDraft({
      value: entry.value,
      area: entry.area,
      practice: entry.practice,
      reflection: entry.reflection,
      nextStep: entry.nextStep,
    });
  }
  function removeGrowthEntry(entry: GrowthEntry) {
    setLastEntries(entries);
    setEntries(current => current.filter(item => item.id !== entry.id));
    if (editingId === entry.id) setEditingId(null);
    toast(`Removed “${growthEntryName(entry)}” — Undo remove brings it back`);
  }
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
        setEntries(
          (payload.entries as GrowthEntry[]).map((entry, index) => ({
            ...entry,
            id: entry.id ?? `growth-${index}-${entry.value}`,
          }))
        );
    },
  });
  function addEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.value.trim() && !draft.area.trim()) return;
    const fields = { ...draft, value: draft.value.trim(), area: draft.area.trim() };
    if (editingId) {
      setEntries(current =>
        current.map(entry =>
          entry.id === editingId ? { ...entry, ...fields, updatedAt: today } : entry
        )
      );
      toast("Updated");
    } else {
      setEntries(current => [
        { ...fields, id: `growth-${Date.now()}`, createdAt: today },
        ...current,
      ]);
      toast(`“${fields.value || fields.area}” saved`);
    }
    setEditingId(null);
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
      className="journal-spread growth-spread glass-scope"
      aria-labelledby="growth-title"
    >
      <div className="spread-page growth-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">goals & growth · personal growth</p>
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
          <div className="career-form-actions">
            <Button type="submit" className="ink-button">
              <Plus size={15} /> {editingId ? "Save changes" : "Save growth note"}
            </Button>
            {editingId ? (
              <button
                type="button"
                className="local-undo"
                onClick={() => {
                  setEditingId(null);
                  setDraft({
                    value: "",
                    area: "",
                    practice: "",
                    reflection: "",
                    nextStep: "",
                  });
                }}
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
        <div className="growth-list">
          <div>
            <span>becoming notebook</span>
            <b>
              {entries.length} notes
              {lastEntries && (
                <button
                  type="button"
                  className="local-undo"
                  onClick={() => {
                    setEntries(lastEntries);
                    setLastEntries(null);
                    toast("Growth notes restored");
                  }}
                >
                  Undo remove
                </button>
              )}
            </b>
          </div>
          {entries.length === 0 ? (
            <small>
              Start with a value or area of growth that you would like to meet
              with more curiosity.
            </small>
          ) : (
            entries.map(entry => (
              <article key={entry.id} className={cn(editingId === entry.id && "is-editing")}>
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
                  <small className="career-stamp">
                    {formatDay(entry.updatedAt)
                      ? `Updated ${formatDay(entry.updatedAt)}`
                      : formatDay(entry.createdAt)
                        ? `Saved ${formatDay(entry.createdAt)}`
                        : "Saved before dates were kept"}
                  </small>
                  <span className="career-actions">
                    <button type="button" onClick={() => editGrowthEntry(entry)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeGrowthEntry(entry)}
                      aria-label={`Remove ${growthEntryName(entry)}`}
                    >
                      Remove
                    </button>
                  </span>
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
    id?: string;
    title: string;
    date: string;
    evidence: string;
    gratitude: string;
    meaning: string;
    createdAt?: string;
    updatedAt?: string;
  };
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [lastAchievements, setLastAchievements] = useState<Achievement[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const today = sleepDateInputValue(new Date());
  const formatDay = (value?: string) =>
    value && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;
  function dateLabel(value: string) {
    if (!value) return null;
    const detail = assignmentDueDetail(value, today);
    const days = detail.daysAway ?? 0;
    const abs = Math.abs(days);
    const rel =
      detail.kind === "today"
        ? "today"
        : detail.kind === "tomorrow"
          ? "tomorrow"
          : days < 0
            ? `${abs} day${abs === 1 ? "" : "s"} ago`
            : `in ${days} days`;
    return { text: `${detail.exact} · ${rel}`, kind: detail.kind };
  }
  function editAchievement(achievement: Achievement) {
    setEditingId(achievement.id ?? null);
    setDraft({
      title: achievement.title,
      date: achievement.date,
      evidence: achievement.evidence,
      gratitude: achievement.gratitude,
      meaning: achievement.meaning,
    });
  }
  function removeAchievement(achievement: Achievement) {
    setLastAchievements(achievements);
    setAchievements(current => current.filter(entry => entry.id !== achievement.id));
    if (editingId === achievement.id) setEditingId(null);
    toast(`Removed “${achievement.title}”`);
  }
  const [draft, setDraft] = useState<Achievement>({
    title: "",
    date: sleepDateInputValue(new Date()),
    evidence: "",
    gratitude: "",
    meaning: "",
  });
  useMongoJournalScope({
    scope: "achievements",
    payload: { achievements },
    hydrate: payload => {
      if (Array.isArray(payload.achievements))
        setAchievements(
          (payload.achievements as Achievement[]).map((entry, index) => ({
            ...entry,
            id: entry.id ?? `achievement-${index}-${entry.title}`,
          }))
        );
    },
  });
  function addAchievement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    const fields = { ...draft, title: draft.title.trim() };
    if (editingId) {
      setAchievements(current =>
        current.map(entry =>
          entry.id === editingId ? { ...entry, ...fields, updatedAt: today } : entry
        )
      );
      toast("Updated");
    } else {
      setAchievements(current => [
        { ...fields, id: `achievement-${Date.now()}`, createdAt: today },
        ...current,
      ]);
      toast(`“${fields.title}” saved`);
    }
    setEditingId(null);
    setDraft({
      title: "",
      date: sleepDateInputValue(new Date()),
      evidence: "",
      gratitude: "",
      meaning: "",
    });
  }
  return (
    <section
      className="journal-spread achievements-spread glass-scope"
      aria-labelledby="achievements-title"
    >
      <div className="spread-page achievements-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">goals & growth · achievements</p>
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
          <div className="career-form-actions">
            <Button type="submit" className="ink-button">
              <Plus size={15} /> {editingId ? "Save changes" : "Celebrate this moment"}
            </Button>
            {editingId ? (
              <button
                type="button"
                className="local-undo"
                onClick={() => {
                  setEditingId(null);
                  setDraft({
                    title: "",
                    date: sleepDateInputValue(new Date()),
                    evidence: "",
                    gratitude: "",
                    meaning: "",
                  });
                }}
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
        <div className="achievement-list">
          <div>
            <span>celebration history</span>
            <b>
              {achievements.length} wins
              {lastAchievements && (
                <button
                  type="button"
                  className="local-undo"
                  onClick={() => {
                    setAchievements(lastAchievements);
                    setLastAchievements(null);
                    toast("Achievement restored");
                  }}
                >
                  Undo remove
                </button>
              )}
            </b>
          </div>
          {achievements.length === 0 ? (
            <small>
              Your wins are allowed to have a place here before you move on to
              the next thing.
            </small>
          ) : (
            achievements.map(achievement => (
              <article key={achievement.id} className={cn(editingId === achievement.id && "is-editing")}>
                <i>✦</i>
                <p>
                  <b>{achievement.title}</b>
                  <small>{achievement.date ? (<span className={cn("notebook-date", `is-${dateLabel(achievement.date)!.kind}`)}>{dateLabel(achievement.date)!.text}</span>) : "no date"}</small>
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
                  <small className="career-stamp">
                    {formatDay(achievement.updatedAt)
                      ? `Updated ${formatDay(achievement.updatedAt)}`
                      : formatDay(achievement.createdAt)
                        ? `Saved ${formatDay(achievement.createdAt)}`
                        : "Saved before dates were kept"}
                  </small>
                  <span className="career-actions">
                    <button type="button" onClick={() => editAchievement(achievement)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeAchievement(achievement)}
                      aria-label={`Remove ${achievement.title}`}
                    >
                      Remove
                    </button>
                  </span>
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
    id?: string;
    title: string;
    date: string;
    detail: string;
    anticipation: string;
    memory: string;
    reflection: string;
    createdAt?: string;
    updatedAt?: string;
  };
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [lastExperiences, setLastExperiences] = useState<Experience[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const today = sleepDateInputValue(new Date());
  const formatDay = (value?: string) =>
    value && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;
  function dateLabel(value: string) {
    if (!value) return null;
    const detail = assignmentDueDetail(value, today);
    const days = detail.daysAway ?? 0;
    const abs = Math.abs(days);
    const rel =
      detail.kind === "today"
        ? "today"
        : detail.kind === "tomorrow"
          ? "tomorrow"
          : days < 0
            ? `${abs} day${abs === 1 ? "" : "s"} ago`
            : `in ${days} days`;
    return { text: `${detail.exact} · ${rel}`, kind: detail.kind };
  }
  function editExperience(experience: Experience) {
    setEditingId(experience.id ?? null);
    setDraft({
      title: experience.title,
      date: experience.date,
      detail: experience.detail,
      anticipation: experience.anticipation,
      memory: experience.memory,
      reflection: experience.reflection,
    });
  }
  function removeExperience(experience: Experience) {
    setLastExperiences(experiences);
    setExperiences(current => current.filter(entry => entry.id !== experience.id));
    if (editingId === experience.id) setEditingId(null);
    toast(`Removed “${experience.title}”`);
  }
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
        setExperiences(
          (payload.experiences as Experience[]).map((entry, index) => ({
            ...entry,
            id: entry.id ?? `experience-${index}-${entry.title}`,
          }))
        );
    },
  });
  function addExperience(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    const fields = { ...draft, title: draft.title.trim() };
    if (editingId) {
      setExperiences(current =>
        current.map(entry =>
          entry.id === editingId ? { ...entry, ...fields, updatedAt: today } : entry
        )
      );
      toast("Updated");
    } else {
      setExperiences(current => [
        ...current,
        { ...fields, id: `experience-${Date.now()}`, createdAt: today },
      ]);
      toast(`“${fields.title}” saved`);
    }
    setEditingId(null);
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
      className="journal-spread experiences-spread glass-scope"
      aria-labelledby="experiences-title"
    >
      <div className="spread-page experiences-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">goals & growth · experiences</p>
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
          <div className="career-form-actions">
            <Button type="submit" className="ink-button">
              <Plus size={15} /> {editingId ? "Save changes" : "Save experience"}
            </Button>
            {editingId ? (
              <button
                type="button"
                className="local-undo"
                onClick={() => {
                  setEditingId(null);
                  setDraft({
                    title: "",
                    date: "",
                    detail: "",
                    anticipation: "",
                    memory: "",
                    reflection: "",
                  });
                }}
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
        <div className="experience-list">
          <div>
            <span>memory map</span>
            <b>
              {experiences.length} moments
              {lastExperiences && (
                <button
                  type="button"
                  className="local-undo"
                  onClick={() => {
                    setExperiences(lastExperiences);
                    setLastExperiences(null);
                    toast("Experience restored");
                  }}
                >
                  Undo remove
                </button>
              )}
            </b>
          </div>
          {experiences.length === 0 ? (
            <small>
              Start with an experience you want to look forward to or remember
              with a little more care.
            </small>
          ) : (
            experiences.map(experience => (
              <article key={experience.id} className={cn(editingId === experience.id && "is-editing")}>
                <i>{experience.title.slice(0, 1)}</i>
                <p>
                  <b>{experience.title}</b>
                  <small>
                    {experience.date ? (<span className={cn("notebook-date", `is-${dateLabel(experience.date)!.kind}`)}>{dateLabel(experience.date)!.text}</span>) : "Date open"} ·{" "}
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
                  <small className="career-stamp">
                    {formatDay(experience.updatedAt)
                      ? `Updated ${formatDay(experience.updatedAt)}`
                      : formatDay(experience.createdAt)
                        ? `Saved ${formatDay(experience.createdAt)}`
                        : "Saved before dates were kept"}
                  </small>
                  <span className="career-actions">
                    <button type="button" onClick={() => editExperience(experience)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeExperience(experience)}
                      aria-label={`Remove ${experience.title}`}
                    >
                      Remove
                    </button>
                  </span>
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
    id?: string;
    title: string;
    project: string;
    rhythm: string;
    supplies: string;
    inspiration: string;
    reflection: string;
    createdAt?: string;
    updatedAt?: string;
  };
  const [hobbies, setHobbies] = useState<Hobby[]>([]);
  const [lastHobbys, setLastHobbys] = useState<Hobby[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const today = sleepDateInputValue(new Date());
  const formatDay = (value?: string) =>
    value && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;
  function editHobby(hobby: Hobby) {
    setEditingId(hobby.id ?? null);
    setDraft({
      title: hobby.title,
      project: hobby.project,
      rhythm: hobby.rhythm,
      supplies: hobby.supplies,
      inspiration: hobby.inspiration,
      reflection: hobby.reflection,
    });
  }
  function removeHobby(hobby: Hobby) {
    setLastHobbys(hobbies);
    setHobbies(current => current.filter(entry => entry.id !== hobby.id));
    if (editingId === hobby.id) setEditingId(null);
    toast(`Removed “${hobby.title}”`);
  }
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
        setHobbies(
          (payload.hobbies as Hobby[]).map((entry, index) => ({
            ...entry,
            id: entry.id ?? `hobby-${index}-${entry.title}`,
          }))
        );
    },
  });
  function addHobby(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    const fields = { ...draft, title: draft.title.trim() };
    if (editingId) {
      setHobbies(current =>
        current.map(entry =>
          entry.id === editingId ? { ...entry, ...fields, updatedAt: today } : entry
        )
      );
      toast("Updated");
    } else {
      setHobbies(current => [
        ...current,
        { ...fields, id: `hobby-${Date.now()}`, createdAt: today },
      ]);
      toast(`“${fields.title}” saved`);
    }
    setEditingId(null);
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
      className="journal-spread hobbies-spread glass-scope"
      aria-labelledby="hobbies-title"
    >
      <div className="spread-page hobbies-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">goals & growth · hobbies</p>
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
          <div className="career-form-actions">
            <Button type="submit" className="ink-button">
              <Plus size={15} /> {editingId ? "Save changes" : "Save hobby space"}
            </Button>
            {editingId ? (
              <button
                type="button"
                className="local-undo"
                onClick={() => {
                  setEditingId(null);
                  setDraft({
                    title: "",
                    project: "",
                    rhythm: "When I have time",
                    supplies: "",
                    inspiration: "",
                    reflection: "",
                  });
                }}
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
        <div className="hobby-list">
          <div>
            <span>creative notebook</span>
            <b>
              {hobbies.length} interests
              {lastHobbys && (
                <button
                  type="button"
                  className="local-undo"
                  onClick={() => {
                    setHobbies(lastHobbys);
                    setLastHobbys(null);
                    toast("Hobby restored");
                  }}
                >
                  Undo remove
                </button>
              )}
            </b>
          </div>
          {hobbies.length === 0 ? (
            <small>
              Start with the interest that would feel good to return to, even
              briefly.
            </small>
          ) : (
            hobbies.map(hobby => (
              <article key={hobby.id} className={cn(editingId === hobby.id && "is-editing")}>
                <i>{hobby.title.slice(0, 1)}</i>
                <p>
                  <b>{hobby.title}</b>
                  <small>
                    {hobby.project || "Project to be chosen"} · {hobby.rhythm}
                  </small>
                  <em>Supplies: {hobby.supplies || "Noted when useful"}</em>
                  <em>Inspiration: {hobby.inspiration || "Add a spark"}</em>
                  <em>Reflection: {hobby.reflection || "Add a small note"}</em>
                  <small className="career-stamp">
                    {formatDay(hobby.updatedAt)
                      ? `Updated ${formatDay(hobby.updatedAt)}`
                      : formatDay(hobby.createdAt)
                        ? `Saved ${formatDay(hobby.createdAt)}`
                        : "Saved before dates were kept"}
                  </small>
                  <span className="career-actions">
                    <button type="button" onClick={() => editHobby(hobby)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeHobby(hobby)}
                      aria-label={`Remove ${hobby.title}`}
                    >
                      Remove
                    </button>
                  </span>
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
    id?: string;
    label: string;
    plan: string;
    date: string;
    care: string;
    followThrough: string;
    reminder: string;
    createdAt?: string;
    updatedAt?: string;
  };
  const [plans, setPlans] = useState<FamilyPlan[]>([]);
  const [lastFamilyPlans, setLastFamilyPlans] = useState<FamilyPlan[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const today = sleepDateInputValue(new Date());
  const formatDay = (value?: string) =>
    value && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;
  function dateLabel(value: string) {
    if (!value) return null;
    const detail = assignmentDueDetail(value, today);
    const days = detail.daysAway ?? 0;
    const abs = Math.abs(days);
    const rel =
      detail.kind === "today"
        ? "today"
        : detail.kind === "tomorrow"
          ? "tomorrow"
          : days < 0
            ? `${abs} day${abs === 1 ? "" : "s"} ago`
            : `in ${days} days`;
    return { text: `${detail.exact} · ${rel}`, kind: detail.kind };
  }
  function editFamilyPlan(plan: FamilyPlan) {
    setEditingId(plan.id ?? null);
    setDraft({
      label: plan.label,
      plan: plan.plan,
      date: plan.date,
      care: plan.care,
      followThrough: plan.followThrough,
      reminder: plan.reminder,
    });
  }
  function removeFamilyPlan(plan: FamilyPlan) {
    setLastFamilyPlans(plans);
    setPlans(current => current.filter(entry => entry.id !== plan.id));
    if (editingId === plan.id) setEditingId(null);
    toast(`Removed “${plan.label}”`);
  }
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
      if (Array.isArray(payload.plans)) setPlans(
          (payload.plans as FamilyPlan[]).map((entry, index) => ({
            ...entry,
            id: entry.id ?? `family-${index}-${entry.label}`,
          }))
        );
    },
  });
  function addPlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.label.trim() || !draft.plan.trim()) return;
    const fields = { ...draft, label: draft.label.trim(), plan: draft.plan.trim() };
    if (editingId) {
      setPlans(current =>
        current.map(entry =>
          entry.id === editingId ? { ...entry, ...fields, updatedAt: today } : entry
        )
      );
      toast("Updated");
    } else {
      setPlans(current => [
        ...current,
        { ...fields, id: `family-${Date.now()}`, createdAt: today },
      ]);
      toast(`“${fields.label}” saved`);
    }
    setEditingId(null);
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
      className="journal-spread family-spread glass-scope"
      aria-labelledby="family-title"
    >
      <div className="spread-page family-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">life · family</p>
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
              Optional reminder{" "}
              <small>a note to yourself — this page doesn’t send reminders</small>
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
          <div className="career-form-actions">
            <Button type="submit" className="ink-button">
              <Plus size={15} /> {editingId ? "Save changes" : "Save family note"}
            </Button>
            {editingId ? (
              <button
                type="button"
                className="local-undo"
                onClick={() => {
                  setEditingId(null);
                  setDraft({
                    label: "",
                    plan: "",
                    date: "",
                    care: "",
                    followThrough: "",
                    reminder: "No reminder",
                  });
                }}
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
        <div className="family-list">
          <div>
            <span>family notebook</span>
            <b>
              {plans.length} notes
              {lastFamilyPlans && (
                <button
                  type="button"
                  className="local-undo"
                  onClick={() => {
                    setPlans(lastFamilyPlans);
                    setLastFamilyPlans(null);
                    toast("Family plan restored");
                  }}
                >
                  Undo remove
                </button>
              )}
            </b>
          </div>
          {plans.length === 0 ? (
            <small>
              Start with a person, date, or shared plan you would like to hold
              with care.
            </small>
          ) : (
            plans.map(plan => (
              <article key={plan.id} className={cn(editingId === plan.id && "is-editing")}>
                <i>{plan.label.slice(0, 1)}</i>
                <p>
                  <b>{plan.label}</b>
                  <small>
                    {plan.plan}
                    {plan.date ? (
                      <>
                        {" · "}
                        <span className={cn("notebook-date", `is-${dateLabel(plan.date)!.kind}`)}>
                          {dateLabel(plan.date)!.text}
                        </span>
                      </>
                    ) : null}{" "}
                    · {plan.reminder}
                  </small>
                  <em>Care: {plan.care || "Add a care note if helpful"}</em>
                  <em>
                    Next:{" "}
                    {plan.followThrough || "Choose a small follow-through"}
                  </em>
                  <small className="career-stamp">
                    {formatDay(plan.updatedAt)
                      ? `Updated ${formatDay(plan.updatedAt)}`
                      : formatDay(plan.createdAt)
                        ? `Saved ${formatDay(plan.createdAt)}`
                        : "Saved before dates were kept"}
                  </small>
                  <span className="career-actions">
                    <button type="button" onClick={() => editFamilyPlan(plan)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFamilyPlan(plan)}
                      aria-label={`Remove ${plan.label}`}
                    >
                      Remove
                    </button>
                  </span>
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
    id?: string;
    role: string;
    organization: string;
    deadline: string;
    material: string;
    followUp: string;
    status: string;
    reflection: string;
    createdAt?: string;
    updatedAt?: string;
  };
  type ApplicationDraft = Pick<
    Application,
    "role" | "organization" | "deadline" | "material" | "followUp" | "status" | "reflection"
  >;
  const emptyApplication: ApplicationDraft = {
    role: "",
    organization: "",
    deadline: "",
    material: "",
    followUp: "",
    status: "Considering",
    reflection: "",
  };
  const [applications, setApplications] = useState<Application[]>([]);
  const [lastApplications, setLastApplications] = useState<Application[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ApplicationDraft>(emptyApplication);
  const today = sleepDateInputValue(new Date());
  const formatDay = (value?: string) =>
    value && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;
  const closedStatuses = new Set(["Closed"]);
  function deadlineChip(application: Application) {
    if (!application.deadline) return null;
    const detail = assignmentDueDetail(application.deadline, today);
    if (closedStatuses.has(application.status) || application.status === "Applied" || application.status === "Interviewing")
      return { kind: "done", label: `deadline was ${detail.exact}` };
    const label =
      detail.kind === "overdue"
        ? `deadline passed · ${Math.abs(detail.daysAway ?? 0)} day${Math.abs(detail.daysAway ?? 0) === 1 ? "" : "s"} ago`
        : detail.kind === "today"
          ? "deadline today"
          : detail.kind === "tomorrow"
            ? "deadline tomorrow"
            : `${detail.daysAway} days to deadline · ${detail.exact}`;
    return { kind: detail.kind, label };
  }
  const sortedApplications = [...applications].sort((a, b) => {
    const aClosed = closedStatuses.has(a.status) ? 1 : 0;
    const bClosed = closedStatuses.has(b.status) ? 1 : 0;
    if (aClosed !== bClosed) return aClosed - bClosed;
    return (a.deadline || "9999").localeCompare(b.deadline || "9999");
  });
  useMongoJournalScope({
    scope: "internships",
    payload: { applications },
    hydrate: payload => {
      if (Array.isArray(payload.applications))
        setApplications(
          (payload.applications as Application[]).map((item, index) => ({
            ...item,
            id: item.id ?? `application-${index}-${item.role}`,
          }))
        );
    },
  });
  function saveApplication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.role.trim() || !draft.organization.trim()) return;
    const fields = {
      ...draft,
      role: draft.role.trim(),
      organization: draft.organization.trim(),
    };
    if (editingId) {
      setApplications(current =>
        current.map(item =>
          item.id === editingId ? { ...item, ...fields, updatedAt: today } : item
        )
      );
      toast(`${fields.role} at ${fields.organization} · now ${fields.status.toLowerCase()}`);
    } else {
      setApplications(current => [
        ...current,
        { ...fields, id: `application-${Date.now()}`, createdAt: today },
      ]);
      toast(`${fields.role} at ${fields.organization} saved`);
    }
    setDraft(emptyApplication);
    setEditingId(null);
  }
  function editApplication(item: Application) {
    setEditingId(item.id ?? null);
    setDraft({
      role: item.role,
      organization: item.organization,
      deadline: item.deadline,
      material: item.material,
      followUp: item.followUp,
      status: item.status,
      reflection: item.reflection,
    });
  }
  function setStatus(item: Application, status: string) {
    setApplications(current =>
      current.map(entry =>
        entry.id === item.id ? { ...entry, status, updatedAt: today } : entry
      )
    );
    toast(`${item.role} · ${status.toLowerCase()}`);
  }
  function removeApplication(item: Application) {
    setLastApplications(applications);
    setApplications(current => current.filter(entry => entry.id !== item.id));
    if (editingId === item.id) {
      setEditingId(null);
      setDraft(emptyApplication);
    }
    toast(`Removed ${item.role} at ${item.organization}`);
  }
  const statusOrder = ["Considering", "Preparing", "Applied", "Interviewing", "Closed"];
  return (
    <section
      className="journal-spread internships-spread glass-scope"
      aria-labelledby="internships-title"
    >
      <div className="spread-page internships-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">life · career · internship applications</p>
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
          <div className="career-form-actions">
            <Button type="submit" className="ink-button">
              <Plus size={15} />{" "}
              {editingId ? "Save changes" : "Save application"}
            </Button>
            {editingId ? (
              <button
                type="button"
                className="local-undo"
                onClick={() => {
                  setEditingId(null);
                  setDraft(emptyApplication);
                }}
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
        <div className="internships-list">
          <div>
            <span>application notes</span>
            <b>
              {applications.length} roles
              {applications.some(item => closedStatuses.has(item.status))
                ? ` · ${applications.filter(item => !closedStatuses.has(item.status)).length} open`
                : ""}
              {lastApplications && (
                <button
                  type="button"
                  className="local-undo"
                  onClick={() => {
                    setApplications(lastApplications);
                    setLastApplications(null);
                    toast("Application restored");
                  }}
                >
                  Undo remove
                </button>
              )}
            </b>
          </div>
          {applications.length === 0 ? (
            <small>
              Start with one opportunity that feels worth exploring at your own
              pace.
            </small>
          ) : (
            sortedApplications.map(application => {
              const chip = deadlineChip(application);
              const nextStatus =
                statusOrder[statusOrder.indexOf(application.status) + 1];
              return (
              <article
                key={application.id}
                className={cn(
                  editingId === application.id && "is-editing",
                  closedStatuses.has(application.status) && "is-closed",
                  chip && `is-${chip.kind}`
                )}
              >
                <i aria-hidden="true">{application.organization.slice(0, 1)}</i>
                <p>
                  <b>{application.role}</b>
                  <small>
                    {application.organization} · {application.status}
                    {chip ? (
                      <>
                        {" · "}
                        <span className={cn("internship-deadline", `is-${chip.kind}`)}>
                          {chip.label}
                        </span>
                      </>
                    ) : (
                      " · no deadline added"
                    )}
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
                  <small className="career-stamp">
                    {formatDay(application.updatedAt)
                      ? `Updated ${formatDay(application.updatedAt)}`
                      : formatDay(application.createdAt)
                        ? `Saved ${formatDay(application.createdAt)}`
                        : "Saved before dates were kept"}
                  </small>
                  <span className="career-actions">
                    {nextStatus ? (
                      <button
                        type="button"
                        onClick={() => setStatus(application, nextStatus)}
                      >
                        → {nextStatus}
                      </button>
                    ) : null}
                    <button type="button" onClick={() => editApplication(application)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeApplication(application)}
                      aria-label={`Remove ${application.role} at ${application.organization}`}
                    >
                      Remove
                    </button>
                  </span>
                </p>
              </article>
              );
            })
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
  const [changedAt, setChangedAt] = useState<string | null>(null);
  const auth = useAuth();
  useMongoJournalScope({
    scope: "cv",
    payload: { profile, changedAt },
    hydrate: payload => {
      if (payload.profile && typeof payload.profile === "object")
        setProfile(current => ({
          ...current,
          ...(payload.profile as Partial<typeof profile>),
        }));
      if (typeof payload.changedAt === "string") setChangedAt(payload.changedAt);
    },
  });
  function update<Key extends keyof typeof profile>(
    key: Key,
    value: (typeof profile)[Key]
  ) {
    setProfile(current => ({ ...current, [key]: value }));
    setChangedAt(new Date().toISOString());
  }
  const wordCount = [profile.summary, profile.experience, profile.skills, profile.education]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  const hasContent = wordCount > 0;
  function outlineText() {
    const section = (title: string, text: string) =>
      text.trim() ? `## ${title}\n${text.trim()}\n` : "";
    return [
      "# CV outline",
      `Readiness: ${profile.readiness}`,
      "",
      section("Profile summary", profile.summary),
      section("Experience", profile.experience),
      section("Skills", profile.skills),
      section("Education & learning", profile.education),
    ]
      .filter(Boolean)
      .join("\n")
      .trim() + "\n";
  }
  async function copyOutline() {
    try {
      await navigator.clipboard.writeText(outlineText());
      toast("CV outline copied as text");
    } catch {
      toast("Couldn’t reach the clipboard — use Download instead");
    }
  }
  function downloadOutline() {
    const url = URL.createObjectURL(
      new Blob([outlineText()], { type: "text/markdown;charset=utf-8" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `cv-outline-${sleepDateInputValue(new Date())}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast("CV outline downloaded");
  }
  function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }
  const formatWhen = (value: string) =>
    new Date(value).toLocaleString([], {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  return (
    <section className="journal-spread cv-spread glass-scope" aria-labelledby="cv-title">
      <div className="spread-page cv-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">life · career · CV</p>
        <h2 id="cv-title">
          Tell your story
          <br />
          <em>with quiet clarity.</em>
        </h2>
        <p className="page-intro">
          Shape a private CV outline around your strengths, evidence, and
          education. It is never published or submitted anywhere; copy or
          download it when you want to use it.
        </p>
        <div className="cv-signal" aria-live="polite">
          <Sparkles size={15} />
          <span>
            {changedAt
              ? `Saved as you type · ${wordCount} word${wordCount === 1 ? "" : "s"} · last change ${formatWhen(changedAt)}${auth.isAuthenticated ? " · synced to your account" : " · on this device"}`
              : "Saved as you type — nothing to press"}
          </span>
        </div>
      </div>
      <div className="spread-page cv-page">
        <form className="cv-form" onSubmit={saveProfile}>
          <label>
            Profile summary
            <textarea
              value={profile.summary}
              onChange={event => update("summary", event.target.value)}
              placeholder="The work you want to be known for"
              rows={4}
            />
          </label>
          <label>
            Experience evidence
            <textarea
              value={profile.experience}
              onChange={event => update("experience", event.target.value)}
              placeholder="Role, project, impact, or responsibility — one per line"
              rows={4}
            />
          </label>
          <label>
            Skills
            <textarea
              value={profile.skills}
              onChange={event => update("skills", event.target.value)}
              placeholder="Tools, strengths, or capabilities"
              rows={3}
            />
          </label>
          <label>
            Education & learning
            <textarea
              value={profile.education}
              onChange={event => update("education", event.target.value)}
              placeholder="Programme, course, credential, or study focus"
              rows={3}
            />
          </label>
          <label>
            Application readiness
            <select
              value={profile.readiness}
              onChange={event => update("readiness", event.target.value)}
            >
              <option>Drafting</option>
              <option>Needs a review</option>
              <option>Ready to tailor</option>
            </select>
          </label>
          <div className="cv-actions">
            <Button
              type="button"
              className="ink-button"
              onClick={copyOutline}
              disabled={!hasContent}
            >
              Copy as text
            </Button>
            <button
              type="button"
              onClick={downloadOutline}
              disabled={!hasContent}
            >
              Download .md
            </button>
            <small>
              {hasContent
                ? "Plain text with headings — paste it into any CV template."
                : "Write something above and it can be copied or downloaded."}
            </small>
          </div>
        </form>
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
    id?: string;
    name: string;
    status: string;
    date: string;
    evidence: string;
    renewal: string;
    reflection: string;
    createdAt?: string;
    updatedAt?: string;
  };
  type CertificationDraft = Pick<
    Certification,
    "name" | "status" | "date" | "evidence" | "renewal" | "reflection"
  >;
  const emptyCertDraft: CertificationDraft = {
    name: "",
    status: "Exploring",
    date: "",
    evidence: "",
    renewal: "",
    reflection: "",
  };
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [lastCerts, setLastCerts] = useState<Certification[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CertificationDraft>(emptyCertDraft);
  const today = sleepDateInputValue(new Date());
  const formatDay = (value?: string) =>
    value && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;
  function dateChip(certification: Certification) {
    if (!certification.date) return null;
    const detail = assignmentDueDetail(certification.date, today);
    const earned = certification.status === "Earned";
    const label = earned
      ? `earned ${detail.exact}`
      : detail.kind === "overdue"
        ? `date passed · ${Math.abs(detail.daysAway ?? 0)} day${Math.abs(detail.daysAway ?? 0) === 1 ? "" : "s"} ago`
        : detail.kind === "today"
          ? "today"
          : detail.kind === "tomorrow"
            ? "tomorrow"
            : `${detail.daysAway} days away · ${detail.exact}`;
    return { kind: earned ? "earned" : detail.kind, label };
  }
  useMongoJournalScope({
    scope: "certifications",
    payload: { certifications },
    hydrate: payload => {
      if (Array.isArray(payload.certifications))
        setCertifications(
          (payload.certifications as Certification[]).map((item, index) => ({
            ...item,
            id: item.id ?? `cert-${index}-${item.name}`,
          }))
        );
    },
  });
  function saveCertification(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim()) return;
    const fields = { ...draft, name: draft.name.trim() };
    if (editingId) {
      setCertifications(current =>
        current.map(item =>
          item.id === editingId ? { ...item, ...fields, updatedAt: today } : item
        )
      );
      toast("Certification updated");
    } else {
      setCertifications(current => [
        ...current,
        { ...fields, id: `cert-${Date.now()}`, createdAt: today },
      ]);
      toast(`“${fields.name}” saved · ${fields.status.toLowerCase()}`);
    }
    setDraft(emptyCertDraft);
    setEditingId(null);
  }
  function editCertification(item: Certification) {
    setEditingId(item.id ?? null);
    setDraft({
      name: item.name,
      status: item.status,
      date: item.date,
      evidence: item.evidence,
      renewal: item.renewal,
      reflection: item.reflection,
    });
  }
  function removeCertification(item: Certification) {
    setLastCerts(certifications);
    setCertifications(current => current.filter(entry => entry.id !== item.id));
    if (editingId === item.id) {
      setEditingId(null);
      setDraft(emptyCertDraft);
    }
    toast(`Removed “${item.name}”`);
  }
  return (
    <section
      className="journal-spread certifications-spread glass-scope"
      aria-labelledby="certifications-title"
    >
      <div className="spread-page certifications-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">life · career · certifications</p>
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
          <div className="career-form-actions">
            <Button type="submit" className="ink-button">
              <Plus size={15} />{" "}
              {editingId ? "Save changes" : "Save certification"}
            </Button>
            {editingId ? (
              <button
                type="button"
                className="local-undo"
                onClick={() => {
                  setEditingId(null);
                  setDraft(emptyCertDraft);
                }}
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
        <div className="certifications-list">
          <div>
            <span>credential notebook</span>
            <b>
              {certifications.length} items
              {lastCerts && (
                <button
                  type="button"
                  className="local-undo"
                  onClick={() => {
                    setCertifications(lastCerts);
                    setLastCerts(null);
                    toast("Certification restored");
                  }}
                >
                  Undo remove
                </button>
              )}
            </b>
          </div>
          {certifications.length === 0 ? (
            <small>
              Start with a credential you are curious to explore or already
              proud to have earned.
            </small>
          ) : (
            certifications.map(certification => (
              <article
                key={certification.id}
                className={cn(editingId === certification.id && "is-editing")}
              >
                <i aria-hidden="true">{certification.name.slice(0, 1)}</i>
                <p>
                  <b>{certification.name}</b>
                  <small>
                    {certification.status} ·{" "}
                    {dateChip(certification) ? (
                      <span
                        className={cn(
                          "certification-date",
                          `is-${dateChip(certification)!.kind}`
                        )}
                      >
                        {dateChip(certification)!.label}
                      </span>
                    ) : (
                      "date open"
                    )}
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
                  <small className="career-stamp">
                    {formatDay(certification.updatedAt)
                      ? `Updated ${formatDay(certification.updatedAt)}`
                      : formatDay(certification.createdAt)
                        ? `Saved ${formatDay(certification.createdAt)}`
                        : "Saved before dates were kept"}
                  </small>
                  <span className="career-actions">
                    <button
                      type="button"
                      onClick={() => editCertification(certification)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCertification(certification)}
                      aria-label={`Remove ${certification.name}`}
                    >
                      Remove
                    </button>
                  </span>
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
    id?: string;
    title: string;
    status: string;
    milestone: string;
    evidence: string;
    closeout: string;
    createdAt?: string;
    updatedAt?: string;
  };
  type ProjectDraft = Pick<
    Project,
    "title" | "status" | "milestone" | "evidence" | "closeout"
  >;
  const emptyProjectDraft: ProjectDraft = {
    title: "",
    status: "Planning",
    milestone: "",
    evidence: "",
    closeout: "",
  };
  const [projects, setProjects] = useState<Project[]>([]);
  const [lastProjects, setLastProjects] = useState<Project[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProjectDraft>(emptyProjectDraft);
  const today = sleepDateInputValue(new Date());
  const formatDay = (value?: string) =>
    value && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;
  useMongoJournalScope({
    scope: "projects",
    payload: { projects },
    hydrate: payload => {
      if (Array.isArray(payload.projects))
        setProjects(
          (payload.projects as Project[]).map((project, index) => ({
            ...project,
            id: project.id ?? `project-${index}-${project.title}`,
          }))
        );
    },
  });
  function saveProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    const fields = { ...draft, title: draft.title.trim() };
    if (editingId) {
      setProjects(current =>
        current.map(project =>
          project.id === editingId
            ? { ...project, ...fields, updatedAt: today }
            : project
        )
      );
      toast("Project updated");
    } else {
      setProjects(current => [
        ...current,
        { ...fields, id: `project-${Date.now()}`, createdAt: today },
      ]);
      toast(`“${fields.title}” saved as ${fields.status.toLowerCase()}`);
    }
    setDraft(emptyProjectDraft);
    setEditingId(null);
  }
  function editProject(project: Project) {
    setEditingId(project.id ?? null);
    setDraft({
      title: project.title,
      status: project.status,
      milestone: project.milestone,
      evidence: project.evidence,
      closeout: project.closeout,
    });
  }
  function removeProject(project: Project) {
    setLastProjects(projects);
    setProjects(current => current.filter(item => item.id !== project.id));
    if (editingId === project.id) {
      setEditingId(null);
      setDraft(emptyProjectDraft);
    }
    toast(`Removed “${project.title}”`);
  }
  return (
    <section
      className="journal-spread projects-spread glass-scope"
      aria-labelledby="projects-title"
    >
      <div className="spread-page projects-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">life · career · projects</p>
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
          <div className="career-form-actions">
            <Button type="submit" className="ink-button">
              <Plus size={15} /> {editingId ? "Save changes" : "Save project"}
            </Button>
            {editingId ? (
              <button
                type="button"
                className="local-undo"
                onClick={() => {
                  setEditingId(null);
                  setDraft(emptyProjectDraft);
                }}
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
        <div className="projects-list">
          <div>
            <span>project field notes</span>
            <b>
              {projects.length} items
              {lastProjects && (
                <button
                  type="button"
                  className="local-undo"
                  onClick={() => {
                    setProjects(lastProjects);
                    setLastProjects(null);
                    toast("Project restored");
                  }}
                >
                  Undo remove
                </button>
              )}
            </b>
          </div>
          {projects.length === 0 ? (
            <small>
              Start with one project that deserves a clear next milestone.
            </small>
          ) : (
            projects.map(project => (
              <article
                key={project.id}
                className={cn(editingId === project.id && "is-editing")}
              >
                <i aria-hidden="true">{project.title.slice(0, 1)}</i>
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
                  <small className="career-stamp">
                    {formatDay(project.updatedAt)
                      ? `Updated ${formatDay(project.updatedAt)}`
                      : formatDay(project.createdAt)
                        ? `Saved ${formatDay(project.createdAt)}`
                        : "Saved before dates were kept"}
                  </small>
                  <span className="career-actions">
                    <button type="button" onClick={() => editProject(project)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeProject(project)}
                      aria-label={`Remove ${project.title}`}
                    >
                      Remove
                    </button>
                  </span>
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
  // Every module that records activity has a page; an entry can always be
  // opened at its source, not only the ones read back from page storage.
  const moduleViews: Record<string, View | undefined> = {
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
    "Menstrual health": "cycle",
    Water: "water",
    Environment: "environment",
    Responsibilities: "responsibilities",
    Purchases: "purchases",
    "Personal growth": "personalGrowth",
    Documents: "documents",
    Security: "security",
  };
  const unifiedEntries = useMemo(
    () =>
      [
        ...recent.map(entry => ({
          ...entry,
          detail: formatHistoryActivityMetric(entry.module, entry.amount),
          view: moduleViews[entry.module],
        })),
        ...savedRecords,
      ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [recent, savedRecords]
  );
  function formatWhen(value: string) {
    // Most "saved-record" sources (Achievements, Hobbies, Career, …) only
    // ever stored a bare "YYYY-MM-DD", never a time. Parsing that plain
    // reads it as UTC midnight — a day early west of Greenwich — and
    // showing an hour/minute on it invents a time of day that never
    // happened. Anchor to local noon and drop the clock for those.
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const date = isDateOnly ? new Date(`${value}T12:00:00`) : new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString([], {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
      ...(isDateOnly ? {} : { hour: "numeric", minute: "2-digit" }),
    });
  }
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
  function downloadHistoryCsv() {
    const escape = (value: string) =>
      /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
    const rows = filteredRecent.map(entry =>
      [entry.createdAt, entry.module, entry.label, entry.detail]
        .map(value => escape(String(value ?? "")))
        .join(",")
    );
    const csv = ["saved_at,module,label,detail", ...rows].join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `history-${sleepDateInputValue(new Date())}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast(`${filteredRecent.length} record${filteredRecent.length === 1 ? "" : "s"} exported`);
  }
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
      className="journal-spread history-spread glass-scope"
      aria-labelledby="history-title"
    >
      <div className="spread-page history-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">utilities · history</p>
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
              {filteredRecent.length > 0 && (
                <button
                  type="button"
                  className="history-export"
                  onClick={downloadHistoryCsv}
                >
                  Export shown as CSV
                </button>
              )}
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
                <i aria-hidden="true">{entry.module.slice(0, 1)}</i>
                <p>
                  <b>{entry.module}</b>
                  <small>
                    {entry.label} · {entry.detail} ·{" "}
                    <time dateTime={entry.createdAt}>
                      {formatWhen(entry.createdAt)}
                    </time>
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
  const [snoozedUntil, setSnoozedUntil] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  useMongoJournalScope({
    scope: "recommendations",
    payload: { enabled, state, duration, modules, showLessFrom, snoozedUntil },
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
      if (typeof payload.snoozedUntil === "number" || payload.snoozedUntil === null)
        setSnoozedUntil(payload.snoozedUntil as number | null);
    },
  });
  // "Not now" is a pause, not a dismissal: it comes back on its own.
  useEffect(() => {
    if (state !== "snoozed") return;
    if (snoozedUntil === null || snoozedUntil <= Date.now()) {
      setState("shown");
      setSnoozedUntil(null);
      return;
    }
    const timer = window.setTimeout(() => {
      setState("shown");
      setSnoozedUntil(null);
    }, Math.min(snoozedUntil - Date.now(), 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [state, snoozedUntil]);
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
      ? `${sourceCount} ${primary.label} ${sourceCount === 1 ? "record" : "records"} saved in your journal.`
      : primary.starter
    : "Choose at least one source to make a local optional prompt available.";
  const chooseFeedback = (message: string) => {
    setFeedback(message);
  };
  const showLess = () => {
    if (!primary) return;
    setShowLessFrom(current => ({ ...current, [primary.key]: true }));
    setFeedback(
      `Showing less from ${primary.label} until you restore it below.`
    );
    setState("shown");
  };
  return (
    <section
      className="journal-spread recommendations-spread glass-scope"
      aria-labelledby="recommendations-title"
    >
      <div className="spread-page recommendations-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">utilities · recommendations</p>
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
            <small>saved with your journal</small>
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
                  "All selected sources are available again."
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
                      `Marked helpful. ${primary.label} stays available.`
                    )
                  }
                >
                  Helpful
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setState("snoozed");
                    setSnoozedUntil(Date.now() + 24 * 60 * 60 * 1000);
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
                    ? `${activity.filter(entry => entry.module === alternative.module).length} ${alternative.label} record${activity.filter(entry => entry.module === alternative.module).length === 1 ? "" : "s"} saved in your journal.`
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
              {Object.values(showLessFrom).some(Boolean)
                ? "Every ticked source is muted with “Show less”. Restore one below, or tick another."
                : "Choose one or more sources above. Recommendations never fill this space with a generic score or hidden data."}
            </small>
          </div>
        ) : enabled ? (
          <div className="recommendation-return">
            <b>
              {state === "snoozed"
                ? `Paused${snoozedUntil ? ` until ${new Date(snoozedUntil).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}` : ""}`
                : "Recommendation dismissed"}
            </b>
            <small>
              {state === "snoozed"
                ? "It comes back on its own then, or sooner if you ask."
                : "It stays dismissed until you show it again."}
            </small>
            <button
              type="button"
              onClick={() => {
                setState("shown");
                setSnoozedUntil(null);
              }}
            >
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
        {Object.entries(showLessFrom).some(([, muted]) => muted) ? (
          <div className="recommendation-muted">
            <span>Showing less from</span>
            {recommendationSources
              .filter(source => showLessFrom[source.key])
              .map(source => (
                <button
                  type="button"
                  key={source.key}
                  onClick={() => {
                    setShowLessFrom(current => ({ ...current, [source.key]: false }));
                    setFeedback(`${source.label} restored.`);
                  }}
                  aria-label={`Restore ${source.label}`}
                >
                  {source.label} · restore
                </button>
              ))}
          </div>
        ) : null}
        <section className="recommendation-boundary">
          <b>How these prompts work</b>
          <span>
            They use only the sources you include and entries you explicitly
            saved in your journal. They do not inspect devices,
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
  onNavigate,
}: {
  onContents: () => void;
  onCover: () => void;
  onNavigate: (destination: View) => void;
}) {
  const auth = useAuth();
  const journal = useRecordStore();
  const [selected, setSelected] = useState({
    records: true,
    workspaces: true,
    sensitive: false,
    settings: true,
  });
  const [lastExport, setLastExport] = useState<{
    at: string;
    fileName: string;
    bytes: number;
  } | null>(null);
  const [csvScope, setCsvScope] = useState("");
  useMongoJournalScope({
    scope: "export",
    payload: { selected },
    hydrate: payload => {
      if (payload.selected && typeof payload.selected === "object")
        setSelected(current => ({
          ...current,
          ...(payload.selected as Partial<typeof selected>),
        }));
    },
  });

  // Page workspaces persist under one key prefix per owner; the shell key
  // holds settings and the year grids. Sensitive scopes are named so they
  // can be left out unless deliberately included.
  const ownerKey = auth.user?.id ?? "guest";
  const keyPrefix = "glory-personal-tracker:";
  const keySuffix = `:${ownerKey}`;
  const sensitiveScopes = new Set([
    "cycle",
    "finances",
    "wellbeing",
    "documents",
    "security",
    "privacy",
  ]);
  const workspaceLabels: Record<string, string> = {
    "journal-shell": "Settings & year grids",
    habits: "Habits",
    cycle: "Period & Cycle",
    wellbeing: "Wellbeing",
    reflections: "Reflections",
    learning: "Learning",
    finances: "Finances",
    productivity: "Productivity",
    "digital-life": "Digital Life",
    "workout-studio": "Workout Studio",
    assignments: "Assignments",
    analytics: "Analytics view",
    integrations: "Integrations notes",
    export: "Export choices",
  };
  const workspaces = useMemo(() => {
    const found: Array<{
      scope: string;
      label: string;
      bytes: number;
      sensitive: boolean;
    }> = [];
    try {
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (!key || !key.startsWith(keyPrefix) || !key.endsWith(keySuffix))
          continue;
        const scope = key.slice(keyPrefix.length, key.length - keySuffix.length);
        const raw = window.localStorage.getItem(key) ?? "";
        found.push({
          scope,
          label: workspaceLabels[scope] ?? scope,
          bytes: raw.length,
          sensitive: sensitiveScopes.has(scope),
        });
      }
    } catch {
      // Storage unavailable (private window, blocked) — the export still
      // works for the record store; the manifest just says so.
    }
    return found.sort((a, b) => a.label.localeCompare(b.label));
    // Recomputed after a download or an owner change; localStorage has no
    // change event for same-tab writes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerKey, lastExport]);

  const bundle = useMemo(() => journal.exportAll(), [journal]);
  const recordScopes = Object.entries(bundle.counts).sort((a, b) =>
    a[0].localeCompare(b[0])
  );
  const recordSensitive = new Set(["cycle", "finance", "finances", "wellbeing"]);
  const includedRecordScopes = recordScopes.filter(
    ([scope]) => selected.sensitive || !recordSensitive.has(scope)
  );
  const pageWorkspaces = workspaces.filter(
    item => item.scope !== "journal-shell" && item.scope !== "export"
  );
  const includedWorkspaces = pageWorkspaces.filter(
    item => selected.sensitive || !item.sensitive
  );
  const shell = workspaces.find(item => item.scope === "journal-shell");
  const excludedSensitive = Array.from(
    new Set([
      ...recordScopes
        .filter(([scope]) => recordSensitive.has(scope))
        .map(([scope]) => scope),
      ...pageWorkspaces.filter(item => item.sensitive).map(item => item.label),
    ])
  );
  const totalRecords = includedRecordScopes.reduce(
    (sum, [, count]) => sum + count,
    0
  );

  function readWorkspace(scope: string) {
    try {
      const raw = window.localStorage.getItem(
        `${keyPrefix}${scope}${keySuffix}`
      );
      return raw ? (JSON.parse(raw) as unknown) : null;
    } catch {
      return null;
    }
  }
  function download(name: string, text: string, type: string) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
    setLastExport({
      at: new Date().toISOString(),
      fileName: name,
      bytes: blob.size,
    });
  }
  function downloadExport() {
    const stamp = sleepDateInputValue(new Date());
    const payload = {
      formatVersion: bundle.formatVersion,
      exportedAt: new Date().toISOString(),
      generatedBy:
        "Glory Mukami's Personal Tracker — built in your browser; nothing was uploaded to make this file",
      owner: bundle.owner,
      included: { ...selected },
      readme: bundle.readme,
      dictionary: selected.records ? bundle.dictionary : undefined,
      counts: selected.records
        ? Object.fromEntries(includedRecordScopes)
        : undefined,
      records: selected.records
        ? bundle.records.filter(
            record => selected.sensitive || !recordSensitive.has(record.scope)
          )
        : undefined,
      links: selected.records ? bundle.links : undefined,
      workspaces: selected.workspaces
        ? Object.fromEntries(
            includedWorkspaces.map(item => [
              item.scope,
              readWorkspace(item.scope),
            ])
          )
        : undefined,
      settings:
        selected.settings && shell ? readWorkspace("journal-shell") : undefined,
    };
    const name = `personal-tracker-export-${stamp}.json`;
    download(name, JSON.stringify(payload, null, 2), "application/json");
    toast(`Export saved as ${name}`);
  }
  function downloadCsv() {
    if (!csvScope) return;
    const records = bundle.records.filter(record => record.scope === csvScope);
    const name = `${csvScope}-${sleepDateInputValue(new Date())}.csv`;
    download(
      name,
      toCSV(records, bundle.owner.timezone),
      "text/csv;charset=utf-8"
    );
    toast(
      `${records.length} ${csvScope} record${records.length === 1 ? "" : "s"} saved as ${name}`
    );
  }
  const nothingSelected =
    !selected.records && !selected.workspaces && !selected.settings;
  const formatBytes = (bytes: number) =>
    bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
  const formatTime = (value: string) =>
    new Date(value).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <section
      className="journal-spread export-spread glass-scope"
      aria-labelledby="export-title"
    >
      <div className="spread-page export-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">
          utilities · export
        </p>
        <h2 id="export-title">
          Keep a copy
          <br />
          <em>on your terms.</em>
        </h2>
        <p className="page-intro">
          Everything this journal holds for you, as a file you own. The file is
          built in your browser and saved to your device; nothing is uploaded
          anywhere to make it.
        </p>
        <div className="export-signal">
          <Sparkles size={15} />
          <span>
            {lastExport
              ? `Last export ${formatTime(lastExport.at)} · ${lastExport.fileName} · ${formatBytes(lastExport.bytes)}`
              : "No export yet this visit"}
          </span>
        </div>
      </div>
      <div className="spread-page export-page">
        <div className="export-scope">
          <span>Choose what to include</span>
          <label>
            <input
              type="checkbox"
              checked={selected.records}
              onChange={() =>
                setSelected(current => ({
                  ...current,
                  records: !current.records,
                }))
              }
            />
            <b>Records</b>
            <small>
              {bundle.records.length === 0
                ? "Nothing saved yet"
                : `${bundle.records.length} across ${recordScopes.length} area${recordScopes.length === 1 ? "" : "s"}: ${recordScopes.map(([scope, count]) => `${scope} (${count})`).join(", ")}`}
            </small>
          </label>
          <label>
            <input
              type="checkbox"
              checked={selected.workspaces}
              onChange={() =>
                setSelected(current => ({
                  ...current,
                  workspaces: !current.workspaces,
                }))
              }
            />
            <b>Page workspaces</b>
            <small>
              {pageWorkspaces.length === 0
                ? "None found on this device"
                : `${includedWorkspaces.length} of ${pageWorkspaces.length} on this device: ${includedWorkspaces.map(item => item.label).join(", ") || "none unless sensitive areas are included"}`}
            </small>
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
            <b>Include sensitive areas</b>
            <small>
              {excludedSensitive.length
                ? `Off by default: ${excludedSensitive.join(", ")}. Tick to include them.`
                : "Nothing sensitive is stored yet; this box has nothing to add."}
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
            <b>Settings & year grids</b>
            <small>
              {shell
                ? `Display, reminder and privacy preferences plus the annual pixel grids (${formatBytes(shell.bytes)})`
                : "Not found on this device"}
            </small>
          </label>
        </div>
        <div className="export-manifest" aria-live="polite">
          <b>This file will contain</b>
          <small>
            {nothingSelected
              ? "Nothing — tick at least one box above."
              : [
                  selected.records
                    ? `${totalRecords} record${totalRecords === 1 ? "" : "s"}${bundle.links.length ? ` and ${bundle.links.length} link${bundle.links.length === 1 ? "" : "s"} between them` : ""}`
                    : null,
                  selected.workspaces
                    ? `${includedWorkspaces.length} page workspace${includedWorkspaces.length === 1 ? "" : "s"}`
                    : null,
                  selected.settings && shell ? "settings and year grids" : null,
                ]
                  .filter(Boolean)
                  .join(" · ") +
                (selected.sensitive
                  ? " · sensitive areas included"
                  : excludedSensitive.length
                    ? " · sensitive areas left out"
                    : "")}
          </small>
        </div>
        <Button
          type="button"
          className="ink-button"
          onClick={downloadExport}
          disabled={nothingSelected}
        >
          <ArrowRight size={15} /> Download JSON export
        </Button>
        <div className="export-csv">
          <label>
            One area as CSV
            <select
              value={csvScope}
              onChange={event => setCsvScope(event.target.value)}
            >
              <option value="">Choose an area…</option>
              {recordScopes.map(([scope, count]) => (
                <option key={scope} value={scope}>
                  {scope} · {count}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={downloadCsv} disabled={!csvScope}>
            Download CSV
          </button>
        </div>
        {lastExport ? (
          <small className="export-confirmation">
            Saved {lastExport.fileName} ({formatBytes(lastExport.bytes)}) to
            your device at {formatTime(lastExport.at)}. Open it before sharing
            it anywhere.
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
  // Sample wording only — these six cards show how much a reminder from
  // each area would reveal under the chosen preview mode. They are not
  // real reminders and none of these items exist in the journal.
  const reminders = [
    ["assignments", "Assignment", "Sample: an assignment is due tomorrow"],
    ["habits", "Habit", "Sample: an evening habit is ready"],
    ["period", "Period", "Sample: cycle check-in"],
    ["documents", "Document", "Sample: a document renewal is approaching"],
    ["responsibilities", "Responsibility", "Sample: a recurring task is due"],
    ["security", "Security", "Sample: a security review is due"],
  ] as const;
  const [lastReminders, setLastReminders] = useState<LocalReminder[] | null>(
    null
  );
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
    // Otherwise a second reminder added right after the first defaults to
    // the same due time — easy to miss and save by accident.
    setDraftDueAt(() => {
      const date = new Date(Date.now() + 60 * 60 * 1000);
      date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      return date.toISOString().slice(0, 16);
    });
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
      className="journal-spread notifications-spread glass-scope"
      aria-labelledby="notifications-title"
    >
      <div className="spread-page notifications-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">utilities · reminder preview</p>
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
          <span>how a reminder would read</span>
          <b>Preview mode: {previewMode}</b>
        </div>
        <small className="notification-sample-note">
          Sample wording, not real reminders: these show how much each area
          would reveal on a lock screen under the preview mode above. The
          on/off and timing choices are saved, but they are not yet connected
          to any page’s dates — nothing here schedules on its own. Only the
          reminders you add further down actually fire.
        </small>
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
                <b>Sample · {kind}</b>
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
            {lastReminders && (
              <button
                type="button"
                className="local-undo"
                onClick={() => {
                  setLocalReminders(lastReminders);
                  setLastReminders(null);
                  toast("Reminder restored");
                }}
              >
                Undo remove
              </button>
            )}
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
                        <time dateTime={new Date(reminder.dueAt).toISOString()}>
                          {new Date(reminder.dueAt).toLocaleString([], {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </time>
                      </small>
                      <em>
                        {reminder.completed
                          ? "Completed"
                          : reminder.deliveredAt
                            ? reminder.deliveredAt - reminder.dueAt > 60_000
                              ? `Shown late, at ${new Date(reminder.deliveredAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} — this tab wasn't open at the due time`
                              : `Shown at ${new Date(reminder.deliveredAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                            : reminder.dueAt < Date.now()
                              ? "Due — will show as soon as this tab is open"
                              : "Pending · fires while this tab is open"}
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
                        onClick={() => {
                          setLastReminders(localReminders);
                          setLocalReminders(current =>
                            current.filter(item => item.id !== reminder.id)
                          );
                          toast(`Removed reminder “${reminder.title}”`);
                        }}
                        aria-label={`Remove reminder ${reminder.title}`}
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
          What is true today: the reminders you add above fire while this
          site is open in a tab, as a browser notification if you allowed it
          and as an in-page notice otherwise; one that falls due while the
          tab is closed shows the next time it opens, marked late. The
          per-area on/off and timing preferences are saved but do not yet
          schedule anything from your pages’ dates. There is no
          operating-system or background delivery.
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
  const auth = useAuth();
  const journal = useRecordStore();
  const deleteAccount = trpc.auth.deleteAccount.useMutation();
  const [deleteTarget, setDeleteTarget] = useState<
    "device" | "account" | null
  >(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const confirmed = confirmText.trim().toLowerCase() === "delete everything";
  const recordCount = journal.exportAll().records.length;
  function cancelDelete() {
    setDeleteTarget(null);
    setConfirmText("");
  }
  async function eraseDevice() {
    if (!confirmed) return;
    setDeleting(true);
    try {
      const result = await eraseLocalJournalData();
      toast(
        `Erased this device's copy: ${result.keys} stored item${result.keys === 1 ? "" : "s"}${result.database ? " and the local database" : ""}. Reloading.`
      );
      window.setTimeout(() => window.location.reload(), 900);
    } catch {
      setDeleting(false);
      toast("Couldn't erase everything — try clearing site data in your browser settings");
    }
  }
  async function eraseAccount() {
    if (!confirmed || !auth.isAuthenticated) return;
    setDeleting(true);
    try {
      const result = await deleteAccount.mutateAsync({
        confirm: "delete everything",
      });
      await eraseLocalJournalData();
      toast(
        `Account deleted: ${result.deleted} record${result.deleted === 1 ? "" : "s"}, ${result.workspaces} page workspace${result.workspaces === 1 ? "" : "s"}, ${result.events} event${result.events === 1 ? "" : "s"} removed from the server, and this device's copy erased. Reloading.`
      );
      window.setTimeout(() => window.location.reload(), 1400);
    } catch (error) {
      setDeleting(false);
      toast(
        `The server refused the deletion${error instanceof Error && error.message ? `: ${error.message}` : ""}. Nothing was removed; your account still exists, so you can try again.`
      );
    }
  }
  return (
    <section
      className="journal-spread privacy-spread glass-scope"
      aria-labelledby="privacy-title"
    >
      <div className="spread-page privacy-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">utilities · privacy controls</p>
        <h2 id="privacy-title">
          Keep sensitive
          <br />
          <em>things in your hands.</em>
        </h2>
        <p className="page-intro">
          What this journal shows of your sensitive pages, and — further down —
          how to remove what it holds, on this device or from your account.
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
        <SettingsPanel />
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
            Preview setting: {previewMode}. These are display preferences; they
            change what is shown, not what is stored.
          </small>
        </div>
        <section className="privacy-delete" aria-labelledby="privacy-delete-title">
          <div>
            <span id="privacy-delete-title">Delete your data</span>
            <b>
              {recordCount} record{recordCount === 1 ? "" : "s"} on this device
            </b>
          </div>
          <p>
            Two separate things can be removed. Each asks you to type{" "}
            <code>delete everything</code> first, and neither can be undone.
          </p>
          <div className="privacy-delete-options">
            <article>
              <b>Erase this device’s copy</b>
              <small>
                Removes every record, page workspace, setting and year grid
                stored in this browser, then reloads.{" "}
                {auth.isAuthenticated
                  ? "Your account copy on the server is untouched and will sync back down if you sign in again."
                  : "You are not signed in, so this is the only copy — it will be gone."}
              </small>
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget("device");
                  setConfirmText("");
                }}
                disabled={deleting}
              >
                Erase this device…
              </button>
            </article>
            <article>
              <b>Delete account and everything on the server</b>
              <small>
                {auth.isAuthenticated
                  ? `Removes ${auth.user?.email ?? "your account"} and all its records, page workspaces and events from the server, erases this device's copy, and signs you out. Other devices keep their local copy until they are erased too.`
                  : "Sign in first — there is no account to delete while signed out."}
              </small>
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget("account");
                  setConfirmText("");
                }}
                disabled={deleting || !auth.isAuthenticated}
              >
                Delete account…
              </button>
            </article>
          </div>
          {deleteTarget && (
            <div className="privacy-delete-confirm" role="alertdialog" aria-labelledby="privacy-confirm-title">
              <b id="privacy-confirm-title">
                {deleteTarget === "device"
                  ? "Erase everything stored on this device?"
                  : "Delete your account and everything on the server?"}
              </b>
              <label>
                Type <code>delete everything</code> to confirm
                <input
                  value={confirmText}
                  onChange={event => setConfirmText(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={deleting}
                />
              </label>
              <div>
                <button
                  type="button"
                  className="is-danger"
                  disabled={!confirmed || deleting}
                  onClick={deleteTarget === "device" ? eraseDevice : eraseAccount}
                >
                  {deleting
                    ? "Deleting…"
                    : deleteTarget === "device"
                      ? "Erase this device now"
                      : "Delete my account now"}
                </button>
                <button type="button" onClick={cancelDelete} disabled={deleting}>
                  Keep everything
                </button>
              </div>
            </div>
          )}
        </section>
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
  const visibleDays = Array.from(
    new Set(
      reviewActivity.map(entry => {
        // recordedOn is a local calendar day; parsing it bare would read it
        // as UTC midnight and show the previous day west of Greenwich.
        const date = entry.recordedOn
          ? new Date(`${entry.recordedOn}T12:00:00`)
          : new Date(entry.createdAt);
        return Number.isNaN(date.getTime())
          ? entry.createdAt
          : date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
      })
    )
  );
  const visibleDates =
    visibleDays.length === 0
      ? "no saved days"
      : visibleDays.length <= 4
        ? visibleDays.join(", ")
        : `${visibleDays.slice(0, 3).join(", ")} and ${visibleDays.length - 3} more day${visibleDays.length - 3 === 1 ? "" : "s"}`;
  const periodLabel: Record<AnalyticsPeriod, string> = {
    today: "Today",
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    all: "All time",
  };
  const insights = reviewActivity.length
    ? [
        {
          id: "local-ledger",
          label: "Direct local summary",
          title: `${activitySummary.recordCount} saved action${activitySummary.recordCount === 1 ? "" : "s"} across ${activitySummary.moduleSummaries.length} journal area${activitySummary.moduleSummaries.length === 1 ? "" : "s"}`,
          source: `Source: ${activitySummary.recordCount} explicit saved entries on ${visibleDates}. This is a record summary, not a pattern or a judgement.`,
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
            "Source: no saved actions in this period. Analytics and Insights intentionally leave this empty instead of assuming a pattern.",
          evidence: "not available",
          destination: undefined,
        },
      ];

  return (
    <section
      className="journal-spread insights-spread glass-scope"
      aria-labelledby="insights-title"
    >
      <div className="spread-page insights-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">utilities · insights</p>
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
                        ? "All time"
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
            reason behind an observation. Evidence labels are counts, nothing
            more: “descriptive” needs at least 6 saved actions in the period
            (and 3 in an area for that area), “early” needs 3, and below 3
            nothing is claimed. A comparison needs 3 in each source.
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
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const periodActivity = filterAnalyticsActivityByPeriod(activity, period);
  const areasInPeriod = Array.from(
    new Set(periodActivity.map(record => record.module))
  ).sort();
  const filteredActivity =
    areaFilter === "all"
      ? periodActivity
      : periodActivity.filter(record => record.module === areaFilter);
  const activitySummary = localActivitySummary(filteredActivity);
  const pixelsSummary = localPixelSummary(pixelStore?.records ?? {});
  const comparisonWindow = periodDays(period) ?? 7;
  const trend = descriptiveActivityTrend(
    areaFilter === "all"
      ? activity
      : activity.filter(record => record.module === areaFilter),
    new Date(),
    comparisonWindow
  );
  const coverage = activityCoverage(filteredActivity, period);
  const periodLabel: Record<AnalyticsPeriod, string> = {
    today: "Today",
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    all: "All time",
  };
  const windowLabel =
    comparisonWindow === 1
      ? "day"
      : comparisonWindow === 7
        ? "7 days"
        : "30 days";
  function formatSavedAt(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString([], {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  function downloadCsv() {
    const csv = analyticsCsv(filteredActivity);
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `analytics-${period}${areaFilter === "all" ? "" : `-${areaFilter.toLowerCase().replace(/\s+/g, "-")}`}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast(`${filteredActivity.length} record${filteredActivity.length === 1 ? "" : "s"} exported`);
  }
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
      className="journal-spread analytics-spread glass-scope"
      aria-labelledby="analytics-title"
    >
      <div className="spread-page analytics-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">utilities · analytics</p>
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
            This page reads the actions you explicitly saved in connected
            workspaces and the shared annual Pixels marks. It does not inspect
            accounts, devices, or any external service.
          </small>
          <small className="analytics-method">
            Counts update the moment you save — nothing is batched or
            scheduled. Periods are whole calendar days on your device’s clock;
            “Last 7 days” includes today. Each saved action counts once, on
            the day it was recorded for.
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
                        ? "All time"
                        : "Today"}
                </button>
              )
            )}
          </div>
        </section>
        {areasInPeriod.length > 1 && (
          <section className="analytics-area-filter" aria-label="Filter by area">
            <span>Area</span>
            <div>
              <button
                type="button"
                className={cn(areaFilter === "all" && "active")}
                aria-pressed={areaFilter === "all"}
                onClick={() => setAreaFilter("all")}
              >
                All
              </button>
              {areasInPeriod.map(area => (
                <button
                  type="button"
                  key={area}
                  className={cn(areaFilter === area && "active")}
                  aria-pressed={areaFilter === area}
                  onClick={() => setAreaFilter(area)}
                >
                  {area}
                </button>
              ))}
            </div>
          </section>
        )}
        <div className="analytics-ledger" aria-label="Local analytics overview">
          <article>
            <span>recorded moments</span>
            <b>
              {activitySummary.recordCount === 0
                ? "—"
                : activitySummary.recordCount}
            </b>
            <small>
              {activitySummary.recordCount === 0
                ? `nothing saved ${periodLabel[period].toLowerCase()} — not a zero, an absence`
                : `${periodLabel[period].toLowerCase()} · saved actions`}
            </small>
          </article>
          <article>
            <span>days with a record</span>
            <b>
              {coverage
                ? `${coverage.daysWithRecords} / ${coverage.daysInPeriod}`
                : "—"}
            </b>
            <small>
              {coverage
                ? coverage.daysWithRecords === coverage.daysInPeriod
                  ? "every day in the period has something saved"
                  : `${coverage.daysInPeriod - coverage.daysWithRecords} day${coverage.daysInPeriod - coverage.daysWithRecords === 1 ? "" : "s"} with nothing written down — unknown, not empty`
                : "not counted for all time"}
            </small>
          </article>
          <article>
            <span>timed practice</span>
            <b>
              {activitySummary.trackedMinutes === 0
                ? "—"
                : activitySummary.trackedMinutes}
            </b>
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
            <span id="analytics-comparison">
              {period === "all"
                ? "7-day record comparison"
                : `${windowLabel} vs the ${windowLabel} before`}
            </span>
            <small>
              descriptive count only
              {areaFilter !== "all" ? ` · ${areaFilter}` : ""}
            </small>
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
                {trend.currentCount} in the most recent {windowLabel} compared
                with {trend.previousCount} in the {windowLabel} before that
                {trend.previousCount > 0
                  ? ` (${trend.currentCount > trend.previousCount ? "+" : ""}${trend.currentCount - trend.previousCount})`
                  : ""}
                . This does not explain why the count changed.
              </span>
            </p>
          ) : (
            <p>
              <b>Not enough history for a comparison.</b>
              <span>
                {trend.currentCount} recent and {trend.previousCount}{" "}
                prior-period records are available. A descriptive comparison
                needs at least three in each {windowLabel} window.
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
            <small>
              latest three in this review period ·{" "}
              <button
                type="button"
                className="analytics-export"
                onClick={downloadCsv}
                disabled={filteredActivity.length === 0}
              >
                export {filteredActivity.length} as CSV
              </button>
            </small>
          </div>
          {activitySummary.recent.length ? (
            <div className="analytics-recent-list">
              {activitySummary.recent.map(record => {
                const destination = sourceDestinations[record.module];
                return (
                  <article key={record.id}>
                    <i aria-hidden="true">{record.module.slice(0, 1)}</i>
                    <div>
                      <b>{record.label}</b>
                      <small>
                        {record.module} ·{" "}
                        <time dateTime={record.createdAt}>
                          {formatSavedAt(record.createdAt)}
                        </time>
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

function PortfolioPage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  type PortfolioProject = {
    id?: string;
    title: string;
    role: string;
    evidence: string;
    presentation: string;
    readiness: string;
    createdAt?: string;
    updatedAt?: string;
  };
  type PortfolioDraft = Pick<
    PortfolioProject,
    "title" | "role" | "evidence" | "presentation" | "readiness"
  >;
  const emptyPortfolioDraft: PortfolioDraft = {
    title: "",
    role: "",
    evidence: "",
    presentation: "",
    readiness: "Private draft",
  };
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [lastProjects, setLastProjects] = useState<PortfolioProject[] | null>(
    null
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PortfolioDraft>(emptyPortfolioDraft);
  const today = sleepDateInputValue(new Date());
  const formatDay = (value?: string) =>
    value && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;
  useMongoJournalScope({
    scope: "portfolio",
    payload: { projects },
    hydrate: payload => {
      if (Array.isArray(payload.projects))
        setProjects(
          (payload.projects as PortfolioProject[]).map((project, index) => ({
            ...project,
            id: project.id ?? `portfolio-${index}-${project.title}`,
          }))
        );
    },
  });
  function addProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    const fields = { ...draft, title: draft.title.trim() };
    if (editingId) {
      setProjects(current =>
        current.map(project =>
          project.id === editingId
            ? { ...project, ...fields, updatedAt: today }
            : project
        )
      );
      toast("Project updated");
    } else {
      setProjects(current => [
        ...current,
        { ...fields, id: `portfolio-${Date.now()}`, createdAt: today },
      ]);
      toast(`“${fields.title}” added to the shelf`);
    }
    setDraft(emptyPortfolioDraft);
    setEditingId(null);
  }
  function editProject(project: PortfolioProject) {
    setEditingId(project.id ?? null);
    setDraft({
      title: project.title,
      role: project.role,
      evidence: project.evidence,
      presentation: project.presentation,
      readiness: project.readiness,
    });
  }
  function removeProject(project: PortfolioProject) {
    setLastProjects(projects);
    setProjects(current => current.filter(item => item.id !== project.id));
    if (editingId === project.id) {
      setEditingId(null);
      setDraft(emptyPortfolioDraft);
    }
    toast(`Removed “${project.title}”`);
  }
  return (
    <section
      className="journal-spread portfolio-spread glass-scope"
      aria-labelledby="portfolio-title"
    >
      <div className="spread-page portfolio-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">life · career · portfolio</p>
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
          <div className="career-form-actions">
            <Button type="submit" className="ink-button">
              <Plus size={15} />{" "}
              {editingId ? "Save changes" : "Save portfolio project"}
            </Button>
            {editingId ? (
              <button
                type="button"
                className="local-undo"
                onClick={() => {
                  setEditingId(null);
                  setDraft(emptyPortfolioDraft);
                }}
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
        <div className="portfolio-list">
          <div>
            <span>portfolio shelf</span>
            <b>
              {projects.length} projects
              {lastProjects && (
                <button
                  type="button"
                  className="local-undo"
                  onClick={() => {
                    setProjects(lastProjects);
                    setLastProjects(null);
                    toast("Portfolio project restored");
                  }}
                >
                  Undo remove
                </button>
              )}
            </b>
          </div>
          {projects.length === 0 ? (
            <small>
              Start with a project that would be useful to see in one clear,
              proud place.
            </small>
          ) : (
            projects.map(project => (
              <article
                key={project.id}
                className={cn(editingId === project.id && "is-editing")}
              >
                <i aria-hidden="true">{project.title.slice(0, 1)}</i>
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
                  <small className="career-stamp">
                    {formatDay(project.updatedAt)
                      ? `Updated ${formatDay(project.updatedAt)}`
                      : formatDay(project.createdAt)
                        ? `Added ${formatDay(project.createdAt)}`
                        : "Added before dates were kept"}
                  </small>
                  <span className="career-actions">
                    <button type="button" onClick={() => editProject(project)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeProject(project)}
                      aria-label={`Remove ${project.title}`}
                    >
                      Remove
                    </button>
                  </span>
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
    id?: string;
    person: string;
    plan: string;
    date: string;
    followThrough: string;
    note: string;
    reminder: string;
    createdAt?: string;
    updatedAt?: string;
  };
  const [plans, setPlans] = useState<ConnectionPlan[]>([]);
  const [lastConnectionPlans, setLastConnectionPlans] = useState<ConnectionPlan[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const today = sleepDateInputValue(new Date());
  const formatDay = (value?: string) =>
    value && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;
  function dateLabel(value: string) {
    if (!value) return null;
    const detail = assignmentDueDetail(value, today);
    const days = detail.daysAway ?? 0;
    const abs = Math.abs(days);
    const rel =
      detail.kind === "today"
        ? "today"
        : detail.kind === "tomorrow"
          ? "tomorrow"
          : days < 0
            ? `${abs} day${abs === 1 ? "" : "s"} ago`
            : `in ${days} days`;
    return { text: `${detail.exact} · ${rel}`, kind: detail.kind };
  }
  function editConnectionPlan(plan: ConnectionPlan) {
    setEditingId(plan.id ?? null);
    setDraft({
      person: plan.person,
      plan: plan.plan,
      date: plan.date,
      followThrough: plan.followThrough,
      note: plan.note,
      reminder: plan.reminder,
    });
  }
  function removeConnectionPlan(plan: ConnectionPlan) {
    setLastConnectionPlans(plans);
    setPlans(current => current.filter(entry => entry.id !== plan.id));
    if (editingId === plan.id) setEditingId(null);
    toast(`Removed “${plan.person}”`);
  }
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
        setPlans(
          (payload.plans as ConnectionPlan[]).map((entry, index) => ({
            ...entry,
            id: entry.id ?? `social-${index}-${entry.person}`,
          }))
        );
    },
  });
  function addPlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.person.trim() || !draft.plan.trim()) return;
    const fields = { ...draft, person: draft.person.trim(), plan: draft.plan.trim() };
    if (editingId) {
      setPlans(current =>
        current.map(entry =>
          entry.id === editingId ? { ...entry, ...fields, updatedAt: today } : entry
        )
      );
      toast("Updated");
    } else {
      setPlans(current => [
        ...current,
        { ...fields, id: `social-${Date.now()}`, createdAt: today },
      ]);
      toast(`“${fields.person}” saved`);
    }
    setEditingId(null);
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
      className="journal-spread social-spread glass-scope"
      aria-labelledby="social-title"
    >
      <div className="spread-page social-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">life · social life</p>
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
              Optional reminder{" "}
              <small>a note to yourself — this page doesn’t send reminders</small>
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
          <div className="career-form-actions">
            <Button type="submit" className="ink-button">
              <Plus size={15} /> {editingId ? "Save changes" : "Save connection plan"}
            </Button>
            {editingId ? (
              <button
                type="button"
                className="local-undo"
                onClick={() => {
                  setEditingId(null);
                  setDraft({
                    person: "",
                    plan: "",
                    date: "",
                    followThrough: "",
                    note: "",
                    reminder: "No reminder",
                  });
                }}
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
        <div className="social-list">
          <div>
            <span>connection notebook</span>
            <b>
              {plans.length} plans
              {lastConnectionPlans && (
                <button
                  type="button"
                  className="local-undo"
                  onClick={() => {
                    setPlans(lastConnectionPlans);
                    setLastConnectionPlans(null);
                    toast("Connection plan restored");
                  }}
                >
                  Undo remove
                </button>
              )}
            </b>
          </div>
          {plans.length === 0 ? (
            <small>
              Start with a person or group you would like to make space for.
            </small>
          ) : (
            plans.map(plan => (
              <article key={plan.id} className={cn(editingId === plan.id && "is-editing")}>
                <i>{plan.person.slice(0, 1)}</i>
                <p>
                  <b>{plan.person}</b>
                  <small>
                    {plan.plan}
                    {plan.date ? (
                      <>
                        {" · "}
                        <span className={cn("notebook-date", `is-${dateLabel(plan.date)!.kind}`)}>
                          {dateLabel(plan.date)!.text}
                        </span>
                      </>
                    ) : null}{" "}
                    · {plan.reminder}
                  </small>
                  <em>
                    Next:{" "}
                    {plan.followThrough || "Choose a small follow-through"}
                  </em>
                  <em>Note: {plan.note || "Add a note whenever you want"}</em>
                  <small className="career-stamp">
                    {formatDay(plan.updatedAt)
                      ? `Updated ${formatDay(plan.updatedAt)}`
                      : formatDay(plan.createdAt)
                        ? `Saved ${formatDay(plan.createdAt)}`
                        : "Saved before dates were kept"}
                  </small>
                  <span className="career-actions">
                    <button type="button" onClick={() => editConnectionPlan(plan)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeConnectionPlan(plan)}
                      aria-label={`Remove ${plan.person}`}
                    >
                      Remove
                    </button>
                  </span>
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
    id?: string;
    direction: string;
    milestone: string;
    evidence: string;
    application: string;
    reflection: string;
    createdAt?: string;
    updatedAt?: string;
  };
  type CareerDraft = Pick<
    CareerEntry,
    "direction" | "milestone" | "evidence" | "application" | "reflection"
  >;
  const emptyCareerDraft: CareerDraft = {
    direction: "",
    milestone: "",
    evidence: "",
    application: "",
    reflection: "",
  };
  const [entries, setEntries] = useState<CareerEntry[]>([]);
  const [lastEntries, setLastEntries] = useState<CareerEntry[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CareerDraft>(emptyCareerDraft);
  const today = sleepDateInputValue(new Date());
  const formatDay = (value?: string) =>
    value && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;
  useMongoJournalScope({
    scope: "career",
    payload: { entries },
    hydrate: payload => {
      if (Array.isArray(payload.entries))
        setEntries(
          (payload.entries as CareerEntry[]).map((entry, index) => ({
            ...entry,
            id: entry.id ?? `career-${index}-${entry.direction}`,
          }))
        );
    },
  });
  function addEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.direction.trim()) return;
    const fields = { ...draft, direction: draft.direction.trim() };
    if (editingId) {
      setEntries(current =>
        current.map(entry =>
          entry.id === editingId
            ? { ...entry, ...fields, updatedAt: today }
            : entry
        )
      );
      toast("Direction updated");
    } else {
      setEntries(current => [
        ...current,
        { ...fields, id: `career-${Date.now()}`, createdAt: today },
      ]);
      toast(`“${fields.direction}” saved`);
    }
    setDraft(emptyCareerDraft);
    setEditingId(null);
  }
  function editEntry(entry: CareerEntry) {
    setEditingId(entry.id ?? null);
    setDraft({
      direction: entry.direction,
      milestone: entry.milestone,
      evidence: entry.evidence,
      application: entry.application,
      reflection: entry.reflection,
    });
  }
  function removeEntry(entry: CareerEntry) {
    setLastEntries(entries);
    setEntries(current => current.filter(item => item.id !== entry.id));
    if (editingId === entry.id) {
      setEditingId(null);
      setDraft(emptyCareerDraft);
    }
    toast(`Removed “${entry.direction}”`);
  }
  return (
    <section
      className="journal-spread career-spread glass-scope"
      aria-labelledby="career-title"
    >
      <div className="spread-page career-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">life · career goals</p>
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
          <div className="career-form-actions">
            <Button type="submit" className="ink-button">
              <Plus size={15} />{" "}
              {editingId ? "Save changes" : "Save career direction"}
            </Button>
            {editingId ? (
              <button
                type="button"
                className="local-undo"
                onClick={() => {
                  setEditingId(null);
                  setDraft(emptyCareerDraft);
                }}
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
        <div className="career-list">
          <div>
            <span>career notebook</span>
            <b>
              {entries.length} directions
              {lastEntries && (
                <button
                  type="button"
                  className="local-undo"
                  onClick={() => {
                    setEntries(lastEntries);
                    setLastEntries(null);
                    toast("Career direction restored");
                  }}
                >
                  Undo remove
                </button>
              )}
            </b>
          </div>
          {entries.length === 0 ? (
            <small>
              Start with a direction that deserves a little more space in your
              week.
            </small>
          ) : (
            entries.map(entry => (
              <article
                key={entry.id}
                className={cn(editingId === entry.id && "is-editing")}
              >
                <i aria-hidden="true">{entry.direction.slice(0, 1)}</i>
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
                  <small className="career-stamp">
                    {formatDay(entry.updatedAt)
                      ? `Updated ${formatDay(entry.updatedAt)}`
                      : formatDay(entry.createdAt)
                        ? `Saved ${formatDay(entry.createdAt)}`
                        : "Saved before dates were kept"}
                  </small>
                  <span className="career-actions">
                    <button type="button" onClick={() => editEntry(entry)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeEntry(entry)}
                      aria-label={`Remove ${entry.direction}`}
                    >
                      Remove
                    </button>
                  </span>
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
    id?: string;
    title: string;
    owner: string;
    cadence: string;
    reminder: string;
    done: boolean;
    lastDone?: string;
    nextDue?: string;
  };
  const [responsibilities, setResponsibilities] = useState<Responsibility[]>(
    []
  );
  const [lastList, setLastList] = useState<Responsibility[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [history, setHistory] = useState<
    Array<{ title: string; date: string }>
  >([]);
  const today = sleepDateInputValue(new Date());
  const cadenceDays: Record<string, number> = {
    Daily: 1,
    Weekly: 7,
    Monthly: 30,
    Seasonally: 91,
  };
  function nextDueFrom(cadence: string, from: string) {
    const date = new Date(`${from}T12:00:00`);
    if (cadence === "Monthly") date.setMonth(date.getMonth() + 1);
    else if (cadence === "Seasonally") date.setMonth(date.getMonth() + 3);
    else date.setDate(date.getDate() + (cadenceDays[cadence] ?? 7));
    return sleepDateInputValue(date);
  }
  function formatDay(value: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
        })
      : value;
  }
  function dueState(item: Responsibility) {
    if (!item.nextDue) return null;
    const detail = assignmentDueDetail(item.nextDue, today);
    return {
      kind: detail.kind,
      label:
        detail.kind === "overdue"
          ? `due again · ${Math.abs(detail.daysAway ?? 0)} day${Math.abs(detail.daysAway ?? 0) === 1 ? "" : "s"} ago`
          : detail.kind === "today"
            ? "due again today"
            : detail.kind === "tomorrow"
              ? "due again tomorrow"
              : `due again ${formatDay(item.nextDue)}`,
    };
  }
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
        setResponsibilities(
          (payload.responsibilities as Responsibility[]).map((item, index) => ({
            ...item,
            id: item.id ?? `resp-${index}-${item.title}`,
          }))
        );
      if (Array.isArray(payload.history))
        setHistory(payload.history as Array<{ title: string; date: string }>);
    },
  });
  function addResponsibility(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    const trimmedTitle = draft.title.trim();
    if (editingId) {
      setResponsibilities(current =>
        current.map(entry =>
          entry.id === editingId
            ? { ...entry, ...draft, id: editingId, title: trimmedTitle }
            : entry
        )
      );
      toast(`Saved changes to “${trimmedTitle}”`);
      setEditingId(null);
    } else {
      setResponsibilities(current => [
        ...current,
        { ...draft, id: `resp-${Date.now()}`, title: trimmedTitle },
      ]);
      toast(`Added “${trimmedTitle}” · ${draft.cadence.toLowerCase()}`);
    }
    setDraft({
      title: "",
      owner: "Me",
      cadence: "Weekly",
      reminder: "Day before",
      done: false,
    });
  }
  function editResponsibility(item: Responsibility) {
    setEditingId(item.id ?? null);
    setDraft({
      title: item.title,
      owner: item.owner,
      cadence: item.cadence,
      reminder: item.reminder,
      done: item.done,
      lastDone: item.lastDone,
      nextDue: item.nextDue,
    });
  }
  function cancelResponsibilityEdit() {
    setEditingId(null);
    setDraft({
      title: "",
      owner: "Me",
      cadence: "Weekly",
      reminder: "Day before",
      done: false,
    });
  }
  function completeResponsibility(item: Responsibility) {
    // Every responsibility repeats, so "done" means "done this time":
    // record the moment, schedule the next one, stay on the list.
    const nextDue = nextDueFrom(item.cadence, today);
    setHistory(current =>
      [{ title: item.title, date: today }, ...current].slice(0, 200)
    );
    setResponsibilities(current =>
      current.map(entry =>
        entry.id === item.id
          ? { ...entry, done: false, lastDone: today, nextDue }
          : entry
      )
    );
    toast(`“${item.title}” done · next by ${formatDay(nextDue)}`);
  }
  function removeResponsibility(item: Responsibility) {
    if (editingId === item.id) cancelResponsibilityEdit();
    setLastList(responsibilities);
    setResponsibilities(current =>
      current.filter(entry => entry.id !== item.id)
    );
    toast(`Removed “${item.title}”`);
  }
  return (
    <section
      className="journal-spread responsibilities-spread glass-scope"
      aria-labelledby="responsibilities-title"
    >
      <div className="spread-page responsibilities-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">life · responsibilities</p>
        <h2 id="responsibilities-title">
          Let repetition
          <br />
          <em>feel manageable.</em>
        </h2>
        <p className="page-intro">
          Keep recurring obligations distinct from one-off tasks. Name who owns
          it and how often it comes around; each time you tick one off, the
          next date is set from the cadence.
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
            Reminder preference{" "}
            <small>a note to yourself — this page doesn’t send reminders</small>
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
          <div className="career-form-actions">
            <Button className="ink-button" type="submit">
              <Plus size={15} />{" "}
              {editingId ? "Save changes" : "Add responsibility"}
            </Button>
            {editingId ? (
              <button
                type="button"
                className="local-undo"
                onClick={cancelResponsibilityEdit}
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
        <div className="responsibility-list">
          <div>
            <span>current responsibilities</span>
            <b>
              {responsibilities.length} listed
              {lastList && (
                <button
                  type="button"
                  className="local-undo"
                  onClick={() => {
                    setResponsibilities(lastList);
                    setLastList(null);
                    toast("Removal undone");
                  }}
                >
                  Undo
                </button>
              )}
            </b>
          </div>
          {responsibilities.length === 0 ? (
            <small>
              Start with one repeating obligation that deserves a steadier home.
            </small>
          ) : (
            responsibilities.map(item => {
              const due = dueState(item);
              return (
                <article
                  className={cn(
                    due && `is-${due.kind}`,
                    editingId === item.id && "is-editing"
                  )}
                  key={item.id}
                >
                  <button
                    type="button"
                    onClick={() => completeResponsibility(item)}
                    aria-label={`Mark ${item.title} done for now`}
                    title="Done this time"
                  >
                    {""}
                  </button>
                  <p>
                    <b>{item.title}</b>
                    <small>
                      {item.owner} · {item.cadence} · {item.reminder}
                      {item.lastDone ? ` · last done ${formatDay(item.lastDone)}` : ""}
                    </small>
                    {due ? (
                      <small className={cn("responsibility-due", `is-${due.kind}`)}>
                        {due.label}
                      </small>
                    ) : (
                      <small className="responsibility-due">not done yet</small>
                    )}
                  </p>
                  <span className="care-actions">
                    <button type="button" onClick={() => editResponsibility(item)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="responsibility-remove"
                      onClick={() => removeResponsibility(item)}
                      aria-label={`Remove ${item.title}`}
                      title="Remove"
                    >
                      ×
                    </button>
                  </span>
                </article>
              );
            })
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
                {formatDay(item.date)} · {item.title}
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
  const [lastPurchases, setLastPurchases] = useState<Purchase[] | null>(null);
  const today = sleepDateInputValue(new Date());
  function returnWindow(purchase: Purchase) {
    if (!purchase.returnDate || purchase.stage === "Returned") return null;
    const detail = assignmentDueDetail(purchase.returnDate, today);
    const label =
      detail.kind === "overdue"
        ? `Return window passed · ${Math.abs(detail.daysAway ?? 0)} day${Math.abs(detail.daysAway ?? 0) === 1 ? "" : "s"} ago`
        : detail.kind === "today"
          ? "Last day to return"
          : detail.kind === "tomorrow"
            ? "Return by tomorrow"
            : `${detail.daysAway} days left to return`;
    return { ...detail, label };
  }
  function removePurchase(purchase: Purchase) {
    setLastPurchases(purchases);
    setPurchases(current => current.filter(item => item.id !== purchase.id));
    if (editingId === purchase.id) setEditingId(null);
    toast(`Removed ${purchase.title}`);
  }
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
    toast(`${draft.title.trim()} added as ${draft.stage.toLowerCase()}`);
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
    toast("Purchase updated");
  }
  return (
    <section
      className="journal-spread purchases-spread glass-scope"
      aria-labelledby="purchases-title"
    >
      <div className="spread-page purchases-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">life · purchases</p>
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
            <b>
              {purchases.length} saved
              {lastPurchases && (
                <button
                  type="button"
                  className="local-undo"
                  onClick={() => {
                    setPurchases(lastPurchases);
                    setLastPurchases(null);
                    toast("Purchase restored");
                  }}
                >
                  Undo remove
                </button>
              )}
            </b>
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
                      aria-label="Item or purchase"
                      onChange={event =>
                        setEditDraft(current => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                    />
                    <select
                      value={editDraft.stage}
                      aria-label="Stage"
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
                      aria-label="Return-by date"
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
                      aria-label="Warranty note"
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
                      aria-label="Receipt metadata"
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
                      aria-label="Later reflection"
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
                      {purchase.returnDate ? (
                        <>
                          {" · "}
                          {purchase.stage === "Returned" ? "return window was " : "return by "}
                          <time dateTime={purchase.returnDate}>
                            {assignmentDueDetail(purchase.returnDate, today).exact}
                          </time>
                        </>
                      ) : null}
                    </small>
                    {returnWindow(purchase) ? (
                      <small
                        className={cn(
                          "purchase-return",
                          `is-${returnWindow(purchase)!.kind}`
                        )}
                      >
                        {returnWindow(purchase)!.label}
                      </small>
                    ) : null}
                    <em>Warranty: {purchase.warranty || "Not noted"}</em>
                    <em>Receipt metadata: {purchase.receipt || "Not noted"}</em>
                    <em>
                      Reflection: {purchase.reflection || "Not added yet"}
                    </em>
                    <span className="purchase-actions">
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
                      <button
                        type="button"
                        className="review-purchase purchase-remove"
                        onClick={() => removePurchase(purchase)}
                        aria-label={`Remove ${purchase.title}`}
                      >
                        Remove
                      </button>
                    </span>
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
    id?: string;
    title: string;
    area: string;
    recurring: boolean;
    supply: string;
    done: boolean;
    lastDone?: string;
  };
  type CareMoment = { title: string; date: string; recurring: boolean };
  const [items, setItems] = useState<CareItem[]>([]);
  const [lastItems, setLastItems] = useState<CareItem[] | null>(null);
  const [history, setHistory] = useState<CareMoment[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const today = sleepDateInputValue(new Date());
  const formatDay = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
        })
      : value;
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
      if (Array.isArray(payload.items))
        setItems(
          (payload.items as CareItem[]).map((item, index) => ({
            ...item,
            // Items saved before ids existed get a stable one on load.
            id: item.id ?? `care-${index}-${item.title}`,
          }))
        );
      if (Array.isArray(payload.history))
        setHistory(payload.history as CareMoment[]);
    },
  });
  function addItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    const trimmedTitle = draft.title.trim();
    if (editingId) {
      setItems(current =>
        current.map(entry =>
          entry.id === editingId
            ? { ...entry, ...draft, id: editingId, title: trimmedTitle }
            : entry
        )
      );
      toast(`Saved changes to “${trimmedTitle}”`);
      setEditingId(null);
    } else {
      setItems(current => [
        ...current,
        { ...draft, id: `care-${Date.now()}`, title: trimmedTitle },
      ]);
      toast(`Added “${trimmedTitle}”`);
    }
    setDraft({
      title: "",
      area: "Workspace",
      recurring: false,
      supply: "",
      done: false,
    });
  }
  function editItem(item: CareItem) {
    setEditingId(item.id ?? null);
    setDraft({
      title: item.title,
      area: item.area,
      recurring: item.recurring,
      supply: item.supply,
      done: item.done,
    });
  }
  function cancelEdit() {
    setEditingId(null);
    setDraft({
      title: "",
      area: "Workspace",
      recurring: false,
      supply: "",
      done: false,
    });
  }
  function toggleItem(item: CareItem) {
    if (item.recurring) {
      // A repeating task is never done for good: completing it records a
      // moment and leaves it ready for next time.
      setHistory(current =>
        [
          { title: item.title, date: today, recurring: true },
          ...current,
        ].slice(0, 200)
      );
      setItems(current =>
        current.map(entry =>
          entry.id === item.id
            ? { ...entry, done: false, lastDone: today }
            : entry
        )
      );
      toast(`“${item.title}” done today — it stays on the list`);
      return;
    }
    if (!item.done) {
      setHistory(current =>
        [
          { title: item.title, date: today, recurring: false },
          ...current,
        ].slice(0, 200)
      );
      toast(`“${item.title}” marked done`);
    } else {
      toast(`“${item.title}” reopened`);
    }
    setItems(current =>
      current.map(entry =>
        entry.id === item.id ? { ...entry, done: !entry.done } : entry
      )
    );
  }
  function removeItem(item: CareItem) {
    if (editingId === item.id) cancelEdit();
    setLastItems(items);
    setItems(current => current.filter(entry => entry.id !== item.id));
    toast(`Removed “${item.title}”`);
  }
  const upkeep = items.filter(item => !item.done || item.recurring);
  const completedOnce = items.filter(item => item.done && !item.recurring);
  return (
    <section
      className="journal-spread environment-spread glass-scope"
      aria-labelledby="environment-title"
    >
      <div className="spread-page environment-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">life · environment</p>
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
          <div className="career-form-actions">
            <Button type="submit" className="ink-button">
              <Plus size={15} />{" "}
              {editingId ? "Save changes" : "Add care task"}
            </Button>
            {editingId ? (
              <button type="button" className="local-undo" onClick={cancelEdit}>
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
        <div className="care-list">
          <div>
            <span>current upkeep</span>
            <b>
              {upkeep.length} visible
              {lastItems && (
                <button
                  type="button"
                  className="local-undo"
                  onClick={() => {
                    setItems(lastItems);
                    setLastItems(null);
                    toast("Removal undone");
                  }}
                >
                  Undo
                </button>
              )}
            </b>
          </div>
          {upkeep.length === 0 ? (
            <small>
              Start with one small task that would make your space feel lighter.
            </small>
          ) : (
            upkeep.map(item => (
              <article
                className={cn(
                  item.done && "done",
                  editingId === item.id && "is-editing"
                )}
                key={item.id}
              >
                <button
                  type="button"
                  onClick={() => toggleItem(item)}
                  aria-label={
                    item.recurring
                      ? `Mark ${item.title} done today`
                      : item.done
                        ? `Reopen ${item.title}`
                        : `Mark ${item.title} done`
                  }
                  aria-pressed={item.done}
                >
                  {item.done ? "✓" : ""}
                </button>
                <p>
                  <b>{item.title}</b>
                  <small>
                    {item.area}
                    {item.recurring
                      ? item.lastDone
                        ? ` · repeats · last done ${formatDay(item.lastDone)}`
                        : " · repeats · not done yet"
                      : ""}
                    {item.supply ? ` · Supply: ${item.supply}` : ""}
                  </small>
                </p>
                <span className="care-actions">
                  <button type="button" onClick={() => editItem(item)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="care-remove"
                    onClick={() => removeItem(item)}
                    aria-label={`Remove ${item.title}`}
                    title="Remove"
                  >
                    ×
                  </button>
                </span>
              </article>
            ))
          )}
          {completedOnce.length > 0 && (
            <details className="care-completed">
              <summary>
                {completedOnce.length} one-time task
                {completedOnce.length === 1 ? "" : "s"} completed
              </summary>
              {completedOnce.map(item => (
                <article className="done" key={item.id}>
                  <button
                    type="button"
                    onClick={() => toggleItem(item)}
                    aria-label={`Reopen ${item.title}`}
                  >
                    ✓
                  </button>
                  <p>
                    <b>{item.title}</b>
                    <small>{item.area} · tap ✓ to reopen</small>
                  </p>
                  <button
                    type="button"
                    className="care-remove"
                    onClick={() => removeItem(item)}
                    aria-label={`Remove ${item.title}`}
                  >
                    ×
                  </button>
                </article>
              ))}
            </details>
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
                  {formatDay(entry.date)} · {entry.title}
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
  const [lastRecords, setLastRecords] = useState<SecurityRecord[] | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const securityToday = sleepDateInputValue(new Date());
  function reviewWhen(reviewDate: string) {
    return reviewDate ? assignmentDueDetail(reviewDate, securityToday) : null;
  }
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
    const nextDate = nextSecurityReviewDate(record.cadence);
    updateRecord(record.id, item => ({
      ...item,
      state: "Reviewed",
      completedAt: history[history.length - 1].date,
      reviewHistory: history,
      // The cadence finally does something: the next review is scheduled
      // from today, so the record comes back on its own.
      reviewDate: nextDate,
    }));
    toast(`${record.label} reviewed · next review ${reviewWhen(nextDate)?.exact ?? nextDate}`);
  }
  function removeRecord(record: SecurityRecord) {
    setLastRecords(records);
    setRecords(current => current.filter(item => item.id !== record.id));
    if (editingId === record.id) resetDraft();
    toast(`Removed ${record.label}`);
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
          <b>
            {record.state === "Reviewed"
              ? status === "Later"
                ? "Next review"
                : "Due again"
              : status}
          </b>
          {record.reviewDate ? (
            <>
              {" · "}
              <time dateTime={record.reviewDate}>
                {reviewWhen(record.reviewDate)?.exact}
              </time>
              {reviewWhen(record.reviewDate)
                ? ` (${reviewWhen(record.reviewDate)!.label.toLowerCase()})`
                : ""}
            </>
          ) : (
            " · no review date added"
          )}
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
          Cadence · {record.cadence}: marking a review done schedules the next
          one from that day. This page does not verify settings or send
          reminders.
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
            onClick={() => removeRecord(record)}
            aria-label={`Remove ${record.label}`}
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
      className="journal-spread security-spread security-workspace-spread glass-scope"
      aria-labelledby="security-title"
    >
      <div className="spread-page security-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">life · security</p>
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
            <b>
              {summary.reviewNow} to consider now
              {lastRecords && (
                <button
                  type="button"
                  className="local-undo"
                  onClick={() => {
                    setRecords(lastRecords);
                    setLastRecords(null);
                  }}
                >
                  Undo remove
                </button>
              )}
            </b>
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

function DocumentRenewalPage({
  onContents,
  onCover,
}: {
  onContents: () => void;
  onCover: () => void;
}) {
  const today = sleepDateInputValue(new Date());
  const [records, setRecords] = useState<RenewalRecord[]>([]);
  const [lastRecords, setLastRecords] = useState<RenewalRecord[] | null>(null);
  const [customTypes, setCustomTypes] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const auth = useAuth();
  function reviewWhen(record: RenewalRecord) {
    if (!record.reviewDate) return null;
    return assignmentDueDetail(record.reviewDate, today);
  }
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
    toast(editingId ? "Document updated" : `${next.title} added`);
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
    // This server's own session first; the Manus preview mirror after.
    const own = authHeaders();
    if (own.Authorization) return own;
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
      const response = await fetch(apiUrl("/api/documents/upload"), {
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
            {record.type} ·{" "}
            {record.reviewDate ? (
              <>
                <time dateTime={record.reviewDate}>
                  {reviewWhen(record)?.exact}
                </time>
                {status === "Past due" || status === "Approaching" || status === "Upcoming"
                  ? ` (${reviewWhen(record)?.label.toLowerCase()})`
                  : ""}
              </>
            ) : (
              "no review date"
            )}{" "}
            · {record.reviewWindow}
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
                title="The stored file itself stays in storage until your account is deleted"
                onClick={() => {
                  updateRecord(record.id, current => ({
                    ...current,
                    attachment: undefined,
                  }));
                  toast("Reference removed. The stored file remains in storage until the account is deleted.");
                }}
              >
                Forget this file
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
            onClick={() => {
              setLastRecords(records);
              setRecords(current =>
                current.filter(item => item.id !== record.id)
              );
              if (editingId === record.id) resetDraft();
              toast(
                record.attachment
                  ? `Removed ${record.title}. Its stored file remains until the account is deleted.`
                  : `Removed ${record.title}`
              );
            }}
            aria-label={`Remove ${record.title}`}
          >
            Remove
          </button>
        </div>
      </article>
    );
  }
  return (
    <section
      className="journal-spread documents-spread glass-scope"
      aria-labelledby="documents-title"
    >
      <div className="spread-page documents-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">life · documents</p>
        <h2 id="documents-title">
          Keep the dates,
          <br />
          <em>not the files.</em>
        </h2>
        <p className="page-intro">
          Track the dates that help you review or renew an important record,
          and optionally attach the file itself.
        </p>
        <div className="document-safety">
          <HeartPulse size={15} />
          <span>
            {auth.isAuthenticated
              ? "Files open only for your signed-in account"
              : "Sign in to attach files"}
          </span>
        </div>
      </div>
      <div className="spread-page documents-workbench">
        <section className="document-review-summary">
          <div>
            <span>Review, factually</span>
            <b>
              {summary.pastDue + summary.approaching} to review now
              {lastRecords && (
                <button
                  type="button"
                  className="local-undo"
                  onClick={() => {
                    setRecords(lastRecords);
                    setLastRecords(null);
                  }}
                >
                  Undo remove
                </button>
              )}
            </b>
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
  const [lastEntries, setLastEntries] = useState<CashFlowEntry[] | null>(null);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [savingIntent, setSavingIntent] = useState("");
  const [currency, setCurrency] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const auth = useAuth();
  const [draft, setDraft] = useState({
    title: "",
    amount: "",
    direction: "out" as CashFlowEntry["direction"],
    category: "Everyday",
    customCategory: "",
    date: sleepDateInputValue(new Date()),
    note: "",
    recurring: false,
  });
  useMongoJournalScope({
    scope: "finances",
    payload: {
      period,
      openings,
      entries,
      customCategories,
      savingIntent,
      currency,
    },
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
      if (typeof payload.currency === "string") setCurrency(payload.currency);
    },
  });
  const money = (value: number) => formatMoney(value, currency);
  function removeEntry(entry: CashFlowEntry) {
    setLastEntries(entries);
    setEntries(current => current.filter(item => item.id !== entry.id));
    if (editingId === entry.id) resetDraft();
    toast(`Removed ${entry.title} · ${money(entry.amount)}`);
  }
  function removeCustomCategory(name: string) {
    const inUse = entries.filter(entry => entry.category === name).length;
    setCustomCategories(current => current.filter(item => item !== name));
    toast(
      inUse
        ? `“${name}” removed from the list; ${inUse} record${inUse === 1 ? " keeps" : "s keep"} that label`
        : `“${name}” removed`
    );
  }
  function downloadCsv() {
    const csv = cashFlowCsv(entries, currency);
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "cash-flow-export.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    toast(`${entries.length} record${entries.length === 1 ? "" : "s"} exported as CSV`);
  }
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
  // A negative opening is a real state (an overdraft, a debt); clamping it
  // to zero would silently change the user's number.
  const openingAmount = roundMoney(Number(openings[period]) || 0);
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
      date: sleepDateInputValue(new Date()),
      note: "",
      recurring: false,
    });
  }
  function saveEntry(event: React.FormEvent) {
    event.preventDefault();
    // Accept "1,250.50" and "1 250,50"-style input; store to the cent.
    const amount = roundMoney(
      Number(draft.amount.replace(/\s/g, "").replace(/,(?=\d{3}\b)/g, "").replace(",", "."))
    );
    const category =
      draft.category === "Custom"
        ? draft.customCategory.trim()
        : draft.category;
    if (
      !draft.title.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !category ||
      !draft.date
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
    toast(
      `${editingId ? "Updated" : "Saved"} ${entry.direction === "in" ? "+" : "−"}${money(entry.amount)} · ${entry.title}`
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
      className="journal-spread finances-spread glass-scope"
      aria-labelledby="finances-title"
    >
      <div className="spread-page finances-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">life · finances</p>
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
          <span>Private entries · no bank connection · no advice</span>
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
            period with. {periodLabel(period)} means{" "}
            {periodWindowDescription(period)}.
          </p>
          <label className="finance-currency">
            Currency label
            <input
              value={currency}
              onChange={event => setCurrency(event.target.value.slice(0, 5))}
              placeholder="e.g. KES, USD, £"
              aria-describedby="finance-currency-help"
            />
            <small id="finance-currency-help">
              Shown before every amount. Leave blank for plain numbers.
            </small>
          </label>
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
            <b>{openings[period].trim() ? money(openingAmount) : "Not set"}</b>
          </article>
          <article className="in">
            <span>Money in</span>
            <b>{money(summary.moneyIn)}</b>
          </article>
          <article className="out">
            <span>Money out</span>
            <b>{money(summary.moneyOut)}</b>
          </article>
          <article className="balance">
            <span>Current balance</span>
            <b>
              {openings[period].trim()
                ? money(summary.currentBalance)
                : "Set opening amount"}
            </b>
          </article>
        </section>
        <p className="finance-formula" aria-live="polite">
          {openings[period].trim()
            ? `${money(openingAmount)} opening + ${money(summary.moneyIn)} in − ${money(summary.moneyOut)} out = ${money(summary.currentBalance)}, from ${periodEntries.length} record${periodEntries.length === 1 ? "" : "s"} dated ${periodWindowDescription(period)}.`
            : `Balance = opening + money in − money out. Enter an opening amount to see it; ${periodEntries.length} record${periodEntries.length === 1 ? "" : "s"} fall in this period.`}
        </p>
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
                placeholder="Name a category — it’s added to the list"
              />
            ) : null}
            {customCategories.length > 0 && (
              <div className="finance-custom-categories">
                <span>Your categories</span>
                {customCategories.map(name => (
                  <button
                    type="button"
                    key={name}
                    onClick={() => removeCustomCategory(name)}
                    aria-label={`Remove category ${name} from the list`}
                    title="Remove from the list (records keep their label)"
                  >
                    {name} ×
                  </button>
                ))}
              </div>
            )}
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
              Recurring item <small>a label only — not re-added for you</small>
            </label>
            <button type="submit">
              <Plus size={14} /> {editingId ? "Save changes" : "Add record"}
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
                    <small>{money(item.amount)}</small>
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
            <span>Money history</span>
            <b>{entries.length} saved</b>
            <span className="finance-history-tools">
              {lastEntries && (
                <button
                  type="button"
                  onClick={() => {
                    setEntries(lastEntries);
                    setLastEntries(null);
                  }}
                >
                  Undo remove
                </button>
              )}
              <button
                type="button"
                onClick={downloadCsv}
                disabled={entries.length === 0}
              >
                Export CSV
              </button>
            </span>
          </div>
          {entries.length ? (
            entries.map(entry => (
              <article
                key={entry.id}
                className={cn(editingId === entry.id && "is-editing")}
              >
                <i className={entry.direction} aria-hidden="true">
                  {entry.direction === "in" ? "+" : "−"}
                </i>
                <p>
                  <b>{entry.title}</b>
                  <small>
                    {entry.direction === "in" ? "Money in" : "Money out"} ·{" "}
                    {entry.category} ·{" "}
                    <time dateTime={entry.date}>
                      {new Date(`${entry.date}T12:00:00`).toLocaleDateString(
                        undefined,
                        { weekday: "short", day: "numeric", month: "short" }
                      )}
                    </time>
                    {entry.recurring ? " · recurring" : ""}
                  </small>
                  {entry.note ? <em>{entry.note}</em> : null}
                </p>
                <strong
                  aria-label={`${entry.direction === "in" ? "plus" : "minus"} ${money(entry.amount)}`}
                >
                  {entry.direction === "in" ? "+" : "−"}
                  {money(entry.amount)}
                </strong>
                <div>
                  <button type="button" onClick={() => editEntry(entry)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => removeEntry(entry)}
                    aria-label={`Remove ${entry.title}, ${money(entry.amount)}`}
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))
          ) : (
            <small>
              No money records yet. Add only amounts you want this journal to
              reflect.
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
    /** The day the block belongs to; blocks saved before this field
     * existed are treated as today's until moved or removed. */
    date?: string;
  };
  const today = sleepDateInputValue(new Date());
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [lastBlocks, setLastBlocks] = useState<TimeBlock[] | null>(null);
  const [lastRecords, setLastRecords] = useState<LocalTimerRecord[] | null>(
    null
  );
  const todaysBlocks = blocks.filter(block => (block.date ?? today) === today);
  const earlierBlocks = blocks.filter(
    block => block.date !== undefined && block.date < today
  );
  const earlierOpen = earlierBlocks.filter(block => !block.done);
  function removeBlock(block: TimeBlock) {
    setLastBlocks(blocks);
    setBlocks(current => current.filter(item => item.id !== block.id));
    if (activeBlockId === block.id) setActiveBlockId(null);
    toast(`Removed block “${block.title}”`);
  }
  function toggleBlockDone(block: TimeBlock) {
    setBlocks(current =>
      current.map(item =>
        item.id === block.id ? { ...item, done: !item.done } : item
      )
    );
  }
  function carryEarlierForward() {
    setLastBlocks(blocks);
    setBlocks(current =>
      current.map(block =>
        block.date !== undefined && block.date < today && !block.done
          ? { ...block, date: today }
          : block
      )
    );
    toast(`${earlierOpen.length} open block${earlierOpen.length === 1 ? "" : "s"} moved to today`);
  }
  function clearEarlier() {
    setLastBlocks(blocks);
    setBlocks(current =>
      current.filter(block => !(block.date !== undefined && block.date < today))
    );
    toast(`${earlierBlocks.length} earlier block${earlierBlocks.length === 1 ? "" : "s"} removed`);
  }
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
      date: today,
    };
    setBlocks(current =>
      [...current, block].sort((first, second) =>
        first.time.localeCompare(second.time)
      )
    );
    setDraft({ title: "", category: "Study", minutes: 60, time: "" });
    toast(`Block added${block.time ? ` at ${block.time}` : ""} · ${block.minutes} min`);
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
      className="journal-spread time-spread glass-scope"
      aria-labelledby="time-title"
    >
      <div className="spread-page time-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">life · time</p>
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
        <DayPlanner />
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
            <b>
              {todaysBlocks.filter(block => !block.done).length} open
              {lastBlocks && (
                <button
                  type="button"
                  className="local-undo"
                  onClick={() => {
                    setBlocks(lastBlocks);
                    setLastBlocks(null);
                  }}
                >
                  Undo
                </button>
              )}
            </b>
          </div>
          {earlierBlocks.length > 0 && (
            <div className="time-earlier">
              <small>
                {earlierBlocks.length} block
                {earlierBlocks.length === 1 ? "" : "s"} from earlier days
                {earlierOpen.length ? ` (${earlierOpen.length} still open)` : ""}.
              </small>
              {earlierOpen.length > 0 && (
                <button type="button" onClick={carryEarlierForward}>
                  Bring open ones to today
                </button>
              )}
              <button type="button" onClick={clearEarlier}>
                Clear earlier
              </button>
            </div>
          )}
          {todaysBlocks.length === 0 ? (
            <small>
              Start with one block that would make your day feel more
              intentional.
            </small>
          ) : (
            todaysBlocks.map(block => (
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
                    {block.done ? " · done" : ""}
                  </small>
                </p>
                <div className="time-block-actions">
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
                  <button
                    type="button"
                    onClick={() => toggleBlockDone(block)}
                    aria-label={
                      block.done
                        ? `Reopen ${block.title}`
                        : `Mark ${block.title} done without timing it`
                    }
                    title={
                      block.done
                        ? "Reopen"
                        : "Mark done without timing it"
                    }
                  >
                    {block.done ? "Reopen" : "✓"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBlock(block)}
                    aria-label={`Remove block ${block.title}`}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
        <section className="time-history">
          <div>
            <span>Recent timing</span>
            <b>
              · {records.length} saved
              {lastRecords && (
                <button
                  type="button"
                  className="local-undo"
                  onClick={() => {
                    setRecords(lastRecords);
                    setLastRecords(null);
                  }}
                >
                  Undo remove
                </button>
              )}
            </b>
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
                    {record.date === today ? "Today" : record.date} ·{" "}
                    {record.category} ·{" "}
                    {record.mode === "countdown" ? "Countdown" : "Count up"}
                  </small>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLastRecords(records);
                    setRecords(current =>
                      current.filter(item => item.id !== record.id)
                    );
                    toast(`Removed ${formatClockSeconds(record.seconds)} · ${record.label}`);
                  }}
                  aria-label={`Remove ${record.label}`}
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
  const [lastGoals, setLastGoals] = useState<GoalRecord[] | null>(null);
  const goalsToday = sleepDateInputValue(new Date());
  function deadlineDetail(goal: GoalRecord) {
    if (!goal.deadline) return null;
    const detail = assignmentDueDetail(goal.deadline, goalsToday);
    const settled = goal.state === "completed" || goal.state === "archived";
    return {
      kind: settled ? "settled" : detail.kind,
      exact: detail.exact,
      label: settled
        ? detail.exact
        : detail.kind === "overdue"
          ? `${detail.exact} · ${Math.abs(detail.daysAway ?? 0)} day${Math.abs(detail.daysAway ?? 0) === 1 ? "" : "s"} past`
          : detail.kind === "today"
            ? `${detail.exact} · today`
            : detail.kind === "tomorrow"
              ? `${detail.exact} · tomorrow`
              : `${detail.exact} · ${detail.daysAway} days`,
    };
  }
  function setGoalState(goal: GoalRecord, state: GoalState, word: string) {
    updateGoal(goal.id, item => ({ ...item, state }));
    toast(`“${goal.title}” ${word}`);
  }
  function removeGoal(goal: GoalRecord) {
    setLastGoals(goals);
    setGoals(items => items.filter(item => item.id !== goal.id));
    if (editingId === goal.id) resetEditor();
    toast(`Removed “${goal.title}”`);
  }
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
        {goal.deadline && deadlineDetail(goal) ? (
          <small className={cn("goal-date", `is-${deadlineDetail(goal)!.kind}`)}>
            Review or target date ·{" "}
            <time dateTime={goal.deadline}>{deadlineDetail(goal)!.label}</time>
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
                onClick={() => setGoalState(goal, "completed", "marked complete")}
              >
                Complete
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setGoalState(goal, "active", "is active again")}
              >
                Continue
              </button>
              <button
                type="button"
                onClick={() => setGoalState(goal, "archived", "archived — find it under review")}
              >
                Archive
              </button>
            </>
          )}
          <button
            type="button"
            className="remove"
            onClick={() => removeGoal(goal)}
            aria-label={`Remove ${goal.title}`}
          >
            Remove
          </button>
        </div>
        {goal.state !== "active" ? (
          <div className="goal-review-note">
            <input
              value={goal.reviewNote}
              onChange={event =>
                updateGoal(goal.id, item => ({
                  ...item,
                  reviewNote: event.target.value,
                }))
              }
              placeholder="Brief review note: what changed?"
            />
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <section
      className="journal-spread goals-spread goals-workspace-spread glass-scope"
      aria-labelledby="goals-title"
    >
      <div className="spread-page goals-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">goals & growth · goals</p>
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
            {lastGoals && (
              <button
                type="button"
                className="local-undo goal-undo"
                onClick={() => {
                  setGoals(lastGoals);
                  setLastGoals(null);
                  toast("Goal restored");
                }}
              >
                Undo remove
              </button>
            )}
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
  const today = sleepDateInputValue(new Date());
  const [topic, setTopic] = useState("");
  const [contextType, setContextType] = useState("Course");
  const [contextName, setContextName] = useState("");
  const [method, setMethod] = useState("Active recall");
  const [nextStep, setNextStep] = useState("");
  const [interruption, setInterruption] = useState("");
  const [duration, setDuration] = useState(25);
  /**
   * A running focus block or break is a wall-clock end time, so the clock is
   * right whenever a throttled background tab wakes up, and it survives a
   * reload. `pausedRemaining` holds the seconds left while paused.
   */
  type StudyRun = {
    mode: "focus" | "break";
    endsAt: number;
    pausedRemaining: number | null;
    plannedSeconds: number;
    topic: string;
  };
  const [run, setRun] = useState<StudyRun | null>(null);
  const [tick, setTick] = useState(() => Date.now());
  const [awaitingOutcome, setAwaitingOutcome] = useState(false);
  const [sessions, setSessions] = useState<StudySessionRecord[]>([]);
  const [lastSessions, setLastSessions] = useState<StudySessionRecord[] | null>(
    null
  );
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({
    outcome: "Finished",
    nextStep: "",
  });
  useMongoJournalScope({
    scope: "study-sessions",
    payload: { sessions, run, awaitingOutcome },
    hydrate: payload => {
      if (Array.isArray(payload.sessions))
        setSessions(payload.sessions as StudySessionRecord[]);
      if (payload.run && typeof payload.run === "object") {
        const stored = payload.run as StudyRun;
        setRun(stored);
        if (stored.topic) setTopic(current => current || stored.topic);
      }
      if (typeof payload.awaitingOutcome === "boolean")
        setAwaitingOutcome(payload.awaitingOutcome);
    },
  });
  const summary = studyTimeSummary(sessions, today);
  const allMinutes = sessions.reduce(
    (total, session) => total + session.minutes,
    0
  );
  const isPaused = run !== null && run.pausedRemaining !== null;
  const isRunning = run !== null && !isPaused;
  const isBreak = run?.mode === "break";
  const remainingSeconds = run
    ? isPaused
      ? run.pausedRemaining!
      : Math.max(0, Math.round((run.endsAt - tick) / 1000))
    : duration * 60;
  const elapsedSeconds = run ? run.plannedSeconds - remainingSeconds : 0;
  const hasStarted = run !== null && run.mode === "focus";

  useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => setTick(Date.now()), 1000);
    const onVisible = () => setTick(Date.now());
    document.addEventListener("visibilitychange", onVisible);
    setTick(Date.now());
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isRunning]);
  useEffect(() => {
    if (!isRunning || remainingSeconds !== 0) return;
    if (run?.mode === "break") {
      setRun(null);
      toast("Break over — ready when you are");
    } else {
      // Keep the finished run so the outcome step can read its length.
      setRun(current => (current ? { ...current, pausedRemaining: 0 } : null));
      setAwaitingOutcome(true);
    }
  }, [isRunning, remainingSeconds, run?.mode]);
  useEffect(() => {
    if (!run || awaitingOutcome) {
      document.title = "Glory Mukami's Personal Tracker";
      return;
    }
    document.title = `${isPaused ? "⏸" : run.mode === "break" ? "◐" : "●"} ${formatStudyTimer(remainingSeconds)} · study`;
    return () => {
      document.title = "Glory Mukami's Personal Tracker";
    };
  }, [run, isPaused, remainingSeconds, awaitingOutcome]);

  function selectDuration(value: number) {
    setDuration(value);
  }
  function startSession() {
    if (!topic.trim()) return;
    const now = Date.now();
    setAwaitingOutcome(false);
    setRun({
      mode: "focus",
      endsAt: now + duration * 60_000,
      pausedRemaining: null,
      plannedSeconds: duration * 60,
      topic: topic.trim(),
    });
  }
  function pauseRun() {
    if (!run || isPaused) return;
    setRun({ ...run, pausedRemaining: remainingSeconds });
  }
  function resumeRun() {
    if (!run || !isPaused) return;
    // Resume continues from where it paused — it never restarts the block.
    setRun({
      ...run,
      endsAt: Date.now() + run.pausedRemaining! * 1000,
      pausedRemaining: null,
    });
  }
  function discardRun() {
    setRun(null);
    setAwaitingOutcome(false);
    toast("Session discarded — nothing was saved");
  }
  function saveOutcome(outcome: string) {
    const completedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
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
    setRun(null);
    setAwaitingOutcome(false);
    setTopic("");
    setContextName("");
    setNextStep("");
    setInterruption("");
    toast(`${completedMinutes} min on ${record.topic} saved · ${outcome}`);
  }
  function beginBreak() {
    setAwaitingOutcome(false);
    setRun({
      mode: "break",
      endsAt: Date.now() + 5 * 60_000,
      pausedRemaining: null,
      plannedSeconds: 5 * 60,
      topic: "",
    });
  }
  function removeSession(session: StudySessionRecord) {
    setLastSessions(sessions);
    setSessions(current => current.filter(item => item.id !== session.id));
    toast(`Removed ${session.minutes} min on ${session.topic}`);
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
      className="journal-spread study-spread glass-scope"
      aria-labelledby="study-title"
    >
      <div className="spread-page study-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">life · education · study sessions</p>
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
        <section
          className={cn(
            "study-timer",
            isBreak && "break-mode",
            isPaused && !awaitingOutcome && "paused-mode"
          )}
          role="timer"
          aria-label={
            awaitingOutcome
              ? "Session finished, choose an outcome"
              : isBreak
                ? `Break, ${formatStudyTimer(remainingSeconds)} left`
                : isRunning
                  ? `Focus running, ${formatStudyTimer(remainingSeconds)} left`
                  : isPaused
                    ? `Focus paused, ${formatStudyTimer(remainingSeconds)} left`
                    : `Not started, ${duration} minutes chosen`
          }
        >
          <div className="study-timer-top">
            <div>
              <span className={cn("study-state", isRunning && "running")}>
                {awaitingOutcome
                  ? "✓ Session finished"
                  : isBreak
                    ? isPaused
                      ? "⏸ Break paused"
                      : "◐ Break running"
                    : isRunning
                      ? "● Focus running"
                      : isPaused
                        ? "⏸ Focus paused"
                        : "○ Not started"}
              </span>
              <b>{formatStudyTimer(remainingSeconds)}</b>
              <small>
                {awaitingOutcome && run
                  ? `${Math.max(1, Math.round(elapsedSeconds / 60))} min will be saved`
                  : isBreak
                    ? "A short pause is part of the work."
                    : run && isRunning
                      ? `ends ${new Date(run.endsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · ${run.topic}`
                      : run && isPaused
                        ? `paused · ${run.topic}`
                        : `${duration} minute session`}
              </small>
            </div>
            <div className="study-lengths">
              {[15, 25, 45, 60].map(value => (
                <button
                  type="button"
                  key={value}
                  className={cn(duration === value && "active")}
                  onClick={() => selectDuration(value)}
                  disabled={run !== null}
                  aria-pressed={duration === value}
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
              <button
                type="button"
                className="study-discard"
                onClick={discardRun}
              >
                Discard — don’t save
              </button>
            </div>
          ) : (
            <div className="study-timer-actions">
              {isRunning ? (
                <button type="button" onClick={pauseRun}>
                  Pause
                </button>
              ) : isPaused ? (
                <button type="button" onClick={resumeRun}>
                  {isBreak ? "Resume break" : "Resume focus"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startSession}
                  disabled={!topic.trim()}
                >
                  {topic.trim()
                    ? `Start ${duration} min on “${topic.trim()}”`
                    : "Name a topic to start"}
                </button>
              )}
              {hasStarted ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setRun(current =>
                        current
                          ? { ...current, pausedRemaining: remainingSeconds }
                          : null
                      );
                      setAwaitingOutcome(true);
                    }}
                  >
                    End session
                  </button>
                  <button
                    type="button"
                    className="study-discard"
                    onClick={discardRun}
                  >
                    Discard
                  </button>
                </>
              ) : null}
              {!run ? (
                <button
                  type="button"
                  className="study-break"
                  onClick={beginBreak}
                >
                  Take 5 min break
                </button>
              ) : isBreak ? (
                <button
                  type="button"
                  className="study-discard"
                  onClick={discardRun}
                >
                  End break
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
            {lastSessions && (
              <button
                type="button"
                className="local-undo"
                onClick={() => {
                  setSessions(lastSessions);
                  setLastSessions(null);
                }}
              >
                Undo remove
              </button>
            )}
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
                    onClick={() => removeSession(session)}
                    aria-label={`Remove ${session.minutes} minute session on ${session.topic}`}
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
  const today = sleepDateInputValue(new Date());
  const emptyDraft = {
    title: "",
    date: "",
    focus: "",
    readiness: "3",
    topics: [] as Topic[],
    checkpoints: [] as ExamCheckpoint[],
  };
  const [exams, setExams] = useState<ExamPlan[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const readinessWords: Record<number, string> = {
    1: "Not started",
    2: "Early days",
    3: "Getting there",
    4: "Nearly ready",
    5: "Ready",
  };
  const topicCycle =
    "Tap to cycle: Needs practice → Revising → Confident → Needs practice";
  function examWhen(date: string) {
    const detail = assignmentDueDetail(date, today);
    const label =
      detail.kind === "overdue"
        ? `Was ${Math.abs(detail.daysAway ?? 0)} day${Math.abs(detail.daysAway ?? 0) === 1 ? "" : "s"} ago`
        : detail.kind === "today"
          ? "Today"
          : detail.kind === "tomorrow"
            ? "Tomorrow"
            : detail.kind === "none"
              ? "No date"
              : `${detail.daysAway} days to go`;
    return { ...detail, label };
  }
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
    setEditingId(null);
  }
  function beginEditExam(exam: ExamPlan) {
    setDraft({
      title: exam.title,
      date: exam.date,
      focus: exam.focus,
      readiness: String(exam.readiness),
      topics: exam.topics,
      checkpoints: exam.checkpoints,
    });
    setEditingId(exam.id);
    setOpenComposer(true);
    setPlanningOpen(true);
  }
  function deleteExam(id: string) {
    setExams(current => current.filter(exam => exam.id !== id));
    setConfirmDeleteId(null);
    if (editingId === id) resetComposer();
    toast("Exam and its revision log deleted");
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
    const fields = {
      title: draft.title.trim(),
      date: draft.date,
      focus: draft.focus.trim(),
      readiness: Number(draft.readiness),
      topics: draft.topics,
      checkpoints: draft.checkpoints,
    };
    if (editingId) {
      // Logs, reflection and completion belong to the exam's history and
      // are not part of the form; an edit leaves them untouched.
      setExams(current =>
        current.map(exam =>
          exam.id === editingId ? { ...exam, ...fields } : exam
        )
      );
      toast("Exam updated");
    } else {
      setExams(current => [
        ...current,
        {
          id: `${Date.now()}-exam`,
          ...fields,
          logs: [],
          reflection: "",
          completed: false,
        },
      ]);
      toast(`${fields.title} added · ${examWhen(fields.date).label}`);
    }
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
    const when = examWhen(exam.date);
    const confident = exam.topics.filter(
      topic => topic.status === "Confident"
    ).length;
    return (
      <article
        className={cn(
          "exam-plan-card",
          exam.completed && "completed",
          !exam.completed && `is-${when.kind}`,
          editingId === exam.id && "is-editing"
        )}
        key={exam.id}
      >
        <div className="exam-plan-top">
          <div>
            <span
              className={cn("exam-when", !exam.completed && `is-${when.kind}`)}
              title={when.exact}
            >
              {exam.completed ? "✓ Completed" : when.label}
            </span>
            <b>{exam.title}</b>
            <small>
              <time dateTime={exam.date}>{when.exact}</time> · readiness{" "}
              {exam.readiness}/5
              {readinessWords[exam.readiness]
                ? ` (${readinessWords[exam.readiness].toLowerCase()})`
                : ""}
              {exam.topics.length
                ? ` · ${confident} of ${exam.topics.length} topics confident`
                : ""}
            </small>
          </div>
          <div className="exam-plan-top-actions">
            <button type="button" onClick={() => beginEditExam(exam)}>
              Edit
            </button>
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
                  {checkpoint.date
                    ? ` · ${checkpoint.done ? "done" : examWhen(checkpoint.date).label.toLowerCase()} (${examWhen(checkpoint.date).exact})`
                    : ""}
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
                title={topicCycle}
                aria-label={`${topic.label}: ${topic.status}. ${topicCycle}`}
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
          {confirmDeleteId === exam.id ? (
            <>
              <button
                type="button"
                className="is-danger"
                onClick={() => deleteExam(exam.id)}
              >
                Delete for good
              </button>
              <button type="button" onClick={() => setConfirmDeleteId(null)}>
                Keep
              </button>
            </>
          ) : (
            <button
              type="button"
              className="exam-delete"
              onClick={() => setConfirmDeleteId(exam.id)}
            >
              Delete…
            </button>
          )}
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
      className="journal-spread exams-spread glass-scope"
      aria-labelledby="exams-title"
    >
      <div className="spread-page exams-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">life · education · exams</p>
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
                ? `${active[0].title} · ${examWhen(active[0].date).label} · ${examWhen(active[0].date).exact}`
                : "No exam added yet"}
            </b>
          </div>
          <p>{revisionMinutes} local revision minutes in the last 7 days</p>
          <button
            type="button"
            onClick={() => {
              resetComposer();
              setOpenComposer(true);
            }}
          >
            Add exam
          </button>
        </section>
        {openComposer ? (
          <form className="exam-composer" onSubmit={saveExam}>
            <div>
              <span>{editingId ? "Edit exam" : "Plan an exam"}</span>
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
            <button type="submit">
              {editingId ? "Save changes" : "Save exam"}
            </button>
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
  const archived = courses.filter(course => course.archived);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const today = sleepDateInputValue(new Date());
  function dueChip(due: string) {
    if (!due) return null;
    const detail = assignmentDueDetail(due, today);
    return (
      <small
        className={cn("course-due", `is-${detail.kind}`)}
        title={detail.exact}
      >
        {detail.label}
      </small>
    );
  }
  function resetComposer() {
    setDraft(emptyDraft);
    setEditingId(null);
    setDetailsOpen(false);
    setFormOpen(false);
  }
  function setArchived(id: string, value: boolean) {
    updateCourse(id, current => ({ ...current, archived: value }));
    toast(value ? "Course archived — find it under Archived courses" : "Course restored");
  }
  function deleteCourse(id: string) {
    setCourses(current => current.filter(course => course.id !== id));
    setConfirmDeleteId(null);
    toast("Course and everything inside it deleted");
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
    const standing = standingDetail(course.assessments);
    const nextItem = nextAcademicItem([...course.milestones, ...course.work]);
    const milestoneDone = course.milestones.filter(item => item.done).length;
    const termEnd = course.termEnd
      ? assignmentDueDetail(course.termEnd, today)
      : null;
    return (
      <article className="course-work-card" key={course.id}>
        <div className="course-work-top">
          <div>
            <span>{course.code || "Course"}</span>
            <b>{course.title}</b>
            <small>
              {course.target || "Set a course outcome whenever you are ready."}
              {termEnd
                ? ` · term ${termEnd.kind === "overdue" ? "ended" : "ends"} ${termEnd.exact}${termEnd.daysAway !== null && termEnd.daysAway >= 0 ? ` (${termEnd.daysAway === 0 ? "today" : `${termEnd.daysAway} days`})` : ""}`
                : ""}
            </small>
          </div>
          {standing.standing !== null ? (
            <em
              title={`${standing.gradedCount} of ${standing.totalCount} weighted assessments have a score; ${standing.gradedWeight} of ${standing.totalWeight} weight points are graded`}
            >
              {standing.standing}% so far
              <small>
                across {standing.gradedWeight}
                {standing.totalWeight ? ` of ${standing.totalWeight}` : ""}{" "}
                weight graded
              </small>
            </em>
          ) : (
            <em>
              {course.weeklyGoal} min weekly goal
              {standing.totalCount > 0 ? (
                <small>no scores yet</small>
              ) : null}
            </em>
          )}
        </div>
        <p>
          <strong>Current focus:</strong> {course.focus}
        </p>
        <div className="course-next-item">
          <span>Next academic item</span>
          <b>
            {nextItem ? nextItem.label : "Add a milestone or course-work item"}
            {nextItem ? dueChip(nextItem.due) : null}
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
                {item.done ? (
                  <small>done</small>
                ) : item.due ? (
                  dueChip(item.due)
                ) : (
                  <small>No due date</small>
                )}
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
                {!item.done && item.due ? dueChip(item.due) : null}
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
          <button type="button" onClick={() => setArchived(course.id, true)}>
            Archive
          </button>
        </div>
      </article>
    );
  }
  return (
    <section
      className="journal-spread courses-spread glass-scope"
      aria-labelledby="courses-title"
    >
      <div className="spread-page courses-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">life · education · courses</p>
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
        {archived.length > 0 && (
          <section
            className="course-archived"
            aria-labelledby="course-archived-title"
          >
            <div>
              <span id="course-archived-title">Archived courses</span>
              <b>{archived.length}</b>
            </div>
            <small>
              Archived courses keep their materials, milestones and scores.
              Restore any time, or delete for good.
            </small>
            {archived.map(course => (
              <article key={course.id}>
                <b>
                  {course.code ? `${course.code} · ` : ""}
                  {course.title}
                </b>
                <small>
                  {course.assessments.length} assessment
                  {course.assessments.length === 1 ? "" : "s"} ·{" "}
                  {course.milestones.length} milestone
                  {course.milestones.length === 1 ? "" : "s"}
                </small>
                <div>
                  <button
                    type="button"
                    onClick={() => setArchived(course.id, false)}
                  >
                    Restore
                  </button>
                  {confirmDeleteId === course.id ? (
                    <>
                      <button
                        type="button"
                        className="is-danger"
                        onClick={() => deleteCourse(course.id)}
                      >
                        Delete for good
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Keep
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(course.id)}
                    >
                      Delete…
                    </button>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}
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
  const [priorityFilter, setPriorityFilter] = useState<
    PlanningTask["priority"] | "all"
  >("all");
  const [query, setQuery] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const auth = useAuth();
  const planningSummary = taskPlanningSummary(tasks);
  const sectionTasks = taskSection(tasks, section);
  const visibleTasks = sectionTasks.filter(task => {
    if (priorityFilter !== "all" && task.priority !== priorityFilter)
      return false;
    if (!query.trim()) return true;
    const haystack =
      `${task.title} ${task.area} ${task.nextStep} ${task.note} ${task.subtasks.map(item => item.label).join(" ")}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });
  const filtersActive = priorityFilter !== "all" || query.trim() !== "";
  const priorityGlyph: Record<PlanningTask["priority"], string> = {
    High: "!!!",
    Medium: "!!",
    Low: "!",
  };
  function deleteTask(task: PlanningTask) {
    journal.remove(task.id, `Deleted ${task.title}`);
    if (editingId === task.id) resetTaskDraft();
  }
  function deferTask(task: PlanningTask) {
    const toLater = task.when === "today";
    journal.edit(
      task.id,
      {
        ...task,
        when: toLater ? "later" : "today",
        due:
          task.due === "Today" || task.due === "Later"
            ? toLater
              ? "Later"
              : "Today"
            : task.due,
      },
      toLater ? `Moved ${task.title} to later` : `Moved ${task.title} to today`
    );
  }
  function completeAllShown() {
    const open = visibleTasks.filter(task => !task.done);
    for (const task of open) {
      journal.edit(
        task.id,
        { ...task, done: true, completedAt: new Date().toISOString() },
        `Completed ${task.title}`
      );
    }
    if (open.length) toast(`${open.length} task${open.length === 1 ? "" : "s"} completed — each one can be undone`);
  }
  function clearCompleted() {
    const done = tasks.filter(task => task.done);
    for (const task of done) journal.remove(task.id, `Deleted ${task.title}`);
    setConfirmClear(false);
    if (done.length) toast(`${done.length} completed task${done.length === 1 ? "" : "s"} deleted — each one can be undone`);
  }
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
        .split(/\r?\n/)
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
      {
        ...task,
        done: !task.done,
        // Stamped so "tasks completed" can be counted on the day it actually
        // happened. Cleared on reopening, because a completion date against an
        // open task is simply untrue.
        completedAt: task.done ? undefined : new Date().toISOString(),
      },
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
      className="journal-spread tasks-spread glass-scope"
      aria-labelledby="tasks-title"
    >
      <div className="spread-page tasks-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">life · tasks</p>
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
        <div className="task-filters" role="group" aria-label="Filter tasks">
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search title, area, notes…"
            aria-label="Search tasks"
          />
          <div className="task-priority-filter">
            {(["all", "High", "Medium", "Low"] as const).map(value => (
              <button
                type="button"
                key={value}
                className={cn(priorityFilter === value && "active")}
                aria-pressed={priorityFilter === value}
                onClick={() => setPriorityFilter(value)}
              >
                {value === "all" ? "All" : `${priorityGlyph[value]} ${value}`}
              </button>
            ))}
          </div>
          {filtersActive && (
            <button
              type="button"
              className="task-filter-clear"
              onClick={() => {
                setQuery("");
                setPriorityFilter("all");
              }}
            >
              Clear filters
            </button>
          )}
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
            {filtersActive
              ? `${visibleTasks.length} of ${sectionTasks.length} shown`
              : section === "today"
                ? `${planningSummary.timeBoundToday} time-bound`
                : section === "later"
                  ? "No urgency added"
                  : `${planningSummary.completed} finished`}
          </b>
        </div>
        {visibleTasks.length > 1 && section !== "completed" && (
          <div className="task-bulk">
            <button type="button" onClick={completeAllShown}>
              Complete all {visibleTasks.length} shown
            </button>
          </div>
        )}
        {section === "completed" && sectionTasks.length > 0 && (
          <div className="task-bulk">
            {confirmClear ? (
              <>
                <span>
                  Delete all {sectionTasks.length} completed tasks? Each one
                  can still be undone right after.
                </span>
                <button type="button" className="is-danger" onClick={clearCompleted}>
                  Yes, delete them
                </button>
                <button type="button" onClick={() => setConfirmClear(false)}>
                  Keep
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmClear(true)}>
                Clear completed…
              </button>
            )}
          </div>
        )}
        <div className="task-list">
          {visibleTasks.length === 0 ? (
            <div className="task-empty">
              <b>
                {filtersActive
                  ? "Nothing matches those filters"
                  : section === "completed"
                    ? "Nothing completed yet"
                    : section === "today"
                      ? "Today is clear"
                      : "Nothing parked for later"}
              </b>
              <small>
                {filtersActive
                  ? "Try a different word, or clear the filters above."
                  : "Add a task above when something needs a place."}
              </small>
            </div>
          ) : (
            visibleTasks.map(task => {
              const completedSubtasks = task.subtasks.filter(
                item => item.done
              ).length;
              return (
                <article
                  className={cn(
                    "task-card",
                    task.done && "done",
                    editingId === task.id && "is-editing"
                  )}
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
                      {task.area} ·{" "}
                      <span
                        className={`task-priority task-priority-${task.priority.toLowerCase()}`}
                      >
                        <span aria-hidden="true">
                          {priorityGlyph[task.priority]}
                        </span>{" "}
                        {task.priority} priority
                      </span>
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
                  <div className="task-card-actions">
                    <button
                      type="button"
                      className="task-edit"
                      onClick={() => beginTaskEdit(task)}
                    >
                      Edit
                    </button>
                    {!task.done && (
                      <button
                        type="button"
                        onClick={() => deferTask(task)}
                        aria-label={
                          task.when === "today"
                            ? `Move ${task.title} to later`
                            : `Move ${task.title} to today`
                        }
                      >
                        {task.when === "today" ? "→ Later" : "→ Today"}
                      </button>
                    )}
                    <button
                      type="button"
                      className="task-delete"
                      onClick={() => deleteTask(task)}
                      aria-label={`Delete ${task.title}`}
                    >
                      Delete
                    </button>
                  </div>
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
  const [boundaryEnd, setBoundaryEnd] = useState("06:30");
  const [boundarySkippedOn, setBoundarySkippedOn] = useState<string | null>(
    null
  );
  const [entries, setEntries] = useState<DigitalEntry[]>([]);
  const [lastEntries, setLastEntries] = useState<DigitalEntry[] | null>(null);
  const [draft, setDraft] = useState({
    minutes: "30",
    category: "Study",
    purpose: "Intentional",
    note: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const minutesRef = useRef<HTMLInputElement>(null);
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);
  useMongoJournalScope({
    scope: "digital-life",
    payload: {
      goal,
      boundary,
      boundaryTime,
      boundaryEnd,
      boundarySkippedOn,
      entries,
    },
    hydrate: payload => {
      if (typeof payload.goal === "number") setGoal(payload.goal);
      if (typeof payload.boundary === "boolean") setBoundary(payload.boundary);
      if (typeof payload.boundaryTime === "string")
        setBoundaryTime(payload.boundaryTime);
      if (typeof payload.boundaryEnd === "string")
        setBoundaryEnd(payload.boundaryEnd);
      if (
        typeof payload.boundarySkippedOn === "string" ||
        payload.boundarySkippedOn === null
      )
        setBoundarySkippedOn(payload.boundarySkippedOn as string | null);
      if (Array.isArray(payload.entries))
        setEntries(payload.entries as DigitalEntry[]);
    },
  });
  const today = sleepDateInputValue(new Date());
  const summary = digitalSummary(entries, today);
  const progress = Math.min(
    100,
    Math.round((summary.todayMinutes / goal) * 100)
  );

  // The boundary is a window in local device time that may cross midnight
  // (21:30 → 06:30). "Tonight" is keyed by the date the window starts.
  const boundaryStatus = (() => {
    const now = new Date(clock);
    const toMinutes = (value: string) => {
      const [h, m] = value.split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const start = toMinutes(boundaryTime);
    const end = toMinutes(boundaryEnd);
    const current = now.getHours() * 60 + now.getMinutes();
    const crossesMidnight = end <= start;
    const inside = crossesMidnight
      ? current >= start || current < end
      : current >= start && current < end;
    const windowDate = new Date(now);
    if (inside && crossesMidnight && current < end)
      windowDate.setDate(windowDate.getDate() - 1);
    const windowKey = sleepDateInputValue(windowDate);
    const skippedTonight = boundarySkippedOn === windowKey;
    const minutesUntil = inside
      ? 0
      : ((start - current + 24 * 60) % (24 * 60));
    const minutesIn = inside ? (current - start + 24 * 60) % (24 * 60) : 0;
    return { inside, skippedTonight, windowKey, minutesUntil, minutesIn };
  })();
  function formatHm(total: number) {
    const h = Math.floor(total / 60);
    const m = total % 60;
    return h > 0 ? `${h} h ${m} min` : `${m} min`;
  }

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
    const existing = editingId
      ? entries.find(item => item.id === editingId)
      : undefined;
    const entry: DigitalEntry = {
      id: editingId || `${Date.now()}-digital`,
      // An edit keeps the entry on its own day; it doesn't move it to today.
      date: existing?.date ?? today,
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
    toast(
      editingId
        ? "Entry updated"
        : `${minutes} min of ${draft.category.toLowerCase()} saved`
    );
    resetDraft();
  }
  function removeEntry(entry: DigitalEntry) {
    setLastEntries(entries);
    setEntries(current => current.filter(item => item.id !== entry.id));
    toast(`Removed ${entry.minutes} min of ${entry.category.toLowerCase()}`);
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
      className="journal-spread digital-life-spread glass-scope"
      aria-labelledby="digital-life-title"
    >
      <div className="spread-page digital-life-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">mind · digital life</p>
        <h2 id="digital-life-title">
          Use your attention
          <br />
          <em>on purpose.</em>
        </h2>
        <p className="page-intro">
          A private screen-time check-in that makes space for boundaries, focus,
          and the parts of life that do not live behind a screen.
        </p>
        <button
          type="button"
          className="ink-button"
          onClick={() => {
            resetDraft();
            minutesRef.current?.scrollIntoView({
              block: "center",
              behavior: "smooth",
            });
            minutesRef.current?.focus();
          }}
        >
          <Plus size={15} /> Log screen time
        </button>
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
              <b>Entered by hand</b>
            </div>
            <small>
              Record what the time was for, not just the number. Today’s total
              is the sum of what you log here.
            </small>
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
                ref={minutesRef}
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
        <section
          className={cn(
            "digital-boundary",
            boundary &&
              boundaryStatus.inside &&
              !boundaryStatus.skippedTonight &&
              "is-inside"
          )}
          aria-labelledby="digital-boundary-title"
        >
          <label>
            <input
              type="checkbox"
              checked={boundary}
              onChange={event => setBoundary(event.target.checked)}
            />
            <span>
              <b id="digital-boundary-title">Evening boundary</b>
              <small>
                A line you draw for yourself. This page only tells you where you
                stand against it — it never blocks or locks anything.
              </small>
            </span>
          </label>
          <div className="digital-boundary-times">
            <label>
              From
              <input
                type="time"
                value={boundaryTime}
                onChange={event => setBoundaryTime(event.target.value)}
                disabled={!boundary}
              />
            </label>
            <label>
              Until
              <input
                type="time"
                value={boundaryEnd}
                onChange={event => setBoundaryEnd(event.target.value)}
                disabled={!boundary}
              />
            </label>
          </div>
          <p className="digital-boundary-status" aria-live="polite">
            {!boundary
              ? "Off. Nothing is watched or shown."
              : boundaryStatus.skippedTonight
                ? `Skipped tonight — back on tomorrow at ${boundaryTime}.`
                : boundaryStatus.inside
                  ? `Inside your boundary · ${formatHm(boundaryStatus.minutesIn)} past ${boundaryTime}.`
                  : `${formatHm(boundaryStatus.minutesUntil)} until your ${boundaryTime} boundary.`}
          </p>
          {boundary && (
            <small className="digital-boundary-fine">
              Times are your device’s local clock; a window that ends before it
              starts runs overnight.
              {boundaryStatus.inside && !boundaryStatus.skippedTonight ? (
                <>
                  {" "}
                  <button
                    type="button"
                    className="digital-inline-link"
                    onClick={() => {
                      setBoundarySkippedOn(boundaryStatus.windowKey);
                      toast("Boundary skipped for tonight only");
                    }}
                  >
                    Skip tonight
                  </button>{" "}
                  if this evening is an exception — it comes back tomorrow on
                  its own.
                </>
              ) : boundaryStatus.skippedTonight ? (
                <>
                  {" "}
                  <button
                    type="button"
                    className="digital-inline-link"
                    onClick={() => setBoundarySkippedOn(null)}
                  >
                    Un-skip
                  </button>
                </>
              ) : null}
            </small>
          )}
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
            {lastEntries && (
              <button
                type="button"
                className="local-undo"
                onClick={() => {
                  setEntries(lastEntries);
                  setLastEntries(null);
                }}
              >
                Undo remove
              </button>
            )}
          </div>
          {entries.length === 0 ? (
            <small>Your entries will appear here.</small>
          ) : (
            entries.slice(0, 5).map(entry => (
              <article
                key={entry.id}
                className={cn(editingId === entry.id && "is-editing")}
              >
                <div>
                  <b>
                    {entry.minutes} min · {entry.category} · {entry.purpose}
                  </b>
                  <small>
                    {entry.date === today ? "Today" : entry.date}
                    {entry.note ? ` · ${entry.note}` : ""}
                  </small>
                </div>
                <div>
                  <button type="button" onClick={() => beginEdit(entry)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => removeEntry(entry)}
                    aria-label={`Remove ${entry.minutes} minutes of ${entry.category} on ${entry.date}`}
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
  /**
   * The running session is a wall-clock end time, not a decrementing
   * counter. Background tabs throttle intervals to once a minute or worse,
   * so a counter drifts; a timestamp is right whenever the tab wakes up.
   * `pausedRemaining` holds the seconds left while paused.
   */
  type FocusRun = {
    endsAt: number;
    pausedRemaining: number | null;
    plannedMinutes: number;
    startedAt: number;
  };
  const [run, setRun] = useState<FocusRun | null>(null);
  const [tick, setTick] = useState(() => Date.now());
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [lastSessions, setLastSessions] = useState<FocusSession[] | null>(null);
  const [lastOutcome, setLastOutcome] = useState<
    FocusSession["outcome"] | null
  >(null);
  const [notifyAtEnd, setNotifyAtEnd] = useState(false);
  const notificationsSupported =
    typeof window !== "undefined" && "Notification" in window;
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >(() =>
    notificationsSupported ? Notification.permission : "unsupported"
  );
  useMongoJournalScope({
    scope: "productivity",
    payload: { tasks, activeTaskId, sessions, run, notifyAtEnd },
    hydrate: payload => {
      if (Array.isArray(payload.tasks)) setTasks(payload.tasks as typeof tasks);
      if (typeof payload.activeTaskId === "string")
        setActiveTaskId(payload.activeTaskId);
      if (Array.isArray(payload.sessions))
        setSessions(payload.sessions as FocusSession[]);
      if (payload.run && typeof payload.run === "object")
        setRun(payload.run as FocusRun);
      if (typeof payload.notifyAtEnd === "boolean")
        setNotifyAtEnd(payload.notifyAtEnd);
    },
  });
  const today = sleepDateInputValue(new Date());
  const activeTask = tasks.find(task => task.id === activeTaskId) || tasks[0];
  const summary = focusSummary(sessions, today);
  const todaySummary = focusSummary(
    sessions.filter(session => session.date === today),
    today
  );
  const isFocusing = run !== null;
  const isPaused = run?.pausedRemaining !== null && run?.pausedRemaining !== undefined;
  const secondsLeft = run
    ? isPaused
      ? run.pausedRemaining!
      : Math.max(0, Math.round((run.endsAt - tick) / 1000))
    : minutes * 60;
  const elapsedSeconds = run ? run.plannedMinutes * 60 - secondsLeft : 0;
  const timerState: "idle" | "running" | "paused" | "done" = !run
    ? lastOutcome
      ? "done"
      : "idle"
    : isPaused
      ? "paused"
      : "running";

  // Tick once a second while running; re-sync the moment the tab is visible
  // again, since the interval may not have fired while it was hidden.
  useEffect(() => {
    if (!run || isPaused) return;
    const interval = window.setInterval(() => setTick(Date.now()), 1000);
    const onVisible = () => setTick(Date.now());
    document.addEventListener("visibilitychange", onVisible);
    setTick(Date.now());
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [run, isPaused]);
  useEffect(() => {
    if (run && !isPaused && secondsLeft === 0) {
      if (notifyAtEnd && notificationPermission === "granted") {
        try {
          new Notification("Focus session finished", {
            body: activeTask
              ? `${run.plannedMinutes} min on “${activeTask.label}”. Come back to choose what happens next.`
              : `${run.plannedMinutes} min of focus.`,
            tag: "focus-session-end",
          });
        } catch {
          // A notification that can't be shown is not worth breaking the save.
        }
      }
      finishSession("continued");
    }
  }, [secondsLeft, run, isPaused]);
  useEffect(() => {
    if (!run) {
      document.title = "Glory Mukami's Personal Tracker";
      return;
    }
    document.title = `${isPaused ? "⏸" : "●"} ${formatSeconds(secondsLeft)} · focus`;
    return () => {
      document.title = "Glory Mukami's Personal Tracker";
    };
  }, [run, isPaused, secondsLeft]);

  function formatSeconds(total: number) {
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  }
  function startSession() {
    const now = Date.now();
    setLastOutcome(null);
    setRun({
      startedAt: now,
      endsAt: now + minutes * 60_000,
      pausedRemaining: null,
      plannedMinutes: minutes,
    });
  }
  function pauseSession() {
    if (!run || isPaused) return;
    setRun({ ...run, pausedRemaining: secondsLeft });
  }
  function resumeSession() {
    if (!run || !isPaused) return;
    setRun({
      ...run,
      endsAt: Date.now() + run.pausedRemaining! * 1000,
      pausedRemaining: null,
    });
  }
  function cancelSession() {
    setRun(null);
    setLastOutcome(null);
    toast("Session discarded — nothing was saved");
  }
  async function toggleNotifications() {
    if (!notificationsSupported) return;
    if (notifyAtEnd) {
      setNotifyAtEnd(false);
      return;
    }
    let permission = Notification.permission;
    if (permission === "default") {
      try {
        permission = await Notification.requestPermission();
      } catch {
        permission = "denied";
      }
    }
    setNotificationPermission(permission);
    setNotifyAtEnd(permission === "granted");
    if (permission === "denied")
      toast("Notifications are blocked for this site in your browser settings");
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
    if (!activeTask || !run) return;
    // What actually happened, not what was planned: a session ended at
    // minute 3 of 25 is a 3-minute session.
    const actualMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const session: FocusSession = {
      id: `${Date.now()}-focus`,
      date: today,
      minutes: actualMinutes,
      taskId: activeTask.id,
      taskLabel: activeTask.label,
      nextStep: activeTask.nextStep,
      outcome,
    };
    setSessions(current => [session, ...current]);
    onRecordSession(actualMinutes, activeTask.label);
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
    setRun(null);
  }
  return (
    <section
      className="journal-spread productivity-spread glass-scope"
      aria-labelledby="productivity-title"
    >
      <div className="spread-page productivity-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">mind · productivity</p>
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
          <div
            className={cn(
              "focus-clock",
              timerState === "running" && "running",
              timerState === "paused" && "paused"
            )}
            role="timer"
            aria-live={timerState === "running" ? "off" : "polite"}
            aria-label={
              timerState === "running"
                ? `Focus running, ${formatSeconds(secondsLeft)} remaining`
                : timerState === "paused"
                  ? `Focus paused with ${formatSeconds(secondsLeft)} remaining`
                  : `Timer not started, ${minutes} minutes chosen`
            }
          >
            <span className={cn("focus-state-pill", timerState)}>
              {timerState === "running"
                ? "● Running"
                : timerState === "paused"
                  ? "⏸ Paused"
                  : timerState === "done"
                    ? "✓ Saved"
                    : "○ Not started"}
            </span>
            <b>{formatSeconds(secondsLeft)}</b>
            <small>
              {timerState === "running" && run
                ? `remaining · ends ${new Date(run.endsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                : timerState === "paused"
                  ? "remaining · paused"
                  : `${minutes} min chosen · nothing running`}
            </small>
          </div>
          {isFocusing ? (
            <>
              <div className="focus-run-controls">
                {isPaused ? (
                  <button type="button" onClick={resumeSession}>
                    Resume
                  </button>
                ) : (
                  <button type="button" onClick={pauseSession}>
                    Pause
                  </button>
                )}
                <button
                  type="button"
                  className="focus-cancel"
                  onClick={cancelSession}
                >
                  Discard — don’t save
                </button>
              </div>
              <div className="focus-outcomes">
                <Button
                  type="button"
                  className="ink-button"
                  onClick={() => finishSession("completed")}
                >
                  Task finished
                </Button>
                <button type="button" onClick={() => finishSession("continued")}>
                  Stop · continue later
                </button>
                <button type="button" onClick={() => finishSession("next-step")}>
                  Stop · choose next step
                </button>
              </div>
              <small className="focus-run-hint">
                Ending early saves the minutes you actually spent (
                {Math.max(1, Math.round(elapsedSeconds / 60))} so far), not the
                {" "}{run?.plannedMinutes} planned.
              </small>
            </>
          ) : (
            <Button
              type="button"
              className="ink-button"
              onClick={startSession}
              disabled={!activeTask}
            >
              {activeTask
                ? `Start ${minutes} min on “${activeTask.label}”`
                : "Add a task to start"}
            </Button>
          )}
          <label className="focus-notify">
            <input
              type="checkbox"
              checked={notifyAtEnd && notificationPermission === "granted"}
              onChange={toggleNotifications}
              disabled={!notificationsSupported}
            />
            <span>
              <b>Notify me when the session ends</b>
              <small>
                {!notificationsSupported
                  ? "This browser doesn’t support notifications — the tab title counts down instead."
                  : notificationPermission === "denied"
                    ? "Blocked in your browser’s site settings. The tab title still counts down."
                    : notifyAtEnd && notificationPermission === "granted"
                      ? "On. A system notification fires when the timer reaches zero, even if this tab is in the background."
                      : "Off. Turning it on asks your browser for permission once. The tab title counts down either way."}
              </small>
            </span>
          </label>
          {lastOutcome ? (
            <p className="focus-complete-note">
              Session saved ·{" "}
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
            {lastSessions && (
              <button
                type="button"
                className="local-undo"
                onClick={() => {
                  setSessions(lastSessions);
                  setLastSessions(null);
                }}
              >
                Undo remove
              </button>
            )}
          </div>
          {sessions.length === 0 ? (
            <small>Your sessions will gather here.</small>
          ) : (
            sessions.slice(0, 5).map(session => (
              <article key={session.id}>
                <div>
                  <b>
                    {session.date === today ? "Today" : session.date} ·{" "}
                    {session.minutes} min · {session.taskLabel}
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
                  onClick={() => {
                    setLastSessions(sessions);
                    setSessions(current =>
                      current.filter(item => item.id !== session.id)
                    );
                  }}
                  aria-label={`Remove ${session.minutes} minute session on ${session.taskLabel}`}
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
  const today = sleepDateInputValue(new Date());
  type Habit = {
    id: string;
    name: string;
    schedule: string;
    /** Weekdays (0 = Sunday) for day-based schedules. */
    days?: number[];
    minimum: string;
    cue: string;
    archived: boolean;
  };
  const [habits, setHabits] = useState<Habit[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayBasedSchedules = new Set(["Selected days", "3 times a week"]);
  function habitSchedule(habit: Habit): HabitSchedule {
    switch (habit.schedule) {
      case "Weekdays":
        return { kind: "days", days: [1, 2, 3, 4, 5] };
      case "Weekends":
        return { kind: "days", days: [0, 6] };
      case "Selected days":
      case "3 times a week":
        return habit.days && habit.days.length > 0
          ? { kind: "days", days: habit.days }
          : { kind: "daily" };
      default:
        return { kind: "daily" };
    }
  }
  function describeSchedule(habit: Habit) {
    if (dayBasedSchedules.has(habit.schedule) && habit.days?.length) {
      return [...habit.days]
        .sort()
        .map(day => weekdayNames[day])
        .join(", ");
    }
    if (dayBasedSchedules.has(habit.schedule)) {
      return `${habit.schedule} · no days chosen yet, so every day counts`;
    }
    return habit.schedule;
  }
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
  const [draft, setDraft] = useState<{
    name: string;
    schedule: string;
    days: number[];
    minimum: string;
    cue: string;
  }>({
    name: "",
    schedule: "Every day",
    days: [],
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
  const pausedHabits = habits.filter(habit => habit.archived);
  const activeAvoidanceHabits = avoidanceHabits.filter(
    habit => !habit.archived
  );
  const weekly = habitWeekSummary(records);
  const statusOptions: Array<{
    value: HabitDailyState;
    label: string;
    color: string;
    glyph: string;
    meaning: string;
  }> = [
    {
      value: "complete",
      label: "Complete",
      color: "#e75e93",
      glyph: "●",
      meaning: "Did it — the full version or the smallest one. Counts toward the streak.",
    },
    {
      value: "partial",
      label: "Partial",
      color: "#e3a83a",
      glyph: "◐",
      meaning: "Did some of it. Also counts toward the streak.",
    },
    {
      value: "rest",
      label: "Planned rest",
      color: "#3c9aa1",
      glyph: "○",
      meaning: "Chose in advance not to today. Neither adds to nor breaks the streak.",
    },
    {
      value: "skipped",
      label: "Skipped",
      color: "#8b7b82",
      glyph: "—",
      meaning: "Didn't happen, no plan. Neither adds to nor breaks the streak either — the only thing that breaks a streak is a scheduled day left blank.",
    },
  ];
  const [showStateKey, setShowStateKey] = useState(false);
  // Today's state comes from the dated records, never from a per-habit map
  // that would carry yesterday's "Complete today" into tomorrow.
  function stateToday(habitId: string): HabitDailyState | undefined {
    return records.find(
      record => record.habitId === habitId && record.date === today
    )?.state;
  }
  /**
   * The streak for one habit.
   *
   * Delegated to the shared engine rather than counted here, because the rule
   * is subtler than "how many complete days in a row". A planned rest and a
   * skip are deliberate choices and must not break a streak — the earlier
   * version broke on anything that was not `complete`, which punished the user
   * for using the rest option the page itself offers.
   */
  function calculateStreak(habit: Habit) {
    const dayStates: Record<string, HabitDayState> = {};
    for (const record of records) {
      if (record.habitId === habit.id) {
        dayStates[record.date] = record.state as HabitDayState;
      }
    }

    const schedule = habitSchedule(habit);
    const result = computeStreak({ states: dayStates, today, schedule });
    const loggedToday = Boolean(stateToday(habit.id));
    const dueToday = isDueOn(schedule, today);

    return {
      streak: result.current,
      dueToday,
      // Only a nudge, never a failure: today is still the user's to log.
      inDanger: result.current > 0 && dueToday && !loggedToday,
    };
  }

  function selectState(habitId: string, state: HabitDailyState) {
    const current = stateToday(habitId);
    // Tapping the chosen state again clears today, so a mis-tap is one tap
    // to undo rather than a choice between four wrong answers.
    if (current === state) {
      setRecords(records =>
        records.filter(
          record => !(record.habitId === habitId && record.date === today)
        )
      );
      setStates(map => {
        const next = { ...map };
        delete next[habitId];
        return next;
      });
      toast("Today cleared for this habit");
      return;
    }
    setStates(map => ({ ...map, [habitId]: state }));
    setRecords(records => setHabitDayState(records, habitId, today, state));
    const monthIndex = new Date().getMonth();
    const day = new Date().getDate();
    const status = statusOptions.find(option => option.value === state)!;
    pixelStore?.set("habits", monthIndex, day, status.color);
    if (state === "complete")
      onRecordHabit(
        habits.find(habit => habit.id === habitId)?.name || "Habit"
      );
  }
  function moveHabit(habitId: string, delta: -1 | 1) {
    setHabits(current => {
      const order = current.filter(habit => !habit.archived);
      const index = order.findIndex(habit => habit.id === habitId);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= order.length) return current;
      const reordered = [...order];
      [reordered[index], reordered[target]] = [
        reordered[target]!,
        reordered[index]!,
      ];
      return [...reordered, ...current.filter(habit => habit.archived)];
    });
  }
  function setArchived(habitId: string, archived: boolean) {
    setHabits(current =>
      current.map(item => (item.id === habitId ? { ...item, archived } : item))
    );
    toast(archived ? "Habit paused — find it under Paused habits" : "Habit resumed");
  }
  function deleteHabit(habitId: string) {
    setHabits(current => current.filter(item => item.id !== habitId));
    setRecords(current => current.filter(record => record.habitId !== habitId));
    setConfirmDeleteId(null);
    toast("Habit and its history deleted");
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
  function beginEdit(habit?: Habit) {
    setDraft(
      habit
        ? {
            name: habit.name,
            schedule: habit.schedule,
            days: habit.days ?? [],
            minimum: habit.minimum,
            cue: habit.cue,
          }
        : { name: "", schedule: "Every day", days: [], minimum: "", cue: "" }
    );
    setEditingId(habit?.id || "new");
  }
  function saveHabit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.name.trim()) return;
    const fields = {
      name: draft.name.trim(),
      schedule: draft.schedule,
      days: dayBasedSchedules.has(draft.schedule)
        ? [...draft.days].sort()
        : undefined,
      minimum: draft.minimum.trim() || "One small version",
      cue: draft.cue.trim(),
    };
    if (editingId === "new")
      setHabits(current => [
        ...current,
        { id: `${Date.now()}-habit`, ...fields, archived: false },
      ]);
    else if (editingId)
      setHabits(current =>
        current.map(habit =>
          habit.id === editingId ? { ...habit, ...fields } : habit
        )
      );
    setEditingId(null);
    toast(editingId === "new" ? "Habit added" : "Habit updated");
  }
  return (
    <section
      className="journal-spread habits-spread glass-scope"
      aria-labelledby="habits-title"
    >
      <div className="spread-page habits-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">mind · habits</p>
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
          <button
            type="button"
            className="habit-key-toggle"
            onClick={() => setShowStateKey(value => !value)}
            aria-expanded={showStateKey}
          >
            {showStateKey ? "Hide" : "What do the four states mean?"}
          </button>
          {showStateKey && (
            <dl className="habit-state-key">
              {statusOptions.map(option => (
                <div key={option.value}>
                  <dt>
                    <i style={{ background: option.color }} aria-hidden="true" />
                    <span aria-hidden="true">{option.glyph}</span> {option.label}
                  </dt>
                  <dd>{option.meaning}</dd>
                </div>
              ))}
              <div>
                <dt>Not scheduled</dt>
                <dd>
                  A day your schedule doesn’t include. Leaving it blank never
                  breaks a streak. You can still log it if you did it anyway.
                </dd>
              </div>
            </dl>
          )}
        </section>
        <section className="habit-list">
          {activeHabits.length === 0 ? (
            <p className="habit-empty">
              No habits yet. Add one gentle habit below — one is easier to keep
              than five.
            </p>
          ) : null}
          {activeHabits.map((habit, index) => {
            const { streak, inDanger, dueToday } = calculateStreak(habit);
            const current = stateToday(habit.id);
            const currentOption = statusOptions.find(
              option => option.value === current
            );
            return (
              <article
                className={cn("habit-card", !dueToday && "is-off-day")}
                key={habit.id}
              >
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
                          title={
                            inDanger
                              ? "Scheduled today and not logged yet"
                              : undefined
                          }
                        >
                          {streak}-day streak
                          {inDanger ? " · today still open" : ""}
                        </span>
                      )}
                    </b>
                    <small>
                      {describeSchedule(habit)} · smallest version:{" "}
                      {habit.minimum}
                    </small>
                    {habit.cue ? <em>Best cue: {habit.cue}</em> : null}
                  </div>
                  <div className="habit-card-tools">
                    <button
                      type="button"
                      onClick={() => moveHabit(habit.id, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${habit.name} up`}
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveHabit(habit.id, 1)}
                      disabled={index === activeHabits.length - 1}
                      aria-label={`Move ${habit.name} down`}
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button type="button" onClick={() => beginEdit(habit)}>
                      Edit
                    </button>
                  </div>
                </div>
                <div
                  className="habit-states"
                  role="group"
                  aria-label={`Today's state for ${habit.name}`}
                >
                  {statusOptions.map(option => (
                    <button
                      type="button"
                      key={option.value}
                      className={cn(
                        current === option.value && "active",
                        option.value
                      )}
                      onClick={() => selectState(habit.id, option.value)}
                      aria-pressed={current === option.value}
                      title={option.meaning}
                    >
                      <i style={{ background: option.color }} aria-hidden="true">
                        {option.glyph}
                      </i>
                      {current === option.value ? "✓ " : ""}
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="habit-card-foot">
                  <span>
                    {currentOption
                      ? `${currentOption.label} today · tap again to clear`
                      : dueToday
                        ? "Not logged today"
                        : "Not scheduled today — log it only if you did it"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setArchived(habit.id, true)}
                  >
                    Pause habit
                  </button>
                </div>
              </article>
            );
          })}
          {pausedHabits.length > 0 && (
            <section className="habit-paused" aria-labelledby="habit-paused-title">
              <div>
                <span id="habit-paused-title">Paused habits</span>
                <b>{pausedHabits.length}</b>
              </div>
              <small>
                Paused habits keep their history and stay out of today’s
                rhythm. Resume whenever you like, or delete for good.
              </small>
              {pausedHabits.map(habit => (
                <article key={habit.id}>
                  <b>{habit.name}</b>
                  <small>{describeSchedule(habit)}</small>
                  <div>
                    <button
                      type="button"
                      onClick={() => setArchived(habit.id, false)}
                    >
                      Resume
                    </button>
                    {confirmDeleteId === habit.id ? (
                      <>
                        <button
                          type="button"
                          className="is-danger"
                          onClick={() => deleteHabit(habit.id)}
                        >
                          Delete for good
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Keep
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(habit.id)}
                      >
                        Delete…
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </section>
          )}
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
            {dayBasedSchedules.has(draft.schedule) && (
              <div
                className="habit-day-picker"
                role="group"
                aria-label="Which days"
              >
                {weekdayNames.map((name, day) => (
                  <button
                    type="button"
                    key={name}
                    className={cn(draft.days.includes(day) && "active")}
                    aria-pressed={draft.days.includes(day)}
                    onClick={() =>
                      setDraft(current => ({
                        ...current,
                        days: current.days.includes(day)
                          ? current.days.filter(value => value !== day)
                          : [...current.days, day],
                      }))
                    }
                  >
                    {draft.days.includes(day) ? "✓ " : ""}
                    {name}
                  </button>
                ))}
                <small>
                  {draft.days.length === 0
                    ? "Pick the days this habit is due. Until you do, every day counts."
                    : `Due ${[...draft.days]
                        .sort()
                        .map(day => weekdayNames[day])
                        .join(", ")} — other days never break the streak.`}
                </small>
              </div>
            )}
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
            Planned rest and skipped days are part of the rhythm, not a broken
            streak. Only a scheduled day left blank breaks one.
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
  const [wakeDate, setWakeDate] = useState(() =>
    sleepDateInputValue(new Date())
  );
  const [hoursOverride, setHoursOverride] = useState("");
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
      wakeDate:
        typeof record.body.wakeDate === "string"
          ? record.body.wakeDate
          : sleepDateInputValue(
              new Date(record.period.end ?? record.period.start)
            ),
      bedtime: String(record.body.bedtime ?? ""),
      wakeTime: String(record.body.wakeTime ?? ""),
      hours: Number(record.body.hours) || 0,
      quality: String(record.body.quality ?? ""),
      windDown: Boolean(record.body.windDown),
      note: String(record.body.note ?? ""),
    }));
  const qualityOptions = ["Restless", "Light", "Restful", "Deep"];
  const computedHours = sleepDurationHours(bedtime, wakeTime);
  const overrideValue = Number(hoursOverride);
  const hours =
    hoursOverride.trim() !== "" && Number.isFinite(overrideValue)
      ? Math.min(24, Math.max(0, overrideValue))
      : computedHours;
  const durationCheck = sleepDurationCheck(bedtime, wakeTime, computedHours);
  const canSave = durationCheck.kind !== "missing" && hours > 0;
  const todayValue = sleepDateInputValue(new Date());
  const lastNight = logs[0] || { hours, quality };

  function resetForm() {
    setEditingId(null);
    setNote("");
    setHoursOverride("");
    setWakeDate(todayValue);
  }

  function saveSleep() {
    if (!canSave) return;
    // Bedtime and wake time become a real period, so a night that crosses
    // midnight is one record spanning two days rather than two half-nights.
    const body = {
      bedtime,
      wakeTime,
      wakeDate,
      hours,
      quality,
      windDown,
      note,
    };

    const start = sleepNightStart(wakeDate, bedtime, wakeTime);
    const end = new Date(start.getTime() + hours * 3_600_000);
    const period = { start: start.toISOString(), end: end.toISOString() };

    if (editingId) {
      journal.edit(editingId, body, "Sleep updated", period);
    } else {
      journal.add({
        scope: "sleep",
        body,
        period,
        undoLabel: `Saved ${formatSleepDuration(hours)} of sleep`,
      });
    }

    // The year grid files a night under the morning it ended — the date the
    // user chose, not whatever day they happen to be typing on.
    const [year, month, day] = wakeDate.split("-").map(Number);
    if (year && month && day) {
      pixelStore?.set("sleep", month - 1, day, sleepDurationBand(hours).color);
    }
    if (!editingId) {
      onRecord({
        module: "Sleep",
        amount: hours,
        label: `${formatSleepDuration(hours)} · ${quality} sleep log`,
      });
    }
    resetForm();
  }
  function editSleepLog(log: (typeof logs)[number]) {
    setEditingId(log.id);
    setBedtime(log.bedtime);
    setWakeTime(log.wakeTime);
    setWakeDate(log.wakeDate);
    setQuality(log.quality);
    setWindDown(log.windDown);
    setNote(log.note);
    // Surface a stored total that differs from the clock arithmetic, so the
    // user sees the correction they made rather than losing it on save.
    const clockHours = sleepDurationHours(log.bedtime, log.wakeTime);
    setHoursOverride(
      Math.abs(clockHours - log.hours) > 0.01 ? String(log.hours) : ""
    );
    bedtimeInputRef.current?.focus();
  }
  return (
    <section
      className="journal-spread sleep-spread glass-scope"
      aria-labelledby="sleep-title"
    >
      <div className="spread-page sleep-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">body · sleep</p>
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
          <label className="sleep-date-field">
            Morning of
            <input
              type="date"
              value={wakeDate}
              max={todayValue}
              onChange={event => setWakeDate(event.target.value)}
              aria-describedby="sleep-date-help"
            />
            <small id="sleep-date-help">
              The day you woke up. Change it to log or correct an earlier
              night; a bedtime after the wake time counts as the night before.
            </small>
          </label>
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
            <span>
              {hoursOverride.trim() ? "Corrected rest" : "Calculated rest"}
            </span>
            <b>{formatSleepDuration(hours)}</b>
          </p>
          <small className="sleep-duration-help">
            Wake time minus bedtime by the clock, crossing midnight when it
            needs to. On a clock-change night this can be an hour out — correct
            it here if so.
          </small>
          {durationCheck.kind !== "ok" && (
            <small
              className={cn(
                "sleep-duration-check",
                durationCheck.kind === "implausible" && "is-warning"
              )}
              role="status"
            >
              {durationCheck.message}
            </small>
          )}
          <label className="sleep-hours-override">
            Correct the total
            <span>
              <input
                type="number"
                min="0"
                max="24"
                step="0.25"
                inputMode="decimal"
                value={hoursOverride}
                onChange={event => setHoursOverride(event.target.value)}
                placeholder={computedHours.toFixed(2)}
                aria-label="Hours slept, if the calculated total is wrong"
              />
              <small>hours</small>
              {hoursOverride.trim() !== "" && (
                <button type="button" onClick={() => setHoursOverride("")}>
                  Use calculated
                </button>
              )}
            </span>
          </label>
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
            <Button
              type="button"
              className="ink-button"
              onClick={saveSleep}
              disabled={!canSave}
            >
              {editingId
                ? "Save edited log"
                : wakeDate === todayValue
                  ? "Save last night"
                  : "Save this night"}
            </Button>
            {editingId ? (
              <button type="button" className="local-undo" onClick={resetForm}>
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
          {logs.length > 7 && (
            <small className="sleep-history-hint">
              Showing the last 7. To fix an older night, set its date in
              “Morning of” above and save — it replaces nothing, so remove the
              old entry if there is one.
            </small>
          )}
          {logs.length === 0 ? (
            <small>Your private sleep rhythm will appear here.</small>
          ) : (
            logs.slice(0, 7).map(log => (
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
  const moods = pixelsProfiles.mood.statuses.map(status => status.label);
  const energyWords: Record<number, string> = {
    1: "Running on empty",
    2: "Low",
    3: "Enough",
    4: "Good",
    5: "Full",
  };
  const pattern = moodPatternSummary(entries);
  const firstMoodRef = useRef<HTMLButtonElement>(null);
  // Latest entry for each calendar day, so the year grid can show what a
  // cell actually holds instead of only its colour.
  const entryByDate = new Map<string, MoodEntry>();
  for (const entry of entries) {
    if (!entryByDate.has(entry.date)) entryByDate.set(entry.date, entry);
  }
  function describeMoodDay(monthIndex: number, day: number) {
    const key = `${new Date().getFullYear()}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const entry = entryByDate.get(key);
    if (!entry) return undefined;
    return [
      `${entry.mood}, energy ${entry.energy}/5 (${energyWords[entry.energy] ?? ""})`,
      entry.contexts.length ? entry.contexts.join(", ") : null,
      entry.note ? `“${entry.note}”` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }
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
      date: sleepDateInputValue(new Date()),
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
    const color = pixelsProfiles.mood.statuses.find(
      status => status.label === mood
    )?.color;
    if (color) pixelStore?.set("mood", monthIndex, day, color);
    toast(editingId ? "Check-in updated" : `${mood} check-in saved`);
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
      className="journal-spread wellbeing-spread glass-scope"
      aria-labelledby="wellbeing-title"
    >
      <div className="spread-page wellbeing-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <div className="editorial-contrast-panel">
          <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">mind · wellbeing</p>
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
            onClick={() => {
              setEditingId(null);
              firstMoodRef.current?.focus();
            }}
          >
            <Plus size={15} /> Begin check-in
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
            <span id="mood-word-label">
              Which word is closest? <small>No right answer</small>
            </span>
            <div
              className="mood-pills"
              role="radiogroup"
              aria-labelledby="mood-word-label"
            >
              {moods.map((item, index) => (
                <button
                  key={item}
                  type="button"
                  role="radio"
                  aria-checked={mood === item}
                  ref={index === 0 ? firstMoodRef : undefined}
                  className={cn(mood === item && "active")}
                  onClick={() => setMood(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="wellbeing-section">
            <span id="energy-label">
              Energy today · {energy}/5 · {energyWords[energy]}
            </span>
            <div
              className="energy-scale"
              role="radiogroup"
              aria-labelledby="energy-label"
            >
              {[1, 2, 3, 4, 5].map(value => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={energy === value}
                  className={cn(value <= energy && "active")}
                  onClick={() => setEnergy(value)}
                  aria-label={`${value} out of 5, ${energyWords[value]}`}
                  title={energyWords[value]}
                >
                  ✦
                </button>
              ))}
            </div>
            <div className="energy-anchors" aria-hidden="true">
              <small>1 · {energyWords[1]}</small>
              <small>5 · {energyWords[5]}</small>
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
              <strong>{pattern.commonMood}</strong> was the word you chose most
              often. Energy averaged{" "}
              <strong>{pattern.averageEnergy.toFixed(1)}/5</strong>. That’s a
              count, not a verdict.
            </p>
          ) : (
            <p>Save a few check-ins to see a simple count of your words here.</p>
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
                    {entry.date} · {entry.mood} · energy {entry.energy}/5
                    {energyWords[entry.energy]
                      ? ` (${energyWords[entry.energy].toLowerCase()})`
                      : ""}
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
                    onClick={() => {
                      setLastEntries(entries);
                      setEntries(current =>
                        current.filter(item => item.id !== entry.id)
                      );
                      toast("Check-in removed — Undo last brings it back");
                    }}
                    aria-label={`Remove check-in from ${entry.date}`}
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
            <span>Year in check-ins</span>
            <b>Hover or focus a day to read its entry</b>
          </div>
          <PixelsGrid tracker="mood" describeDay={describeMoodDay} />
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
    sleepDateInputValue(new Date())
  );
  const [contextSymptoms, setContextSymptoms] = useState<string[]>([]);
  const [contextTags, setContextTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [contextNote, setContextNote] = useState("");
  const [contextEntries, setContextEntries] = useState<CycleContextEntry[]>([]);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const auth = useAuth();
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
  function removeEntry(id: string) {
    setEntries(current => current.filter(entry => entry.id !== id));
    toast("Cycle entry deleted");
  }
  function removeContext(id: string) {
    setContextEntries(current => current.filter(entry => entry.id !== id));
    toast("Daily context deleted");
  }
  function deleteAll() {
    setEntries([]);
    setContextEntries([]);
    setConfirmDeleteAll(false);
    toast("All cycle data deleted from this journal");
  }
  function downloadCycleData() {
    const payload = {
      exportedAt: new Date().toISOString(),
      cycles: entries,
      dailyContext: contextEntries,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "cycle-tracker-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
    toast("Cycle data downloaded");
  }
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
      className="journal-spread cycle-spread glass-scope"
      aria-labelledby="cycle-title"
    >
      <div className="spread-page cycle-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">body · period &amp; cycle tracker</p>
        <h2 id="cycle-title">
          In rhythm with
          <br />
          <em>yourself.</em>
        </h2>
        <p className="page-intro">
          A private, gentle view of your cycle—shown as an estimate based on
          your recent entries. Regular, irregular, long, short, or paused: this
          page keeps whatever pattern you have, and only ever averages what you
          log.
        </p>
        <button
          type="button"
          className="ink-button cycle-log-button"
          onClick={() => setLogOpen(current => !current)}
          aria-expanded={logOpen}
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
          {estimate
            ? `${estimate.wording} It assumes about ${estimate.averageCycle} days between starts${
                estimate.cyclesUsed > 0
                  ? `, averaged from ${estimate.cyclesUsed} recorded ${estimate.cyclesUsed === 1 ? "interval" : "intervals"}`
                  : " until a second start is logged"
              }. Bodies don’t run on schedules — treat it as a guess, not a rule.`
            : "Add a period entry to begin your private estimate."}
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
                  <div>
                    <b>{entry.date}</b>
                    <small>
                      {[...entry.symptoms, ...entry.tags].join(" · ") ||
                        "Private note"}
                      {entry.note ? ` · ${entry.note}` : ""}
                    </small>
                  </div>
                  <button
                    type="button"
                    className="cycle-remove"
                    onClick={() => removeContext(entry.id)}
                    aria-label={`Delete daily context from ${entry.date}`}
                  >
                    Delete
                  </button>
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
        <CycleCalendar
          entries={entries}
          predictedStart={estimate?.estimatedNextPeriod}
          predictedLength={estimate?.averagePeriodLength}
        />
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
              <button
                type="button"
                className="cycle-remove"
                onClick={() => removeEntry(entry.id)}
                aria-label={`Delete cycle entry starting ${entry.start}`}
              >
                Delete
              </button>
            </article>
          ))}
          {(entries.length > 0 || contextEntries.length > 0) && (
            <div className="cycle-delete-all">
              {confirmDeleteAll ? (
                <>
                  <span>
                    Delete every cycle entry and daily context on this page?
                    This can’t be undone.
                  </span>
                  <button type="button" onClick={deleteAll}>
                    Yes, delete all
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteAll(false)}
                  >
                    Keep it
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteAll(true)}
                >
                  Delete all cycle data
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CycleCalendar({
  entries,
  predictedStart,
  predictedLength = 5,
}: {
  entries: Array<{ start: string; end: string }>;
  predictedStart?: string;
  predictedLength?: number;
}) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startsOn = new Date(year, month, 1).getDay();
  const isThisMonth =
    today.getFullYear() === year && today.getMonth() === month;

  function collectDays(start: string, end: string) {
    const days = new Set<number>();
    const from = new Date(`${start}T12:00:00`);
    const to = new Date(`${end}T12:00:00`);
    for (let day = new Date(from); day <= to; day.setDate(day.getDate() + 1)) {
      if (day.getFullYear() === year && day.getMonth() === month)
        days.add(day.getDate());
    }
    return days;
  }
  const loggedDays = new Set<number>();
  entries.forEach(entry => {
    collectDays(entry.start, entry.end || entry.start).forEach(day =>
      loggedDays.add(day)
    );
  });
  let predictedDays = new Set<number>();
  if (predictedStart) {
    const end = new Date(`${predictedStart}T12:00:00`);
    end.setDate(end.getDate() + Math.max(1, predictedLength) - 1);
    predictedDays = collectDays(predictedStart, sleepDateInputValue(end));
    // A logged day is fact; a prediction never overrides it.
    loggedDays.forEach(day => predictedDays.delete(day));
  }

  const monthLabel = new Date(year, month, 1).toLocaleString("en", {
    month: "long",
    year: "numeric",
  });
  const monthName = new Date(year, month, 1).toLocaleString("en", {
    month: "long",
  });
  function moveMonth(delta: number) {
    const next = new Date(year, month + delta, 1);
    setMonth(next.getMonth());
    setYear(next.getFullYear());
  }
  return (
    <div
      className="cycle-calendar"
      role="group"
      aria-label="Private period calendar"
    >
      <div className="cycle-calendar-heading">
        <button
          type="button"
          onClick={() => moveMonth(-1)}
          aria-label="Previous month"
        >
          ←
        </button>
        <b aria-live="polite">{monthLabel}</b>
        <button
          type="button"
          onClick={() => moveMonth(1)}
          aria-label="Next month"
        >
          →
        </button>
      </div>
      {!isThisMonth && (
        <button
          type="button"
          className="cycle-calendar-today"
          onClick={() => {
            setMonth(today.getMonth());
            setYear(today.getFullYear());
          }}
        >
          Back to this month
        </button>
      )}
      <div className="calendar-weekdays" aria-hidden="true">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>
      <div className="calendar-days">
        {Array.from({ length: startsOn }, (_, index) => (
          <i key={`blank-${index}`} aria-hidden="true" />
        ))}
        {Array.from({ length: daysInMonth }, (_, index) => index + 1).map(
          day => {
            const isToday = isThisMonth && today.getDate() === day;
            const state = loggedDays.has(day)
              ? "logged"
              : predictedDays.has(day)
                ? "predicted"
                : "none";
            const label = [
              `${monthName} ${day}`,
              isToday ? "today" : null,
              state === "logged"
                ? "logged period day"
                : state === "predicted"
                  ? "predicted period day"
                  : null,
            ]
              .filter(Boolean)
              .join(", ");
            return (
              <span
                key={day}
                className={cn(
                  state === "logged" && "is-period",
                  state === "predicted" && "is-predicted",
                  isToday && "is-today"
                )}
                aria-label={label}
                title={label}
                aria-current={isToday ? "date" : undefined}
              >
                {day}
              </span>
            );
          }
        )}
      </div>
      <div className="cycle-calendar-key">
        <small>
          <i className="key-logged" /> Logged
        </small>
        <small>
          <i className="key-predicted" /> Predicted
        </small>
        <small>
          <i className="key-today" /> Today
        </small>
      </div>
    </div>
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
  /**
   * Meals and the grocery list are records, so they carry undo and reach the
   * other devices — a shopping list is the clearest case for that: written on
   * the laptop, needed in the shop.
   */
  const journal = useRecordStore();

  const meals: MealEntry[] = journal
    .inScope("meal")
    .slice()
    .sort((a, b) => b.period.start.localeCompare(a.period.start))
    .map(record => ({
      id: record.id,
      meal: String(record.body.meal ?? ""),
      note: String(record.body.note ?? ""),
      time: new Date(record.period.start).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      tags: Array.isArray(record.body.tags)
        ? (record.body.tags as string[])
        : [],
    }));

  const groceries: GroceryItem[] = journal.inScope("grocery").map(record => ({
    id: record.id,
    title: String(record.body.title ?? ""),
    quantity: String(record.body.quantity ?? ""),
    category: String(record.body.category ?? "Other"),
    done: Boolean(record.body.done),
  }));

  /**
   * Meals worth offering as one tap.
   *
   * Only what has actually been eaten more than once, and only within the same
   * slot — breakfast must not offer last night's dinner.
   */
  const suggestions = suggestMeals({
    meals: journal.inScope("meal").map(record => ({
      id: record.id,
      mealType: String(record.body.meal ?? ""),
      description: String(record.body.note ?? ""),
      at: record.period.start,
    })),
    mealType: meal,
    limit: 3,
  });
  const [intention, setIntention] = useState("");
  const [reflection, setReflection] = useState("");
  const [groceryTitle, setGroceryTitle] = useState("");
  const [groceryQuantity, setGroceryQuantity] = useState("");
  const [groceryCategory, setGroceryCategory] = useState("Produce");
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
  // Same "today" the rest of the store uses — the user's timezone preference,
  // not the machine clock.
  const todayCount = journal.onDay("meal", journal.today).length;
  function addMeal(text = note) {
    const trimmed = text.trim();
    if (!trimmed) return;
    journal.add({
      scope: "meal",
      body: { meal, note: trimmed, tags },
      undoLabel: `Logged ${meal.toLowerCase()}`,
    });
    onRecord({ module: "Nutrition", amount: 1, label: `${meal} meal note` });
    setNote("");
    setTags([]);
    const monthIndex = new Date().getMonth();
    const day = new Date().getDate();
    // Only the generic "Meal noted" mark is automatic; never paint over a
    // key the user chose by hand for today.
    const existing = pixelStore?.records.nutrition?.[pixelsCellKey(monthIndex, day)];
    if (!existing) pixelStore?.set("nutrition", monthIndex, day, "#ec4899");
  }
  /**
   * Sends one thing from a meal to the shopping list.
   *
   * Anything already waiting to be bought is skipped rather than added twice —
   * two "milk" lines is a worse list than one — and the result is confirmed,
   * so a tap that deliberately did nothing does not look like a tap that
   * failed.
   */
  function sendToGrocery(name: string) {
    const result = fromMeal({
      items: groceries.map(item => ({
        id: item.id,
        name: item.title,
        category: "other" as const,
        pickedUp: item.done,
        addedAt: "",
      })),
      mealId: "meal",
      ingredients: [name],
    });

    for (const item of result.items.slice(groceries.length)) {
      journal.add({
        scope: "grocery",
        body: {
          title: item.name,
          quantity: "",
          category: "Pantry",
          done: false,
        },
        undoLabel: `Added ${item.name}`,
      });
    }

    if (result.added === 0) toast(fromMealMessage(result));
  }

  function addGrocery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!groceryTitle.trim()) return;
    journal.add({
      scope: "grocery",
      body: {
        title: groceryTitle.trim(),
        quantity: groceryQuantity.trim(),
        category: groceryCategory,
        done: false,
      },
      undoLabel: `Added ${groceryTitle.trim()}`,
    });
    setGroceryTitle("");
    setGroceryQuantity("");
  }
  return (
    <section
      className="journal-spread nutrition-spread glass-scope"
      aria-labelledby="nutrition-title"
    >
      <div className="spread-page nutrition-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <div className="editorial-contrast-panel">
          <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">body · nutrition</p>
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
          {suggestions.length > 0 ? (
            <div className="meal-suggestions">
              {/* Only meals actually eaten more than once in this slot, so a
                  single unusual dinner never becomes a suggestion. */}
              <span>Again?</span>
              {suggestions.map(suggestion => (
                <button
                  key={suggestion.description}
                  type="button"
                  onClick={() => addMeal(suggestion.description)}
                >
                  {suggestion.description}
                  <small>{suggestion.count}×</small>
                </button>
              ))}
            </div>
          ) : null}
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
            <small className="nutrition-no-count">
              No calories, portions, or targets here — that’s on purpose. A
              note and a few tags are the whole entry.
            </small>
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
            <span>Meals noted</span>
            <b>
              {meals.length === 0
                ? "Nothing yet"
                : `${todayCount} today · ${meals.length} in all`}
            </b>
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
                    onClick={() => sendToGrocery(entry.note)}
                  >
                    To grocery
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      journal.remove(entry.id, `Removed ${entry.meal}`)
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
                      journal.edit(
                        item.id,
                        { ...item, done: !item.done },
                        item.done ? "Unticked" : "Picked up"
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
                      journal.remove(item.id, `Removed ${item.title}`)
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
  const beyondGoal = Math.max(0, intake - goal);
  const timezone = journal.preferences.timezone;

  // A second tap inside this window is almost always a bounce, not a second
  // glass; the button shows what it just did and ignores the repeat.
  const [justAdded, setJustAdded] = useState<number | null>(null);
  const justAddedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (justAddedTimer.current) clearTimeout(justAddedTimer.current);
    },
    []
  );

  function paintWaterDay(totalMl: number) {
    const now = new Date();
    pixelStore?.set(
      "water",
      now.getMonth(),
      now.getDate(),
      totalMl >= goal ? "#32a7cf" : "#8fd4e7"
    );
  }

  function addWater(amount: number) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (justAdded !== null) return;

    const rounded = Math.round(amount);
    journal.add({
      scope: "water",
      body: { amountMl: rounded },
      undoLabel: `Added ${rounded} ml`,
    });
    paintWaterDay(intake + rounded);

    setJustAdded(rounded);
    justAddedTimer.current = setTimeout(() => setJustAdded(null), 700);
  }

  function removeWater(id: string, amount: number) {
    journal.remove(id, `Removed ${amount} ml`);
    paintWaterDay(Math.max(0, intake - amount));
  }

  return (
    <section
      className="journal-spread water-spread glass-scope"
      aria-labelledby="water-title"
    >
      <div className="spread-page water-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">body · nutrition & hydration</p>
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
              <small>
                {goal > 0 ? Math.round((intake / goal) * 100) : 0}% of goal
              </small>
            </div>
          </div>
          <div className="water-progress-copy" aria-live="polite">
            <span>Today’s water</span>
            <b>
              {intake} ml <small>of {goal} ml</small>
            </b>
            <strong>
              {remaining > 0
                ? `${remaining} ml remaining`
                : beyondGoal > 0
                  ? `Goal met · ${beyondGoal} ml beyond it`
                  : "Goal met for today"}
            </strong>
            {beyondGoal > 0 && (
              <small className="water-beyond-note">
                Going past the goal is fine — it’s a floor, not a ceiling. Keep
                logging if you like; nothing here penalises it.
              </small>
            )}
          </div>
        </section>
        <section className="water-log-panel" aria-label="Log water">
          <div className="water-actions">
            {[250, 350, 500].map(amount => (
              <button
                type="button"
                key={amount}
                onClick={() => addWater(amount)}
                disabled={justAdded !== null}
                className={cn(justAdded === amount && "is-just-added")}
                aria-label={
                  justAdded === amount
                    ? `Added ${amount} millilitres`
                    : `Add ${amount} millilitres`
                }
              >
                {justAdded === amount ? `Added ${amount} ml ✓` : `+${amount} ml`}
              </button>
            ))}
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
              disabled={justAdded !== null}
              onClick={() => {
                addWater(Number(customAmount));
                setCustomAmount("");
              }}
            >
              Add
            </button>
          </div>
          <small className="water-undo-hint">
            Every entry can be undone from the message that appears after
            you add it, or removed from today’s list below.
          </small>
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
                // The grid has no "clear" — tapping a cell with its own
                // colour toggles it off, so do exactly that.
                const now = new Date();
                const key = pixelsCellKey(now.getMonth(), now.getDate());
                const painted = pixelStore?.records.water?.[key];
                if (painted)
                  pixelStore?.update(
                    "water",
                    now.getMonth(),
                    now.getDate(),
                    painted
                  );
              }}
            >
              Clear today
            </button>
          </div>
          <small className="water-rollover-note">
            “Today” resets at midnight in {timezone}. Earlier days stay in the
            year grid above.
          </small>
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
                  onClick={() => removeWater(entry.id, entry.amount)}
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
  type ReflectionPeriod = "weekly" | "monthly";
  type ReflectionDrafts = Record<
    ReflectionPeriod,
    { fields: Record<string, string>; savedAt: string | null }
  >;
  const emptyDrafts: ReflectionDrafts = {
    weekly: { fields: {}, savedAt: null },
    monthly: { fields: {}, savedAt: null },
  };
  const [period, setPeriod] = useState<ReflectionPeriod>("weekly");
  const [isWriting, setIsWriting] = useState(false);
  // One draft per rhythm, kept in the persisted scope. Switching tabs or
  // leaving the page must never be how a half-written reflection is lost.
  const [drafts, setDrafts] = useState<ReflectionDrafts>(emptyDrafts);
  const draft = drafts[period].fields;
  const draftSavedAt = drafts[period].savedAt;
  const [entries, setEntries] = useState<ReflectionEntry[]>([]);
  const [customPrompts, setCustomPrompts] = useState<
    Record<
      ReflectionPeriod,
      Array<{ key: string; title: string; prompt: string }>
    >
  >({ weekly: [], monthly: [] });
  const [promptDraft, setPromptDraft] = useState("");
  const [archiveQuery, setArchiveQuery] = useState("");
  const [selectedArchive, setSelectedArchive] =
    useState<ReflectionEntry | null>(null);
  const [lastSaved, setLastSaved] = useState<ReflectionEntry | null>(null);
  const auth = useAuth();
  useMongoJournalScope({
    scope: "reflections",
    payload: { entries, customPrompts, drafts },
    hydrate: payload => {
      if (Array.isArray(payload.entries))
        setEntries(payload.entries as ReflectionEntry[]);
      if (payload.customPrompts && typeof payload.customPrompts === "object")
        setCustomPrompts(payload.customPrompts as typeof customPrompts);
      if (payload.drafts && typeof payload.drafts === "object") {
        const stored = payload.drafts as Partial<ReflectionDrafts>;
        setDrafts({
          weekly: stored.weekly ?? emptyDrafts.weekly,
          monthly: stored.monthly ?? emptyDrafts.monthly,
        });
      }
    },
  });
  function setDraftField(key: string, value: string) {
    setDrafts(current => ({
      ...current,
      [period]: {
        fields: { ...current[period].fields, [key]: value },
        savedAt: new Date().toISOString(),
      },
    }));
  }
  function clearDraft(target: ReflectionPeriod) {
    setDrafts(current => ({ ...current, [target]: emptyDrafts[target] }));
  }
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
  const hasDraft = Object.values(draft).some(value => value.trim());
  const otherPeriod: ReflectionPeriod =
    period === "weekly" ? "monthly" : "weekly";
  const otherHasDraft = Object.values(drafts[otherPeriod].fields).some(value =>
    value.trim()
  );
  const draftWordCount = Object.values(draft)
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  const carryForward = reflectionCarryForward(entries);
  const archiveEntries = entries.filter(entry =>
    `${entry.period} ${entry.date} ${Object.values(entry.fields).join(" ")}`
      .toLowerCase()
      .includes(archiveQuery.toLowerCase())
  );
  // Titles for every prompt key that has ever existed, so the archive can
  // show "Your prompt: …" rather than "custom-1726…: …".
  const promptTitles = new Map<string, string>();
  for (const field of [...baseFields, ...customPrompts.weekly, ...customPrompts.monthly]) {
    promptTitles.set(field.key, field.title);
  }
  for (const [key, title] of [
    ["progress", "Progress summary"],
    ["lessons", "Lessons"],
    ["gratitude", "Gratitude"],
    ["highlights", "Highlights"],
    ["challenges", "Challenges"],
    ["notes", "Notes"],
    ["intentions", "Intentions"],
  ]) {
    if (!promptTitles.has(key)) promptTitles.set(key, title);
  }
  function saveReflection() {
    if (!hasDraft) return;
    const saved = {
      period,
      date: sleepDateInputValue(new Date()),
      fields: Object.fromEntries(
        Object.entries(draft).filter(([, value]) => value.trim())
      ),
    };
    setEntries(current => saveReflectionEntry(current, saved));
    setLastSaved(saved);
    onRecordReflection(
      `${period === "weekly" ? "Weekly" : "Monthly"} reflection saved`
    );
    clearDraft(period);
    setIsWriting(false);
  }
  function switchPeriod(next: ReflectionPeriod) {
    setPeriod(next);
    setIsWriting(false);
    setLastSaved(null);
  }
  function formatSavedAt(iso: string) {
    const at = new Date(iso);
    const sameDay = at.toDateString() === new Date().toDateString();
    return sameDay
      ? at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : at.toLocaleDateString([], { month: "short", day: "numeric" });
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
      className="journal-spread reflection-spread glass-scope"
      aria-label="Weekly and monthly reflections"
    >
      <div className="spread-page reflection-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <div className="reflection-editorial-copy" aria-hidden="true">
          <p className="reflection-kicker glass-panel-fit glass-panel-fit-kicker">
            Mind · reflections
          </p>
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
        <div className="reflection-tabs" role="tablist">
          <button
            className={cn(period === "weekly" && "active")}
            type="button"
            role="tab"
            aria-selected={period === "weekly"}
            onClick={() => switchPeriod("weekly")}
          >
            Weekly
            {period !== "weekly" && otherHasDraft ? (
              <small className="reflection-tab-draft">draft</small>
            ) : null}
          </button>
          <button
            className={cn(period === "monthly" && "active")}
            type="button"
            role="tab"
            aria-selected={period === "monthly"}
            onClick={() => switchPeriod("monthly")}
          >
            Monthly
            {period !== "monthly" && otherHasDraft ? (
              <small className="reflection-tab-draft">draft</small>
            ) : null}
          </button>
        </div>
        <div className="reflection-rhythm">
          <span aria-live="polite">
            {hasDraft && draftSavedAt
              ? `Draft kept on this device · ${draftWordCount} ${draftWordCount === 1 ? "word" : "words"} · last change ${formatSavedAt(draftSavedAt)}${
                  auth.isAuthenticated ? " · syncs to your account" : ""
                }`
              : isWriting
                ? "Every keystroke is kept as you go — leave whenever you like."
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
                  setDraftField(
                    "progress",
                    [draft.progress, ...carryForward.map(item => item.text)]
                      .filter(Boolean)
                      .join("\n")
                  )
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
                    setDraftField(field.key, event.target.value)
                  }
                  placeholder="Write freely…"
                  aria-label={field.title}
                  rows={Math.min(
                    18,
                    Math.max(3, (draft[field.key] || "").split("\n").length + 1)
                  )}
                />
              )}
              {!isWriting && draft[field.key]?.trim() ? (
                <small className="reflection-draft-preview">
                  Draft: {draft[field.key].trim().slice(0, 90)}
                  {draft[field.key].trim().length > 90 ? "…" : ""}
                </small>
              ) : null}
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
              Close — draft stays
            </button>
            {hasDraft && (
              <button
                type="button"
                className="reflection-discard"
                onClick={() => {
                  clearDraft(period);
                  setIsWriting(false);
                  toast("Draft discarded");
                }}
              >
                Discard draft
              </button>
            )}
            <Button
              className="ink-button"
              type="button"
              onClick={saveReflection}
              disabled={!hasDraft}
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
                    <strong>{promptTitles.get(key) ?? "Your prompt"}: </strong>
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
  onNavigate,
}: {
  onContents: () => void;
  onCover: () => void;
  onNavigate: (destination: View) => void;
}) {
  const auth = useAuth();
  const journal = useRecordStore();
  const [consents, setConsents] = useState<
    Record<IntegrationKey, IntegrationConsent>
  >(() => emptyIntegrationConsent());
  const [lastChangeAt, setLastChangeAt] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const formatWhen = (value?: string | null) =>
    value
      ? new Date(value).toLocaleString([], {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "numeric",
          minute: "2-digit",
        })
      : null;
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
    const now = new Date().toISOString();
    const wasRecorded = consents[key]?.state === "consent-recorded";
    setConsents(current => toggleIntegrationConsent(current, key, now));
    setLastChangeAt(now);
    const title = integrationOptions.find(option => option.key === key)?.title;
    toast(
      wasRecorded
        ? `${title}: note cleared — nothing was connected, so nothing was disconnected`
        : `${title}: noted as worth a conversation — still nothing connected`
    );
  }
  async function signOut() {
    setSigningOut(true);
    try {
      await auth.logout();
      toast("Signed out. This device keeps its local copy; your account copy stays where it is.");
    } finally {
      setSigningOut(false);
    }
  }
  const signedIn = auth.isAuthenticated && auth.user;
  const provider =
    auth.user?.loginMethod?.toLowerCase().includes("google")
      ? "Google"
      : auth.user?.loginMethod || "Sign-in provider";
  const connectedCount = signedIn ? 2 : 0;
  return (
    <section
      className="journal-spread integrations-spread glass-scope"
      aria-labelledby="integrations-title"
    >
      <div className="spread-page integrations-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">utilities · integrations</p>
        <h2 id="integrations-title">
          Choose what
          <br />
          <em>stays yours.</em>
        </h2>
        <p className="page-intro">
          What this journal is connected to right now, in plain terms — and a
          private ledger for connections you may want to consider later.
        </p>
        <div className="integration-safety">
          <HeartPulse size={15} />
          <span>
            {connectedCount === 0
              ? "Nothing connected · nothing leaves this device"
              : `${connectedCount} connections · ${summary.recorded} future option${summary.recorded === 1 ? "" : "s"} noted`}
          </span>
        </div>
      </div>
      <div className="spread-page integrations-page">
        <section
          className="integration-connected"
          aria-labelledby="integration-connected-title"
        >
          <div>
            <span id="integration-connected-title">Connected now</span>
            <b>{signedIn ? "2 connections" : "None"}</b>
          </div>
          {signedIn ? (
            <>
              <article className="integration-live-card">
                <div className="integration-live-heading">
                  <div>
                    <span>Sign-in</span>
                    <b>{provider}</b>
                  </div>
                  <button
                    type="button"
                    onClick={signOut}
                    disabled={signingOut}
                  >
                    {signingOut ? "Signing out…" : "Sign out"}
                  </button>
                </div>
                <dl>
                  <div>
                    <dt>Account</dt>
                    <dd>
                      {auth.user?.name || "—"}
                      {auth.user?.email ? ` · ${auth.user.email}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Permissions requested</dt>
                    <dd>
                      Basic profile only: name, email address, and profile
                      picture, used to identify your account.
                    </dd>
                  </div>
                  <div>
                    <dt>Scope</dt>
                    <dd>
                      Identity only. No access to your mail, calendar, files,
                      contacts, or anything else in that account.
                    </dd>
                  </div>
                  <div>
                    <dt>Last verified</dt>
                    <dd>At the start of this session.</dd>
                  </div>
                  <div>
                    <dt>Disconnect</dt>
                    <dd>
                      Sign out. This device keeps its local copy; the account
                      copy stays on the server; nothing in the {provider}{" "}
                      account is touched.
                    </dd>
                  </div>
                  <div>
                    <dt>Delete data</dt>
                    <dd>
                      Deletion of what the account holds is handled in{" "}
                      <button
                        type="button"
                        className="integration-inline-link"
                        onClick={() => onNavigate("privacy")}
                      >
                        Privacy Controls
                      </button>
                      .
                    </dd>
                  </div>
                </dl>
              </article>
              <article className="integration-live-card">
                <div className="integration-live-heading">
                  <div>
                    <span>Account sync</span>
                    <b>This journal’s own server</b>
                  </div>
                  <button
                    type="button"
                    onClick={() => journal.syncNow()}
                    disabled={!journal.online}
                  >
                    Sync now
                  </button>
                </div>
                <dl>
                  <div>
                    <dt>What syncs</dt>
                    <dd>
                      The records and page state you save in this journal, to
                      your own account so they survive reinstalling and reach
                      your other devices.
                    </dd>
                  </div>
                  <div>
                    <dt>Last sync</dt>
                    <dd>
                      {formatWhen(journal.sync.lastSyncedAt) ?? "Not yet this session"}
                    </dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>
                      {journal.online ? "Online" : "Offline — changes are queued"}
                      {journal.pendingWrites > 0
                        ? ` · ${journal.pendingWrites} change${journal.pendingWrites === 1 ? "" : "s"} waiting to send`
                        : " · nothing waiting"}
                      {journal.sync.lastError
                        ? ` · last attempt failed: ${journal.sync.lastError}`
                        : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Who can read it</dt>
                    <dd>Only your signed-in account. No third party.</dd>
                  </div>
                  <div>
                    <dt>Disconnect</dt>
                    <dd>
                      Sign out (above). Syncing stops; what is already on the
                      server stays until you delete it.
                    </dd>
                  </div>
                </dl>
              </article>
            </>
          ) : (
            <article className="integration-live-card">
              <div className="integration-live-heading">
                <div>
                  <span>Not signed in</span>
                  <b>Everything stays on this device</b>
                </div>
              </div>
              <dl>
                <div>
                  <dt>If you sign in</dt>
                  <dd>
                    Google is asked for your basic profile (name, email,
                    picture) to identify you — nothing else — and this
                    journal’s own server keeps a copy of what you save so it
                    survives reinstalling.
                  </dd>
                </div>
                <div>
                  <dt>Right now</dt>
                  <dd>
                    No provider, no permissions granted, no sync, nothing to
                    disconnect. Deleting the app’s data on this device deletes
                    the only copy.
                  </dd>
                </div>
              </dl>
            </article>
          )}
        </section>
        <section className="integration-boundary">
          <div>
            <span>Future connections</span>
            <b>Notes only — nothing below is connected</b>
          </div>
          <p>
            Recording a note here starts no OAuth, requests no password or
            token, reads no other service, and imports nothing. It is a
            reminder to yourself that an option deserves a deliberate
            conversation before anything is ever linked.
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
                      {isRecorded ? "✓ Worth a conversation" : "Not considered"}
                    </span>
                    <b>{option.title}</b>
                  </div>
                  <button
                    type="button"
                    aria-pressed={isRecorded}
                    onClick={() => toggleConsent(option.key)}
                  >
                    {isRecorded ? "Clear note" : "Note as worth considering"}
                  </button>
                </div>
                <p>{option.note}</p>
                <dl className="integration-facts">
                  <div>
                    <dt>Provider</dt>
                    <dd>None</dd>
                  </div>
                  <div>
                    <dt>Permissions</dt>
                    <dd>None requested</dd>
                  </div>
                  <div>
                    <dt>Last sync</dt>
                    <dd>Never — nothing to sync</dd>
                  </div>
                  <div>
                    <dt>Disconnect</dt>
                    <dd>Nothing to disconnect</dd>
                  </div>
                  <div>
                    <dt>Clearing this note</dt>
                    <dd>Removes only the note; no external data exists</dd>
                  </div>
                </dl>
                <small>{option.boundary}</small>
                {isRecorded ? (
                  <em>
                    Noted {formatWhen(consent.consentAt)} · still no
                    connection.
                  </em>
                ) : null}
              </article>
            );
          })}
        </section>
        <section className="integration-summary" aria-live="polite">
          <div>
            <span>Where this leaves you</span>
            <b>
              {summary.recorded} of {integrationOptions.length} noted as worth
              a conversation
            </b>
          </div>
          <p>
            {signedIn
              ? `Connected: ${provider} sign-in and account sync. `
              : "Connected: nothing. "}
            Future options noted: {summary.recorded}
            {summary.recorded > 0
              ? ` (${integrationOptions
                  .filter(option => consents[option.key]?.state === "consent-recorded")
                  .map(option => option.title)
                  .join(", ")})`
              : ""}
            .{" "}
            {lastChangeAt
              ? `Last change ${formatWhen(lastChangeAt)}, saved.`
              : "No changes this visit."}{" "}
            Every journal page works without connecting anything.
          </p>
          <button
            type="button"
            className="ink-button"
            onClick={onContents}
          >
            Done here — back to contents
          </button>
        </section>
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
      className="journal-spread utilities-spread glass-scope"
      aria-labelledby="utilities-title"
    >
      <div className="spread-page utilities-intro">
        <JournalActions onContents={onContents} onCover={onCover} />
        <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">shared tools</p>
        <h2 id="utilities-title">
          Quick access,
          <br />
          <em>with purpose.</em>
        </h2>
        <p className="page-intro">
          A quiet index for the tools that support more than one chapter of your
          journal.
        </p>
        <p className="utility-purpose">
          {utilityItems.length} shared tools · one clear way in
        </p>
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
              <span className="utility-tile-index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
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
  type PortraitTheme = (typeof portraitThemes)[number]["id"];
  type PortraitFills = Record<string, string>;
  const today = new Date();
  const [portraitYear, setPortraitYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedColor, setSelectedColor] = useState(colorKey[2].value);
  const [theme, setTheme] = useState<PortraitTheme>(() => {
    const requestedTheme = new URLSearchParams(window.location.search).get(
      "portraitTheme"
    );
    return portraitThemes.some(option => option.id === requestedTheme)
      ? (requestedTheme as PortraitTheme)
      : "undersea";
  });
  // Fills are kept per year so stepping the year shows that year's marks,
  // not the same twelve months again under a different heading.
  const [fillsByYear, setFillsByYear] = useState<Record<string, PortraitFills>>(
    {}
  );
  const [lastFillsByYear, setLastFillsByYear] = useState<Record<
    string,
    PortraitFills
  > | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [startOffset, setStartOffset] = useState({ x: 0, y: 0 });
  const yearKey = String(portraitYear);
  const fills = fillsByYear[yearKey] ?? {};
  const portraitMonths = useMemo(
    () => portraitMonthsForYear(portraitYear),
    [portraitYear]
  );
  const [monthName, daysInMonth] = portraitMonths[selectedMonth];
  const filledCount = Object.keys(fills).length;
  const colorNameFor = (value: string) =>
    colorKey.find(color => color.value === value)?.name ?? "a retired colour";

  useMongoJournalScope({
    scope: "annual-portrait",
    payload: { fillsByYear, theme, selectedColor, portraitYear },
    hydrate: payload => {
      if (payload.fillsByYear && typeof payload.fillsByYear === "object")
        setFillsByYear(payload.fillsByYear as Record<string, PortraitFills>);
      if (
        typeof payload.theme === "string" &&
        portraitThemes.some(option => option.id === payload.theme)
      )
        setTheme(payload.theme as PortraitTheme);
      if (
        typeof payload.selectedColor === "string" &&
        colorKey.some(color => color.value === payload.selectedColor)
      )
        setSelectedColor(payload.selectedColor);
      if (
        typeof payload.portraitYear === "number" &&
        Number.isInteger(payload.portraitYear)
      )
        setPortraitYear(payload.portraitYear);
    },
  });

  function updateFill(year: number, monthIndex: number, day: number) {
    const key = `${monthIndex}-${day}`;
    const targetYear = String(year);
    const current = fillsByYear[targetYear] ?? {};
    const monthLabel = portraitMonthsForYear(year)[monthIndex]?.[0] ?? "Portrait";
    const wasFilled = Boolean(current[key]);
    setLastFillsByYear(fillsByYear);
    setFillsByYear(all => ({
      ...all,
      [targetYear]: toggleAnnualSlotFill(
        all[targetYear] ?? {},
        monthIndex,
        day,
        selectedColor
      ),
    }));
    onRecord({
      module: "Portrait",
      amount: 1,
      label: `${monthLabel} ${day} ${year} ${wasFilled ? "cleared" : `filled · ${colorNameFor(selectedColor)}`}`,
    });
    toast(
      wasFilled
        ? `${monthLabel} ${day} cleared`
        : `${monthLabel} ${day} filled · ${colorNameFor(selectedColor)}`
    );
  }

  function logToday() {
    const now = new Date();
    if (now.getFullYear() !== portraitYear) setPortraitYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
    updateFill(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function clearYear() {
    if (filledCount === 0) {
      toast(`${portraitYear} is already blank`);
      return;
    }
    setLastFillsByYear(fillsByYear);
    setFillsByYear(all => {
      const { [yearKey]: _cleared, ...rest } = all;
      return rest;
    });
    toast(`${portraitYear} cleared — Undo last brings it back`);
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

  const todayLabel = today.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });

  return (
    <section
      className="journal-spread annual-portrait-spread glass-scope"
      aria-labelledby="portrait-title"
    >
      <div className="spread-page portrait-copy-page">
        <JournalActions onContents={onContents} onCover={onCover} />
        <div className="portrait-editorial-surface">
          <p className="page-kicker glass-panel-fit glass-panel-fit-kicker">fitness · annual portrait</p>
          <h2 id="portrait-title">
            A year of
            <br />
            <em>movement</em>
          </h2>
          <p className="page-intro">
            All twelve months live inside one painted world. Pick a year,
            choose your movement colour, then fill or clear any dated slot.
            Marks are set by hand here and kept per year.
          </p>
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
            <small aria-live="polite">
              {filledCount === 0
                ? "No days marked yet"
                : `${filledCount} day${filledCount === 1 ? "" : "s"} marked`}
            </small>
          </div>
          <div className="portrait-theme-selector" aria-label="Portrait theme">
            {portraitThemes.map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => setTheme(option.id)}
                className={cn(theme === option.id && "selected")}
                aria-pressed={theme === option.id}
              >
                <b>{option.label}</b>
                <small>{option.note}</small>
              </button>
            ))}
          </div>
          <div className="color-key" aria-label="Movement colour key">
            {colorKey.map(color => (
              <button
                type="button"
                key={color.value}
                onClick={() => setSelectedColor(color.value)}
                className={cn(selectedColor === color.value && "selected")}
                aria-pressed={selectedColor === color.value}
              >
                <i style={{ background: color.value }} />
                <span>{color.name}</span>
              </button>
            ))}
          </div>
          <div className="portrait-tools">
            <button type="button" onClick={clearYear}>
              Clear {portraitYear}
            </button>
            <button
              type="button"
              onClick={logToday}
              title={`Marks ${todayLabel} ${today.getFullYear()} with ${colorNameFor(selectedColor)}`}
            >
              Mark today ({todayLabel}) <ArrowRight size={14} />
            </button>
            {lastFillsByYear ? (
              <button
                type="button"
                className="local-undo"
                onClick={() => {
                  setFillsByYear(lastFillsByYear);
                  setLastFillsByYear(null);
                  toast("Portrait restored");
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
              aria-label={`${portraitThemes.find(option => option.id === theme)?.label} annual movement portrait for ${portraitYear} with all twelve monthly daily regions`}
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
                  colorNameFor={colorNameFor}
                  onSelect={() => setSelectedMonth(monthIndex)}
                  onFill={day => updateFill(portraitYear, monthIndex, day)}
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
  type FitnessSession = {
    id: string;
    at: string;
    day: string;
    focus: string;
    minutes: number;
    note: string;
  };
  type RecoveryCheck = { value: string; day: string };
  const pixelStore = useContext(PixelsTrackerContext);
  const [focus, setFocus] = useState("Mobility");
  const [time, setTime] = useState("18 min");
  const [recoveryCheck, setRecoveryCheck] = useState<RecoveryCheck | null>(
    null
  );
  const [sessions, setSessions] = useState<FitnessSession[]>([]);
  const [lastSessions, setLastSessions] = useState<FitnessSession[] | null>(
    null
  );
  const [weeklyGoal, setWeeklyGoal] = useState(3);
  const [note, setNote] = useState("");
  const today = localCalendarDay(new Date());
  const weekStart = shiftDayKey(today, -6);

  useMongoJournalScope({
    scope: "fitness-overview",
    payload: { sessions, weeklyGoal, recoveryCheck, focus, time },
    hydrate: payload => {
      if (Array.isArray(payload.sessions))
        setSessions(
          (payload.sessions as FitnessSession[]).filter(
            session => session && typeof session.day === "string"
          )
        );
      if (
        typeof payload.weeklyGoal === "number" &&
        payload.weeklyGoal >= 1 &&
        payload.weeklyGoal <= 14
      )
        setWeeklyGoal(payload.weeklyGoal);
      if (
        payload.recoveryCheck &&
        typeof payload.recoveryCheck === "object" &&
        typeof (payload.recoveryCheck as RecoveryCheck).day === "string"
      )
        setRecoveryCheck(payload.recoveryCheck as RecoveryCheck);
      if (typeof payload.focus === "string") setFocus(payload.focus);
      if (typeof payload.time === "string") setTime(payload.time);
    },
  });

  // "Past 7 days" rather than a calendar week: it reads the same on a Monday
  // as on a Sunday, and never shows a zero just because the week rolled over.
  const recent = sessions.filter(
    session => session.day >= weekStart && session.day <= today
  );
  const minutes = recent.reduce((total, session) => total + session.minutes, 0);
  const workouts = recent.length;
  const recovery =
    recoveryCheck && recoveryCheck.day === today ? recoveryCheck.value : null;
  const recommendation =
    focus === "Strength"
      ? "Glute bridge + side plank foundation"
      : focus === "Core"
        ? "Bicycle crunches + side plank reach"
        : "Gentle mobility and lower-body flow";

  function logSession() {
    const addedMinutes = Number.parseInt(time, 10) || 15;
    const now = new Date();
    const trimmed = note.trim();
    setLastSessions(sessions);
    setSessions(current =>
      [
        {
          id: `fitness-${now.getTime()}`,
          at: now.toISOString(),
          day: localCalendarDay(now),
          focus,
          minutes: addedMinutes,
          note: trimmed,
        },
        ...current,
      ].slice(0, 200)
    );
    // Same automatic mark Workout Studio makes; a key set by hand today wins.
    const existing =
      pixelStore?.records.movement?.[
        pixelsCellKey(now.getMonth(), now.getDate())
      ];
    if (!existing)
      pixelStore?.set("movement", now.getMonth(), now.getDate(), "#06b6d4");
    onRecord({
      module: "Portrait",
      amount: 1,
      label: `${focus} session logged · ${addedMinutes} min${trimmed ? ` · ${trimmed}` : ""}`,
    });
    setNote("");
    toast(`${focus} session logged · ${addedMinutes} min`);
  }

  function removeSession(session: FitnessSession) {
    setLastSessions(sessions);
    setSessions(current => current.filter(item => item.id !== session.id));
    toast("Session removed — Undo last brings it back");
  }

  function setRecovery(value: string) {
    setRecoveryCheck(current =>
      current && current.day === today && current.value === value
        ? null
        : { value, day: today }
    );
  }

  const formatWhen = (session: FitnessSession) =>
    new Date(session.at).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <section className="fitness-overview" aria-label="Fitness overview">
      <div className="fitness-overview-heading">
        <span>Fitness overview</span>
        <b>Past 7 days</b>
      </div>
      <div className="fitness-summary">
        <article>
          <b>{minutes}</b>
          <small>movement min</small>
        </article>
        <article>
          <b>{workouts}</b>
          <small>{workouts === 1 ? "session" : "sessions"}</small>
        </article>
        <article>
          <b>{recovery ?? "—"}</b>
          <small>{recovery ? "recovery today" : "recovery not checked"}</small>
        </article>
      </div>
      <div className="fitness-progress">
        <div className="fitness-goal-row">
          <span>Movement goal · 7 days</span>
          <div
            className="fitness-goal-stepper"
            role="group"
            aria-label="Set movement goal in sessions per 7 days"
          >
            <button
              type="button"
              onClick={() => setWeeklyGoal(value => Math.max(1, value - 1))}
              aria-label="Decrease goal"
              disabled={weeklyGoal <= 1}
            >
              −
            </button>
            <b>{weeklyGoal}</b>
            <button
              type="button"
              onClick={() => setWeeklyGoal(value => Math.min(14, value + 1))}
              aria-label="Increase goal"
              disabled={weeklyGoal >= 14}
            >
              +
            </button>
          </div>
        </div>
        <b>
          {workouts}/{weeklyGoal} sessions
        </b>
        <i>
          <em
            style={{
              width: `${Math.min(100, (workouts / weeklyGoal) * 100)}%`,
            }}
          />
        </i>
        <small>
          {workouts === 0
            ? "Nothing logged in the past 7 days yet."
            : workouts >= weeklyGoal
              ? "Movement goal reached for the past 7 days."
              : `${weeklyGoal - workouts} session${weeklyGoal - workouts === 1 ? "" : "s"} to go.`}
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
        <span>How does recovery feel today?</span>
        <div>
          {["Low", "Steady", "Energised"].map(option => (
            <button
              type="button"
              key={option}
              onClick={() => setRecovery(option)}
              className={cn(recovery === option && "selected")}
              aria-pressed={recovery === option}
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
      {recent.length > 0 ? (
        <ul className="fitness-session-list" aria-label="Sessions in the past 7 days">
          {recent.slice(0, 5).map(session => (
            <li key={session.id}>
              <div>
                <b>
                  {session.focus} · {session.minutes} min
                </b>
                <small>
                  {formatWhen(session)}
                  {session.note ? ` · ${session.note}` : ""}
                </small>
              </div>
              <button
                type="button"
                onClick={() => removeSession(session)}
                aria-label={`Remove ${session.focus} session from ${formatWhen(session)}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {lastSessions ? (
        <button
          type="button"
          className="local-undo"
          onClick={() => {
            setSessions(lastSessions);
            setLastSessions(null);
            toast("Sessions restored");
          }}
        >
          Undo last
        </button>
      ) : null}
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
  colorNameFor,
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
  colorNameFor: (value: string) => string;
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
              aria-label={`${name} ${day}, ${fills[region.key] ? `filled · ${colorNameFor(fills[region.key])}` : "unfilled"}`}
            />
          );
        })}
      </g>
    </g>
  );
}
