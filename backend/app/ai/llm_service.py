import json
import logging
import re
from typing import List, Optional

import httpx

from app.core.config import settings
from app.schemas.models import ChatMessage, ChatResponse, LLMStructuredOutput, ReactantOrProduct, ReactionConditions

logger = logging.getLogger(__name__)

# Persistent HTTP client with connection pooling and keep-alive for sub-second communication
_http_client = httpx.Client(
    timeout=httpx.Timeout(15.0, connect=5.0),
    limits=httpx.Limits(max_keepalive_connections=20, max_connections=50)
)

CHEMISTRY_SYSTEM_INSTRUCTION = """You are an expert AI Chemistry Tutor, computational chemist, and educator.
You specialize in all branches of chemistry including atomic structure, periodic trends, chemical bonding, molecular geometry, organic mechanisms, stereochemistry, thermodynamics, kinetics, equilibrium, acids/bases, electrochemistry, and stoichiometry calculations.

STRICT FORMATTING RULES:
1. NEVER use LaTeX dollar signs ($), \\text{...}, \\approx, or LaTeX backslashes for regular numbers, element symbols, units, or chemical formulas.
2. Write chemical formulas using standard Unicode subscripts: write H₂O, CO₂, O₂, Fe₂O₃, CH₄, OH⁻, H⁺, SO₄²⁻, NH₃ (NOT $\\text{H}_2\\text{O}$).
3. Write electron configurations with Unicode superscripts: write 1s² 2s² 2p⁴ (NOT $1s^2 2s^2 2p^4$).
4. Write numbers and properties cleanly: write "8 protons", "15.999 u", "Group 16", "Period 2", "3.44 electronegativity", "21% by volume".
5. For calculations, state:
   - Given Values (with units)
   - Formula
   - Step-by-step Calculation
   - Final Answer with Units
   - Brief Chemical Explanation
6. Provide precise, direct, and well-structured information with clear bullet points and bold headers.
"""

GEMINI_MODEL_CANDIDATES = [
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-flash-latest",
    "gemini-pro-latest"
]


def clean_latex_artifacts(text: str) -> str:
    """Removes raw LaTeX formatting ($..$, \\text{..}, \\approx, etc.) for clean, precise presentation."""
    if not text:
        return text

    # Replace \approx with ≈
    cleaned = text.replace(r"\approx", "≈")
    
    # Replace \rightarrow with →, \leftarrow with ←, \rightleftharpoons with ⇌
    cleaned = cleaned.replace(r"\rightarrow", "→").replace(r"\leftarrow", "←").replace(r"\rightleftharpoons", "⇌")

    # Replace \text{...} with the content inside
    cleaned = re.sub(r"\\text\{([^}]*)\}", r"\1", cleaned)

    # Convert common LaTeX subscripts inside formulas (e.g. O_2 -> O₂, H_2O -> H₂O)
    subscript_map = str.maketrans("0123456789+-", "₀₁₂₃₄₅₆₇₈₉₊₋")
    superscript_map = str.maketrans("0123456789+-", "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻")

    # Clean $...$ patterns
    def replace_inline_math(match):
        inner = match.group(1).strip()
        # Remove any remaining \text{}
        inner = re.sub(r"\\text\{([^}]*)\}", r"\1", inner)
        # Convert _digits to subscripts
        inner = re.sub(r"_([0-9+\-]+)", lambda m: m.group(1).translate(subscript_map), inner)
        # Convert ^digits to superscripts
        inner = re.sub(r"\^([0-9+\-]+)", lambda m: m.group(1).translate(superscript_map), inner)
        # Remove stray backslashes
        inner = inner.replace("\\", "")
        return inner

    cleaned = re.sub(r"\$([^$]+)\$", replace_inline_math, cleaned)

    # Clean double dollar math blocks $$...$$
    def replace_block_math(match):
        inner = match.group(1).strip()
        inner = re.sub(r"\\text\{([^}]*)\}", r"\1", inner)
        inner = re.sub(r"_([0-9+\-]+)", lambda m: m.group(1).translate(subscript_map), inner)
        inner = re.sub(r"\^([0-9+\-]+)", lambda m: m.group(1).translate(superscript_map), inner)
        inner = inner.replace("\\", "")
        return f"\n\n{inner}\n\n"

    cleaned = re.sub(r"\$\$([^$]+)\$\$", replace_block_math, cleaned)

    return cleaned.strip()


