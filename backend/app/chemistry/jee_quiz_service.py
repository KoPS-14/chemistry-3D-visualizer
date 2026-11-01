import json
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any

from app.core.config import settings
from app.chemistry.rdkit_service import RDKitService
from app.schemas.models import ReactionData, ReactantProduct3DData, ReactionConditions
from app.schemas.quiz_models import (
    QuizQuestionSummary,
    QuizFilterResponse,
    QuizHintResponse,
    Teach3DResponse,
)

logger = logging.getLogger(__name__)


class JEEQuizService:
    _cached_questions: Optional[List[Dict[str, Any]]] = None

    @classmethod
    def _load_all_questions(cls) -> List[Dict[str, Any]]:
        if cls._cached_questions is not None:
            return cls._cached_questions

        quiz_file = settings.DATA_DIR / "jee_quiz" / "jee_chemistry_questions.json"
        if not quiz_file.exists():
            logger.warning(f"Quiz file not found: {quiz_file}")
            return []
        try:
            with open(quiz_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                cls._cached_questions = data
                return data
        except Exception as e:
            logger.error(f"Error loading JEE quiz questions: {e}")
            return []

    @classmethod
    def get_questions(
        cls,
        year: Optional[int] = None,
        category: Optional[str] = None,
        limit: int = 50
    ) -> QuizFilterResponse:
        raw_list = cls._load_all_questions()

        years = sorted(list({q["year"] for q in raw_list}), reverse=True)
        categories = sorted(list({q["category"] for q in raw_list}))

        filtered = []
        for q in raw_list:
            if year is not None and q["year"] != year:
                continue
            if category and category.lower() != "all" and q["category"].lower() != category.lower():
                continue
            filtered.append(
                QuizQuestionSummary(
                    id=q["id"],
                    year=q["year"],
                    paper=q["paper"],
                    category=q["category"],
                    topic=q["topic"],
                    difficulty=q["difficulty"],
                    question=q["question"],
                    options=q["options"],
                    correct_option=q["correct_option"],
                    hints=q.get("hints", []),
                    explanation=q.get("explanation", ""),
                    has_3d="teach_3d" in q
                )
            )

        return QuizFilterResponse(
            total=len(filtered),
            available_years=years,
            available_categories=categories,
            questions=filtered[:limit]
        )

    @classmethod
    def get_hint(cls, question_id: str, hint_step: int) -> Optional[QuizHintResponse]:
        raw_list = cls._load_all_questions()
        for q in raw_list:
            if q["id"] == question_id:
                hints = q.get("hints", [])
                total = len(hints)
                idx = max(0, min(hint_step - 1, total - 1))
                hint_text = hints[idx] if total > 0 else "Focus on basic reaction mechanisms and oxidation state balances."
                has_more = (idx + 1) < total
                return QuizHintResponse(
                    question_id=question_id,
                    hint_step=idx + 1,
                    total_hints=total,
                    hint_text=hint_text,
                    has_more_hints=has_more
                )
        return None

    @classmethod
    def get_teach_3d(cls, question_id: str) -> Optional[Teach3DResponse]:
        raw_list = cls._load_all_questions()
        for q in raw_list:
            if q["id"] == question_id:
                t3d = q.get("teach_3d")
                if not t3d:
                    return None

                # Compute 3D geometry for reactants using RDKit
                reactants_3d: List[ReactantProduct3DData] = []
                for r in t3d.get("reactants", []):
                    mol_3d = RDKitService.generate_3d_molecule(r["smiles"], name=r["name"])
                    if mol_3d:
                        reactants_3d.append(
                            ReactantProduct3DData(
                                name=r["name"],
                                smiles=r["smiles"],
                                role="reactant",
                                molecule_data=mol_3d
                            )
                        )

                # Compute 3D geometry for products using RDKit
                products_3d: List[ReactantProduct3DData] = []
                for p in t3d.get("products", []):
                    mol_3d = RDKitService.generate_3d_molecule(p["smiles"], name=p["name"])
                    if mol_3d:
                        products_3d.append(
                            ReactantProduct3DData(
                                name=p["name"],
                                smiles=p["smiles"],
                                role="product",
                                molecule_data=mol_3d
                            )
                        )

                eq_parts = [r["name"] for r in t3d.get("reactants", [])]
                prod_parts = [p["name"] for p in t3d.get("products", [])]
                equation_str = f"{' + '.join(eq_parts)} ➔ {' + '.join(prod_parts)}"

                rxn_data = ReactionData(
                    name=t3d.get("title", q["topic"]),
                    reaction_type=t3d.get("reaction_type", "GENERAL"),
                    description=q.get("explanation", ""),
                    balanced_equation=equation_str,
                    reactants=reactants_3d,
                    products=products_3d,
                    conditions=ReactionConditions(temperature_c=25, catalyst="none"),
                    stages=t3d.get("stages", [
                        "1. Molecular Alignment",
                        "2. Transition State",
                        "3. Product Formation"
                    ])
                )

                return Teach3DResponse(
                    question_id=question_id,
                    title=t3d.get("title", q["topic"]),
                    reaction_type=t3d.get("reaction_type", "GENERAL"),
                    spatial_insight=t3d.get("spatial_insight", ""),
                    stages=t3d.get("stages", []),
                    reaction_data=rxn_data
                )
        return None

