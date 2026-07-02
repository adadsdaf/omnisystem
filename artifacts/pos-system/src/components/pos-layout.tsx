import { useAuth } from "@/components/auth-provider";
import { useLogout } from "@workspace/api-client-react";
import { LogOut, Clock, LayoutDashboard } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

export function PosLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const logoutMutation = useLogout();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem("pos_token");
        window.location.href = "/login";
      }
    });
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden" dir="rtl">
      {/* Topbar */}
      <header className="h-14 bg-[#0f1e3c] text-white flex items-center justify-between px-4 shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <img src="/omnisystem-logo.png" alt="OmniSystem" className="h-10 w-10 rounded-full object-cover" />
          <div className="leading-tight">
            <div className="text-sm font-extrabold text-white tracking-wide">OmniSystem</div>
            <div className="text-[10px] text-blue-300 font-medium">by UniSoft</div>
          </div>
          <div className="w-px h-6 bg-white/20 mx-2" />
          <div className="flex items-center gap-1.5 text-sm text-white/70">
            <Clock className="w-3.5 h-3.5" />
            <span dir="ltr" className="tabular-nums font-mono text-xs">{time.toLocaleTimeString('ar-SA')}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user?.role === "admin" && (
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-white/80 hover:bg-white/10 hover:text-white text-xs h-8 px-3">
                <LayoutDashboard className="w-3.5 h-3.5 ml-1.5" />
                لوحة القيادة
              </Button>
            </Link>
          )}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              {user?.name.charAt(0)}
            </div>
            <div className="text-right leading-tight">
              <p className="text-xs font-semibold text-white">{user?.name}</p>
              <p className="text-[10px] text-white/50">{user?.role === 'admin' ? 'مدير' : 'كاشير'}</p>
            </div>
          </div>
          <div className="w-px h-5 bg-white/20" />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-white/70 hover:bg-red-600/30 hover:text-red-300 w-8 h-8"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {children}
      </main>
    </div>
  );
}
