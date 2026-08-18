import json
import logging
import re
from typing import Optional

import httpx

from app.core.config import settings
from app.schemas.models import LLMStructuredOutput, ReactantOrProduct, ReactionConditions

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


class LLMService:
    @staticmethod
    def parse_prompt(prompt: str) -> LLMStructuredOutput:
        """
        Parses a natural-language chemistry prompt into strict structured JSON.
        Uses external LLM API if LLM_API_KEY is configured, else uses deterministic chemical fallback.
        """
        if not prompt or not prompt.strip():
            return LLMStructuredOutput(request_type="unsupported", confidence=0.0)

        # Attempt external LLM API call if API key exists
        if settings.LLM_API_KEY and len(settings.LLM_API_KEY.strip()) > 5:
            try:
                res = LLMService._call_external_llm(prompt.strip())
                if res and res.confidence > 0.3:
                    return res
            except Exception as e:
                logger.warning(f"LLM API call failed, falling back to rule-based parser: {e}")

        # Fallback rule-based parsing
        return LLMService._fallback_parse_prompt(prompt.strip())

    @staticmethod
    def _call_external_llm(prompt: str) -> Optional[LLMStructuredOutput]:
        system_prompt = (
            "You are a chemistry translation AI. Your task is to extract structured chemistry details "
            "from natural language. Output ONLY valid JSON matching this schema:\n"
            "For molecule requests:\n"
            "{\n"
            '  "request_type": "molecule",\n'
            '  "name": "molecule_name",\n'
            '  "smiles": "valid_smiles",\n'
            '  "confidence": 0.95\n'
            "}\n"
            "For reaction requests:\n"
            "{\n"
            '  "request_type": "reaction",\n'
            '  "reaction_type": "SN2" | "WaterFormation" | "AcidBase",\n'
            '  "reactants": [{"name": "name", "smiles": "SMILES"}],\n'
            '  "products": [{"name": "name", "smiles": "SMILES"}],\n'
            '  "conditions": {"temperature_c": null, "pressure_atm": null, "catalyst": null, "solvent": null, "concentration": null},\n'
            '  "confidence": 0.90\n'
            "}\n"
            "Do NOT invent 3D coordinates or molecular geometries. If uncertain, set confidence to 0.0."
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
        if "gemini" in settings.LLM_PROVIDER.lower():
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.LLM_MODEL}:generateContent?key={settings.LLM_API_KEY}"
            # Adapt payload if Gemini API format is used
            payload = {
                "contents": [
                    {"role": "user", "parts": [{"text": f"{system_prompt}\n\nUser Prompt: {prompt}"}]}
                ],
                "generationConfig": {"responseMimeType": "application/json"}
            }

        with httpx.Client(timeout=10.0) as client:
            response = client.post(url, headers=headers if "openai" in settings.LLM_PROVIDER.lower() else {}, json=payload)
            if response.status_code == 200:
                data = response.json()
                content = ""
                if "choices" in data:
                    content = data["choices"][0]["message"]["content"]
                elif "candidates" in data:
                    content = data["candidates"][0]["content"]["parts"][0]["text"]
                
                if content:
                    parsed_json = json.loads(content)
                    return LLMStructuredOutput(**parsed_json)
        return None

    @staticmethod
    def _fallback_parse_prompt(prompt: str) -> LLMStructuredOutput:
        lower_prompt = prompt.lower()

        # Check reaction patterns first
        if "sn2" in lower_prompt or ("methyl bromide" in lower_prompt and "hydroxide" in lower_prompt):
            return LLMStructuredOutput(
                request_type="reaction",
                name="SN2 Reaction of methyl bromide with hydroxide",
                reaction_type="SN2",
                reactants=[
                    ReactantOrProduct(name="methyl bromide", smiles="CBr"),
                    ReactantOrProduct(name="hydroxide", smiles="[OH-]")
                ],
                products=[
                    ReactantOrProduct(name="methanol", smiles="CO"),
                    ReactantOrProduct(name="bromide", smiles="[Br-]")
                ],
                conditions=ReactionConditions(),
                confidence=0.95
            )

        if "water formation" in lower_prompt or ("hydrogen" in lower_prompt and "oxygen" in lower_prompt and "reaction" in lower_prompt):
            return LLMStructuredOutput(
                request_type="reaction",
                name="Water Formation",
                reaction_type="WaterFormation",
                reactants=[
                    ReactantOrProduct(name="hydrogen", smiles="[H][H]"),
                    ReactantOrProduct(name="oxygen", smiles="O=O")
                ],
                products=[
                    ReactantOrProduct(name="water", smiles="O")
                ],
                conditions=ReactionConditions(),
                confidence=0.95
            )

        if "acid base" in lower_prompt or "neutralization" in lower_prompt:
            return LLMStructuredOutput(
                request_type="reaction",
                name="Acid-Base Neutralization",
                reaction_type="AcidBase",
                reactants=[
                    ReactantOrProduct(name="hydrochloric acid", smiles="Cl"),
                    ReactantOrProduct(name="sodium hydroxide", smiles="[Na+].[OH-]")
                ],
                products=[
                    ReactantOrProduct(name="sodium chloride", smiles="[Na+].[Cl-]"),
                    ReactantOrProduct(name="water", smiles="O")
                ],
                conditions=ReactionConditions(),
                confidence=0.95
            )

        # Check molecule names in dictionary
        for name, smiles in KNOWN_MOLECULES.items():
            if name in lower_prompt:
                return LLMStructuredOutput(
                    request_type="molecule",
                    name=name.capitalize(),
                    smiles=smiles,
                    confidence=0.98
                )

        # Check if the prompt itself is a raw SMILES string (e.g. CCO, c1ccccc1, C=C)
        clean_smiles = prompt.strip()
        if re.match(r"^[A-Za-z0-9@+\-\[\]\(\)\\\/=#$%]+$", clean_smiles) and len(clean_smiles) <= 50:
            return LLMStructuredOutput(
                request_type="molecule",
                name="Custom Molecule",
                smiles=clean_smiles,
                confidence=0.90
            )

        # Unsupported or unrecognised prompt
        return LLMStructuredOutput(
            request_type="unsupported",
            name=prompt,
            confidence=0.0
        )
