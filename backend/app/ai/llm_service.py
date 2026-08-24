import json
import logging
import re
from typing import List, Optional

import httpx

from app.core.config import settings
from app.schemas.models import ChatMessage, ChatResponse, LLMStructuredOutput, ReactantOrProduct, ReactionConditions

logger = logging.getLogger(__name__)

# Fallback chemical dictionary for common educational molecules
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

# Rule-based fallback Knowledge Base for Chemistry Tutor Q&A
TUTOR_KNOWLEDGE_BASE = [
    {
        "keywords": ["nucleophile", "nucleophilic", "what is a nucleophile"],
        "reply": (
            "### 🧪 What is a Nucleophile?\n\n"
            "A **Nucleophile** ('nucleus-loving') is a chemical species that donates an electron pair "
            "to an **Electrophile** ('electron-loving') to form a chemical bond.\n\n"
            "#### 🔑 Key Properties:\n"
            "- **Electron-Rich**: Nucleophiles possess unshared lone pairs or $\\pi$-bonds.\n"
            "- **Charge**: Can be neutral (e.g. $\\text{H}_2\\text{O}$, $\\text{NH}_3$) or negatively charged (e.g. $\\text{OH}^-$, $\\text{CN}^-$, $\\text{Br}^-$).\n"
            "- **Lewis Base**: All nucleophiles act as Lewis bases.\n\n"
            "#### ⚡ Example Reactions:\n"
            "In an **$S_N2$ reaction**, hydroxide ion ($\\text{OH}^-$) acts as a nucleophile attacking the electrophilic carbon of bromomethane ($\\text{CH}_3\\text{Br}$)."
        ),
        "key_concepts": ["Nucleophile", "Lewis Base", "Electron Pair Donor", "SN2 Mechanism"],
        "suggested_visualize_prompt": "SN2 Reaction Methyl Bromide + Hydroxide",
        "suggested_followups": [
            "What is the difference between a nucleophile and a base?",
            "What is an electrophile?",
            "How does nucleophilicity change down the periodic table?"
        ]
    },
    {
        "keywords": ["electrophile", "electrophilic", "what is an electrophile"],
        "reply": (
            "### ⚛️ What is an Electrophile?\n\n"
            "An **Electrophile** ('electron-loving') is a chemical species that accepts an electron pair "
            "from a nucleophile to form a covalent bond.\n\n"
            "#### 🔑 Key Properties:\n"
            "- **Electron-Deficient**: Electrophiles have full or partial positive charges or vacant orbitals.\n"
            "- **Charge**: Neutral (e.g. $\\text{BF}_3$, $\\text{AlCl}_3$) or positively charged (e.g. $\\text{H}^+$, $\\text{NO}_2^+$).\n"
            "- **Lewis Acid**: All electrophiles act as Lewis acids."
        ),
        "key_concepts": ["Electrophile", "Lewis Acid", "Electron Acceptor"],
        "suggested_visualize_prompt": "SN2 Reaction Methyl Bromide + Hydroxide",
        "suggested_followups": [
            "What is a carbocation?",
            "Explain electrophilic aromatic substitution",
            "What makes a good leaving group?"
        ]
    },
    {
        "keywords": ["sn1", "sn2", "sn1 vs sn2", "difference between sn1 and sn2"],
        "reply": (
            "### 🔄 $S_N1$ vs $S_N2$ Reaction Mechanisms\n\n"
            "| Feature | $S_N1$ (Unimolecular) | $S_N2$ (Bimolecular) |\n"
            "|---|---|---|\n"
            "| **Steps** | 2-step (Carbocation intermediate) | 1-step (Concerted) |\n"
            "| **Kinetics** | Rate $= k[\\text{Substrate}]$ | Rate $= k[\\text{Substrate}][\\text{Nucleophile}]$ |\n"
            "| **Substrate Preference** | $3^\\circ > 2^\\circ \\gg 1^\\circ$ | $1^\\circ > 2^\\circ \\gg 3^\\circ$ |\n"
            "| **Stereochemistry** | Racemization (50% R / 50% S) | Walden Inversion (100% Inversion) |\n"
            "| **Solvent** | Polar Protic ($\\text{H}_2\\text{O}$, $\\text{EtOH}$) | Polar Aprotic (Acetone, DMSO) |\n\n"
            "#### ⚡ Transition State:\n"
            "In $S_N2$, the nucleophile attacks from the **back side**, forming a pentacoordinate transition state with a dynamic umbrella flip."
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
            "Water is a polar molecule due to two main reasons:\n"
            "1. **Electronegativity Difference**: Oxygen ($\\chi = 3.44$) is far more electronegative than Hydrogen ($\\chi = 2.20$), pulling shared electrons closer to Oxygen.\n"
            "2. **Bent Geometry**: Due to 2 lone pairs on Oxygen, water has a bent molecular geometry ($\\sim 104.5^\\circ$), preventing polar bond dipoles from canceling out."
        ),
        "key_concepts": ["Polarity", "Electronegativity", "Bent Geometry", "Dipole Moment"],
        "suggested_visualize_prompt": "Water",
        "suggested_followups": [
            "What is hydrogen bonding?",
            "Why does ice float on liquid water?",
            "What is dipole moment?"
        ]
    },
    {
        "keywords": ["periodic table", "element", "atomic number", "orbitals"],
        "reply": (
            "### ⚛️ Periodic Table & Atomic Structure\n\n"
            "The **Periodic Table** arranges all 118 chemical elements by increasing atomic number ($Z$).\n\n"
            "#### 📊 Organization:\n"
            "- **Periods (Rows 1–7)**: Indicate the number of electron shell rings occupied.\n"
            "- **Groups (Columns 1–18)**: Indicate valence electron configuration and chemical reactivity.\n"
            "- **Blocks ($s, p, d, f$)**: Categorize orbital electron subshells.\n\n"
            "Try clicking any element in the **3D Periodic Table Explorer** to inspect nucleus composition, shell ring counts, and orbiting electrons!"
        ),
        "key_concepts": ["Periodic Table", "Atomic Number", "Electron Shells", "Valence Electrons"],
        "suggested_visualize_prompt": "Gold",
        "suggested_followups": [
            "Explain periodic trends like ionization energy",
            "What is electronegativity?",
            "Why are noble gases inert?"
        ]
    }
]


