import * as THREE from 'three';
import type { ElementData } from '../types/reaction';

export interface ElectronPositionInfo {
  shellIndex: number;
  electronIndex: number;
  position: [number, number, number];
  shellRadius: number;
}

export interface ShellRingInfo {
  shellIndex: number;
  radius: number;
  electronCount: number;
}

/**
 * Calculates 3D geometry information for an educational atomic model (Nucleus, Shell Rings, Electrons).
 */
export const calculateAtomStructure = (element: ElementData) => {
  const shells = element.shells && element.shells.length > 0 ? element.shells : [element.atomic_number];
  
  // Base shell radii spacing
  const baseRadiusStep = 1.2;
  const innerRadius = 1.6;

  const shellRings: ShellRingInfo[] = [];
  const electronPositions: ElectronPositionInfo[] = [];

  shells.forEach((count, sIdx) => {
    const radius = innerRadius + sIdx * baseRadiusStep;
    shellRings.push({
      shellIndex: sIdx,
      radius,
      electronCount: count,
    });

    // Place electrons uniformly along concentric 3D shell rings
    // Tilt alternate shell planes slightly for dynamic 3D visual aesthetic
    const tiltAngleX = (sIdx % 2 === 1 ? 0.35 : -0.2) * (sIdx + 1);
    const tiltAngleZ = (sIdx % 3 === 2 ? 0.4 : 0.0);

    for (let eIdx = 0; eIdx < count; eIdx++) {
      const angle = (2 * Math.PI * eIdx) / count;

      // Base circle in XY plane
      const vec = new THREE.Vector3(
        radius * Math.cos(angle),
        radius * Math.sin(angle),
        0
      );

      // Apply tilt rotations
      vec.applyAxisAngle(new THREE.Vector3(1, 0, 0), tiltAngleX);
      vec.applyAxisAngle(new THREE.Vector3(0, 0, 1), tiltAngleZ);

      electronPositions.push({
        shellIndex: sIdx,
        electronIndex: eIdx,
        position: [vec.x, vec.y, vec.z],
        shellRadius: radius,
      });
    }
  });

  return {
    shellRings,
    electronPositions,
    totalElectrons: element.atomic_number,
  };
};
