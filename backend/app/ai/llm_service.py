import json
import logging
import re
from typing import List, Optional

import httpx

from app.core.config import settings
from app.schemas.models import ChatMessage, ChatResponse, LLMStructuredOutput, ReactantOrProduct, ReactionConditions

logger = logging.getLogger(__name__)

CHEMISTRY_SYSTEM_INSTRUCTION = """You are an expert AI Chemistry Tutor, computational chemist, and educator.
You specialize in all branches of chemistry including:
- Atomic structure, electron configurations, quantum numbers, and orbitals
- Periodic table and periodic trends (electronegativity, ionization energy, atomic radius, electron affinity)
- Chemical bonding (ionic, covalent, metallic, coordinate/dative, hydrogen bonding, van der Waals)
- Molecular structure, VSEPR theory, molecular geometry, and polarity
- Organic chemistry, functional groups, IUPAC nomenclature, and reaction mechanisms (SN1, SN2, E1, E2, electrophilic addition, nucleophilic addition, elimination, aromatic substitution, pericyclic)
- Stereochemistry (chiral centers, enantiomers, diastereomers, R/S configuration, cis/trans, E/Z, Newman projections, Walden inversion)
- Inorganic chemistry, coordination complexes, crystal field theory, transition metals, and organometallics
- Physical chemistry, thermodynamics (enthalpy, entropy, Gibbs free energy, Hess's law)
- Chemical kinetics (rate laws, reaction orders, Arrhenius equation, activation energy, catalysts)
- Chemical equilibrium (Le Chatelier's principle, Kc, Kp, solubility product Ksp)
- Acids, bases, pH, pKa, buffers, Henderson-Hasselbalch equation, and titrations
- Electrochemistry (galvanic/electrolytic cells, Nernst equation, standard reduction potentials, electrolysis)
- Stoichiometry, balancing reactions, limiting reactants, percent yield, mole concept, molarity, molality, and solution chemistry
- Oxidation and reduction, redox balancing, and half-reactions
- Chemistry calculations and numerical problem solving.

Guidelines for your responses:
1. For simple or factual questions, provide clear, concise, and direct answers.
2. For conceptual or advanced topics, provide structured, thorough, and pedagogical explanations.
3. For numerical problems and calculations, strictly follow this step-by-step format:
   - **Step 1 (Given Data)**: State the given quantities with units and what needs to be calculated.
   - **Step 2 (Formula)**: State the relevant chemical or physical formula.
   - **Step 3 (Substitution)**: Substitute the values into the formula with necessary unit conversions.
   - **Step 4 (Calculation)**: Perform the arithmetic step-by-step.
   - **Step 5 (Final Answer)**: State the final numerical answer clearly with units and significant figures.
   - **Step 6 (Explanation)**: Briefly explain the physical/chemical significance of the result.
4. For reaction mechanism questions: explain the reactants, attacking nucleophile/electrophile, electron flow, breaking and forming bonds, transition states/intermediates, stereochemical outcomes, and final products.
5. Use clean Markdown formatting with standard chemical notation and LaTeX equations (e.g. $pH = -\\log[H^+]$, $H_2O$, $S_N2$).
"""

GEMINI_MODEL_CANDIDATES = [
    "gemini-flash-latest",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-2.5-flash",
    "gemini-pro-latest",
    "gemini-1.5-flash"
]


