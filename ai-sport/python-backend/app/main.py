from __future__ import annotations

from datetime import datetime, timedelta
import pathlib
import sys
from io import BytesIO
from typing import List

import pandas as pd
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy.orm import Session

if __package__ is None or __package__ == "":
    # Allow running via `python app/main.py` by adding project root to sys.path
    sys.path.append(str(pathlib.Path(__file__).resolve().parent.parent))
    import app.models as models
    import app.schemas as schemas
    from app.database import Base, engine, get_db
    from app.services.pose import PoseEstimator
else:
    from . import models, schemas
    from .database import Base, engine, get_db
    from .services.pose import PoseEstimator

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Sport FastAPI Backend", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pose_estimator = PoseEstimator()


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.post("/api/users", response_model=schemas.UserResponse, status_code=201)
def create_user(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter_by(username=payload.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="用户名已存在")
    user = models.User(username=payload.username, display_name=payload.display_name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.get("/api/users", response_model=List[schemas.UserResponse])
def list_users(db: Session = Depends(get_db)):
    return db.query(models.User).order_by(models.User.created_at.desc()).all()


@app.post("/api/sessions", response_model=schemas.SessionResponse, status_code=201)
def create_session(payload: schemas.SessionCreate, db: Session = Depends(get_db)):
    if not db.get(models.User, payload.user_id):
        raise HTTPException(status_code=404, detail="用户不存在")
    session = models.TrainingSession(**payload.dict())
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@app.get("/api/sessions", response_model=List[schemas.SessionResponse])
def list_sessions(db: Session = Depends(get_db)):
    return (
        db.query(models.TrainingSession)
        .order_by(models.TrainingSession.created_at.desc())
        .limit(50)
        .all()
    )


@app.post("/api/pose/analyze", response_model=schemas.PoseAnalysis)
def analyze_pose(payload: schemas.PoseRequest, db: Session = Depends(get_db)):
    try:
        result = pose_estimator.analyze(payload.movement, payload.image_b64)
    except ValueError as exc:  # invalid input
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if payload.user_id:
        if not db.get(models.User, payload.user_id):
            raise HTTPException(status_code=404, detail="用户不存在")
        session = models.TrainingSession(
            user_id=payload.user_id,
            movement=payload.movement,
            avg_score=result.score,
            repetitions=result.repetitions,
            duration_seconds=0,
            model_confidence=result.model_confidence,
        )
        db.add(session)
        db.commit()
    return result


@app.get("/api/analytics/summary")
def analytics_summary(db: Session = Depends(get_db)):
    sessions = db.query(models.TrainingSession).all()
    if not sessions:
        return {"message": "没有训练数据"}

    frame = pd.DataFrame(
        [
            {
                "created_at": s.created_at,
                "movement": s.movement,
                "avg_score": s.avg_score,
                "repetitions": s.repetitions,
                "duration": s.duration_seconds,
            }
            for s in sessions
        ]
    )
    frame["date"] = frame["created_at"].dt.date
    daily = frame.groupby("date").agg(
        total_reps=("repetitions", "sum"),
        avg_score=("avg_score", "mean"),
        volume=("duration", "sum"),
    )
    weekly_range = datetime.utcnow().date() - timedelta(days=7)
    last_week = daily[daily.index >= weekly_range]

    return {
        "totals": daily.tail(7).reset_index().to_dict(orient="records"),
        "last_week_volume": float(last_week["volume"].sum()) if not last_week.empty else 0,
        "best_day": daily["avg_score"].idxmax().isoformat(),
    }


@app.get("/api/analytics/chart.png")
def analytics_chart(db: Session = Depends(get_db)):
    sessions = db.query(models.TrainingSession).all()
    if not sessions:
        raise HTTPException(status_code=404, detail="没有训练数据可用")

    frame = pd.DataFrame(
        [
            {"created_at": s.created_at, "avg_score": s.avg_score, "repetitions": s.repetitions}
            for s in sessions
        ]
    )
    frame.sort_values("created_at", inplace=True)
    frame["smoothed"] = frame["avg_score"].rolling(window=3, min_periods=1).mean()

    import matplotlib.pyplot as plt

    plt.figure(figsize=(8, 4))
    plt.plot(frame["created_at"], frame["avg_score"], label="raw score", color="#00AEEF")
    plt.plot(frame["created_at"], frame["smoothed"], label="moving average", color="#F58220")
    plt.scatter(frame["created_at"], frame["repetitions"], label="reps", color="#6A1B9A")
    plt.legend()
    plt.xlabel("时间")
    plt.ylabel("评分 / 次数")
    plt.tight_layout()

    buf = BytesIO()
    plt.savefig(buf, format="png")
    plt.close()
    return Response(content=buf.getvalue(), media_type="image/png")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
