# ChemAI: Interactive 3D Molecule and Reaction Visualization

**Madhavan D**¹*, **Kovendan P S**¹*, **Padmacharan P S**¹*, **Suresh Y**²*, **Dr. J. Senthil Kumar**²*, **Mohanraj V**²*, **Selvaraj Kesavan**³  
¹ *Department of Artificial Intelligence and Data Science, Sona College of Technology, Salem, Tamil Nadu, India* (`madhavan.ads23@gmail.com`, `kovendanable@gmail.com`, `pspadmacharan152@gmail.com`)  
² *Department of Information Technology, Sona College of Technology, Salem, Tamil Nadu, India* (`ysuresh33@gmail.com`, `jsenthil10@gmail.com`, `vmohanraj06@gmail.com`)  
³ *Solution Architect, DXC Technology, Bangalore, Karnataka, India* (`selvarajkesavan@gmail.com`)  

---

### Abstract
In chemistry education, students commonly encounter chemical formulas in textbooks long before developing an intuitive grasp of three-dimensional molecular architecture. This paper presents **ChemAI**, an open-access web platform engineered to transform conversational natural language prompts into interactive 3D conformations and phased reaction mechanisms. Rather than allowing a generative language model to hallucinate spatial coordinates, ChemAI decouples semantic extraction from physical modeling: a locally hosted, fine-tuned 3B-parameter language model (served through Ollama) extracts user intent into a compact JSON schema, while RDKit deterministically constructs, validates, and energy-minimizes all 3D geometries. Chemical reactions are simulated via 41 curated animation templates featuring explicit transition-state geometries, electron-displacement arcs, and an educational kinetics engine governed by the Arrhenius relation. Using QLoRA, we fine-tuned Qwen2.5-3B-Instruct across 1,077 synthetic chemistry prompts and benchmarked it against 172 held-out queries on a consumer laptop equipped with an entry-level 4 GB GPU. Empirical results show that fine-tuning elevated end-to-end parsing accuracy from 20.3% to 59.9% at a median response latency of 0.92 seconds. Crucially, error analysis revealed a critical limitation regarding structural identity: 83% of incorrect molecule predictions were syntactically valid SMILES strings that satisfied RDKit's chemical valence filters yet corresponded to entirely different compounds. Furthermore, prepending a rule-based shortcut to bypass the model proved counterproductive, inadvertently reducing reaction template classification accuracy from 68.3% down to 36.6%.

**Keywords**—chemistry education, 3D molecular visualization, small language models, LoRA, RDKit, structured output

---

## I. INTRODUCTION

A conventional two-dimensional formula such as $\text{CH}_3\text{CH}_2\text{OH}$ conveys atomic composition and connectivity, but reveals virtually nothing about spatial dihedral angles, steric hindrance, or conformational dynamics. Similarly, balanced reaction equations summarize stoichiometric conservation without illustrating how electron pairs migrate or how nuclei displace across potential energy surfaces. While web-based graphics toolkits have advanced considerably, contemporary browser visualizers typically demand pre-computed coordinate files (e.g., PDB, SDF) or specialized database accession keys [1], [2]. Consequently, novice learners who know only common nomenclature must navigate external chemical databases before inspecting a three-dimensional model.

Recent developments in Large Language Models (LLMs) suggest natural language interfaces could bridge this pedagogical barrier. Nevertheless, direct text-to-coordinate generation remains deeply problematic. When prompted to generate 3D Cartesian coordinates or raw Simplified Molecular Input Line Entry System (SMILES) strings from parametric memory [3], language models frequently hallucinate non-physical geometries, invalid valence bonds, or plausible structures that correspond to entirely different chemical species.

To overcome these structural pitfalls, ChemAI enforces a strict architectural boundary: **the language model is never permitted to determine spatial geometry**. Instead, its operational scope is confined strictly to semantic extraction. The model translates the user's natural language input into a validated, schema-compliant JSON payload containing the request type, recognized compound name, SMILES descriptor, and confidence score. Downstream, the deterministic cheminformatics library RDKit [4] validates the SMILES representation, saturates explicit hydrogens, embeds distance geometry, and computes relaxed 3D coordinates. For reaction inquiries, the model merely identifies which of the 41 pre-built mechanistic templates matches the user's inquiry. The entire pipeline functions without external cloud dependencies, utilizing a 4-bit quantized 3B-parameter model deployed locally on edge hardware via Ollama [5].

Beyond individual molecule and reaction exploration, the platform provides an interactive periodic table with procedural 3D atomic orbital visualizations, a context-grounded AI chemistry tutor, and interactive reaction-condition sliders (temperature, pressure, reagent concentration, solvent type, and catalyst). The primary contributions of this work include:

