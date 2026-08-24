import * as THREE from 'three';
import type { ReactionData, ReactionKeyframe, AtomData } from '../types/reaction';

export interface InterpolatedAtomState {
  atom: AtomData;
  position: [number, number, number];
  opacity: number;
  scale: number;
  isTransitionState: boolean;
}

export interface AnimationFrameState {
  progress: number;
  currentStageIndex: number;
  currentStageName: string;
  stageDescription: string;
  reactantAtoms: InterpolatedAtomState[];
  productAtoms: InterpolatedAtomState[];
  bondStretchFactor: number;
  isTransitionStateActive: boolean;
}

/**
 * Linearly interpolates between two 3D vectors
 */
export const lerpVector3 = (
  start: [number, number, number],
  end: [number, number, number],
  t: number
): [number, number, number] => {
  const clampT = Math.max(0, Math.min(1, t));
  return [
    start[0] + (end[0] - start[0]) * clampT,
    start[1] + (end[1] - start[1]) * clampT,
    start[2] + (end[2] - start[2]) * clampT,
  ];
};

/**
 * Calculates current keyframe interpolation parameters based on timeline progress (0.0 to 1.0)
 */
export const calculateAnimationFrameState = (
  reaction: ReactionData,
  progress: number
): AnimationFrameState => {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const keyframes: ReactionKeyframe[] = reaction.animation_template?.keyframes || [
    {
      progress: 0.0,
      stage_name: 'Reactant Approach',
      description: 'Reactants approach to collision distance',
      reactant_offset: [-3, 0, 0],
      product_offset: [3, 0, 0],
      bond_stretch: 1.0,
      transition_state_active: false,
    },
    {
      progress: 0.5,
      stage_name: 'Transition State',
      description: 'High energy transition state with activated complex',
      reactant_offset: [-0.5, 0, 0],
      product_offset: [0.5, 0, 0],
      bond_stretch: 1.4,
      transition_state_active: true,
    },
    {
      progress: 1.0,
      stage_name: 'Product Formation',
      description: 'Products separate into stable states',
      reactant_offset: [0, 0, 0],
      product_offset: [4, 0, 0],
      bond_stretch: 1.0,
      transition_state_active: false,
    },
  ];

  // Find bounding keyframes for current progress
  let kPrev = keyframes[0];
  let kNext = keyframes[keyframes.length - 1];

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (clampedProgress >= keyframes[i].progress && clampedProgress <= keyframes[i + 1].progress) {
      kPrev = keyframes[i];
      kNext = keyframes[i + 1];
      break;
    }
  }

  const range = kNext.progress - kPrev.progress || 1.0;
  const localT = (clampedProgress - kPrev.progress) / range;

  // Smooth step / cubic easing for fluid molecular animation
  const easedT = localT * localT * (3 - 2 * localT);

  const reactantOffset = lerpVector3(kPrev.reactant_offset, kNext.reactant_offset, easedT);
  const productOffset = lerpVector3(kPrev.product_offset, kNext.product_offset, easedT);

  const bondStretchFactor = kPrev.bond_stretch + (kNext.bond_stretch - kPrev.bond_stretch) * easedT;
  const isTransitionStateActive = clampedProgress > 0.35 && clampedProgress < 0.75;

  // Reactant fade out in phase 2 (0.5 to 1.0), Product fade in (0.0 to 0.5 -> 1.0)
  const reactantOpacity = clampedProgress < 0.6 ? 1.0 : Math.max(0, 1.0 - (clampedProgress - 0.6) * 2.2);
  const productOpacity = clampedProgress > 0.4 ? Math.min(1.0, (clampedProgress - 0.4) * 2.2) : 0.0;

  // Calculate stage index and name
  const stages = reaction.stages || reaction.animation_template?.stages || ['Reactants', 'Transition State', 'Products'];
  let currentStageIndex = 0;
  if (clampedProgress > 0.33) currentStageIndex = 1;
  if (clampedProgress > 0.66) currentStageIndex = 2;
  if (currentStageIndex >= stages.length) currentStageIndex = stages.length - 1;

  // Walden inversion umbrella flip angle calculation for SN2 reactions
  const isSN2 = reaction.reaction_type.toUpperCase().includes('SN2');
  const waldenFlipAngle = isSN2 ? (clampedProgress - 0.5) * Math.PI * 0.8 : 0.0;

  // Interpolate Reactant Atoms
  const reactantAtoms: InterpolatedAtomState[] = [];
  reaction.reactants.forEach((rComp) => {
    if (rComp.molecule_data?.atoms) {
      rComp.molecule_data.atoms.forEach((atom) => {
        let posX = atom.x * bondStretchFactor + reactantOffset[0];
        let posY = atom.y + reactantOffset[1];
        let posZ = atom.z + reactantOffset[2];

        // Apply Walden inversion flip on non-carbon hydrogens during transition
        if (isSN2 && atom.element !== 'C' && atom.element !== 'Br' && atom.element !== 'Cl' && atom.element !== 'I') {
          const vec = new THREE.Vector3(atom.x, atom.y, atom.z);
          vec.applyAxisAngle(new THREE.Vector3(0, 1, 0), waldenFlipAngle);
          posX = vec.x * bondStretchFactor + reactantOffset[0];
          posY = vec.y + reactantOffset[1];
          posZ = vec.z + reactantOffset[2];
        }

        reactantAtoms.push({
          atom,
          position: [posX, posY, posZ],
          opacity: reactantOpacity,
          scale: isTransitionStateActive && atom.element === 'C' ? 1.15 : 1.0,
          isTransitionState: isTransitionStateActive,
        });
      });
    }
  });

  // Interpolate Product Atoms
  const productAtoms: InterpolatedAtomState[] = [];
  reaction.products.forEach((pComp) => {
    if (pComp.molecule_data?.atoms) {
      pComp.molecule_data.atoms.forEach((atom) => {
        const posX = atom.x + productOffset[0];
        const posY = atom.y + productOffset[1];
        const posZ = atom.z + productOffset[2];

        productAtoms.push({
          atom,
          position: [posX, posY, posZ],
          opacity: productOpacity,
          scale: 1.0,
          isTransitionState: isTransitionStateActive,
        });
      });
    }
  });

  return {
    progress: clampedProgress,
    currentStageIndex,
    currentStageName: stages[currentStageIndex] || kPrev.stage_name,
    stageDescription: kPrev.description,
    reactantAtoms,
    productAtoms,
    bondStretchFactor,
    isTransitionStateActive,
  };
};
