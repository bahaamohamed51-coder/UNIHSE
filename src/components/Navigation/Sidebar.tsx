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
  Globe,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
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
    if (onClose) onClose();
  };

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  const menuContent = (
    <>
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-primary/20 rounded-xl flex items-center justify-center border border-brand-primary/30 shrink-0">
            <ShieldCheck className="w-6 h-6 text-brand-primary" />
          </div>
          <Logo size="md" />
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-2 bg-white/5 border border-white/10 text-white/60 hover:text-white rounded-xl transition-colors shrink-0"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.label}
            to={item.path}
            onClick={handleLinkClick}
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-white/70 hover:text-white"
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="pt-6 border-t border-white/10 space-y-4">
        <button 
          onClick={() => {
            setLanguage(language === "en" ? "ar" : "en");
            handleLinkClick();
          }}
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
    </>
  );

  return (
    <>
      {/* 1. Permanent Desktop Sidebar */}
      <div className={cn(
        "hidden lg:flex fixed top-0 h-screen w-64 bg-black/60 backdrop-blur-md border-white/10 flex-col p-6 z-50",
        isRTL ? "right-0 border-l" : "left-0 border-r"
      )}>
        {menuContent}
      </div>

      {/* 2. Responsive Slide-out Mobile Sidebar with AnimatePresence */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 lg:hidden"
            />
            {/* Drawer for mobile */}
            <motion.div
              initial={{ x: isRTL ? 260 : -260 }}
              animate={{ x: 0 }}
              exit={{ x: isRTL ? 260 : -260 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className={cn(
                "fixed top-0 bottom-0 w-64 bg-[#0a0a14] border-white/10 flex flex-col p-6 z-50 lg:hidden overflow-y-auto",
                isRTL ? "right-0 border-l" : "left-0 border-r"
              )}
            >
              {menuContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
