import http from "node:http";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
const statePath = path.join(dataDir, "state.json");
const publicDir = __dirname;
const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || "127.0.0.1";
const telegramToken = process.env.TELEGRAM_BOT_TOKEN || "";
const telegramChatId = process.env.TELEGRAM_CHAT_ID || "";
const appUrl = process.env.APP_URL || "";

const dayShort = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const tasksByDay = {
  "Пн": [
    ["blog", "Снять или выложить 1 рилс без докручивания", "35 мин"],
    ["money", "Клиент СММ: 1,5 часа пачкой", "90 мин"],
    ["money", "По клиенту: посты/рилсы/план съёмки записать в подзадачи", "15 мин"],
    ["blog", "Личный блог: снять или выложить 1 рилс", "35 мин"],
    ["ai", "ИИ-задача под блог или клиентский процесс", "35 мин"],
    ["home", "15 минут поверхности дома", "15 мин"],
    ["family", "20-30 минут детям без телефона", "30 мин"],
    ["body", "10 000 шагов или прогулка по состоянию", "45 мин"],
    ["rest", "Сон до 22:30 или ритуал восстановления", "30 мин"]
  ],
  "Вт": [
    ["blog", "Снять/выложить рилс для личного блога", "35 мин"],
    ["blog", "Сторис + прогрев к наставничеству", "30 мин"],
    ["ai", "ИИ для контента: шаблон/анализ/карусель", "35 мин"],
    ["money", "Проверить диалоги/возможность продажи наставничества", "20 мин"],
    ["family", "10 минут отдельно со старшей", "10 мин"],
    ["family", "Танцы/прогулка без рабочих рывков", "60 мин"],
    ["body", "Шаги", "45 мин"],
    ["rest", "Закрыть день без ночного рабочего запоя", "20 мин"]
  ],
  "Ср": [
    ["blog", "Оффер наставничества: 1 кусок упаковки", "45 мин"],
    ["blog", "Прогрев к продаже: 1 смысл/пост/сторис", "35 мин"],
    ["ai", "Автоматизация контента: один шаблон", "35 мин"],
    ["home", "15 минут поверхности", "15 мин"],
    ["family", "20-30 минут детям без телефона", "30 мин"],
    ["body", "Зарядка/спина/шаги", "30 мин"],
    ["rest", "Один спокойный вечерний ритуал", "20 мин"]
  ],
  "Чт": [
    ["money", "Клиент СММ: 1,5 часа пачкой", "90 мин"],
    ["money", "По клиенту: согласования/отчёт/план съёмки", "20 мин"],
    ["blog", "Рилс: снять 3 дубля и выбрать достаточно хороший", "35 мин"],
    ["ai", "ИИ-система: улучшить один процесс под блог/клиента", "35 мин"],
    ["family", "Танцы/прогулка", "60 мин"],
    ["body", "Шаги", "45 мин"],
    ["rest", "Не работать после 22:00", "20 мин"]
  ],
  "Пт": [
    ["buffer", "Закрыть 1 хвост недели", "40 мин"],
    ["blog", "Лёгкий блог: сторис/пост/идея", "30 мин"],
    ["home", "Одна зона дома: шкаф/кухня/холодильник", "60 мин"],
    ["family", "20-30 минут детям без телефона", "30 мин"],
    ["body", "Тело: шаги/растяжка/запись к специалисту", "45 мин"],
    ["rest", "Восстановление без пользы", "45 мин"]
  ],
  "Сб": [
    ["family", "Качественное семейное время", "90 мин"],
    ["rest", "Один час без решений", "60 мин"],
    ["home", "Лёгкий дом без героизма", "30 мин"],
    ["body", "Шаги/движение", "45 мин"],
    ["blog", "Одна заметка/идея для блога", "20 мин"]
  ],
  "Вс": [
    ["buffer", "Обзор недели", "30 мин"],
    ["buffer", "План на неделю: 3 главных результата", "30 мин"],
    ["family", "Семейное время или свидание", "90 мин"],
    ["rest", "Восстановление", "60 мин"],
    ["blog", "Подготовить 1 черновик", "30 мин"]
  ]
};

const planningDefaults = [
  { id: "client", type: "money", title: "Клиент СММ", items: ["3 поста", "4 рилса", "Съездить к ним для съёмок"] },
  { id: "blog", type: "blog", title: "Мой блог", items: ["3 рилса", "2 экспертных поста/карусели", "1 продающий смысл"] },
  { id: "offer", type: "blog", title: "Наставничество / продажи", items: ["Сформулировать результат наставничества", "Описать формат и цену", "Сделать призыв к диалогу"] },
  { id: "ai", type: "ai", title: "ИИ-система", items: ["Шаблон для рилсов", "Постинг в TG", "Разбор директ-сообщений"] },
  { id: "family", type: "family", title: "Семья / дети", items: ["1 час с детьми без телефона", "10 минут отдельно со старшей 3 раза", "Мини-свидание с мужем"] },
  { id: "resource", type: "rest", title: "Тело / ресурс / дом", items: ["10 000 шагов по состоянию", "Одна зона дома в пятницу", "Запись на чекап/массаж/спину"] }
];