class LLMService:
    @staticmethod
    def ask_chemistry_tutor(message: str, history: Optional[List[ChatMessage]] = None) -> ChatResponse:
        """
        Dynamically answers any chemistry question using the Gemini LLM (or OpenAI fallback).
        Maintains full conversational multi-turn history with high-speed connection pooling.
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
                "1. **Get a free API key** from [Google AI Studio](https://aistudio.google.com/app/apikey).\n"
                "2. **Open your backend environment file**: `backend/.env`.\n"
                "3. **Add your Gemini API key**:\n"
                "   ```text\n"
                "   GEMINI_API_KEY=your_actual_gemini_api_key_here\n"
                "   ```\n"
                "4. **Save the file** and submit your question again."
            )
            return ChatResponse(
                status="error",
                answer=missing_key_guidance,
                reply=missing_key_guidance,
                error="GEMINI_API_KEY is not configured in backend/.env"
            )

        provider = settings.LLM_PROVIDER.lower()
        if "gemini" in provider or settings.GEMINI_API_KEY:
            return LLMService._call_gemini_chat(clean_msg, history or [], api_key)
        else:
            return LLMService._call_openai_chat(clean_msg, history or [], api_key)

    @staticmethod
    def _call_gemini_chat(message: str, history: List[ChatMessage], api_key: str) -> ChatResponse:
        """Calls Google Gemini GenerateContent REST API with high-speed model prioritization."""
        contents = []
        for msg in history[-10:]:
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
                "temperature": 0.2,
                "maxOutputTokens": 1024
            }
        }

        active_model = settings.LLM_MODEL if settings.LLM_MODEL else "gemini-3.6-flash"
        models_to_try = [active_model]
        for m in GEMINI_MODEL_CANDIDATES:
            if m not in models_to_try:
                models_to_try.append(m)

        for model_name in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            try:
                response = _http_client.post(url, json=payload)

                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            generated_text = parts[0].get("text", "")
                            cleaned_text = clean_latex_artifacts(generated_text)
                            return ChatResponse(
                                status="success",
                                answer=cleaned_text,
                                reply=cleaned_text
                            )
                elif response.status_code == 429:
                    quota_msg = "⚠️ Gemini API rate limit or quota exceeded. Please wait a few moments before sending your next request."
                    return ChatResponse(status="error", answer=quota_msg, reply=quota_msg, error="Rate limit (429)")
                elif response.status_code in (400, 401, 403, 404):
                    continue
            except Exception as e:
                logger.warning(f"Model {model_name} attempt error: {e}")
                continue

        return ChatResponse(
            status="error",
            answer="⚠️ Unable to generate response from Gemini API. Please check your network connection.",
            reply="⚠️ Unable to generate response from Gemini API.",
            error="Connection or API failure"
        )

    @staticmethod
    def _call_openai_chat(message: str, history: List[ChatMessage], api_key: str) -> ChatResponse:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        messages_payload = [{"role": "system", "content": CHEMISTRY_SYSTEM_INSTRUCTION}]
        for msg in history[-10:]:
            role = "user" if msg.role in ("user", "human") else "assistant"
            messages_payload.append({"role": role, "content": msg.content})
        messages_payload.append({"role": "user", "content": message})

        payload = {
            "model": settings.LLM_MODEL if settings.LLM_MODEL else "gpt-4o-mini",
            "messages": messages_payload,
            "temperature": 0.2
        }

        try:
            response = _http_client.post(url, headers=headers, json=payload)
            if response.status_code == 200:
                data = response.json()
                choices = data.get("choices", [])
                if choices:
                    answer_text = choices[0].get("message", {}).get("content", "")
                    cleaned_text = clean_latex_artifacts(answer_text)
                    return ChatResponse(
                        status="success",
                        answer=cleaned_text,
                        reply=cleaned_text
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

        model = settings.LLM_MODEL if settings.LLM_MODEL else "gemini-3.6-flash"
        if "gemini" in settings.LLM_PROVIDER.lower() or settings.GEMINI_API_KEY:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            payload = {
                "contents": [
                    {"role": "user", "parts": [{"text": f"{system_prompt}\n\nUser Prompt: {prompt}"}]}
                ],
                "generationConfig": {"responseMimeType": "application/json"}
            }
            try:
                resp = _http_client.post(url, json=payload)
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
            resp = _http_client.post(url, headers=headers, json=payload)
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
