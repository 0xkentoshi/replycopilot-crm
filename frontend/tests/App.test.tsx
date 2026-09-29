import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import App, { scenarios } from "../src/App";
import { api } from "../src/api/client";
import type { Analysis } from "../src/types";

vi.mock("../src/api/client", () => ({
  api: { health: vi.fn(), knowledge: vi.fn(), analyze: vi.fn() },
}));
const response: Analysis = {
  intent: "pricing",
  customer_reply: "Настройка — от 25 000 ₽.",
  manager_hint: "Предложите ведение.",
  upsell_opportunity: "medium",
  confidence: 0.86,
  used_knowledge: [
    {
      id: "ad",
      title: "Настройка рекламы",
      matched_facts: ["Цена от 25 000 ₽"],
    },
  ],
  missing_information: ["Требования клиента"],
  rationale: "Использована стоимость из KB.",
};
beforeEach(() => {
  localStorage.clear();
  vi.mocked(api.health).mockResolvedValue({ status: "ok", mode: "demo" });
  vi.mocked(api.knowledge).mockResolvedValue([]);
  vi.mocked(api.analyze).mockResolvedValue(response);
});

test("theme toggles and persists across remounts", async () => {
  const user = userEvent.setup();
  const view = render(<App />);
  await user.click(screen.getByRole("button", { name: "Включить тёмную тему" }));
  expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  expect(localStorage.getItem("replycopilot-theme")).toBe("dark");
  view.unmount();
  render(<App />);
  expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  await user.click(screen.getByRole("button", { name: "Включить светлую тему" }));
  expect(document.documentElement).toHaveAttribute("data-theme", "light");
  expect(localStorage.getItem("replycopilot-theme")).toBe("light");
});

test("knowledge accordion opens one category and preserves the selected article", async () => {
  vi.mocked(api.knowledge).mockResolvedValue([
    { id: "advertising", title: "Настройка рекламы", category: "Реклама", facts: ["Факт рекламы"], upsell: "", keywords: [] },
    { id: "landing", title: "Лендинг", category: "Разработка", facts: ["Факт лендинга"], upsell: "", keywords: [] },
  ]);
  const user = userEvent.setup();
  render(<App />);
  const advertising = await screen.findByRole("button", { name: "Реклама" });
  const development = screen.getByRole("button", { name: "Разработка" });
  expect(advertising).toHaveAttribute("aria-expanded", "true");
  await user.click(development);
  expect(advertising).toHaveAttribute("aria-expanded", "false");
  await user.click(screen.getByRole("button", { name: "Лендинг" }));
  await user.click(advertising);
  expect(development).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByText("Факт лендинга")).toBeVisible();
  await user.click(development);
  expect(screen.getByRole("button", { name: "Лендинг" })).toHaveAttribute("aria-pressed", "true");
  await user.type(screen.getByRole("textbox", { name: "Поиск в базе знаний" }), "рекламы");
  expect(advertising).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("button", { name: "Настройка рекламы" })).toBeVisible();
});

test("scenario fills the editor and analyzes the chosen message", async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText("ДЕМО-РЕЖИМ");
  await user.click(screen.getByRole("button", { name: /Нет данных/ }));
  expect(
    screen.getByRole("textbox", { name: "Сообщение клиента" }),
  ).toHaveValue(scenarios[4].text);
  await user.click(screen.getByRole("button", { name: "Анализировать с ИИ" }));
  expect(api.analyze).toHaveBeenCalledWith(scenarios[4].text);
});

test("renders separate blocks and sources, copies only reply, clears stale results", async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText("ДЕМО-РЕЖИМ");
  await user.click(screen.getByRole("button", { name: "Анализировать с ИИ" }));
  expect(await screen.findByText(response.customer_reply)).toBeVisible();
  expect(screen.getByText("ВНУТРЕННЕЕ · НЕ ДЛЯ КЛИЕНТА")).toBeVisible();
  const sources = screen.getByText("ИСПОЛЬЗОВАННЫЕ ДАННЫЕ").closest("details");
  const rationale = screen.getByText("Почему такой ответ?").closest("details");
  expect(sources).not.toHaveAttribute("open");
  expect(rationale).not.toHaveAttribute("open");
  await user.click(screen.getByText("ИСПОЛЬЗОВАННЫЕ ДАННЫЕ"));
  expect(screen.getByText("Цена от 25 000 ₽")).toBeVisible();
  expect(screen.getByText("Требования клиента")).toBeVisible();
  expect(
    screen.queryByRole("button", { name: /Regenerate/i }),
  ).not.toBeInTheDocument();
  const copy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  await user.click(screen.getByRole("button", { name: "Скопировать ответ" }));
  expect(copy).toHaveBeenCalledWith(response.customer_reply);
  expect(screen.getByText("Скопировано")).toBeVisible();
  await user.click(screen.getByRole("button", { name: /Сроки/ }));
  expect(screen.queryByText(response.customer_reply)).not.toBeInTheDocument();
});

test("provider failure is actionable and can be retried", async () => {
  vi.mocked(api.analyze).mockRejectedValueOnce(
    new Error("AI-сервис недоступен"),
  );
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText("ДЕМО-РЕЖИМ");
  await user.click(screen.getByRole("button", { name: "Анализировать с ИИ" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "AI-сервис недоступен",
  );
  await user.click(screen.getByRole("button", { name: "Попробовать снова" }));
  await waitFor(() =>
    expect(screen.getByText(response.customer_reply)).toBeVisible(),
  );
});
