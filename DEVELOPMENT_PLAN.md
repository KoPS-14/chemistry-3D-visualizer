# AI-Powered Chemistry Visualization System (chem-ai)
## Development Plan & Implementation Roadmap

This project is built incrementally with modular architecture and strict chemical accuracy.

---

### Phase 1: Natural Language Molecule Request & 3D JSON Pipeline (COMPLETED)
- **Goal**: Natural language molecule prompt → LLM -> structured molecule data -> RDKit validation -> 3D coordinate generation -> JSON response.
- **Key Modules**:
  - `app/schemas/models.py`: Pydantic models for prompts, molecules, and API responses.
  - `app/ai/llm_service.py`: LLM interface with fallback lookup for molecule intent.
  - `app/chemistry/rdkit_service.py`: SMILES validation, H addition, 3D ETKDG embedding, geometry optimization.
  - `app/api/routes.py`: `/api/health` and `/api/visualize` endpoints.
  - `tests/test_phase1.py`: Validation & 3D generation test suite.

---

### Phase 2: Three.js Interactive 3D Molecule Viewer (COMPLETED)
- **Goal**: Render 3D molecules interactively using React, Three.js, React Three Fiber, and `@react-three/drei`.
- **Key Modules**:
  - `frontend/src/three/scene.ts` & `renderMolecule.ts`: 3D CPK sphere rendering for atoms and cylinder rendering for bonds.
  - `frontend/src/components/MoleculeViewer.tsx`: OrbitControls (rotate, zoom, pan), camera reset.
  - `frontend/src/components/PromptInput.tsx` & `Controls.tsx`: UI controls and info panel.

---

### Phase 3: Natural Language Reaction Request & Validation (COMPLETED)
- **Goal**: Parse natural language reaction prompts into structured reactants, products, and reaction types, validated chemically using RDKit 3D coordinate generation.
- **Key Modules**:
  - `app/schemas/models.py`: Added `ReactionData` and `ReactantProduct3DData` schemas.
  - `app/data/reactions/`: Pre-validated dataset files (`water_formation.json`, `sn2_ch3br_oh.json`, `acid_base.json`).
  - `app/chemistry/lookup_service.py`: Reaction template searching.
  - `app/api/routes.py`: Reaction parsing and 3D coordinate generation for reactants/products.
  - `frontend/src/App.tsx`: Interactive reaction panel with component tabs to inspect reactant/product 3D structures.
  - `tests/test_phase3.py`: Automated tests for SN2, Water Formation, and Acid-Base reactions.

---

### Phase 4: Validated Reaction Templates (NEXT PHASE)
- **Goal**: Store validated templates describing bond breaking, formation, and atom movements for specific reaction classes.
- **Initial Supported Reactions**:
  1. Water formation ($2\text{H}_2 + \text{O}_2 \rightarrow 2\text{H}_2\text{O}$)
  2. Acid-base neutralization ($\text{HCl} + \text{NaOH} \rightarrow \text{NaCl} + \text{H}_2\text{O}$)
  3. $S_N2$ Nucleophilic Substitution ($\text{CH}_3\text{Br} + \text{OH}^- \rightarrow \text{CH}_3\text{OH} + \text{Br}^-$)

---

### Phase 5: Procedural 3D Reaction Animation
- **Goal**: Smooth procedural animation of atom trajectories and bond transformations.
- **Key Modules**:
  - `frontend/src/three/animateReaction.ts`: Timing, interpolation, play, pause, resume, reset.

---

### Phase 6: Educational Reaction-Condition Controls
- **Goal**: Dynamic reaction parameter controls (temperature, pressure, catalyst, solvent, concentration) with simplified educational kinetics explanation.
- **Key Modules**:
  - `app/chemistry/kinetics.py`: Educational condition rules.
  - Frontend slider & dropdown controls.
