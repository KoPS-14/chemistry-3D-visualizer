import * as THREE from 'three';
import type { ReactionData, AtomData } from '../types/reaction';

export interface InterpolatedAtomState {
  atom: AtomData;
  position: [number, number, number];
  opacity: number;
  scale: number;
  isTransitionState: boolean;
}

export interface InterpolatedBondState {
  id: string;
  startPos: [number, number, number];
  endPos: [number, number, number];
  midpoint: [number, number, number];
  quaternion: THREE.Quaternion;
  length: number;
  opacity: number;
  color: string;
  isTransition: boolean;
  order: string | number;
}

export interface MoleculeLabelState {
  id: string;
  name: string;
  smiles: string;
  formula: string;
  position: [number, number, number];
  opacity: number;
  role: 'reactant' | 'product';
}

export interface ReactionSymbolState {
  id: string;
  type: 'plus' | 'arrow';
  label?: string;
  position: [number, number, number];
  opacity: number;
}

export interface AnimationFrameState {
  progress: number;
  currentStageIndex: number;
  currentStageName: string;
  stageDescription: string;
  reactantAtoms: InterpolatedAtomState[];
  productAtoms: InterpolatedAtomState[];
  animatedBonds: InterpolatedBondState[];
  moleculeLabels: MoleculeLabelState[];
  reactionSymbols: ReactionSymbolState[];
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
 * Layouts reactants and products in textbook equation order (R1 + R2 -> P1 + P2).
 */
export const calculateAnimationFrameState = (
  reaction: ReactionData,
  progress: number
): AnimationFrameState => {
  const clampedProgress = Math.max(0, Math.min(1, progress));

  // Determine stage names
  const stages = reaction.stages || reaction.animation_template?.stages || [
    '1. Initial Reactant Alignment',
    '2. Reactant Approach & Collision',
    '3. Activated Transition State',
    '4. Product Formation & Separation',
  ];

  let currentStageIndex = 0;
  if (clampedProgress > 0.25) currentStageIndex = 1;
  if (clampedProgress > 0.50) currentStageIndex = 2;
  if (clampedProgress > 0.75) currentStageIndex = 3;
  if (currentStageIndex >= stages.length) currentStageIndex = stages.length - 1;

  const isTransitionStateActive = clampedProgress > 0.42 && clampedProgress < 0.72;
  const isSN2 = reaction.reaction_type.toUpperCase().includes('SN2');
  const waldenFlipAngle = isSN2 ? (clampedProgress - 0.5) * Math.PI * 0.8 : 0.0;

  // Reactant & Product Opacities across reaction progress
  const reactantOpacity = clampedProgress < 0.75 ? 1.0 : Math.max(0, 1.0 - (clampedProgress - 0.75) * 4.0);
  const productOpacity = clampedProgress > 0.35 ? Math.min(1.0, (clampedProgress - 0.35) * 3.5) : 0.0;

  // Calculate Base Spatial Offsets for Textbook Layout
  // Reactant 1: -6.5 -> -1.0; Reactant 2: -2.0 -> +0.8
  const r1OffsetX = -6.5 + clampedProgress * 5.5;
  const r2OffsetX = reaction.reactants.length > 1 ? -2.0 + clampedProgress * 2.8 : 0;

  // Product 1: +0.5 -> +5.5; Product 2: +0.5 -> +9.5
  const p1OffsetX = 1.0 + (clampedProgress - 0.35) * 4.5;
  const p2OffsetX = reaction.products.length > 1 ? 2.5 + (clampedProgress - 0.35) * 7.0 : 5.5;

  const bondStretchFactor = isTransitionStateActive ? 1.4 : 1.0;

  const reactantAtoms: InterpolatedAtomState[] = [];
  const productAtoms: InterpolatedAtomState[] = [];
  const animatedBonds: InterpolatedBondState[] = [];
  const moleculeLabels: MoleculeLabelState[] = [];
  const reactionSymbols: ReactionSymbolState[] = [];

  // 1. Process Reactant Molecules & Atoms
  reaction.reactants.forEach((rComp, rIdx) => {
    const baseOffsetX = rIdx === 0 ? r1OffsetX : r2OffsetX;

    if (rComp.molecule_data) {
      const atomPosMap = new Map<number, [number, number, number]>();

      // Atoms
      if (rComp.molecule_data.atoms) {
        rComp.molecule_data.atoms.forEach((atom) => {
          let posX = atom.x * (isTransitionStateActive ? bondStretchFactor : 1.0) + baseOffsetX;
          let posY = atom.y;
          let posZ = atom.z;

          if (isSN2 && atom.element !== 'C' && atom.element !== 'Br' && atom.element !== 'Cl' && atom.element !== 'I') {
            const vec = new THREE.Vector3(atom.x, atom.y, atom.z);
            vec.applyAxisAngle(new THREE.Vector3(0, 1, 0), waldenFlipAngle);
            posX = vec.x * bondStretchFactor + baseOffsetX;
            posY = vec.y;
            posZ = vec.z;
          }

          const pos: [number, number, number] = [posX, posY, posZ];
          atomPosMap.set(atom.index, pos);

          reactantAtoms.push({
            atom,
            position: pos,
            opacity: reactantOpacity,
            scale: isTransitionStateActive && atom.element === 'C' ? 1.15 : 1.0,
            isTransitionState: isTransitionStateActive,
          });
        });
      }

      // Bonds
      if (rComp.molecule_data.bonds) {
        rComp.molecule_data.bonds.forEach((bond, bIdx) => {
          const uStart = bond.start_index ?? bond.from;
          const uEnd = bond.end_index ?? bond.to;

          if (uStart !== undefined && uEnd !== undefined) {
            const posA = atomPosMap.get(uStart);
            const posB = atomPosMap.get(uEnd);

            if (posA && posB) {
              const vecA = new THREE.Vector3(...posA);
              const vecB = new THREE.Vector3(...posB);
              const dir = new THREE.Vector3().subVectors(vecB, vecA);
              const len = dir.length();
              const mid = new THREE.Vector3().addVectors(vecA, vecB).multiplyScalar(0.5);

              const up = new THREE.Vector3(0, 1, 0);
              const quat = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());

              animatedBonds.push({
                id: `r-bond-${rIdx}-${bIdx}`,
                startPos: posA,
                endPos: posB,
                midpoint: [mid.x, mid.y, mid.z],
                quaternion: quat,
                length: len,
                opacity: reactantOpacity,
                color: isTransitionStateActive ? '#f59e0b' : '#94a3b8',
                isTransition: isTransitionStateActive,
                order: bond.order,
              });
            }
          }
        });
      }

      // Molecule Formula & Name Label
      moleculeLabels.push({
        id: `r-label-${rIdx}`,
        name: rComp.name,
        smiles: rComp.smiles,
        formula: rComp.molecule_data.formula || rComp.smiles,
        position: [baseOffsetX, -2.4, 0],
        opacity: reactantOpacity,
        role: 'reactant',
      });
    }
  });

