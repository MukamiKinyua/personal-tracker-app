import { describe, expect, it } from "vitest";
import {
  detailedDemoPlaybackState,
  detailedWorkoutDemoAssets,
  detailedWorkoutDemoIds,
  isDetailedWorkoutDemo,
} from "./workoutDemoCatalog";
import { workoutRoutineById } from "./workoutStudio";

describe("Workout Studio detailed demonstration gate", () => {
  it("exposes the integrated detailed demos and keeps later previews locked", () => {
    expect(detailedWorkoutDemoIds).toEqual([
      "basic-crunches",
      "bicycle-kicks",
      "jack-knives",
      "russian-twists",
      "bicycle-crunches",
      "leg-raises",
      "single-leg-crunch",
      "scissor-kicks",
      "donkey-kicks",
      "donkey-kick-pulses",
      "fire-hydrants",
      "fire-hydrant-pulses",
      "side-lying-big-circles",
      "side-lying-small-circles",
      "toe-taps",
      "butterfly-kicks",
      "bicep-curl",
      "hammer-curl",
      "concentration-curl",
      "drag-curl",
      "zottman-curl",
      "tricep-kickback",
      "overhead-extension",
      "skull-crusher",
      "close-grip-press",
      "dumbbell-row",
      "reverse-fly",
      "lateral-raise",
      "front-raise",
      "shoulder-press",
      "arnold-press",
      "wrist-curl",
      "band-upper-back-pull",
      "dumbbell-lat-pull",
      "behind-back-band-pull-apart",
      "standing-band-pull-apart",
      "behind-neck-band-lat-pulldown",
      "dumbbell-round-the-world",
      "garland-pose",
      "seated-figure-four-one",
      "seated-figure-four-two",
      "twisted-pigeon",
      "bow-pose",
      "lizard",
      "pigeon",
      "head-to-knee",
      "quad-stretch",
      "frog-legs",
      "lotus-upward-dog",
      "happy-baby",
      "butterfly-pose",
    ]);
    expect(workoutRoutineById("core").exercises[0]?.id).toBe("basic-crunches");
    expect(workoutRoutineById("core").exercises[1]?.id).toBe("bicycle-kicks");
    expect(workoutRoutineById("core").exercises.at(-1)?.id).toBe(
      "single-leg-crunch"
    );
    expect(workoutRoutineById("yoga").exercises[0]?.id).toBe("garland-pose");
    expect(workoutRoutineById("yoga").exercises[1]?.id).toBe(
      "seated-figure-four-one"
    );
    expect(isDetailedWorkoutDemo("basic-crunches")).toBe(true);
    expect(isDetailedWorkoutDemo("bicycle-kicks")).toBe(true);
    expect(isDetailedWorkoutDemo("jack-knives")).toBe(true);
    expect(isDetailedWorkoutDemo("russian-twists")).toBe(true);
    expect(isDetailedWorkoutDemo("bicycle-crunches")).toBe(true);
    expect(isDetailedWorkoutDemo("leg-raises")).toBe(true);
    expect(isDetailedWorkoutDemo("single-leg-crunch")).toBe(true);
    expect(isDetailedWorkoutDemo("scissor-kicks")).toBe(true);
    expect(isDetailedWorkoutDemo("donkey-kicks")).toBe(true);
    expect(isDetailedWorkoutDemo("donkey-kick-pulses")).toBe(true);
    expect(isDetailedWorkoutDemo("bicep-curl")).toBe(true);
    expect(isDetailedWorkoutDemo("hammer-curl")).toBe(true);
    expect(isDetailedWorkoutDemo("concentration-curl")).toBe(true);
    expect(isDetailedWorkoutDemo("drag-curl")).toBe(true);
    expect(isDetailedWorkoutDemo("zottman-curl")).toBe(true);
    expect(isDetailedWorkoutDemo("tricep-kickback")).toBe(true);
    expect(isDetailedWorkoutDemo("overhead-extension")).toBe(true);
    expect(isDetailedWorkoutDemo("skull-crusher")).toBe(true);
    expect(isDetailedWorkoutDemo("close-grip-press")).toBe(true);
    expect(isDetailedWorkoutDemo("dumbbell-row")).toBe(true);
    expect(isDetailedWorkoutDemo("reverse-fly")).toBe(true);
    expect(isDetailedWorkoutDemo("lateral-raise")).toBe(true);
    expect(isDetailedWorkoutDemo("front-raise")).toBe(true);
    expect(isDetailedWorkoutDemo("shoulder-press")).toBe(true);
    expect(isDetailedWorkoutDemo("arnold-press")).toBe(true);
    expect(isDetailedWorkoutDemo("wrist-curl")).toBe(true);
    expect(isDetailedWorkoutDemo("band-upper-back-pull")).toBe(true);
    expect(isDetailedWorkoutDemo("dumbbell-lat-pull")).toBe(true);
    expect(isDetailedWorkoutDemo("behind-back-band-pull-apart")).toBe(true);
    expect(isDetailedWorkoutDemo("standing-band-pull-apart")).toBe(true);
    expect(isDetailedWorkoutDemo("behind-neck-band-lat-pulldown")).toBe(true);
    expect(isDetailedWorkoutDemo("garland-pose")).toBe(true);
    expect(isDetailedWorkoutDemo("seated-figure-four-one")).toBe(true);
    expect(isDetailedWorkoutDemo("seated-figure-four-two")).toBe(true);
    expect(isDetailedWorkoutDemo("twisted-pigeon")).toBe(true);
    expect(isDetailedWorkoutDemo("bow-pose")).toBe(true);
    expect(isDetailedWorkoutDemo("lizard")).toBe(true);
    expect(isDetailedWorkoutDemo("pigeon")).toBe(true);
    expect(isDetailedWorkoutDemo("head-to-knee")).toBe(true);
    expect(isDetailedWorkoutDemo("quad-stretch")).toBe(true);
    expect(isDetailedWorkoutDemo("frog-legs")).toBe(true);
    expect(isDetailedWorkoutDemo("lotus-upward-dog")).toBe(true);
    expect(isDetailedWorkoutDemo("happy-baby")).toBe(true);
    expect(isDetailedWorkoutDemo("butterfly-pose")).toBe(true);
    expect(isDetailedWorkoutDemo("toe-taps")).toBe(true);
    expect(isDetailedWorkoutDemo("butterfly-kicks")).toBe(true);
    expect(isDetailedWorkoutDemo("dumbbell-round-the-world")).toBe(true);
  });

  it("maps Dumbbell Round the World to its own user-supplied video and still-image fallback", () => {
    expect(detailedWorkoutDemoAssets.dumbbellRoundTheWorldVideo).toMatch(
      /dumbbell-round-the-world.*\.mp4$/
    );
    expect(detailedWorkoutDemoAssets.dumbbellRoundTheWorldStill).toMatch(
      /dumbbell-round-the-world.*-poster.*\.png$/
    );
    expect(detailedWorkoutDemoAssets.dumbbellRoundTheWorldVideo).not.toBe(
      detailedWorkoutDemoAssets.dumbbellLatPullVideo
    );
  });

  it("maps Toe Taps to its own user-supplied video and still-image fallback", () => {
    expect(detailedWorkoutDemoAssets.toeTapsVideo).toMatch(
      /toe-taps.*\.mp4$/
    );
    expect(detailedWorkoutDemoAssets.toeTapsStill).toMatch(
      /toe-taps.*-poster.*\.png$/
    );
    expect(detailedWorkoutDemoAssets.toeTapsVideo).not.toBe(
      detailedWorkoutDemoAssets.fireHydrantsVideo
    );
  });

  it("maps Butterfly Kicks to its own user-supplied video and still-image fallback", () => {
    expect(detailedWorkoutDemoAssets.butterflyKicksVideo).toMatch(
      /butterfly-kicks.*\.mp4$/
    );
    expect(detailedWorkoutDemoAssets.butterflyKicksStill).toMatch(
      /butterfly-kicks.*-poster.*\.png$/
    );
    expect(detailedWorkoutDemoAssets.butterflyKicksVideo).not.toBe(
      detailedWorkoutDemoAssets.toeTapsVideo
    );
  });

  it("maps Shoulder Press and Arnold Press to their own user-supplied videos and still-image fallbacks", () => {
    expect(detailedWorkoutDemoAssets.shoulderPressVideo).toMatch(
      /shoulder-press.*\.mp4$/
    );
    expect(detailedWorkoutDemoAssets.shoulderPressStill).toMatch(
      /shoulder-press.*-poster.*\.png$/
    );
    expect(detailedWorkoutDemoAssets.arnoldPressVideo).toMatch(
      /arnold-press.*\.mp4$/
    );
    expect(detailedWorkoutDemoAssets.arnoldPressStill).toMatch(
      /arnold-press.*-poster.*\.png$/
    );
    expect(detailedWorkoutDemoAssets.arnoldPressVideo).not.toBe(
      detailedWorkoutDemoAssets.shoulderPressVideo
    );
  });

  it("keeps the Bicycle Kicks video asset mapped separately from Basic Crunches", () => {
    expect(detailedWorkoutDemoAssets.bicycleKicksVideo).toMatch(/\.mp4$/);
    expect(detailedWorkoutDemoAssets.bicycleKicksVideo).not.toBe(
      detailedWorkoutDemoAssets.basicCrunchesVideo
    );
  });

  it("maps Leg Raises to its own video and still-image fallback", () => {
    expect(detailedWorkoutDemoAssets.legRaisesVideo).toMatch(
      /core-leg-raises.*\.mp4$/
    );
    expect(detailedWorkoutDemoAssets.legRaisesStill).toMatch(
      /core-leg-raises-poster.*\.png$/
    );
    expect(detailedWorkoutDemoAssets.legRaisesVideo).not.toBe(
      detailedWorkoutDemoAssets.bicycleCrunchesVideo
    );
  });

  it("maps Single-Leg Crunch to its own video and still-image fallback", () => {
    expect(detailedWorkoutDemoAssets.singleLegCrunchVideo).toMatch(
      /core-single-leg-crunch.*\.mp4$/
    );
    expect(detailedWorkoutDemoAssets.singleLegCrunchStill).toMatch(
      /core-single-leg-crunch-poster.*\.png$/
    );
    expect(detailedWorkoutDemoAssets.singleLegCrunchVideo).not.toBe(
      detailedWorkoutDemoAssets.legRaisesVideo
    );
  });

  it("maps Scissor Kicks to its own video and still-image fallback", () => {
    expect(detailedWorkoutDemoAssets.scissorKicksVideo).toMatch(
      /core-scissor-kicks.*\.mp4$/
    );
    expect(detailedWorkoutDemoAssets.scissorKicksStill).toMatch(
      /core-scissor-kicks-poster.*\.png$/
    );
    expect(detailedWorkoutDemoAssets.scissorKicksVideo).not.toBe(
      detailedWorkoutDemoAssets.singleLegCrunchVideo
    );
  });

  it("maps the two Glute donkey-kick videos to separate managed assets", () => {
    expect(detailedWorkoutDemoAssets.donkeyKicksVideo).toMatch(
      /donkey-kicks.*\.mp4$/
    );
    expect(detailedWorkoutDemoAssets.donkeyKicksStill).toMatch(
      /donkey-kicks-poster.*\.png$/
    );
    expect(detailedWorkoutDemoAssets.donkeyKickPulsesVideo).toMatch(
      /donkey-kick-pulses.*\.mp4$/
    );
    expect(detailedWorkoutDemoAssets.donkeyKickPulsesStill).toMatch(
      /donkey-kick-pulses-poster.*\.png$/
    );
    expect(detailedWorkoutDemoAssets.donkeyKicksVideo).not.toBe(
      detailedWorkoutDemoAssets.donkeyKickPulsesVideo
    );
    expect(detailedWorkoutDemoAssets.donkeyKicksStill).not.toBe(
      detailedWorkoutDemoAssets.donkeyKickPulsesStill
    );
  });

  it("maps the newly supplied Back band clips to separate managed videos and posters", () => {
    expect(detailedWorkoutDemoAssets.standingBandPullApartVideo).toMatch(
      /standing-band-pull-apart.*\.mp4$/
    );
    expect(detailedWorkoutDemoAssets.standingBandPullApartStill).toMatch(
      /standing-band-pull-apart-poster.*\.jpg$/
    );
    expect(detailedWorkoutDemoAssets.behindNeckBandLatPulldownVideo).toMatch(
      /behind-neck-band-lat-pulldown.*\.mp4$/
    );
    expect(detailedWorkoutDemoAssets.behindNeckBandLatPulldownStill).toMatch(
      /behind-neck-band-lat-pulldown-poster.*\.jpg$/
    );
    expect(detailedWorkoutDemoAssets.standingBandPullApartVideo).not.toBe(
      detailedWorkoutDemoAssets.behindNeckBandLatPulldownVideo
    );
  });

  it("maps the supplied Back band and dumbbell clips to the correct exercises", () => {
    expect(detailedWorkoutDemoAssets.bandUpperBackPullVideo).toMatch(
      /standing-single-arm-band-lat-pulldown.*\.mp4$/
    );
    expect(detailedWorkoutDemoAssets.bandUpperBackPullStill).toMatch(
      /standing-single-arm-band-lat-pulldown-poster.*\.jpg$/
    );
    expect(detailedWorkoutDemoAssets.dumbbellLatPullVideo).toMatch(
      /dumbbell-lat-pull-user-supplied.*\.mp4$/
    );
    expect(detailedWorkoutDemoAssets.dumbbellLatPullStill).toMatch(
      /dumbbell-lat-pull-user-supplied-poster.*\.png$/
    );
    expect(detailedWorkoutDemoAssets.behindBackBandPullApartVideo).toMatch(
      /behind-back-band-pull-apart.*\.mp4$/
    );
    expect(detailedWorkoutDemoAssets.behindBackBandPullApartStill).toMatch(
      /behind-back-band-pull-apart-poster.*\.jpg$/
    );
    expect(detailedWorkoutDemoAssets.bandUpperBackPullVideo).not.toBe(
      detailedWorkoutDemoAssets.dumbbellLatPullVideo
    );
    expect(detailedWorkoutDemoAssets.dumbbellLatPullVideo).not.toBe(
      detailedWorkoutDemoAssets.behindBackBandPullApartVideo
    );
    const backExerciseIds = workoutRoutineById("back").exercises.map(
      exercise => exercise.id
    );
    expect(backExerciseIds).toContain("band-upper-back-pull");
    expect(backExerciseIds).toContain("dumbbell-lat-pull");
    expect(backExerciseIds).not.toContain("standing-band-lat-pulldown");
    expect(backExerciseIds).toContain("behind-back-band-pull-apart");
    expect(workoutRoutineById("back").exercises.find(
      exercise => exercise.id === "dumbbell-lat-pull"
    )?.name).toBe("Dumbbell Lat Pull");
  });

  it("maps the four verified Arms clips to separate managed videos and posters", () => {
    expect(detailedWorkoutDemoAssets.bicepCurlVideo).toMatch(/bicep-curl.*\.mp4$/);
    expect(detailedWorkoutDemoAssets.bicepCurlStill).toMatch(/bicep-curl-poster.*\.png$/);
    expect(detailedWorkoutDemoAssets.zottmanCurlVideo).toMatch(/zottman-curl-confirmed.*\.mp4$/);
    expect(detailedWorkoutDemoAssets.zottmanCurlStill).toMatch(/zottman-curl-confirmed-poster.*\.png$/);
    expect(detailedWorkoutDemoAssets.hammerCurlVideo).toMatch(/hammer-curl.*\.mp4$/);
    expect(detailedWorkoutDemoAssets.hammerCurlStill).toMatch(/hammer-curl-poster.*\.png$/);
    expect(detailedWorkoutDemoAssets.concentrationCurlVideo).toMatch(/concentration-curl.*\.mp4$/);
    expect(detailedWorkoutDemoAssets.concentrationCurlStill).toMatch(/concentration-curl(?:-confirmed)?-poster.*\.png$/);
    expect(detailedWorkoutDemoAssets.dragCurlVideo).toMatch(/drag-curl-confirmed.*\.mp4$/);
    expect(detailedWorkoutDemoAssets.dragCurlStill).toMatch(/drag-curl-confirmed-poster.*\.png$/);
    expect(detailedWorkoutDemoAssets.frontRaiseVideo).toMatch(/front-raise-verified-20260827.*\.mp4$/);
    expect(detailedWorkoutDemoAssets.frontRaiseStill).toMatch(/front-raise-user-poster.*\.png$/);
    expect(detailedWorkoutDemoAssets.wristCurlVideo).toMatch(/wrist-curl-user.*\.mp4$/);
    expect(detailedWorkoutDemoAssets.wristCurlStill).toMatch(/wrist-curl-user-poster.*\.png$/);
    expect(detailedWorkoutDemoAssets.tricepKickbackVideo).toMatch(/tricep-kickback.*\.mp4$/);
    expect(detailedWorkoutDemoAssets.tricepKickbackStill).toMatch(/tricep-kickback-poster.*\.png$/);
    expect(detailedWorkoutDemoAssets.bicepCurlVideo).not.toBe(detailedWorkoutDemoAssets.hammerCurlVideo);
    expect(detailedWorkoutDemoAssets.concentrationCurlVideo).not.toBe(detailedWorkoutDemoAssets.tricepKickbackVideo);
  });

  it("maps the supplied yoga artwork to separate managed image assets", () => {
    expect(detailedWorkoutDemoAssets.garlandPoseStill).toMatch(
      /yoga-garland-pose.*\.png$/
    );
    expect(detailedWorkoutDemoAssets.seatedFigureFourStill).toMatch(
      /yoga-seated-figure-four-variation.*\.png$/
    );
    expect(detailedWorkoutDemoAssets.garlandPoseStill).not.toBe(
      detailedWorkoutDemoAssets.seatedFigureFourStill
    );
    expect(detailedWorkoutDemoAssets.seatedFigureFourFoldStill).toMatch(
      /yoga-seated-figure-four-fold.*\.png$/
    );
    expect(detailedWorkoutDemoAssets.bowPoseStill).toMatch(
      /yoga-bow-pose.*\.png$/
    );
    expect(detailedWorkoutDemoAssets.seatedFigureFourFoldStill).not.toBe(
      detailedWorkoutDemoAssets.bowPoseStill
    );
    expect(detailedWorkoutDemoAssets.lizardPoseStill).toMatch(
      /yoga-lizard-pose.*\.png$/
    );
    expect(detailedWorkoutDemoAssets.pigeonPoseStill).toMatch(
      /yoga-pigeon-pose.*\.png$/
    );
    expect(detailedWorkoutDemoAssets.lizardPoseStill).not.toBe(
      detailedWorkoutDemoAssets.pigeonPoseStill
    );
    expect(detailedWorkoutDemoAssets.headToKneeStill).toMatch(
      /yoga-head-to-knee.*\.png$/
    );
    expect(detailedWorkoutDemoAssets.quadStretchStill).toMatch(
      /yoga-quad-stretch-generated.*\.png$/
    );
    expect(detailedWorkoutDemoAssets.frogLegsStill).toMatch(
      /frog-legs-heels-inward-correction.*\.png$/
    );
    expect(detailedWorkoutDemoAssets.headToKneeStill).not.toBe(
      detailedWorkoutDemoAssets.quadStretchStill
    );
    expect(detailedWorkoutDemoAssets.frogLegsStill).not.toBe(
      detailedWorkoutDemoAssets.quadStretchStill
    );
    expect(detailedWorkoutDemoAssets.twistedPigeonStill).toMatch(
      /Gemini_Generated_Image_a2vcr0a2vcr0a2vc.*\.png$/
    );
    expect(detailedWorkoutDemoAssets.lotusUpwardDogStill).toMatch(
      /lotus-in-upward-dog-corrected.*\.png$/
    );
    expect(detailedWorkoutDemoAssets.twistedPigeonStill).not.toBe(
      detailedWorkoutDemoAssets.lotusUpwardDogStill
    );
    expect(detailedWorkoutDemoAssets.happyBabyStill).toMatch(
      /pasted_file_e9Gp22_image.*\.png$/
    );
    expect(detailedWorkoutDemoAssets.happyBabyStill).not.toBe(
      detailedWorkoutDemoAssets.lotusUpwardDogStill
    );
    expect(detailedWorkoutDemoAssets.butterflyPoseStill).toMatch(
      /pasted_file_ZNERe7_image.*\.png$/
    );
    expect(detailedWorkoutDemoAssets.butterflyPoseStill).not.toBe(
      detailedWorkoutDemoAssets.happyBabyStill
    );
  });

  it("keeps a video loop and still-image fallback available for the first demonstration", () => {
    expect(detailedWorkoutDemoAssets.basicCrunchesVideo).toMatch(/\.mp4$/);
    expect(detailedWorkoutDemoAssets.basicCrunchesStill).toMatch(/\.png$/);
  });

  it("makes Replay restart in a playing state even when the demonstration was paused", () => {
    expect(detailedDemoPlaybackState(true, "replay")).toBe(false);
    expect(detailedDemoPlaybackState(false, "replay")).toBe(false);
    expect(detailedDemoPlaybackState(false, "toggle")).toBe(true);
  });
});


