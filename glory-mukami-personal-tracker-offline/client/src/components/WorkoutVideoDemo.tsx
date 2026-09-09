import { useEffect, useRef, useState } from "react";

interface WorkoutVideoDemoProps {
  label: string;
  videoUrl: string;
  posterUrl: string;
  alt: string;
  formCue: string;
  className?: string;
  paused: boolean;
  onTogglePause: () => void;
  onReplay: () => void;
}

export function WorkoutVideoDemo({
  label,
  videoUrl,
  posterUrl,
  alt,
  formCue,
  className,
  paused,
  onTogglePause,
  onReplay,
}: WorkoutVideoDemoProps) {
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
    ? "Reduced motion is on — the instructional still is shown."
    : paused
      ? "Demonstration paused."
      : "Demonstration playing.";

  return (
    <figure
      className={`workout-video-demo${className ? ` ${className}` : ""}`}
      aria-label={`${label} detailed character demonstration`}
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
          poster={posterUrl}
          aria-describedby={`${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-form-cue`}
        >
          <source src={videoUrl} type="video/mp4" />
        </video>
        <img className="workout-video-still" src={posterUrl} alt={alt} />
      </div>
      <figcaption>
        <span className="workout-video-label">Detailed demo · supplied reference</span>
        <p id={`${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-form-cue`}>
          {formCue}
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
