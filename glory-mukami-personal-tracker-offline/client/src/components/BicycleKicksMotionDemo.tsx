import { useEffect, useRef, useState } from "react";
import {
  detailedDemoPlaybackState,
  detailedWorkoutDemoAssets,
} from "../lib/workoutDemoCatalog";

const { bicycleKicksVideo, bicycleKicksStill } = detailedWorkoutDemoAssets;

type BicycleKicksMotionDemoProps = {
  paused: boolean;
  onTogglePause: () => void;
  onReplay: () => void;
};

export function BicycleKicksMotionDemo({
  paused,
  onTogglePause,
  onReplay,
}: BicycleKicksMotionDemoProps) {
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
    ? "Reduced motion is on — the alternating-leg start position is shown."
    : paused
      ? "Demonstration paused."
      : "Demonstration playing.";

  return (
    <figure
      className="workout-video-demo bicycle-kicks-demo"
      aria-label="Bicycle Kicks character demonstration"
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
          poster={bicycleKicksStill}
          aria-describedby="bicycle-kicks-form-cue"
        >
          <source src={bicycleKicksVideo} type="video/mp4" />
        </video>
        <img
          className="workout-video-still"
          src={bicycleKicksStill}
          alt="Bicycle Kicks start position: lying on the back with one knee bent and the opposite leg extended low and long."
        />
      </div>
      <figcaption>
        <span className="workout-video-label">
          Detailed demo · second exercise under review
        </span>
        <p id="bicycle-kicks-form-cue">
          Alternating long leg extensions · steady braced torso · full exchange
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
