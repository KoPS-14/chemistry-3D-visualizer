import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import type { ElementData } from '../types/reaction';
import { calculateAtomStructure } from '../three/renderElementAtom';

interface ElementAtomViewerProps {
  element: ElementData | null;
}

const ElectronOrbitsGroup: React.FC<{
  element: ElementData;
}> = ({ element }) => {
  const groupRef = useRef<THREE.Group>(null);
  const { shellRings, electronPositions } = useMemo(() => calculateAtomStructure(element), [element]);

  // Subtle rotation animation for electron shells
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.4;
      groupRef.current.rotation.x += delta * 0.15;
    }
  });

  const nucleusColor = element.cpk || '#00d8ff';

  return (
    <group ref={groupRef}>
      {/* Central Nucleus */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshStandardMaterial
          color={nucleusColor}
          emissive={nucleusColor}
          emissiveIntensity={0.5}
          roughness={0.2}
          metalness={0.4}
        />
        <Html distanceFactor={8} position={[0, 1.0, 0]} center>
          <div className="bg-slate-900/90 text-cyan-300 font-mono text-xs px-2.5 py-1 rounded-md border border-cyan-500/40 shadow-lg pointer-events-none whitespace-nowrap">
            <span className="font-bold">{element.symbol}</span> (Z={element.atomic_number})
          </div>
        </Html>
      </mesh>

      {/* Shell Rings & Electrons */}
      {shellRings.map((ring) => {
        const tiltAngleX = (ring.shellIndex % 2 === 1 ? 0.35 : -0.2) * (ring.shellIndex + 1);
        const tiltAngleZ = (ring.shellIndex % 3 === 2 ? 0.4 : 0.0);

        return (
          <group key={`shell-group-${ring.shellIndex}`} rotation={[tiltAngleX, 0, tiltAngleZ]}>
            {/* Thin 3D Ring representation for electron shell */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[ring.radius - 0.015, ring.radius + 0.015, 64]} />
              <meshBasicMaterial color="#38bdf8" opacity={0.45} transparent side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}

      {/* Electron Spheres */}
      {electronPositions.map((e, idx) => (
        <mesh key={`electron-${idx}`} position={e.position}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#38bdf8"
            emissiveIntensity={0.8}
            roughness={0.1}
          />
        </mesh>
      ))}
    </group>
  );
};

const AtomScene: React.FC<{
  element: ElementData;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  dragMode: 'rotate' | 'pan';
}> = ({ element, controlsRef, dragMode }) => {
  const numShells = element.shells?.length || 1;
  const maxRadius = 1.6 + (numShells - 1) * 1.2;

  useEffect(() => {
    if (controlsRef.current) {
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
  }, [dragMode, controlsRef]);

  useEffect(() => {
    if (controlsRef.current) {
      const targetDist = Math.max(maxRadius * 2.8, 7);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.object.position.set(0, targetDist * 0.2, targetDist);
      controlsRef.current.update();
    }
  }, [element, maxRadius, controlsRef]);

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 15, 10]} intensity={1.5} />
      <directionalLight position={[-10, -10, -10]} intensity={0.5} />
      <pointLight position={[0, 0, 0]} intensity={1.0} color="#38bdf8" />

      <ElectronOrbitsGroup element={element} />

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

export const ElementAtomViewer: React.FC<ElementAtomViewerProps> = ({ element }) => {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [dragMode, setDragMode] = useState<'rotate' | 'pan'>('rotate');

  const handleResetCamera = () => {
    if (controlsRef.current && element) {
      const numShells = element.shells?.length || 1;
      const maxRadius = 1.6 + (numShells - 1) * 1.2;
      const targetDist = Math.max(maxRadius * 2.8, 7);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.object.position.set(0, targetDist * 0.2, targetDist);
      controlsRef.current.update();
      setDragMode('rotate');
    }
  };

  const handleZoomIn = () => {
    if (controlsRef.current) {
      controlsRef.current.dollyIn(1.3);
      controlsRef.current.update();
    }
  };

  const handleZoomOut = () => {
    if (controlsRef.current) {
      controlsRef.current.dollyOut(1.3);
      controlsRef.current.update();
    }
  };

  const handlePanShift = (dx: number, dy: number) => {
    if (controlsRef.current) {
      controlsRef.current.target.x += dx;
      controlsRef.current.target.y += dy;
      controlsRef.current.object.position.x += dx;
      controlsRef.current.object.position.y += dy;
      controlsRef.current.update();
    }
  };

  if (!element) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 p-6 rounded-xl border border-slate-800">
        <p className="text-lg font-medium text-slate-300">Select an element from the periodic table</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Navigation Controls HUD */}
      <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2">
        <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-2xl font-mono text-xs">
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

          <button
            onClick={handleZoomIn}
            className="w-7 h-7 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-lg border border-slate-800 transition flex items-center justify-center cursor-pointer text-sm shadow"
            title="Zoom In (+)"
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            className="w-7 h-7 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-lg border border-slate-800 transition flex items-center justify-center cursor-pointer text-sm shadow"
            title="Zoom Out (-)"
          >
            −
          </button>
          <button
            onClick={handleResetCamera}
            className="px-2 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 text-xs font-mono transition cursor-pointer"
            title="Reset Camera View"
          >
            ↺ Reset
          </button>
        </div>

        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-xl">
          <span className="text-[10px] font-mono text-slate-500 px-1">Pan View:</span>
          <button
            onClick={() => handlePanShift(-1.5, 0)}
            className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 text-cyan-300 text-xs font-mono rounded border border-slate-800 cursor-pointer"
            title="Pan left"
          >
            ⬅️
          </button>
          <button
            onClick={() => handlePanShift(1.5, 0)}
            className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 text-cyan-300 text-xs font-mono rounded border border-slate-800 cursor-pointer"
            title="Pan right"
          >
            ➡️
          </button>
          <button
            onClick={() => handlePanShift(0, 1.5)}
            className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 text-cyan-300 text-xs font-mono rounded border border-slate-800 cursor-pointer"
            title="Pan up"
          >
            ⬆️
          </button>
          <button
            onClick={() => handlePanShift(0, -1.5)}
            className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 text-cyan-300 text-xs font-mono rounded border border-slate-800 cursor-pointer"
            title="Pan down"
          >
            ⬇️
          </button>
        </div>
      </div>

      <Canvas camera={{ position: [0, 2, 8], fov: 45, near: 0.1, far: 1000 }} gl={{ antialias: true }}>
        <AtomScene element={element} controlsRef={controlsRef} dragMode={dragMode} />
      </Canvas>

      {/* Label: Educational atomic model */}
      <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded border border-slate-800 text-[11px] font-mono text-cyan-400">
        Educational atomic model (Shells: {element.shells?.join(', ') || '1'})
      </div>
    </div>
  );
};
