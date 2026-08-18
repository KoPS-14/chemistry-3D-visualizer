import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { MoleculeData, AtomData } from '../types/reaction';
import { getElementConfig } from '../three/scene';
import {
  calculateBondTransforms,
  calculateCentroid,
  calculateBoundingRadius,
} from '../three/renderMolecule';
import type { CylinderBondMeshInfo } from '../three/renderMolecule';

interface MoleculeViewerProps {
  molecule: MoleculeData | null;
  wireframe?: boolean;
}

const MoleculeScene: React.FC<{
  molecule: MoleculeData;
  wireframe?: boolean;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}> = ({ molecule, wireframe = false, controlsRef }) => {
  const [hoveredAtom, setHoveredAtom] = useState<AtomData | null>(null);

  // Compute centroid to center molecule in scene
  const centroid = useMemo(() => calculateCentroid(molecule.atoms), [molecule]);
  const boundRadius = useMemo(() => calculateBoundingRadius(molecule.atoms, centroid), [molecule, centroid]);

  // Centered atom coordinates
  const centeredAtoms = useMemo(() => {
    const [cx, cy, cz] = centroid;
    return molecule.atoms.map((atom) => ({
      ...atom,
      x: atom.x - cx,
      y: atom.y - cy,
      z: atom.z - cz,
    }));
  }, [molecule.atoms, centroid]);

  // Map of atom index to centered atom
  const atomMap = useMemo(() => {
    const map = new Map<number, AtomData>();
    centeredAtoms.forEach((atom) => map.set(atom.index, atom));
    return map;
  }, [centeredAtoms]);

  // Calculate cylinder meshes for all bonds
  const bondMeshes = useMemo(() => {
    const meshes: { key: string; info: CylinderBondMeshInfo }[] = [];
    molecule.bonds.forEach((bond, bIdx) => {
      const fromIdx = bond.from !== undefined ? bond.from : bond.start_index;
      const toIdx = bond.to !== undefined ? bond.to : bond.end_index;
      if (fromIdx === undefined || toIdx === undefined) return;

      const atomA = atomMap.get(fromIdx);
      const atomB = atomMap.get(toIdx);
      if (!atomA || !atomB) return;

      const transforms = calculateBondTransforms(atomA, atomB, bond, 0.1);
      transforms.forEach((info, subIdx) => {
        meshes.push({
          key: `bond-${bIdx}-${subIdx}`,
          info,
        });
      });
    });
    return meshes;
  }, [molecule.bonds, atomMap]);

  // Adjust OrbitControls distance when molecule changes
  useEffect(() => {
    if (controlsRef.current) {
      const targetDist = boundRadius * 3.2;
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.object.position.set(0, boundRadius * 0.5, Math.max(targetDist, 6));
      controlsRef.current.update();
    }
  }, [boundRadius, controlsRef]);

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 15, 10]} intensity={1.2} castShadow />
      <directionalLight position={[-10, -10, -10]} intensity={0.5} />
      <pointLight position={[0, 5, 0]} intensity={0.6} />

      <group>
        {/* Render Atoms */}
        {centeredAtoms.map((atom) => {
          const symbol = atom.element || atom.symbol || 'C';
          const config = getElementConfig(symbol, atom.cpk_color);
          const isHovered = hoveredAtom?.index === atom.index;

          return (
            <mesh
              key={`atom-${atom.index}`}
              position={[atom.x, atom.y, atom.z]}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredAtom(atom);
              }}
              onPointerOut={() => setHoveredAtom(null)}
            >
              <sphereGeometry args={[config.radius, 32, 32]} />
              <meshStandardMaterial
                color={config.color}
                roughness={0.25}
                metalness={0.1}
                wireframe={wireframe}
                emissive={isHovered ? '#444444' : '#000000'}
              />
              {isHovered && (
                <Html distanceFactor={10} position={[0, config.radius + 0.3, 0]}>
                  <div className="bg-slate-900/90 text-white text-xs px-2 py-1 rounded shadow-lg border border-slate-700 whitespace-nowrap pointer-events-none">
                    <span className="font-bold">{config.name} ({symbol})</span>
                    <span className="text-slate-400 ml-1">#{atom.index}</span>
                  </div>
                </Html>
              )}
            </mesh>
          );
        })}

        {/* Render Bonds */}
        {bondMeshes.map(({ key, info }) => (
          <mesh key={key} position={info.position} rotation={info.rotation}>
            <cylinderGeometry args={[info.radius, info.radius, info.length, 16]} />
            <meshStandardMaterial
              color="#A0A0A0"
              roughness={0.3}
              metalness={0.2}
              wireframe={wireframe}
            />
          </mesh>
        ))}
      </group>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.8}
        zoomSpeed={1.0}
        panSpeed={0.8}
      />
    </>
  );
};

export const MoleculeViewer: React.FC<MoleculeViewerProps> = ({ molecule, wireframe = false }) => {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const handleResetCamera = () => {
    if (controlsRef.current && molecule) {
      const centroid = calculateCentroid(molecule.atoms);
      const boundRadius = calculateBoundingRadius(molecule.atoms, centroid);
      const targetDist = boundRadius * 3.2;
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.object.position.set(0, boundRadius * 0.5, Math.max(targetDist, 6));
      controlsRef.current.update();
    }
  };

  if (!molecule || !molecule.atoms || molecule.atoms.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 p-6 rounded-xl border border-slate-800">
        <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-cyan-400">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L5.6 15.12a2 2 0 00-1.144.174l-.946.542a2 2 0 00-.77 2.65l.77 1.332a2 2 0 002.65.77l.946-.542a2 2 0 011.144-.174l2.387.477a6 6 0 003.86-.517l.318-.158a6 6 0 013.86-.517l2.387.477a2 2 0 001.022-.547l.946-.542a2 2 0 00.77-2.65l-.77-1.332a2 2 0 00-2.65-.77l-.946.542z" />
          </svg>
        </div>
        <p className="text-lg font-medium text-slate-300">3D Interactive Molecule Canvas</p>
        <p className="text-sm text-slate-500 mt-1">Enter a prompt above (e.g. "Show ethanol in 3D") to render real 3D RDKit structures.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      <Canvas
        camera={{ position: [0, 2, 8], fov: 45 }}
        gl={{ antialias: true }}
      >
        <MoleculeScene molecule={molecule} wireframe={wireframe} controlsRef={controlsRef} />
      </Canvas>

      {/* Reset view overlay button */}
      <button
        onClick={handleResetCamera}
        className="absolute top-4 right-4 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-700 backdrop-blur-sm transition flex items-center gap-1.5 shadow"
        title="Reset Camera View"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Reset Camera
      </button>
    </div>
  );
};