  // Plus symbol between Reactant 1 and Reactant 2
  if (reaction.reactants.length > 1) {
    const midPlusX = (r1OffsetX + r2OffsetX) / 2;
    reactionSymbols.push({
      id: 'r-plus',
      type: 'plus',
      position: [midPlusX, 0, 0],
      opacity: reactantOpacity,
    });
  }

  // Reaction Arrow symbol between Reactants and Products
  const arrowX = (r2OffsetX + p1OffsetX) / 2 + 0.5;
  reactionSymbols.push({
    id: 'rxn-arrow',
    type: 'arrow',
    label: reaction.conditions?.catalyst || reaction.reaction_type,
    position: [arrowX, 0, 0],
    opacity: 1.0,
  });

  // 2. Process Product Molecules & Atoms
  reaction.products.forEach((pComp, pIdx) => {
    const baseOffsetX = pIdx === 0 ? p1OffsetX : p2OffsetX;

    if (pComp.molecule_data) {
      const atomPosMap = new Map<number, [number, number, number]>();

      if (pComp.molecule_data.atoms) {
        pComp.molecule_data.atoms.forEach((atom) => {
          const posX = atom.x + baseOffsetX;
          const posY = atom.y;
          const posZ = atom.z;
          const pos: [number, number, number] = [posX, posY, posZ];

          atomPosMap.set(atom.index, pos);

          productAtoms.push({
            atom,
            position: pos,
            opacity: productOpacity,
            scale: 1.0,
            isTransitionState: isTransitionStateActive,
          });
        });
      }

      if (pComp.molecule_data.bonds) {
        pComp.molecule_data.bonds.forEach((bond, bIdx) => {
          const uStart = bond.start_index ?? bond.from;
          const uEnd = bond.end_index ?? bond.to;

          if (uStart !== undefined && uEnd !== undefined) {
            const posA = atomPosMap.get(uStart);
            const posB = atomPosMap.get(uEnd);

            if (posA && posB) {
              const vecA = new THREE.Vector3(...posA);
              const vecB = new THREE.Vector3(...posB);
              const dir = new THREE.Vector3().subVectors(vecB, vecA);
              const len = dir.length();
              const mid = new THREE.Vector3().addVectors(vecA, vecB).multiplyScalar(0.5);

              const up = new THREE.Vector3(0, 1, 0);
              const quat = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());

              animatedBonds.push({
                id: `p-bond-${pIdx}-${bIdx}`,
                startPos: posA,
                endPos: posB,
                midpoint: [mid.x, mid.y, mid.z],
                quaternion: quat,
                length: len,
                opacity: productOpacity,
                color: '#10b981',
                isTransition: false,
                order: bond.order,
              });
            }
          }
        });
      }

      // Molecule Formula & Name Label
      moleculeLabels.push({
        id: `p-label-${pIdx}`,
        name: pComp.name,
        smiles: pComp.smiles,
        formula: pComp.molecule_data.formula || pComp.smiles,
        position: [baseOffsetX, -2.4, 0],
        opacity: productOpacity,
        role: 'product',
      });
    }
  });

  // Plus symbol between Product 1 and Product 2
  if (reaction.products.length > 1) {
    const midPlusX = (p1OffsetX + p2OffsetX) / 2;
    reactionSymbols.push({
      id: 'p-plus',
      type: 'plus',
      position: [midPlusX, 0, 0],
      opacity: productOpacity,
    });
  }

  // Keyframe Stage Descriptions
  const stageDescriptions = [
    'Initial textbook layout showing reactants, reaction arrow, and products',
    'Reactant molecules collide and align in optimal orbital orientation',
    'High energy transition state with active bond stretching and breaking',
    'Product molecules form stable covalent bonds and separate cleanly',
  ];

  return {
    progress: clampedProgress,
    currentStageIndex,
    currentStageName: stages[currentStageIndex] || 'Reaction Stage',
    stageDescription: stageDescriptions[currentStageIndex] || 'Chemical transformation',
    reactantAtoms,
    productAtoms,
    animatedBonds,
    moleculeLabels,
    reactionSymbols,
    bondStretchFactor,
    isTransitionStateActive,
  };
};