describe("Fire Hydrants supplied demo", () => {
  it("registers Fire Hydrants as a detailed demo with separate managed assets", () => {
    expect(isDetailedWorkoutDemo("fire-hydrants")).toBe(true);
    expect(detailedWorkoutDemoAssets.fireHydrantsVideo).toMatch(
      /fire-hydrants-user-supplied.*\.mp4$/
    );
    expect(detailedWorkoutDemoAssets.fireHydrantsStill).toMatch(
      /fire-hydrants-user-supplied.*-poster.*\.png$/
    );
  });

  it("maps Fire Hydrant Pulses to its own user-supplied video and still-image fallback", () => {
    expect(isDetailedWorkoutDemo("fire-hydrant-pulses")).toBe(true);
    expect(detailedWorkoutDemoAssets.fireHydrantPulsesVideo).toMatch(
      /fire-hydrant-pulses.*\.mp4$/
    );
    expect(detailedWorkoutDemoAssets.fireHydrantPulsesStill).toMatch(
      /fire-hydrant-pulses.*-poster.*\.png$/
    );
    expect(detailedWorkoutDemoAssets.fireHydrantPulsesVideo).not.toBe(
      detailedWorkoutDemoAssets.fireHydrantsVideo
    );
  });

  it("maps Side-Lying Big Circles and Small Circles to separate managed videos and posters", () => {
    expect(isDetailedWorkoutDemo("side-lying-big-circles")).toBe(true);
    expect(detailedWorkoutDemoAssets.sideLyingBigCirclesVideo).toMatch(
      /side-lying-big-circles.*\.mp4$/
    );
    expect(detailedWorkoutDemoAssets.sideLyingBigCirclesStill).toMatch(
      /side-lying-big-circles.*-poster.*\.png$/
    );
    expect(isDetailedWorkoutDemo("side-lying-small-circles")).toBe(true);
    expect(detailedWorkoutDemoAssets.sideLyingSmallCirclesVideo).toMatch(
      /side-lying-small-circles.*\.mp4$/
    );
    expect(detailedWorkoutDemoAssets.sideLyingSmallCirclesStill).toMatch(
      /side-lying-small-circles.*-poster.*\.png$/
    );
    expect(detailedWorkoutDemoAssets.sideLyingBigCirclesVideo).not.toBe(
      detailedWorkoutDemoAssets.sideLyingSmallCirclesVideo
    );
  });
});
