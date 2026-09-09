# Basic Crunches video quality comparison

## Conclusion

The user’s observation is correct: the newly supplied clip is materially lower quality than the retained approved initial video. The difference is primarily caused by the supplied file’s extremely small video dimensions and much lower video bitrate, not by the Workout Studio card scaling.

| Property | Supplied clip | Approved initial video |
|---|---:|---:|
| Video dimensions | 230 × 126 | 1280 × 720 |
| Approximate pixel count | 28,980 | 921,600 |
| Pixel-count difference | — | approximately 31.8× more pixels |
| Video codec | H.264 | H.264 |
| Pixel format | yuv420p | yuv420p |
| Frame rate | 30 fps | 24 fps |
| Video bitrate | 130,368 bit/s | 1,779,030 bit/s |
| Bitrate difference | — | approximately 13.6× higher |
| Duration | 3.033333 s | 4.010000 s |
| Audio | AAC, approximately 192,001 bit/s | AAC, approximately 128,001 bit/s |
| File size | 124,677 bytes | 966,270 bytes |

The supplied clip is only about 5.6× as wide and 5.7× as tall as the approved initial video, leaving it with about 31.8× fewer image pixels. Enlarging it inside the Workout Studio card will therefore reveal blur and blockiness. Re-encoding or CSS sharpening cannot recreate the missing detail.

## Active implementation decision

The approved initial video remains the active Basic Crunches demonstration. The supplied low-resolution clip has not replaced it and should not be used as the production asset. No other exercise has been started.

## Verification status

The active DOM was previously verified to contain the approved initial MP4 and poster, with no SVG proof element. The retained video was rechecked at desktop and phone sizes, and TypeScript plus the full Vitest suite passed after the restoration.
