# schemas.py

from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class AlertCreate(BaseModel):
    src_ip: str
    dest_ip: str
    signature: str
    severity: int
    proto: Optional[str] = None


class AlertResponse(BaseModel):
    id: int
    timestamp: datetime
    src_ip: str
    dest_ip: str
    signature: str
    severity: int
    proto: str
    score: float
    vt_score: float
    ml_score: float
    explanation: Optional[str]

    class Config:
        orm_mode = True


class FeedbackCreate(BaseModel):
    alert_id: int
    is_true_positive: bool


class FeedbackResponse(BaseModel):
    id: int
    alert_id: int
    is_true_positive: bool
    timestamp: datetime

    class Config:
        orm_mode = True


class RiskEntry(BaseModel):
    src_ip: str
    avg_rule_score: float
    avg_vt_score: float
    avg_ml_score: float
    combined_score: float
    count: int


class WeightConfig(BaseModel):
    rule: float = 0.5
    vt: float = 0.25
    ml: float = 0.25
