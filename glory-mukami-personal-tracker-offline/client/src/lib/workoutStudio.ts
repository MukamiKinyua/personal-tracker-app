export type WorkoutMotion =
  | "crunch"
  | "bicycle"
  | "jackknife"
  | "twist"
  | "toe-tap"
  | "scissor"
  | "reverse-crunch"
  | "flutter"
  | "kick"
  | "hydrate"
  | "rainbow"
  | "circle"
  | "round-the-world"
  | "pump"
  | "lat-pull"
  | "bird-dog"
  | "ytw"
  | "reverse-table"
  | "dolphin"
  | "band-pull"
  | "curl"
  | "row"
  | "triceps"
  | "press"
  | "raise"
  | "yoga";

export type WorkoutExercise = {
  id: string;
  name: string;
  target: string;
  cue: string;
  motion: WorkoutMotion;
};

export type WorkoutRoutine = {
  id: "core" | "glutes" | "back" | "arms" | "yoga";
  label: string;
  eyebrow: string;
  warmup: string;
  cooldown: string;
  exercises: WorkoutExercise[];
};

export const workoutRoutines: WorkoutRoutine[] = [
  {
    id: "core",
    label: "Core · 11 minutes",
    eyebrow: "one focused movement each minute",
    warmup:
      "Settle into a comfortable floor position and move at a pace you control.",
    cooldown: "Rest quietly and let your breathing return to an easy rhythm.",
    exercises: [
      {
        id: "basic-crunches",
        name: "Basic Crunches",
        target: "Minute 1 · tabletop legs",
        cue: "Keep knees bent at 90 degrees and lift with a small, controlled curl.",
        motion: "crunch",
      },
      {
        id: "bicycle-kicks",
        name: "Bicycle Kicks",
        target: "Minute 2 · continuous",
        cue: "Alternate long leg extensions while keeping the middle of your body steady.",
        motion: "bicycle",
      },
      {
        id: "jack-knives",
        name: "Jack Knives",
        target: "Minute 3 · 15 each side",
        cue: "Reach with control and return fully before the next repetition.",
        motion: "jackknife",
      },
      {
        id: "russian-twists",
        name: "Russian Twists",
        target: "Minute 4 · feet gently elevated",
        cue: "Rotate from the torso at a manageable range without rushing.",
        motion: "twist",
      },
      {
        id: "toe-taps",
        name: "Toe Taps",
        target: "Minute 5 · tabletop legs",
        cue: "Tap one toe to the mat at a time and return to tabletop.",
        motion: "toe-tap",
      },
      {
        id: "bicycle-crunches",
        name: "Bicycle Crunches",
        target: "Minute 6 · 15 each side",
        cue: "Complete one side with focus before changing sides.",
        motion: "bicycle",
      },
      {
        id: "scissor-kicks",
        name: "Scissor Kicks",
        target: "Minute 7 · low hover",
        cue: "Keep straight legs at a height that feels stable, then make small crossing motions.",
        motion: "scissor",
      },
      {
        id: "reverse-crunches",
        name: "Reverse Crunches",
        target: "Minute 8 · controlled",
        cue: "Use a small hip lift and return to the mat with control.",
        motion: "reverse-crunch",
      },
      {
        id: "butterfly-kicks",
        name: "Butterfly Kicks",
        target: "Minute 9 · small and quick",
        cue: "Use short up-and-down leg motions close to the floor at a pace you can control.",
        motion: "flutter",
      },
      {
        id: "leg-raises",
        name: "Leg Raises",
        target: "Minute 10 · controlled",
        cue: "Support your upper body on the forearms, keep both legs straight and together, and lift and lower without dropping them heavily.",
        motion: "raise",
      },
      {
        id: "single-leg-crunch",
        name: "Single-Leg Crunch",
        target: "Minute 11 · alternating sides",
        cue: "Reach toward the raised foot as one knee draws in, then lower the torso and extend the leg with control.",
        motion: "crunch",
      },
    ],
  },
  {
    id: "glutes",
    label: "Glutes · controlled sets",
    eyebrow: "15 reps per movement unless noted",
    warmup:
      "Take a few easy hip circles and choose a stable all-fours or floor position.",
    cooldown: "Rest in a comfortable position and release your hips gradually.",
    exercises: [
      {
        id: "donkey-kicks",
        name: "Donkey Kicks",
        target: "15 reps",
        cue: "Press one bent leg back with a steady torso, then return softly.",
        motion: "kick",
      },
      {
        id: "donkey-kick-pulses",
        name: "Donkey Kick Pulses",
        target: "15 pulses",
        cue: "At the top of a comfortable extension, use small controlled pulses.",
        motion: "kick",
      },
      {
        id: "fire-hydrants",
        name: "Fire Hydrants",
        target: "15 reps",
        cue: "Lift a bent knee out to the side while keeping your weight even through both hands.",
        motion: "hydrate",
      },
      {
        id: "fire-hydrant-pulses",
        name: "Fire Hydrant Pulses",
        target: "15 pulses",
        cue: "At your chosen high point, make short side pulses without twisting the torso.",
        motion: "hydrate",
      },
      {
        id: "rainbow-kicks",
        name: "Rainbow Kicks",
        target: "15 reps",
        cue: "Sweep the foot through a wide, comfortable arc and return with control.",
        motion: "rainbow",
      },
      {
        id: "side-leg-circles",
        name: "Side Leg Circles",
        target: "15 circles",
        cue: "Make a deliberate forward or backward circle at a range you can control.",
        motion: "circle",
      },
      {
        id: "side-fire-hydrants",
        name: "Side Fire Hydrants",
        target: "15 reps",
        cue: "Keep the knee bent and lift laterally without leaning into the movement.",
        motion: "hydrate",
      },
      {
        id: "bent-knee-circles",
        name: "Bent Knee Circles",
        target: "15 circles",
        cue: "Rotate the hip slowly in one direction with a bent knee.",
        motion: "circle",
      },
      {
        id: "reverse-circles",
        name: "Reverse Circles",
        target: "15 circles",
        cue: "Reverse the direction and keep the circle slow and even.",
        motion: "circle",
      },
      {
        id: "frog-pumps",
        name: "Frog Pumps",
        target: "30 reps",
        cue: "With soles together near the pelvis, drive the hips up and return with control.",
        motion: "pump",
      },
      {
        id: "side-lying-big-circles",
        name: "Side-Lying Big Circles",
        target: "15 circles each side",
        cue: "Lie on your side and trace a large, slow circle with the top leg, keeping the hips stacked.",
        motion: "circle",
      },
      {
        id: "side-lying-small-circles",
        name: "Side-Lying Small Circles",
        target: "15 circles each side",
        cue: "Lie on your side and trace a small, controlled circle with the top leg, keeping the hips stacked.",
        motion: "circle",
      },
    ],
  },
  {
    id: "back",
    label: "Back · stability & control",
    eyebrow: "bodyweight and optional resistance band",
    warmup:
      "Circle your shoulders gently and choose an anchored, comfortable position.",
    cooldown:
      "Lower gradually, then let your shoulders and back settle without forcing a stretch.",
    exercises: [
      {
        id: "band-upper-back-pull",
        name: "Resistance-Band Upper-Back Pull",
        target: "User-chosen controlled set",
        cue: "Use only a secure band setup; draw the band with steady shoulders and no jerking.",
        motion: "band-pull",
      },
      {
        id: "dumbbell-lat-pull",
        name: "Dumbbell Lat Pull",
        target: "User-chosen controlled set",
        cue: "Keep the ribs steady; pull the dumbbells down and back toward the sides with controlled shoulder movement.",
        motion: "lat-pull",
      },
      {
        id: "behind-back-band-pull-apart",
        name: "Behind-the-Back Band Pull-Apart",
        target: "User-chosen controlled set",
        cue: "Stand tall and pull the band ends apart behind the back without shrugging or arching.",
        motion: "band-pull",
      },
      {
        id: "standing-band-pull-apart",
        name: "Standing Band Pull-Apart",
        target: "User-chosen controlled set",
        cue: "Hold the band at shoulder height; pull the hands apart across the upper back, then return without shrugging.",
        motion: "band-pull",
      },
      {
        id: "behind-neck-band-lat-pulldown",
        name: "Behind-the-Neck Band Lat Pulldown",
        target: "User-chosen controlled set",
        cue: "Keep the spine neutral and draw the elbows down and back toward the sides while maintaining comfortable band tension.",
        motion: "lat-pull",
      },
      {
        id: "dumbbell-round-the-world",
        name: "Dumbbell Round the World",
        target: "User-chosen controlled set",
        cue: "Hold a light dumbbell at the waist and trace a slow, wide circle around the head, keeping the shoulders steady.",
        motion: "round-the-world",
      },
      {
        id: "shoulder-press",
        name: "Shoulder Press",
        target: "8–12 × 3",
        cue: "Start at shoulder level and press overhead only through a comfortable range.",
        motion: "press",
      },
      {
        id: "arnold-press",
        name: "Arnold Press",
        target: "8–12 × 3",
        cue: "Start with palms facing you at shoulder height, then rotate outward while pressing overhead.",
        motion: "press",
      },
    ],
  },
  {
    id: "arms",
    label: "Arms · strength menu",
    eyebrow: "choose a small set of movements",
    warmup:
      "Warm your wrists and shoulders with easy circles before choosing a load.",
    cooldown:
      "Set weights down safely, then let your shoulders and forearms relax.",
    exercises: [
      {
        id: "bicep-curl",
        name: "Bicep Curl",
        target: "12 × 3",
        cue: "Keep elbows close and lower slowly.",
        motion: "curl",
      },
      {
        id: "hammer-curl",
        name: "Hammer Curl",
        target: "15 × 3",
        cue: "Keep palms facing each other and elbows close to your sides.",
        motion: "curl",
      },
      {
        id: "concentration-curl",
        name: "Concentration Curl",
        target: "12 per side × 3",
        cue: "Brace the elbow on the inner thigh and curl with control.",
        motion: "curl",
      },
      {
        id: "tricep-kickback",
        name: "Tricep Kickback",
        target: "10–15 × 3",
        cue: "Hinge forward, keep the upper arm still, then extend without swinging.",
        motion: "triceps",
      },
      {
        id: "overhead-extension",
        name: "Overhead Extension",
        target: "10–15 × 3",
        cue: "Keep elbows comfortably in and lower behind the head with control.",
        motion: "triceps",
      },
      {
        id: "skull-crusher",
        name: "Skull Crusher",
        target: "12 × 3",
        cue: "Lie back, bend only at the elbows, and lower toward the forehead slowly.",
        motion: "triceps",
      },
      {
        id: "close-grip-press",
        name: "Close-Grip Press",
        target: "8–12 × 3",
        cue: "Keep weights close and elbows in as you press with control.",
        motion: "press",
      },
      {
        id: "dumbbell-row",
        name: "Dumbbell Row",
        target: "12 per side × 3",
        cue: "Keep a long back and pull the weight toward your hip.",
        motion: "row",
      },
      {
        id: "reverse-fly",
        name: "Reverse Fly",
        target: "12 × 3",
        cue: "Hinge forward, open the weights wide, and move without a jerk.",
        motion: "raise",
      },
      {
        id: "lateral-raise",
        name: "Lateral Raise",
        target: "12–15 × 3",
        cue: "Raise to a comfortable shoulder height and lower slowly.",
        motion: "raise",
      },
      {
        id: "front-raise",
        name: "Front Raise",
        target: "12 × 3",
        cue: "Lift in front to a comfortable height and return with control.",
        motion: "raise",
      },
      {
        id: "drag-curl",
        name: "Drag Curl",
        target: "10–15 × 3",
        cue: "Keep weights close to the body and let elbows move gently back.",
        motion: "curl",
      },
      {
        id: "zottman-curl",
        name: "Zottman Curl",
        target: "12 × 3",
        cue: "Curl with palms up, turn palms down, and lower slowly.",
        motion: "curl",
      },
      {
        id: "wrist-curl",
        name: "Wrist Curl",
        target: "12–15 × 3",
        cue: "Rest forearms on thighs and move only through the wrists.",
        motion: "curl",
      },
      {
        id: "reverse-curl",
        name: "Reverse Curl",
        target: "10–12 × 3",
        cue: "Keep palms down and wrists straight as you curl with control.",
        motion: "curl",
      },
    ],
  },
  {
    id: "yoga",
    label: "Hip-opening yoga · 13 poses",
    eyebrow: "choose a hold and move without forcing range",
    warmup:
      "Settle into a steady breath and use padding or support when you prefer it.",
    cooldown:
      "Leave the final pose slowly and rest in a position that feels comfortable.",
    exercises: [
      {
        id: "garland-pose",
        name: "Garland Pose",
        target: "20–60 second hold",
        cue: "Use a supported squat shape and keep the range comfortable.",
        motion: "yoga",
      },
      {
        id: "seated-figure-four-one",
        name: "Seated Figure 4 Variation",
        target: "20–60 seconds each side",
        cue: "Sit tall and choose a gentle hip-opening range.",
        motion: "yoga",
      },
      {
        id: "seated-figure-four-two",
        name: "Seated Figure 4 Variation · Fold",
        target: "20–60 seconds each side",
        cue: "Add only a small forward fold if it feels comfortable.",
        motion: "yoga",
      },
      {
        id: "twisted-pigeon",
        name: "Twisted Pigeon Pose",
        target: "20–60 seconds each side",
        cue: "Turn gently and avoid forcing the twist.",
        motion: "yoga",
      },
      {
        id: "quad-stretch",
        name: "Quad Stretch",
        target: "20–60 seconds each side",
        cue: "Use a steady hold and keep the knee position comfortable.",
        motion: "yoga",
      },
      {
        id: "lizard",
        name: "Lizard Pose Variation",
        target: "20–60 seconds each side",
        cue: "Use blocks or forearms only if the position feels stable.",
        motion: "yoga",
      },
      {
        id: "pigeon",
        name: "Pigeon Pose",
        target: "20–60 seconds each side",
        cue: "Support the hip as needed and keep the fold optional.",
        motion: "yoga",
      },
      {
        id: "head-to-knee",
        name: "Head to Knee",
        target: "20–60 seconds each side",
        cue: "Lengthen forward only to a comfortable range.",
        motion: "yoga",
      },
      {
        id: "frog-legs",
        name: "Frog Legs Pose",
        target: "20–60 second hold",
        cue: "Keep the knees supported and reduce the range whenever you prefer.",
        motion: "yoga",
      },
      {
        id: "lotus-upward-dog",
        name: "Lotus in Upward Dog",
        target: "20–60 second hold",
        cue: "Lift the chest gently and choose a comfortable backbend range.",
        motion: "yoga",
      },
      {
        id: "bow-pose",
        name: "Bow Pose",
        target: "20–30 second hold",
        cue: "Lift gently through the chest and thighs while keeping the breath steady.",
        motion: "yoga",
      },
      {
        id: "happy-baby",
        name: "Happy Baby Pose",
        target: "20–60 second hold",
        cue: "Hold where reachable and keep the low back comfortable.",
        motion: "yoga",
      },
      {
        id: "butterfly-pose",
        name: "Butterfly Pose",
        target: "20–60 second hold",
        cue: "Let knees open naturally and keep the forward fold optional.",
        motion: "yoga",
      },
    ],
  },
];

export function workoutRoutineById(id: WorkoutRoutine["id"]) {
  return (
    workoutRoutines.find(routine => routine.id === id) ?? workoutRoutines[0]
  );
}

export function workoutCompletedCount(
  completed: Record<string, boolean>,
  routine: WorkoutRoutine
) {
  return routine.exercises.filter(exercise => completed[exercise.id]).length;
}
