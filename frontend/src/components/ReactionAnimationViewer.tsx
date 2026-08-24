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

  // Adjust camera position on initial load
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.object.position.set(0, 3, 11);
      controlsRef.current.update();
    }
  }, [reaction, controlsRef]);

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 15, 10]} intensity={1.5} />
      <directionalLight position={[-10, -10, -10]} intensity={0.5} />
      <pointLight position={[0, 0, 0]} intensity={0.8} color="#38bdf8" />

      {/* Transition State Glow & Ring Indicator */}
      {animState.isTransitionStateActive && (
        <group position={[0, 0, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.8, 2.0, 32]} />
            <meshBasicMaterial color="#f59e0b" opacity={0.6} transparent side={THREE.DoubleSide} />
          </mesh>
          <Html position={[0, 2.2, 0]} center distanceFactor={10}>
            <div className="bg-amber-950/90 text-amber-300 font-mono text-xs px-2.5 py-1 rounded-md border border-amber-500/50 shadow-xl pointer-events-none whitespace-nowrap animate-bounce">
              ⚡ Transition State (Activated Complex)
            </div>
          </Html>
        </group>
      )}

      {/* Render Reactant Atoms */}
      {animState.reactantAtoms.map((item, idx) => {
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
            {/* Element Label */}
            {item.opacity > 0.4 && (
              <Html distanceFactor={10} position={[0, radius + 0.3, 0]} center>
                <div className="text-[10px] font-mono font-bold text-slate-200 bg-slate-950/80 px-1 py-0.5 rounded border border-slate-700/60 pointer-events-none select-none">
                  {item.atom.symbol || item.atom.element}
                </div>
              </Html>
            )}
          </mesh>
        );
      })}

      {/* Render Product Atoms */}
      {animState.productAtoms.map((item, idx) => {
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
            {/* Element Label */}
            {item.opacity > 0.4 && (
              <Html distanceFactor={10} position={[0, radius + 0.3, 0]} center>
                <div className="text-[10px] font-mono font-bold text-emerald-300 bg-slate-950/80 px-1 py-0.5 rounded border border-emerald-700/60 pointer-events-none select-none">
                  {item.atom.symbol || item.atom.element}
                </div>
              </Html>
            )}
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
      controlsRef.current.object.position.set(0, 3, 11);
      controlsRef.current.update();
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      <Canvas camera={{ position: [0, 3, 11], fov: 45 }} gl={{ antialias: true }}>
        <AnimatedReactionScene
          reaction={reaction}
          progress={progress}
          wireframe={wireframe}
          controlsRef={controlsRef}
        />
      </Canvas>

      {/* Label: 3D Reaction Engine */}
      <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded border border-slate-800 text-[11px] font-mono text-cyan-400">
        3D Procedural Reaction Engine ({reaction.reaction_type})
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
