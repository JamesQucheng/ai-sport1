from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    username: str = Field(..., max_length=50)
    display_name: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    username: str
    display_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SessionCreate(BaseModel):
    user_id: int
    movement: str
    avg_score: float
    repetitions: int
    duration_seconds: float
    model_confidence: float


class SessionResponse(BaseModel):
    id: int
    user_id: int
    movement: str
    avg_score: float
    repetitions: int
    duration_seconds: float
    model_confidence: float
    created_at: datetime

    class Config:
        from_attributes = True


class PoseRequest(BaseModel):
    image_b64: str
    user_id: Optional[int] = None
    movement: str = "generic"


class PoseKeypoint(BaseModel):
    x: float
    y: float
    z: float
    visibility: float


class PoseAnalysis(BaseModel):
    movement: str
    score: float
    repetitions: int
    model_confidence: float
    keypoints: List[PoseKeypoint]
    message: str
