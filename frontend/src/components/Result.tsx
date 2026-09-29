import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  LockKeyhole,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import type { Analysis } from "../types";

export const intents: Record<string, string> = {
  pricing: "Запрос цены",
  timeline: "Сроки запуска",
  ready_to_buy: "Готовность к покупке",
  price_objection: "Возражение по цене",
  information: "Вопрос об услуге",
  unknown: "Нужно уточнение",
};

export function Result({ result }: { result: Analysis }) {
  const opportunityLabels = { none: "НЕТ", low: "НИЗКАЯ", medium: "СРЕДНЯЯ", high: "ВЫСОКАЯ" };
  const sourceCount = result.used_knowledge.length;
  const sourceLabel = sourceCount === 1 ? "источник" : sourceCount >= 2 && sourceCount <= 4 ? "источника" : "источников";
  const [copyState, setCopyState] = useState("");
  useEffect(() => {
    setCopyState("");
  }, [result]);
  useEffect(() => {
    if (!copyState) return;
    const timer = setTimeout(() => setCopyState(""), 2500);
    return () => clearTimeout(timer);
  }, [copyState]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(result.customer_reply);
      setCopyState("Скопировано");
    } catch {
      setCopyState("Не удалось скопировать — выделите текст");
    }
  }
  return (
    <div className="result">
      <div className="metrics">
        <div>
          <span className="eyebrow">НАМЕРЕНИЕ</span>
          <strong>{intents[result.intent] ?? result.intent}</strong>
        </div>
        <div title="Эвристическая оценка покрытия запросa фактами базы знаний, не вероятность правильности">
          <span className="eyebrow">УВЕРЕННОСТЬ</span>
          <strong>
            {Math.round(result.confidence * 100)}%{" "}
            <span className="tiny">покрытие базы</span>
          </strong>
        </div>
      </div>
      <div className="opportunity">
        <span>Возможность допродажи</span>
        <span className={`level ${result.upsell_opportunity}`}>
          {opportunityLabels[result.upsell_opportunity]}
        </span>
      </div>
      <section className="reply-card">
        <div className="section-label">
          <span>
            <ShieldCheck size={15} /> ОТВЕТ КЛИЕНТУ
          </span>
          <span className="safe-label">Готов к проверке</span>
        </div>
        <p className="reply-text">{result.customer_reply}</p>
        <button className="copy-button" onClick={copy}>
          {copyState === "Скопировано" ? (
            <Check size={15} />
          ) : (
            <Copy size={15} />
          )}{" "}
          {copyState || "Скопировать ответ"}
        </button>
      </section>
      <section className="internal-card">
        <div className="section-label">
          <span>
            <LockKeyhole size={14} /> ВНУТРЕННЕЕ · НЕ ДЛЯ КЛИЕНТА
          </span>
        </div>
        <h3>Подсказка менеджеру</h3>
        <p>{result.manager_hint}</p>
      </section>
      {!!result.missing_information.length && (
        <section className="missing">
          <span className="eyebrow">НЕ ХВАТАЕТ ДАННЫХ</span>
          <ul>
            {result.missing_information.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}
      <details className="why">
        <summary>
          Почему такой ответ? <ChevronDown size={15} />
        </summary>
        <p>{result.rationale}</p>
      </details>
      <details className="sources">
        <summary className="section-label">
          <span>ИСПОЛЬЗОВАННЫЕ ДАННЫЕ</span>
          <span>{sourceCount} {sourceLabel} <ChevronDown size={13} /></span>
        </summary>
        {result.used_knowledge.length ? (
          result.used_knowledge.map((entry, index) => (
            <details key={entry.id} open>
              <summary>
                <span className="source-number">{index + 1}</span>
                {entry.title}
                <ChevronDown size={13} />
              </summary>
              <ul>
                {entry.matched_facts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            </details>
          ))
        ) : (
          <p className="muted">Подтверждённые факты не найдены.</p>
        )}
      </details>
    </div>
  );
}