1. **A grounded hybrid architecture** wherein a local fine-tuned small language model handles semantic intent extraction while RDKit deterministically computes all 3D molecular coordinates.
2. **A curated library of 41 reaction mechanism templates**, each featuring staged 3D transitions (reactant approach, transition states, electron-flow arcs, and partial charges) paired with an educational kinetics simulator.
3. **An empirical dataset and benchmark**, comprising 1,077 training examples and 172 held-out evaluation prompts testing out-of-distribution molecules and paraphrased reactions.
4. **A systematic performance evaluation on consumer 4 GB GPU hardware**, providing an unvarnished analysis of failure modes—specifically the disparity between SMILES syntactic validity and chemical identity.

The remainder of this report surveys related literature (Section II), outlines system requirements (Section III), details the architecture (Section IV), explains methodology and fine-tuning (Section V), describes software implementation (Section VI), analyzes empirical benchmarks (Section VII), discusses findings and limitations (Sections VIII–IX), and presents concluding remarks (Section X).

---

## II. RELATED WORK

### A. Web-Based Molecular Graphics Viewers
Libraries such as 3Dmol.js [1] and the NGL Viewer [2] brought hardware-accelerated WebGL molecular graphics directly to client browsers without third-party plugins. However, these tools remain strictly passive rendering engines: they require users to furnish pre-existing coordinate files or chemical accession numbers. ChemAI builds on modern WebGL rendering via Three.js, but augments the viewer with a natural language conversational frontend and an interactive mechanistic reaction layer.

### B. Language Models Integrated with Chemical Tools
Pioneering frameworks like ChemCrow [6] demonstrated that augmenting LLMs with external computational tools allows models to synthesize organic molecules and automate multi-step laboratory workflows. ChemAI adopts an analogous separation of concerns, tailored for lightweight educational execution: language models manage semantic ambiguity, while deterministic cheminformatics algorithms enforce physical and chemical laws.

### C. Parameter-Efficient Fine-Tuning of Small Models
Fine-tuning full parameter sets on consumer hardware is computationally intractable. Low-Rank Adaptation (LoRA) [7] mitigates this by freezing base model weights and optimizing low-rank decomposition matrices within transformer attention layers. QLoRA [8] further compresses base weights into 4-bit NormalFloat representations with double quantization, enabling fine-tuning of multi-billion parameter networks on modest GPUs. We build upon Qwen2.5-3B-Instruct [9], which offers a favorable balance between parameter efficiency and structured reasoning.

### D. Syntactic Validity versus Chemical Identity
Prior investigations have documented that chemical language models frequently output malformed SMILES strings. While certain researchers suggest invalid strings act as a useful probabilistic filter against low-confidence samples [10], others have engineered grammar-constrained decoders to guarantee 100% syntactic validity [11]. However, recent findings highlight a deeper dilemma: GPT-4, when evaluated on text-to-molecule benchmarks, produced valid SMILES strings for ~90% of prompts, yet matched the actual target molecule in only 28% of cases [11]. Syntactic compliance does not ensure chemical ground truth. In educational settings, where a requested compound has an unequivocal identity, evaluating exact structural identity is paramount.

---

## III. PROBLEM STATEMENT AND SYSTEM REQUIREMENTS

Our primary design objective is to enable learners to request chemical entities or reaction pathways using colloquial language and immediately explore physically accurate 3D models—without cloud subscription costs, privacy exposure, or vulnerability to language model hallucinations.

To satisfy this didactic goal, the system must meet several functional criteria:
- **Input Flexibility**: Accept systematic IUPAC nomenclature, trivial names, molecular formulas, raw SMILES strings, and conversational reaction queries.
- **Cheminformatics Rigor**: Deterministically construct verified 3D conformers with accurate bond lengths and stereochemistry.
- **Dynamic Simulation**: Render phased reaction steps (approach, transition state, product separation) with interactive pause, scrubbing, and speed adjustment.
- **Condition Exploration**: Enable real-time manipulation of thermodynamic and kinetic variables (temperature, pressure, concentration, solvent polarity, catalyst).
- **Edge Feasibility**: Operate completely offline within a consumer laptop equipped with $\le$ 4 GB VRAM, verifying model output against strict schemas under deterministic random seeds.

---

## IV. SYSTEM ARCHITECTURE

As illustrated in Figure 1, ChemAI is structured into four decoupled layers. The presentation tier is an interactive single-page application built with React 19, TypeScript, and Three.js [12]. The client communicates with a FastAPI Python backend via REST endpoints. The backend bifurcates operations into a probabilistic intent-parsing subsystem and a deterministic chemistry engine powered by RDKit. The codebase comprises roughly 2,500 lines of application Python (excluding unit tests) and 4,700 lines of front-end TypeScript.

