import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Inteceptor for fully serverless direct-to-sheets deployment (e.g. on GitHub Pages)
const originalFetch = window.fetch;

const isBrowserDirectMode = 
  window.location.hostname.includes("github.io") ||
  window.location.hostname.includes("gitlab.io") ||
  window.location.hostname.includes("netlify.app") ||
  window.location.hostname.includes("vercel.app") ||
  !(window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname.includes("run.app"));

if (isBrowserDirectMode) {
  console.log("HSE System: Deployed in Browser-to-Sheets direct connection mode (GitHub Pages compatible).");
  
  window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const urlStr = typeof input === "string" ? input : (input instanceof URL ? input.href : input.url);
    
    if (urlStr.startsWith("/api/") || urlStr.includes("/api/")) {
      const path = urlStr.replace(/^https?:\/\/[^\/]+/, "").replace(/^\/?api\//, "");
      
      let config = { GOOGLE_SHEET_WEBAPP_URL: "" };
      try {
        const configRes = await originalFetch("/config.json");
        if (configRes.ok) {
          config = await configRes.json();
        }
      } catch (err) {
        console.warn("HSE System: Direct mode could not read config.json, using fallback URL", err);
      }
      
      const sheetsUrl = config.GOOGLE_SHEET_WEBAPP_URL || "https://script.google.com/macros/s/AKfycbzexnanBi4l1pZ9qOBUA5hO75LNW6WFAegt0oMPTYnxxHTD6sEQRVKjx8LTLTsp61xTDw/exec";
      
      let body: any = {};
      if (init && init.body) {
        try {
          body = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
        } catch (_) {}
      }
      
      const getLocalState = (key: string, def: any) => {
        try {
          const v = localStorage.getItem(key);
          return v ? JSON.parse(v) : def;
        } catch { return def; }
      };
      
      const setLocalState = (key: string, val: any) => {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) {}
      };
      
      // 1. GET incidents
      if (path === "incidents" && (!init || init.method === "GET" || init.method?.toUpperCase() === "GET")) {
        try {
          const response = await originalFetch(sheetsUrl);
          if (response.ok) {
            const data = await response.json();
            const mapped = (data.incidents || []).map((row: any) => ({
              id: String(row.Id || row.id || "").trim(),
              timestamp: row.Timestamp || row.timestamp,
              employeeName: row.ReporterName || row.employeeName || "مبلغ غير معروف",
              incidentLocation: row.IncidentLocation || row.incidentLocation || "المستودع",
              agency: row.Agency || row.agency || "الفرع الرئيسي",
              classification: row.Classification || row.classification || "nearMiss",
              description: row.Description || row.description || "",
              severity: Number(row.Severity || row.severity || 1),
              probability: Number(row.Probability || row.probability || 1),
              riskScore: Number(row.RiskScore || row.riskScore || 1),
              correctiveAction: row.CorrectiveAction || row.correctiveAction || "",
              status: row.Status || row.status || "Open",
              files: row.Files || row.files || ""
            }));
            setLocalState("offline_incidents", mapped);
            return new Response(JSON.stringify(mapped), {
              status: 200,
              headers: { "Content-Type": "application/json" }
            });
          }
        } catch (e) {
          console.warn("HSE System: Direct fetching failed, serving offline cache", e);
        }
        const offlineIncidents = getLocalState("offline_incidents", []);
        return new Response(JSON.stringify(offlineIncidents), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // 2. POST incidents
      if (path === "incidents" && (init && (init.method === "POST" || init.method?.toUpperCase() === "POST"))) {
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const randomLetter = letters.charAt(Math.floor(Math.random() * letters.length));
        let digits = "";
        for (let i = 0; i < 5; i++) {
          digits += Math.floor(Math.random() * 10).toString();
        }
        const assignedId = `${randomLetter}${digits}`;
        
        const payload = {
          id: assignedId,
          ReporterName: body.employeeName || "مبلغ غير معروف",
          IncidentLocation: body.incidentLocation || "المستودع",
          Agency: body.agency || "الفرع الرئيسي",
          Classification: body.classification || "nearMiss",
          Description: body.description || "",
          Severity: Number(body.severity) || 1,
          Probability: Number(body.probability) || 1,
          RiskScore: Number(body.riskScore) || 1,
          CorrectiveAction: body.correctiveAction || "",
          Status: "Open",
          files: body.files || []
        };
        
        let filesStr = body.files ? body.files.map((f: any) => f.name).join(", ") : "";
        let finalId = assignedId;
        
        try {
          const response = await originalFetch(sheetsUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
          });
          if (response.ok) {
            const data = await response.json();
            if (data.id) finalId = data.id;
            if (data.files) filesStr = data.files;
          }
        } catch (err) {
          console.error("HSE System: Sheet sync failed, logging offline in browser", err);
        }
        
        let settings = getLocalState("offline_settings", null);
        if (!settings || !settings.telegramBotToken || !settings.telegramBotToken.trim()) {
          try {
            const tempRes = await originalFetch(`${sheetsUrl}${sheetsUrl.includes("?") ? "&" : "?"}action=getSettings`);
            if (tempRes.ok) {
              const tempData = await tempRes.json();
              if (tempData && tempData.settings) {
                settings = tempData.settings;
                setLocalState("offline_settings", settings);
              }
            }
          } catch (_) {}
        }
        if (!settings) {
          settings = { telegramEnabled: false, telegramBotToken: "", telegramChatId: "" };
        }
        
        if (settings.telegramEnabled && settings.telegramBotToken && settings.telegramChatId) {
          let attachmentsText = "";
          if (filesStr) {
            const urls = filesStr.split(",").map((f: string) => f.trim()).filter((u: string) => u.startsWith("http"));
            if (urls.length > 0) {
              attachmentsText = `\n\n🖼️ <b>معاينة المرفقات والصور:</b>\n` + urls.map((url, idx) => `🔗 <a href="${url}">رابط الصورة #${idx + 1}</a>\n${url}`).join("\n");
            } else {
              attachmentsText = `\n\n📁 <b>الملفات المرفقة:</b> ${filesStr}`;
            }
          }
          
          const getRiskLevelText = (score: number) => {
            if (score >= 46) return "Very High (مرتفع جداً)";
            if (score >= 30) return "High (مرتفع)";
            if (score >= 19) return "Medium Plus (أعلى من المتوسط)";
            if (score >= 9) return "Medium (متوسط)";
            if (score >= 4) return "Low (منخفض)";
            return "Very Low (منخفض جداً)";
          };
          
          const tgMsg = `⚠️ <b>منظومة إدارة المخاطر وسلامة العمل</b> ⚠️\n\n<b>رقم البلاغ:</b> ${finalId}\n<b>المبلغ:</b> ${payload.ReporterName}\n<b>الموقع الجغرافي:</b> ${payload.IncidentLocation}\n<b>الفرع/المنطقة:</b> ${payload.Agency}\n<b>التصنيف:</b> ${payload.Classification}\n<b>الوصف:</b> ${payload.Description}\n<b>درجة الخطورة:</b> ${getRiskLevelText(payload.RiskScore)}${attachmentsText}`;
          
          originalFetch(`https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: settings.telegramChatId,
              text: tgMsg,
              parse_mode: "HTML"
            })
          }).catch(tgErr => console.error("Telegram Direct Dispatch Error:", tgErr));
        }
        
        const responseObj = {
          id: finalId,
          timestamp: new Date().toISOString(),
          employeeName: payload.ReporterName,
          incidentLocation: payload.IncidentLocation,
          agency: payload.Agency,
          classification: payload.Classification,
          description: payload.Description,
          severity: payload.Severity,
          probability: payload.Probability,
          riskScore: payload.RiskScore,
          correctiveAction: payload.CorrectiveAction,
          status: "Open",
          files: filesStr
        };
        
        const offlineIncidents = getLocalState("offline_incidents", []);
        offlineIncidents.unshift(responseObj);
        setLocalState("offline_incidents", offlineIncidents);
        
        return new Response(JSON.stringify(responseObj), {
          status: 201,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // 3. PATCH incidents/:id
      if (path.startsWith("incidents/") && (init && (init.method === "PATCH" || init.method?.toUpperCase() === "PATCH"))) {
        const id = path.split("/")[1];
        const actionType = (body.correctiveAction !== undefined || body.files !== undefined) 
          ? "updateIncident" 
          : "updateStatus";
          
        let finalFiles = "";
        try {
          const response = await originalFetch(sheetsUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
              action: actionType,
              id: id,
              status: body.status,
              correctiveAction: body.correctiveAction,
              files: body.files || []
            })
          });
          if (response.ok) {
            const data = await response.json();
            if (data.files) finalFiles = data.files;
          }
        } catch (err) {
          console.error("HSE System: Sheet update failed, logging offline in browser", err);
        }
        
        const offlineIncidents = getLocalState("offline_incidents", []);
        const idx = offlineIncidents.findIndex((inc: any) => inc.id === id);
        const originalIncident = idx !== -1 ? { ...offlineIncidents[idx] } : null;
        
        if (idx !== -1) {
          if (body.status !== undefined) offlineIncidents[idx].status = body.status;
          if (body.correctiveAction !== undefined) offlineIncidents[idx].correctiveAction = body.correctiveAction;
          if (finalFiles) {
            offlineIncidents[idx].files = finalFiles;
          } else if (body.files && Array.isArray(body.files)) {
            offlineIncidents[idx].files = body.files.map((f: any) => f.name).join(", ");
          }
          setLocalState("offline_incidents", offlineIncidents);
        }
        
        const updatedObj = offlineIncidents[idx] || { id, ...body };
        
        // ----------------- TELEGRAM DISPATCH ON UPDATE -----------------
        let settings = getLocalState("offline_settings", null);
        if (!settings || !settings.telegramBotToken || !settings.telegramBotToken.trim()) {
          try {
            const tempRes = await originalFetch(`${sheetsUrl}${sheetsUrl.includes("?") ? "&" : "?"}action=getSettings`);
            if (tempRes.ok) {
              const tempData = await tempRes.json();
              if (tempData && tempData.settings) {
                settings = tempData.settings;
                setLocalState("offline_settings", settings);
              }
            }
          } catch (_) {}
        }
        if (!settings) {
          settings = { telegramEnabled: false, telegramBotToken: "", telegramChatId: "" };
        }
        
        if (settings.telegramEnabled && settings.telegramBotToken && settings.telegramChatId) {
          const reporter = originalIncident?.employeeName || updatedObj.employeeName || "غير معروف";
          const desc = originalIncident?.description || updatedObj.description || "";
          
          let alertMsg = `🔄 <b>تم تحديث بلاغ/حادث رقم:</b> ${id}\n`;
          alertMsg += `<b>المبلغ:</b> ${reporter}\n`;
          alertMsg += `<b>الوصف الأصلي:</b> ${desc}\n\n`;
          
          if (body.status !== undefined) {
            let statusAr = body.status;
            if (body.status === "Open") statusAr = "مفتوح 🔴";
            if (body.status === "In Progress") statusAr = "قيد المعالجة 🟡";
            if (body.status === "Closed") statusAr = "مغلق 🟢";
            alertMsg += `<b>الحالة الجديدة:</b> ${statusAr}\n`;
          }
          if (body.correctiveAction !== undefined) {
            alertMsg += `<b>الإجراء التصحيحي المضاف:</b> ${body.correctiveAction}\n`;
          }
          
          const filesToNotify = finalFiles || (body.files && Array.isArray(body.files) ? body.files.map((f: any) => f.name).join(", ") : "");
          if (filesToNotify) {
            const urls = filesToNotify.split(",").map((f: string) => f.trim()).filter((u: string) => u.startsWith("http"));
            if (urls.length > 0) {
              alertMsg += `\n🖼️ <b>معاينة المرفقات والصور المضافة:</b>\n` + urls.map((url, idx) => `🔗 <a href="${url}">رابط الصورة #${idx + 1}</a>\n${url}`).join("\n");
            } else {
              alertMsg += `\n📁 <b>الملفات المرفقة المضافة:</b> ${filesToNotify}`;
            }
          }
          
          originalFetch(`https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: settings.telegramChatId,
              text: alertMsg,
              parse_mode: "HTML"
            })
          }).catch(tgErr => console.error("Telegram Update Direct Dispatch Error:", tgErr));
        }
        // ---------------------------------------------------------------
        
        return new Response(JSON.stringify(updatedObj), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // 4. GET settings
      if (path === "settings" && (!init || init.method === "GET" || init.method?.toUpperCase() === "GET")) {
        let fetchedSettings = null;
        try {
          const response = await originalFetch(`${sheetsUrl}${sheetsUrl.includes("?") ? "&" : "?"}action=getSettings`);
          if (response.ok) {
            const data = await response.json();
            if (data && data.settings) {
              fetchedSettings = data.settings;
              setLocalState("offline_settings", data.settings);
            }
          }
        } catch (e) {
          console.warn("HSE System: Sheet settings fetch failed, using cache", e);
        }
        if (!fetchedSettings) {
          fetchedSettings = getLocalState("offline_settings", {
            telegramEnabled: false,
            telegramBotToken: "",
            telegramChatId: ""
          });
        }
        return new Response(JSON.stringify(fetchedSettings), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // 5. POST settings
      if (path === "settings" && (init && (init.method === "POST" || init.method?.toUpperCase() === "POST"))) {
        setLocalState("offline_settings", body);
        try {
          await originalFetch(sheetsUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
              action: "setSettings",
              settings: body
            })
          });
        } catch (err) {
          console.error("HSE System: Setting backup failed.", err);
        }
        return new Response(JSON.stringify({ success: true, settings: body }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // 6. GET branches
      if (path === "branches" && (!init || init.method === "GET" || init.method?.toUpperCase() === "GET")) {
        let fetchedBranches = null;
        try {
          const response = await originalFetch(`${sheetsUrl}${sheetsUrl.includes("?") ? "&" : "?"}action=getBranches`);
          if (response.ok) {
            const data = await response.json();
            if (data && data.branches) {
              const mapped = data.branches.map((b: any) => ({
                name: b.name || b.Name || b[0] || "",
                region: b.region || b.Region || b[1] || ""
              })).filter((b: any) => b.name);
              fetchedBranches = mapped;
              setLocalState("offline_branches", mapped);
            }
          }
        } catch (e) {}
        if (!fetchedBranches) {
          const defBranches = [
            { name: "الفرع الرئيسي - الرياض", region: "الوسطى" },
            { name: "بوابة المستودع الشمالي", region: "الشمالية" },
            { name: "مركز خدمة خطوط الأنابيب", region: "الشرقية" },
            { name: "محطة تعبئة الوقود", region: "الغربية" },
            { name: "قطاع الإنشاءات المدنية", region: "الجنوبية" }
          ];
          fetchedBranches = getLocalState("offline_branches", defBranches);
        }
        return new Response(JSON.stringify({ branches: fetchedBranches }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // 7. POST branches or push-sheets
      if ((path === "branches" || path === "branches/push-sheets") && (init && (init.method === "POST" || init.method?.toUpperCase() === "POST"))) {
        const listToPush = body.branches || [];
        setLocalState("offline_branches", listToPush);
        try {
          await originalFetch(sheetsUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
              action: "setBranches",
              branches: listToPush
            })
          });
        } catch (err) {
          console.error("HSE System: Branch sync failed.", err);
        }
        return new Response(JSON.stringify({ success: true, branches: listToPush }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // 8. GET notification logs
      if (path === "notifications") {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // 9. AI responses
      if (path.startsWith("ai/")) {
        const prompt = body.description || body.prompt || (body.messages && body.messages[body.messages.length - 1]?.text) || "";
        let reply = "";
        
        if (path === "ai/suggest-corrective-actions") {
          const p = prompt.toLowerCase();
          if (p.includes("زيت") || p.includes("انزلاق") || p.includes("slip") || p.includes("oil") || p.includes("ماء") || p.includes("تسرب")) {
            reply = "1. عزل وتنظيف المنطقة المتأثرة بالتسرب فوراً باستخدام المواد الماصة للزيوت.\n2. وضع لوحات تحذيرية صفراء (احذر أرضية رطبة/منزلقة).\n3. فحص الأنابيب والخزانات لتحديد مصدر التسريب وصيانته مباشرة لمنع التكرار.\n4. التنبيه على الموظفين بضرورة ارتداء أحذية السلامة ذات النعل المقاوم للانزلاق.";
          } else if (p.includes("كهرباء") || p.includes("سلك") || p.includes("كابل") || p.includes("elect") || p.includes("wire")) {
            reply = "1. فصل التيار الكهربائي الرئيسي عن الوصلة أو الجهاز المتضرر فوراً.\n2. استدعاء فني الكهرباء المعتمد لاستبدال الأسلاك المكشوفة وتأريض الدائرة.\n3. تجنب تحميل المأخذ الكهربائي بأكثر من طاقته المقررة.\n4. تركيب قواطع تسريب أرضية لحماية العاملين من الصدمات الكهربائية المستقبلية.";
          } else if (p.includes("حريق") || p.includes("دخان") || p.includes("شرر") || p.includes("fire") || p.includes("smoke")) {
            reply = "1. تفعيل جرس الإنذار وإخلاء المنشأة فوراً عبر مخارج الطوارئ المعتمدة.\n2. استخدام طفاية الحريق المناسبة (CO2 أو بودرة جافة) فقط في حال كان الحريق صغيراً ومحصوراً.\n3. الاتصال فوراً بالدفاع المدني وتوجيه الموظفين إلى نقطة التجمع الآمنة.\n4. مراجعة أنظمة مكافحة الحريق الذاتية وفحص صلاحية طفايات الحريق دورياً.";
          } else {
            reply = "1. تأمين موقع الحادث فوراً ومنع غير المختصين من الدخول للحفاظ على سلامتهم.\n2. إلزام كافة العاملين في الموقع باستخدام معدات الحماية الشخصية (PPE) الكاملة.\n3. إعداد ورشة عمل مصغرة للتوعية بالمخاطر المرفقة بالبلاغ ومناقشة طرق الحماية.\n4. مراجعة وتحديث تصريح العمل الآمن وإرشادات منع الحوادث للعملية الحالية.";
          }
        } else if (path === "ai/chat") {
          reply = `مرحباً بك، أنا مستشارك الذكي لإدارة السلامة ومخاطر العمل الرقمية 🛡️. بخصوص استفسارك: "${prompt}"\n\nيُنصح دائماً بوضع سلامة العنصر البشري بالمقام الأول، وتطبيق بروتوكولات الإخلاء وإجراءات العزل الفوري والتبليغ السريع لأقرب مشرف سلامة وصيانة لحماية ممتلكات المنشأة وتقليل معدلات الإصابة. هل تود تفاصيل إضافية عن معدات الوقاية الشخصية أو قواعد الصحة المهنية؟`;
        }
        
        return new Response(JSON.stringify({ suggestion: reply, text: reply }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    return originalFetch(input, init);
  };

  // Silent background pre-fetch for new clients to instantly cache settings & branches
  (async () => {
    try {
      await new Promise(r => setTimeout(r, 800));
      let config = { GOOGLE_SHEET_WEBAPP_URL: "" };
      try {
        const configRes = await originalFetch("/config.json");
        if (configRes.ok) {
          config = await configRes.json();
        }
      } catch (_) {}
      
      const sheetsUrl = config.GOOGLE_SHEET_WEBAPP_URL || "https://script.google.com/macros/s/AKfycbzexnanBi4l1pZ9qOBUA5hO75LNW6WFAegt0oMPTYnxxHTD6sEQRVKjx8LTLTsp61xTDw/exec";
      
      // Pre-fetch settings
      originalFetch(`${sheetsUrl}${sheetsUrl.includes("?") ? "&" : "?"}action=getSettings`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.settings) {
            localStorage.setItem("offline_settings", JSON.stringify(data.settings));
          }
        }).catch(() => {});

      // Pre-fetch branches
      originalFetch(`${sheetsUrl}${sheetsUrl.includes("?") ? "&" : "?"}action=getBranches`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.branches) {
            const mapped = data.branches.map((b: any) => ({
              name: b.name || b.Name || b[0] || "",
              region: b.region || b.Region || b[1] || ""
            })).filter((b: any) => b.name);
            localStorage.setItem("offline_branches", JSON.stringify(mapped));
          }
        }).catch(() => {});
    } catch (_) {}
  })();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
