/*
 * Typed mirror of motion/layout tokens for the rare cases JS needs them
 * (e.g. timing a View Transition). Color/spacing/type live in tokens.css and
 * should be consumed via CSS custom properties, not from here.
 */

export const motion = {
  durFast: 120,
  durBase: 200,
  durSlow: 320,
  ease: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
} as const;

export const layout = {
  tapMin: 44,
  tabbarH: 56,
  contentMax: 560,
} as const;

/** True when the user asked the OS to reduce motion. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}
