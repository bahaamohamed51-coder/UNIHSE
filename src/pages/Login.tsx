import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { translations } from "../i18n/translations";
import { GlassPanel } from "../components/UI/GlassPanel";
import { GlassButton } from "../components/UI/GlassButton";
import { 
  Shield, 
  Lock, 
  User as UserIcon, 
  Globe, 
  Sparkles, 
  Activity, 
  Upload, 
  CheckCircle2, 
  FileText, 
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Info,
  X,
  History,
  AlertCircle,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Send,
  Check,
  MessageSquare,
  WifiOff
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, matchIncidentId } from "../lib/utils";
import { Logo } from "../components/UI/Logo";

type ActiveView = "selection" | "login" | "report" | "track_edit";

export default function Login() {
  const { language, setLanguage, setUser, isRTL } = useStore();
  const t = translations[language];
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  
  // High-level navigation mode
  const [viewMode, setViewMode] = useState<ActiveView>("selection");
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  
  // Credentials input for the SINGLE authorized supervisor / manager
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");

  // Search & Edit state for old reports
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedIncident, setSearchedIncident] = useState<any | null>(null);
  const [searchError, setSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const [editProposedSolution, setEditProposedSolution] = useState("");
  const [editIsResolved, setEditIsResolved] = useState(false);
  const [editNewFiles, setEditNewFiles] = useState<{ name: string; type: string; base64: string }[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState("");

  const handleSearchIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) {
      setSearchError(language === "en" ? "Internet connection is required to search and edit reports." : "الاتصال بالإنترنت مطلوب للبحث عن بلاغ وتعديله.");
      return;
    }
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError("");
    setSearchedIncident(null);
    setEditSuccessMsg("");
    try {
      const res = await fetch("/api/incidents");
      if (res.ok) {
        const list = await res.json();
        const found = list.find((inc: any) => matchIncidentId(inc.id, searchQuery));
        if (found) {
          setSearchedIncident(found);
          setEditProposedSolution(found.correctiveAction || "");
          setEditIsResolved(found.status === "Resolved");
          setEditNewFiles([]);
        } else {
          setSearchError(language === "en" ? "Incident ID not found in database registry." : "لم يتم العثور على بلاغ مطابق للرقم المدخل.");
        }
      } else {
        setSearchError(language === "en" ? "Failed to access databases. Please retry." : "فشل جلب قائمة البلاغات من المخدم.");
      }
    } catch (err) {
      console.error(err);
      setSearchError(language === "en" ? "Connection error." : "حدث خطأ في الاتصال بالشبكة.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) {
      alert(language === "en" ? "Cannot save edits while offline. Internet connection is required." : "لا يمكن حفظ التعديلات أثناء عدم الاتصال بالإنترنت. الاتصال بالإنترنت مطلوب.");
      return;
    }
    if (!searchedIncident) return;
    setIsSavingEdit(true);
    setEditSuccessMsg("");
    try {
      const response = await fetch(`/api/incidents/${searchedIncident.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editIsResolved ? "Resolved" : "Open",
          correctiveAction: editProposedSolution,
          files: editNewFiles
        })
      });
      if (response.ok) {
        const updated = await response.json();
        setSearchedIncident((o: any) => ({
          ...o,
          status: updated.status,
          correctiveAction: updated.correctiveAction,
          files: updated.files || o.files
        }));
        setEditSuccessMsg(language === "en" ? "Incident updated successfully!" : "تم تحديث البلاغ ورفع المرفقات بنجاح!");
        setEditNewFiles([]);
      } else {
        alert(language === "en" ? "Could not apply changes." : "حدث خطأ أثناء حفظ التعديلات.");
      }
    } catch (err) {
      console.error(err);
      alert(language === "en" ? "Network error." : "خطأ عند تحديث البلاغ.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleEditFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const readPromises = selectedFiles.map((file: any) => {
        return new Promise<{ name: string; type: string; base64: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            const base64Content = (reader.result as string).split(",")[1];
            resolve({
              name: file.name,
              type: file.type,
              base64: base64Content
            });
          };
          reader.onerror = error => reject(error);
        });
      });
      try {
        const results = await Promise.all(readPromises);
        setEditNewFiles(prev => [...prev, ...results]);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const removeEditFile = (idx: number) => {
    setEditNewFiles(prev => prev.filter((_, i) => i !== idx));
  };

  interface BranchInfo {
    name: string;
    region: string;
  }

  // Dynamic Branches List from Sheets
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [isBranchesLoading, setIsBranchesLoading] = useState(false);

  // Load branches from sheets
  React.useEffect(() => {
    setIsBranchesLoading(true);
    fetch("/api/branches")
      .then((res) => res.json())
      .then((data) => {
        if (data.branches) {
          const parsed: BranchInfo[] = data.branches.map((b: any) => {
            if (typeof b === "string") {
              let region = language === "en" ? "Western Area (المنطقة الغربية)" : "المنطقة الغربية (Western Area)";
              if (b.includes("Loading Dock") || b.includes("رصيف")) {
                region = language === "en" ? "Eastern Area (المنطقة الشرقية)" : "المنطقة الشرقية (Eastern Area)";
              } else if (b.includes("Chemical") || b.includes("كيميائية") || b.includes("Parts") || b.includes("قطع الغيار")) {
                region = language === "en" ? "Central Area (المنطقة الوسطى)" : "المنطقة الوسطى (Central Area)";
              }
              return { name: b, region };
            } else if (b && typeof b === "object") {
              return {
                name: b.name || b.Branch || b.branch || "",
                region: b.region || b.Region || (language === "en" ? "Western Area (المنطقة الغربية)" : "المنطقة الغربية (Western Area)")
              };
            }
            return null;
          }).filter(Boolean) as BranchInfo[];

          setBranches(parsed);
          
          if (parsed.length > 0) {
            const firstRegion = parsed[0].region;
            setSelectedRegion(firstRegion);
            const initialBranches = parsed.filter(b => b.region === firstRegion);
            if (initialBranches.length > 0) {
              setReportForm((prev) => ({ ...prev, agency: initialBranches[0].name }));
            }
          }
        }
      })
      .catch((err) => console.error("Could not pull dynamic branches:", err))
      .finally(() => setIsBranchesLoading(false));
  }, []);

  const uniqueRegions = Array.from(new Set(branches.map(b => b.region))).filter(Boolean);
  const filteredBranches = branches.filter(b => b.region === selectedRegion);

  const handleRegionChange = (region: string) => {
    setSelectedRegion(region);
    const matched = branches.filter(b => b.region === region);
    if (matched.length > 0) {
      setReportForm(prev => ({ ...prev, agency: matched[0].name }));
    } else {
      setReportForm(prev => ({ ...prev, agency: "" }));
    }
  };

  // Extensive multi-step Form State (identical to inner report wizard)
  const [reportStep, setReportStep] = useState(1);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [reportForm, setReportForm] = useState({
    employeeName: "",
    incidentLocation: "المستودع",
    agency: "",
    classification: "nearMiss",
    description: "",
    severity: 1,
    probability: 1,
    correctiveAction: "",
    files: [] as { name: string; type: string; base64: string }[]
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [lastIncidentId, setLastIncidentId] = useState("");

  // Dynamic risk level calculation
  const riskScore = reportForm.severity * reportForm.probability;
  const getRiskLevel = (score: number) => {
    if (score >= 46) return { 
      label: language === "en" ? "VH → Very High (مرتفع جداً)" : "VH → مرتفع جداً (Very High)", 
      color: "text-red-500", 
      bg: "bg-red-500/20", 
      border: "border-red-500/30" 
    };
    if (score >= 30) return { 
      label: language === "en" ? "H → High (مرتفع)" : "H → مرتفع (High)", 
      color: "text-orange-500", 
      bg: "bg-orange-500/20", 
      border: "border-orange-500/30" 
    };
    if (score >= 19) return { 
      label: language === "en" ? "M+ → Medium Plus (أعلى من المتوسط)" : "M+ → أعلى من المتوسط (Medium Plus)", 
      color: "text-amber-500", 
      bg: "bg-amber-500/20", 
      border: "border-amber-500/30" 
    };
    if (score >= 9) return { 
      label: language === "en" ? "M → Medium (متوسط)" : "M → متوسط (Medium)", 
      color: "text-yellow-500", 
      bg: "bg-yellow-500/20", 
      border: "border-yellow-500/30" 
    };
    if (score >= 4) return { 
      label: language === "en" ? "L → Low (منخفض)" : "L → منخفض (Low)", 
      color: "text-green-500", 
      bg: "bg-green-500/25", 
      border: "border-green-500/30" 
    };
    return { 
      label: language === "en" ? "VL → Very Low (منخفض جداً)" : "VL → منخفض جداً (Very Low)", 
      color: "text-cyan-400", 
      bg: "bg-cyan-400/25", 
      border: "border-cyan-400/30" 
    };
  };
  const riskLevel = getRiskLevel(riskScore);

  const [copied, setCopied] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ sender: "user" | "ai"; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatSending, setIsChatSending] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string>("");

  const copyFullReportText = () => {
    const reportText = `⚠️ *تقرير بلاغ سلامة وحادث مهني* ⚠️
الرقم التعريفي للبلاغ: ${lastIncidentId || "N/A"}
المبلّغ: ${reportForm.employeeName || "N/A"}
الموقع الجغرافي: ${reportForm.incidentLocation || "N/A"}
الفرع والمنطقة: ${reportForm.agency || "N/A"}
تصنيف البلاغ: ${t.classifications[reportForm.classification as keyof typeof t.classifications] || reportForm.classification}
مستوى الخطورة الإجمالي: ${riskScore}/25 (${riskLevel.label})
تفاصيل الحادث: ${reportForm.description || "لا يوجد وصف للمشكلة"}
الإجراء الفوري المتخذ محلياً: ${reportForm.correctiveAction || "لا يوجد"}`;
    
    navigator.clipboard.writeText(reportText);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const handleSendChatMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    if (!isOnline) {
      alert(language === "en" ? "Internet connection is required to chat with the AI assistant." : "الاتصال بالإنترنت مطلوب للتحدث مع مساعد الذكاء الاصطناعي.");
      return;
    }
    const textToSend = customText || chatInput;
    if (!textToSend.trim() || isChatSending) return;

    const updatedMessages = [
      ...chatMessages,
      { sender: "user" as const, text: textToSend }
    ];
    
    setChatMessages(updatedMessages);
    if (!customText) setChatInput("");
    setIsChatSending(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident: {
            id: lastIncidentId,
            employeeName: reportForm.employeeName,
            incidentLocation: reportForm.incidentLocation,
            agency: reportForm.agency,
            classification: reportForm.classification,
            description: reportForm.description,
            severity: reportForm.severity,
            probability: reportForm.probability,
            riskScore: riskScore,
            correctiveAction: reportForm.correctiveAction
          },
          messages: updatedMessages
        })
      });

      if (response.ok) {
        const data = await response.json();
        setChatMessages(prev => [
          ...prev,
          { sender: "ai", text: data.reply }
        ]);
      } else {
        setChatMessages(prev => [
          ...prev,
          { sender: "ai", text: language === "en" ? "Sorry, I lost connection to the safety database. Try again." : "عذراً، فقدت الاتصال بقاعدة بيانات السلامة. يرجى إعادة المحاولة." }
        ]);
      }
    } catch (error) {
      console.error(error);
      setChatMessages(prev => [
        ...prev,
        { sender: "ai", text: language === "en" ? "Connection failed." : "فشل الاتصال." }
      ]);
    } finally {
      setIsChatSending(false);
    }
  };

  const handleFetchAiSuggestions = async () => {
    if (!isOnline) {
      alert(language === "en" ? "Internet connection is required to generate AI recommendations." : "الاتصال بالإنترنت مطلوب لتوليد توصيات الذكاء الاصطناعي.");
      return;
    }
    if (!reportForm.description) return;
    setIsAiLoading(true);
    try {
      const response = await fetch("/api/ai/suggest-corrective-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lastIncidentId,
          employeeName: reportForm.employeeName,
          incidentLocation: reportForm.incidentLocation,
          agency: reportForm.agency,
          classification: reportForm.classification,
          description: reportForm.description,
          severity: reportForm.severity,
          probability: reportForm.probability,
          riskScore: riskScore,
          correctiveAction: reportForm.correctiveAction
        })
      });
      if (response.ok) {
        const data = await response.json();
        setAiSuggestions(data.suggestions || "");
        setChatMessages([
          { sender: "ai", text: data.suggestions || "" }
        ]);
      } else {
        const errMsg = language === "en" ? "Could not retrieve suggestions. Please check API settings." : "تعذر جلب الاقتراحات، يرجى مراجعة إعدادات الذكاء الاصطناعي.";
        setAiSuggestions(errMsg);
        setChatMessages([
          { sender: "ai", text: errMsg }
        ]);
      }
    } catch (err) {
      console.error(err);
      const errMsg = language === "en" ? "Connection error while fetching AI recommendations." : "خطأ عند محاولة إرسال الطلب لخادم الذكاء الاصطناعي.";
      setAiSuggestions(errMsg);
      setChatMessages([
        { sender: "ai", text: errMsg }
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput.trim().toLowerCase() === "admin" && passwordInput === "admin") {
      setLoginError("");
      setUser({
        id: "1",
        name: language === "en" ? "HSE Executive Director (admin)" : "مدير وعميد الأمن والسلامة العامة",
        role: "admin",
        language
      });
      navigate("/dashboard");
    } else {
      setLoginError(
        language === "en"
          ? "Unauthorized access. Invalid username or password."
          : "بيانات الدخول غير صحيحة. يرجى التحقق من اسم المستخدم وكلمة المرور."
      );
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const readPromises = selectedFiles.map((file: any) => {
        return new Promise<{ name: string; type: string; base64: string }>((resolve, reject) => {
          // If the file is not an image, read it normally
          if (!file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
              const base64Content = (reader.result as string).split(",")[1];
              resolve({
                name: file.name,
                type: file.type,
                base64: base64Content
              });
            };
            reader.onerror = error => reject(error);
            return;
          }

          // If the file is an image, compress and downscale it
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
              const canvas = document.createElement("canvas");
              const MAX_WIDTH = 1024;
              const MAX_HEIGHT = 1024;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height;
                  height = MAX_HEIGHT;
                }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                // Compress image to JPEG format with 0.7 quality to reduce size to ~100kb
                const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
                const base64Content = dataUrl.split(",")[1];
                resolve({
                  name: file.name.replace(/\.[^/.]+$/, "") + ".jpg",
                  type: "image/jpeg",
                  base64: base64Content
                });
              } else {
                const base64Content = (event.target?.result as string).split(",")[1];
                resolve({
                  name: file.name,
                  type: file.type,
                  base64: base64Content
                });
              }
            };
            img.onerror = error => reject(error);
          };
          reader.onerror = error => reject(error);
        });
      });
      try {
        const base64Files = await Promise.all(readPromises);
        setReportForm(prev => ({ ...prev, files: [...prev.files, ...base64Files] }));
      } catch (err) {
        console.error("Error converting files to Base64:", err);
      }
    }
  };

  const removeFile = (index: number) => {
    setReportForm(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== index) }));
  };

  const triggerCameraMock = () => {
    const mockBase64 = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"; // 1x1 GIF Base64
    setReportForm(prev => ({
      ...prev,
      files: [...prev.files, { 
        name: `CAMERA_SNAP_${Date.now()}.png`,
        type: "image/png",
        base64: mockBase64
      }]
    }));
  };

  const generateAiCorrective = async () => {
    if (!isOnline) {
      alert(language === "en" ? "Internet connection is required to generate AI recommendations." : "الاتصال بالإنترنت مطلوب لتوليد توصيات الذكاء الاصطناعي.");
      return;
    }
    if (!reportForm.description) return;
    setIsAiLoading(true);
    try {
      const response = await fetch("/api/ai/suggest-corrective-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          classification: reportForm.classification,
          description: reportForm.description 
        }),
      });
      const data = await response.json();
      if (data.suggestions) {
        setReportForm(prev => ({ ...prev, correctiveAction: data.suggestions }));
      }
    } catch (error) {
      console.error("AI suggestions generation failed", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleFullReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) {
      alert(language === "en" ? "You are offline. Submitting new incident reports requires an active internet connection." : "أنت غير متصل بالإنترنت. إرسال بلاغات جديدة يتطلب اتصالاً نشطاً بالإنترنت.");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeName: reportForm.employeeName || (language === "en" ? "Guest Submitter" : "مبلغ جهة خارجية"),
          incidentLocation: reportForm.incidentLocation,
          agency: reportForm.agency,
          classification: reportForm.classification,
          description: reportForm.description,
          severity: reportForm.severity,
          probability: reportForm.probability,
          riskScore,
          correctiveAction: reportForm.correctiveAction,
          status: "Open",
          files: reportForm.files
        }),
      });
      const data = await response.json();
      const generateFallbackId = () => {
        const l = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
        const n = Math.floor(10000 + Math.random() * 90000);
        return `${l}${n}`;
      };
      setLastIncidentId(data.id || generateFallbackId());
      setSubmissionSuccess(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetIncidentFormAndGoBack = () => {
    setReportStep(1);
    setSubmissionSuccess(false);
    setReportForm({
      employeeName: "",
      incidentLocation: "المستودع",
      agency: "",
      classification: "nearMiss",
      description: "",
      severity: 1,
      probability: 1,
      correctiveAction: "",
      files: []
    });
    setAiSuggestions("");
    setChatMessages([]);
    setViewMode("selection");
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 lg:p-8">
      {/* Top Header */}
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between py-4 border-b border-white/5 mb-8">
        <Logo size="lg" />
        <div className="flex items-center gap-4">
          <button 
            type="button"
            onClick={() => setLanguage(language === "en" ? "ar" : "en")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white transition-all text-sm font-medium"
          >
            <Globe className="w-4 h-4 text-brand-primary" />
            <span>{language === "en" ? "العربية" : "English"}</span>
          </button>
        </div>
      </header>

      {!isOnline && (
        <div className="w-full max-w-7xl mx-auto mb-6 p-4 bg-red-400/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400">
          <WifiOff className="w-5 h-5 shrink-0" />
          <div className="text-xs">
            <p className="font-bold">{language === "en" ? "Offline Mode Active" : "وضع عدم الاتصال بالإنترنت نشط"}</p>
            <p className="opacity-80">{language === "en" ? "Submitting, searching, and editing incident reports require an active internet connection." : "خيارات الإبلاغ، البحث، وتعديل البلاغات معطّلة لعدم وجود اتصال نشط بالإنترنت."}</p>
          </div>
        </div>
      )}

      {/* Dynamic Main Body Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto flex flex-col justify-center items-center">
        
        <AnimatePresence mode="wait">
          
          {/* 1. SELECTION AREA: JUST MAIN CHOICE TITLES / TILES */}
          {viewMode === "selection" && (
            <motion.div
              key="selectionPane"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full max-w-4xl space-y-10"
            >
              <div className="text-center space-y-3">
                <div className="inline-flex p-3 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary mb-2">
                  <Shield className="w-6 h-6 animate-pulse" />
                </div>
                <h1 className="text-3xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                  {language === "en" ? "Safety & Risk Intelligence Portal" : "منظومة إدارة المخاطر وسلامة العمل"}
                </h1>
                <p className="text-base text-white/50 max-w-xl mx-auto">
                  {language === "en" 
                    ? "Choose one of the pathways below to manage credentials or report active site conditions directly." 
                    : "اختر أحد الإجراءات المحددة أدناه لتسجيل دخول مشرفي المنظومة أو الإبلاغ الفوري الفائق."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                
                {/* CHOICE A: TRACK OR EDIT EXISTING REPORT (Now primary public action) */}
                <button
                  type="button"
                  onClick={() => setViewMode("track_edit")}
                  className="group relative flex flex-col items-start p-8 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-brand-primary/40 hover:bg-white/[0.06] transition-all duration-300 text-start overflow-hidden shadow-2xl"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 blur-2xl group-hover:bg-brand-primary/10 transition-all pointer-events-none" />
                  
                  <div className="w-14 h-14 bg-brand-primary/10 rounded-2xl border border-brand-primary/20 flex items-center justify-center text-brand-primary mb-6 transition-all group-hover:scale-110">
                    <History className="w-7 h-7" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                    <span>{language === "en" ? "Track or Edit Old Report" : "متابعة أو تعديل بلاغ قديم"}</span>
                    {isRTL ? (
                      <ArrowLeft className="w-5 h-5 text-brand-primary/60 group-hover:translate-x-[-4px] transition-transform" />
                    ) : (
                      <ArrowRight className="w-5 h-5 text-brand-primary/60 group-hover:translate-x-[4px] transition-transform" />
                    )}
                  </h3>
                  
                  <p className="text-sm text-white/50 leading-relaxed">
                    {language === "en" 
                      ? "Search with your incident ID to update the proposed solution, toggle resolution status, or upload proof-of-work documents." 
                      : "أدخل رقم البلاغ المسجل للبحث عنه واستعراض تفاصيله، أو تحديث الحل المقترح، وتغيير حالته وإرفاق صور الحل."}
                  </p>
                </button>

                {/* CHOICE B: FULL INCIDENT REPORTING */}
                <button
                  type="button"
                  onClick={() => setViewMode("report")}
                  className="group relative flex flex-col items-start p-8 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-brand-secondary/40 hover:bg-white/[0.06] transition-all duration-300 text-start overflow-hidden shadow-2xl"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-secondary/5 blur-2xl group-hover:bg-brand-secondary/10 transition-all pointer-events-none" />
                  
                  <div className="w-14 h-14 bg-brand-secondary/10 rounded-2xl border border-brand-secondary/20 flex items-center justify-center text-brand-secondary mb-6 transition-all group-hover:scale-110">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                    <span>{language === "en" ? "Report Incident" : "الإبلاغ عن حادث أو خطر"}</span>
                    {isRTL ? (
                      <ArrowLeft className="w-5 h-5 text-brand-secondary/60 group-hover:translate-x-[-4px] transition-transform" />
                    ) : (
                      <ArrowRight className="w-5 h-5 text-brand-secondary/60 group-hover:translate-x-[4px] transition-transform" />
                    )}
                  </h3>
                  
                  <p className="text-sm text-white/50 leading-relaxed">
                    {language === "en" 
                      ? "File unsafe acts, condition anomalies, or near misses with step-by-step documentation and AI assistance." 
                      : "تقديم بلاغ سلامة فائق ومفصل عن المخالفات أو حوادث الميدان مع تفصيل دقيق وتقييم ذكي للمخاطر."}
                  </p>
                </button>

              </div>

              {/* Smaller public admin entrance button */}
              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => setViewMode("login")}
                  className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white hover:scale-[1.02] bg-white/5 border border-white/10 hover:border-white/20 px-4 py-2 rounded-xl transition-all cursor-pointer font-semibold shadow-md inline-block mx-auto"
                >
                  <Lock className="w-3.5 h-3.5 text-brand-primary/70 animate-pulse" />
                  <span>{language === "en" ? "System Administrator Login" : "تسجيل دخول مدير النظام"}</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* 1B. INTUITIVE WORKSPACE: TRACK OR EDIT EXISTING REPORT */}
          {viewMode === "track_edit" && (
            <motion.div
              key="trackEditPane"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full max-w-2xl"
            >
              <div className="mb-4">
                <button
                  onClick={() => {
                    setViewMode("selection");
                    setSearchedIncident(null);
                    setSearchQuery("");
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-white/50 hover:text-white transition-colors cursor-pointer"
                >
                  {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                  <span>{language === "en" ? "Return to main hub" : "العودة للرئيسية"}</span>
                </button>
              </div>

              {!searchedIncident ? (
                <GlassPanel className="p-8 text-center space-y-6">
                  <div className="mx-auto w-12 h-12 bg-brand-secondary/15 border border-brand-secondary/35 text-brand-secondary rounded-full flex items-center justify-center">
                    <History className="w-6 h-6 animate-pulse" />
                  </div>

                  <h2 className="text-xl font-bold text-white font-sans">
                    {language === "en" ? "Track / Update Incident Status" : "متابعة وتحديث حالة البلاغات"}
                  </h2>
                  <p className="text-sm text-white/60 leading-relaxed">
                    {language === "en" 
                      ? "Enter your unique security incident identifier code below (e.g. A01253) to view status or contribute corrective answers." 
                      : "أدخل الكود الفريد المخصص للبلاغ الذي قمت بإرساله سابقاً (مثل A01253) للاستعلام عن حالته الحالية أو لإضافة الإجراءات التصحيحية المرفقة."}
                  </p>

                  <form onSubmit={handleSearchIncident} className="space-y-4">
                    {searchError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 text-xs text-red-400 rounded-xl flex gap-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>{searchError}</span>
                      </div>
                    )}
                    
                    <div className="space-y-1.5">
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="A01253"
                        className="w-full glass-input text-center text-[#a5f3fc] text-lg font-mono tracking-widest"
                        required
                        autoFocus
                      />
                    </div>

                    <GlassButton type="submit" disabled={isSearching} className="w-full py-3.5 text-xs font-bold uppercase cursor-pointer">
                      {isSearching ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1 inline" />
                          <span>{language === "en" ? "Retrieving Record..." : "جاري فك تشفير البيانات..."}</span>
                        </>
                      ) : (
                        <span>{language === "en" ? "Search Database" : "استعلام وبحث"}</span>
                      )}
                    </GlassButton>
                  </form>
                </GlassPanel>
              ) : (
                <div className="space-y-6">
                  {/* SUCCESS FLAG STATE */}
                  {editSuccessMsg && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-green-500/15 border border-green-500/30 text-green-400 rounded-2xl text-xs font-semibold flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      <span>{editSuccessMsg}</span>
                    </motion.div>
                  )}

                  {/* DISPLAY INTEGRATED DETAILS (Read Only) */}
                  <GlassPanel className="p-6 space-y-4 border-white/10 relative overflow-hidden">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-3 gap-2">
                      <div>
                        <span className="text-[10px] text-white/40 block tracking-widest uppercase">{language === "en" ? "Database Incident ID" : "الرقم التعريفي للبلاغ"}</span>
                        <h3 className="text-xl font-mono text-brand-secondary font-bold">{searchedIncident.id}</h3>
                      </div>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold uppercase border",
                        searchedIncident.status === "Resolved" 
                          ? "bg-green-500/15 text-green-400 border-green-500/30" 
                          : "bg-orange-500/15 text-orange-400 border-orange-500/30"
                      )}>
                        {searchedIncident.status === "Resolved" 
                          ? (language === "en" ? "Resolved" : "تم الحل وتجاوز الخطر") 
                          : (language === "en" ? "Open" : "قيد المعالجة (مفتوح)")
                        }
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-white/40 block">{language === "en" ? "Reporter Name" : "اسم الموظف"}</span>
                        <span className="text-white/80 font-semibold">{searchedIncident.employeeName}</span>
                      </div>
                      <div>
                        <span className="text-white/40 block">{language === "en" ? "Incident Location inside" : "موقع الحادث الفعلي"}</span>
                        <span className="text-white/80 font-semibold">{searchedIncident.incidentLocation || "المستودع"}</span>
                      </div>
                      <div>
                        <span className="text-white/40 block">{language === "en" ? "Assigned Branch" : "الفرع / الموقع"}</span>
                        <span className="text-white/80 font-semibold">{searchedIncident.agency}</span>
                      </div>
                      <div>
                        <span className="text-white/40 block">{language === "en" ? "Severity / Risk Level" : "مستوى ودرجة الخطورة"}</span>
                        <span className="text-white/80 font-bold text-red-400">{searchedIncident.riskScore || "N/A"}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-white/5 text-xs">
                      <span className="text-white/40 block">{language === "en" ? "Description of Incident" : "تفاصيل ووصف البلاغ"}</span>
                      <p className="bg-[#05050c] p-3 rounded-lg text-white/70 border border-white/5 leading-relaxed">{searchedIncident.description}</p>
                    </div>

                    {searchedIncident.files && (
                      <div className="space-y-1 pt-2">
                        <span className="text-xs text-white/40 block">{language === "en" ? "Uploaded Files / Logs" : "المرفقات الحالية"}</span>
                        <div className="flex flex-wrap gap-2 pt-1 text-xs">
                          {searchedIncident.files.split(", ").map((f: string, i: number) => {
                            const isUrl = f.startsWith("http");
                            return (
                              <a 
                                key={i} href={isUrl ? f : "#"} target="_blank" rel="noopener noreferrer"
                                className="px-2.5 py-1 bg-white/5 border border-white/10 text-brand-primary underline rounded-md hover:bg-white/10 truncate max-w-[200px]"
                              >
                                {isUrl ? `${language === "en" ? "Attachment" : "مرفق"} ${i + 1}` : f}
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </GlassPanel>

                  {/* EDITABLE COMPONENT VIEW */}
                  <GlassPanel className="p-6 border-white/10 space-y-4">
                    <h4 className="font-bold text-sm text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-cyan-300">
                      {language === "en" ? "Modify Safety Controls" : "تحديث الإجراءات التصحيحية وحل المشكلة"}
                    </h4>

                    {searchedIncident.status === "Resolved" ? (
                      <div className="p-4 bg-green-500/10 border border-green-500/20 text-xs text-green-400 rounded-xl leading-relaxed">
                        {language === "en" 
                          ? "This incident has already been officially resolved and certified. No further editing is permitted." 
                          : "تم حل هذه المشكلة وإغلاق البلاغ بنجاح! لا يمكن تعديل الحل المقترح في هذه الحالة."}
                      </div>
                    ) : (
                      <form onSubmit={handleSaveEdit} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs text-white/60 font-semibold uppercase tracking-wider">{language === "en" ? "Update Solution / Corrective Action" : "الحل المقترح أو الإجراء المتخذ لحل المشكلة"}</label>
                          <textarea 
                            rows={3}
                            value={editProposedSolution}
                            onChange={(e) => setEditProposedSolution(e.target.value)}
                            className="w-full glass-input text-white text-sm"
                            placeholder="Detail how the issue was/is being resolved..."
                            required
                          />
                        </div>

                        {/* Dropdown status toggle capability */}
                        <div className="space-y-1.5">
                          <label className="text-xs text-white/40 block">{language === "en" ? "Problem Resolution State" : "لتغيير حالة المشكلة"}</label>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
                              <input 
                                type="checkbox"
                                checked={editIsResolved}
                                onChange={(e) => setEditIsResolved(e.target.checked)}
                                className="w-4 h-4 accent-brand-secondary"
                              />
                              <span>{language === "en" ? "Mark this issue as fully solved (Resolved)" : "تحديد المشكلة كـ (محلولة بالكامل)"}</span>
                            </label>
                          </div>
                        </div>

                        {/* File Upload of evidence */}
                        <div className="space-y-2 pt-3 border-t border-white/5">
                          <label className="text-xs text-white/60 font-semibold block">{language === "en" ? "Upload proofs of resolution" : "إرفاق مستندات أو صور جديدة توضح حل المشكلة"}</label>
                          <div className="flex gap-4 items-center">
                            <button
                              type="button"
                              onClick={() => editFileInputRef.current?.click()}
                              className="px-4 py-2 bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-xl text-xs flex items-center gap-2 cursor-pointer"
                            >
                              <Upload className="w-4 h-4 text-brand-secondary" />
                              <span>{language === "en" ? "Choose Proof File" : "اختر صورة الحل"}</span>
                            </button>
                            <input type="file" ref={editFileInputRef} className="hidden" multiple accept="image/*" onChange={handleEditFileChange} />
                            
                            {editNewFiles.length > 0 && (
                              <span className="text-[10px] text-white/50">{editNewFiles.length} {language === "en" ? "file(s) attached" : "ملفات جاهزة للرفع"}</span>
                            )}
                          </div>

                          {editNewFiles.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                              {editNewFiles.map((file, idx) => (
                                <div key={idx} className="relative w-14 h-14 bg-white/5 rounded-lg border border-white/10 overflow-hidden group">
                                  <div className="absolute inset-0 flex items-center justify-center text-[8px] text-white/40 truncate p-1">{file.name}</div>
                                  <button type="button" onClick={() => removeEditFile(idx)} className="absolute top-0.5 right-0.5 bg-red-500 rounded-full p-0.5">
                                    <X className="w-2.5 h-2.5 text-white" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end pt-3">
                          <GlassButton type="submit" disabled={isSavingEdit} className="px-8 py-3 bg-brand-primary text-black font-bold">
                            {isSavingEdit ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin inline-block mr-1" />
                                <span>{language === "en" ? "Saving updates..." : "جاري حفظ وإرسال التعديلات..."}</span>
                              </>
                            ) : (
                              <span>{language === "en" ? "Submit and Close" : "حفظ التعديلات وإرسال"}</span>
                            )}
                          </GlassButton>
                        </div>
                      </form>
                    )}
                  </GlassPanel>
                </div>
              )}
            </motion.div>
          )}

          {/* 2. FORM VIEW: ENTERPRISE LOGIN */}
          {viewMode === "login" && (
            <motion.div
              key="loginPane"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full max-w-md"
            >
              <div className="mb-4">
                <button
                  onClick={() => setViewMode("selection")}
                  className="flex items-center gap-1.5 text-xs font-bold text-white/50 hover:text-white transition-colors"
                >
                  {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                  <span>{language === "en" ? "Return to main hub" : "العودة للقائمة الرئيسية"}</span>
                </button>
              </div>

              <GlassPanel className="p-8 border-brand-primary/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 blur-xl pointer-events-none" />
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-brand-primary/10 rounded-xl border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{t.enterpriseLogin}</h2>
                    <p className="text-xs text-white/50">{language === "en" ? "Admin & Supervisor Dashboard Entry" : "بوابة دخول إدارة النظام والمشرفين"}</p>
                  </div>
                </div>

                <p className="text-sm text-white/60 mb-6 leading-relaxed">
                  {t.loginSubtitle}
                </p>

                <form onSubmit={handleLogin} className="space-y-5">
                  {loginError && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-medium flex gap-2"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{loginError}</span>
                    </motion.div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/60 uppercase tracking-widest">{t.username}</label>
                    <div className="relative">
                      <UserIcon className={cn("absolute top-3 w-5 h-5 text-white/30", isRTL ? "right-3" : "left-3")} />
                      <input 
                        type="text" 
                        required
                        placeholder="admin"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        className={cn("w-full glass-input text-white", isRTL ? "pr-10" : "pl-10")}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/60 uppercase tracking-widest">{t.password}</label>
                    <div className="relative">
                      <Lock className={cn("absolute top-3 w-5 h-5 text-white/30", isRTL ? "right-3" : "left-3")} />
                      <input 
                        type="password" 
                        required
                        placeholder="••••••••"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className={cn("w-full glass-input text-white", isRTL ? "pr-10" : "pl-10")}
                      />
                    </div>
                  </div>

                  <GlassButton type="submit" className="w-full py-4 text-sm font-bold tracking-wider uppercase mt-4">
                    {t.login}
                  </GlassButton>
                </form>


              </GlassPanel>
            </motion.div>
          )}

          {/* 3. EXTENSIVE VIEW: DETAILED REPORT FORM (IDENTICAL TO FULL ReportForm.tsx AT INNER AREA) */}
          {viewMode === "report" && (
            <motion.div
              key="reportPane"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full max-w-4xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={resetIncidentFormAndGoBack}
                  className="flex items-center gap-1.5 text-xs font-bold text-white/50 hover:text-white transition-colors"
                >
                  {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                  <span>{language === "en" ? "Discard & Return to main hub" : "إلغاء والعودة للرئيسية"}</span>
                </button>

                <div className="flex items-center gap-2 text-white/40 text-xs font-mono">
                  <Clock className="w-3.5 h-3.5 text-brand-secondary" />
                  <span>{new Date().toLocaleDateString(language === "ar" ? "ar-EG" : "en-US")}</span>
                </div>
              </div>

              {/* SUCCESS BOX */}
              {submissionSuccess ? (
                <GlassPanel className="p-8 text-center space-y-6">
                  <div className="mx-auto w-16 h-16 bg-green-500/15 border border-green-500/30 text-green-400 rounded-full flex items-center justify-center">
                    <Check className="w-8 h-8 animate-pulse" />
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white font-sans">
                      {language === "ar" ? "تم إرسال البلاغ وتوثيقه بنجاح!" : "Incident Reported Successfully!"}
                    </h2>
                    <p className="text-sm text-white/60">
                      {language === "ar" ? "شكراً لمساهمتك الإيجابية في تعزيز ونشر ثقافة السلامة والصحة المهنية بالمنشأة." : "Thank you for contributing to our Risk Management & Work Safety standards."}
                    </p>
                  </div>

                  {/* Action Copy Card with dual copy functionality */}
                  <div className="max-w-xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/[0.02] border border-white/10 p-5 rounded-2xl shadow-inner text-right" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                    <div className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-xl">
                      <div className="text-right flex-1">
                        <span className="text-[10px] text-white/40 block mb-0.5 uppercase tracking-wider">{language === "ar" ? "رمز البلاغ" : "Incident Code"}</span>
                        <span className="text-base font-mono text-brand-secondary font-bold select-all">{lastIncidentId}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (lastIncidentId) {
                            navigator.clipboard.writeText(lastIncidentId);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }
                        }}
                        className="flex items-center justify-center p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 text-white/70 hover:text-white transition-all cursor-pointer"
                        title={language === "ar" ? "نسخ رمز البلاغ" : "Copy Incident Code"}
                      >
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-xl">
                      <div className="text-right flex-1">
                        <span className="text-[10px] text-white/40 block mb-0.5 uppercase tracking-wider">{language === "ar" ? "تصدير البلاغ للمشاركة" : "Share / Export Report"}</span>
                        <span className="text-xs text-white/70 font-semibold">{language === "ar" ? "نسخ البلاغ كاملاً للمشاركة" : "Copy Full Report Details"}</span>
                      </div>
                      <button
                        type="button"
                        onClick={copyFullReportText}
                        className="flex items-center gap-1.5 text-xs py-2.5 px-3 rounded-xl bg-brand-primary/10 border border-brand-primary/20 hover:bg-brand-primary hover:text-black active:scale-95 text-brand-primary transition-all font-bold cursor-pointer"
                        title={language === "ar" ? "نسخ تفاصيل البلاغ بالكامل" : "Copy Full Report Text"}
                      >
                        {copiedReport ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>{language === "ar" ? "تم نسخ التقرير!" : "Report Copied!"}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>{language === "ar" ? "نسخ التقرير" : "Copy Report"}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* HSE SMART INTERACTIVE AI ASSISTANT PANEL */}
                  {chatMessages.length > 0 ? (
                    <div className="mt-8 text-left max-w-2xl mx-auto space-y-4" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20">
                            <Sparkles className="w-4.5 h-4.5 text-brand-primary animate-pulse" />
                          </div>
                          <div className="text-right">
                            <h4 className="font-bold text-white text-sm">{language === "ar" ? "مساعد السلامة المهنية الذكي المتكامل" : "Integrated Smart AI HSE Assistant"}</h4>
                            <p className="text-[10px] text-white/40">{language === "ar" ? "تحدث مع خبير السلامة والصحة المهنية لطلب الإجراءات الاحترازية" : "Ask safety procedural questions or request HSE guidelines"}</p>
                          </div>
                        </div>
                        <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-bold px-2 py-0.5 rounded-full animate-pulse">● Active</span>
                      </div>

                      {/* Chat Messages Container */}
                      <div className="bg-black/30 border border-white/10 rounded-2xl p-4 md:p-5 max-h-[380px] overflow-y-auto space-y-4 shadow-2xl custom-scrollbar text-right" style={{ maxHeight: "380px" }}>
                        {chatMessages.map((msg, index) => (
                          <div
                            key={index}
                            className={cn(
                              "flex gap-3 text-sm items-start max-w-[85%]",
                              msg.sender === "user" ? (isRTL ? "mr-auto flex-row-reverse" : "ml-auto flex-row") : (isRTL ? "ml-auto" : "mr-auto")
                            )}
                          >
                            <div className={cn(
                              "w-8 h-8 rounded-xl shrink-0 flex items-center justify-center font-bold text-xs shadow-md border",
                              msg.sender === "user" 
                                ? "bg-white/10 border-white/20 text-white" 
                                : "bg-brand-primary/10 border-brand-primary/20 text-brand-primary"
                            )}>
                              {msg.sender === "user" ? "U" : "AI"}
                            </div>
                            <div className={cn(
                              "p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans text-right",
                              msg.sender === "user" 
                                ? "bg-white/5 border border-white/5 text-white/90 rounded-tr-none" 
                                : "bg-brand-primary/[0.02] border border-brand-primary/10 text-brand-primary/95 font-medium rounded-tl-none pr-4"
                            )}>
                              {msg.text}
                            </div>
                          </div>
                        ))}
                        {isChatSending && (
                          <div className={cn("flex gap-3 text-sm items-start max-w-[80%]", isRTL ? "ml-auto" : "mr-auto")}>
                            <div className="w-8 h-8 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary shrink-0 flex items-center justify-center">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            </div>
                            <div className="bg-brand-primary/[0.03] border border-brand-primary/10 rounded-2xl p-3 text-xs text-brand-primary/60 font-semibold italic animate-pulse">
                              {language === "ar" ? "مساعد السلامة المهنية يقوم بتحليل ومراجعة التفاصيل..." : "HSE Assistant is drafting tailored rules..."}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Instant Suggestion Chips */}
                      <div className="space-y-1.5" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                        <span className="text-[10px] text-white/30 uppercase tracking-wider font-bold block text-right">{language === "ar" ? "أسئلة سريعة شائعة:" : "Quick helpful actions:"}</span>
                        <div className="flex flex-wrap gap-2 justify-start">
                          {(language === "ar" ? [
                            "ما هي معدات الوقاية الشخصية (PPE) المطلوبة لهذه الحالة؟",
                            "كيف يمكننا تأمين وتطويق هذا الخطر فورياً؟",
                            "اكتب لي تنبيه سلامة سريع لإرساله للموظفين بالموقع"
                          ] : [
                            "What Safety Gear / PPE is required for this?",
                            "How do we safely isolate and cordon this hazard?",
                            "Draft a safety alert email memo for site staff"
                          ]).map((chip, idx) => (
                            <button
                              key={idx}
                              type="button"
                              disabled={isChatSending}
                              onClick={(e) => handleSendChatMessage(e, chip)}
                              className="text-[10px] sm:text-xs font-semibold py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 border border-white/5 text-white/60 hover:text-white transition-all cursor-pointer font-sans"
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Chat text input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSendChatMessage();
                            }
                          }}
                          placeholder={language === "ar" ? "اسأل خبير السلامة الذكي عن إجراءات السلامة..." : "Type your safety/procedural question..."}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 text-xs focus:outline-none focus:border-brand-primary/40 text-right"
                          disabled={isChatSending}
                          style={{ direction: isRTL ? "rtl" : "ltr" }}
                        />
                        <button
                          type="button"
                          disabled={isChatSending || !chatInput.trim()}
                          onClick={() => handleSendChatMessage()}
                          className="px-5 bg-brand-primary text-black hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 font-sans"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{language === "ar" ? "إرسال" : "Send"}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-4 max-w-sm mx-auto">
                      <button
                        type="button"
                        onClick={handleFetchAiSuggestions}
                        disabled={isAiLoading}
                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-brand-primary/10 border border-brand-primary/30 text-brand-primary hover:bg-brand-primary hover:text-black rounded-xl transition-all font-bold text-sm cursor-pointer shadow-lg shadow-brand-primary/5 hover:scale-[1.02]"
                      >
                        {isAiLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{language === "ar" ? "جاري تشغيل مساعد السلامة وتوجيه البيانات..." : "Consulting HSE Agent..."}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4.5 h-4.5 text-brand-primary animate-bounce" />
                            <span>{language === "ar" ? "تفعيل مساعد السلامة المهنية الذكي بالأجهزة" : "Launch Smart AI Safety Assistant Expert"}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row gap-4 justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setSubmissionSuccess(false);
                        setReportStep(1);
                        setReportForm({
                          employeeName: "",
                          incidentLocation: "المستودع",
                          agency: branches[0]?.name || "",
                          classification: "nearMiss",
                          description: "",
                          severity: 1,
                          probability: 1,
                          correctiveAction: "",
                          files: []
                        });
                        setAiSuggestions("");
                        setChatMessages([]);
                      }}
                      className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-xs cursor-pointer transition-all border border-white/10 font-sans"
                    >
                      {language === "en" ? "File Another Report" : "تسجيل بلاغ آخر"}
                    </button>
                    <button
                      type="button"
                      onClick={resetIncidentFormAndGoBack}
                      className="px-6 py-3 bg-brand-secondary text-black hover:bg-brand-secondary/90 font-bold rounded-xl text-xs cursor-pointer transition-all border border-transparent font-sans"
                    >
                      {language === "en" ? "Return to main hub" : "العودة للرئيسية"}
                    </button>
                  </div>
                </GlassPanel>
              ) : (
                <form onSubmit={handleFullReportSubmit} className="space-y-6">
                  {/* Step Progress indicators */}
                  <div className="flex items-center gap-4 px-1">
                    <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div 
                        className="h-full bg-brand-secondary transition-all duration-300" 
                        style={{ width: reportStep === 1 ? "50%" : "100%" }} 
                      />
                    </div>
                    <span className="text-xs font-mono text-white/40">
                      {language === "en" ? `Step ${reportStep} of 2` : `خطوة ${reportStep} من 2`}
                    </span>
                  </div>

                  <AnimatePresence mode="wait">
                    
                    {/* STEP 1: GENERAL INFORMATION */}
                    {reportStep === 1 && (
                      <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                      >
                        <GlassPanel className="p-8 space-y-6 border-white/5">
                          <h3 className="text-xl font-bold border-b border-white/10 pb-4 mb-6 text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-brand-secondary" />
                            <span>{language === "en" ? "Step 1: General Details" : "الخطوة ١: تفاصيل البلاغ العامة"}</span>
                          </h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase tracking-wider text-pink-400 font-extrabold">
                                {t.form.employeeName} * ({language === "en" ? "Compulsory" : "إجباري"})
                              </label>
                              <input 
                                type="text" 
                                placeholder={language === "en" ? "John Doe" : "اسم المبلغ بالكامل"}
                                value={reportForm.employeeName}
                                onChange={(e) => setReportForm({ ...reportForm, employeeName: e.target.value })}
                                className="w-full glass-input text-white border-pink-500/30"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase tracking-wider text-pink-400 font-extrabold">
                                {language === "en" ? "Incident Location *" : "موقع الحادث *"} ({language === "en" ? "Compulsory" : "إجباري"})
                              </label>
                              <div className="relative">
                                <select
                                  value={reportForm.incidentLocation}
                                  onChange={(e) => setReportForm({ ...reportForm, incidentLocation: e.target.value })}
                                  className="w-full glass-input text-white bg-[#06060c]/90 appearance-none pr-10 border-pink-500/30 font-semibold"
                                  required
                                >
                                  <option value="المستودع">{language === "en" ? "Warehouse" : "المستودع"}</option>
                                  <option value="الادارة">{language === "en" ? "Management" : "الادارة"}</option>
                                </select>
                                <div className={cn("absolute top-3.5 pointer-events-none text-white/30 text-xs", isRTL ? "left-3" : "right-3")}>▼</div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase tracking-wider text-white/65">
                                {language === "en" ? "Region / District *" : "المنطقة / القطاع *"}
                              </label>
                              <div className="relative">
                                <select
                                  value={selectedRegion}
                                  onChange={(e) => handleRegionChange(e.target.value)}
                                  className="w-full glass-input text-white bg-[#06060c]/90 appearance-none pr-10"
                                  required
                                >
                                  <option value="" disabled className="text-white/40">
                                    {language === "en" ? "-- Choose Region --" : "-- اختر المنطقة --"}
                                  </option>
                                  {uniqueRegions.map(reg => (
                                    <option key={reg} value={reg} className="bg-[#0e0e1a] text-white">
                                      {reg}
                                    </option>
                                  ))}
                                </select>
                                <div className={cn("absolute top-3.5 pointer-events-none text-white/30 text-xs", isRTL ? "left-3" : "right-3")}>▼</div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase tracking-wider text-white/65">
                                {t.form.agency} *
                              </label>
                              {isBranchesLoading ? (
                                <div className="text-xs text-white/45 flex items-center gap-1.5 py-3 font-mono">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-secondary" />
                                  <span>{language === "en" ? "Syncing branches..." : "جاري تحميل الفروع..."}</span>
                                </div>
                              ) : (
                                <div className="relative">
                                  <select 
                                    value={reportForm.agency}
                                    onChange={(e) => setReportForm({ ...reportForm, agency: e.target.value })}
                                    className="w-full glass-input text-white bg-[#06060c]/90 appearance-none pr-10"
                                    required
                                  >
                                    <option value="" disabled className="text-white/40">{language === "en" ? "-- Choose dynamic branch --" : "-- اختر الفرع --"}</option>
                                    {filteredBranches.map(b => (
                                      <option key={b.name} value={b.name} className="bg-[#0e0e1a] text-white">
                                        {b.name}
                                      </option>
                                    ))}
                                  </select>
                                  <div className={cn("absolute top-3.5 pointer-events-none text-white/30 text-xs", isRTL ? "left-3" : "right-3")}>▼</div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-white/60">{t.classification}</label>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                              {Object.entries(t.classifications).map(([key, value]) => (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => setReportForm({ ...reportForm, classification: key })}
                                  className={cn(
                                    "px-4 py-3 rounded-xl border text-sm font-medium transition-all text-center truncate",
                                    reportForm.classification === key 
                                      ? "bg-brand-primary/20 border-brand-primary text-brand-primary text-bold" 
                                      : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                                  )}
                                >
                                  {value}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-white/60">{t.form.description}</label>
                            <textarea 
                              rows={5}
                              value={reportForm.description}
                              onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                              className="w-full glass-input resize-none text-white leading-relaxed"
                              placeholder={language === "en" ? "Describe what hazard or incident occurred with specific machinery, gas leakage, or personal action details..." : "اكتب تفاصيل المخاطر أو مسببات الحادث، المواد المتدخلة، الأشكال غير الآمنة أو ما شابه..."}
                              required
                            />
                          </div>
                        </GlassPanel>

                        <div className="flex justify-end">
                          <GlassButton 
                            type="button" 
                            onClick={() => {
                              if (!reportForm.employeeName.trim()) {
                                alert(language === "en" ? "Please fill in the Employee Name field." : "يرجى كتابة اسم المبلغ أولاً.");
                                return;
                              }
                              if (!reportForm.incidentLocation) {
                                alert(language === "en" ? "Please select the incident location." : "يرجى اختيار موقع وقوع الحادث.");
                                return;
                              }
                              if (!selectedRegion) {
                                alert(language === "en" ? "Please select the region." : "يرجى اختيار المنطقة أولاً.");
                                return;
                              }
                              if (!reportForm.agency) {
                                alert(language === "en" ? "Please select the branch." : "يرجى اختيار الفرع أولاً.");
                                return;
                              }
                              if (!reportForm.description.trim()) {
                                alert(language === "en" ? "Please write the description." : "يرجى ملء تفاصيل ووصف البلاغ أولاً.");
                                return;
                              }
                              setReportStep(2);
                            }}
                            className="flex items-center gap-2 px-8 py-3.5 bg-brand-secondary text-black hover:bg-brand-secondary/90 transition-all font-bold"
                          >
                            <span>{language === "en" ? "Proceed to Evidence & Analysis" : "الاستمرار للأدلة والتقييم"}</span>
                            {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                          </GlassButton>
                        </div>
                      </motion.div>
                    )}

                    {/* STEP 2: EVIDENCE & RISK ANALYSIS */}
                    {reportStep === 2 && (
                      <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                      >
                        <GlassPanel className="p-8 space-y-6 border-white/5">
                          <h3 className="text-xl font-bold border-b border-white/10 pb-4 mb-6 text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-brand-primary" />
                            <span>{language === "en" ? "Step 2: Real-time Analysis & Files" : "الخطوة ٢: المرفقات والتقييم التنبؤي الذكي"}</span>
                          </h3>
                          
                          {/* Attachments Section */}
                          <div className="space-y-4">
                            <label className="text-xs font-bold uppercase tracking-wider text-white/60">{t.form.attachments}</label>
                            <div>
                              <button 
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-28 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-all group"
                              >
                                <Upload className="w-6 h-6 text-white/30 group-hover:text-brand-primary transition-colors" />
                                <span className="text-xs text-white/40">{t.form.uploadPrompt}</span>
                              </button>
                              
                              <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                multiple 
                                onChange={handleFileChange} 
                              />
                            </div>

                            {reportForm.files.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-2">
                                {reportForm.files.map((file, idx) => (
                                  <div key={idx} className="relative px-3 py-2 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2 text-xs text-white/80">
                                    <span className="truncate max-w-[150px]">{file.name}</span>
                                    <button 
                                      type="button"
                                      onClick={() => removeFile(idx)}
                                      className="text-red-400 hover:text-red-300 transition-colors shrink-0"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Risk sliders with dynamic live panel */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                            <div className="space-y-5">
                              <h4 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-cyan-300 flex items-center gap-2 uppercase tracking-wide">
                                <AlertCircle className="w-4 h-4 text-brand-primary" />
                                <span>{t.form.riskAssessment}</span>
                              </h4>
                              
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <div className="flex justify-between text-xs font-medium text-white/60">
                                    <span>{t.form.severity}</span>
                                    <span className="font-bold text-brand-primary">{reportForm.severity}</span>
                                  </div>
                                  <select
                                    value={reportForm.severity}
                                    onChange={(e) => setReportForm({...reportForm, severity: parseInt(e.target.value)})}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:border-brand-primary outline-none text-white font-medium cursor-pointer"
                                  >
                                    <option value={1} className="bg-[#0f0e20] text-white">{language === "en" ? "1 ➔ Delay only" : "١ ➔ تأخير فقط"}</option>
                                    <option value={2} className="bg-[#0f0e20] text-white">{language === "en" ? "2 ➔ Minor injury (FAC), minor damage" : "٢ ➔ إصابة بسيطة (FAC)، ضرر بسيط"}</option>
                                    <option value={4} className="bg-[#0f0e20] text-white">{language === "en" ? "4 ➔ LTI, disease or damage" : "٤ ➔ إصابة تستلزم وقت راحة، مرض أو ضرر"}</option>
                                    <option value={6} className="bg-[#0f0e20] text-white">{language === "en" ? "6 ➔ Major injury, disabling illness" : "٦ ➔ إصابة كبيرة، مرض معطل، ضرر كبير"}</option>
                                    <option value={8} className="bg-[#0f0e20] text-white">{language === "en" ? "8 ➔ Single Death" : "٨ ➔ وفاة واحدة"}</option>
                                    <option value={10} className="bg-[#0f0e20] text-white">{language === "en" ? "10 ➔ Multiple Deaths" : "١٠ ➔ وفيات متعددة"}</option>
                                  </select>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex justify-between text-xs font-medium text-white/60">
                                    <span>{t.form.probability}</span>
                                    <span className="font-bold text-brand-secondary">{reportForm.probability}</span>
                                  </div>
                                  <select
                                    value={reportForm.probability}
                                    onChange={(e) => setReportForm({...reportForm, probability: parseInt(e.target.value)})}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:border-brand-primary outline-none text-white font-medium cursor-pointer"
                                  >
                                    <option value={1} className="bg-[#0f0e20] text-white">{language === "en" ? "1 ➔ Very Unlikely" : "١ ➔ غير محتمل جدًا"}</option>
                                    <option value={2} className="bg-[#0f0e20] text-white">{language === "en" ? "2 ➔ Unlikely" : "٢ ➔ غير محتمل"}</option>
                                    <option value={4} className="bg-[#0f0e20] text-white">{language === "en" ? "4 ➔ May Happen" : "٤ ➔ قد يحدث"}</option>
                                    <option value={6} className="bg-[#0f0e20] text-white">{language === "en" ? "6 ➔ Likely" : "٦ ➔ محتمل"}</option>
                                    <option value={8} className="bg-[#0f0e20] text-white">{language === "en" ? "8 ➔ Very Likely" : "٨ ➔ محتمل جدًا"}</option>
                                    <option value={10} className="bg-[#0f0e20] text-white">{language === "en" ? "10 ➔ Certain or Imminent" : "١٠ ➔ مؤكد أو وشيك"}</option>
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* Risk level score tile */}
                            <div className="flex flex-col items-center justify-center p-6 bg-white/[0.02] rounded-3xl border border-white/10 relative overflow-hidden">
                              <div className={cn("absolute inset-0 opacity-10", riskLevel.bg)} />
                              <p className="text-xs text-white/40 uppercase tracking-widest mb-1">{t.form.riskScore}</p>
                              <p className="text-5xl font-black mb-3 text-white tracking-tighter">{riskScore}</p>
                              <span className={cn("px-4 py-1.5 rounded-full text-xs font-bold uppercase border", riskLevel.bg, riskLevel.color, riskLevel.border)}>
                                {riskLevel.label}
                              </span>
                            </div>
                          </div>

                          {/* Suggested Action */}
                          <div className="space-y-4 pt-6 border-t border-white/15">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold uppercase tracking-wider text-white/60">{t.form.correctiveAction}</label>
                            </div>

                            <textarea 
                              rows={4}
                              value={reportForm.correctiveAction}
                              onChange={(e) => setReportForm({...reportForm, correctiveAction: e.target.value})}
                              className="w-full glass-input text-white text-sm leading-relaxed"
                              placeholder={language === "en" ? "Document local immediate controls and suggested actions taken locally..." : "اكتب الإجراءات الفورية والتصحيحية المتخذة أو المقترحة محلياً لحماية سلامة المنشأة..."}
                            />
                          </div>
                        </GlassPanel>

                        {/* Pagination Actions */}
                        <div className="flex justify-between">
                          <GlassButton 
                            type="button" 
                            variant="ghost"
                            onClick={() => setReportStep(1)}
                            className="px-6 py-3 font-semibold text-white/70"
                          >
                            {language === "en" ? "Back" : "العودة للخطوة السابقة"}
                          </GlassButton>

                          <GlassButton 
                            type="submit" 
                            disabled={isSubmitting}
                            className="px-12 py-3.5 bg-brand-primary text-black hover:bg-brand-primary/90 font-bold flex items-center gap-2 text-sm shadow-xl"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin text-black" />
                                <span>{language === "en" ? "Transmitting..." : "جاري الإرسال والمزامنة..."}</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-black" />
                                <span>{t.submit}</span>
                              </>
                            )}
                          </GlassButton>
                        </div>
                      </motion.div>
                    )}

                  </AnimatePresence>
                </form>
              )}

            </motion.div>
          )}

        </AnimatePresence>

      </main>

      {/* Footer copyright section */}
      <footer className="w-full max-w-7xl mx-auto border-t border-white/5 py-6 mt-12 flex flex-col md:flex-row justify-between items-center text-xs text-white/30 gap-4">
        <p>© 2026 {t.appTitle} Enterprise Co. All rights reserved.</p>
        <p className="font-mono text-[10px] tracking-widest text-[#94a3b8]">{language === "en" ? "RTM-Team-Bahaa Mohamed-Tel:01095665450" : "RTM-Team-Bahaa Mohamed-Tel:01095665450"}</p>
      </footer>
    </div>
  );
}