```
+-------------------------------------------------------------------------+
|                              CLIENT LAYER                               |
|       React 19 + TypeScript + Three.js / React Three Fiber              |
|  [Dashboard]  [3D Elements]  [Molecule Studio]  [Reaction Chamber] [Chat] |
+------------------------------------+------------------------------------+
                                     | HTTP REST API
+------------------------------------v------------------------------------+
|                             REST INTERFACE                              |
|          FastAPI Endpoints: /visualize, /kinetics, /elements, /chat     |
|          Pydantic Schema Validation & Request Filtering                 |
+-------------------+--------------------------------+--------------------+
                    |                                |
       (Probabilistic Parsing)             (Deterministic Computation)
+-------------------v----------------+  +------------v--------------------+
|        INTENT-PARSING LAYER        |  |        CHEMISTRY ENGINE         |
|  - Rule-Based Fast Path (Conf>=0.8)|  |  - RDKit SMILES Parsing         |
|  - Fine-Tuned Qwen2.5-3B (Ollama)  |  |  - ETKDGv3 3D Embedding         |
|  - JSON-Constrained Decoding       |  |  - MMFF94 / UFF Energy Min.     |
|  - Fallback Intent Handling        |  |  - 41 Reaction JSON Templates   |
+------------------------------------+  |  - Arrhenius Kinetics Simulator |
                                        +---------------------------------+
```
*Figure 1: High-level architectural schematic of ChemAI. The probabilistic natural language subsystem is decoupled from deterministic geometry calculation and physical simulation.*

### A. Client Layer
The front end provides five functional modules: an analytical dashboard, a 3D periodic table, a molecular conformer viewer, a reaction animation chamber, and an interactive chemistry tutor. Molecules are rendered as Corey-Pauling-Koltun (CPK) colored spheres interconnected by bond cylinders, supported by full orbit, pan, and zoom controls. The reaction chamber renders intermediate geometries alongside real-time kinetic parameter sliders.

### B. REST Interface
The backend defines explicit endpoints: `/visualize` for structural and reaction requests, `/kinetics` for dynamic rate calculations, `/elements` for atomic data, `/chat` for context-grounded tutoring, and explanation services for element/reaction summaries. All payloads are parsed through strict Pydantic v2 schemas, immediately discarding malformed requests prior to chemistry processing.

### C. Intent-Parsing Layer
This layer translates natural text into structured parameters, combining an initial rule-based heuristic check with the fine-tuned local language model. It represents the only probabilistic component of the system.

### D. Chemistry Engine
The chemistry engine executes strictly deterministic routines: validating SMILES syntax, embedding 3D conformers via distance geometry, performing empirical force-field energy minimization, loading reaction keyframes, and calculating rate constants. Because it contains no stochastic neural components, identical input parameters invariably yield identical 3D geometries.

---

## V. METHODS

### A. Intent Parsing Workflow
When a query reaches the server, it first passes through a lightweight rule-based fast path. This heuristic engine consults a dictionary of common chemical compounds and evaluates keyword overlaps across the 41 reaction templates. If the rule engine matches an entry with confidence $\ge 0.8$, the structured intent is dispatched immediately. 

Queries with lower confidence are routed to the fine-tuned Qwen2.5-3B-Instruct model hosted in Ollama. Inference is executed with a standardized system prompt and temperature set to 0, enforcing JSON-constrained decoding. Output payloads must strictly conform to a Pydantic schema specifying the request category (`molecule` vs. `reaction`), recognized name, SMILES string, reactant/product arrays, and an estimated confidence value. Outputs violating this schema are rejected, triggering an automatic fallback to heuristic parsing.

### B. Training Data Generation and Fine-Tuning
The model was fine-tuned for a single objective: mapping heterogeneous user queries into valid JSON intent schemas. We algorithmically synthesized 1,170 training pairs, reserving 1,077 for training and 93 for internal validation. As detailed in Table I, the dataset encompasses 111 distinct molecules, 41 reaction mechanisms, and 97 out-of-scope non-chemical prompts mapped to an `"unsupported"` flag. Every SMILES string and chemical formula underwent automated cross-verification through RDKit prior to inclusion.

#### TABLE I: COMPOSITION OF SYNTHETIC TRAINING SAMPLES
| Request Type | Number of Examples |
| :--- | :---: |
| Specific molecule names (trivial and IUPAC) | 511 |
| Molecular formulas | 55 |
| Raw SMILES strings | 51 |
| Paraphrased reaction requests (across 41 templates) | 363 |
| Out-of-scope / adversarial queries | 97 |
| **Total Training Set** | **1,077** |

Fine-tuning was conducted using Unsloth [13] on a free-tier Google Colab cloud GPU environment. LoRA adapters were applied across all attention and feed-forward projection matrices (`q_proj`, `k_proj`, `v_proj`, `o_proj`, `gate_proj`, `up_proj`, `down_proj`). Cross-entropy loss was calculated exclusively on completion tokens representing the assistant's JSON response, masking input prompt tokens. Optimization completed in 405 gradient steps over 18.8 minutes. The resulting weights were merged and exported to 4-bit `Q4_K_M` GGUF format (~1.8 GB) and imported into Ollama with a 2,048-token context window and a 256-token generation ceiling.

