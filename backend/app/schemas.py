from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AnalyzeRequest(StrictModel):
    customer_message: str = Field(min_length=1, max_length=4000)

    @field_validator("customer_message")
    @classmethod
    def strip_message(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Message must not be empty")
        return value.strip()


class KnowledgeEntry(StrictModel):
    id: str
    title: str
    category: str
    facts: list[str]
    upsell: str
    keywords: list[str]


Intent = Literal[
    "pricing", "timeline", "ready_to_buy", "price_objection", "information", "unknown"
]


class ReplyPlan(StrictModel):
    # Providers select a plan; they never author customer-visible prose.
    intent: Intent
    fact_ids: list[str] = Field(max_length=4)


class UsedKnowledge(StrictModel):
    id: str
    title: str
    matched_facts: list[str]


class AnalyzeResponse(StrictModel):
    intent: Intent
    customer_reply: str
    manager_hint: str
    upsell_opportunity: Literal["none", "low", "medium", "high"]
    confidence: float = Field(ge=0, le=1)
    used_knowledge: list[UsedKnowledge]
    missing_information: list[str]
    rationale: str
