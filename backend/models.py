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


class TrendBlock(BaseModel):
    trend: str
    delta: Optional[float]
    message: str


class Milestone(BaseModel):
    id: str
    message: str


class GateBlock(BaseModel):
    next_available: Optional[str]
    days_remaining: int


class AssessmentResponse(BaseModel):
    tier: str
    score: Optional[int]          # None for crisis tier
    summary: Optional[str]        # None for crisis tier
    crisis: Optional[CrisisBlock] # Only populated for crisis tier
    disclaimer: str               # Always present
    trend: Optional[TrendBlock] = None
    milestones: Optional[List[Milestone]] = None
    gate: Optional[GateBlock] = None


class AssessmentHistoryItem(BaseModel):
    id: str
    score: int
    tier: str
    taken_at: Optional[str]
    next_assessment_at: Optional[str]


class HistoryResponse(BaseModel):
    assessments: List[AssessmentHistoryItem]
    total: int
    trend: TrendBlock
    encouragement: str
    milestones_earned: int


class DeleteHistoryResponse(BaseModel):
    deleted: bool
    count: int


class PublicClinicItem(BaseModel):
    id: str
    name: str
    description: str
    specialties: List[str]
    languages: List[str]
    response_window_hours: int


class ClinicsResponse(BaseModel):
    clinics: List[PublicClinicItem]


class ReferralBookRequest(BaseModel):
    patient_name: str
    patient_email: str
    patient_phone: Optional[str] = None
    preferred_date: str
    preferred_time: str
    notes: Optional[str] = None
    phq9_score: int
    phq9_tier: str


class ReferralBookResponse(BaseModel):
    referral_id: str
    status: str
    clinic_name: str
    message: str


class ReferralStatusResponse(BaseModel):
    referral_id: str
    status: str
    clinic_name: str
    created_at: str
    confirmed_at: Optional[str] = None


class GoogleAuthRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')  # Reject unknown fields

    credential: str = Field(..., description="Google Identity Services ID token (credential JWT)")


class AuthUser(BaseModel):
    email: str
    name: str
    image: Optional[str] = None


class AuthTokenResponse(BaseModel):
    token: str          # App HS256 JWT, sent as Bearer on subsequent calls
    user: AuthUser
    expires: str        # ISO 8601 expiry of the app token


