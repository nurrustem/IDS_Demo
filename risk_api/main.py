import os
import datetime
import json
import re
import logging

from typing import List
from contextlib import asynccontextmanager


from openai import OpenAI

from dotenv import load_dotenv
from fastapi import (
    FastAPI, Depends, HTTPException, BackgroundTasks,
    WebSocket, WebSocketDisconnect
)
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app import models, schemas, scoring
from app.database import engine, Base, get_db
from app.schemas import WeightConfig

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ids_scoring")

# ─── Load environment ────────────────────────────────────────────────────────
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY not set in environment")
client = OpenAI(api_key=OPENAI_API_KEY)

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


# ─── FastAPI & CORS ──────────────────────────────────────────────────────────
app = FastAPI(title="Risk Scoring API", lifespan=lifespan)
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://10.3.3.56",
    "http://10.3.3.200:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── WebSocket Connection Manager ────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()

@app.websocket("/ws/alerts")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection open; client may send pings
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ─── Dependency: default weights ──────────────────────────────────────────────
async def get_weights() -> WeightConfig:
    return WeightConfig()  # you can later load these from a settings table


# ─── Background task: call OpenAI & update DB ────────────────────────────────
async def score_and_explain(alert_id: int, payload: dict):
    logger.info(f"[{alert_id}] Starting ML scoring")
    prompt = (
        "You are an IDS expert. Rate this alert 0–100 and explain your reasoning. "
        "Reply *exactly* as JSON: {\"score\":<number>,\"explanation\":\"<text>\"}\n\n"
        f"{json.dumps(payload)}"
    )
    ml_score = 0.0
    explanation = "No explanation available."
    try:
        rsp = client.responses.create(
            model="gpt-3.5-turbo",
            input=prompt,
            temperature=0,
            max_output_tokens=200
        )
        text = rsp.output_text
        logger.info(f"[{alert_id}] OpenAI response: {text!r}")
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            result = json.loads(m.group())
            ml_score = float(result.get("score", 0))
            explanation = result.get("explanation", "").strip()
    except Exception as e:
        logger.error(f"[{alert_id}] OpenAI error: {e}")

    # Write back to DB
    async with AsyncSession(engine) as session:
        alert_row = await session.get(models.Alert, alert_id)
        alert_row.ml_score = ml_score
        alert_row.explanation = explanation
        session.add(alert_row)
        await session.commit()

    # Notify frontend via WebSocket
    update = {"id": alert_id, "ml_score": ml_score, "explanation": explanation}
    await manager.broadcast(update)


# ─── Endpoint: ingest new alert ───────────────────────────────────────────────
@app.post("/ingest", response_model=schemas.AlertResponse)
async def ingest_alert(
    alert: schemas.AlertCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    # 1) Rule-based score
    rule_score = scoring.score_alert(alert.severity)

    # 2) Create Alert row with ml_score=0
    now = datetime.datetime.now()
    new_alert = models.Alert(
        timestamp=now,
        src_ip=alert.src_ip,
        dest_ip=alert.dest_ip,
        signature=alert.signature,
        severity=alert.severity,
        proto=alert.proto,
        score=rule_score,
        ml_score=0.0,
        explanation=None,
    )
    await db.flush()  # Ensure DB is ready
    dupe = False
    recent_alerts = await db.execute(
        select(models.Alert)
        .where(models.Alert.timestamp >= now - datetime.timedelta(minutes=240))
        .order_by(desc(models.Alert.id))
    )

    for alert_row in recent_alerts.scalars():
        if (
            alert_row.src_ip == new_alert.src_ip and
            alert_row.dest_ip == new_alert.dest_ip and
            alert_row.signature == new_alert.signature and
            alert_row.severity == new_alert.severity and
            alert_row.proto == new_alert.proto and
            alert_row.score == new_alert.score
        ):
            while background_tasks.tasks:
                await background_tasks.tasks[0]
            new_alert.ml_score = alert_row.ml_score
            new_alert.explanation = alert_row.explanation
            dupe = True
            break
    db.add(new_alert)
    await db.commit()
    await db.refresh(new_alert)

    # 3) Return immediately
    response = schemas.AlertResponse(
        id=new_alert.id,
        timestamp=new_alert.timestamp,
        src_ip=new_alert.src_ip,
        dest_ip=new_alert.dest_ip,
        signature=new_alert.signature,
        severity=new_alert.severity,
        proto=new_alert.proto,
        score=new_alert.score,
        ml_score=new_alert.ml_score,
        explanation=new_alert.explanation,
    )

    await manager.broadcast({
       "type": "new_alert",
       "alert": {
           "id":          new_alert.id,
           "timestamp":   new_alert.timestamp.isoformat(),
           "src_ip":      new_alert.src_ip,
           "dest_ip":     new_alert.dest_ip,
           "signature":   new_alert.signature,
           "severity":    new_alert.severity,
           "proto":       new_alert.proto,
           "score":       new_alert.score,
           "ml_score":    new_alert.ml_score,
           "explanation": new_alert.explanation,
       }
    })

    # 4) Kick off background ML scoring
    payload = {
        "id": new_alert.id,
        "timestamp": new_alert.timestamp.isoformat(),
        "src_ip": new_alert.src_ip,
        "dest_ip": new_alert.dest_ip,
        "signature": new_alert.signature,
        "severity": new_alert.severity,
        "proto": new_alert.proto,
    }

    if not dupe:
        background_tasks.add_task(score_and_explain, new_alert.id, payload)
    return response


# ─── Endpoint: recent alerts ──────────────────────────────────────────────────
@app.get("/alerts/recent", response_model=List[schemas.AlertResponse])
async def get_recent_alerts(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(
            select(models.Alert)
            .order_by(desc(models.Alert.id))
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
                ml_score=float(a.ml_score or 0.0),
                explanation=a.explanation,
            )
            for a in alerts
        ]
    except Exception:
        return []


# ─── Endpoint: risk leaderboard ───────────────────────────────────────────────
@app.get("/risks/leaderboard", response_model=List[schemas.RiskEntry])
async def get_leaderboard(
    weights: WeightConfig = Depends(get_weights),
    db: AsyncSession = Depends(get_db),
):
    w1, w2 = weights.rule, weights.ml
    subq = (
        select(
            models.Alert.src_ip.label("src_ip"),
            func.avg(models.Alert.score).label("avg_rule_score"),
            func.avg(models.Alert.ml_score).label("avg_ml_score"),
            (w1 * func.avg(models.Alert.score) + w2 * func.avg(models.Alert.ml_score)).label("combined_score"),
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
            avg_ml_score=float(row.avg_ml_score or 0),
            combined_score=float(row.combined_score or 0),
            count=row.count,
        )
        for row in rows
    ]








# ─── Endpoint: simulate attack ────────────────────────────────────────────────
@app.post("/simulate/{attack_name}")
async def simulate_attack(attack_name: str):
    return {"status": "simulated", "attack": attack_name}
