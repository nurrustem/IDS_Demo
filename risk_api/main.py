import os
import asyncio
import datetime
import requests
import openai

from fastapi import FastAPI
from fastapi import Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from dotenv import load_dotenv
from typing import List

from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app import models, schemas, scoring
from app.database import engine, Base, get_db
from app.schemas import WeightConfig

async def get_weights() -> WeightConfig:
    # return default weights; you can later read these from a settings table
    return WeightConfig()

# Load .env if it exists (only on your dev machine)
load_dotenv()

VT_API_KEY = os.getenv("VT_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Make sure your keys are present
if not VT_API_KEY:
    raise RuntimeError("VT_API_KEY not set in environment")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY not set in environment")

openai.api_key = OPENAI_API_KEY


app = FastAPI(title="Risk Scoring API")

# Allow your React dev server (http://localhost:5173) and any other local origins:
origins = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",  # serve dist build
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

# Register CORSMiddleware before defining any @app.get/post routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def fetch_vt_score(ip_address: str) -> float:
    """Call VT and normalize its reputation to 0–100."""
    url = f"https://www.virustotal.com/api/v3/ip_addresses/{ip_address}"
    headers = {"x-apikey": VT_API_KEY}
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
        rep = resp.json()["data"]["attributes"].get("reputation", 0)
        return float(max(0, rep))
    except Exception:
        return 0.0


async def fetch_openai_explanation(alert_dict: dict) -> str:
    """Ask OpenAI to explain this alert."""
    prompt = (
        "You are an IDS expert. Given this alert in JSON, explain in simple terms:\n\n"
        f"{alert_dict}\n\nExplanation:"
    )
    try:
        rsp = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            temperature=0.2,
        )
        return rsp.choices[0].message.content.strip()
    except Exception:
        return "No explanation available."


async def get_weights() -> WeightConfig:
    # Return default weights; you can later read these from a settings table
    return WeightConfig()





@app.post("/ingest", response_model=schemas.AlertResponse)
async def ingest_alert(
    alert: schemas.AlertCreate,
    db: AsyncSession = Depends(get_db),
):
    # 1) Rule-based score
    score = scoring.score_alert(alert.severity)

    # 2) Use current UTC time
    naive_ts = datetime.datetime.now().astimezone().replace(tzinfo=None)

    # 3) Insert a new Alert row with default vt_score=0, explanation=None
    new_alert = models.Alert(
        timestamp=naive_ts,
        src_ip=alert.src_ip,
        dest_ip=alert.dest_ip,
        signature=alert.signature,
        severity=alert.severity,
        proto=alert.proto,
        score=score,
        vt_score=0.0,
        ml_score=0.0,
        explanation=None,
    )
    db.add(new_alert)   # TODO: Move to bg task
    await db.commit()
    await db.refresh(new_alert)

    # 4) Return minimal response so the frontend isn’t blocked
    response_payload = schemas.AlertResponse(
        id=new_alert.id,
        timestamp=naive_ts,
        src_ip=new_alert.src_ip,
        dest_ip=new_alert.dest_ip,
        signature=new_alert.signature,
        severity=new_alert.severity,
        proto=new_alert.proto,
        score=new_alert.score,
        vt_score=new_alert.vt_score,
        ml_score=new_alert.ml_score,
        explanation=new_alert.explanation,
    )

    # 5) Launch background tasks to fetch VT and OpenAI results
    async def background_tasks(alert_id: int, ip: str, alert_data: dict):
        vt = await fetch_vt_score(ip)   # TODO: Check recent alerts for duplicate, skip checks on hits
        explanation_text = await fetch_openai_explanation(alert_data)

        async with get_db() as session:
            existing = await session.get(models.Alert, alert_id)
            if existing:
                existing.vt_score = vt
                existing.explanation = explanation_text
                session.add(existing)
                await session.commit()

    alert_dict = {
        "id": new_alert.id,
        "timestamp": str(naive_ts),
        "src_ip": alert.src_ip,
        "dest_ip": alert.dest_ip,
        "signature": alert.signature,
        "severity": alert.severity,
        "proto": alert.proto,
    }

    asyncio.create_task(background_tasks(new_alert.id, new_alert.src_ip, alert_dict))

    return response_payload


