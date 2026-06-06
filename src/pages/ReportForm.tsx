import React, { useState, useRef, useEffect } from "react";
import { useStore } from "../store/useStore";
import { translations } from "../i18n/translations";
import { Sidebar } from "../components/Navigation/Sidebar";
import { GlassPanel } from "../components/UI/GlassPanel";
import { GlassButton } from "../components/UI/GlassButton";
import { 
  Camera, 
  Upload, 
  X, 
  Check, 
  Sparkles, 
  AlertCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Copy,
  Send,
  MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { useNavigate } from "react-router-dom";

type FormState = {
  employeeName: string;
  incidentLocation: string;
  agency: string;
  classification: string;
  description: string;
  severity: number;
  probability: number;
  correctiveAction: string;
  files: { name: string; type: string; base64: string }[];
};

export default function ReportForm() {
  const { language, isRTL, user } = useStore();
  const t = translations[language];
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState(1);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string>("");
  const [submittedIncidentId, setSubmittedIncidentId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ sender: "user" | "ai"; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatSending, setIsChatSending] = useState(false);

  const copyFullReportText = () => {
    const reportText = `⚠️ *تقرير بلاغ سلامة وحادث مهني* ⚠️
الرقم التعريفي للبلاغ: ${submittedIncidentId || "N/A"}
المبلّغ: ${form.employeeName || "N/A"}
الموقع الجغرافي: ${form.incidentLocation || "N/A"}
الفرع والمنطقة: ${form.agency || "N/A"}
تصنيف البلاغ: ${t.classifications[form.classification as keyof typeof t.classifications] || form.classification}
مستوى الخطورة الإجمالي: ${riskScore}/25 (${riskLevel.label})
تفاصيل الحادث: ${form.description || "لا يوجد وصف للمشكلة"}
الإجراء الفوري المتخذ محلياً: ${form.correctiveAction || "لا يوجد"}`;
    
    navigator.clipboard.writeText(reportText);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const handleSendChatMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
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
            id: submittedIncidentId,
            employeeName: form.employeeName,
            incidentLocation: form.incidentLocation,
            agency: form.agency,
            classification: form.classification,
            description: form.description,
            severity: form.severity,
            probability: form.probability,
            riskScore: riskScore,
            correctiveAction: form.correctiveAction
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

  interface BranchInfo {
    name: string;
    region: string;
  }

  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);

  const [form, setForm] = useState<FormState>({
    employeeName: user?.name || "",
    incidentLocation: "المستودع",
    agency: "",
    classification: "nearMiss",
    description: "",
    severity: 1,
    probability: 1,
    correctiveAction: "",
    files: []
  });

  useEffect(() => {
    setIsLoadingBranches(true);
    fetch("/api/branches")
      .then(res => res.json())
      .then(data => {
        if (data.branches) {
          const parsed: BranchInfo[] = data.branches.map((b: any) => {
            if (typeof b === "string") {
              // Safe fallback grouping for primitive branch arrays
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
            if (initialBranches.length > 0 && !form.agency) {
              setForm(prev => ({ ...prev, agency: initialBranches[0].name }));
            }
          }
        }
      })
      .catch(err => console.error("Error loaded branches list:", err))
      .finally(() => setIsLoadingBranches(false));
  }, []);

  const uniqueRegions = Array.from(new Set(branches.map(b => b.region))).filter(Boolean);
  const filteredBranches = branches.filter(b => b.region === selectedRegion);

  const handleRegionChange = (region: string) => {
    setSelectedRegion(region);
    const matched = branches.filter(b => b.region === region);
    if (matched.length > 0) {
      setForm(prev => ({ ...prev, agency: matched[0].name }));
    } else {
      setForm(prev => ({ ...prev, agency: "" }));
    }
  };

  const riskScore = form.severity * form.probability;
  const getRiskLevel = (score: number) => {
    if (score >= 12) return { label: t.priorities.critical, color: "text-red-500", bg: "bg-red-500/20" };
    if (score >= 8) return { label: t.priorities.high, color: "text-orange-500", bg: "bg-orange-500/20" };
    if (score >= 4) return { label: t.priorities.medium, color: "text-yellow-500", bg: "bg-yellow-500/20" };
    return { label: t.priorities.low, color: "text-green-500", bg: "bg-green-500/20" };
  };

  const riskLevel = getRiskLevel(riskScore);

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
        setForm(prev => ({ ...prev, files: [...prev.files, ...base64Files] }));
      } catch (err) {
        console.error("Error converting files to Base64:", err);
      }
    }
  };

  const removeFile = (index: number) => {
    setForm(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== index) }));
  };

  const triggerCameraMock = () => {
    const mockBase64 = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"; // 1x1 GIF Base64
    setForm(prev => ({
      ...prev,
      files: [...prev.files, { 
        name: `CAMERA_SNAP_${Date.now()}.png`,
        type: "image/png",
        base64: mockBase64
      }]
    }));
  };

  const handleNextStep = () => {
    if (!form.employeeName.trim()) {
      alert(language === "en" ? "Please fill in the Employee Name field." : "يرجى كتابة اسم الموظف أولاً.");
      return;
    }
    if (!form.incidentLocation) {
      alert(language === "en" ? "Please select the Incident Location." : "يرجى اختيار موقع الحادث أولاً.");
      return;
    }
    if (!selectedRegion) {
      alert(language === "en" ? "Please select the Region / District." : "يرجى تحديد المنطقة / القطاع أولاً.");
      return;
    }
    if (!form.agency) {
      alert(language === "en" ? "Please select the branch." : "يرجى اختيار الفرع / الموقع أولاً.");
      return;
    }
    if (!form.description.trim()) {
      alert(language === "en" ? "Please detail what happened in the description." : "يرجى ملء حقل تفاصيل البلاغ أولاً.");
      return;
    }
    setStep(2);
  };

  const handleFetchAiSuggestions = async () => {
    if (!form.description) return;
    setIsAiLoading(true);
    try {
      const response = await fetch("/api/ai/suggest-corrective-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: submittedIncidentId,
          employeeName: form.employeeName,
          incidentLocation: form.incidentLocation,
          agency: form.agency,
          classification: form.classification,
          description: form.description,
          severity: form.severity,
          probability: form.probability,
          riskScore: riskScore,
          correctiveAction: form.correctiveAction
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, riskScore }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const generateFallbackId = () => {
          const l = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
          const n = Math.floor(10000 + Math.random() * 90000);
          return `${l}${n}`;
        };
        setSubmittedIncidentId(data.id || generateFallbackId());
        setStep(3); // Success Screen step
      } else {
        alert(language === "en" ? "Failed to record incident report." : "فشل تسجيل البلاغ، يرجى المحاولة لاحقاً.");
      }
    } catch (error) {
      console.error(error);
      alert(language === "en" ? "Network error while submitting." : "خطأ في الاتصال بالشبكة كرر المحاولة.");
    }
  };

  return (
    <div className={cn("min-h-screen pb-12", isRTL ? "pr-64" : "pl-64")}>
      <Sidebar />
      
      <header className="p-8">
        <h1 className="text-4xl font-bold tracking-tight">{t.reportIncident}</h1>
        <div className="flex items-center gap-2 text-white/50 mt-2">
          <Clock className="w-4 h-4" />
          <span>{new Date().toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</span>
        </div>
      </header>

      <main className="px-8 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <GlassPanel className="p-8 space-y-6">
                  <h3 className="text-xl font-bold border-b border-white/10 pb-4 mb-6">General Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-pink-400 shrink-0">
                        {t.form.employeeName} * ({language === "en" ? "Compulsory" : "إجباري"})
                      </label>
                      <input 
                        type="text" 
                        value={form.employeeName}
                        onChange={(e) => setForm({...form, employeeName: e.target.value})}
                        className="w-full glass-input border-pink-500/20 text-white font-semibold"
                        required
                        placeholder={language === "en" ? "Your full name" : "اسمك بالكامل"}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-pink-400 shrink-0">
                        {language === "en" ? "Incident Location *" : "موقع الحادث *"} ({language === "en" ? "Compulsory" : "إجباري"})
                      </label>
                      <div className="relative">
                        <select
                          value={form.incidentLocation}
                          onChange={(e) => setForm({...form, incidentLocation: e.target.value})}
                          className="w-full glass-input bg-[#06060c]/90 text-white appearance-none pr-8 font-semibold"
                          required
                        >
                          <option value="المستودع">{language === "en" ? "Warehouse" : "المستودع"}</option>
                          <option value="الادارة">{language === "en" ? "Management" : "الادارة"}</option>
                        </select>
                        <div className={cn("absolute top-3.5 pointer-events-none text-white/30 text-xs", isRTL ? "left-3" : "right-3")}>▼</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-white/70">
                        {language === "en" ? "Region / District *" : "المنطقة / القطاع *"}
                      </label>
                      <div className="relative">
                        <select
                          value={selectedRegion}
                          onChange={(e) => handleRegionChange(e.target.value)}
                          className="w-full glass-input bg-[#06060c]/90 text-white appearance-none pr-8"
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
                      <label className="text-sm font-semibold text-white/70">
                        {t.form.agency} *
                      </label>
                      {isLoadingBranches ? (
                        <div className="text-xs text-white/40 flex items-center gap-1 py-3 font-mono">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-secondary" />
                          <span>{language === "en" ? "Syncing..." : "جاري التحميل..."}</span>
                        </div>
                      ) : (
                        <div className="relative">
                          <select 
                            value={form.agency}
                            onChange={(e) => setForm({...form, agency: e.target.value})}
                            className="w-full glass-input bg-[#06060c]/90 text-white appearance-none pr-8"
                            required
                          >
                            <option value="" disabled className="text-white/40">{language === "en" ? "-- Choose branch --" : "-- اختر الفرع --"}</option>
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
                    <label className="text-sm font-medium text-white/70">{t.classification}</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(t.classifications).map(([key, value]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setForm({...form, classification: key})}
                          className={cn(
                            "px-4 py-3 rounded-xl border text-sm font-medium transition-all",
                            form.classification === key 
                              ? "bg-brand-primary/20 border-brand-primary text-brand-primary" 
                              : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                          )}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-pink-400 shrink-0">
                      {t.form.description} * ({language === "en" ? "Compulsory" : "إجباري"})
                    </label>
                    <textarea 
                      rows={4}
                      value={form.description}
                      onChange={(e) => setForm({...form, description: e.target.value})}
                      className="w-full glass-input resize-none border-pink-500/20"
                      placeholder="Describe what happened, where, and any immediate actions taken..."
                      required
                    />
                  </div>
                </GlassPanel>

                <div className="flex justify-end">
                  <GlassButton 
                    type="button" 
                    onClick={handleNextStep}
                    className="flex items-center gap-2 px-8"
                  >
                    Next {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </GlassButton>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <GlassPanel className="p-8 space-y-6">
                  <h3 className="text-xl font-bold border-b border-white/10 pb-4 mb-6">Evidence & Analysis</h3>
                  
                  <div className="space-y-4">
                    <label className="text-sm font-medium text-white/70">{t.form.attachments}</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-32 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-all group"
                      >
                        <Upload className="w-8 h-8 text-white/20 group-hover:text-brand-primary transition-colors" />
                        <span className="text-sm text-white/40">{t.form.uploadPrompt}</span>
                      </button>
                      <button 
                        type="button"
                        onClick={triggerCameraMock}
                        className="h-32 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-all group"
                      >
                        <Camera className="w-8 h-8 text-white/20 group-hover:text-brand-secondary transition-colors" />
                        <span className="text-sm text-white/40">{t.form.camera}</span>
                      </button>
                      <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileChange} />
                    </div>

                    {form.files.length > 0 && (
                      <div className="flex flex-wrap gap-3">
                        {form.files.map((file, idx) => (
                           <div key={idx} className="relative w-20 h-20 bg-white/5 rounded-lg overflow-hidden border border-white/10 group">
                            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white/50 text-center p-1 break-all">
                              {file.name}
                            </div>
                            <button 
                              type="button"
                              onClick={() => removeFile(idx)}
                              className="absolute top-1 right-1 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-6">
                    <div className="space-y-6">
                      <h4 className="font-semibold text-brand-primary flex items-center gap-2 text-sm uppercase tracking-wider">
                        <AlertCircle className="w-4 h-4" />
                        {t.form.riskAssessment}
                      </h4>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs text-white/40">{t.form.severity} (1-5)</label>
                          <input 
                            type="range" min="1" max="5" 
                            value={form.severity} 
                            onChange={(e) => setForm({...form, severity: parseInt(e.target.value)})}
                            className="w-full accent-brand-primary" 
                          />
                          <div className="flex justify-between text-[10px] text-white/30">
                            <span>Minimal</span><span>Catastrophic</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-white/40">{t.form.probability} (1-5)</label>
                          <input 
                            type="range" min="1" max="5" 
                            value={form.probability} 
                            onChange={(e) => setForm({...form, probability: parseInt(e.target.value)})}
                            className="w-full accent-brand-secondary" 
                          />
                          <div className="flex justify-between text-[10px] text-white/30">
                            <span>Unlikely</span><span>Certain</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center p-8 bg-white/5 rounded-3xl border border-white/10 relative overflow-hidden">
                      <div className={cn("absolute inset-0 opacity-10", riskLevel.bg)} />
                      <p className="text-sm text-white/40 mb-2 uppercase tracking-tighter">{t.form.riskScore}</p>
                      <p className="text-6xl font-bold mb-4">{riskScore}</p>
                      <span className={cn("px-4 py-1 rounded-full text-xs font-bold uppercase", riskLevel.bg, riskLevel.color)}>
                        {riskLevel.label}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-white/70">{t.form.correctiveAction}</label>
                    </div>
                    <textarea 
                      rows={5}
                      value={form.correctiveAction}
                      onChange={(e) => setForm({...form, correctiveAction: e.target.value})}
                      className="w-full glass-input resize-none"
                      placeholder="Suggested solution or actions taken locally..."
                    />
                  </div>
                </GlassPanel>

                <div className="flex justify-between">
                  <GlassButton 
                    type="button" 
                    variant="ghost"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </GlassButton>
                  <GlassButton 
                    type="submit" 
                    className="flex items-center gap-2 px-12 py-4 bg-brand-primary text-black hover:bg-brand-primary/90"
                  >
                    <Check className="w-5 h-5" />
                    {t.submit}
                  </GlassButton>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <GlassPanel className="p-8 text-center space-y-6">
                  <div className="mx-auto w-16 h-16 bg-green-500/15 border border-green-500/30 text-green-400 rounded-full flex items-center justify-center">
                    <Check className="w-8 h-8 animate-pulse" />
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white">
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
                        <span className="text-base font-mono text-brand-secondary font-bold select-all">{submittedIncidentId}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (submittedIncidentId) {
                            navigator.clipboard.writeText(submittedIncidentId);
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
                      <div className="bg-black/30 border border-white/10 rounded-2xl p-4 md:p-5 max-h-[380px] overflow-y-auto space-y-4 shadow-2xl custom-scrollbar" style={{ maxHeight: "380px" }}>
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
                              className="text-[10px] sm:text-xs font-semibold py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 border border-white/5 text-white/60 hover:text-white transition-all cursor-pointer"
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
                          className="px-5 bg-brand-primary text-black hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
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
                        // Reset form
                        setForm({
                          employeeName: user?.name || "",
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
                        setSubmittedIncidentId(null);
                        setStep(1);
                      }}
                      className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-xs cursor-pointer transition-all border border-white/10 font-sans"
                    >
                      {language === "ar" ? "إرسال بلاغ آخر" : "Submit Another Incident"}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/dashboard")}
                      className="px-6 py-3 bg-brand-secondary text-black hover:bg-brand-secondary/90 font-bold rounded-xl text-xs cursor-pointer transition-all font-sans"
                    >
                      {language === "ar" ? "الانتقال إلى لوحة المتابعة" : "View Dashboard Summary"}
                    </button>
                  </div>
                </GlassPanel>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </main>
    </div>
  );
}
