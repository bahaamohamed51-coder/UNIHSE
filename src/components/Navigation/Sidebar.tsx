import { useNavigate, Link } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { translations } from "../../i18n/translations";
import { cn } from "../../lib/utils";
import { Logo } from "../UI/Logo";
import { 
  LayoutDashboard, 
  FileText, 
  BarChart3, 
  Settings, 
  LogOut, 
  ShieldCheck,
  Globe
} from "lucide-react";

export const Sidebar = () => {
  const { language, setLanguage, user, setUser, isRTL } = useStore();
  const t = translations[language];
  const navigate = useNavigate();

  const menuItems = [
    { icon: LayoutDashboard, label: t.dashboard, path: "/dashboard?tab=overview" },
    { icon: FileText, label: t.incidents, path: "/dashboard?tab=incidents" },
    { icon: Settings, label: t.settings, path: "/dashboard?tab=settings" },
  ];

  const handleLogout = () => {
    setUser(null);
    navigate("/login");
  };

  return (
    <div className={cn(
      "fixed top-0 h-screen w-64 bg-black/40 backdrop-blur-2xl border-white/10 flex flex-col p-6 z-50",
      isRTL ? "right-0 border-l" : "left-0 border-r"
    )}>
      <div className="flex items-center gap-3 mb-12">
        <div className="w-10 h-10 bg-brand-primary/20 rounded-xl flex items-center justify-center border border-brand-primary/30 shrink-0">
          <ShieldCheck className="w-6 h-6 text-brand-primary" />
        </div>
        <Logo size="md" />
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.label}
            to={item.path}
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-white/70 hover:text-white"
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="pt-6 border-t border-white/10 space-y-4">
        <button 
          onClick={() => setLanguage(language === "en" ? "ar" : "en")}
          className="flex items-center gap-3 px-4 py-2 w-full text-white/50 hover:text-white transition-colors"
        >
          <Globe className="w-5 h-5" />
          <span>{language === "en" ? "العربية" : "English"}</span>
        </button>

        <div className="px-4 py-3 bg-white/5 rounded-xl">
          <p className="text-xs text-white/40 uppercase mb-1">{t.role}</p>
          <p className="text-sm font-medium">{t[user?.role || "employee"]}</p>
        </div>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl hover:bg-red-500/10 text-red-500 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">{t.logout}</span>
        </button>
      </div>
    </div>
  );
};
