import json
import logging
from pathlib import Path
from typing import Optional, Dict, Any

from app.core.config import settings

logger = logging.getLogger(__name__)


class LookupService:
    @staticmethod
    def find_molecule_by_name(name: str) -> Optional[Dict[str, Any]]:
        if not name:
            return None
        clean_name = name.lower().strip().replace(" ", "_")
        mol_dir = settings.DATA_DIR / "molecules"

        file_path = mol_dir / f"{clean_name}.json"
        if file_path.exists():
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error reading molecule JSON file {file_path}: {e}")

        return None

    @staticmethod
    def find_reaction(reaction_type: Optional[str] = None, name: Optional[str] = None) -> Optional[Dict[str, Any]]:
        rxn_dir = settings.DATA_DIR / "reactions"
        if not rxn_dir.exists():
            return None

        key_terms = []
        if reaction_type:
            key_terms.append(reaction_type.lower())
        if name:
            key_terms.append(name.lower())

        for file_path in rxn_dir.glob("*.json"):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    rxn_t = str(data.get("reaction_type", "")).lower()
                    rxn_n = str(data.get("name", "")).lower()
                    
                    for term in key_terms:
                        if term in rxn_t or term in rxn_n or rxn_t in term:
                            return data
            except Exception as e:
                logger.error(f"Error reading reaction JSON file {file_path}: {e}")

        return None