#### TABLE II: HYPERPARAMETER CONFIGURATION FOR QLoRA FINE-TUNING
| Hyperparameter | Value |
| :--- | :--- |
| Base Architecture | Qwen2.5-3B-Instruct (4-bit quantized) |
| LoRA Rank ($r$) / Alpha ($\alpha$) / Dropout | 16 / 16 / 0.0 |
| Epochs (Optimizer Steps) | 3 (405 steps) |
| Effective Batch Size | 8 (per-device batch 4 $\times$ 2 gradient accumulation) |
| Learning Rate / Schedule | $2 \times 10^{-4}$ / Linear decay |
| Warm-Up Period | 10 steps |
| Optimizer | 8-bit AdamW |
| Wall-Clock Training Time | 18.8 minutes |
| Deployed Quantization | GGUF `Q4_K_M` (1.8 GB) |

### C. Three-Dimensional Conformation Generation
Upon receiving a validated SMILES string, RDKit populates all explicit hydrogen atoms. Initial 3D Cartesian coordinates are embedded using Experimental-Torsion Distance Geometry with Knowledge-based Constraints (ETKDGv3) [14], [15], initialized with a fixed random seed of 42 to ensure deterministic reproducibility. The resulting conformation is energy-minimized using the Merck Molecular Force Field (MMFF94) [16] up to 500 iterations. If parameters are unavailable for specific heteroatoms or inorganic centers, the pipeline automatically falls back to the Universal Force Field (UFF) [17]. Relaxed atomic coordinates, formal charges, hybridization states, and covalent bond orders are packaged as JSON and returned to the client.

### D. Reaction Mechanisms and Procedural Animation
The platform incorporates 41 curated reaction mechanisms stored as modular JSON documents. Each template contains balanced chemical equations, participant SMILES strings, designated reaction classifications, and staged keyframe trajectories. Table III catalogs the distribution across fundamental reaction families. In the client viewport, reactant coordinates smoothly interpolate across sequential reaction stages: reactant approach, transition-state alignment, electron redistribution, and product departure. Where specified in the template, procedural curved arrows and localized partial charges highlight dynamic electron density shifts.

#### TABLE III: REACTION TEMPLATES ORGANIZED BY MECHANISTIC FAMILY
| Reaction Category | Count | Illustrative Example |
| :--- | :---: | :--- |
| Electrophilic / Nucleophilic Addition | 7 | Acid-catalyzed hydration of ethylene |
| Bimolecular Nucleophilic Substitution ($\text{S}_\text{N}2$) | 4 | $\text{CH}_3\text{Br} + \text{OH}^- \rightarrow \text{CH}_3\text{OH} + \text{Br}^-$ |
| Acid–Base Neutralization | 4 | $\text{HCl} + \text{NaOH} \rightarrow \text{NaCl} + \text{H}_2\text{O}$ |
| Hydrocarbon Combustion | 4 | Complete oxidation of methane ($\text{CH}_4 + 2\text{O}_2$) |
| Condensation / Substitution | 3 | Fischer esterification of benzoic acid |
| Elimination ($\text{E}1 / \text{E}2$) | 3 | Base-induced $\text{E}2$ dehydrohalogenation of bromoethane |
| Alcohol Oxidation | 3 | Ethanol conversion to acetaldehyde |
| Catalytic Redox | 2 | Contact process ($\text{SO}_2 \rightarrow \text{SO}_3$ over $\text{V}_2\text{O}_5$) |
| Electrophilic Aromatic Substitution | 2 | Friedel–Crafts alkylation and acylation |
| Industrial Reforming | 2 | Steam methane reforming ($\text{CH}_4 + \text{H}_2\text{O} \rightarrow \text{CO} + 3\text{H}_2$) |
| Miscellaneous (7 distinct classes) | 7 | Aldol condensation, Diels–Alder $[4+2]$, Haber process |
| **Total Curated Library** | **41** | — |

### E. Educational Reaction Kinetics Simulator
Reaction rates are modeled after the empirical Arrhenius relationship:
$$k = A \exp\left(-\frac{E_a}{R T}\right) \tag{1}$$

Each reaction family is assigned an authentic baseline activation energy $E_a$ (e.g., 12 kJ/mol for diffusion-limited proton transfers, 75 kJ/mol for typical $\text{S}_\text{N}2$ substitutions, 120 kJ/mol for hydrocarbon combustion, and 150 kJ/mol for endothermic steam reforming). Catalytic interventions depress this barrier by 25 to 50 kJ/mol based on catalyst class, subject to a physical lower threshold of 10 kJ/mol. The simulator calculates an effective rate scalar relative to standard room conditions ($T_{\text{ref}} = 298.15\text{ K}$, 1.0 atm, 1.0 M, aqueous):
$$k_{\text{rel}} = f_T \cdot f_{\text{cat}} \cdot f_P \cdot f_{\text{solv}} \cdot f_c \tag{2}$$

where:
$$f_T = \exp\left[\frac{E_{a,\text{eff}}}{R}\left(\frac{1}{T_{\text{ref}}} - \frac{1}{T}\right)\right]$$

