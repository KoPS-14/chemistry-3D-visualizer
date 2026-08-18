"""
Reaction Templates Module

Defines validated reaction mechanism templates for procedural animation.
Supported initial reaction classes:
- Water formation
- Acid-base neutralization
- SN2 substitution
"""
from typing import Dict, Any, Optional

REACTION_TEMPLATES: Dict[str, Dict[str, Any]] = {}


def get_reaction_template(reaction_type: str) -> Optional[Dict[str, Any]]:
    return REACTION_TEMPLATES.get(reaction_type.upper())
