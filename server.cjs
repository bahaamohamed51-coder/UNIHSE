var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_fs = __toESM(require("fs"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
var ai = process.env.GEMINI_API_KEY ? new import_genai.GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
}) : null;
var SHEETS_URL = process.env.GOOGLE_SHEET_WEBAPP_URL || "https://script.google.com/macros/s/AKfycby9vgzOZRpmZimBfrNZO-fB70OKLm6KUeV5keDETVxuE4y2TIVjzxBVfxV3keNsgVI--w/exec";
try {
  const configPath = import_path.default.join(process.cwd(), "config.json");
  if (import_fs.default.existsSync(configPath)) {
    const configContent = import_fs.default.readFileSync(configPath, "utf-8");
    const configData = JSON.parse(configContent);
    if (configData.GOOGLE_SHEET_WEBAPP_URL) {
      SHEETS_URL = configData.GOOGLE_SHEET_WEBAPP_URL;
      console.log("Loaded Google Sheets Web App URL from config.json:", SHEETS_URL);
    }
  }
} catch (err) {
  console.warn("Failed to load custom URL from config.json, using default/env:", err);
}
async function fetchWithRedirect(url, options = {}) {
  let currentUrl = url;
  let attempts = 0;
  const maxAttempts = 5;
  let currentOptions = { ...options };
  while (attempts < maxAttempts) {
    const res = await fetch(currentUrl, {
      ...currentOptions,
      redirect: "manual"
      // Stop auto-following to handle redirects ourselves
    });
    if (res.status === 301 || res.status === 302 || res.status === 303 || res.status === 307 || res.status === 308) {
      const location = res.headers.get("location");
      if (location) {
        currentUrl = new URL(location, currentUrl).toString();
        attempts++;
        if (currentOptions.method === "POST" && (res.status === 301 || res.status === 302 || res.status === 303)) {
          currentOptions = {
            ...currentOptions,
            method: "GET"
          };
          delete currentOptions.body;
          if (currentOptions.headers) {
            const headers = { ...currentOptions.headers };
            delete headers["Content-Type"];
            delete headers["content-type"];
            delete headers["Content-Length"];
            delete headers["content-length"];
            currentOptions.headers = headers;
          }
        }
        continue;
      }
    }
    return res;
  }
  throw new Error("Too many redirects");
}
var localIncidents = [];
var idMappingCache = /* @__PURE__ */ new Map();
function generateHseId() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  while (true) {
    const randomLetter = letters.charAt(Math.floor(Math.random() * letters.length));
    let digits = "";
    for (let i = 0; i < 5; i++) {
      digits += Math.floor(Math.random() * 10).toString();
    }
    const potentialId = `${randomLetter}${digits}`;
    const isUsedLocally = localIncidents.some((inc) => inc.id === potentialId);
    const isUsedInCache = idMappingCache.has(potentialId);
    if (!isUsedLocally && !isUsedInCache) {
      return potentialId;
    }
  }
}
function sheetsIdToCustomId(sheetsId) {
  if (!sheetsId) return "";
  return String(sheetsId).trim();
}
async function refreshIdMappings() {
  if (!SHEETS_URL) return;
  try {
    const response = await fetchWithRedirect(SHEETS_URL);
    if (response.ok) {
      const data = await response.json();
      (data.incidents || []).forEach((row) => {
        const sheetsId = row.Id || row.id;
        if (sheetsId) {
          const customId = sheetsIdToCustomId(sheetsId);
          idMappingCache.set(customId, sheetsId);
        }
      });
    }
  } catch (err) {
    console.error("Error refreshing ID mappings from Sheets:", err);
  }
}
async function getOriginalId(customId) {
  if (idMappingCache.has(customId)) {
    return idMappingCache.get(customId);
  }
  await refreshIdMappings();
  return idMappingCache.get(customId) || customId;
}
var DEFAULT_BRANCHES_MAPPED = [
  { name: "\u0648\u0631\u0634\u0629 \u062A\u062C\u0645\u064A\u0639 \u0627\u0644\u0647\u064A\u0627\u0643\u0644 (Assembly Workshop)", region: "\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u063A\u0631\u0628\u064A\u0629 (Western Area)" },
  { name: "\u0645\u0633\u062A\u0648\u062F\u0639 \u0627\u0644\u063A\u0627\u0632\u0627\u062A \u0627\u0644\u0633\u0627\u0645\u0629 (Gas Storage Area)", region: "\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u063A\u0631\u0628\u064A\u0629 (Western Area)" },
  { name: "\u0631\u0635\u064A\u0641 \u0627\u0644\u0634\u062D\u0646 \u0648\u0627\u0644\u062A\u0648\u0632\u064A\u0639 (Loading Dock)", region: "\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0634\u0631\u0642\u064A\u0629 (Eastern Area)" },
  { name: "\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0633\u0644\u0627\u0645\u0629 \u0627\u0644\u0643\u064A\u0645\u064A\u0627\u0626\u064A\u0629 (Chemical Zone)", region: "\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0648\u0633\u0637\u0649 (Central Area)" },
  { name: "\u0645\u0633\u062A\u0648\u062F\u0639 \u0642\u0637\u0639 \u0627\u0644\u063A\u064A\u0627\u0631 \u0648\u0627\u0644\u0644\u0648\u062C\u0633\u062A\u064A\u0627\u062A (Parts & Logistics)", region: "\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0648\u0633\u0637\u0649 (Central Area)" }
];
var BRANCHES_FILE = import_path.default.join(process.cwd(), "branches.json");
var SETTINGS_FILE = import_path.default.join(process.cwd(), "settings.json");
var NOTIFICATIONS_FILE = import_path.default.join(process.cwd(), "notifications.json");
function getLocalSettings() {
  try {
    if (import_fs.default.existsSync(SETTINGS_FILE)) {
      const content = import_fs.default.readFileSync(SETTINGS_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error reading local settings.json file:", err);
  }
  return {
    telegramEnabled: false,
    telegramBotToken: "",
    telegramChatId: ""
  };
}
function saveLocalSettings(settings) {
  try {
    import_fs.default.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error writing settings.json file:", err);
    return false;
  }
}
async function getLatestSettings() {
  if (SHEETS_URL) {
    try {
      const response = await fetchWithRedirect(`${SHEETS_URL}${SHEETS_URL.includes("?") ? "&" : "?"}action=getSettings`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.settings) {
          saveLocalSettings(data.settings);
          return data.settings;
        }
      }
    } catch (err) {
      console.error("Failed to dynamically refresh settings from Sheets:", err);
    }
  }
  return getLocalSettings();
}
function getNotificationLogs() {
  try {
    if (import_fs.default.existsSync(NOTIFICATIONS_FILE)) {
      return JSON.parse(import_fs.default.readFileSync(NOTIFICATIONS_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading notifications file:", err);
  }
  return [];
}
async function dispatchAdminNotification(incident) {
  try {
    const settings = await getLatestSettings();
    if (!settings) return;
    let logs = getNotificationLogs();
    let attachmentsText = "";
    if (incident.files) {
      if (typeof incident.files === "string") {
        const fileList = incident.files.split(",").map((f) => f.trim()).filter(Boolean);
        const urls = fileList.filter((f) => f.startsWith("http://") || f.startsWith("https://"));
        if (urls.length > 0) {
          attachmentsText = `

\u{1F5BC}\uFE0F <b>\u0645\u0639\u0627\u064A\u0646\u0629 \u0627\u0644\u0645\u0631\u0641\u0642\u0627\u062A \u0648\u0627\u0644\u0635\u0648\u0631:</b>
` + urls.map((url, idx) => `\u{1F517} <a href="${url}">\u0631\u0627\u0628\u0637 \u0627\u0644\u0635\u0648\u0631\u0629 #${idx + 1}</a>
${url}`).join("\n");
        } else {
          attachmentsText = `

\u{1F4C1} <b>\u0627\u0644\u0645\u0644\u0641\u0627\u062A \u0627\u0644\u0645\u0631\u0641\u0642\u0629:</b> ${incident.files}`;
        }
      } else if (Array.isArray(incident.files)) {
        const urls = incident.files.map((f) => typeof f === "string" ? f : f.url || "").filter((u) => u.startsWith("http"));
        if (urls.length > 0) {
          attachmentsText = `

\u{1F5BC}\uFE0F <b>\u0645\u0639\u0627\u064A\u0646\u0629 \u0627\u0644\u0645\u0631\u0641\u0642\u0627\u062A \u0648\u0627\u0644\u0635\u0648\u0631:</b>
` + urls.map((url, idx) => `\u{1F517} <a href="${url}">\u0631\u0627\u0628\u0637 \u0627\u0644\u0635\u0648\u0631\u0629 #${idx + 1}</a>
${url}`).join("\n");
        }
      }
    }
    if (settings.telegramEnabled && settings.telegramBotToken && settings.telegramChatId) {
      const getRiskLevelText = (score) => {
        if (score >= 46) return "Very High (\u0645\u0631\u062A\u0641\u0639 \u062C\u062F\u0627\u064B)";
        if (score >= 30) return "High (\u0645\u0631\u062A\u0641\u0639)";
        if (score >= 19) return "Medium Plus (\u0623\u0639\u0644\u0649 \u0645\u0646 \u0627\u0644\u0645\u062A\u0648\u0633\u0637)";
        if (score >= 9) return "Medium (\u0645\u062A\u0648\u0633\u0637)";
        if (score >= 4) return "Low (\u0645\u0646\u062E\u0641\u0636)";
        return "Very Low (\u0645\u0646\u062E\u0641\u0636 \u062C\u062F\u0627\u064B)";
      };
      const tgMsg = `\u26A0\uFE0F <b>\u0645\u0646\u0638\u0648\u0645\u0629 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u062E\u0627\u0637\u0631 \u0648\u0633\u0644\u0627\u0645\u0629 \u0627\u0644\u0639\u0645\u0644</b> \u26A0\uFE0F

<b>\u0631\u0642\u0645 \u0627\u0644\u0628\u0644\u0627\u063A:</b> ${incident.id || "\u062C\u062F\u064A\u062F"}
<b>\u0627\u0644\u0645\u0628\u0644\u063A:</b> ${incident.employeeName}
<b>\u0627\u0644\u0645\u0648\u0642\u0639 \u0627\u0644\u062C\u063A\u0631\u0627\u0641\u064A:</b> ${incident.incidentLocation || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"}
<b>\u0627\u0644\u0641\u0631\u0639/\u0627\u0644\u0645\u0646\u0637\u0642\u0629:</b> ${incident.agency}
<b>\u0627\u0644\u062A\u0635\u0646\u064A\u0641:</b> ${incident.classification || "\u062D\u0627\u062F\u062B \u0648\u0634\u064A\u0643"}
<b>\u0627\u0644\u0648\u0635\u0641:</b> ${incident.description}
<b>\u062F\u0631\u062C\u0629 \u0627\u0644\u062E\u0637\u0648\u0631\u0629:</b> ${getRiskLevelText(incident.riskScore || 1)}${attachmentsText}`;
      const tgURL = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`;
      fetch(tgURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: settings.telegramChatId,
          text: tgMsg,
          parse_mode: "HTML"
        })
      }).then(async (tgRes) => {
        const textRes = await tgRes.text();
        console.log("Telegram API Response:", textRes);
      }).catch((tgErr) => {
        console.error("Failed dispatching Telegram message:", tgErr);
      });
      logs.unshift({
        id: `NTF-TG-${Math.floor(1e5 + Math.random() * 9e5)}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        type: "Telegram",
        recipient: settings.telegramChatId,
        message: tgMsg.replace(/<[^>]*>/g, ""),
        status: "Dispatched via Telegram (\u062A\u0645 \u0627\u0644\u0625\u0631\u0633\u0627\u0644 \u0639\u0628\u0631 \u062A\u0644\u064A\u062C\u0631\u0627\u0645 \u0628\u0646\u062C\u0627\u062D)"
      });
    }
    if (settings.telegramEnabled) {
      import_fs.default.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(logs.slice(0, 100), null, 2), "utf-8");
    }
  } catch (err) {
    console.error("Failed dispatching admin notification log", err);
  }
}
async function dispatchAdminUpdateNotification(incidentId, updatedFields) {
  try {
    const settings = await getLatestSettings();
    if (!settings) return;
    let logs = getNotificationLogs();
    const existing = localIncidents.find((inc) => inc.id === incidentId);
    const reporter = existing ? existing.employeeName : "\u0645\u0628\u0644\u063A \u0628\u0627\u0644\u0645\u0646\u0634\u0623\u0629";
    const site = existing ? existing.agency : "\u0645\u0648\u0642\u0639 \u0627\u0644\u0639\u0645\u0644";
    const currentStatus = updatedFields.prevStatus || (existing ? existing.status : "Open");
    const formatStatus = (s) => {
      if (s === "Resolved") return "\u062A\u0645 \u0627\u0644\u062D\u0644 (Resolved)";
      if (s === "Open") return "\u0645\u0641\u062A\u0648\u062D (Open)";
      return s;
    };
    let updateSummary = "";
    if (updatedFields.status !== void 0) {
      updateSummary += `\u2022 <b>\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u062D\u0627\u0644\u0629:</b> \u0645\u0646 "${formatStatus(currentStatus)}" \u0625\u0644\u0649 "${formatStatus(updatedFields.status)}"
`;
    }
    if (updatedFields.correctiveAction !== void 0) {
      updateSummary += `\u2022 <b>\u0627\u0644\u0625\u062C\u0631\u0627\u0621 \u0627\u0644\u062A\u0635\u062D\u064A\u062D\u064A \u0627\u0644\u0645\u062A\u062E\u0630:</b> ${updatedFields.correctiveAction}
`;
    }
    let attachmentsText = "";
    if (updatedFields.dataFiles) {
      const fileList = updatedFields.dataFiles.split(",").map((f) => f.trim()).filter(Boolean);
      const urls = fileList.filter((f) => f.startsWith("http://") || f.startsWith("https://"));
      if (urls.length > 0) {
        attachmentsText = `

\u{1F5BC}\uFE0F <b>\u0645\u0639\u0627\u064A\u0646\u0629 \u0627\u0644\u0645\u0631\u0641\u0642\u0627\u062A \u0648\u0627\u0644\u0635\u0648\u0631 \u0627\u0644\u0645\u0636\u0627\u0641\u0629:</b>
` + urls.map((url, idx) => `\u{1F517} <a href="${url}">\u0631\u0627\u0628\u0637 \u0627\u0644\u0635\u0648\u0631\u0629 #${idx + 1}</a>
${url}`).join("\n");
      }
    } else if (updatedFields.files && updatedFields.files.length > 0) {
      const fileNames = updatedFields.files.map((f) => f.name).join(", ");
      updateSummary += `\u2022 <b>\u0627\u0644\u0645\u0644\u0641\u0627\u062A \u0627\u0644\u062C\u062F\u064A\u062F\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629:</b> ${fileNames || "\u0645\u0631\u0641\u0642\u0627\u062A \u0635\u0648\u0631\u064A\u0629"}
`;
    }
    if (settings.telegramEnabled && settings.telegramBotToken && settings.telegramChatId) {
      const tgMsg = `\u{1F527} <b>\u062A\u0639\u062F\u064A\u0644 \u0648\u062A\u062D\u062F\u064A\u062B \u0641\u064A \u0628\u0644\u0627\u063A \u0633\u0644\u0627\u0645\u0629 \u0642\u0627\u0626\u0645</b> \u{1F527}

<b>\u0631\u0642\u0645 \u0627\u0644\u0628\u0644\u0627\u063A \u0627\u0644\u0645\u0639\u062F\u0651\u0644:</b> ${incidentId}
<b>\u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0623\u0635\u0644\u064A:</b> ${reporter}
<b>\u0627\u0644\u0641\u0631\u0639/\u0627\u0644\u0645\u0648\u0642\u0639:</b> ${site}

<b>\u0627\u0644\u062A\u0639\u062F\u064A\u0644\u0627\u062A \u0627\u0644\u062C\u062F\u064A\u062F\u0629 \u0645\u0646 \u0627\u0644\u0645\u0648\u0638\u0641:</b>
${updateSummary}${attachmentsText}`;
      const tgURL = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`;
      fetch(tgURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: settings.telegramChatId,
          text: tgMsg,
          parse_mode: "HTML"
        })
      }).then(async (tgRes) => {
        const textRes = await tgRes.text();
        console.log("Telegram API Update Response:", textRes);
      }).catch((tgErr) => {
        console.error("Failed dispatching Telegram update message:", tgErr);
      });
      logs.unshift({
        id: `NTF-TG-${Math.floor(1e5 + Math.random() * 9e5)}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        type: "Telegram (Update)",
        recipient: settings.telegramChatId,
        message: tgMsg.replace(/<[^>]*>/g, ""),
        status: "Dispatched via Telegram on Update (\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0645\u0648\u0638\u0641 \u0639\u0628\u0631 \u062A\u0644\u064A\u062C\u0631\u0627\u0645)"
      });
    }
    if (settings.telegramEnabled) {
      import_fs.default.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(logs.slice(0, 100), null, 2), "utf-8");
    }
  } catch (err) {
    console.error("Failed dispatching admin update notification log", err);
  }
}
function getLocalBranches() {
  try {
    if (import_fs.default.existsSync(BRANCHES_FILE)) {
      const content = import_fs.default.readFileSync(BRANCHES_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error reading local branches.json file:", err);
  }
  return null;
}
function saveLocalBranches(branchesList) {
  try {
    import_fs.default.writeFileSync(BRANCHES_FILE, JSON.stringify(branchesList, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error writing branches.json file:", err);
    return false;
  }
}
app.get("/api/branches", async (req, res) => {
  if (import_fs.default.existsSync(BRANCHES_FILE)) {
    const localBranches = getLocalBranches();
    if (localBranches !== null) {
      return res.json({ branches: localBranches });
    }
  }
  if (SHEETS_URL) {
    try {
      const response = await fetchWithRedirect(`${SHEETS_URL}?action=getBranches`);
      if (response.ok) {
        const data = await response.json();
        if (data.branches && data.branches.length > 0) {
          const parsed = data.branches.map((b) => {
            if (typeof b === "string") {
              return { name: b, region: "\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u063A\u0631\u0628\u064A\u0629 (Western Area)" };
            }
            return {
              name: b.name || b.Name || "",
              region: b.region || b.Region || "\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u063A\u0631\u0628\u064A\u0629 (Western Area)"
            };
          });
          saveLocalBranches(parsed);
          return res.json({ branches: parsed });
        }
      }
    } catch (err) {
      console.error("Error fetching branches from Google Sheets, using default fallback:", err);
    }
  }
  return res.json({ branches: DEFAULT_BRANCHES_MAPPED });
});
app.post("/api/branches", (req, res) => {
  const { branches } = req.body;
  if (!branches || !Array.isArray(branches)) {
    return res.status(400).json({ error: "Branches list is required and must be an array" });
  }
  const success = saveLocalBranches(branches);
  if (success) {
    res.json({ success: true, branches });
  } else {
    res.status(500).json({ error: "Failed to persist branches locally" });
  }
});
app.post("/api/branches/push-sheets", async (req, res) => {
  const { branches } = req.body;
  const listToPush = branches || getLocalBranches() || DEFAULT_BRANCHES_MAPPED;
  if (SHEETS_URL) {
    try {
      const response = await fetchWithRedirect(SHEETS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setBranches",
          branches: listToPush
        })
      });
      if (response.ok) {
        const data = await response.json();
        return res.json({ success: true, message: "Successfully synced with Google Sheets", details: data });
      } else {
        return res.status(500).json({ error: "Google Sheets WebApp returned error response" });
      }
    } catch (err) {
      console.error("Error pushing branches to Google Sheets:", err);
      return res.status(500).json({ error: err.message || "Failed to push to Google Sheets" });
    }
  }
  res.status(400).json({ error: "Google Sheet WebApp URL is not configured" });
});
app.get("/api/incidents", async (req, res) => {
  if (SHEETS_URL) {
    try {
      const response = await fetchWithRedirect(SHEETS_URL);
      if (response.ok) {
        const data = await response.json();
        const mappedIncidents = (data.incidents || []).map((row) => {
          const sheetsId = row.Id || row.id;
          const customId = sheetsIdToCustomId(sheetsId);
          if (sheetsId && customId) {
            idMappingCache.set(customId, sheetsId);
          }
          return {
            id: customId,
            timestamp: row.Timestamp || row.timestamp,
            employeeName: row.ReporterName || row.employeeName || "General Guest (\u0645\u0628\u0644\u063A \u062E\u0627\u0631\u062C\u064A)",
            incidentLocation: row.IncidentLocation || row.incidentLocation || "\u0627\u0644\u0645\u0633\u062A\u0648\u062F\u0639",
            agency: row.Agency || row.agency,
            classification: row.Classification || row.classification,
            description: row.Description || row.description,
            severity: Number(row.Severity || row.severity || 1),
            probability: Number(row.Probability || row.probability || 1),
            riskScore: Number(row.RiskScore || row.riskScore || 1),
            correctiveAction: row.CorrectiveAction || row.correctiveAction || "",
            status: row.Status || row.status || "Open",
            files: row.Files || row.files || ""
          };
        });
        return res.json(mappedIncidents);
      }
    } catch (err) {
      console.error("Error fetching incidents from Sheets, utilizing default dataset:", err);
    }
  }
  res.json(localIncidents);
});
app.post("/api/incidents", async (req, res) => {
  const { employeeName, incidentLocation, agency, classification, description, severity, probability, riskScore, correctiveAction, files } = req.body;
  const assignedId = generateHseId();
  const newIncident = {
    employeeName: employeeName || "\u0645\u0628\u0644\u063A \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641",
    incidentLocation: incidentLocation || "\u0627\u0644\u0645\u0633\u062A\u0648\u062F\u0639",
    agency: agency || "Default Site",
    classification: classification || "nearMiss",
    description: description || "",
    severity: Number(severity) || 1,
    probability: Number(probability) || 1,
    riskScore: Number(riskScore) || 1,
    correctiveAction: correctiveAction || "",
    status: "Open",
    files: files ? files.map((f) => f.name).join(", ") : ""
  };
  let persistedResult = null;
  if (SHEETS_URL) {
    try {
      const settings = getLocalSettings();
      const response = await fetchWithRedirect(SHEETS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: assignedId,
          ReporterName: newIncident.employeeName,
          IncidentLocation: newIncident.incidentLocation,
          Agency: newIncident.agency,
          Classification: newIncident.classification,
          Description: newIncident.description,
          Severity: newIncident.severity,
          Probability: newIncident.probability,
          RiskScore: newIncident.riskScore,
          CorrectiveAction: newIncident.correctiveAction,
          Status: newIncident.status,
          files: files || []
        })
      });
      if (response.ok) {
        const data = await response.json();
        const sheetsId = data.id || assignedId;
        const customId = sheetsIdToCustomId(sheetsId);
        idMappingCache.set(customId, sheetsId);
        persistedResult = { id: customId, timestamp: (/* @__PURE__ */ new Date()).toISOString(), ...newIncident, files: data.files || newIncident.files };
        localIncidents.unshift(persistedResult);
        dispatchAdminNotification(persistedResult);
        return res.status(201).json(persistedResult);
      }
    } catch (err) {
      console.error("Failed persisting incident to Google Sheets, falling back to local memory:", err);
    }
  }
  const localAdded = {
    id: assignedId,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    ...newIncident
  };
  localIncidents.unshift(localAdded);
  dispatchAdminNotification(localAdded);
  res.status(201).json(localAdded);
});
app.patch("/api/incidents/:id", async (req, res) => {
  const { id } = req.params;
  const { status, correctiveAction, files } = req.body;
  const sheetsId = await getOriginalId(id);
  if (SHEETS_URL) {
    try {
      const actionType = correctiveAction !== void 0 || files !== void 0 ? "updateIncident" : "updateStatus";
      const response = await fetchWithRedirect(SHEETS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          id: sheetsId,
          status,
          correctiveAction,
          files: files || []
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const index2 = localIncidents.findIndex((inc) => inc.id === id || inc.id === sheetsId);
          let prevStatus = "Open";
          if (index2 !== -1) {
            prevStatus = localIncidents[index2].status || "Open";
            if (status !== void 0) localIncidents[index2].status = status;
            if (correctiveAction !== void 0) localIncidents[index2].correctiveAction = correctiveAction;
            if (data.files) {
              localIncidents[index2].files = data.files;
            } else if (files && Array.isArray(files)) {
              const addedFiles = files.map((f) => f.name).join(", ");
              localIncidents[index2].files = localIncidents[index2].files ? `${localIncidents[index2].files}, ${addedFiles}` : addedFiles;
            }
          }
          dispatchAdminUpdateNotification(id, { status, correctiveAction, files, dataFiles: data.files, prevStatus });
          return res.json({ id, status, correctiveAction, files: data.files || "" });
        }
      }
    } catch (err) {
      console.error("Failed updating incident to Google Sheets, falling back locally:", err);
    }
  }
  const index = localIncidents.findIndex((inc) => inc.id === id || inc.id === sheetsId);
  if (index !== -1) {
    const prevStatus = localIncidents[index].status || "Open";
    if (status !== void 0) localIncidents[index].status = status;
    if (correctiveAction !== void 0) localIncidents[index].correctiveAction = correctiveAction;
    if (files && Array.isArray(files)) {
      const addedFiles = files.map((f) => f.name).join(", ");
      localIncidents[index].files = localIncidents[index].files ? `${localIncidents[index].files}, ${addedFiles}` : addedFiles;
    }
    dispatchAdminUpdateNotification(id, { status, correctiveAction, files, prevStatus });
    res.json(localIncidents[index]);
  } else {
    res.status(404).json({ error: "Incident not encountered" });
  }
});
app.get("/api/settings", async (req, res) => {
  if (SHEETS_URL) {
    try {
      const response = await fetchWithRedirect(`${SHEETS_URL}${SHEETS_URL.includes("?") ? "&" : "?"}action=getSettings`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.settings) {
          saveLocalSettings(data.settings);
          return res.json(data.settings);
        }
      }
    } catch (err) {
      console.error("Failed to read settings from Sheets, using local config fallback:", err);
    }
  }
  res.json(getLocalSettings());
});
app.post("/api/settings", async (req, res) => {
  const settings = req.body;
  const success = saveLocalSettings(settings);
  if (SHEETS_URL) {
    try {
      const response = await fetchWithRedirect(SHEETS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setSettings",
          settings
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log("Settings synchronized securely with Google Sheets Database.");
        }
      }
    } catch (err) {
      console.error("Failed to synchronize settings with Google Sheets:", err);
    }
  }
  if (success) {
    res.json({ success: true, settings });
  } else {
    res.status(500).json({ error: "Failed to persist setting structures" });
  }
});
app.get("/api/notifications", (req, res) => {
  res.json(getNotificationLogs());
});
app.post("/api/ai/suggest-corrective-actions", async (req, res) => {
  if (!ai) {
    return res.status(503).json({ error: "Gemini API key not configured" });
  }
  const {
    id,
    employeeName,
    incidentLocation,
    agency,
    classification,
    description,
    severity,
    probability,
    riskScore,
    correctiveAction
  } = req.body;
  try {
    const prompt = `As an expert in HSE (Health, Safety, and Environment) management, provide a comprehensive, professional analysis and immediate action suggestions for the following incident:
    
    Incident Details:
    -----------------
    - Incident Number: ${id || "N/A"}
    - Reporter Name: ${employeeName || "N/A"}
    - Location: ${incidentLocation || "Warehouse / Operations"}
    - Branch/Site: ${agency || "N/A"}
    - Classification: ${classification || "N/A"}
    - Hazard Rating: Severity ${severity || 1}/5 | Probability ${probability || 1}/5 | Risk Score ${riskScore || 1}/25
    - Incident Description: ${description || "No description provided"}
    - Initial Action taken local: ${correctiveAction || "None specified yet"}

    Please analyze the above details and respond with structured, actionable advice containing:
    1. A brief professional analysis of the hazard context and potential root cause.
    2. Exactly 3 to 4 highly-actionable, immediate safety corrective measures specific to this location and branch.
    3. Exactly 2 long-term preventative HSE rules or policy improvements to ensure this type of risk/hazard is mitigated.

    Maintain a highly professional HSE tone. Since the details/language provided may be in Arabic, please deliver your response primarily in Arabic (with professional terminology) so that is easy and clear for the site employees, with brief English side-headings. Use clear bullet points and visual separation.`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a professional Health, Safety, and Environment (HSE) Consultant. Provide detailed, actionable corrective solutions and prevention protocols tailored to incident metadata."
      }
    });
    res.json({ suggestions: response.text });
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "Failed to generate suggestions" });
  }
});
app.post("/api/ai/chat", async (req, res) => {
  if (!ai) {
    return res.status(503).json({ error: "Gemini API key not configured" });
  }
  const { incident, messages } = req.body;
  try {
    const systemInstruction = `You are "\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u0633\u0644\u0627\u0645\u0629 \u0627\u0644\u0645\u0647\u0646\u064A\u0629 \u0627\u0644\u0630\u0643\u064A" - an elite, supportive Health, Safety, and Environment (HSE) AI Assistant. 
    The user or employee has just submitted the following safety incident:
    
    Incident Location: ${incident?.incidentLocation || "Unknown"}
    Branch/Site: ${incident?.agency || "Unknown"}
    Classification: ${incident?.classification || "Unknown"}
    Description: ${incident?.description || "No description provided"}
    Initial action taken: ${incident?.correctiveAction || "None specified"}
    Risk assessment: Severity ${incident?.severity || 1}/5 | Probability ${incident?.probability || 1}/5 (Risk Score: ${(incident?.severity || 1) * (incident?.probability || 1)})

    Your goal is to converse with the employee, providing them with empathetic, deeply practical, and specialized safety guidance.
    - If they ask how to handle the situation, suggest immediate and clear protective steps.
    - If they ask about required personal protective equipment (PPE / \u0645\u0639\u062F\u0627\u062A \u0627\u0644\u0648\u0642\u0627\u064A\u0629 \u0627\u0644\u0634\u062E\u0635\u064A\u0629), specify the exact gear needed.
    - If they ask in Arabic, reply in highly professional and clear Arabic HSE terms.
    - Keep responses professional, encouraging, and focused entirely on human safety, threat mitigation, and preventative compliance.
    - Format your responses using clear markdown structures, standard bold highlights, and bullet points. Do not use verbose system logs.`;
    const geminiContents = (messages || []).map((m) => ({
      role: m.sender === "user" ? "user" : "model",
      parts: [{ text: m.text }]
    }));
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: geminiContents,
      config: {
        systemInstruction
      }
    });
    res.json({ reply: response.text });
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    res.status(500).json({ error: "Failed to process AI chat response" });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