class LLMService:
    @staticmethod
    def parse_prompt(prompt: str) -> LLMStructuredOutput:
        """
        Parses a natural-language chemistry prompt into strict structured JSON.
        Uses external LLM API if LLM_API_KEY is configured, else uses deterministic chemical fallback.
        """
        if not prompt or not prompt.strip():
            return LLMStructuredOutput(request_type="unsupported", confidence=0.0)

        if settings.LLM_API_KEY and len(settings.LLM_API_KEY.strip()) > 5:
            try:
                res = LLMService._call_external_llm(prompt.strip())
                if res and res.confidence > 0.3:
                    return res
            except Exception as e:
                logger.warning(f"LLM API call failed, falling back to rule-based parser: {e}")

        return LLMService._fallback_parse_prompt(prompt.strip())

    @staticmethod
    def ask_chemistry_tutor(message: str, history: Optional[List[ChatMessage]] = None) -> ChatResponse:
        """
        Processes conceptual chemistry queries and returns clear markdown AI explanations,
        key concept tags, 3D visualization prompts, and follow-up study questions.
        """
        clean_msg = message.strip()
        lower_msg = clean_msg.lower()

        # Attempt external API if key configured
        if settings.LLM_API_KEY and len(settings.LLM_API_KEY.strip()) > 5:
            try:
                llm_reply = LLMService._call_tutor_llm(clean_msg, history or [])
                if llm_reply:
                    return llm_reply
            except Exception as e:
                logger.warning(f"Tutor LLM call failed, falling back to rule-based tutor: {e}")

        # Rule-based fallback matching
        for item in TUTOR_KNOWLEDGE_BASE:
            if any(kw in lower_msg for kw in item["keywords"]):
                return ChatResponse(
                    status="success",
                    reply=item["reply"],
                    key_concepts=item["key_concepts"],
                    suggested_visualize_prompt=item.get("suggested_visualize_prompt"),
                    suggested_followups=item.get("suggested_followups", [])
                )

        # Generic default tutor answer for general questions
        return ChatResponse(
            status="success",
            reply=(
                f"### 🧪 AI Chemistry Tutor Response\n\n"
                f"Great chemistry question about **{clean_msg}**!\n\n"
                f"Chemistry studies matter, its properties, how and why substances combine or separate to form other substances, and how substances interact with energy.\n\n"
                f"#### 💡 Core Chemistry Fundamentals:\n"
                f"- **Substances & Molecules**: Atoms bind via covalent or ionic bonds to form stable 3D structures.\n"
                f"- **Chemical Reactions**: Atoms rearrange during collisions driven by thermodynamics and activation energy.\n"
                f"- **Interactive Visualizations**: You can enter any molecule name or reaction in the search box to view its full 3D interactive model!"
            ),
            key_concepts=["General Chemistry", "Atomic Structure", "Reaction Dynamics"],
            suggested_visualize_prompt="Water",
            suggested_followups=[
                "What is a nucleophile?",
                "Explain $S_N1$ vs $S_N2$ mechanisms",
                "Why is water polar?"
            ]
        )

    @staticmethod
    def _call_tutor_llm(message: str, history: List[ChatMessage]) -> Optional[ChatResponse]:
        system_prompt = (
            "You are an expert AI Chemistry Tutor for university and high school chemistry students. "
            "Provide accurate, encouraging, clear markdown responses. Use LaTeX formatting for formulas and equations. "
            "Output JSON with keys: 'reply' (markdown string), 'key_concepts' (list of strings), "
            "'suggested_visualize_prompt' (string or null for a relevant molecule/reaction prompt), and 'suggested_followups' (list of 3 strings)."
        )

        messages_payload = [{"role": "system", "content": system_prompt}]
        for h in history[-6:]:
            messages_payload.append({"role": h.role, "content": h.content})
        messages_payload.append({"role": "user", "content": message})

        headers = {
            "Authorization": f"Bearer {settings.LLM_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": settings.LLM_MODEL,
            "messages": messages_payload,
            "temperature": 0.3,
            "response_format": {"type": "json_object"}
        }

        url = "https://api.openai.com/v1/chat/completions"

        with httpx.Client(timeout=12.0) as client:
            response = client.post(url, headers=headers, json=payload)
            if response.status_code == 200:
                data = response.json()
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
        system_prompt = (
            "You are a chemistry translation AI. Output ONLY valid JSON matching schema:\n"
            "For molecule: {\"request_type\": \"molecule\", \"name\": \"name\", \"smiles\": \"SMILES\", \"confidence\": 0.95}\n"
            "For reaction: {\"request_type\": \"reaction\", \"reaction_type\": \"SN2\", \"reactants\": [], \"products\": [], \"confidence\": 0.90}"
        )

        headers = {
            "Authorization": f"Bearer {settings.LLM_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": settings.LLM_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.0,
            "response_format": {"type": "json_object"}
        }

        url = "https://api.openai.com/v1/chat/completions"

        with httpx.Client(timeout=10.0) as client:
            response = client.post(url, headers=headers, json=payload)
            if response.status_code == 200:
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                if content:
                    parsed_json = json.loads(content)
                    return LLMStructuredOutput(**parsed_json)
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
