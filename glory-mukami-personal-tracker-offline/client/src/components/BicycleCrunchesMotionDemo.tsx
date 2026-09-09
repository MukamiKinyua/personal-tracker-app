import { useEffect, useRef, useState } from "react";
import { detailedWorkoutDemoAssets } from "../lib/workoutDemoCatalog";

const { bicycleCrunchesVideo, bicycleCrunchesStill } =
  detailedWorkoutDemoAssets;

type BicycleCrunchesMotionDemoProps = {
  paused: boolean;
  onTogglePause: () => void;
  onReplay: () => void;
};

export function BicycleCrunchesMotionDemo({
  paused,
  onTogglePause,
  onReplay,
}: BicycleCrunchesMotionDemoProps) {
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
    ? "Reduced motion is on — the cross-body start position is shown."
    : paused
      ? "Demonstration paused."
      : "Demonstration playing.";

  return (
    <figure
      className="workout-video-demo bicycle-crunches-demo"
      aria-label="Bicycle Crunches character demonstration"
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
          poster={bicycleCrunchesStill}
          aria-describedby="bicycle-crunches-form-cue"
        >
          <source src={bicycleCrunchesVideo} type="video/mp4" />
        </video>
        <img
          className="workout-video-still"
          src={bicycleCrunchesStill}
          alt="Bicycle Crunches start position: one knee bends toward the torso while the opposite leg extends during a controlled cross-body crunch."
        />
      </div>
      <figcaption>
        <span className="workout-video-label">
          Detailed demo · fifth exercise under review
        </span>
        <p id="bicycle-crunches-form-cue">
          Opposite elbow and knee · controlled torso curl · 15 each side
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