const defaultState = {
  done: {},
  planning: Object.fromEntries(planningDefaults.map(section => [
    section.id,
    section.items.map(text => ({ text, done: false }))
  ])),
  balance: {
    "Здоровье": 6,
    "Финансы": 5,
    "Карьера/бизнес": 5,
    "Отношения/семья": 6,
    "Саморазвитие": 9,
    "Отдых": 4,
    "Творчество": 5,
    "Внутренний ресурс": 5
  },
  log: []
};

async function loadState() {
  await mkdir(dataDir, { recursive: true });
  try {
    const raw = await readFile(statePath, "utf8");
    return mergeState(defaultState, JSON.parse(raw));
  } catch {
    await saveState(defaultState);
    return structuredClone(defaultState);
  }
}

function mergeState(base, next) {
  return {
    ...structuredClone(base),
    ...next,
    done: { ...base.done, ...(next.done || {}) },
    planning: { ...base.planning, ...(next.planning || {}) },
    balance: { ...base.balance, ...(next.balance || {}) },
    log: Array.isArray(next.log) ? next.log : []
  };
}

async function saveState(state) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(statePath, JSON.stringify(state, null, 2), "utf8");
}

function taskKey(day, index) {
  return `${day}-${index}`;
}

function todayShort() {
  const index = (new Date().getDay() + 6) % 7;
  return dayShort[index];
}

function normalize(text) {
  return String(text || "").toLowerCase().replaceAll("ё", "е").trim();
}

function scoreTask(query, task) {
  const hay = normalize(`${task[0]} ${task[1]}`);
  const q = normalize(query);
  let score = 0;
  for (const token of q.split(/\s+/).filter(Boolean)) {
    if (hay.includes(token)) score += token.length > 3 ? 2 : 1;
  }
  if (q.includes("рилс") && hay.includes("рилс")) score += 6;
  if (q.includes("клиент") && hay.includes("клиент")) score += 6;
  if (q.includes("шаг") && hay.includes("шаг")) score += 6;
  if (q.includes("сон") && hay.includes("сон")) score += 6;
  if (q.includes("дет") && hay.includes("дет")) score += 5;
  if (q.includes("ии") && hay.includes("ии")) score += 5;
  if (q.includes("дом") && hay.includes("дом")) score += 4;
  return score;
}

function findBestTask(text, day = todayShort()) {
  const tasks = tasksByDay[day] || [];
  let best = { score: 0, index: -1, task: null };
  tasks.forEach((task, index) => {
    const score = scoreTask(text, task);
    if (score > best.score) best = { score, index, task };
  });
  return best.score >= 4 ? best : null;
}

function planningSectionFor(text) {
  const q = normalize(text);
  if (q.includes("клиент") || q.includes("смм")) return "client";
  if (q.includes("блог") || q.includes("рилс") || q.includes("пост") || q.includes("сторис")) return "blog";
  if (q.includes("настав") || q.includes("продаж") || q.includes("оффер")) return "offer";
  if (q.includes("ии") || q.includes("автомат") || q.includes("агент")) return "ai";
  if (q.includes("дет") || q.includes("муж") || q.includes("сем")) return "family";
  if (q.includes("тело") || q.includes("дом") || q.includes("шаг") || q.includes("ресурс") || q.includes("сон")) return "resource";
  return "blog";
}

function cleanUserText(text) {
  return String(text || "")
    .replace(/^\/\w+\s*/i, "")
    .replace(/^(сделала|сделал|готово|выполнила|выполнил|добавь|запланируй|план)\s*/i, "")
    .trim();
}

