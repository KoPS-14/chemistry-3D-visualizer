from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from app.schemas.models import ReactionData


class QuizQuestionSummary(BaseModel):
    id: str
    year: int
    paper: str
    category: str
    topic: str
    difficulty: str
    question: str
    options: List[str]
    correct_option: str
    hints: List[str]
    explanation: str
    has_3d: bool = True


class QuizFilterResponse(BaseModel):
    total: int
    available_years: List[int]
    available_categories: List[str]
    questions: List[QuizQuestionSummary]


class QuizHintRequest(BaseModel):
    question_id: str
    hint_step: int = Field(1, ge=1, le=3, description="Step number for progressive hint (1, 2, or 3)")


class QuizHintResponse(BaseModel):
    question_id: str
    hint_step: int
    total_hints: int = 3
    hint_text: str
    has_more_hints: bool


class Teach3DResponse(BaseModel):
    question_id: str
    title: str
    reaction_type: str
    spatial_insight: str
    stages: List[str]
    reaction_data: Optional[ReactionData] = None

