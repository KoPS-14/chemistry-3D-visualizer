# AI-Powered Chemistry Visualization System (`chem-ai`)

An interactive, scientifically accurate 3D chemistry visualization system combining LLM natural language understanding with RDKit chemical validation and 3D embedding, rendered interactively using React and Three.js.

## Features (Phase 1)
- **Natural Language Parsing**: Accepts user requests like `"Show the 3D structure of ethanol"`.
- **Structured LLM Translation**: Converts prompts to validated JSON specifications (SMILES, request type, confidence).
- **RDKit 3D Coordinate Generation**: Validates SMILES, adds explicit hydrogen atoms, performs 3D ETKDG coordinate embedding and MMFF/UFF geometry optimization.
- **FastAPI REST Endpoints**: `/api/health` and `/api/visualize`.

## Setup & Running Backend

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Run FastAPI Backend
```bash
python -m uvicorn app.main:app --app-dir backend --reload --port 8000
```

### 4. Run Tests
```bash
pytest backend/tests/test_phase1.py -v
```
