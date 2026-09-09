import { useEffect, useRef, useState } from "react";
import { detailedWorkoutDemoAssets } from "../lib/workoutDemoCatalog";

type GluteDonkeyKicksMotionDemoProps = {
  variant: "donkey-kicks" | "donkey-kick-pulses";
  paused: boolean;
  onTogglePause: () => void;
  onReplay: () => void;
};

const demoCopy = {
  "donkey-kicks": {
    label: "Donkey Kicks",
    className: "donkey-kicks-demo",
    video: detailedWorkoutDemoAssets.donkeyKicksVideo,
    poster: detailedWorkoutDemoAssets.donkeyKicksStill,
    alt: "Donkey Kicks demonstration: from all fours, one bent knee drives through a full controlled range up and back down.",
    cue: "Hands under shoulders · knee stays bent · lift through the full range, then lower with control",
    status: "Reduced motion is on — the full-range donkey-kick start position is shown.",
  },
  "donkey-kick-pulses": {
    label: "Donkey Kick Pulses",
    className: "donkey-kick-pulses-demo",
    video: detailedWorkoutDemoAssets.donkeyKickPulsesVideo,
    poster: detailedWorkoutDemoAssets.donkeyKickPulsesStill,
    alt: "Donkey Kick Pulses demonstration: from all fours, one bent knee makes small controlled lifts through the upper half of the range.",
    cue: "Keep the knee bent · hold the top of a comfortable extension · make small half-range pulses",
    status: "Reduced motion is on — the upper-range pulse start position is shown.",
  },
} as const;

export function GluteDonkeyKicksMotionDemo({
  variant,
  paused,
  onTogglePause,
  onReplay,
}: GluteDonkeyKicksMotionDemoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const copy = demoCopy[variant];

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
    ? copy.status
    : paused
      ? "Demonstration paused."
      : "Demonstration playing.";

  return (
    <figure
      className={`workout-video-demo ${copy.className}`}
      aria-label={`${copy.label} demonstration`}
    >
      <div className="workout-video-media">
        <video
          ref={videoRef}
          className="workout-video"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster={copy.poster}
          aria-describedby={`${variant}-form-cue`}
        >
          <source src={copy.video} type="video/mp4" />
        </video>
        <img className="workout-video-still" src={copy.poster} alt={copy.alt} />
      </div>
      <figcaption>
        <span className="workout-video-label">Detailed demo · Glute movement</span>
        <p id={`${variant}-form-cue`}>{copy.cue}</p>
        <p className="workout-video-status" aria-live="polite">
          {status}
        </p>
        {!prefersReducedMotion && (
          <div className="workout-video-controls">
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
