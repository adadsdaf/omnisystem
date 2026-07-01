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
      <header className="h-16 bg-sidebar text-sidebar-foreground flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-sidebar-primary-foreground">إتقان سوفت</h1>
          <div className="w-px h-6 bg-sidebar-border mx-2"></div>
          <div className="flex items-center gap-2 text-sm text-sidebar-foreground/80">
            <Clock className="w-4 h-4" />
            <span dir="ltr">{time.toLocaleTimeString('ar-SA')}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user?.role === "admin" && (
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground">
                <LayoutDashboard className="w-4 h-4 ml-2" />
                لوحة القيادة
              </Button>
            </Link>
          )}
          
          <div className="flex items-center gap-3">
            <div className="text-left">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-sidebar-foreground/60">{user?.role === 'admin' ? 'مدير' : 'كاشير'}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold">
              {user?.name.charAt(0)}
            </div>
          </div>
          
          <div className="w-px h-6 bg-sidebar-border mx-2"></div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleLogout}
            className="text-sidebar-foreground hover:bg-destructive hover:text-destructive-foreground"
            title="تسجيل الخروج"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {children}
      </main>
    </div>
  );
}