@app.get("/alerts/recent", response_model=List[schemas.AlertResponse])
async def get_recent_alerts(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(
            select(models.Alert)
            .order_by(desc(models.Alert.timestamp))
            .limit(limit)
        )
        alerts = result.scalars().all()

        return [
            schemas.AlertResponse(
                id=a.id,
                timestamp=a.timestamp,
                src_ip=a.src_ip,
                dest_ip=a.dest_ip,
                signature=a.signature,
                severity=a.severity,
                proto=a.proto,
                score=a.score,
                # if vt_score or ml_score is None in the DB, coalesce to 0.0
                vt_score=float(a.vt_score or 0.0),
                ml_score=float(a.ml_score or 0.0),
                explanation=a.explanation,
            )
            for a in alerts
        ]
    except Exception:
        # On failure, return empty list (so the frontend stays “Connected”)
        return []



@app.get("/risks/leaderboard", response_model=List[schemas.RiskEntry])
async def get_leaderboard(
    weights: WeightConfig = Depends(get_weights),
    db: AsyncSession = Depends(get_db),
):
    w1, w2, w3 = weights.rule, weights.vt, weights.ml  # e.g. 0.5, 0.25, 0.25

    subq = (
        select(
            models.Alert.src_ip.label("src_ip"),
            func.avg(models.Alert.score).label("avg_rule_score"),
            func.avg(models.Alert.vt_score).label("avg_vt_score"),
            func.avg(models.Alert.ml_score).label("avg_ml_score"),
            (
                w1 * func.avg(models.Alert.score)
                + w2 * func.avg(models.Alert.vt_score)
                + w3 * func.avg(models.Alert.ml_score)
            ).label("combined_score"),
            func.count(models.Alert.id).label("count"),
        )
        .group_by(models.Alert.src_ip)
        .order_by(desc("combined_score"))
        .limit(10)
        .subquery()
    )
    result = await db.execute(select(subq))
    rows = result.fetchall()

    return [
        schemas.RiskEntry(
            src_ip=row.src_ip,
            avg_rule_score=float(row.avg_rule_score or 0),
            avg_vt_score=float(row.avg_vt_score or 0),
            avg_ml_score=float(row.avg_ml_score or 0),
            combined_score=float(row.combined_score or 0),
            count=row.count,
        )
        for row in rows
    ]


@app.post("/feedback", response_model=schemas.FeedbackResponse)
async def submit_feedback(
    feedback: schemas.FeedbackCreate,
    db: AsyncSession = Depends(get_db),
):
    alert = await db.get(models.Alert, feedback.alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    new_fb = models.Feedback(
        alert_id=feedback.alert_id,
        is_true_positive=feedback.is_true_positive,
    )
    db.add(new_fb)
    await db.commit()
    await db.refresh(new_fb)

    return schemas.FeedbackResponse(
        id=new_fb.id,
        alert_id=new_fb.alert_id,
        is_true_positive=new_fb.is_true_positive,
        timestamp=new_fb.timestamp,
    )


@app.get("/stats/kpi")
async def get_kpi(db: AsyncSession = Depends(get_db)): # TODO: make this work
    # 1) total_alerts
    try:
        total_alerts = await db.scalar(select(func.count(models.Alert.id)))
    except Exception:
        total_alerts = 0

    # 2) tp_count (true positives)
    try:
        tp_count = await db.scalar(
            select(func.count(models.Feedback.id)).where(
                models.Feedback.is_true_positive == True
            )
        )
    except Exception:
        tp_count = 0

    # 3) fp_count (false positives)
    try:
        fp_count = await db.scalar(
            select(func.count(models.Feedback.id)).where(
                models.Feedback.is_true_positive == False
            )
        )
    except Exception:
        fp_count = 0

    detection_rate = (tp_count / total_alerts) if total_alerts > 0 else 0.0

    if (tp_count + fp_count) == 0:
        precision = 0.0
        false_positive_rate = 0.0
    else:
        precision = tp_count / (tp_count + fp_count)
        false_positive_rate = fp_count / (tp_count + fp_count)

    mean_latency = 0.0
    try:
        result = await db.execute(
            select(
                func.avg(
                    func.extract(
                        "epoch",
                        models.Feedback.timestamp - models.Alert.timestamp,
                    )
                )
            )
            .select_from(models.Feedback)
            .join(models.Alert, models.Feedback.alert_id == models.Alert.id)
        )
        avg_seconds = result.scalar() or 0.0
        mean_latency = avg_seconds * 1000.0
    except Exception:
        mean_latency = 0.0

    return {
        "precision": precision,
        "detection_rate": detection_rate,
        "false_positive_rate": false_positive_rate,
        "mean_alert_latency": mean_latency,
    }


@app.post("/simulate/{attack_name}")
async def simulate_attack(attack_name: str):
    # Placeholder: implement SSH to Kali or local script
    # For now, just echo back the attack name
    return {"status": "simulated", "attack": attack_name}
