/**
 * animateReaction.ts
 * 
 * Stub file for future procedural 3D reaction animation.
 * Will implement timing, interpolation, bond breaking, and bond formation.
 */

export interface ReactionAnimationState {
  isPlaying: boolean;
  progress: number;
  speed: number;
}

export const initialAnimationState: ReactionAnimationState = {
  isPlaying: false,
  progress: 0,
  speed: 1,
};