async function applyTelegramText(messageText) {
  const state = await loadState();
  const text = String(messageText || "").trim();
  const q = normalize(text);
  const day = todayShort();

  if (!text || q === "/start" || q === "старт") {
    return [
      "Я рядом. Пиши мне так:",
      "• сделала рилс",
      "• готово шаги",
      "• /plan клиент 3 поста",
      "• /app",
      "• /today",
      "• /week",
      "• /balance здоровье 7"
    ].join("\n");
  }

  if (q.startsWith("/today")) {
    const tasks = tasksByDay[day] || [];
    return [`Сегодня ${day}:`, ...tasks.map((task, index) => `${state.done[taskKey(day, index)] ? "✓" : "□"} ${task[1]}`)].join("\n");
  }

  if (q.startsWith("/app")) {
    if (!appUrl) {
      return [
        "Мини-апп готов, но Telegram открывает Web App только по публичному https-адресу.",
        "Запусти сервер с APP_URL, например:",
        "APP_URL=\"https://your-domain.ru\" TELEGRAM_BOT_TOKEN=\"...\" node outputs/productivity_planner/server.mjs"
      ].join("\n");
    }
    return {
      text: "Открывай планер как мини-приложение:",
      reply_markup: {
        inline_keyboard: [[
          { text: "Открыть планер", web_app: { url: appUrl } }
        ]]
      }
    };
  }

  if (q.startsWith("/week")) {
    const all = dayShort.flatMap(d => tasksByDay[d].map((_, index) => ({ d, index })));
    const done = all.filter(item => state.done[taskKey(item.d, item.index)]).length;
    return `Неделя закрыта на ${Math.round(done / all.length * 100)}% (${done}/${all.length}).`;
  }

  if (q.startsWith("/balance")) {
    const [, nameRaw, valueRaw] = text.split(/\s+/);
    const value = Number(valueRaw);
    const key = Object.keys(state.balance).find(name => normalize(name).includes(normalize(nameRaw)));
    if (!key || !Number.isFinite(value)) return "Напиши так: /balance здоровье 7";
    state.balance[key] = Math.max(1, Math.min(10, value));
    state.log.unshift({ at: new Date().toISOString(), source: "telegram", text, action: "balance", key, value: state.balance[key] });
    await saveState(state);
    return `Обновила колесо баланса: ${key} = ${state.balance[key]}/10.`;
  }

  if (q.startsWith("/plan") || q.startsWith("запланируй") || q.startsWith("добавь")) {
    const cleaned = cleanUserText(text);
    const sectionId = planningSectionFor(cleaned);
    state.planning[sectionId] ||= [];
    state.planning[sectionId].push({ text: cleaned, done: false });
    state.log.unshift({ at: new Date().toISOString(), source: "telegram", text, action: "plan", sectionId });
    await saveState(state);
    const title = planningDefaults.find(section => section.id === sectionId)?.title || sectionId;
    return `Добавила в "${title}": ${cleaned}`;
  }

  const best = findBestTask(text, day);
  if (best) {
    state.done[taskKey(day, best.index)] = true;
    state.log.unshift({ at: new Date().toISOString(), source: "telegram", text, action: "done", day, taskIndex: best.index });
    await saveState(state);
    return `Зафиксировала: ${day} — ${best.task[1]}.`;
  }

  const sectionId = planningSectionFor(text);
  state.planning[sectionId] ||= [];
  state.planning[sectionId].push({ text: cleanUserText(text), done: false });
  state.log.unshift({ at: new Date().toISOString(), source: "telegram", text, action: "note", sectionId });
  await saveState(state);
  return "Не нашла точную задачу в сегодняшнем чек-листе, поэтому добавила как подзадачу в план недели.";
}

async function json(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://localhost:${port}`);
  const filePath = path.normalize(path.join(publicDir, url.pathname === "/" ? "index.html" : url.pathname));
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("not file");
    const ext = path.extname(filePath);
    const contentType = ext === ".html" ? "text/html; charset=utf-8" : ext === ".js" ? "text/javascript" : ext === ".css" ? "text/css" : "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${port}`);
    if (url.pathname === "/api/state" && req.method === "GET") return sendJson(res, await loadState());
    if (url.pathname === "/api/state" && req.method === "POST") {
      const incoming = await json(req);
      const state = mergeState(await loadState(), incoming);
      await saveState(state);
      return sendJson(res, state);
    }
    if (url.pathname === "/api/telegram/text" && req.method === "POST") {
      const { text } = await json(req);
      return sendJson(res, { reply: await applyTelegramText(text) });
    }
    return serveStatic(req, res);
  } catch (error) {
    sendJson(res, { error: error.message }, 500);
  }
});

server.listen(port, host, () => {
  console.log(`Planner app: http://${host}:${port}`);
  if (appUrl) console.log(`Telegram Mini App URL: ${appUrl}`);
  else console.log("Mini App button is off. Set APP_URL to a public https URL to enable /app.");
  if (telegramToken) startTelegramPolling().catch(error => console.error("Telegram polling failed:", error));
  else console.log("Telegram bot is off. Set TELEGRAM_BOT_TOKEN to enable polling.");
});

async function telegram(method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${telegramToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`Telegram ${method} failed: ${response.status}`);
  return response.json();
}

async function startTelegramPolling() {
  let offset = 0;
  console.log("Telegram bot polling is on.");
  while (true) {
    const data = await telegram("getUpdates", { offset, timeout: 25, allowed_updates: ["message"] });
    for (const update of data.result || []) {
      offset = update.update_id + 1;
      const message = update.message;
      if (!message?.text) continue;
      if (telegramChatId && String(message.chat.id) !== String(telegramChatId)) {
        await telegram("sendMessage", { chat_id: message.chat.id, text: "Этот бот привязан к другому чату." });
        continue;
      }
      const reply = await applyTelegramText(message.text);
      if (typeof reply === "string") {
        await telegram("sendMessage", { chat_id: message.chat.id, text: reply });
      } else {
        await telegram("sendMessage", { chat_id: message.chat.id, ...reply });
      }
    }
  }
}
