from app.schemas import (
    AnalyzeResponse,
    Intent,
    KnowledgeEntry,
    ReplyPlan,
    UsedKnowledge,
)

UNKNOWN_REPLY = "Спасибо за обращение! По этому вопросу нужно уточнение: в нашей базе знаний нет подтверждённых условий. Расскажите подробнее о задаче, чтобы менеджер мог проверить возможность и условия выполнения."


def customer_reply(facts: list[str], objection: bool = False) -> str:
    # Hard boundary: only curated greetings + verbatim public KB facts.
    # No provider text, manager hints, confidence, or raw customer input enters here.
    opening = (
        "Понимаю, что стоимость важна. Чтобы корректно сравнить предложения, нужно уточнить состав работ. "
        if objection
        else "Здравствуйте! "
    )
    return opening + " ".join(facts) + " Расскажите немного подробнее о вашей задаче?"


def select_public_facts(
    intent: Intent, entries: list[KnowledgeEntry]
) -> list[UsedKnowledge]:
    # Lightweight aspect selection for the small, curated Russian KB.
    # Both the reply and its citations consume this same selection.
    used = []
    for entry in entries:
        facts = entry.facts
        if intent == "pricing":
            facts = [
                fact
                for fact in facts
                if any(
                    marker in fact.lower()
                    for marker in (
                        "₽",
                        "стоимость",
                        "оценивается",
                        "бесплатна",
                        "бюджет",
                    )
                )
            ]
        elif intent in ("timeline", "ready_to_buy"):
            facts = [
                fact
                for fact in facts
                if "рабочих дней" in fact
                or entry.id == "materials"
                or (entry.id == "scope" and "Перед стартом" in fact)
            ]
        if facts:
            used.append(
                UsedKnowledge(id=entry.id, title=entry.title, matched_facts=facts)
            )
    # The advertising timeline already contains the full launch precondition.
    if any(
        "доступов и материалов" in fact
        for entry in used
        if entry.id != "materials"
        for fact in entry.matched_facts
    ):
        used = [entry for entry in used if entry.id != "materials"]
    return used


def render_response(plan: ReplyPlan, entries: list[KnowledgeEntry]) -> AnalyzeResponse:
    selected = [entry for entry in entries if entry.id in plan.fact_ids]
    used = select_public_facts(plan.intent, selected)
    if plan.intent == "unknown" or not used:
        return AnalyzeResponse(
            intent="unknown",
            customer_reply=UNKNOWN_REPLY,
            manager_hint="Информации в KB недостаточно. Уточните требования и проверьте возможность выполнения у специалиста. Не обещайте интеграцию, цену или сроки.",
            upsell_opportunity="none",
            confidence=0.2,
            used_knowledge=[],
            missing_information=[
                "Подтверждённая возможность и условия выполнения запроса",
                "Требования клиента и состав работ",
            ],
            rationale="В KB нет достаточного подтверждения запроса. Ответ просит уточнение; допродажа не предлагается.",
        )
    selected = [entry for entry in selected if entry.id in {e.id for e in used}]
    advertising = any(e.id == "advertising" for e in selected)
    opportunity = (
        "high" if plan.intent == "ready_to_buy" else "medium" if advertising else "low"
    )
    hint = " ".join(dict.fromkeys(e.upsell for e in selected if e.upsell))
    missing = []
    if plan.intent in ("timeline", "ready_to_buy"):
        hint = (
            "Уточните наличие доступов и материалов, а также целевую дату. Не обещайте конкретную дату запуска. "
            + hint
        )
        missing = [
            "Наличие необходимых доступов и материалов",
            "Точная желаемая дата запуска",
        ]
    if plan.intent == "price_objection":
        hint = "Не спорьте о цене. Уточните scope и состав предложения конкурентов; предложите бесплатную консультацию."
        opportunity = "low"
    return AnalyzeResponse(
        intent=plan.intent,
        customer_reply=customer_reply(
            [fact for e in used for fact in e.matched_facts],
            plan.intent == "price_objection",
        ),
        manager_hint=hint or "Уточните задачу на первичной консультации.",
        upsell_opportunity=opportunity,
        confidence=0.86 if not missing else 0.7,
        used_knowledge=used,
        missing_information=missing,
        rationale=f"Определён запрос: {plan.intent}. Ответ составлен из фактов: {', '.join(e.title for e in selected)}. "
        + (
            "Ведение рекламы предлагается как следующий этап после запуска."
            if advertising
            else "Рекомендация менеджеру основана на связанных услугах из KB."
        ),
    )
