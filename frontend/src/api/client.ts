import type { Analysis, Health, KnowledgeEntry } from "../types";

async function request<T>(path: string, body?: object): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new Error(
      "Backend недоступен или не ответил вовремя. Проверьте запуск сервера и повторите попытку.",
    );
  }
  if (!response.ok) {
    throw new Error(
      response.status === 502
        ? "AI-сервис не смог подготовить ответ. Попробуйте ещё раз."
        : "Не удалось выполнить запрос. Проверьте сообщение и повторите попытку.",
    );
  }
  return response.json() as Promise<T>;
}
export const api = {
  health: () => request<Health>("health"),
  knowledge: () => request<KnowledgeEntry[]>("knowledge"),
  analyze: (customer_message: string) =>
    request<Analysis>("analyze", { customer_message }),
};
