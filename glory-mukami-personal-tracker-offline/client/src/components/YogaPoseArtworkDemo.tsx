type YogaPoseArtworkDemoProps = {
  className: string;
  label: string;
  imageUrl: string;
  alt: string;
  formCue: string;
};

export function YogaPoseArtworkDemo({
  className,
  label,
  imageUrl,
  alt,
  formCue,
}: YogaPoseArtworkDemoProps) {
  return (
    <figure
      className={`yoga-artwork-demo ${className}`}
      aria-label={`${label} artwork demonstration`}
    >
      <div className="yoga-artwork-media">
        <img src={imageUrl} alt={alt} loading="eager" />
      </div>
      <figcaption>
        <span className="workout-video-label">Detailed pose reference</span>
        <p>{formCue}</p>
        <p className="workout-video-status">
          Still artwork reference — move into the pose without forcing range.
        </p>
      </figcaption>
    </figure>
  );
}
