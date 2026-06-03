from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from pydantic import ConfigDict

class AssessmentRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')  # Reject unknown fields

    answers: List[int] = Field(
        ...,
        description="Nine PHQ-9 answers, each 0–3",
        min_length=9,
        max_length=9
    )

    @field_validator('answers')
    @classmethod
    def validate_answer_range(cls, v):
        for i, answer in enumerate(v):
            if not isinstance(answer, int):
                raise ValueError(f"Answer {i+1} must be an integer, got {type(answer).__name__}")
            if answer < 0 or answer > 3:
                raise ValueError(
                    f"Answer {i+1} is {answer}. PHQ-9 answers must be 0 (Not at all), "
                    f"1 (Several days), 2 (More than half the days), or 3 (Nearly every day)."
                )
        return v


class CrisisResource(BaseModel):
    name: str
    detail: str
    url: str


class CrisisBlock(BaseModel):
    message: str
    resources: List[CrisisResource]
    disclaimer: str


class AssessmentResponse(BaseModel):
    tier: str
    score: Optional[int]          # None for crisis tier
    summary: Optional[str]        # None for crisis tier
    crisis: Optional[CrisisBlock] # Only populated for crisis tier
    disclaimer: str               # Always present
