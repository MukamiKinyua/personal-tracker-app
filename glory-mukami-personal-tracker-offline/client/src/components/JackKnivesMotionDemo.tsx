import { useEffect, useRef, useState } from "react";
import {
  detailedDemoPlaybackState,
  detailedWorkoutDemoAssets,
} from "../lib/workoutDemoCatalog";

const { jackKnivesVideo, jackKnivesStill } = detailedWorkoutDemoAssets;

type JackKnivesMotionDemoProps = {
  paused: boolean;
  onTogglePause: () => void;
  onReplay: () => void;
};

export function JackKnivesMotionDemo({
  paused,
  onTogglePause,
  onReplay,
}: JackKnivesMotionDemoProps) {
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
    ? "Reduced motion is on — the extended-leg start position is shown."
    : paused
      ? "Demonstration paused."
      : "Demonstration playing.";

  return (
    <figure
      className="workout-video-demo jack-knives-demo"
      aria-label="Jack Knives character demonstration"
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
          poster={jackKnivesStill}
          aria-describedby="jack-knives-form-cue"
        >
          <source src={jackKnivesVideo} type="video/mp4" />
        </video>
        <img
          className="workout-video-still"
          src={jackKnivesStill}
          alt="Jack Knives start position: lying on the back with legs lifted and arms reaching upward before a controlled tuck and extension."
        />
      </div>
      <figcaption>
        <span className="workout-video-label">
          Detailed demo
        </span>
        <p id="jack-knives-form-cue">
          Controlled tuck and extension · steady floor contact · 15 per side
        </p>
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
