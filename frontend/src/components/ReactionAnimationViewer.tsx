import React, { useRef, useMemo, useEffect, useState } from 'react';
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

// 3D Curved Arc for Electron Pair Transfer Mechanism
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
      <mesh geometry={tubeGeometry}>
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#38bdf8"
          emissiveIntensity={1.4}
          transparent
          opacity={arc.opacity * 0.85}
        />
      </mesh>

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
  cameraTarget: [number, number, number];
  cameraDistance: number;
  dragMode: 'rotate' | 'pan';
  onSelectTarget: (target: [number, number, number], distance: number) => void;
}> = ({ reaction, progress, wireframe = false, controlsRef, cameraTarget, cameraDistance, dragMode, onSelectTarget }) => {
  const animState = useMemo(() => calculateAnimationFrameState(reaction, progress), [reaction, progress]);

  // Smoothly update OrbitControls target & mouse mode
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.target.set(cameraTarget[0], cameraTarget[1], cameraTarget[2]);
      controlsRef.current.object.position.set(cameraTarget[0], cameraTarget[1] + 0.5, cameraTarget[2] + cameraDistance);
      
      // Configure mouse buttons according to active dragMode
      if (dragMode === 'pan') {
        controlsRef.current.mouseButtons = {
          LEFT: THREE.MOUSE.PAN,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.ROTATE,
        };
      } else {
        controlsRef.current.mouseButtons = {
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        };
      }
      controlsRef.current.update();
    }
  }, [cameraTarget, cameraDistance, dragMode, controlsRef]);

  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[10, 15, 10]} intensity={1.5} />
      <directionalLight position={[-10, -10, -10]} intensity={0.5} />
      <pointLight position={[0, 0, 0]} intensity={0.8} color="#38bdf8" />

      {/* 3D Transition State Activated Complex Glow Ring */}
      {animState.isTransitionStateActive && (
        <group position={[0, 0, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[2.3, 2.5, 32]} />
            <meshBasicMaterial color="#f59e0b" opacity={0.65} transparent side={THREE.DoubleSide} />
          </mesh>

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

      {/* Render Equation Symbols (+ and -> Arrow) */}
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

      {/* Render Clickable Molecule Labels Below Each Molecule */}
      {animState.moleculeLabels.map((lbl) => {
        if (lbl.opacity < 0.05) return null;
        const isReactant = lbl.role === 'reactant';

        return (
          <Html key={lbl.id} position={lbl.position} center distanceFactor={14}>
            <div
              onClick={() => onSelectTarget([lbl.position[0], 0, 0], 6.5)}
              className={`flex flex-col items-center px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-2xl transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                isReactant
                  ? 'bg-slate-900/95 border-cyan-500/80 text-cyan-300 hover:border-cyan-400 hover:shadow-cyan-500/30'
                  : 'bg-slate-900/95 border-emerald-500/80 text-emerald-300 hover:border-emerald-400 hover:shadow-emerald-500/30'
              }`}
              style={{ opacity: lbl.opacity }}
              title={`Click to focus camera directly on ${lbl.name}`}
            >
              <span className="text-xs font-mono text-slate-400 uppercase font-medium">Click to Focus 🎯</span>
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
            onClick={(e) => {
              e.stopPropagation();
              onSelectTarget([bond.midpoint[0], bond.midpoint[1], bond.midpoint[2]], 5.0);
            }}
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
          <mesh
            key={`r-atom-${idx}`}
            position={item.position}
            onClick={(e) => {
              e.stopPropagation();
              onSelectTarget([item.position[0], item.position[1], item.position[2]], 4.5);
            }}
          >
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
          <mesh
            key={`p-atom-${idx}`}
            position={item.position}
            onClick={(e) => {
              e.stopPropagation();
              onSelectTarget([item.position[0], item.position[1], item.position[2]], 4.5);
            }}
          >
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
        zoomSpeed={1.5}
        panSpeed={1.0}
        screenSpacePanning
        zoomToCursor
        minDistance={0.2}
        maxDistance={150.0}
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

  // Camera Target, Distance, and Drag Mode state
  const [cameraTarget, setCameraTarget] = useState<[number, number, number]>([0, 0, 0]);
  const [cameraDistance, setCameraDistance] = useState<number>(16.0);
  const [activeTargetLabel, setActiveTargetLabel] = useState<string>('Overview');
  const [dragMode, setDragMode] = useState<'rotate' | 'pan'>('rotate');

  const handleSelectTarget = (target: [number, number, number], distance: number, labelName?: string) => {
    setCameraTarget(target);
    setCameraDistance(distance);
    if (labelName) setActiveTargetLabel(labelName);
  };

  const handleResetCamera = () => {
    setCameraTarget([0, 0, 0]);
    setCameraDistance(16.0);
    setActiveTargetLabel('Overview');
    setDragMode('rotate');
  };

  const handleZoomIn = () => {
    setCameraDistance((prev) => Math.max(1.5, prev * 0.7));
  };

  const handleZoomOut = () => {
    setCameraDistance((prev) => Math.min(80.0, prev * 1.4));
  };

  const handlePanShift = (dx: number, dy: number) => {
    setCameraTarget(([cx, cy, cz]) => [cx + dx, cy + dy, cz]);
  };

  // Extract Reactants & Products for Quick Focus Buttons
  const r1 = reaction.reactants[0];
  const r2 = reaction.reactants[1];
  const p1 = reaction.products[0];

  return (
    <div className="relative w-full h-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Top Left HUD: Zoom & Focus Preset Buttons */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-2xl">
        <span className="text-[10px] font-mono text-slate-400 font-bold px-1.5 uppercase">Focus Target:</span>
        <button
          onClick={() => handleSelectTarget([0, 0, 0], 16.0, 'Overview')}
          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
            activeTargetLabel === 'Overview'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/40 border border-cyan-400/40'
              : 'bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
          }`}
        >
          🔍 Overview (All)
        </button>

        {r1 && (
          <button
            onClick={() => {
              const posX = animState.moleculeLabels[0]?.position[0] ?? -4.5;
              handleSelectTarget([posX, 0, 0], 6.5, r1.name);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
              activeTargetLabel === r1.name
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/40 border border-cyan-400/40'
                : 'bg-slate-950 text-cyan-300 hover:bg-slate-800 hover:text-white border border-cyan-800/60'
            }`}
            title={`Focus camera on Reactant 1: ${r1.name}`}
          >
            🧪 {r1.name}
          </button>
        )}

        {r2 && (
          <button
            onClick={() => {
              const posX = animState.moleculeLabels[1]?.position[0] ?? 0;
              handleSelectTarget([posX, 0, 0], 6.5, r2.name);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
              activeTargetLabel === r2.name
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/40 border border-amber-400/40'
                : 'bg-slate-950 text-amber-300 hover:bg-slate-800 hover:text-white border border-amber-800/60'
            }`}
            title={`Focus camera on Reactant 2: ${r2.name}`}
          >
            🧪 {r2.name}
          </button>
        )}

        {p1 && (
          <button
            onClick={() => {
              const lastIdx = animState.moleculeLabels.length - 1;
              const posX = animState.moleculeLabels[lastIdx]?.position[0] ?? 5.5;
              handleSelectTarget([posX, 0, 0], 6.5, p1.name);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
              activeTargetLabel === p1.name
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/40 border border-emerald-400/40'
                : 'bg-slate-950 text-emerald-300 hover:bg-slate-800 hover:text-white border border-emerald-800/60'
            }`}
            title={`Focus camera on Product: ${p1.name}`}
          >
            ✨ {p1.name}
          </button>
        )}
      </div>

      {/* Top Right Navigation Controls: Drag-Pan Mode Toggle, Zoom In/Out, Directional Shift, Reset */}
      <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2">
        <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-2xl font-mono text-xs">
          {/* Drag Mode Switcher */}
          <button
            onClick={() => setDragMode((prev) => (prev === 'rotate' ? 'pan' : 'rotate'))}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
              dragMode === 'pan'
                ? 'bg-emerald-600 text-white border border-emerald-400 shadow-md shadow-emerald-600/40 animate-pulse'
                : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
            title={dragMode === 'pan' ? 'Left click drag moves camera view anywhere!' : 'Click to enable Drag-to-Move Pan Mode'}
          >
            {dragMode === 'pan' ? '🖐️ Move View Active' : '🔄 Drag Mode: Orbit'}
          </button>

          {/* Zoom In (+) */}
          <button
            onClick={handleZoomIn}
            className="w-7 h-7 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-lg border border-slate-800 transition flex items-center justify-center cursor-pointer text-sm shadow"
            title="Zoom In Camera (+)"
          >
            +
          </button>

          {/* Zoom Out (-) */}
          <button
            onClick={handleZoomOut}
            className="w-7 h-7 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-lg border border-slate-800 transition flex items-center justify-center cursor-pointer text-sm shadow"
            title="Zoom Out Camera (-)"
          >
            −
          </button>

          {/* Reset Camera */}
          <button
            onClick={handleResetCamera}
            className="px-2 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 text-xs font-mono transition cursor-pointer"
            title="Reset Camera to Center"
          >
            ↺ Reset
          </button>
        </div>

        {/* Directional Camera Shift D-Pad (Left, Right, Up, Down) */}
        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-xl">
          <span className="text-[10px] font-mono text-slate-500 px-1">Pan View:</span>
          <button
            onClick={() => handlePanShift(-2.5, 0)}
            className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 text-cyan-300 text-xs font-mono rounded border border-slate-800 cursor-pointer"
            title="Shift camera view left"
          >
            ⬅️
          </button>
          <button
            onClick={() => handlePanShift(2.5, 0)}
            className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 text-cyan-300 text-xs font-mono rounded border border-slate-800 cursor-pointer"
            title="Shift camera view right"
          >
            ➡️
          </button>
          <button
            onClick={() => handlePanShift(0, 2.5)}
            className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 text-cyan-300 text-xs font-mono rounded border border-slate-800 cursor-pointer"
            title="Shift camera view up"
          >
            ⬆️
          </button>
          <button
            onClick={() => handlePanShift(0, -2.5)}
            className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 text-cyan-300 text-xs font-mono rounded border border-slate-800 cursor-pointer"
            title="Shift camera view down"
          >
            ⬇️
          </button>
        </div>
      </div>

      {/* Floating Transition State Banner */}
      {animState.transitionAnnotation && (
        <div
          className="absolute top-14 left-1/2 transform -translate-x-1/2 bg-slate-900/90 border border-amber-500/60 rounded-xl px-4 py-2 text-center shadow-2xl backdrop-blur-md z-20 pointer-events-none transition-opacity duration-300 max-w-lg w-11/12"
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

      <Canvas camera={{ position: [0, 0, 16], fov: 45, near: 0.1, far: 1000 }} gl={{ antialias: true }}>
        <AnimatedReactionScene
          reaction={reaction}
          progress={progress}
          wireframe={wireframe}
          controlsRef={controlsRef}
          cameraTarget={cameraTarget}
          cameraDistance={cameraDistance}
          dragMode={dragMode}
          onSelectTarget={(tgt, dist) => handleSelectTarget(tgt, dist)}
        />
      </Canvas>

      {/* Bottom Hint Banner */}
      <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] font-mono text-cyan-400 z-10 flex items-center gap-2">
        <span>💡 Hint: Use Focus buttons or 🖐️ Move View mode / ⬅️➡️ arrows to zoom into ANY molecule anywhere!</span>
      </div>
    </div>
  );
};
