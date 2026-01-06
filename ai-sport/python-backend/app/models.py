from __future__ import annotations

from datetime import datetime
from typing import List

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = Column(Integer, primary_key=True, index=True)
    username: Mapped[str] = Column(String(50), unique=True, nullable=False)
    display_name: Mapped[str] = Column(String(100), nullable=True)
    created_at: Mapped[datetime] = Column(DateTime, default=datetime.utcnow)

    sessions: Mapped[List["TrainingSession"]] = relationship(
        "TrainingSession", back_populates="user", cascade="all, delete-orphan"
    )


class TrainingSession(Base):
    __tablename__ = "training_sessions"

    id: Mapped[int] = Column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = Column(Integer, ForeignKey("users.id"), nullable=False)
    movement: Mapped[str] = Column(String(64), nullable=False)
    avg_score: Mapped[float] = Column(Float, nullable=False)
    repetitions: Mapped[int] = Column(Integer, default=0)
    duration_seconds: Mapped[float] = Column(Float, default=0.0)
    model_confidence: Mapped[float] = Column(Float, default=0.0)
    created_at: Mapped[datetime] = Column(DateTime, default=datetime.utcnow)

    user: Mapped[User] = relationship("User", back_populates="sessions")
