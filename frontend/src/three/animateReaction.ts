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

export interface ElectronFlowArcState {
  active: boolean;
  startPos: [number, number, number];
  controlPos: [number, number, number];
  endPos: [number, number, number];
  progress: number;
  label: string;
  opacity: number;
}

export interface TransitionAnnotationState {
  title: string;
  subtitle: string;
  breakingBondText: string;
  formingBondText: string;
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
  electronArc: ElectronFlowArcState | null;
  transitionAnnotation: TransitionAnnotationState | null;
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
 * Enforces strict phase separation: Reactants -> Collision -> Pure Transition State -> Products.
 */
export const calculateAnimationFrameState = (
  reaction: ReactionData,
  progress: number
): AnimationFrameState => {
  const clampedProgress = Math.max(0, Math.min(1, progress));

  // 4 Strict Stages with Prolonged Transition State (Stage 3)
  const stages = reaction.stages || reaction.animation_template?.stages || [
    '1. Initial Reactant Alignment',
    '2. Reactant Approach & Collision',
    '3. Pure Activated Transition State',
    '4. Product Formation & Separation',
  ];

  let currentStageIndex = 0;
  if (clampedProgress > 0.20) currentStageIndex = 1;
  if (clampedProgress > 0.40) currentStageIndex = 2; // Pure Transition phase holds from 0.40 to 0.75!
  if (clampedProgress > 0.75) currentStageIndex = 3; // Products only appear AFTER 0.75!
  if (currentStageIndex >= stages.length) currentStageIndex = stages.length - 1;

  // Prolonged Transition State Window
  const isTransitionStateActive = clampedProgress >= 0.38 && clampedProgress <= 0.75;
  const isSN2 = reaction.reaction_type.toUpperCase().includes('SN2');
  const waldenFlipAngle = isSN2 ? (clampedProgress - 0.4) * Math.PI * 0.9 : 0.0;

  // Strict Phase Opacities:
  // Reactants stay 100% visible throughout Stages 1, 2, and 3 (0.0 to 0.75).
  const reactantOpacity = clampedProgress <= 0.75 ? 1.0 : Math.max(0, 1.0 - (clampedProgress - 0.75) * 4.0);

  // Products are STRICTLY 0.0 (0% opacity) during Stages 1, 2, and 3 (0.0 to 0.75)!
  // Products ONLY appear AFTER Transition State completes (clampedProgress > 0.75)!
  const productOpacity = clampedProgress > 0.75 ? Math.min(1.0, (clampedProgress - 0.75) * 4.0) : 0.0;

  // Plus and Arrow Equation Symbols Opacity (Fades out smoothly when reaction starts!)
  const symbolOpacity = clampedProgress < 0.18 ? 1.0 : Math.max(0, 1.0 - (clampedProgress - 0.18) * 5.0);
  const productPlusOpacity = clampedProgress > 0.75 ? Math.min(1.0, (clampedProgress - 0.75) * 4.0) : 0.0;

  // Spatial Offsets:
  // Reactant 1: -7.5 -> -1.0; Reactant 2: -1.2 -> +0.8
  const r1OffsetX = -7.5 + clampedProgress * 6.5;
  const r2OffsetX = reaction.reactants.length > 1 ? -1.2 + clampedProgress * 2.0 : 0;

  // Product 1: +1.0 -> +5.5; Product 2: +2.5 -> +12.0 (Only moves when products appear after 0.75!)
  const pProg = Math.max(0, clampedProgress - 0.75) * 4.0;
  const p1OffsetX = 1.0 + pProg * 4.5;
  const p2OffsetX = reaction.products.length > 1 ? 2.5 + pProg * 9.5 : 5.5;

  const bondStretchFactor = isTransitionStateActive ? 1.45 : 1.0;

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

      // Molecule Formula & Name Label (positioned in bottom label row at y = -3.2)
      moleculeLabels.push({
        id: `r-label-${rIdx}`,
        name: rComp.name,
        smiles: rComp.smiles,
        formula: rComp.molecule_data.formula || rComp.smiles,
        position: [baseOffsetX, -3.2, 0],
        opacity: reactantOpacity,
        role: 'reactant',
      });
    }
  });

  // Plus symbol inline with bottom label row between Reactant 1 and Reactant 2
  if (reaction.reactants.length > 1) {
    const midPlusX = -4.3;
    reactionSymbols.push({
      id: 'r-plus',
      type: 'plus',
      position: [midPlusX, -3.2, 0],
      opacity: symbolOpacity,
    });
  }

  // Reaction Arrow symbol inline with bottom label row between Reactants and Products
  const arrowX = 2.2;
  reactionSymbols.push({
    id: 'rxn-arrow',
    type: 'arrow',
    label: reaction.conditions?.catalyst || reaction.reaction_type,
    position: [arrowX, -3.2, 0],
    opacity: symbolOpacity,
  });

  // 2. Process Product Molecules & Atoms (STRICTLY AFTER TRANSITION STATE)
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

      // Molecule Formula & Name Label (Product labels appear AFTER 0.75!)
      moleculeLabels.push({
        id: `p-label-${pIdx}`,
        name: pComp.name,
        smiles: pComp.smiles,
        formula: pComp.molecule_data.formula || pComp.smiles,
        position: [baseOffsetX, -3.2, 0],
        opacity: productOpacity,
        role: 'product',
      });
    }
  });

  // Plus symbol between Product 1 and Product 2
  if (reaction.products.length > 1) {
    const midPlusX = 8.8;
    reactionSymbols.push({
      id: 'p-plus',
      type: 'plus',
      position: [midPlusX, -3.2, 0],
      opacity: productPlusOpacity,
    });
  }

  // 3. Calculate Electron Flow Curved Arc Mechanism
  let electronArc: ElectronFlowArcState | null = null;
  if (clampedProgress >= 0.20 && clampedProgress <= 0.72) {
    const arcProgress = (clampedProgress - 0.20) / 0.52;
    const startPos: [number, number, number] = [r2OffsetX, 0.8, 0];
    const controlPos: [number, number, number] = [(r1OffsetX + r2OffsetX) / 2, 2.2, 0];
    const endPos: [number, number, number] = [r1OffsetX, 0.2, 0];
    const arcOpacity = Math.sin(arcProgress * Math.PI);

    electronArc = {
      active: true,
      startPos,
      controlPos,
      endPos,
      progress: arcProgress,
      label: 'Nucleophilic Electron Pair Attack (e⁻ pair)',
      opacity: arcOpacity,
    };
  }

  // 4. Transition State Explicit Element Mix Annotations
  let transitionAnnotation: TransitionAnnotationState | null = null;
  if (isTransitionStateActive) {
    const r1Name = reaction.reactants[0]?.name || 'Substrate';
    const r2Name = reaction.reactants[1]?.name || 'Attacking Species';

    transitionAnnotation = {
      title: `⚡ Pure Activated Transition State (${reaction.reaction_type})`,
      subtitle: `${r2Name} attacks ${r1Name} at central Carbon atom`,
      breakingBondText: '🟠 C⋯Leaving Group Bond Stretching & Cleavage',
      formingBondText: '🔵 Nucleophile⋯C Bond Formation (e⁻ pair attack)',
      opacity: Math.sin(((clampedProgress - 0.38) / 0.37) * Math.PI),
    };
  }

  const stageDescriptions = [
    'Initial textbook layout showing reactants, reaction arrow, and products',
    'Reactant molecules collide with curved electron pair attack flow',
    'Pure activated transition state: Products strictly hidden until mechanism completes',
    'Transition state completes: Product molecules form and separate into final positions',
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
    electronArc,
    transitionAnnotation,
    bondStretchFactor,
    isTransitionStateActive,
  };
};
