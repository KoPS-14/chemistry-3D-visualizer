import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import type { ReactionData } from '../types/reaction';
import { getElementConfig } from '../three/scene';
import { calculateAnimationFrameState } from '../three/animateReaction';

interface ReactionAnimationViewerProps {
  reaction: ReactionData;
  progress: number;
  wireframe?: boolean;
}

const AnimatedReactionScene: React.FC<{
  reaction: ReactionData;
  progress: number;
  wireframe?: boolean;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}> = ({ reaction, progress, wireframe = false, controlsRef }) => {
  const animState = useMemo(() => calculateAnimationFrameState(reaction, progress), [reaction, progress]);

  // Adjust camera view to capture full horizontal textbook reaction layout
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.object.position.set(0, 1, 14);
      controlsRef.current.update();
    }
  }, [reaction, controlsRef]);

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 15, 10]} intensity={1.5} />
      <directionalLight position={[-10, -10, -10]} intensity={0.5} />
      <pointLight position={[0, 0, 0]} intensity={0.8} color="#38bdf8" />

      {/* Transition State Activated Complex Overlay */}
      {animState.isTransitionStateActive && (
        <group position={[0, 0, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[2.2, 2.4, 32]} />
            <meshBasicMaterial color="#f59e0b" opacity={0.7} transparent side={THREE.DoubleSide} />
          </mesh>
          <Html position={[0, 2.5, 0]} center distanceFactor={12}>
            <div className="bg-amber-950/90 text-amber-300 font-mono text-xs px-3 py-1 rounded-md border border-amber-500/60 shadow-xl pointer-events-none whitespace-nowrap animate-bounce">
              ⚡ Activated Transition State (Pentacoordinate Complex)
            </div>
          </Html>
        </group>
      )}

      {/* Render Reaction Symbols (+ and -> Arrow) */}
      {animState.reactionSymbols.map((sym) => {
        if (sym.opacity < 0.1) return null;

        if (sym.type === 'plus') {
          return (
            <Html key={sym.id} position={sym.position} center distanceFactor={12}>
              <div
                className="text-2xl font-bold font-mono text-slate-300 pointer-events-none select-none drop-shadow-md"
                style={{ opacity: sym.opacity }}
              >
                +
              </div>
            </Html>
          );
        }

        if (sym.type === 'arrow') {
          return (
            <Html key={sym.id} position={sym.position} center distanceFactor={12}>
              <div className="flex flex-col items-center pointer-events-none select-none">
                {sym.label && (
                  <span className="text-[10px] font-mono text-cyan-300 bg-slate-900/90 px-2 py-0.5 rounded border border-cyan-500/40 mb-1 shadow">
                    {sym.label}
                  </span>
                )}
                <span className="text-3xl font-bold text-cyan-400 font-mono drop-shadow-lg">
                  ➔
                </span>
              </div>
            </Html>
          );
        }

        return null;
      })}

      {/* Render Textbook Molecule Labels Below Each Molecule */}
      {animState.moleculeLabels.map((lbl) => {
        if (lbl.opacity < 0.1) return null;
        const isReactant = lbl.role === 'reactant';

        return (
          <Html key={lbl.id} position={lbl.position} center distanceFactor={12}>
            <div
              className={`flex flex-col items-center p-2 rounded-lg border backdrop-blur-md shadow-xl transition-all pointer-events-none select-none ${
                isReactant
                  ? 'bg-slate-900/95 border-cyan-500/60 text-cyan-300'
                  : 'bg-slate-900/95 border-emerald-500/60 text-emerald-300'
              }`}
              style={{ opacity: lbl.opacity }}
            >
              <span className="text-sm font-bold font-mono tracking-wider">{lbl.formula}</span>
              <span className="text-[11px] font-medium text-slate-300 truncate max-w-[120px] text-center mt-0.5">
                {lbl.name}
              </span>
            </div>
          </Html>
        );
      })}

      {/* Render 3D Chemical Bond Cylinders */}
      {animState.animatedBonds.map((bond) => {
        if (bond.opacity < 0.05) return null;
        const radius = bond.isTransition ? 0.07 : 0.12;

        return (
          <mesh
            key={bond.id}
            position={bond.midpoint}
            quaternion={bond.quaternion}
          >
            <cylinderGeometry args={[radius, radius, bond.length, 16]} />
            <meshStandardMaterial
              color={bond.color}
              wireframe={wireframe}
              transparent
              opacity={bond.opacity * (bond.isTransition ? 0.8 : 0.95)}
              roughness={0.3}
              metalness={0.2}
            />
          </mesh>
        );
      })}

      {/* Render Reactant Atoms */}
      {animState.reactantAtoms.map((item, idx) => {
        if (item.opacity < 0.05) return null;
        const cfg = getElementConfig(item.atom.element, item.atom.cpk_color);
        const radius = cfg.radius * item.scale;

        return (
          <mesh key={`r-atom-${idx}`} position={item.position}>
            <sphereGeometry args={[radius, 32, 32]} />
            <meshStandardMaterial
              color={cfg.color}
              wireframe={wireframe}
              transparent
              opacity={item.opacity}
              roughness={0.2}
              metalness={0.3}
            />
          </mesh>
        );
      })}

      {/* Render Product Atoms */}
      {animState.productAtoms.map((item, idx) => {
        if (item.opacity < 0.05) return null;
        const cfg = getElementConfig(item.atom.element, item.atom.cpk_color);
        const radius = cfg.radius * item.scale;

        return (
          <mesh key={`p-atom-${idx}`} position={item.position}>
            <sphereGeometry args={[radius, 32, 32]} />
            <meshStandardMaterial
              color={cfg.color}
              wireframe={wireframe}
              transparent
              opacity={item.opacity}
              roughness={0.2}
              metalness={0.3}
            />
          </mesh>
        );
      })}

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

export const ReactionAnimationViewer: React.FC<ReactionAnimationViewerProps> = ({
  reaction,
  progress,
  wireframe = false,
}) => {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.object.position.set(0, 1, 14);
      controlsRef.current.update();
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      <Canvas camera={{ position: [0, 1, 14], fov: 45 }} gl={{ antialias: true }}>
        <AnimatedReactionScene
          reaction={reaction}
          progress={progress}
          wireframe={wireframe}
          controlsRef={controlsRef}
        />
      </Canvas>

      {/* Label: 3D Textbook Reaction Equation */}
      <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded border border-slate-800 text-[11px] font-mono text-cyan-400">
        Textbook Reaction Layout ({reaction.balanced_equation || reaction.reaction_type})
      </div>

      <button
        onClick={handleResetCamera}
        className="absolute top-4 right-4 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-700 backdrop-blur-sm transition flex items-center gap-1.5 shadow z-10 cursor-pointer"
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
