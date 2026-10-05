# ChemAI 🧪: Interactive 3D Chemistry Visualizer & Local AI Tutor

ChemAI is a powerful, locally-hosted, interactive 3D chemistry laboratory. It combines modern web graphics (React Three Fiber) with computational chemistry (RDKit) and a locally fine-tuned AI (Qwen 2.5 3B via Ollama) to visualize, animate, and explain complex chemical reactions entirely on your own machine.

## ✨ Core Features
- **3D Periodic Table & Atomic Explorer**: Click any element to visualize its atomic structure in full 3D and receive instant, dynamically generated AI explanations of its properties.
- **Molecule Studio**: Enter any SMILES string or chemical name, and ChemAI computes the 3D geometry using RDKit and renders it in real-time.
- **Reaction Simulation Chamber**: Watch step-by-step 3D animations of chemical reactions (e.g., SN2, Aldol Condensations). The camera tracks transition states, breaking/forming bonds, and electron transfer arcs.
- **Local AI Chemistry Tutor**: A fully local Qwen 2.5 3B model, fine-tuned specifically on chemistry data. It provides in-depth, contextually aware follow-up Q&A and avoids external API costs.
- **Dynamic Context Injection**: The backend enriches LLM prompts with ground-truth data so the AI stays strictly within the domain of chemistry.

## 🛠️ Technology Stack

### Frontend (React + Vite + TypeScript)
- **3D Graphics**: `three.js` and `@react-three/fiber` for high-performance 3D rendering.
- **Styling**: `Tailwind CSS` for a stunning, glassmorphism-inspired dark mode UI.
- **Architecture**: A modular, multi-tab interface (Dashboard, Elements, Molecules, Reactions, Chatbot).

### Backend (FastAPI + Python)
- **Web Server**: `FastAPI` (via `uvicorn`) providing blazing-fast REST endpoints.
- **Computational Engine**: `RDKit` for generating valid chemical geometries, calculating SMILES, and mapping reaction coordinate bonds.
- **Local LLM Engine**: `Ollama` running a custom `.gguf` fine-tuned model (`chem-qwen`).

## 🚀 Setup & Installation

### 1. Prerequisites
- **Node.js** (v18+)
- **Python** (3.10+)
- **Ollama** installed locally

### 2. Configure the Local AI (Ollama)
1. Download the custom fine-tuned weights (`qwen2.5-3b.Q4_K_M.gguf`).
2. Run the included `Modelfile` to create the model in Ollama:
   ```bash
   ollama create chem-qwen -f Modelfile
   ```

### 3. Setup the Backend
Navigate to the `backend` directory, install dependencies, and start the FastAPI server:
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```
*(Note: If you wish to use the Google Gemini fallback API, copy `.env.example` to `.env` and add your API key).*

### 4. Setup the Frontend
Navigate to the `frontend` directory, install Node packages, and start the Vite dev server:
```bash
cd frontend
npm install
npm run dev
```

### 5. Start Exploring
Open your browser and navigate to `http://localhost:3000`. You're ready to explore chemistry in 3D!

## 🤖 About the Custom Fine-Tuned Model
ChemAI leverages a Qwen 2.5 (3B parameter) model that was fine-tuned on a custom dataset of chemical reactions, SMILES strings, and atomic properties using Google Colab and the Unsloth library. It was exported as a 4-bit quantized `GGUF` file to run efficiently on local CPU resources without requiring a dedicated GPU.
