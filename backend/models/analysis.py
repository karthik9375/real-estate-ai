"""Schemas for the AI lead analysis.

`AIAnalysisOutput` is the exact structure we ask Gemini to return (passed as the
response schema). It deliberately avoids numeric constraints that the Gemini
schema dialect may not support; range checks happen in `ai_service` after the
response has been parsed.

`LeadAnalysis` is what we store and return to the frontend: the validated AI
output plus server-side metadata (model, timestamp, consistency checks).
"""
from datetime import datetime

from pydantic import BaseModel, Field

from models.enums import ConcernCategory, CustomerIntent, FactorImpact, Priority, Urgency


class ScoreFactor(BaseModel):
    factor: str = Field(description="One of: Buying timeline, Budget clarity, Property requirement clarity, Customer intent, Level of engagement, Decision readiness")
    assessment: str = Field(description="One short sentence explaining how this lead performs on this factor, based only on supplied information")
    impact: FactorImpact


class KeyRequirements(BaseModel):
    property_type: str = Field(description="Property type the customer wants, or 'Not specified'")
    preferred_location: str = Field(description="Preferred location(s), or 'Not specified'")
    budget: str = Field(description="Budget as stated by the customer, or 'Not specified'")
    specifications: list[str] = Field(description="Property specifications explicitly mentioned (size, floor, facing, amenities, parking, etc.). Empty list if none")
    other_preferences: list[str] = Field(description="Other customer preferences (schools, commute, possession, builder reputation, etc.). Empty list if none")


class Concern(BaseModel):
    category: ConcernCategory
    detail: str = Field(description="The specific concern or objection, grounded in the customer's words")
    confirmed: bool = Field(description="true if the customer explicitly stated it, false if it is an inferred/possible concern")


class NextAction(BaseModel):
    action: str = Field(description="A clear, practical next step for the salesperson, starting with a verb")
    rationale: str = Field(description="Why this is the best next step for this lead")
    urgency: Urgency
    suggested_timeframe: str = Field(description="When to do it, e.g. 'Within 24 hours', 'This week', 'Next week'")


class AIAnalysisOutput(BaseModel):
    summary: str = Field(description="2-3 sentence summary of what the customer is looking for")
    intent: CustomerIntent
    intent_explanation: str = Field(description="One or two sentences justifying the intent classification")
    score: int = Field(description="Lead score from 0 to 100")
    score_explanation: str = Field(description="Short explanation of the overall score")
    score_factors: list[ScoreFactor] = Field(description="Assessment for each of the six scoring factors")
    priority: Priority
    priority_rationale: str = Field(description="Why this priority. If it deviates from the score bands (Hot >= 70, Warm 40-69, Cold < 40), explain the exceptional circumstance")
    key_requirements: KeyRequirements
    concerns: list[Concern] = Field(description="Objections and concerns. Empty list if none are identifiable")
    concerns_summary: str = Field(description="One sentence overview of concerns. If none, state explicitly that no concerns were identified")
    confirmed_information: list[str] = Field(description="Facts explicitly stated in the lead data")
    assumptions: list[str] = Field(description="Reasonable inferences that are NOT explicitly stated. Empty list if none")
    missing_information: list[str] = Field(description="Important details the salesperson still needs to collect")
    next_action: NextAction
    suggested_response: str = Field(description="Professional, natural reply the salesperson can send to the customer")


class LeadAnalysis(AIAnalysisOutput):
    expected_priority: Priority = Field(description="Priority implied by the score bands")
    priority_override: bool = Field(description="True when AI priority differs from the score band")
    model: str
    analyzed_at: datetime
