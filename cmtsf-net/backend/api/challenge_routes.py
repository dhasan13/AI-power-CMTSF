"""
Interactive Challenge-Response Routes
====================================
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from ..services.challenge_response import ChallengeResponseService

router = APIRouter()
challenge_service = ChallengeResponseService()


class ChallengeStartRequest(BaseModel):
    session_id: str
    trigger_risk_level: Optional[str] = "HIGH"


class ChallengeVerifyRequest(BaseModel):
    session_id: str
    post_challenge_risk: float


@router.post("/challenge/start")
async def start_challenge_endpoint(req: ChallengeStartRequest):
    """
    Generates dynamic prompt challenge when risk score breaches security threshold.
    """
    challenge = challenge_service.generate_challenge(req.session_id)
    return {
        "status": "CHALLENGE_ISSUED",
        "challenge": challenge
    }


@router.post("/challenge/response")
async def verify_challenge_endpoint(req: ChallengeVerifyRequest):
    """
    Evaluates speaker compliance with dynamic challenge.
    """
    result = challenge_service.verify_response(req.session_id, req.post_challenge_risk)
    return result