The pressure factor $f_P$ applies exclusively to gas-phase equilibria following Le Chatelier principles. Reagent concentration scales superlinearly as $c^{1.2}$. The solvent factor $f_{\text{solv}}$ reflects physical solvent effects: for bimolecular substitution ($\text{S}_\text{N}2$), polar aprotic media (e.g., acetone, DMSO) accelerate rates by $4.5\times$ through nucleophile desolvation, whereas polar protic media (e.g., ethanol, water) attenuate rates to $0.8\times$ due to hydrogen-bonding solvent cages. The calculated product is clamped to an animation velocity between $0.2\times$ and $3.5\times$. Table IV illustrates how dynamic condition changes modulate calculated kinetics for an $\text{S}_\text{N}2$ mechanism.

#### TABLE IV: SIMULATED KINETIC RATE MULTIPLIERS FOR $\text{S}_\text{N}2$ NUCLEOPHILIC SUBSTITUTION
| Experimental Condition | Effective $E_a$ (kJ/mol) | Relative Rate ($k_{\text{rel}}$) | Animation Speed |
| :--- | :---: | :---: | :---: |
| 25 °C, water (standard baseline) | 75.0 | 1.00 | $1.00\times$ |
| 50 °C, water (thermal acceleration) | 75.0 | 10.40 | $2.67\times$ |
| 75 °C, water (elevated thermal) | 75.0 | 77.10 | $3.50\times$ (clamped) |
| 25 °C, ethanol (polar protic solvent) | 75.0 | 0.80 | $0.83\times$ |
| 25 °C, acetone (polar aprotic solvent) | 75.0 | 4.50 | $2.22\times$ |
| 25 °C, 2.0 M reagent concentration | 75.0 | 2.30 | $1.45\times$ |
| 25 °C, active platinum catalyst | 30.0 | 93.50 | $3.50\times$ (clamped) |

---

## VI. SYSTEM IMPLEMENTATION

