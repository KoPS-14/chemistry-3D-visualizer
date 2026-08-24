import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import type { ReactionData } from '../types/reaction';
import { getElementConfig } from '../three/scene';
import { calculateAnimationFrameState, type ElectronFlowArcState } from '../three/animateReaction';

interface ReactionAnimationViewerProps {
  reaction: ReactionData;
  progress: number;
  wireframe?: boolean;
}

// 3D Curved Arc for Electron Pair Transfer Mechanism (Curved Arrow Flow)
const ElectronFlowArc: React.FC<{ arc: ElectronFlowArcState }> = ({ arc }) => {
  const curve = useMemo(() => {
    return new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...arc.startPos),
      new THREE.Vector3(...arc.controlPos),
      new THREE.Vector3(...arc.endPos)
    );
  }, [arc.startPos, arc.controlPos, arc.endPos]);

  const tubeGeometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 32, 0.035, 8, false);
  }, [curve]);

  const ePos = useMemo(() => curve.getPoint(arc.progress), [curve, arc.progress]);

  if (arc.opacity < 0.05) return null;

  return (
    <group>
      {/* Glowing Curved Arc Tube */}
      <mesh geometry={tubeGeometry}>
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#38bdf8"
          emissiveIntensity={1.4}
          transparent
          opacity={arc.opacity * 0.85}
        />
      </mesh>

      {/* Traveling Electron Pair Spheres (e⁻ pair) */}
      <group position={[ePos.x, ePos.y, ePos.z]}>
        <mesh position={[-0.07, 0, 0]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={1.6} />
        </mesh>
        <mesh position={[0.07, 0, 0]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={1.6} />
        </mesh>
      </group>
    </group>
  );
};

const AnimatedReactionScene: React.FC<{
  reaction: ReactionData;
  progress: number;
  wireframe?: boolean;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}> = ({ reaction, progress, wireframe = false, controlsRef }) => {
  const animState = useMemo(() => calculateAnimationFrameState(reaction, progress), [reaction, progress]);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.object.position.set(0, 0, 16);
      controlsRef.current.update();
    }
  }, [reaction, controlsRef]);

  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[10, 15, 10]} intensity={1.5} />
      <directionalLight position={[-10, -10, -10]} intensity={0.5} />
      <pointLight position={[0, 0, 0]} intensity={0.8} color="#38bdf8" />

      {/* 3D Transition State Activated Complex Glow Ring (Completely unobstructive, no hovering cards!) */}
      {animState.isTransitionStateActive && (
        <group position={[0, 0, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[2.3, 2.5, 32]} />
            <meshBasicMaterial color="#f59e0b" opacity={0.65} transparent side={THREE.DoubleSide} />
          </mesh>

          {/* Partial Charge Badges (δ⁻) on Nucleophile & Leaving Group */}
          <Html position={[-1.6, 1.0, 0]} center distanceFactor={14}>
            <span className="text-xs font-mono font-bold text-cyan-300 bg-slate-900/90 px-1.5 py-0.5 rounded border border-cyan-500/50 shadow pointer-events-none select-none">
              δ⁻
            </span>
          </Html>
          <Html position={[1.6, 1.0, 0]} center distanceFactor={14}>
            <span className="text-xs font-mono font-bold text-amber-300 bg-slate-900/90 px-1.5 py-0.5 rounded border border-amber-500/50 shadow pointer-events-none select-none">
              δ⁻
            </span>
          </Html>
        </group>
      )}

      {/* Curved Electron Arc Mechanism */}
      {animState.electronArc && <ElectronFlowArc arc={animState.electronArc} />}

      {/* Render Equation Symbols (+ and -> Arrow) Inline with Bottom Formula Label Row */}
      {animState.reactionSymbols.map((sym) => {
        if (sym.opacity < 0.05) return null;

        if (sym.type === 'plus') {
          return (
            <Html key={sym.id} position={sym.position} center distanceFactor={14}>
              <div
                className="text-2xl font-bold font-mono text-slate-200 pointer-events-none select-none drop-shadow-lg transition-opacity duration-200"
                style={{ opacity: sym.opacity }}
              >
                +
              </div>
            </Html>
          );
        }

        if (sym.type === 'arrow') {
          return (
            <Html key={sym.id} position={sym.position} center distanceFactor={14}>
              <div
                className="flex items-center gap-1.5 pointer-events-none select-none transition-opacity duration-200"
                style={{ opacity: sym.opacity }}
              >
                <span className="text-3xl font-bold text-cyan-400 font-mono drop-shadow-xl">
                  ➔
                </span>
                {sym.label && (
                  <span className="text-[10px] font-mono text-cyan-300 bg-slate-900/90 px-2 py-0.5 rounded border border-cyan-500/50 shadow-lg">
                    ({sym.label})
                  </span>
                )}
              </div>
            </Html>
          );
        }

        return null;
      })}

      {/* Render Clean Textbook Molecule Labels Below Each Molecule */}
      {animState.moleculeLabels.map((lbl) => {
        if (lbl.opacity < 0.05) return null;
        const isReactant = lbl.role === 'reactant';

        return (
          <Html key={lbl.id} position={lbl.position} center distanceFactor={14}>
            <div
              className={`flex flex-col items-center px-3 py-1.5 rounded-lg border backdrop-blur-md shadow-2xl transition-all pointer-events-none select-none ${
                isReactant
                  ? 'bg-slate-900/95 border-cyan-500/70 text-cyan-300'
                  : 'bg-slate-900/95 border-emerald-500/70 text-emerald-300'
              }`}
              style={{ opacity: lbl.opacity }}
            >
              <span className="text-sm font-bold font-mono tracking-wider">{lbl.formula}</span>
              <span className="text-[11px] font-semibold text-slate-200 truncate max-w-[130px] text-center mt-0.5">
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
  const animState = useMemo(() => calculateAnimationFrameState(reaction, progress), [reaction, progress]);

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.object.position.set(0, 0, 16);
      controlsRef.current.update();
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Sleek Floating Top HUD Banner for Transition State Explanations (Outside 3D Viewport!) */}
      {animState.transitionAnnotation && (
        <div
          className="absolute top-3 left-1/2 transform -translate-x-1/2 bg-slate-900/90 border border-amber-500/60 rounded-xl px-4 py-2 text-center shadow-2xl backdrop-blur-md z-20 pointer-events-none transition-opacity duration-300 max-w-lg w-11/12"
          style={{ opacity: animState.transitionAnnotation.opacity }}
        >
          <div className="text-xs font-bold text-amber-300 font-mono flex items-center justify-center gap-1.5">
            <span>⚡</span>
            <span>{animState.transitionAnnotation.title}</span>
          </div>
          <p className="text-[11px] text-slate-200 font-medium mt-0.5">{animState.transitionAnnotation.subtitle}</p>
          <div className="flex items-center justify-center gap-3 mt-1 text-[10px] font-mono">
            <span className="text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-700/60">
              {animState.transitionAnnotation.breakingBondText}
            </span>
            <span className="text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-700/60">
              {animState.transitionAnnotation.formingBondText}
            </span>
          </div>
        </div>
      )}

      <Canvas camera={{ position: [0, 0, 16], fov: 45 }} gl={{ antialias: true }}>
        <AnimatedReactionScene
          reaction={reaction}
          progress={progress}
          wireframe={wireframe}
          controlsRef={controlsRef}
        />
      </Canvas>

      {/* Label: 3D Textbook Reaction Equation */}
      <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded border border-slate-800 text-[11px] font-mono text-cyan-400 z-10">
        Textbook Reaction Layout ({reaction.balanced_equation || reaction.reaction_type})
      </div>

      <button
        onClick={handleResetCamera}
        className="absolute top-4 right-4 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-700 backdrop-blur-sm transition flex items-center gap-1.5 shadow z-20 cursor-pointer"
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