class LLMService:
    @staticmethod
    def ask_chemistry_tutor(message: str, history: Optional[List[ChatMessage]] = None) -> ChatResponse:
        """
        Dynamically answers any chemistry question using the Gemini LLM (or OpenAI fallback).
        Maintains full conversational multi-turn history.
        """
        clean_msg = message.strip()
        if not clean_msg:
            return ChatResponse(
                status="error",
                answer="Please enter a chemistry question.",
                reply="Please enter a chemistry question.",
                error="Empty message"
            )

        api_key = settings.active_api_key
        if not api_key:
            missing_key_guidance = (
                "### 🔑 Gemini API Key Configuration Required\n\n"
                "To enable dynamic AI Chemistry Chatbot responses powered by Google Gemini:\n\n"
                "1. **Get a free API key** from [Google AI Studio](https://aistudio.google.com/).\n"
                "2. **Open your backend environment file**: `backend/.env`.\n"
                "3. **Add your Gemini API key**:\n"
                "   ```text\n"
                "   GEMINI_API_KEY=your_actual_gemini_api_key_here\n"
                "   ```\n"
                "4. **Save the file** and submit your question again. The chatbot will dynamically generate detailed, step-by-step chemistry explanations for any topic!"
            )
            return ChatResponse(
                status="error",
                answer=missing_key_guidance,
                reply=missing_key_guidance,
                error="GEMINI_API_KEY is not configured in backend/.env"
            )

        # Call LLM based on provider
        provider = settings.LLM_PROVIDER.lower()
        if "gemini" in provider or settings.GEMINI_API_KEY:
            return LLMService._call_gemini_chat(clean_msg, history or [], api_key)
        else:
            return LLMService._call_openai_chat(clean_msg, history or [], api_key)

    @staticmethod
    def _call_gemini_chat(message: str, history: List[ChatMessage], api_key: str) -> ChatResponse:
        """Calls Google Gemini GenerateContent REST API with system instructions and multi-turn history."""
        # Construct Gemini multi-turn contents
        contents = []
        for msg in history[-12:]:  # Pass last 12 messages for rich conversational context
            role = "user" if msg.role in ("user", "human") else "model"
            contents.append({
                "role": role,
                "parts": [{"text": msg.content}]
            })
        contents.append({
            "role": "user",
            "parts": [{"text": message}]
        })

        payload = {
            "system_instruction": {
                "parts": [{"text": CHEMISTRY_SYSTEM_INSTRUCTION}]
            },
            "contents": contents,
            "generationConfig": {
                "temperature": 0.4,
                "maxOutputTokens": 2048
            }
        }

        # Model preference order
        models_to_try = [settings.LLM_MODEL] if settings.LLM_MODEL in GEMINI_MODEL_CANDIDATES else []
        for m in GEMINI_MODEL_CANDIDATES:
            if m not in models_to_try:
                models_to_try.append(m)

        last_error = ""
        for model_name in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            try:
                with httpx.Client(timeout=25.0) as client:
                    response = client.post(url, json=payload)

                    if response.status_code == 200:
                        data = response.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if parts:
                                generated_text = parts[0].get("text", "")
                                return ChatResponse(
                                    status="success",
                                    answer=generated_text,
                                    reply=generated_text
                                )
                    elif response.status_code == 429:
                        last_error = "⚠️ Gemini API rate limit or quota exceeded. Please check your Google AI Studio quota or try again in a few moments."
                        continue
                    elif response.status_code in (401, 403):
                        return ChatResponse(
                            status="error",
                            answer=f"⚠️ Gemini API Authentication Error ({response.status_code}). Please verify your `GEMINI_API_KEY` in `backend/.env` is valid from Google AI Studio.",
                            reply=f"⚠️ Gemini API Authentication Error ({response.status_code}).",
                            error=f"Auth error {response.status_code}"
                        )
                    elif response.status_code == 404:
                        # Model name not found on this API tier, try next model
                        continue
                    else:
                        last_error = f"Gemini API returned status {response.status_code}"
            except httpx.TimeoutException:
                last_error = "Request to Gemini API timed out"
                continue
            except Exception as e:
                last_error = str(e)
                continue

        return ChatResponse(
            status="error",
            answer=last_error or "⚠️ Unable to generate response from Gemini API. Please check your API key and connection.",
            reply=last_error or "⚠️ Unable to generate response from Gemini API.",
            error=last_error
        )

    @staticmethod
    def _call_openai_chat(message: str, history: List[ChatMessage], api_key: str) -> ChatResponse:
        """Calls OpenAI Chat Completions API with system instructions and multi-turn history."""
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        messages_payload = [{"role": "system", "content": CHEMISTRY_SYSTEM_INSTRUCTION}]
        for msg in history[-12:]:
            role = "user" if msg.role in ("user", "human") else "assistant"
            messages_payload.append({"role": role, "content": msg.content})
        messages_payload.append({"role": "user", "content": message})

        payload = {
            "model": settings.LLM_MODEL if settings.LLM_MODEL else "gpt-4o-mini",
            "messages": messages_payload,
            "temperature": 0.4
        }

        try:
            with httpx.Client(timeout=25.0) as client:
                response = client.post(url, headers=headers, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    choices = data.get("choices", [])
                    if choices:
                        answer_text = choices[0].get("message", {}).get("content", "")
                        return ChatResponse(
                            status="success",
                            answer=answer_text,
                            reply=answer_text
                        )
                return ChatResponse(
                    status="error",
                    answer=f"⚠️ OpenAI API returned status code {response.status_code}.",
                    reply=f"⚠️ OpenAI API returned status code {response.status_code}.",
                    error=response.text
                )
        except Exception as e:
            return ChatResponse(status="error", answer=str(e), reply=str(e), error=str(e))

    @staticmethod
    def parse_prompt(prompt: str) -> LLMStructuredOutput:
        """Translates a natural language 3D visualization prompt into structured JSON."""
        clean = prompt.strip()
        if not clean:
            return LLMStructuredOutput(request_type="unsupported", confidence=0.0)

        api_key = settings.active_api_key
        if api_key:
            try:
                res = LLMService._call_external_prompt_parser(clean, api_key)
                if res and res.confidence > 0.3:
                    return res
            except Exception as e:
                logger.warning(f"LLM 3D prompt parser failed, using rule-based fallback: {e}")

        return LLMService._fallback_parse_prompt(clean)

    @staticmethod
    def _call_external_prompt_parser(prompt: str, api_key: str) -> Optional[LLMStructuredOutput]:
        system_prompt = (
            "You are a chemistry structure translator. Output ONLY valid JSON matching schema:\n"
            "For molecule: {\"request_type\": \"molecule\", \"name\": \"name\", \"smiles\": \"SMILES\", \"confidence\": 0.95}\n"
            "For reaction: {\"request_type\": \"reaction\", \"reaction_type\": \"SN2\", \"reactants\": [], \"products\": [], \"confidence\": 0.90}"
        )

        if "gemini" in settings.LLM_PROVIDER.lower() or settings.GEMINI_API_KEY:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.LLM_MODEL}:generateContent?key={api_key}"
            payload = {
                "contents": [
                    {"role": "user", "parts": [{"text": f"{system_prompt}\n\nUser Prompt: {prompt}"}]}
                ],
                "generationConfig": {"responseMimeType": "application/json"}
            }
            try:
                with httpx.Client(timeout=10.0) as client:
                    resp = client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        parts = data.get("candidates", [])[0].get("content", {}).get("parts", [])
                        if parts:
                            parsed = json.loads(parts[0].get("text", ""))
                            return LLMStructuredOutput(**parsed)
            except Exception:
                pass

        url = "https://api.openai.com/v1/chat/completions"
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        payload = {
            "model": settings.LLM_MODEL,
            "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"}
        }
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(url, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    if content:
                        return LLMStructuredOutput(**json.loads(content))
        except Exception:
            pass

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

        from app.chemistry.lookup_service import LookupService
        KNOWN_MOLECULES = {
            "ethanol": "CCO",
            "water": "O",
            "methane": "C",
            "methanol": "CO",
            "ethane": "CC",
            "propane": "CCC",
            "carbon dioxide": "O=C=O",
            "co2": "O=C=O",
            "benzene": "c1ccccc1",
            "aspirin": "CC(=O)Oc1ccccc1C(=O)O",
            "acetone": "CC(=O)C",
            "acetic acid": "CC(=O)O",
            "ammonia": "N",
            "methyl bromide": "CBr",
            "bromomethane": "CBr",
            "hydroxide": "[OH-]",
            "glucose": "C(C1C(C(C(C(O1)O)O)O)O)O"
        }

        for name, smiles in KNOWN_MOLECULES.items():
            if name in lower_prompt and not is_reaction_prompt:
                return LLMStructuredOutput(
                    request_type="molecule",
                    name=name.capitalize(),
                    smiles=smiles,
                    confidence=0.98
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
