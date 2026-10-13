import { useEffect, useRef, useState } from "react";
import { detailedWorkoutDemoAssets } from "../lib/workoutDemoCatalog";

const { singleLegCrunchVideo, singleLegCrunchStill } = detailedWorkoutDemoAssets;
const VISIBLE_START_SECONDS = 0.5;


type SingleLegCrunchMotionDemoProps = {
  paused: boolean;
  onTogglePause: () => void;
  onReplay: () => void;
};

export function SingleLegCrunchMotionDemo({
  paused,
  onTogglePause,
  onReplay,
}: SingleLegCrunchMotionDemoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [showStill, setShowStill] = useState(true);
  const [videoFailed, setVideoFailed] = useState(false);

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

    const startFromVisibleFrame = () => {
      if (video.currentTime < 0.25) {
        video.currentTime = VISIBLE_START_SECONDS;
      }
      if (!paused && !prefersReducedMotion) {
        void video.play().catch(() => undefined);
      }
    };

    if (paused || prefersReducedMotion) {
      video.pause();
    } else if (video.readyState >= 1) {
      startFromVisibleFrame();
    }

    video.addEventListener("loadedmetadata", startFromVisibleFrame);
    return () =>
      video.removeEventListener("loadedmetadata", startFromVisibleFrame);
  }, [paused, prefersReducedMotion]);

  const replay = () => {
    const video = videoRef.current;
    if (!video || prefersReducedMotion) return;
    video.currentTime = VISIBLE_START_SECONDS;
    onReplay();
    void video.play().catch(() => undefined);
  };

  const status = videoFailed
    ? "Video demonstration unavailable — showing the start position instead."
    : prefersReducedMotion
      ? "Reduced motion is on — the extended-leg start position is shown."
      : paused
        ? "Demonstration paused."
        : "Demonstration playing. Silent — no audio track.";

  return (
    <figure
      className="workout-video-demo single-leg-crunch-demo"
      aria-label="Single-Leg Crunch demonstration"
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
          poster={singleLegCrunchStill}
          aria-describedby="single-leg-crunch-form-cue"
          onPlaying={() => setShowStill(false)}
          onError={() => {
            setVideoFailed(true);
            setShowStill(true);
          }}
          data-playing={showStill ? "false" : "true"}
        >
          <source src={singleLegCrunchVideo} type="video/mp4" />
        </video>
        <img
          className={`workout-video-still${showStill ? "" : " is-hidden"}`}
          src={singleLegCrunchStill}
          alt="Single-Leg Crunch start position: lying on the back with both legs extended before one knee draws toward the chest during the crunch."
        />
      </div>
      <figcaption>
        <span className="workout-video-label">
          Detailed demo
        </span>
        <p id="single-leg-crunch-form-cue">
          One knee draws in · reach toward the raised foot · controlled return
        </p>
        <p className="workout-video-status" aria-live="polite">
          {status}
        </p>
        {!prefersReducedMotion && !videoFailed && (
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
