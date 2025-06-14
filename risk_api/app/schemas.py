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
    proto: Optional[str] = None
    score: float
    ml_score: float
    explanation: Optional[str]

    class Config:
        orm_mode = True



class RiskEntry(BaseModel):
    src_ip: str
    avg_rule_score: float
    avg_ml_score: float
    combined_score: float
    count: int


class WeightConfig(BaseModel):
    rule: float = 0.7
    ml: float = 0.3
