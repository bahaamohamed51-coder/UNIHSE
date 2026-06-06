import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Gemini
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
}) : null;

// Dynamic configuration for Google Sheets URL from environment or config.json
let SHEETS_URL = process.env.GOOGLE_SHEET_WEBAPP_URL || "https://script.google.com/macros/s/AKfycby9vgzOZRpmZimBfrNZO-fB70OKLm6KUeV5keDETVxuE4y2TIVjzxBVfxV3keNsgVI--w/exec";

try {
  const configPath = path.join(process.cwd(), "config.json");
  if (fs.existsSync(configPath)) {
    const configContent = fs.readFileSync(configPath, "utf-8");
    const configData = JSON.parse(configContent);
    if (configData.GOOGLE_SHEET_WEBAPP_URL) {
      SHEETS_URL = configData.GOOGLE_SHEET_WEBAPP_URL;
      console.log("Loaded Google Sheets Web App URL from config.json:", SHEETS_URL);
    }
  }
} catch (err) {
  console.warn("Failed to load custom URL from config.json, using default/env:", err);
}

// Custom fetch utility that handles HTTP redirects (301, 302, 307, 308) for POST and GET requests.
// This is essential when communicating with Google Apps Script, which returns 302 Found redirect codes.
// Standard HTTP client behavior dictates downgrading POST to GET during 301/302/303 redirect.
async function fetchWithRedirect(url: string, options: any = {}): Promise<Response> {
  let currentUrl = url;
  let attempts = 0;
  const maxAttempts = 5;
  let currentOptions = { ...options };

  while (attempts < maxAttempts) {
    const res = await fetch(currentUrl, {
      ...currentOptions,
      redirect: "manual" // Stop auto-following to handle redirects ourselves
    });

    if (res.status === 301 || res.status === 302 || res.status === 303 || res.status === 307 || res.status === 308) {
      const location = res.headers.get("location");
      if (location) {
        currentUrl = new URL(location, currentUrl).toString();
        attempts++;

        // For standard 301, 302, 303 redirects on POST:
        // We MUST downgrade to GET and strip the body, as Google's redirect echo server expects GET and rejects POST body.
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

// Resilient in-memory database - starts empty so all displayed items correspond exactly to Google Sheets data.
let localIncidents: any[] = [];

// Bi-directional ID Mapping and custom format generators
const idMappingCache = new Map<string, string>(); // customId -> sheetsId

function generateHseId(): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  while (true) {
    const randomLetter = letters.charAt(Math.floor(Math.random() * letters.length));
    let digits = "";
    for (let i = 0; i < 5; i++) {
      digits += Math.floor(Math.random() * 10).toString();
    }
    const potentialId = `${randomLetter}${digits}`;
    const isUsedLocally = localIncidents.some(inc => inc.id === potentialId);
    const isUsedInCache = idMappingCache.has(potentialId);
    if (!isUsedLocally && !isUsedInCache) {
      return potentialId;
    }
  }
}

function sheetsIdToCustomId(sheetsId: string): string {
  if (!sheetsId) return "";
  return String(sheetsId).trim();
}

async function refreshIdMappings() {
  if (!SHEETS_URL) return;
  try {
    const response = await fetchWithRedirect(SHEETS_URL);
    if (response.ok) {
      const data = await response.json();
      (data.incidents || []).forEach((row: any) => {
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

async function getOriginalId(customId: string): Promise<string> {
  if (idMappingCache.has(customId)) {
    return idMappingCache.get(customId)!;
  }
  await refreshIdMappings();
  return idMappingCache.get(customId) || customId;
}

const DEFAULT_BRANCHES_MAPPED = [
  { name: "ورشة تجميع الهياكل (Assembly Workshop)", region: "المنطقة الغربية (Western Area)" },
  { name: "مستودع الغازات السامة (Gas Storage Area)", region: "المنطقة الغربية (Western Area)" },
  { name: "رصيف الشحن والتوزيع (Loading Dock)", region: "المنطقة الشرقية (Eastern Area)" },
  { name: "منطقة السلامة الكيميائية (Chemical Zone)", region: "المنطقة الوسطى (Central Area)" },
  { name: "مستودع قطع الغيار واللوجستيات (Parts & Logistics)", region: "المنطقة الوسطى (Central Area)" }
];

const BRANCHES_FILE = path.join(process.cwd(), "branches.json");
const SETTINGS_FILE = path.join(process.cwd(), "settings.json");
const NOTIFICATIONS_FILE = path.join(process.cwd(), "notifications.json");

// Helper to load settings
function getLocalSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const content = fs.readFileSync(SETTINGS_FILE, "utf-8");
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

// Helper to save settings
function saveLocalSettings(settings: any) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error writing settings.json file:", err);
    return false;
  }
}

// Loader for notification logs
function getNotificationLogs() {
  try {
    if (fs.existsSync(NOTIFICATIONS_FILE)) {
      return JSON.parse(fs.readFileSync(NOTIFICATIONS_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading notifications file:", err);
  }
  return [];
}

// Dispatch notification and write to log
function dispatchAdminNotification(incident: any) {
  try {
    const settings = getLocalSettings();
    if (!settings) return;
    
    let logs = getNotificationLogs();

    let attachmentsText = "";
    if (incident.files) {
      if (typeof incident.files === "string") {
        const fileList = incident.files.split(",").map((f: string) => f.trim()).filter(Boolean);
        const urls = fileList.filter((f: string) => f.startsWith("http://") || f.startsWith("https://"));
        if (urls.length > 0) {
          attachmentsText = `\n\n🖼️ <b>معاينة المرفقات والصور:</b>\n` + urls.map((url, idx) => `🔗 <a href="${url}">رابط الصورة #${idx + 1}</a>\n${url}`).join("\n");
        } else {
          attachmentsText = `\n\n📁 <b>الملفات المرفقة:</b> ${incident.files}`;
        }
      } else if (Array.isArray(incident.files)) {
        const urls = incident.files.map((f: any) => typeof f === "string" ? f : (f.url || "")).filter((u: string) => u.startsWith("http"));
        if (urls.length > 0) {
          attachmentsText = `\n\n🖼️ <b>معاينة المرفقات والصور:</b>\n` + urls.map((url, idx) => `🔗 <a href="${url}">رابط الصورة #${idx + 1}</a>\n${url}`).join("\n");
        }
      }
    }

    if (settings.telegramEnabled && settings.telegramBotToken && settings.telegramChatId) {
      const tgMsg = `⚠️ <b>منظومة إدارة المخاطر وسلامة العمل</b> ⚠️\n\n<b>رقم البلاغ:</b> ${incident.id || "جديد"}\n<b>المبلغ:</b> ${incident.employeeName}\n<b>الموقع الجغرافي:</b> ${incident.incidentLocation || "غير محدد"}\n<b>الفرع/المنطقة:</b> ${incident.agency}\n<b>التصنيف:</b> ${incident.classification || "حادث وشيك"}\n<b>الوصف:</b> ${incident.description}\n<b>درجة الخطورة:</b> ${incident.riskScore || 1}/25${attachmentsText}`;

      const tgURL = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`;
      fetch(tgURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: settings.telegramChatId,
          text: tgMsg,
          parse_mode: "HTML"
        })
      })
      .then(async (tgRes) => {
        const textRes = await tgRes.text();
        console.log("Telegram API Response:", textRes);
      })
      .catch((tgErr) => {
        console.error("Failed dispatching Telegram message:", tgErr);
      });

      logs.unshift({
        id: `NTF-TG-${Math.floor(100000 + Math.random() * 900000)}`,
        timestamp: new Date().toISOString(),
        type: "Telegram",
        recipient: settings.telegramChatId,
        message: tgMsg.replace(/<[^>]*>/g, ""),
        status: "Dispatched via Telegram (تم الإرسال عبر تليجرام بنجاح)"
      });
    }

    if (settings.telegramEnabled) {
      fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(logs.slice(0, 100), null, 2), "utf-8");
    }
  } catch (err) {
    console.error("Failed dispatching admin notification log", err);
  }
}

// Dispatch Telegram update notification when an incident is modified/updated
function dispatchAdminUpdateNotification(incidentId: string, updatedFields: { status?: string, correctiveAction?: string, files?: any[], dataFiles?: string, prevStatus?: string }) {
  try {
    const settings = getLocalSettings();
    if (!settings) return;
    
    let logs = getNotificationLogs();
    
    // Attempt to enrich the info if we have details of the incident locally
    const existing = localIncidents.find(inc => inc.id === incidentId);
    const reporter = existing ? existing.employeeName : "مبلغ بالمنشأة";
    const site = existing ? existing.agency : "موقع العمل";
    const currentStatus = updatedFields.prevStatus || (existing ? existing.status : "Open");
    
    const formatStatus = (s: string) => {
      if (s === "Resolved") return "تم الحل (Resolved)";
      if (s === "Open") return "مفتوح (Open)";
      return s;
    };

    let updateSummary = "";
    if (updatedFields.status !== undefined) {
      updateSummary += `• <b>تحديث الحالة:</b> من "${formatStatus(currentStatus)}" إلى "${formatStatus(updatedFields.status)}"\n`;
    }
    if (updatedFields.correctiveAction !== undefined) {
      updateSummary += `• <b>الإجراء التصحيحي المتخذ:</b> ${updatedFields.correctiveAction}\n`;
    }

    let attachmentsText = "";
    if (updatedFields.dataFiles) {
      const fileList = updatedFields.dataFiles.split(",").map((f: string) => f.trim()).filter(Boolean);
      const urls = fileList.filter((f: string) => f.startsWith("http://") || f.startsWith("https://"));
      if (urls.length > 0) {
        attachmentsText = `\n\n🖼️ <b>معاينة المرفقات والصور المضافة:</b>\n` + urls.map((url, idx) => `🔗 <a href="${url}">رابط الصورة #${idx + 1}</a>\n${url}`).join("\n");
      }
    } else if (updatedFields.files && updatedFields.files.length > 0) {
      const fileNames = updatedFields.files.map((f: any) => f.name).join(", ");
      updateSummary += `• <b>الملفات الجديدة المضافة:</b> ${fileNames || "مرفقات صورية"}\n`;
    }

    if (settings.telegramEnabled && settings.telegramBotToken && settings.telegramChatId) {
      const tgMsg = `🔧 <b>تعديل وتحديث في بلاغ سلامة قائم</b> 🔧\n\n<b>رقم البلاغ المعدّل:</b> ${incidentId}\n<b>المبلغ الأصلي:</b> ${reporter}\n<b>الفرع/الموقع:</b> ${site}\n\n<b>التعديلات الجديدة من الموظف:</b>\n${updateSummary}${attachmentsText}`;

      const tgURL = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`;
      fetch(tgURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: settings.telegramChatId,
          text: tgMsg,
          parse_mode: "HTML"
        })
      })
      .then(async (tgRes) => {
        const textRes = await tgRes.text();
        console.log("Telegram API Update Response:", textRes);
      })
      .catch((tgErr) => {
        console.error("Failed dispatching Telegram update message:", tgErr);
      });

      logs.unshift({
        id: `NTF-TG-${Math.floor(100000 + Math.random() * 900000)}`,
        timestamp: new Date().toISOString(),
        type: "Telegram (Update)",
        recipient: settings.telegramChatId,
        message: tgMsg.replace(/<[^>]*>/g, ""),
        status: "Dispatched via Telegram on Update (تم إرسال تعديل الموظف عبر تليجرام)"
      });
    }

    if (settings.telegramEnabled) {
      fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(logs.slice(0, 100), null, 2), "utf-8");
    }
  } catch (err) {
    console.error("Failed dispatching admin update notification log", err);
  }
}

// Helper to load branches (returns BranchInfo[])
function getLocalBranches() {
  try {
    if (fs.existsSync(BRANCHES_FILE)) {
      const content = fs.readFileSync(BRANCHES_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error reading local branches.json file:", err);
  }
  return null;
}

// Helper to save branches (returns boolean)
function saveLocalBranches(branchesList: any[]) {
  try {
    fs.writeFileSync(BRANCHES_FILE, JSON.stringify(branchesList, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error writing branches.json file:", err);
    return false;
  }
}

// API Routes

// 1. Get Branches (Dropdown or Admin panel)
app.get("/api/branches", async (req, res) => {
  // Check local file cache first
  if (fs.existsSync(BRANCHES_FILE)) {
    const localBranches = getLocalBranches();
    if (localBranches !== null) {
      return res.json({ branches: localBranches });
    }
  }

  // Fallback to sheet if local cache does not exist
  if (SHEETS_URL) {
    try {
      const response = await fetchWithRedirect(`${SHEETS_URL}?action=getBranches`);
      if (response.ok) {
        const data = await response.json();
        if (data.branches && data.branches.length > 0) {
          // Normalize to make sure each has region
          const parsed = data.branches.map((b: any) => {
            if (typeof b === "string") {
              return { name: b, region: "المنطقة الغربية (Western Area)" };
            }
            return {
              name: b.name || b.Name || "",
              region: b.region || b.Region || "المنطقة الغربية (Western Area)"
            };
          });
          // Cache locally
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

// Update branches local cache
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

// Push branches back to Google Sheets Web App
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
    } catch (err: any) {
      console.error("Error pushing branches to Google Sheets:", err);
      return res.status(500).json({ error: err.message || "Failed to push to Google Sheets" });
    }
  }
  res.status(400).json({ error: "Google Sheet WebApp URL is not configured" });
});

// 2. Get Incidents (Dynamic retrieval from sheet)
app.get("/api/incidents", async (req, res) => {
  if (SHEETS_URL) {
    try {
      const response = await fetchWithRedirect(SHEETS_URL);
      if (response.ok) {
        const data = await response.json();
        const mappedIncidents = (data.incidents || []).map((row: any) => {
          const sheetsId = row.Id || row.id;
          const customId = sheetsIdToCustomId(sheetsId);
          if (sheetsId && customId) {
            idMappingCache.set(customId, sheetsId);
          }
          return {
            id: customId,
            timestamp: row.Timestamp || row.timestamp,
            employeeName: row.ReporterName || row.employeeName || "General Guest (مبلغ خارجي)",
            incidentLocation: row.IncidentLocation || row.incidentLocation || "المستودع",
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

// 3. Post Incident & Create new row
app.post("/api/incidents", async (req, res) => {
  const { employeeName, incidentLocation, agency, classification, description, severity, probability, riskScore, correctiveAction, files } = req.body;
  const assignedId = generateHseId();
  const newIncident = {
    employeeName: employeeName || "مبلغ غير معروف",
    incidentLocation: incidentLocation || "المستودع",
    agency: agency || "Default Site",
    classification: classification || "nearMiss",
    description: description || "",
    severity: Number(severity) || 1,
    probability: Number(probability) || 1,
    riskScore: Number(riskScore) || 1,
    correctiveAction: correctiveAction || "",
    status: "Open",
    files: files ? files.map((f: any) => f.name).join(", ") : ""
  };

  let persistedResult: any = null;

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
        
        // Cache the mapping
        idMappingCache.set(customId, sheetsId);

        persistedResult = { id: customId, timestamp: new Date().toISOString(), ...newIncident, files: data.files || newIncident.files };
        
        // Save locally to keep in-memory cache synchronized
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
    timestamp: new Date().toISOString(),
    ...newIncident
  };
  localIncidents.unshift(localAdded);
  dispatchAdminNotification(localAdded);
  res.status(201).json(localAdded);
});

// 4. Update Status or corrective fields (User and Admin capability)
app.patch("/api/incidents/:id", async (req, res) => {
  const { id } = req.params;
  const { status, correctiveAction, files } = req.body;

  // Resolve custom ID (e.g. A01253) to the Google Sheets ID representation
  const sheetsId = await getOriginalId(id);

  if (SHEETS_URL) {
    try {
      const actionType = (correctiveAction !== undefined || files !== undefined) 
        ? "updateIncident" 
        : "updateStatus";

      const response = await fetchWithRedirect(SHEETS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          id: sheetsId,
          status: status,
          correctiveAction: correctiveAction,
          files: files || []
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Synchronize in local database/cache
          const index = localIncidents.findIndex(inc => inc.id === id || inc.id === sheetsId);
          let prevStatus = "Open";
          if (index !== -1) {
            prevStatus = localIncidents[index].status || "Open";
            if (status !== undefined) localIncidents[index].status = status;
            if (correctiveAction !== undefined) localIncidents[index].correctiveAction = correctiveAction;
            if (data.files) {
              localIncidents[index].files = data.files;
            } else if (files && Array.isArray(files)) {
              const addedFiles = files.map((f: any) => f.name).join(", ");
              localIncidents[index].files = localIncidents[index].files 
                ? `${localIncidents[index].files}, ${addedFiles}`
                : addedFiles;
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

  const index = localIncidents.findIndex(inc => inc.id === id || inc.id === sheetsId);
  if (index !== -1) {
    const prevStatus = localIncidents[index].status || "Open";
    if (status !== undefined) localIncidents[index].status = status;
    if (correctiveAction !== undefined) localIncidents[index].correctiveAction = correctiveAction;
    if (files && Array.isArray(files)) {
      const addedFiles = files.map((f: any) => f.name).join(", ");
      localIncidents[index].files = localIncidents[index].files 
        ? `${localIncidents[index].files}, ${addedFiles}`
        : addedFiles;
    }
    dispatchAdminUpdateNotification(id, { status, correctiveAction, files, prevStatus });
    res.json(localIncidents[index]);
  } else {
    res.status(404).json({ error: "Incident not encountered" });
  }
});

// GET Settings Endpoint
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

// POST Settings Endpoint
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
          settings: settings
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

// GET Notification Logs Endpoint
app.get("/api/notifications", (req, res) => {
  res.json(getNotificationLogs());
});

// AI Corrective Action Route
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
        systemInstruction: "You are a professional Health, Safety, and Environment (HSE) Consultant. Provide detailed, actionable corrective solutions and prevention protocols tailored to incident metadata.",
      }
    });

    res.json({ suggestions: response.text });
  } catch (error: any) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "Failed to generate suggestions" });
  }
});

// AI HSE Follow-Up Chat Route
app.post("/api/ai/chat", async (req, res) => {
  if (!ai) {
    return res.status(503).json({ error: "Gemini API key not configured" });
  }

  const { incident, messages } = req.body;

  try {
    const systemInstruction = `You are "مساعد السلامة المهنية الذكي" - an elite, supportive Health, Safety, and Environment (HSE) AI Assistant. 
    The user or employee has just submitted the following safety incident:
    
    Incident Location: ${incident?.incidentLocation || "Unknown"}
    Branch/Site: ${incident?.agency || "Unknown"}
    Classification: ${incident?.classification || "Unknown"}
    Description: ${incident?.description || "No description provided"}
    Initial action taken: ${incident?.correctiveAction || "None specified"}
    Risk assessment: Severity ${incident?.severity || 1}/5 | Probability ${incident?.probability || 1}/5 (Risk Score: ${(incident?.severity || 1) * (incident?.probability || 1)})

    Your goal is to converse with the employee, providing them with empathetic, deeply practical, and specialized safety guidance.
    - If they ask how to handle the situation, suggest immediate and clear protective steps.
    - If they ask about required personal protective equipment (PPE / معدات الوقاية الشخصية), specify the exact gear needed.
    - If they ask in Arabic, reply in highly professional and clear Arabic HSE terms.
    - Keep responses professional, encouraging, and focused entirely on human safety, threat mitigation, and preventative compliance.
    - Format your responses using clear markdown structures, standard bold highlights, and bullet points. Do not use verbose system logs.`;

    // Map frontend messages format to Google GenAI format.
    // Frontend structure: [{ sender: "user" | "ai", text: string }]
    // Gemini structure: [{ role: "user" | "model", parts: [{ text: string }] }]
    const geminiContents = (messages || []).map((m: any) => ({
      role: m.sender === "user" ? "user" : "model",
      parts: [{ text: m.text }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: geminiContents,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    res.json({ reply: response.text });
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    res.status(500).json({ error: "Failed to process AI chat response" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
