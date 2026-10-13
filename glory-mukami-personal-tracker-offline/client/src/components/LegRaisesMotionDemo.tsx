import { useEffect, useRef, useState } from "react";
import { detailedWorkoutDemoAssets } from "../lib/workoutDemoCatalog";

const { legRaisesVideo, legRaisesStill } = detailedWorkoutDemoAssets;

type LegRaisesMotionDemoProps = {
  paused: boolean;
  onTogglePause: () => void;
  onReplay: () => void;
};

export function LegRaisesMotionDemo({
  paused,
  onTogglePause,
  onReplay,
}: LegRaisesMotionDemoProps) {
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
    ? "Reduced motion is on — the forearm-supported start position is shown."
    : paused
      ? "Demonstration paused."
      : "Demonstration playing.";

  return (
    <figure
      className="workout-video-demo leg-raises-demo"
      aria-label="Leg Raises demonstration"
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
          poster={legRaisesStill}
          aria-describedby="leg-raises-form-cue"
        >
          <source src={legRaisesVideo} type="video/mp4" />
        </video>
        <img
          className="workout-video-still"
          src={legRaisesStill}
          alt="Leg Raises start position: upper body supported on the forearms, with both straight legs together hovering just above the floor."
        />
      </div>
      <figcaption>
        <span className="workout-video-label">
          Detailed demo
        </span>
        <p id="leg-raises-form-cue">
          Forearms grounded · legs straight and together · controlled lift and
          lower
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
