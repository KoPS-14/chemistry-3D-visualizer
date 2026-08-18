import * as THREE from 'three';
import type { AtomData, BondData } from '../types/reaction';

export interface CylinderBondMeshInfo {
  position: [number, number, number];
  rotation: [number, number, number];
  length: number;
  radius: number;
}

/**
 * Calculates cylinder transforms for rendering bonds between two 3D atom points.
 * Supports SINGLE, DOUBLE, and TRIPLE bonds with parallel cylinder offset vectors.
 */
export const calculateBondTransforms = (
  atomA: AtomData,
  atomB: AtomData,
  bond: BondData,
  baseRadius: number = 0.1
): CylinderBondMeshInfo[] => {
  const start = new THREE.Vector3(atomA.x, atomA.y, atomA.z);
  const end = new THREE.Vector3(atomB.x, atomB.y, atomB.z);
  
  const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();

  if (length < 0.001) return [];

  // Create rotation quaternion from default upright Cylinder vector (0, 1, 0) to direction vector
  const dirNormalized = direction.clone().normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dirNormalized);
  const euler = new THREE.Euler().setFromQuaternion(quaternion);
  const rotation: [number, number, number] = [euler.x, euler.y, euler.z];

  // Determine bond multiplicity
  let count = 1;
  const orderVal = String(bond.order).toUpperCase();
  if (orderVal === 'DOUBLE' || orderVal === '2' || orderVal === '2.0') {
    count = 2;
  } else if (orderVal === 'TRIPLE' || orderVal === '3' || orderVal === '3.0') {
    count = 3;
  }

  if (count === 1) {
    return [
      {
        position: [midPoint.x, midPoint.y, midPoint.z],
        rotation,
        length,
        radius: baseRadius,
      },
    ];
  }

  // Calculate perpendicular vector for offset cylinders
  let perp = new THREE.Vector3(0, 1, 0).cross(dirNormalized);
  if (perp.lengthSq() < 0.01) {
    perp = new THREE.Vector3(1, 0, 0).cross(dirNormalized);
  }
  perp.normalize();

  const offsetDistance = baseRadius * 1.5;
  const radiusMultiplier = count === 2 ? 0.75 : 0.65;

  if (count === 2) {
    const p1 = midPoint.clone().addScaledVector(perp, offsetDistance * 0.7);
    const p2 = midPoint.clone().addScaledVector(perp, -offsetDistance * 0.7);

    return [
      {
        position: [p1.x, p1.y, p1.z],
        rotation,
        length,
        radius: baseRadius * radiusMultiplier,
      },
      {
        position: [p2.x, p2.y, p2.z],
        rotation,
        length,
        radius: baseRadius * radiusMultiplier,
      },
    ];
  }

  // Triple bond: center cylinder + 2 outer cylinders
  const p1 = midPoint.clone().addScaledVector(perp, offsetDistance);
  const p2 = midPoint.clone().addScaledVector(perp, -offsetDistance);

  return [
    {
      position: [midPoint.x, midPoint.y, midPoint.z],
      rotation,
      length,
      radius: baseRadius * radiusMultiplier,
    },
    {
      position: [p1.x, p1.y, p1.z],
      rotation,
      length,
      radius: baseRadius * radiusMultiplier,
    },
    {
      position: [p2.x, p2.y, p2.z],
      rotation,
      length,
      radius: baseRadius * radiusMultiplier,
    },
  ];
};

/**
 * Calculates centroid of a set of 3D atoms for centering in Three.js scene.
 */
export const calculateCentroid = (atoms: AtomData[]): [number, number, number] => {
  if (!atoms || atoms.length === 0) return [0, 0, 0];
  let sumX = 0, sumY = 0, sumZ = 0;
  for (const atom of atoms) {
    sumX += atom.x;
    sumY += atom.y;
    sumZ += atom.z;
  }
  const len = atoms.length;
  return [sumX / len, sumY / len, sumZ / len];
};

/**
 * Calculates bounding box radius around centroid to position Three.js camera.
 */
export const calculateBoundingRadius = (atoms: AtomData[], centroid: [number, number, number]): number => {
  if (!atoms || atoms.length === 0) return 5;
  let maxDistSq = 0;
  const [cx, cy, cz] = centroid;
  for (const atom of atoms) {
    const dx = atom.x - cx;
    const dy = atom.y - cy;
    const dz = atom.z - cz;
    const distSq = dx * dx + dy * dy + dz * dz;
    if (distSq > maxDistSq) {
      maxDistSq = distSq;
    }
  }
  return Math.max(Math.sqrt(maxDistSq), 1.5);
};
