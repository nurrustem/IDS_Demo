# app/models.py

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import datetime

Base = declarative_base()

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    src_ip = Column(String, nullable=False)
    dest_ip = Column(String, nullable=False)
    signature = Column(String, nullable=False)
    severity = Column(Integer, nullable=False)
    proto = Column(String, nullable=False)
    score = Column(Float, nullable=False)

    # Changed to Float to match schemas (0.0–100.0)
    vt_score = Column(Float, default=0.0)  
    ml_score = Column(Float, default=0.0)  
    explanation = Column(Text, nullable=True)

    # One-to-many relationship: an Alert can have multiple Feedback entries
    feedbacks = relationship("Feedback", back_populates="alert")


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"), nullable=False)
    is_true_positive = Column(Integer, nullable=False)  # 1 for true positive, 0 for false
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    # Link back to Alert
    alert = relationship("Alert", back_populates="feedbacks")
