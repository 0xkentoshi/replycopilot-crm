import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  FileText,
  Layers,
  MessageSquare,
  Moon,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  WandSparkles,
} from "lucide-react";
import { api } from "./api/client";
import { Result } from "./components/Result";
import type { Analysis, Health, KnowledgeEntry } from "./types";

export const scenarios = [
  { label: "Цена", text: "Здравствуйте, сколько стоит настройка рекламы?" },
  { label: "Сроки", text: "Сможете запустить рекламу до следующей недели?" },
  {
    label: "Готов к покупке",
    text: "Нужна настройка рекламы. Если всё устроит, готовы начать на следующей неделе.",
  },
  {
    label: "Возражение по цене",
    text: "Почему так дорого? Конкуренты предложили почти в два раза дешевле.",
  },
  { label: "Нет данных", text: "Можете интегрироваться с нашей ERP X?" },
];

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      return localStorage.getItem("replycopilot-theme") === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("replycopilot-theme", theme);
    } catch {
      // The toggle still works when browser storage is unavailable.
    }
  }, [theme]);
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [selected, setSelected] = useState("advertising");
  const [openCategory, setOpenCategory] = useState<string | null>("Реклама");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState(scenarios[0].text);
  const [analyzedMessage, setAnalyzedMessage] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const inFlight = useRef(false);

  async function connect() {
    setConnectionError("");
    try {
      const [h, k] = await Promise.all([api.health(), api.knowledge()]);
      setHealth(h);
      setKnowledge(k);
    } catch (e) {
      setConnectionError(e instanceof Error ? e.message : "Ошибка соединения");
    }
  }
  useEffect(() => {
    void connect();
  }, []);
  async function analyze() {
    if (!message.trim() || inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError("");
    setResult(null);
    setAnalyzedMessage(message);
    try {
      setResult(await api.analyze(message));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось подготовить ответ");
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }
  function changeMessage(value: string) {
    setMessage(value);
    setResult(null);
    setError("");
    setAnalyzedMessage("");
  }
  const selectedEntry = knowledge.find((e) => e.id === selected);
  const filtered = knowledge.filter((e) =>
    `${e.title} ${e.category} ${e.facts.join(" ")}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="ReplyCopilot CRM">
          <span className="brand-icon">
            <Layers size={20} />
          </span>
          ReplyCopilot <span className="brand-crm">CRM</span>
        </a>
        <span className="workspace">
          Рабочее пространство <ChevronRight size={13} /> Входящие
        </span>
        <div className="topbar-right">
          <span className="prototype">Демо-пространство</span>
          <button
            className="theme-toggle"
            aria-label={theme === "light" ? "Включить тёмную тему" : "Включить светлую тему"}
            title={theme === "light" ? "Включить тёмную тему" : "Включить светлую тему"}
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
          </button>
          <span className="avatar small">АМ</span>
        </div>
      </header>
      <div className="status-strip">
        <span className="strip-title">
          <Sparkles size={14} /> AI Copilot
        </span>
        <span>
          <Check size={13} /> Ответы по базе знаний
        </span>
        <span>
          <ShieldCheck size={13} /> Безопасный ответ клиенту
        </span>
        <span className={`mode ${health ? "" : "offline"}`}>
          <i />
          {health
            ? health.mode === "demo"
              ? "ДЕМО-РЕЖИМ"
              : "ИИ ПОДКЛЮЧЁН"
            : "ПОДКЛЮЧЕНИЕ"}
        </span>
      </div>
      {connectionError && (
        <div className="connection-error" role="alert">
          {connectionError}
          <button onClick={() => void connect()}>Повторить подключение</button>
        </div>
      )}
      <main className="workspace-grid">
        <aside className="knowledge-panel">
          <div className="panel-heading">
            <BookOpen size={17} />
            <h2>База знаний</h2>
            <span className="count">{knowledge.length}</span>
          </div>
          <p className="panel-description">
            Единый источник проверенных фактов
          </p>
          <label className="search">
            <Search size={15} />
            <input
              aria-label="Поиск в базе знаний"
              placeholder="Найти в базе знаний..."
              value={query}
              onChange={(e) => {
                const value = e.target.value;
                setQuery(value);
                setOpenCategory(knowledge.find((entry) =>
                  `${entry.title} ${entry.category} ${entry.facts.join(" ")}`
                    .toLowerCase().includes(value.toLowerCase()),
                )?.category ?? null);
              }}
            />
          </label>
          <nav aria-label="База знаний">
            {[...new Set(filtered.map((e) => e.category))].map((category) => (
              <div className="kb-group" key={category}>
                <h3>
                  <button
                    className="kb-category-toggle"
                    aria-expanded={openCategory === category}
                    aria-controls={`kb-category-${encodeURIComponent(category)}`}
                    onClick={() => setOpenCategory(openCategory === category ? null : category)}
                  >
                    {category}
                    {openCategory === category ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </button>
                </h3>
                <div id={`kb-category-${encodeURIComponent(category)}`} hidden={openCategory !== category}>
                {filtered
                  .filter((e) => e.category === category)
                  .map((entry) => (
                    <button
                      className={`kb-entry ${selected === entry.id ? "active" : ""}`}
                      key={entry.id}
                      onClick={() => setSelected(entry.id)}
                      aria-pressed={selected === entry.id}
                    >
                      <FileText size={15} />
                      <span>{entry.title}</span>
                      {selected === entry.id && <ChevronRight size={13} />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {!filtered.length && (
              <p className="muted">
                {knowledge.length
                  ? "Ничего не найдено"
                  : "Загрузка базы знаний…"}
              </p>
            )}
          </nav>
          {selectedEntry && (
            <section className="kb-preview">
              <span className="eyebrow">Проверенные факты · Только чтение</span>
              <h3>{selectedEntry.title}</h3>
              {selectedEntry.facts.map((fact) => (
                <p key={fact}>{fact}</p>
              ))}
            </section>
          )}
          <div className="kb-footer">
            <ShieldCheck size={14} /> Ответы опираются на эту базу
          </div>
        </aside>
        <section className="conversation-panel">
          <div className="breadcrumb">
            <MessageSquare size={14} /> Диалоги <ChevronRight size={12} />{" "}
            <span>Запуск рекламы</span>
            <span className="lead-id">#ЛИД-042</span>
          </div>
          <div className="client-header">
            <span className="avatar">АП</span>
            <div>
              <h1>Александр Петров</h1>
              <p>
                Запуск рекламы <span>·</span> Входящее обращение
              </p>
            </div>
            <span className="lead-status">
              <i />
              Новый лид
            </span>
          </div>
          <div className="conversation">
            <div className="date-divider">
              <span>Сегодня</span>
            </div>
            <div className="message-row">
              <span className="avatar bubble-avatar">АП</span>
              <div>
                <div className="message-meta">
                  Александр <time>10:24</time>
                </div>
                <div className="bubble customer">
                  Добрый день! Ищем агентство для продвижения нашего проекта.
                </div>
              </div>
            </div>
            <div className="message-row outgoing">
              <div>
                <div className="message-meta">
                  Вы <time>10:25</time>
                </div>
                <div className="bubble manager">
                  Здравствуйте, Александр! Расскажите, какая задача сейчас для
                  вас приоритетна?
                </div>
                <div className="delivered">
                  Прочитано <Check size={11} />
                  <Check size={11} />
                </div>
              </div>
            </div>
            <div className="new-divider">
              <span>Новое обращение</span>
            </div>
            <div className="message-row">
              <span className="avatar bubble-avatar">АП</span>
              <div>
                <div className="message-meta">
                  Александр <time>10:26</time>
                </div>
                <div className="bubble customer current">
                  {analyzedMessage ||
                    message ||
                    "Текст нового обращения появится здесь."}
                </div>
              </div>
            </div>
            <div className="conversation-note">
              <ShieldCheck size={13} /> ИИ готовит черновик. Решение об отправке
              — за вами.
            </div>
          </div>
          <div className="composer">
            <div className="demo-heading">
              <span className="eyebrow">Попробуйте сценарий</span>
              <span>5 примеров</span>
            </div>
            <div className="scenario-list">
              {scenarios.map((scenario, i) => (
                <button
                  disabled={loading}
                  className={message === scenario.text ? "selected" : ""}
                  key={scenario.label}
                  onClick={() => changeMessage(scenario.text)}
                >
                  <span>0{i + 1}</span>
                  {scenario.label}
                </button>
              ))}
            </div>
            <label className="textarea-label" htmlFor="customer-message">
              Сообщение клиента
            </label>
            <textarea
              id="customer-message"
              value={message}
              disabled={loading}
              onChange={(e) => changeMessage(e.target.value)}
              maxLength={4000}
              placeholder="Вставьте обращение клиента…"
            />
            <div className="composer-bottom">
              <span>{message.length} / 4000</span>
              <button
                className="analyze-button"
                disabled={loading || !message.trim() || !health}
                onClick={() => void analyze()}
              >
                <WandSparkles size={16} />
                {loading ? "Анализируем сообщение…" : "Анализировать с ИИ"}
                {!loading && <ArrowRight size={15} />}
              </button>
            </div>
            <p className="composer-caption">
              Черновик ответа и подсказка по продажам появятся справа
            </p>
          </div>
        </section>
        <aside className="copilot-panel">
          <div className="copilot-header">
            <span className="copilot-icon">
              <Sparkles size={18} />
            </span>
            <div>
              <h2>AI Copilot</h2>
              <p>Помощник вашего следующего ответа</p>
            </div>
            <span className="ready-dot" />
          </div>
          <div className="copilot-body" aria-live="polite" aria-busy={loading}>
            {error && (
              <div className="analysis-error" role="alert">
                <CircleHelp size={20} />
                <h3>Не удалось подготовить ответ</h3>
                <p>{error}</p>
                <button onClick={() => void analyze()}>
                  Попробовать снова
                </button>
              </div>
            )}
            {loading && (
              <div className="loading-state">
                <span className="loading-icon">
                  <Sparkles size={23} />
                </span>
                <h3>Анализируем сообщение…</h3>
                <p>Сверяем обращение с базой знаний</p>
                <div className="skeleton" />
                <div className="skeleton short" />
                <div className="skeleton" />
              </div>
            )}
            {result && !loading && (
              <Result result={result} />
            )}
            {!result && !loading && !error && (
              <div className="empty-state">
                <div className="empty-icon">
                  <Sparkles size={30} />
                </div>
                <span className="eyebrow">
                  Больше контекста — точнее ответ.
                </span>
                <h2>
                  Уверенный ответ
                  <br />
                  начинается с фактов
                </h2>
                <p>
                  Выберите сценарий или вставьте сообщение клиента. AI Copilot
                  подготовит ответ и подскажет следующий шаг.
                </p>
                <div className="empty-steps">
                  <span>
                    <span>1</span> Найдёт факты в базе знаний
                  </span>
                  <span>
                    <span>2</span> Составит ответ клиенту
                  </span>
                  <span>
                    <span>3</span> Выделит возможность допродажи
                  </span>
                </div>
                <div className="empty-footer">
                  <LockIcon /> Внутренние заметки отделены от ответа
                </div>
              </div>
            )}
          </div>
          <div className="copilot-footer">
            {health?.mode === "live"
              ? "ИИ подключён · Проверенные факты базы"
              : "Детерминированные ответы · ключ не требуется"}
          </div>
        </aside>
      </main>
      <footer className="app-footer">
        <span>
          ReplyCopilot CRM <span> / </span> Тестовое задание
        </span>
        <span>Демонстрационное рабочее пространство · Без внешних интеграций</span>
      </footer>
    </div>
  );
}

function LockIcon() {
  return <ShieldCheck size={14} />;
}