The front end is deployed on Node.js using React 19, Vite, TypeScript, Tailwind CSS, and `@react-three/fiber`. The server operates on Python 3.12 with FastAPI, Uvicorn, and Pydantic v2. HTTP calls between the backend and local Ollama daemon are sustained through a persistent connection pool with keep-alive headers to minimize per-request TCP handshakes. The complete project repository is accessible at [GitHub: KoPS-14/chemistry-3D-visualizer](https://github.com/KoPS-14/chemistry-3D-visualizer).

A conversational chemistry tutor is embedded alongside the visualizer tabs. The tutor incorporates grounding context extracted from localized element and reaction datasets, truncates verbose generations, and enforces strict post-processing to purge raw LaTeX syntax artefacts (converting `\approx` to $\approx$ and LaTeX fractions to clean Unicode notation). While optional cloud fallbacks are supported, all empirical evaluations in this study were executed using the local Qwen model.

---

## VII. EXPERIMENTAL EVALUATION

### A. Experimental Setup and Benchmark Dataset
To rigorously evaluate model generalizability, we constructed a held-out benchmark of 172 natural language prompts, detailed in Table V. Crucially, 58 molecule queries involve compounds that were never present in training data. The 41 reaction prompts represent conversational paraphrases targeting our closed template library. Out-of-scope prompts probe the system's ability to reject irrelevant user inputs.

#### TABLE V: COMPOSITION OF THE HELD-OUT TEST BENCHMARK
| Evaluation Subset | Number of Prompts | Evaluation Objective |
| :--- | :---: | :--- |
| Unseen molecular nomenclature | 58 | Zero-shot generalized entity recognition |
| Seen molecules with novel paraphrasing | 30 | Robustness to syntactic phrasing variance |
| Molecular formulas | 15 | Mapping chemical formulas to authentic connectivity |
| Raw SMILES strings | 8 | Direct string parsing and bypass fidelity |
| Paraphrased reaction requests | 41 | Robustness over closed template set |
| Out-of-scope / adversarial queries | 20 | Intent filtering and false-positive rejection |
| **Total Evaluation Dataset** | **172** | — |

**Evaluation Criteria**: A molecule prediction is graded correct if the pipeline extracts the proper entity class and yields a canonical, stereochemistry-stripped SMILES string that matches the reference standard. A reaction query is scored correct if all canonical reactant and product sets match the ground truth. Out-of-scope inputs are scored correct when successfully rejected. Statistical comparisons report 95% Wilson score confidence intervals across four pipeline variations: (1) rule-based heuristic parsing alone, (2) untuned base Qwen2.5-3B-Instruct, (3) fine-tuned Qwen2.5-3B-Instruct alone, and (4) the combined hybrid pipeline.

All experiments were executed on an off-the-shelf Windows 11 laptop powered by an AMD 12-thread CPU and an NVIDIA GeForce RTX 2050 mobile GPU (4 GB VRAM, driver version 581.86), utilizing Ollama 0.35.1, Python 3.12.10, and RDKit 2026.03.6. Inference was evaluated at temperature 0 after three warm-up queries.

### B. Fine-Tuning Convergence
Training loss declined precipitously from 0.68 at step 10 to below 0.01 by the midpoint of epoch 2. Validation loss similarly dropped across epochs (0.021, 0.0034, and 0.0015). While this rapid convergence demonstrates proficient acquisition of the target JSON schema syntax, internal validation splits derived from identical synthetic templates do not measure true chemical generalization. The held-out benchmark provides the definitive assessment.

### C. Parsing Accuracy Across Pipeline Configurations
Table VI summarizes classification accuracy across all 172 test prompts. Fine-tuning markedly improved overall parsing accuracy from 20.3% (untuned baseline) to 59.9% ($p < 0.001$ via two-tailed exact McNemar paired test). A substantial portion of this improvement reflects structural schema compliance: the untuned base model produced malformed non-JSON text or schema violations on 28 of 172 prompts, whereas the fine-tuned model maintained a 0% schema violation rate. Additionally, the fine-tuned model achieved a perfect 100% rejection rate across all 20 out-of-scope adversarial prompts.

#### TABLE VI: PARSING ACCURACY (%) ON THE 172 HELD-OUT BENCHMARK PROMPTS
| Evaluation Category (Sample Count) | Rules Only | Untuned Qwen2.5-3B | Fine-Tuned Model | Hybrid Architecture |
| :--- | :---: | :---: | :---: | :---: |
| Seen Molecules, Novel Phrasing ($n=30$) | 0.0% | 0.0% | **56.7%** | **56.7%** |
| Unseen Molecules ($n=58$) | 22.4% | 12.1% | 41.4% | **46.6%** |
| Molecular Formulas ($n=15$) | 6.7% | 6.7% | **80.0%** | **80.0%** |
| Raw SMILES Strings ($n=8$) | **100.0%** | **100.0%** | 75.0% | **100.0%** |
| Reaction Species Matching ($n=41$) | 22.0% | 0.0% | **58.5%** | 48.8% |
| Reaction Template Selection ($n=41$) | 22.0% | 17.1% | **68.3%** | 36.6% |
| Out-of-Scope Prompts ($n=20$) | **100.0%** | 95.0% | **100.0%** | **100.0%** |
| **Composite Score ($n=172$, species-level)** | **29.7%** | **20.3%** | **59.9%** | **60.5%** |

*(Bold values highlight top performance per row. Composite metrics grade reaction queries by exact chemical species).*

### D. Molecular Identity and the "Valid-but-Wrong" Phenomenon
Accuracy on unseen molecule names reached 41.4%, while seen compounds with novel phrasing scored 56.7%. Crucially, accuracy exhibited a severe inverse correlation with molecular mass and complexity: performance was 66% for small structures ($\le 4$ non-hydrogen heavy atoms), 50% for intermediate structures (5–8 heavy atoms), and plummeted to 13.0% (3 of 23) for molecules containing $\ge 9$ heavy atoms.

More significantly, our analysis revealed a critical flaw regarding structural validity versus chemical identity: out of 52 molecule queries failed by the fine-tuned model, **43 instances (82.7%) produced syntactically flawless SMILES strings that were fully accepted by RDKit**. The chemistry engine embedded and rendered 3D coordinates for these outputs without raising errors—yet the rendered structures represented entirely different chemical entities. None of the 41 valid but incorrect answers shared the correct molecular formula with the target prompt, and their median Tanimoto fingerprint similarity to the ground-truth structure was only 0.15.

### E. Reaction Classification and the Router Bottleneck
When evaluated by template classification accuracy, the fine-tuned model operating independently correctly classified 28 of 41 reaction queries (68.3%, 95% CI: 53.0%–80.4%). However, routing requests through the front-end hybrid pipeline unexpectedly caused accuracy to drop to 15 of 41 (36.6%).

This sharp degradation occurred because the heuristic rule engine evaluated compound keywords before analyzing semantic intent. When users requested reactions involving familiar reagents (e.g., *"Show the hydration of ethylene to ethanol"*), the rule engine intercepted the single recognized compound keyword (*ethylene*) with confidence $> 0.8$ and immediately returned a solitary molecule view, preempting the language model from interpreting the broader reaction context. 

The 13 template classification errors made by the fine-tuned model alone fell into three categories:
- **Lexical Mismatch (8 queries)**: In 5 cases the model accurately recognized the underlying chemistry but formulated a synonym not indexed in template substrings; in 3 cases it selected an alternate known reaction.
- **Incorrect Template Indexing (4 queries)**: The model misassigned an overlapping reaction family.
- **Molecule Misclassification (1 query)**: A reaction prompt was misclassified as an individual molecule.

#### TABLE VII: BREAKDOWN OF TEMPLATE ERRORS IN THE FINE-TUNED MODEL ($n=13$)
| Failure Mode Category | Number of Occurrences |
| :--- | :---: |
| Template not found: correct reaction described using non-indexed synonyms | 5 |
| Template not found: distinct reaction mechanism retrieved | 3 |
| Incorrect reaction template assigned | 4 |
| Reaction prompt misclassified as a solitary molecule | 1 |

### F. Execution Latency and Physical Conformer Generation
On the 4 GB RTX 2050 mobile GPU, the fine-tuned model operated with a median latency of 0.92 seconds (95th percentile: 2.88 s), sustaining an average generation velocity of 45 tokens/second. The hybrid configuration yielded a slightly faster median latency of 0.85 s (95th percentile: 2.35 s) because 29.7% of unambiguous requests were resolved by heuristic lookup within 2 milliseconds.

Downstream RDKit processing proved exceptionally fast: conformer generation averaged a median of 1.75 ms per molecule (95th percentile: 7.8 ms) on a 12-thread CPU across all 130 species evaluated in this benchmark. MMFF94 force-field relaxation converged successfully for 119 species, while 11 complex structures automatically relaxed via UFF. Four charged ionic compounds containing disconnected counterions (e.g., $\text{NH}_4^+\text{Cl}^-$) resulted in overlapping Cartesian coordinates during distance geometry embedding, identifying an area requiring explicit steric separation logic.

#### TABLE VIII: END-TO-END EXECUTION LATENCY ON 4 GB GPU HARDWARE
| Processing Pipeline Step | Median Execution Time | 95th Percentile Latency |
| :--- | :---: | :---: |
| Fine-tuned model alone (Ollama inference) | 0.92 s | 2.88 s |
| Hybrid pipeline (rules pre-filtering + model) | 0.85 s | 2.35 s |
| RDKit deterministic 3D conformer embedding (per species) | 1.75 ms | 7.80 ms |

---

## VIII. DISCUSSION

### A. The Structural Illusion: Validity Versus Identity
Our most critical finding is the vast divergence between syntactic validity and semantic identity in small language models. When prompted for `"Show the 3D structure of caffeine"`, the fine-tuned model returned syntactically valid JSON with the SMILES string `NCc1ccccc1C(=O)O`. RDKit accepted this string without warnings, minimized its energy, and rendered a clean 3D structure. However, this structure corresponds to 2-(aminomethyl)benzoic acid ($\text{C}_8\text{H}_9\text{NO}_2$), bearing no structural resemblance to caffeine ($\text{C}_8\text{H}_{10}\text{N}_4\text{O}_2$).

Because the model was trained under strict JSON constraints, it learned to generate valid chemical graphs even when its internal parametric knowledge lacked the ground-truth connectivity for complex polycyclic molecules. Thus, **cheminformatics verification of SMILES syntax cannot validate user intent**. In practical applications, generative models should not be tasked with generating chemical structures from memory; instead, they should extract standardized chemical names to query authoritative databases (e.g., PubChem, ChEMBL), reserving generative capability for conversational assistance.

### B. The Pitfalls of Naive Rule-Model Hybridization
Although placing a rule-based shortcut before an LLM is standard practice to conserve compute, our empirical findings reveal that keyword heuristics frequently misinterpret complex queries. A query mentioning a chemical reagent in a reaction context was repeatedly intercepted by the fast path as a single-molecule request. A more robust routing design should reserve heuristic shortcuts exclusively for unambiguous structural descriptors (such as raw SMILES strings or CAS registry numbers), routing all natural language sentences to the contextual language model.

### C. Strengths of Grounded Computational Modeling
Decoupling generative language parsing from geometric coordinate calculation provided absolute protection against coordinate hallucination. Every structure displayed in ChemAI possesses verified covalent bond lengths, proper valence geometry, and relaxed torsional angles computed through empirical force fields. When errors occur, they manifest as structurally plausible representations of incorrect molecules rather than physically distorted, impossible geometry.

---

## IX. LIMITATIONS AND FUTURE WORK

Several technical constraints remain in the current implementation:
- **Closed Reaction Scope**: Reaction animations are constrained to our 41 pre-defined JSON templates. The system does not compute quantum mechanical reaction paths or dynamic transition-state energy surfaces ab initio.
- **Stoichiometric Visualization**: The 3D viewport renders a single exemplar molecule for each participant species; stoichiometric multipliers (e.g., $3\text{H}_2$ in ammonia synthesis) are indicated in the textual equation but not represented by multiple spatial entities in the scene.
- **Ionic Conformation Artifacts**: Salts and separated ion pairs are occasionally embedded with overlapping coordinates by RDKit distance geometry, necessitating secondary post-embedding repulsion algorithms.
- **Benchmark Specificity**: Test prompts were generated internally by the investigation team. Future evaluations must capture open-ended, real-world conversational prompts from university students.

Future iterations will incorporate an automated PubChem REST API lookup service to replace parametric SMILES recall, implement automated repulsion vectors to separate disconnected counterions, and expand the reaction library with peer-reviewed mechanisms evaluated across formal undergraduate chemistry cohorts.

---

## X. CONCLUSION

ChemAI demonstrates that an edge-deployable 3B-parameter language model, fine-tuned on ~1,000 synthetic examples and executed on a consumer 4 GB GPU, can reliably parse conversational chemistry requests into schema-valid representations at sub-second latencies. By delegating all geometric computation to deterministic cheminformatics algorithms (RDKit), the system prevents structural hallucinations and guarantees physical bond fidelity. 

However, our findings sound an important cautionary note for AI-assisted chemistry: small language models easily learn the syntactic structure of valid SMILES strings while failing to recall authentic molecular connectivity, frequently generating valid conformations of the wrong chemical species. Consequently, conversational chemical visualization systems must pair small language models with verified database accession pipelines rather than relying on parametric structural recall.

---

### ACKNOWLEDGMENTS
The authors thank the Department of Artificial Intelligence and Data Science and the Department of Information Technology at Sona College of Technology for providing computing facilities and laboratory resources. Technical guidance from industry mentors at DXC Technology is gratefully acknowledged.

---

## REFERENCES

[1] N. Rego and D. Koes, “3Dmol.js: molecular visualization with WebGL,” *Bioinformatics*, vol. 31, no. 8, pp. 1322–1324, 2015. https://doi.org/10.1093/bioinformatics/btu829  
[2] A. S. Rose, A. R. Bradley, Y. Valasatava, J. M. Duarte, A. Prlić, and P. W. Rose, “NGL viewer: web-based molecular graphics for large complexes,” *Bioinformatics*, vol. 34, no. 21, pp. 3755–3758, 2018. https://doi.org/10.1093/bioinformatics/bty419  
[3] D. Weininger, “SMILES, a chemical language and information system. 1. Introduction to methodology and encoding rules,” *J. Chem. Inf. Comput. Sci.*, vol. 28, no. 1, pp. 31–36, 1988. https://doi.org/10.1021/ci00057a005  
[4] G. Landrum et al., “RDKit: Open-source cheminformatics,” *Software*, 2024. [Online]. Available: https://www.rdkit.org  
[5] Ollama, “Ollama: Run large language models locally,” *Software*, 2024. [Online]. Available: https://ollama.com  
[6] A. M. Bran, S. Cox, O. Schilter, C. Baldassari, A. D. White, and P. Schwaller, “Augmenting large language models with chemistry tools,” *Nature Machine Intelligence*, vol. 6, pp. 525–535, 2024. https://doi.org/10.1038/s42256-024-00832-8  
[7] E. J. Hu et al., “LoRA: Low-rank adaptation of large language models,” in *Proc. Int. Conf. Learn. Represent. (ICLR)*, 2022. Available: https://arxiv.org/abs/2106.09685  
[8] T. Dettmers, A. Pagnoni, A. Holtzman, and L. Zettlemoyer, “QLoRA: Efficient finetuning of quantized LLMs,” in *Adv. Neural Inf. Process. Syst. (NeurIPS)*, vol. 36, 2023. Available: https://arxiv.org/abs/2305.14314  
[9] A. Yang et al., “Qwen2.5 technical report,” *arXiv preprint arXiv:2412.15115*, 2024. Available: https://arxiv.org/abs/2412.15115  
[10] M. A. Skinnider, “Invalid SMILES are beneficial rather than detrimental to chemical language models,” *Nature Machine Intelligence*, vol. 6, no. 4, pp. 437–448, 2024. https://doi.org/10.1038/s42256-024-00821-x  
[11] W. Tao et al., “How to make large language models generate 100% valid molecules?” in *Proc. Conf. Empirical Methods Natural Lang. Process. (EMNLP)*, 2025, pp. 26565–26580. Available: https://aclanthology.org/2025.emnlp-main.1350/  
[12] Three.js Authors, “three.js: JavaScript 3D library,” *Software*, 2024. [Online]. Available: https://threejs.org  
[13] Unsloth AI, “Unsloth: Fast and memory-efficient fine-tuning for LLMs,” *Software*, 2024. [Online]. Available: https://github.com/unslothai/unsloth  
[14] S. Riniker and G. A. Landrum, “Better informed distance geometry: Using what we know to improve conformation generation,” *J. Chem. Inf. Model.*, vol. 55, no. 12, pp. 2562–2574, 2015. https://doi.org/10.1021/acs.jcim.5b00654  
[15] S. Wang, J. Witek, G. A. Landrum, and S. Riniker, “Improving conformer generation for small rings and macrocycles based on distance geometry and experimental torsional-angle preferences,” *J. Chem. Inf. Model.*, vol. 60, no. 4, pp. 2044–2058, 2020. https://doi.org/10.1021/acs.jcim.0c00025  
[16] T. A. Halgren, “Merck molecular force field. I. Basis, form, scope, parameterization, and performance of MMFF94,” *J. Comput. Chem.*, vol. 17, no. 5–6, pp. 490–519, 1996. https://doi.org/10.1002/(SICI)1096-987X(199604)17:5/6<490::AID-JCC1>3.0.CO;2-P  
[17] A. K. Rappé, C. J. Casewit, K. S. Colwell, W. A. Goddard III, and W. M. Skiff, “UFF, a full periodic table force field for molecular mechanics and molecular dynamics simulations,” *J. Am. Chem. Soc.*, vol. 114, no. 25, pp. 10024–10035, 1992. https://doi.org/10.1021/ja00051a040  
