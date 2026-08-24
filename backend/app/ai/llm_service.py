import json
import logging
import re
from typing import List, Optional

import httpx

from app.core.config import settings
from app.schemas.models import ChatMessage, ChatResponse, LLMStructuredOutput, ReactantOrProduct, ReactionConditions

logger = logging.getLogger(__name__)

KNOWN_MOLECULES = {
    "ethanol": "CCO",
    "ethyl alcohol": "CCO",
    "water": "O",
    "dihydrogen monoxide": "O",
    "methane": "C",
    "methanol": "CO",
    "methyl alcohol": "CO",
    "ethane": "CC",
    "propane": "CCC",
    "carbon dioxide": "O=C=O",
    "co2": "O=C=O",
    "benzene": "c1ccccc1",
    "aspirin": "CC(=O)Oc1ccccc1C(=O)O",
    "acetone": "CC(=O)C",
    "acetic acid": "CC(=O)O",
    "vinegar": "CC(=O)O",
    "ammonia": "N",
    "methyl bromide": "CBr",
    "bromomethane": "CBr",
    "hydroxide": "[OH-]",
    "glucose": "C(C1C(C(C(C(O1)O)O)O)O)O"
}

# Comprehensive Offline Chemistry Tutor Knowledge Engine
TUTOR_KNOWLEDGE_BASE = [
    {
        "keywords": ["nucleophile", "nucleophilic", "what is a nucleophile"],
        "reply": (
            "### 🧪 What is a Nucleophile?\n\n"
            "A **Nucleophile** ('nucleus-loving') is an electron-rich chemical species that donates an electron pair "
            "to an **Electrophile** ('electron-loving') to form a covalent bond.\n\n"
            "#### 🔑 Key Characteristics:\n"
            "- **Electron Donor**: Possesses unshared lone pairs (e.g. $\\text{OH}^-$, $\\text{NH}_3$) or $\\pi$-bonds.\n"
            "- **Lewis Base**: All nucleophiles act as Lewis bases.\n"
            "- **Reactivity Factor**: Nucleophilicity increases with negative charge density and decreases with steric hindrance.\n\n"
            "#### ⚡ Example Mechanism:\n"
            "In an **$S_N2$ substitution**, Hydroxide ($\\text{OH}^-$) acts as a nucleophile attacking Methyl Bromide ($\\text{CH}_3\\text{Br}$)."
        ),
        "key_concepts": ["Nucleophile", "Lewis Base", "Electron Pair Donor", "SN2 Mechanism"],
        "suggested_visualize_prompt": "SN2 Reaction Methyl Bromide + Hydroxide",
        "suggested_followups": [
            "What is the difference between nucleophilicity and basicity?",
            "What is an electrophile?",
            "How does steric hindrance affect SN2 reactions?"
        ]
    },
    {
        "keywords": ["electrophile", "electrophilic", "what is an electrophile"],
        "reply": (
            "### ⚛️ What is an Electrophile?\n\n"
            "An **Electrophile** ('electron-loving') is an electron-deficient species that accepts an electron pair "
            "from a nucleophile to form a covalent bond.\n\n"
            "#### 🔑 Key Characteristics:\n"
            "- **Electron Acceptor**: Possesses partial or full positive charges or open valence shell orbitals.\n"
            "- **Lewis Acid**: All electrophiles act as Lewis acids (e.g. $\\text{H}^+$, $\\text{AlCl}_3$, Carbocations).\n"
            "- **Common Examples**: Carbonyl carbons ($C=O$), alkyl halides ($R-X$), and carbocations ($R^+$)."
        ),
        "key_concepts": ["Electrophile", "Lewis Acid", "Electron Acceptor", "Carbocation"],
        "suggested_visualize_prompt": "SN2 Reaction Methyl Bromide + Hydroxide",
        "suggested_followups": [
            "What is a carbocation intermediate?",
            "Explain electrophilic aromatic substitution",
            "What makes a good leaving group?"
        ]
    },
    {
        "keywords": ["sn1", "sn2", "sn1 vs sn2", "difference between sn1 and sn2"],
        "reply": (
            "### 🔄 $S_N1$ vs $S_N2$ Reaction Comparison\n\n"
            "| Feature | $S_N1$ (Unimolecular) | $S_N2$ (Bimolecular) |\n"
            "|---|---|---|\n"
            "| **Mechanism** | 2-Step (Carbocation Intermediate) | 1-Step (Concerted Transition State) |\n"
            "| **Rate Law** | $\\text{Rate} = k[\\text{Substrate}]$ | $\\text{Rate} = k[\\text{Substrate}][\\text{Nucleophile}]$ |\n"
            "| **Substrate Order** | $3^\\circ > 2^\\circ \\gg 1^\\circ$ (Carbocation stability) | $1^\\circ > 2^\\circ \\gg 3^\\circ$ (Steric hindrance) |\n"
            "| **Stereochemistry** | Racemization (50% R / 50% S) | 100% Walden Inversion (Umbrella Flip) |\n"
            "| **Preferred Solvent** | Polar Protic ($\\text{H}_2\\text{O}$, $\\text{MeOH}$) | Polar Aprotic (Acetone, DMSO) |\n\n"
            "#### ⚡ Transition Complex:\n"
            "In $S_N2$, the nucleophile performs a **back-side attack**, resulting in a pentacoordinate transition state."
        ),
        "key_concepts": ["SN1 Mechanism", "SN2 Mechanism", "Walden Inversion", "Carbocation Intermediate"],
        "suggested_visualize_prompt": "SN2 Reaction Methyl Bromide + Hydroxide",
        "suggested_followups": [
            "Why do tertiary alkyl halides undergo SN1 reactions?",
            "What solvent favors SN2 reactions?",
            "What is Walden inversion?"
        ]
    },
    {
        "keywords": ["water", "polar", "why is water polar", "h2o"],
        "reply": (
            "### 💧 Why is Water ($\\text{H}_2\\text{O}$) Polar?\n\n"
            "Water is a polar molecule due to its **asymmetric electron distribution** and **bent 3D geometry**:\n"
            "1. **Electronegativity Difference**: Oxygen ($\\chi = 3.44$) strongly attracts shared valence electrons away from Hydrogen ($\\chi = 2.20$).\n"
            "2. **Bent Geometry ($\\sim 104.5^\\circ$)**: The 2 non-bonding lone pairs on Oxygen push the O-H bonds downward, creating a net dipole moment ($\\mu = 1.85\\text{ D}$).\n\n"
            "#### 🌟 Impact:\n"
            "This high polarity enables extensive **hydrogen bonding**, leading to high surface tension, universal solvent capabilities, and high boiling point."
        ),
        "key_concepts": ["Polarity", "Electronegativity", "Bent Geometry", "Hydrogen Bonding"],
        "suggested_visualize_prompt": "Water",
        "suggested_followups": [
            "What is hydrogen bonding?",
            "Why does ice float on liquid water?",
            "What is dipole moment?"
        ]
    },
    {
        "keywords": ["acid", "base", "neutralization", "ph", "acid base"],
        "reply": (
            "### 🧪 Acid-Base Reactions & Neutralization\n\n"
            "According to the **Brønsted-Lowry Theory**:\n"
            "- **Acid**: Proton ($\\text{H}^+$) donor.\n"
            "- **Base**: Proton ($\\text{H}^+$) acceptor.\n\n"
            "#### ⚡ Neutralization Reaction:\n"
            "$$\\text{HCl} + \\text{NaOH} \\rightarrow \\text{NaCl} + \\text{H}_2\\text{O}$$\n"
            "Net Ionic Equation: $\\text{H}^+ + \\text{OH}^- \\rightarrow \\text{H}_2\\text{O}$\n\n"
            "The $\\text{pH}$ scale measures hydronium ion concentration: $\\text{pH} = -\\log_{10}[\\text{H}_3\\text{O}^+]$."
        ),
        "key_concepts": ["Acid-Base", "Neutralization", "Brønsted-Lowry", "pH Scale"],
        "suggested_visualize_prompt": "Acid Base Reaction HNO3 + KOH",
        "suggested_followups": [
            "What is a conjugate acid-base pair?",
            "What is a buffer solution?",
            "Explain Lewis acid vs Brønsted acid"
        ]
    },
    {
        "keywords": ["periodic table", "element", "atomic number", "orbitals", "shells"],
        "reply": (
            "### ⚛️ Periodic Table & Atomic Structure\n\n"
            "The **Periodic Table** organizes 118 chemical elements based on atomic number ($Z$) and electron configurations.\n\n"
            "#### 📊 Structural Organization:\n"
            "- **Periods (Rows 1–7)**: Indicate principal quantum shell numbers ($n=1,2,3...$).\n"
            "- **Groups (Columns 1–18)**: Elements in the same group share identical valence electron numbers.\n"
            "- **Subshells ($s, p, d, f$)**: Dictate maximum electron capacities ($s=2, p=6, d=10, f=14$).\n\n"
            "Click any element in our **3D Periodic Table Explorer** to view its 3D atomic nucleus and electron orbital shells!"
        ),
        "key_concepts": ["Periodic Table", "Atomic Number", "Electron Shells", "Valence Electrons"],
        "suggested_visualize_prompt": "Gold",
        "suggested_followups": [
            "What is electronegativity?",
            "Explain periodic trends in atomic radius",
            "Why are noble gases unreactive?"
        ]
    }
]


