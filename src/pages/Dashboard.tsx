import React from "react";
import { useStore } from "../store/useStore";
import { translations } from "../i18n/translations";
import { Sidebar } from "../components/Navigation/Sidebar";
import { GlassPanel } from "../components/UI/GlassPanel";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Search,
  Filter,
  Download,
  Activity,
  Sparkles,
  Loader2,
  X,
  FileText,
  ExternalLink,
  ShieldCheck,
  Plus,
  Trash2,
  Edit,
  Upload,
  MessageSquare,
  Mail,
  AlertCircle,
  Database,
  Bell,
  Send
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "../lib/utils";
import * as XLSX from "xlsx";

export default function Dashboard() {
  const { language, isRTL, user } = useStore();
  const t = translations[language];
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Dynamic application state
  const [incidents, setIncidents] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedIncident, setSelectedIncident] = React.useState<any | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Branches state for settings tab
  const [branches, setBranches] = React.useState<any[]>([]);
  const [selectedBranchNames, setSelectedBranchNames] = React.useState<string[]>([]);
  const [branchDeleteConfirm, setBranchDeleteConfirm] = React.useState<{ type: 'single' | 'bulk'; index?: number } | null>(null);
  const [isBranchesLoading, setIsBranchesLoading] = React.useState(false);
  const [isSavingBranches, setIsSavingBranches] = React.useState(false);
  const [isSyncingBranches, setIsSyncingBranches] = React.useState(false);

  // Forms for branch management
  const [isAddingBranch, setIsAddingBranch] = React.useState(false);
  const [isEditingBranch, setIsEditingBranch] = React.useState<any | null>(null); // { index, name, region }
  const [newBranchName, setNewBranchName] = React.useState("");
  const [newBranchRegion, setNewBranchRegion] = React.useState("");

  // Notification / Alert message for branch operations
  const [branchAlert, setBranchAlert] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  // Administrator notifications settings configuration
  const [telegramEnabled, setTelegramEnabled] = React.useState(false);
  const [telegramBotToken, setTelegramBotToken] = React.useState("");
  const [telegramChatId, setTelegramChatId] = React.useState("");
  const [isSavingSettings, setIsSavingSettings] = React.useState(false);
  const [settingsAlert, setSettingsAlert] = React.useState<{type: 'success' | 'error', message: string} | null>(null);
  const [notificationLogs, setNotificationLogs] = React.useState<any[]>([]);
  const [settingsSubTab, setSettingsSubTab] = React.useState<"branches" | "notifications">("branches");

  // Read incident state (localStorage) to support the glowing markers
  const [readIncidentIds, setReadIncidentIds] = React.useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("readIncidents");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Load dynamic data from google sheet API
  const fetchIncidents = React.useCallback(() => {
    setIsLoading(true);
    fetch("/api/incidents")
      .then((res) => res.json())
      .then((data) => {
        setIncidents(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error("Error loaded incident logs:", err))
      .finally(() => setIsLoading(false));
  }, []);

  // Fetch branches from cached database
  const fetchBranches = React.useCallback(() => {
    setIsBranchesLoading(true);
    fetch("/api/branches")
      .then((res) => res.json())
      .then((data) => {
        setBranches(data.branches || []);
      })
      .catch((err) => console.error("Error loading branches list:", err))
      .finally(() => setIsBranchesLoading(false));
  }, []);

  React.useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  React.useEffect(() => {
    if (activeTab === "settings") {
      fetchBranches();
    }
  }, [activeTab, fetchBranches]);

  // Save updated branches array to backend
  const saveBranchesLocal = async (updatedList: any[]) => {
    setIsSavingBranches(true);
    try {
      const response = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branches: updatedList })
      });
      if (response.ok) {
        setBranches(updatedList);
        showBranchAlert("success", language === "en" ? "Changes saved locally." : "تم حفظ التعديلات محلياً بنجاح.");
      } else {
        showBranchAlert("error", language === "en" ? "Failed to save changes." : "فشل في حفظ التعديلات.");
      }
    } catch (err) {
      console.error(err);
      showBranchAlert("error", language === "en" ? "Connection error." : "خطأ في الاتصال بالخادم.");
    } finally {
      setIsSavingBranches(false);
    }
  };

  const showBranchAlert = (type: "success" | "error", message: string) => {
    setBranchAlert({ type, message });
    setTimeout(() => {
      setBranchAlert(null);
    }, 4500);
  };

  // Pull global settings and notification logs when settings tab is loaded
  const fetchSettingsAndLogs = React.useCallback(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        if (data) {
          setTelegramEnabled(!!data.telegramEnabled);
          setTelegramBotToken(data.telegramBotToken || "");
          setTelegramChatId(data.telegramChatId || "");
        }
      })
      .catch(err => console.error("Could not fetch system settings:", err));

    fetch("/api/notifications")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setNotificationLogs(data);
        }
      })
      .catch(err => console.error("Could not fetch notification logs:", err));
  }, []);

  React.useEffect(() => {
    if (activeTab === "settings") {
      fetchSettingsAndLogs();
    }
  }, [activeTab, fetchSettingsAndLogs]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsAlert(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramEnabled,
          telegramBotToken,
          telegramChatId
        })
      });
      if (res.ok) {
        setSettingsAlert({
          type: "success",
          message: language === "en" ? "System notifications updated." : "تم تحديث وحفظ قنوات تواصل إشعارات المدير بنجاح"
        });
        fetchSettingsAndLogs();
      } else {
        setSettingsAlert({
          type: "error",
          message: language === "en" ? "Failed to save configuration." : "فشل في حفظ وتحديث البيانات."
        });
      }
    } catch (err) {
      console.error(err);
      setSettingsAlert({
        type: "error",
        message: language === "en" ? "Network connection error." : "خطأ اتصال بالشبكة."
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Synchronize local branches cache to Google Sheets Web App
  const handlePushBranchesToSheets = async () => {
    setIsSyncingBranches(true);
    try {
      const response = await fetch("/api/branches/push-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branches: branches })
      });
      if (response.ok) {
        showBranchAlert("success", language === "en" ? "Branches successfully synchronized with Google Sheets!" : "تمت مزامنة وإرسال الفروع إلى جوجل شيت بنجاح!");
      } else {
        showBranchAlert("error", language === "en" ? "Failed syncing with Google Sheets webapp." : "فشل تحديث جوجل شيت. يرجى مراجعة صلاحيات رابط الـ Script.");
      }
    } catch (err) {
      console.error(err);
      showBranchAlert("error", language === "en" ? "Error connecting to server sync." : "حدث خطأ أثناء المزامنة مع جوجل شيت.");
    } finally {
      setIsSyncingBranches(false);
    }
  };

  // Generate Excel Template download
  const handleDownloadTemplate = () => {
    const wsData = [
      ["الفرع / الموقع (Branch / Site)", "المنطقة (Region)"],
      ["ورشة تجميع الهياكل (Assembly Workshop)", "المنطقة الغربية (Western Area)"],
      ["مستودع الغازات السامة (Gas Storage Area)", "المنطقة الغربية (Western Area)"],
      ["رصيف الشحن والتوزيع (Loading Dock)", "المنطقة الشرقية (Eastern Area)"],
      ["منطقة السلامة الكيميائية (Chemical Zone)", "المنطقة الوسطى (Central Area)"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Branches list");
    XLSX.writeFile(wb, "branches_template.xlsx");
  };

  // Parse uploaded Excel spreadsheet
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawRows = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });

        if (rawRows.length <= 1) {
          showBranchAlert("error", language === "en" ? "Uploaded file is empty or missing headers." : "الملف المرفوع فارغ أو يفتقر للترويسة.");
          return;
        }

        const importedList: any[] = [];
        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (row && row[0]) {
            importedList.push({
              name: row[0].toString().trim(),
              region: (row[1] || (language === "ar" ? "المنطقة الغربية" : "Western Area")).toString().trim()
            });
          }
        }

        if (importedList.length === 0) {
          showBranchAlert("error", language === "en" ? "No valid rows found in file." : "لم يتم العثور على صفوف صالحة في الملف.");
          return;
        }

        // Merge keeping uniqueness of branch name
        const updatedList = [...branches];
        importedList.forEach(importedItem => {
          const skipIdx = updatedList.findIndex(b => b.name.toLowerCase() === importedItem.name.toLowerCase());
          if (skipIdx !== -1) {
            updatedList[skipIdx] = importedItem; // Overwrite
          } else {
            updatedList.push(importedItem); // Add
          }
        });

        saveBranchesLocal(updatedList);
        showBranchAlert("success", language === "en" ? `Imported ${importedList.length} branches successfully.` : `تم استيراد ${importedList.length} فرع بنجاح.`);
      } catch (err) {
        console.error(err);
        showBranchAlert("error", language === "en" ? "Faulty Excel format." : "حدث خطأ في قراءة وتحليل ملف الإكسل.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ""; // Clear file input
  };

  const handleAddBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    const newBranch = {
      name: newBranchName.trim(),
      region: newBranchRegion.trim() || (language === "en" ? "Western Area" : "المنطقة الغربية")
    };

    if (branches.some(b => b.name.toLowerCase() === newBranch.name.toLowerCase())) {
      showBranchAlert("error", language === "en" ? "Branch already exists." : "اسم الفرع موجود بالفعل.");
      return;
    }

    const updated = [...branches, newBranch];
    saveBranchesLocal(updated);
    setNewBranchName("");
    setNewBranchRegion("");
    setIsAddingBranch(false);
  };

  const handleEditBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditingBranch || !isEditingBranch.name.trim()) return;

    const updated = [...branches];
    updated[isEditingBranch.index] = {
      name: isEditingBranch.name.trim(),
      region: isEditingBranch.region.trim() || (language === "en" ? "Western Area" : "المنطقة الغربية")
    };

    saveBranchesLocal(updated);
    setIsEditingBranch(null);
  };

  const handleDeleteBranch = (index: number) => {
    setBranchDeleteConfirm({ type: 'single', index });
  };

  const confirmDeleteBranch = () => {
    if (!branchDeleteConfirm) return;

    if (branchDeleteConfirm.type === 'single' && branchDeleteConfirm.index !== undefined) {
      const idx = branchDeleteConfirm.index;
      const updated = branches.filter((_, i) => i !== idx);
      saveBranchesLocal(updated);
      
      // Also remove from selection if it was selected
      const deletedName = branches[idx]?.name;
      if (deletedName) {
        setSelectedBranchNames(prev => prev.filter(name => name !== deletedName));
      }
    } else if (branchDeleteConfirm.type === 'bulk') {
      const updated = branches.filter((b) => !selectedBranchNames.includes(b.name));
      saveBranchesLocal(updated);
      setSelectedBranchNames([]);
    }

    setBranchDeleteConfirm(null);
  };

  const handleViewIncident = (inc: any) => {
    setSelectedIncident(inc);
    if (!readIncidentIds.includes(inc.id)) {
      const updated = [...readIncidentIds, inc.id];
      setReadIncidentIds(updated);
      localStorage.setItem("readIncidents", JSON.stringify(updated));
    }
  };

  // Compute stats from active spreadsheets
  const totalCount = incidents.length;
  const activeCount = incidents.filter((i) => i.status !== "Resolved").length;
  const resolvedCount = incidents.filter((i) => i.status === "Resolved").length;
  
  // Custom formulas
  const safetyPercentage = totalCount > 0 
    ? Math.max(50, Math.round(100 - (activeCount * 8))) 
    : 100;
  
  const criticalCount = incidents.filter((i) => Number(i.riskScore) >= 12).length;

  const stats = [
    { label: t.activeIncidents, value: activeCount.toString(), icon: Clock, color: "text-brand-primary" },
    { label: t.resolvedIncidents, value: resolvedCount.toString(), icon: CheckCircle2, color: "text-green-400" },
    { label: t.safetyScore, value: `${safetyPercentage}%`, icon: ShieldCheck, color: "text-brand-secondary" },
    { label: language === "en" ? "Critical Hazards" : "المخاطر الحرجة", value: criticalCount.toString(), icon: AlertTriangle, color: "text-red-400" },
  ];

  // Dynamically formatted trends
  const trendData = incidents.slice(0, 7).reverse().map((inc, index) => ({
    name: inc.id || `INC-${index + 1}`,
    count: inc.riskScore || 5
  }));

  const displayTrendData = trendData.length > 0 ? trendData : [
    { name: 'Mon', count: 4 },
    { name: 'Tue', count: 3 },
    { name: 'Wed', count: 7 },
    { name: 'Thu', count: 2 },
    { name: 'Fri', count: 5 },
    { name: 'Sat', count: 1 },
    { name: 'Sun', count: 3 },
  ];
  // 1. handleToggleStatus allows changing safety incident logs real-time and syncing on sheets
  const handleToggleStatus = async (id: string, targetStatus: "Open" | "Resolved") => {
    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/incidents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus })
      });
      if (response.ok) {
        setIncidents(prev => prev.map(inc => {
          if (inc.id === id) {
            const updated = { ...inc, status: targetStatus };
            if (selectedIncident && selectedIncident.id === id) {
              setSelectedIncident(updated);
            }
            return updated;
          }
          return inc;
        }));
        showBranchAlert("success", language === "en" ? `Status updated successfully to ${targetStatus}!` : `تم تحديث حالة البلاغ بنجاح إلى "${targetStatus === "Resolved" ? "تم الحل" : "جاري الحل"}"`);
      } else {
        showBranchAlert("error", language === "en" ? "Failed updating status." : "فشل في تحديث حالة البلاغ على الخادم.");
      }
    } catch (err) {
      console.error(err);
      showBranchAlert("error", language === "en" ? "Error updating case status." : "خطأ عند محاولة التحديث في قاعدة البيانات.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // 2. Dynamically sorted incidents (Unresolved first, sorted by newest first, then resolved sorted by newest first)
  const sortedIncidents = [...incidents].sort((a, b) => {
    const aIsResolved = a.status === "Resolved";
    const bIsResolved = b.status === "Resolved";

    if (!aIsResolved && bIsResolved) return -1;
    if (aIsResolved && !bIsResolved) return 1;

    // Same status category: sort newest first
    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return timeB - timeA;
  });

  // 3. Searching/Filtering incidents by number (ID), branch, or date
  const filteredIncidents = sortedIncidents.filter((inc) => {
    if (!searchQuery) return true;
    
    const q = searchQuery.toLowerCase().trim();
    const codeMatch = (inc.id || "").toLowerCase().includes(q);
    const branchMatch = (inc.agency || "").toLowerCase().includes(q);
    const employeeMatch = (inc.employeeName || "").toLowerCase().includes(q);

    let dateMatch = false;
    if (inc.timestamp) {
      const parsed = new Date(inc.timestamp);
      const localDate = parsed.toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
        year: 'numeric', month: '2-digit', day: '2-digit'
      });
      const verboseDate = parsed.toLocaleString().toLowerCase();
      dateMatch = localDate.includes(q) || verboseDate.includes(q);
    }
    
    return codeMatch || branchMatch || employeeMatch || dateMatch;
  });

  // 4. Pie Chart Grouping Data
  const classificationCounts = incidents.reduce((acc: any, inc: any) => {
    const label = t.classifications[inc.classification] || inc.classification;
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.keys(classificationCounts).map(name => ({
    name,
    value: classificationCounts[name]
  }));

  const COLORS = ["#00f2ff", "#a855f7", "#10b981", "#ef4444", "#3b82f6", "#f59e0b"];



  return (
    <div className={cn("min-h-screen pb-12 transition-all duration-300", isRTL ? "lg:pr-64" : "lg:pl-64")}>
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      
      {/* Mobile Top Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-[#050510]/85 border-b border-white/10 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-primary/20 rounded-lg flex items-center justify-center border border-brand-primary/30 shrink-0">
            <ShieldCheck className="w-5 h-5 text-brand-primary" />
          </div>
          <span className="font-extrabold text-sm tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white/90 to-brand-primary">UNI HSE</span>
        </div>
        
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 bg-white/5 rounded-xl border border-white/10 text-white/80 active:scale-95 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      
      {/* Floating alert notification */}
      <AnimatePresence>
        {branchAlert && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={cn(
              "fixed top-4 right-4 z-[100] p-4 rounded-xl shadow-2xl border text-sm flex items-center gap-3 min-w-[300px]",
              branchAlert.type === "success" 
                ? "bg-green-500/15 border-green-500/30 text-green-400" 
                : "bg-red-500/15 border-red-500/30 text-red-400"
            )}
          >
            <div className={cn("p-1.5 rounded-lg shrink-0", branchAlert.type === "success" ? "bg-green-500/20" : "bg-red-500/20")}>
              {branchAlert.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>
            <span className="font-semibold leading-relaxed">{branchAlert.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="p-4 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">
            {activeTab === "overview" && t.welcome}
            {activeTab === "incidents" && (language === "en" ? "Incidents Directory" : "سجل الحوادث والبلاغات")}
            {activeTab === "settings" && (language === "en" ? "System Settings" : "إعدادات الفروع والمناطق")}
          </h1>
          <p className="text-white/50 mt-1">
            {activeTab === "overview" && t.dashboard}
            {activeTab === "incidents" && (language === "en" ? "Interactive logs synced with Google Sheets" : "استعراض والتحكم في كافة البلاغات المسجلة والبحث الفوري بها")}
            {activeTab === "settings" && (language === "en" ? "Configure branches, upload spreadsheets and sync sheets" : "تعديل، إضافة، واستيراد الفروع والمناطق المتاحة في النظام ومزامنتها")}
          </p>
        </div>

        {activeTab === "settings" && (
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={handleDownloadTemplate}
              className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4 text-brand-secondary" />
              <span>{language === "en" ? "Download Template" : "تنزيل النموذج الفارغ"}</span>
            </button>

            <label className="bg-white/5 border border-white/10 hover:bg-white/15 hover:border-white/25 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 text-white">
              <Upload className="w-4 h-4 text-brand-primary" />
              <span>{language === "en" ? "Import Excel" : "استيراد إكسل للفروع"}</span>
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                onChange={handleImportExcel} 
                className="hidden" 
              />
            </label>

            <button
              onClick={() => setIsAddingBranch(true)}
              className="bg-white/5 border border-white/10 hover:bg-white/15 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-green-400" />
              <span>{language === "en" ? "Add Branch" : "إضافة فرع جديد"}</span>
            </button>

            <button
              onClick={handlePushBranchesToSheets}
              disabled={isSyncingBranches || branches.length === 0}
              className="bg-brand-primary text-black hover:scale-105 active:scale-95 disabled:opacity-50 px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-brand-primary/20 shrink-0"
            >
              {isSyncingBranches ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{language === "en" ? "Sync Google Sheets" : "إرسال ومزامنة لجوجل شيت"}</span>
            </button>
          </div>
        )}
      </header>

      {isLoading ? (
        <div className="h-96 w-full flex flex-col justify-center items-center gap-4">
          <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
          <p className="text-sm text-white/40 font-mono tracking-widest uppercase">
            {language === "en" ? "Synchronizing log files with Google Sheets..." : "جاري مزامنة السجلات مع جوجل شيت..."}
          </p>
        </div>
      ) : (
        <main className="px-4 sm:px-8 space-y-8">
          {activeTab === "overview" && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <GlassPanel className="p-6 flex items-center justify-between relative overflow-hidden">
                      <div>
                        <p className="text-white/40 text-xs font-semibold uppercase mb-1 tracking-wider leading-relaxed">{stat.label}</p>
                        <p className="text-3xl font-black">{stat.value}</p>
                      </div>
                      <div className={cn("p-4 bg-white/5 rounded-2xl", stat.color)}>
                        <stat.icon className="w-7 h-7" />
                      </div>
                    </GlassPanel>
                  </motion.div>
                ))}
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <GlassPanel className="lg:col-span-2 p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-brand-primary" />
                      {language === "en" ? "Dynamic risk distribution" : "التوزيع التنبؤي لحدة المخاطر"}
                    </h3>
                    <span className="text-xs font-mono text-brand-primary bg-brand-primary/10 px-2 py-1 rounded-md">
                      {language === "en" ? "Dynamic" : "ديناميكي"}
                    </span>
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={displayTrendData}>
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00f2ff" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#00f2ff" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={11} />
                        <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'rgba(9,9,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                          itemStyle={{ color: '#00f2ff' }}
                        />
                        <Area type="monotone" dataKey="count" stroke="#00f2ff" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </GlassPanel>

                <GlassPanel className="p-8">
                  <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-brand-secondary" />
                    {language === "en" ? "Types Analysis" : "تحليلات التصنيف"}
                  </h3>
                  <div className="h-[300px] flex flex-col justify-between">
                    <div className="flex-1 min-h-[190px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'rgba(9,9,21,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4 border-t border-white/5 pt-4">
                      {pieData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-2 text-xs">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i] }} />
                          <span className="text-white/60 truncate" title={`${d.name}: ${d.value}`}>
                            {d.name} <span className="font-mono text-[10px] text-white/35">({d.value})</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassPanel>
              </div>

              {/* Recent Incidents Panel */}
              <GlassPanel className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-bold">{t.recentIncidents}</h3>
                    <p className="text-xs text-white/40 mt-1">{language === "en" ? "Latest submissions from the field" : "أحدث البلاغات المرصودة في الميدان"}</p>
                  </div>
                  <button
                    onClick={() => setSearchParams({ tab: "incidents" })}
                    className="text-brand-primary text-xs font-bold hover:underline flex items-center gap-1"
                  >
                    <span>{language === "en" ? "View All Directory" : "عرض سجل الحوادث كاملاً"}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  {filteredIncidents.length === 0 ? (
                    <div className="text-center py-12 text-white/30 font-medium text-sm">
                      {language === "en" ? "No incidents registered." : "لم يتم تسجيل أي بلاغات أو حوادث بعد."}
                    </div>
                  ) : (
                    <>
                      {/* Desktop View Table */}
                      <table className="w-full hidden md:table">
                        <thead>
                          <tr className={cn("border-b border-white/10", isRTL ? "text-right" : "text-left")}>
                            <th className="pb-4 font-semibold text-white/40 text-xs uppercase tracking-widest">{language === "en" ? "Code" : "الرمز"}</th>
                            <th className="pb-4 font-semibold text-white/40 text-xs uppercase tracking-widest">{t.reporter}</th>
                            <th className="pb-4 font-semibold text-white/40 text-xs uppercase tracking-widest">{t.form.agency}</th>
                            <th className="pb-4 font-semibold text-white/40 text-xs uppercase tracking-widest">{t.classification}</th>
                            <th className="pb-4 font-semibold text-white/40 text-xs uppercase tracking-widest">{t.status}</th>
                            <th className="pb-4 font-semibold text-white/40 text-xs uppercase tracking-widest text-center">{t.actions}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredIncidents.slice(0, 5).map((inc) => {
                            const isNew = !readIncidentIds.includes(inc.id);
                            return (
                              <tr key={inc.id} className={cn(
                                "group hover:bg-white/[0.02] transition-colors",
                                isNew && (isRTL ? "border-r-2 border-r-brand-primary" : "border-l-2 border-l-brand-primary")
                              )}>
                                <td className="py-4 font-mono text-xs font-bold text-brand-primary flex items-center gap-1.5">
                                  <span>{inc.id}</span>
                                  {isNew && (
                                    <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" title="جديد" />
                                  )}
                                </td>
                                <td className="py-4 font-medium text-white/90">
                                  {inc.employeeName}
                                </td>
                                <td className="py-4 text-white/70 text-sm">
                                  {inc.agency}
                                </td>
                                <td className="py-4">
                                  <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded-full text-[11px] font-semibold">
                                    {t.classifications[inc.classification] || inc.classification}
                                  </span>
                                </td>
                                <td className="py-4">
                                  <div className="flex items-center gap-2">
                                    <div className={cn("w-2 h-2 rounded-full", inc.status === "Resolved" ? "bg-green-400" : "bg-yellow-400 animate-pulse")} />
                                    <span className={cn("text-xs font-semibold uppercase tracking-wider", inc.status === "Resolved" ? "text-green-400" : "text-yellow-400")}>
                                      {inc.status === "Resolved" ? t.statusList.resolved : t.statusList.open}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-4 text-center">
                                  <button 
                                    onClick={() => handleViewIncident(inc)}
                                    className="bg-brand-primary/10 border border-brand-primary/20 hover:bg-brand-primary hover:text-black hover:scale-105 text-brand-primary px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                  >
                                    {t.view}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Mobile View Cards */}
                      <div className="block md:hidden space-y-4">
                        {filteredIncidents.slice(0, 5).map((inc) => {
                          const isNew = !readIncidentIds.includes(inc.id);
                          return (
                            <div 
                              key={inc.id} 
                              className={cn(
                                "p-4 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col gap-3 relative",
                                isNew && (isRTL ? "border-r-4 border-r-brand-primary" : "border-l-4 border-l-brand-primary")
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-brand-primary flex items-center gap-1.5">
                                  #{inc.id}
                                  {isNew && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <div className={cn("w-2 h-2 rounded-full", inc.status === "Resolved" ? "bg-green-400" : "bg-yellow-400 animate-pulse")} />
                                  <span className={cn("text-[10px] font-bold uppercase tracking-wider", inc.status === "Resolved" ? "text-green-400" : "text-yellow-400")}>
                                    {inc.status === "Resolved" ? t.statusList.resolved : t.statusList.open}
                                  </span>
                                </div>
                              </div>
                              
                              <div>
                                <p className="text-sm font-bold text-white/95">{inc.employeeName}</p>
                                <p className="text-xs text-white/50 mt-1">{inc.agency}</p>
                              </div>
                              
                              <div className="flex items-center justify-between mt-1 pt-2 border-t border-white/5">
                                <span className="px-2.5 py-1 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded-full text-[10px] font-semibold">
                                  {t.classifications[inc.classification] || inc.classification}
                                </span>
                                
                                <button 
                                  onClick={() => handleViewIncident(inc)}
                                  className="bg-brand-primary/10 border border-brand-primary/20 text-brand-primary px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                >
                                  {t.view}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </GlassPanel>
            </>
          )}

          {activeTab === "incidents" && (
            <GlassPanel className="p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 border-b border-white/5 pb-6">
                <div>
                  <h3 className="text-xl font-bold">{language === "en" ? "All Logged Incidents" : "بيان الحوادث وبلاغات السلامة المعتمدة"}</h3>
                  <p className="text-xs text-white/40 mt-1">
                    {language === "en" 
                      ? "Search by incident ID, branch name or reporter name" 
                      : "البحث بالرقم التسلسلي، باسم الموظف، الفرع، أو تاريخ البلاغ"}
                  </p>
                </div>
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-white/30" />
                  <input 
                    type="text" 
                    placeholder={language === "en" ? "Search ID, branch or date..." : "بحث بالرقم، الفرع أو التاريخ..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-brand-primary outline-none text-white font-medium placeholder-white/30" 
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                {filteredIncidents.length === 0 ? (
                  <div className="text-center py-20 text-white/30 font-medium text-sm">
                    {language === "en" ? "No incidents matched your query" : "لم يتم العثور على أي بلاغات سلامة مطابقة لبحثك في الأرشيف"}
                  </div>
                ) : (
                  <>
                    {/* Desktop View Table */}
                    <table className="w-full hidden md:table">
                      <thead>
                        <tr className={cn("border-b border-white/10", isRTL ? "text-right" : "text-left")}>
                          <th className="pb-4 font-semibold text-white/40 text-xs uppercase tracking-widest">{language === "en" ? "Code" : "الرمز"}</th>
                          <th className="pb-4 font-semibold text-white/40 text-xs uppercase tracking-widest">{t.reporter}</th>
                          <th className="pb-4 font-semibold text-white/40 text-xs uppercase tracking-widest">{t.form.agency}</th>
                          <th className="pb-4 font-semibold text-white/40 text-xs uppercase tracking-widest">{t.classification}</th>
                          <th className="pb-4 font-semibold text-white/40 text-xs uppercase tracking-widest">{language === "en" ? "Submission Date" : "تاريخ البلاغ"}</th>
                          <th className="pb-4 font-semibold text-white/40 text-xs uppercase tracking-widest">{t.status}</th>
                          <th className="pb-4 font-semibold text-white/40 text-xs uppercase tracking-widest text-center">{t.actions}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredIncidents.map((inc) => {
                          const isNew = !readIncidentIds.includes(inc.id);
                          
                          // Human readable date formatting
                          let readableDate = "";
                          if (inc.timestamp) {
                            const parsed = new Date(inc.timestamp);
                            readableDate = parsed.toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            });
                          }

                          return (
                            <tr key={inc.id} className={cn(
                              "group hover:bg-white/[0.02] transition-colors relative",
                              isNew ? "bg-brand-primary/[0.02]" : "transparent",
                              isNew && (isRTL ? "border-r-4 border-r-brand-primary" : "border-l-4 border-l-brand-primary")
                            )}>
                              <td className="py-4 font-mono text-xs font-bold text-brand-primary">
                                <div className="flex items-center gap-1.5">
                                  <span>{inc.id}</span>
                                  {isNew && (
                                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[10px] font-black bg-cyan-400 text-black leading-none animate-pulse shrink-0">
                                      {language === "en" ? "NEW" : "جديد"}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 font-medium text-white/95">
                                {inc.employeeName}
                              </td>
                              <td className="py-4 text-white/70 text-sm">
                                {inc.agency}
                              </td>
                              <td className="py-4">
                                <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded-full text-[11px] font-semibold">
                                  {t.classifications[inc.classification] || inc.classification}
                                </span>
                              </td>
                              <td className="py-4 text-white/40 text-xs font-mono">
                                {readableDate}
                              </td>
                              <td className="py-4">
                                <div className="flex items-center gap-2">
                                  <div className={cn("w-2 h-2 rounded-full", inc.status === "Resolved" ? "bg-green-400" : "bg-yellow-400 animate-pulse")} />
                                  <span className={cn("text-xs font-semibold uppercase tracking-wider", inc.status === "Resolved" ? "text-green-400" : "text-yellow-400")}>
                                    {inc.status === "Resolved" ? t.statusList.resolved : t.statusList.open}
                                  </span>
                                </div>
                              </td>
                              <td className="py-4 text-center">
                                <button 
                                  onClick={() => handleViewIncident(inc)}
                                  className="bg-brand-primary/10 border border-brand-primary/20 hover:bg-brand-primary hover:text-black hover:scale-105 text-brand-primary px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                >
                                  {t.view}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Mobile View Cards */}
                    <div className="block md:hidden space-y-4">
                      {filteredIncidents.map((inc) => {
                        const isNew = !readIncidentIds.includes(inc.id);
                        let readableDate = "";
                        if (inc.timestamp) {
                          const parsed = new Date(inc.timestamp);
                          readableDate = parsed.toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          });
                        }
                        return (
                          <div 
                            key={inc.id} 
                            className={cn(
                              "p-4 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col gap-3 relative",
                              isNew && (isRTL ? "border-r-4 border-r-brand-primary" : "border-l-4 border-l-brand-primary")
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-brand-primary flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded border border-white/5">
                                #{inc.id}
                                {isNew && <span className="inline-flex items-center justify-center px-1 py-0.5 rounded text-[8px] font-black bg-cyan-400 text-black leading-none ml-1">NEW</span>}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <div className={cn("w-2 h-2 rounded-full", inc.status === "Resolved" ? "bg-green-400" : "bg-yellow-400 animate-pulse")} />
                                <span className={cn("text-[10px] font-bold uppercase tracking-wider", inc.status === "Resolved" ? "text-green-400" : "text-yellow-400")}>
                                  {inc.status === "Resolved" ? t.statusList.resolved : t.statusList.open}
                                </span>
                              </div>
                            </div>
                            
                            <div>
                              <p className="text-sm font-bold text-white/95">{inc.employeeName}</p>
                              <div className="flex items-center justify-between mt-1 text-xs text-white/50">
                                <span>{inc.agency}</span>
                                {readableDate && <span className="text-[10px] text-white/40 font-mono">{readableDate}</span>}
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between mt-1 pt-2 border-t border-white/15">
                              <span className="px-2.5 py-1 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded-full text-[10px] font-semibold">
                                {t.classifications[inc.classification] || inc.classification}
                              </span>
                              
                              <button 
                                onClick={() => handleViewIncident(inc)}
                                className="bg-brand-primary/10 border border-brand-primary/20 text-brand-primary px-3 py-1 rounded-lg text-xs font-bold transition-all"
                              >
                                {t.view}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </GlassPanel>
          )}

          {activeTab === "settings" && (
            <div className="space-y-6 w-full">
              {/* SUB-TABS SELECTOR FOR SETTINGS */}
              <div className="flex border border-white/5 p-1 gap-2 max-w-lg bg-black/40 backdrop-blur-md rounded-2xl">
                <button
                  type="button"
                  onClick={() => setSettingsSubTab("branches")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    settingsSubTab === "branches"
                      ? "bg-brand-primary text-black shadow-lg shadow-brand-primary/20"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Database className="w-4 h-4" />
                  <span>{language === "en" ? "Branches Database" : "قاعدة بيانات الفروع والقطاعات"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsSubTab("notifications")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    settingsSubTab === "notifications"
                      ? "bg-brand-primary text-black shadow-lg shadow-brand-primary/20"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Bell className="w-4 h-4" />
                  <span>{language === "en" ? "Notification Channels" : "قنوات الإشعارات والإدارة"}</span>
                </button>
              </div>

              {settingsSubTab === "branches" && (
                <GlassPanel className="p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 border-b border-white/5 pb-6">
                <div>
                  <h3 className="text-xl font-bold">{language === "en" ? "Branches & Locations Database" : "قاعدة بيانات الفروع والمواقع المتاحة"}</h3>
                  <p className="text-xs text-white/40 mt-1">
                    {language === "en" 
                      ? "Manage registered branches. Sync changes back to Google Sheets easily." 
                      : "إضافة وحذف وتعديل الفروع وتوطينها الجغرافي تمهيداً لعكسها على جوجل شيت مباشرة"}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 flex-wrap">
                  {selectedBranchNames.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setBranchDeleteConfirm({ type: 'bulk' })}
                      className="bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 text-red-400 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-500/5"
                    >
                      <Trash2 className="w-3.5 h-3.5 animate-bounce" />
                      <span>{language === "en" ? `Delete Selected (${selectedBranchNames.length})` : `حذف الفروع المحددة (${selectedBranchNames.length})`}</span>
                    </button>
                  )}
                  <div className="text-xs text-white/50 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-xl font-mono">
                    {language === "en" ? `Total Branches: ${branches.length}` : `عدد الفروع المسجلة: ${branches.length}`}
                  </div>
                </div>
              </div>

              {isBranchesLoading ? (
                <div className="py-20 text-center flex flex-col justify-center items-center gap-3">
                  <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                  <span className="text-xs text-white/40">{language === "en" ? "Reading branch structures..." : "جاري قراءة وتحميل هيكلة الفروع..."}</span>
                </div>
              ) : branches.length === 0 ? (
                <div className="py-20 text-center text-white/30 text-sm flex flex-col items-center justify-center gap-4">
                  <p>{language === "en" ? "No branches configuration found." : "لم يتم العثور على أي فروع مهيأة محلياً."}</p>
                  <button
                    onClick={handleDownloadTemplate}
                    className="bg-brand-primary text-black font-extrabold text-xs px-5 py-2.5 rounded-lg hover:scale-105 transition-transform cursor-pointer"
                  >
                    {language === "en" ? "Generate Fallback Template" : "تزيل هيكلة استرشادية لبدء التعبئة"}
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {/* Desktop view */}
                  <table className="w-full hidden md:table">
                    <thead>
                      <tr className={cn("border-b border-white/10", isRTL ? "text-right" : "text-left")}>
                        <th className="pb-4 w-12 text-center">
                          <input
                            type="checkbox"
                            checked={branches.length > 0 && selectedBranchNames.length === branches.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBranchNames(branches.map(b => b.name));
                              } else {
                                setSelectedBranchNames([]);
                              }
                            }}
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-brand-primary focus:ring-brand-primary cursor-pointer accent-brand-primary"
                          />
                        </th>
                        <th className="pb-4 font-semibold text-white/40 text-xs uppercase tracking-widest">{language === "en" ? "Branch Name / Site" : "اسم الفرع / الموقع المعتمد"}</th>
                        <th className="pb-4 font-semibold text-white/40 text-xs uppercase tracking-widest">{language === "en" ? "Region" : "المنطقة التابع لها"}</th>
                        <th className="pb-4 font-semibold text-white/40 text-xs uppercase tracking-widest text-center">{language === "en" ? "Modify Actions" : "إجراءات التعديل"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {branches.map((b, index) => (
                        <tr key={b.name + index} className="group hover:bg-white/[0.01] transition-colors">
                          <td className="py-4 w-12 text-center">
                            <input
                              type="checkbox"
                              checked={selectedBranchNames.includes(b.name)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedBranchNames(prev => [...prev, b.name]);
                                } else {
                                  setSelectedBranchNames(prev => prev.filter(name => name !== b.name));
                                }
                              }}
                              className="w-4 h-4 rounded border-white/20 bg-white/5 text-brand-primary focus:ring-brand-primary cursor-pointer accent-brand-primary"
                            />
                          </td>
                          <td className="py-4 font-bold text-white/95">
                            {b.name}
                          </td>
                          <td className="py-4">
                            <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-xl text-xs text-white/70 font-medium">
                              {b.region}
                            </span>
                          </td>
                          <td className="py-4">
                            <div className="flex justify-center items-center gap-2">
                              <button
                                onClick={() => setIsEditingBranch({ index, name: b.name, region: b.region })}
                                className="p-2 bg-white/5 border border-white/10 text-white/60 hover:text-brand-primary hover:border-brand-primary/30 rounded-xl transition-all cursor-pointer"
                                title={language === "en" ? "Edit" : "تعديل معلومات الفرع"}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteBranch(index)}
                                className="p-2 bg-white/5 border border-white/10 text-white/60 hover:text-red-400 hover:border-red-400/30 rounded-xl transition-all cursor-pointer"
                                title={language === "en" ? "Delete" : "حذف الفرع"}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Mobile view */}
                  <div className="block md:hidden space-y-4">
                    {branches.map((b, index) => (
                      <div 
                        key={b.name + index} 
                        className="p-4 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col gap-3"
                      >
                        <div className="flex items-start justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedBranchNames.includes(b.name)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedBranchNames(prev => [...prev, b.name]);
                                } else {
                                  setSelectedBranchNames(prev => prev.filter(name => name !== b.name));
                                }
                              }}
                              className="w-4 h-4 rounded border-white/20 bg-white/5 text-brand-primary focus:ring-brand-primary cursor-pointer accent-brand-primary"
                            />
                            <span className="text-sm font-bold text-white/95">{b.name}</span>
                          </label>
                          
                          <span className="px-2.5 py-0.5 bg-white/5 border border-white/10 rounded-xl text-[10px] text-white/70 font-medium">
                            {b.region}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                          <button
                            onClick={() => setIsEditingBranch({ index, name: b.name, region: b.region })}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-white hover:text-brand-primary hover:border-brand-primary/20 rounded-lg text-xs"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>{language === "en" ? "Edit" : "تعديل"}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteBranch(index)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-white hover:text-red-400 hover:border-red-400/25 rounded-lg text-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{language === "en" ? "Delete" : "حذف"}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </GlassPanel>
          )}

          {settingsSubTab === "notifications" && (
            <GlassPanel className="p-8 space-y-6">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-brand-primary animate-pulse" />
                  <span>{language === "en" ? "System Notification Settings" : "إعدادات وقنوات إشعارات الإدارة"}</span>
                </h3>
                <p className="text-xs text-white/40 mt-1">
                  {language === "en" 
                    ? "Configure where security alerts are synchronized and dispatched upon new incident submissions." 
                    : "تحديد قنوات تواصل مدير ومشرف النظام لإرسال البلاغات فور حدوثها لتنبيه المسؤولين للتدخل السريع والوقائي"}
                </p>
              </div>

              {settingsAlert && (
                <div className={cn(
                  "p-4 rounded-xl text-xs font-semibold flex items-center gap-2",
                  settingsAlert.type === "success" ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-400"
                )}>
                  {settingsAlert.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{settingsAlert.message}</span>
                </div>
              )}

              <form onSubmit={handleSaveSettings} className="space-y-6">
                <div className="max-w-2xl mx-auto">
                  {/* Telegram Bot Alerts */}
                  <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                          <Send className="w-5 h-5 text-sky-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{language === "en" ? "Telegram Bot Alerts" : "إشعارات تليجرام الفورية (بوت)"}</p>
                          <p className="text-xs text-white/40">{language === "en" ? "Fastest, completely free & unlimited alerts" : "استلام الإنذار على تليجرام في ثانية، مجاني تماماً وبلا قيود"}</p>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={telegramEnabled}
                        onChange={(e) => setTelegramEnabled(e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-brand-primary focus:ring-brand-primary cursor-pointer accent-brand-primary"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">{language === "en" ? "Bot Token (from @BotFather)" : "رمز تفعيل البوت (API Token)"}</label>
                      <input 
                        type="password"
                        value={telegramBotToken}
                        onChange={(e) => setTelegramBotToken(e.target.value)}
                        placeholder="e.g. 7181928091:AAF9..."
                        disabled={!telegramEnabled}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-brand-primary/40 disabled:opacity-40 font-mono text-brand-secondary"
                      />
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">{language === "en" ? "Your Chat ID (from @userinfobot)" : "رقم معرف حسابك تليجرام (Chat ID)"}</label>
                      <input 
                        type="text"
                        value={telegramChatId}
                        onChange={(e) => setTelegramChatId(e.target.value)}
                        placeholder="e.g. 987654321"
                        disabled={!telegramEnabled}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-brand-primary/40 disabled:opacity-40 font-mono text-brand-secondary text-left font-semibold"
                      />
                      <div className="p-4 rounded-xl bg-black/40 border border-white/5 mt-3 space-y-2 text-[11px] text-white/50 leading-relaxed font-semibold">
                        <p className="text-white/80 font-bold">{language === "en" ? "How to activate with Telegram Bot (FREE):" : "طريقة تفعيل إشعارات تليجرام مجاناً في دقيقة:"}</p>
                        {language === "en" ? (
                          <ol className="list-decimal list-inside space-y-1">
                            <li>Find <span className="text-brand-primary font-mono">@BotFather</span> on Telegram and send <span className="text-brand-secondary font-mono">/newbot</span>.</li>
                            <li>Copy the received HTTP API Token and paste it above.</li>
                            <li>Find <span className="text-brand-primary font-mono">@userinfobot</span> on Telegram and write to it. It will give your Chat ID. Paste it above.</li>
                            <li>Start your bot (send <span className="text-brand-secondary font-mono">/start</span> to it) to authorize alerts!</li>
                          </ol>
                        ) : (
                          <ol className="list-decimal list-inside space-y-1 text-right font-semibold" style={{ direction: "rtl" }}>
                            <li>ابحث عن المعرّف <span className="text-brand-primary font-mono">@BotFather</span> وتحدث معه ثم أرسل <span className="text-brand-secondary font-mono font-bold font-mono">/newbot</span> واصنع بوتك الخاص.</li>
                            <li>انسخ رمز البوت الطويل الناتج من المحادثة وضعه بخانة "رمز تفعيل البوت" بالأعلى.</li>
                            <li>ابحث عن المعرّف <span className="text-brand-primary font-mono">@userinfobot</span> وأرسل له أي كلمة، سيعطيك رقم حسابك (Chat ID). ضع الرقم بالخانة الثانية.</li>
                            <li><strong>هام جداً:</strong> ادخل على شات بوتك الخاص الذي صنعته للتو واضغط على <strong>Start (ابدأ)</strong> لبدء استقبال الإشعارات مجاناً!</li>
                          </ol>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2 max-w-2xl mx-auto">
                  <button 
                    type="submit" 
                    disabled={isSavingSettings} 
                    className="bg-brand-primary text-black hover:scale-105 active:scale-95 disabled:opacity-50 px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-brand-primary/20 shrink-0"
                  >
                    {isSavingSettings ? (
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                    ) : (
                      <span>{language === "en" ? "Save Notification Channels" : "حفظ وتثبيت قنوات التنبيه"}</span>
                    )}
                  </button>
                </div>
              </form>

              {/* RECENT NOTIFICATIONS LOG REPORT CARD */}
              <div className="space-y-4 pt-6 border-t border-white/5">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-primary" />
                  <span>{language === "en" ? "Dispatched Alerts Log" : "سجل الإنذارات المرسلة الفورية وتنبيهات المسؤولين"}</span>
                </h4>
                
                {notificationLogs.length === 0 ? (
                  <p className="text-xs text-white/30 italic">{language === "en" ? "No alert logs dispatched yet in this cycle." : "لم يتم إرسال أو إطلاق أي إنذارات تواصل للمدراء بعد."}</p>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {notificationLogs.map((log: any) => (
                      <div key={log.id} className="p-4 bg-black/40 border border-white/5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between text-xs gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide",
                              log.type === "Telegram" ? "bg-sky-500/10 text-sky-400 border border-sky-500/15" :
                              log.type === "WhatsApp" ? "bg-green-500/10 text-green-400 border border-green-500/15" : 
                              "bg-blue-500/10 text-blue-400 border border-blue-500/15"
                            )}>
                              {log.type}
                            </span>
                            <span className="font-mono text-[10px] text-white/40">{new Date(log.timestamp).toLocaleString(language === "ar" ? "ar-EG" : "en-US")}</span>
                          </div>
                          <p className="text-white/80 font-semibold">{language === "en" ? "Recipient:" : "قناة الإرسال للحركات:"} <span className="font-mono text-white/95">{log.recipient}</span></p>
                          <p className="text-[11px] text-white/50 leading-relaxed whitespace-pre-wrap font-mono mt-1 pt-1 border-t border-white/5">{log.message}</p>
                        </div>
                        <span className="text-[10px] text-green-400 font-extrabold bg-green-500/10 px-2.5 py-1 rounded-lg border border-green-500/20 shrink-0 self-start md:self-center font-mono">
                          {log.status || "تم الإرسال"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </GlassPanel>
          )}
        </div>
      )}
    </main>
  )}

      {/* 4. INCIDENT DETAILS OVERLAY MODAL */}
      <AnimatePresence>
        {selectedIncident && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#090915] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative"
            >
              {/* Top gradient stripe */}
              <div className="h-1.5 w-full shrink-0 bg-gradient-to-r from-brand-primary via-indigo-600 to-brand-secondary" />
              
              <button 
                onClick={() => setSelectedIncident(null)}
                className="absolute top-4 right-4 p-2 bg-[#090915]/80 backdrop-blur-sm border border-white/10 hover:bg-white/10 text-white/60 hover:text-white rounded-xl transition-all cursor-pointer z-10"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Scrollable details contents */}
              <div className="p-8 space-y-6 overflow-y-auto flex-1 select-none pr-6">
                <div className="flex items-center gap-3">
                  <div className="py-1.5 px-3 bg-brand-primary/10 border border-brand-primary/20 rounded-xl text-brand-primary font-mono text-xs font-bold uppercase shrink-0">
                    {selectedIncident.id}
                  </div>
                  <span className="text-white/40 text-xs font-mono">
                    {new Date(selectedIncident.timestamp).toLocaleString(language === "ar" ? "ar-EG" : "en-US")}
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-black text-white leading-tight">
                    {language === "en" ? "Incident & Hazard Audit File" : "ملف التحقيق واستقصاء المخاطر"}
                  </h3>
                  <p className="text-sm text-white/50 mt-1">
                    {language === "en" ? "Detailed log pulled directly from Google Sheets records" : "مستخرج البيانات الحقيقي المستل من جداول بيانات جوجل بالكامل"}
                  </p>
                </div>

                {/* Main facts grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-[10px] text-white/40 uppercase tracking-widest">{t.reporter}</span>
                    <p className="text-sm font-bold text-white leading-tight">{selectedIncident.employeeName}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-[10px] text-white/40 uppercase tracking-widest">{t.form.agency}</span>
                    <p className="text-sm font-bold text-white leading-tight">{selectedIncident.agency}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-[10px] text-white/40 uppercase tracking-widest">{t.classification}</span>
                    <p className="text-sm font-bold text-brand-primary leading-tight">
                      {t.classifications[selectedIncident.classification] || selectedIncident.classification}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-[10px] text-white/40 uppercase tracking-widest">{language === "en" ? "Severity & Probability" : "الشدة والاحتمالية"}</span>
                    <p className="text-sm font-bold text-white leading-tight">
                      {language === "en" ? `Severity: ${selectedIncident.severity} | Probability: ${selectedIncident.probability}` : `الاحتمالية: ${selectedIncident.probability} | الشدة: ${selectedIncident.severity}`}
                    </p>
                  </div>
                </div>

                {/* Substantive content */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/40 shrink-0">{t.form.description}</span>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-white/90 leading-relaxed max-h-32 overflow-y-auto">
                      {selectedIncident.description}
                    </div>
                  </div>

                  {selectedIncident.correctiveAction && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-brand-primary shrink-0 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{t.form.correctiveAction}</span>
                      </span>
                      <div className="p-4 rounded-2xl bg-brand-primary/5 border border-brand-primary/10 text-xs text-brand-primary/90 leading-relaxed max-h-24 overflow-y-auto font-medium">
                        {selectedIncident.correctiveAction}
                      </div>
                    </div>
                  )}

                  {selectedIncident.files && selectedIncident.files.trim() !== "" && (
                    <div className="space-y-2 pt-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-white/40 shrink-0 block">
                        {language === "en" ? "Attached Evidence Files (Google Drive)" : "ملفات الأدلة والمرفقات (جوجل درايف)"}
                      </span>
                      <div className="grid grid-cols-2 gap-3">
                        {selectedIncident.files.split(",").map((url: string, index: number) => {
                          const trimmedUrl = url.trim();
                          if (!trimmedUrl) return null;

                          // Try to extract ID for embedded Google Drive thumbnail display
                          let imageUrl = trimmedUrl;
                          const driveIdMatch = trimmedUrl.match(/\/file\/d\/([^\/]+)/) || trimmedUrl.match(/id=([^\&]+)/);
                          const isError = trimmedUrl.startsWith("Error:");

                          if (driveIdMatch && driveIdMatch[1]) {
                            imageUrl = `https://docs.google.com/uc?export=view&id=${driveIdMatch[1]}`;
                          }

                          if (isError) {
                            return (
                              <div key={index} className="p-3 rounded-xl border border-red-500/10 bg-red-500/5 text-xs text-red-400">
                                {trimmedUrl}
                              </div>
                            );
                          }

                          return (
                            <a
                              key={index}
                              href={trimmedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative h-28 rounded-xl overflow-hidden border border-white/10 bg-white/5 hover:border-brand-primary transition-all flex flex-col items-center justify-center p-2"
                            >
                              <img
                                src={imageUrl}
                                alt={`Evidence ${index + 1}`}
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  // Hide broken images
                                  e.currentTarget.style.display = 'none';
                                  // Display a fallback icon inside the container
                                  const fallbackEl = e.currentTarget.parentElement?.querySelector('.fallback-icon-container');
                                  if (fallbackEl) {
                                    fallbackEl.classList.remove('hidden');
                                  }
                                }}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                              
                              {/* Fallback Icon Container for Non-Image Files */}
                              <div className="fallback-icon-container hidden flex flex-col items-center justify-center gap-1.5 text-white/40 group-hover:text-white/80 transition-colors z-10">
                                <FileText className="w-8 h-8 text-brand-primary" />
                                <span className="text-[10px] font-mono tracking-wide truncate max-w-[150px]">
                                  {language === "en" ? `Evidence Asset #${index + 1}` : `مرفق إثبات #${index + 1}`}
                                </span>
                              </div>

                              {/* Hover Overlay */}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold text-white gap-1 z-20">
                                <ExternalLink className="w-4 h-4 text-brand-primary" />
                                <span>{language === "en" ? "Open Link" : "فتح الرابط"}</span>
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* STICKY VISUAL FOOTER: CLOSES DIALOG AND MANAGES CASE STATUSES IN CONTINUITY */}
              <div className="p-6 bg-white/[0.03] border-t border-white/10 shrink-0 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedIncident(null)}
                    className="px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>{language === "en" ? "Close" : "إغلاق النافذة"}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-white/40">{language === "en" ? "Change Status:" : "تغيير حالة الحادث:"}</span>
                  
                  {/* Status option 1: "جاري الحل" (set exact target status "Open") */}
                  <button
                    type="button"
                    disabled={isUpdatingStatus || selectedIncident.status === "Open"}
                    onClick={() => handleToggleStatus(selectedIncident.id, "Open")}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                      selectedIncident.status === "Open"
                        ? "bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 select-none cursor-default"
                        : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
                    )}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{language === "en" ? "In Progress" : "جاري الحل"}</span>
                  </button>

                  {/* Status option 2: "تم الحل" (set exact target status "Resolved") */}
                  <button
                    type="button"
                    disabled={isUpdatingStatus || selectedIncident.status === "Resolved"}
                    onClick={() => handleToggleStatus(selectedIncident.id, "Resolved")}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                      selectedIncident.status === "Resolved"
                        ? "bg-green-500/25 border border-green-500/30 text-green-400 select-none cursor-default"
                        : "bg-green-500 text-black shadow-lg hover:bg-green-400 font-extrabold"
                    )}
                  >
                    {isUpdatingStatus ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>{language === "en" ? "Resolved" : "تم الحل"}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. ADD BRANCH DIALOG MODAL */}
      <AnimatePresence>
        {isAddingBranch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#090915] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative p-6 space-y-4"
            >
              <h3 className="text-lg font-bold text-white">
                {language === "en" ? "Add New Branch" : "إضافة فرع جديد لقاعدة البيانات"}
              </h3>
              <form onSubmit={handleAddBranchSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-white/40 block font-semibold">{language === "en" ? "Branch Name" : "اسم الفرع / الموقع"}</label>
                  <input
                    type="text"
                    required
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder={language === "en" ? "e.g. Chemical Lab" : "مثال: مصفاة التكرير الرئيسية"}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-brand-primary outline-none text-white font-medium animate-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-white/40 block font-semibold">{language === "en" ? "Region" : "المنطقة الجغرافية"}</label>
                  <input
                    type="text"
                    required
                    value={newBranchRegion}
                    onChange={(e) => setNewBranchRegion(e.target.value)}
                    placeholder={language === "en" ? "e.g. Western Area" : "مثال: المنطقة الغربية"}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-brand-primary outline-none text-white font-medium animate-none"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingBranch(false)}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 transition-colors"
                  >
                    {language === "en" ? "Cancel" : "إلغاء"}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-primary text-black font-extrabold rounded-lg text-xs hover:scale-105 transition-transform"
                  >
                    {language === "en" ? "Add Branch" : "إضافة الفرع"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. EDIT BRANCH DIALOG MODAL */}
      <AnimatePresence>
        {isEditingBranch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#090915] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative p-6 space-y-4"
            >
              <h3 className="text-lg font-bold text-white">
                {language === "en" ? "Edit Branch details" : "تعديل معلومات الفرع"}
              </h3>
              <form onSubmit={handleEditBranchSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-white/40 block font-semibold">{language === "en" ? "Branch Name" : "اسم الفرع / الموقع"}</label>
                  <input
                    type="text"
                    required
                    value={isEditingBranch.name}
                    onChange={(e) => setIsEditingBranch({ ...isEditingBranch, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-brand-primary outline-none text-white font-medium animate-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-white/40 block font-semibold">{language === "en" ? "Region" : "المنطقة الجغرافية"}</label>
                  <input
                    type="text"
                    required
                    value={isEditingBranch.region}
                    onChange={(e) => setIsEditingBranch({ ...isEditingBranch, region: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-brand-primary outline-none text-white font-medium animate-none"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingBranch(null)}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 transition-colors"
                  >
                    {language === "en" ? "Cancel" : "إلغاء"}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-primary text-black font-extrabold rounded-lg text-xs hover:scale-105 transition-transform"
                  >
                    {language === "en" ? "Save Changes" : "تحديث البيانات"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. CUSTOM BRANCH DELETE CONFIRMATION DIALOG MODAL */}
      <AnimatePresence>
        {branchDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#090915] border border-red-500/20 rounded-2xl overflow-hidden shadow-2xl relative p-6 space-y-4"
            >
              <div className="flex items-center gap-3 text-red-500 border-b border-white/5 pb-3">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-lg font-bold text-white">
                  {language === "en" ? "Confirm Deletion" : "تأكيد حذف الفروع"}
                </h3>
              </div>
              <p className="text-sm text-white/70 leading-relaxed">
                {branchDeleteConfirm.type === 'single' ? (
                  language === "en" 
                    ? `Are you sure you want to delete the branch "${branches[branchDeleteConfirm.index!]?.name}"?`
                    : `هل أنت متأكد من رغبتك في حذف الفرع "${branches[branchDeleteConfirm.index!]?.name}"؟`
                ) : (
                  language === "en"
                    ? `Are you sure you want to delete the ${selectedBranchNames.length} selected branches?`
                    : `هل أنت متأكد من رغبتك في حذف الفروع الـ ${selectedBranchNames.length} المحددة بالكامل؟`
                )}
              </p>
              <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl leading-relaxed space-y-1">
                <p className="font-bold">
                  {language === "en" ? "⚠️ Notice:" : "⚠️ تنبيه مهم:"}
                </p>
                <p>
                  {language === "en"
                    ? "Deletion takes effect locally first. You must click the 'Sync Google Sheets' button to permanently apply changes to Google Sheets database."
                    : "عملية الحذف تسري محلياً وفي العرض على الفور، ولكن لتأكيد وحذف وتحديث البيانات بشكل دائم في ملف جوجل شيت، يجب عليك الضغط على زر الارسال والمزامنة لجوجل شيت."}
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBranchDeleteConfirm(null)}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-white/80 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {language === "en" ? "Cancel" : "إلغاء"}
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteBranch}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-lg text-xs hover:scale-105 transition-transform cursor-pointer"
                >
                  {language === "en" ? "Confirm Delete" : "تأكيد الحذف النهائي"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
