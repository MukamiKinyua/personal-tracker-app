# Basic Crunches SVG proof validation findings

The live Workout Studio page rendered the new SVG proof in the detailed Basic Crunches card while all later routine cards remained simplified previews.

The browser found the `.basic-crunches-svg` element and its `.svg-crunch-lift` group. Computed styles reported `animationName: basic-crunch-svg-lift`, `animationPlayState: running`, and a non-identity transform matrix while the page was playing. The detailed control buttons were exposed as `Pause` with `aria-pressed: false` and `Replay`.

The desktop and phone full-page captures showed the SVG proof inside the established dark-plum detailed card, with the enlarged character, lilac mat, warm off-white field, form cue, status, and controls. The later cards remained unchanged.

The proof’s animation is implemented with a pivoted SVG group around the pelvis. The lower-body group is outside the animated group, so the tabletop legs remain visually fixed while the torso group rotates through the controlled curl keyframes. Reduced motion disables the animation and exposes the still start pose through component state and the CSS media query.

This is an internal validation record only; user approval of the SVG proof has not yet been requested or received.


After clicking the detailed proof’s Pause button, the live page reported `Demonstration paused.` The button changed to `Play` with `aria-pressed: true`; the SVG class became `basic-crunches-svg is-paused`; and computed `animationPlayState` became `paused`. This confirms the SVG motion is frozen by CSS animation state, not merely relabeled.

The proof remains pending user approval; Replay and reduced-motion checks are still to be completed before checkpoint delivery.


After Replay was clicked from the paused state, the live page returned to `Demonstration playing.` The control returned to `Pause` with `aria-pressed: false`; the SVG no longer carried `is-paused`; and computed `animationPlayState` returned to `running`. The SVG group reported a non-identity transform, confirming the restarted motion is active.


After restoring the approved renderer, the live DOM contained `.basic-crunches-video` with poster `/media/runtime/basic-crunches-tabletop-start_103aa399.png` and source `/media/runtime/basic-crunches-live-loop_09d26f2a.mp4`. The video reported `readyState: 4`, the status was `Demonstration playing.`, and `.basic-crunches-svg` was absent. Desktop and phone captures showed the restored video card and original custom controls.

The rejected SVG component was removed from the active implementation and its SVG-only stylesheet block was removed. The approved video asset and its pause/replay implementation remain active.
