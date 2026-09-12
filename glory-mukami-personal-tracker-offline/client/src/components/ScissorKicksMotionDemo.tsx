import { useEffect, useRef, useState } from "react";
import { detailedWorkoutDemoAssets } from "../lib/workoutDemoCatalog";

const { scissorKicksVideo, scissorKicksStill } = detailedWorkoutDemoAssets;
const VISIBLE_START_SECONDS = 0.5;

type ScissorKicksMotionDemoProps = {
  paused: boolean;
  onTogglePause: () => void;
  onReplay: () => void;
};

export function ScissorKicksMotionDemo({
  paused,
  onTogglePause,
  onReplay,
}: ScissorKicksMotionDemoProps) {
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
    ? "Video demonstration unavailable — showing the scissor position instead."
    : prefersReducedMotion
      ? "Reduced motion is on — the low-hover scissor position is shown."
      : paused
        ? "Demonstration paused."
        : "Demonstration playing. Silent — no audio track.";

  return (
    <figure
      className="workout-video-demo scissor-kicks-demo"
      aria-label="Scissor Kicks demonstration"
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
          poster={scissorKicksStill}
          aria-describedby="scissor-kicks-form-cue"
          onPlaying={() => setShowStill(false)}
          onError={() => {
            setVideoFailed(true);
            setShowStill(true);
          }}
          data-playing={showStill ? "false" : "true"}
        >
          <source src={scissorKicksVideo} type="video/mp4" />
        </video>
        <img
          className={`workout-video-still${showStill ? "" : " is-hidden"}`}
          src={scissorKicksStill}
          alt="Scissor Kicks position: upper body supported on the forearms, with straight legs lifted low and alternating in a criss-cross motion."
        />
      </div>
      <figcaption>
        <span className="workout-video-label">
          Detailed demo · eighth exercise under review
        </span>
        <p id="scissor-kicks-form-cue">
          Straight legs low · alternate up and down · controlled criss-cross
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