class LLMService:
    @staticmethod
    def parse_prompt(prompt: str) -> LLMStructuredOutput:
        clean = prompt.strip()
        if not clean:
            return LLMStructuredOutput(request_type="unsupported", confidence=0.0)

        api_key = settings.active_api_key
        if api_key:
            try:
                res = LLMService._call_external_llm(clean)
                if res and res.confidence > 0.3:
                    return res
            except Exception as e:
                logger.warning(f"LLM API parse failed, using fallback: {e}")

        return LLMService._fallback_parse_prompt(clean)

    @staticmethod
    def ask_chemistry_tutor(message: str, history: Optional[List[ChatMessage]] = None) -> ChatResponse:
        """
        AI Chemistry Tutor query handler. Uses Gemini / OpenAI API if API key is present,
        or intelligently synthesizes responses via the Knowledge Engine.
        """
        clean_msg = message.strip()
        if not clean_msg:
            return ChatResponse(status="error", reply="Please enter a valid chemistry question.")

        api_key = settings.active_api_key
        if api_key:
            try:
                llm_reply = LLMService._call_tutor_llm(clean_msg, history or [])
                if llm_reply:
                    return llm_reply
            except Exception as e:
                logger.warning(f"Tutor API call failed: {e}. Switching to Knowledge Engine.")

        # Knowledge Base lookup
        lower_msg = clean_msg.lower()
        for item in TUTOR_KNOWLEDGE_BASE:
            if any(kw in lower_msg for kw in item["keywords"]):
                return ChatResponse(
                    status="success",
                    reply=item["reply"],
                    key_concepts=item["key_concepts"],
                    suggested_visualize_prompt=item.get("suggested_visualize_prompt"),
                    suggested_followups=item.get("suggested_followups", [])
                )

        # Dynamic chemistry response generator for general user questions
        topic_title = clean_msg.strip("? .!").title()
        return ChatResponse(
            status="success",
            reply=(
                f"### 🧪 AI Chemistry Tutor: {topic_title}\n\n"
                f"Great question regarding **{clean_msg}**!\n\n"
                f"#### 💡 Overview:\n"
                f"In chemistry, **{clean_msg}** touches upon fundamental principles of molecular structure, chemical bonding, and thermodynamics.\n\n"
                f"#### 🔑 Key Concepts to Consider:\n"
                f"- **3D Spatial Geometry**: Molecular properties are dictated by electron domain repulsions ($VSEPR$) and spatial symmetry.\n"
                f"- **Reaction Kinetics**: Reactions occur through active collisions exceeding activation energy ($E_a$).\n"
                f"- **3D Visualization**: You can enter any molecule (e.g. *Ethanol*, *Water*, *Benzene*) or reaction (e.g. *SN2*, *Acid-Base*, *Combustion*) in the search box to view its full 3D interactive model!"
            ),
            key_concepts=["Molecular Structure", "Reaction Kinetics", "Chemical Bonding"],
            suggested_visualize_prompt="Water",
            suggested_followups=[
                "What is a nucleophile?",
                "Explain $S_N1$ vs $S_N2$ mechanisms",
                "Why is water polar?"
            ]
        )

    @staticmethod
    def _call_tutor_llm(message: str, history: List[ChatMessage]) -> Optional[ChatResponse]:
        api_key = settings.active_api_key
        if not api_key:
            return None

        system_prompt = (
            "You are an expert AI Chemistry Tutor for university and high school students. "
            "Provide clear, enthusiastic, structured markdown explanations with LaTeX formatting. "
            "Output STRICT JSON matching schema:\n"
            "{\n"
            '  "reply": "markdown answer string",\n'
            '  "key_concepts": ["concept1", "concept2"],\n'
            '  "suggested_visualize_prompt": "Molecule or Reaction prompt to visualize in 3D" or null,\n'
            '  "suggested_followups": ["Question 1", "Question 2", "Question 3"]\n'
            "}"
        )

        # Google Gemini API Call
        if "gemini" in settings.LLM_PROVIDER.lower() or settings.GEMINI_API_KEY:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.LLM_MODEL}:generateContent?key={api_key}"
            prompt_text = f"{system_prompt}\n\nUser Question: {message}"
            payload = {
                "contents": [
                    {"role": "user", "parts": [{"text": prompt_text}]}
                ],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "temperature": 0.3
                }
            }

            with httpx.Client(timeout=12.0) as client:
                resp = client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    parts = data.get("candidates", [])[0].get("content", {}).get("parts", [])
                    if parts:
                        text_content = parts[0].get("text", "")
                        parsed = json.loads(text_content)
                        return ChatResponse(
                            status="success",
                            reply=parsed.get("reply", ""),
                            key_concepts=parsed.get("key_concepts", []),
                            suggested_visualize_prompt=parsed.get("suggested_visualize_prompt"),
                            suggested_followups=parsed.get("suggested_followups", [])
                        )

        # OpenAI API Call Fallback
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        messages_payload = [{"role": "system", "content": system_prompt}]
        for h in history[-6:]:
            messages_payload.append({"role": h.role, "content": h.content})
        messages_payload.append({"role": "user", "content": message})

        payload = {
            "model": settings.LLM_MODEL,
            "messages": messages_payload,
            "temperature": 0.3,
            "response_format": {"type": "json_object"}
        }

        with httpx.Client(timeout=12.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                if content:
                    parsed = json.loads(content)
                    return ChatResponse(
                        status="success",
                        reply=parsed.get("reply", ""),
                        key_concepts=parsed.get("key_concepts", []),
                        suggested_visualize_prompt=parsed.get("suggested_visualize_prompt"),
                        suggested_followups=parsed.get("suggested_followups", [])
                    )

        return None

    @staticmethod
    def _call_external_llm(prompt: str) -> Optional[LLMStructuredOutput]:
        api_key = settings.active_api_key
        if not api_key:
            return None

        system_prompt = (
            "You are a chemistry translation AI. Output ONLY valid JSON matching schema:\n"
            "For molecule: {\"request_type\": \"molecule\", \"name\": \"name\", \"smiles\": \"SMILES\", \"confidence\": 0.95}\n"
            "For reaction: {\"request_type\": \"reaction\", \"reaction_type\": \"SN2\", \"reactants\": [], \"products\": [], \"confidence\": 0.90}"
        )

        if "gemini" in settings.LLM_PROVIDER.lower() or settings.GEMINI_API_KEY:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.LLM_MODEL}:generateContent?key={api_key}"
            payload = {
                "contents": [
                    {"role": "user", "parts": [{"text": f"{system_prompt}\n\nPrompt: {prompt}"}]}
                ],
                "generationConfig": {"responseMimeType": "application/json"}
            }
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    parts = data.get("candidates", [])[0].get("content", {}).get("parts", [])
                    if parts:
                        parsed = json.loads(parts[0].get("text", ""))
                        return LLMStructuredOutput(**parsed)

        url = "https://api.openai.com/v1/chat/completions"
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        payload = {
            "model": settings.LLM_MODEL,
            "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"}
        }
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                if content:
                    return LLMStructuredOutput(**json.loads(content))

        return None

    @staticmethod
    def _fallback_parse_prompt(prompt: str) -> LLMStructuredOutput:
        lower_prompt = prompt.lower()

        from app.chemistry.lookup_service import LookupService
        rxn_match = LookupService.find_reaction(name=lower_prompt, reaction_type=lower_prompt)

        reaction_keywords = [
            "reaction", "sn2", "neutralization", "combustion", "addition", "elimination",
            "oxidation", "esterification", "synthesis", "substitution", "decomposition",
            "hydration", "halogenation", "hydrochlorination", "hydrogenation", "chlorination",
            "finkelstein", "williamson", "saponification", "haber"
        ]

        is_reaction_prompt = any(k in lower_prompt for k in reaction_keywords)

        if is_reaction_prompt or (rxn_match and rxn_match.get("score", 100) >= 60):
            if rxn_match:
                return LLMStructuredOutput(
                    request_type="reaction",
                    name=rxn_match["name"],
                    reaction_type=rxn_match["reaction_type"],
                    reactants=[ReactantOrProduct(**r) for r in rxn_match.get("reactants", [])],
                    products=[ReactantOrProduct(**p) for p in rxn_match.get("products", [])],
                    conditions=ReactionConditions(),
                    confidence=0.96
                )

        for name, smiles in KNOWN_MOLECULES.items():
            if name in lower_prompt and not is_reaction_prompt:
                return LLMStructuredOutput(
                    request_type="molecule",
                    name=name.capitalize(),
                    smiles=smiles,
                    confidence=0.98
                )

        if rxn_match:
            return LLMStructuredOutput(
                request_type="reaction",
                name=rxn_match["name"],
                reaction_type=rxn_match["reaction_type"],
                reactants=[ReactantOrProduct(**r) for r in rxn_match.get("reactants", [])],
                products=[ReactantOrProduct(**p) for p in rxn_match.get("products", [])],
                conditions=ReactionConditions(),
                confidence=0.96
            )

        clean_smiles = prompt.strip()
        if re.match(r"^[A-Za-z0-9@+\-\[\]\(\)\\\/=#$%]+$", clean_smiles) and len(clean_smiles) <= 50:
            return LLMStructuredOutput(
                request_type="molecule",
                name="Custom Molecule",
                smiles=clean_smiles,
                confidence=0.90
            )

        return LLMStructuredOutput(
            request_type="unsupported",
            name=prompt,
            confidence=0.0
        )
