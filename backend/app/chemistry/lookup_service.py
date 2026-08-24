import json
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List

from app.core.config import settings

logger = logging.getLogger(__name__)


class LookupService:
    @staticmethod
    def get_all_elements() -> List[Dict[str, Any]]:
        file_path = settings.DATA_DIR / "elements" / "periodic_table.json"
        if file_path.exists():
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    elements = list(data.values())
                    elements.sort(key=lambda x: x.get("atomic_number", 0))
                    return elements
            except Exception as e:
                logger.error(f"Error reading periodic_table.json: {e}")
        return []

    @staticmethod
    def get_element_by_atomic_number(atomic_number: int) -> Optional[Dict[str, Any]]:
        file_path = settings.DATA_DIR / "elements" / "periodic_table.json"
        if file_path.exists():
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    str_num = str(atomic_number)
                    if str_num in data:
                        return data[str_num]
            except Exception as e:
                logger.error(f"Error reading element {atomic_number} from periodic_table.json: {e}")
        return None

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

        query = (name or reaction_type or "").lower().strip()
        if not query:
            return None

        query_clean = query.replace("-", " ").strip()
        best_match = None
        highest_score = 0

        for file_path in rxn_dir.glob("*.json"):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    rxn_id = str(data.get("reaction_id", "")).lower().replace("-", " ")
                    rxn_t = str(data.get("reaction_type", "")).lower().replace("-", " ")
                    rxn_n = str(data.get("name", "")).lower().replace("-", " ")

                    score = 0
                    if query_clean == rxn_n or query_clean == rxn_id:
                        score = 100
                    elif rxn_n in query_clean or query_clean in rxn_n:
                        score = 80
                    elif rxn_t in query_clean or query_clean in rxn_t:
                        score = 60

                    if score > highest_score:
                        highest_score = score
                        best_match = data
            except Exception as e:
                logger.error(f"Error reading reaction JSON file {file_path}: {e}")

        if highest_score >= 50:
            return best_match

        return None
