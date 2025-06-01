# app/models.py

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime)
    src_ip = Column(String)
    dest_ip = Column(String)
    signature = Column(String)
    severity = Column(Integer)
    proto = Column(String)
    score = Column(Float)

    # ── Add these two lines ──
    vt_score = Column(Integer, default=0)  # VirusTotal score (0–100)
    ml_score = Column(Integer, default=0)  # ML model score (0–100)
    # ─────────────────────────

    # If you have a Feedback relationship, keep it:
    feedbacks = relationship("Feedback", back_populates="alert")


class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"))
    is_true_positive = Column(Integer)  # or Boolean
    timestamp = Column(DateTime)

    alert = relationship("Alert", back_populates="feedbacks")
