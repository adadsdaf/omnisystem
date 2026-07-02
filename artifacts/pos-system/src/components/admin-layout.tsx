import { useAuth } from "@/components/auth-provider";
import { useLogout } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { LogOut, LayoutDashboard, Package, Tags, Receipt, Users, UserCircle, BarChart3, Settings, Printer, FileText, UserCheck, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const logoutMutation = useLogout();
  const [location] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem("pos_token");
        window.location.href = "/login";
      }
    });
  };

  const navItems = [
    { name: "لوحة القيادة", href: "/dashboard", icon: LayoutDashboard },
    { name: "نقطة البيع", href: "/pos", icon: Receipt },
    { name: "المنتجات", href: "/products", icon: Package },
    { name: "التصنيفات", href: "/categories", icon: Tags },
    { name: "الطلبات", href: "/orders", icon: Receipt },
    { name: "العملاء", href: "/customers", icon: Users },
    { name: "المستخدمين", href: "/users", icon: UserCircle },
    { name: "التقارير", href: "/reports", icon: BarChart3 },
    { name: "الموارد البشرية", href: "/hr", icon: UserCheck },
    { name: "المرتجعات", href: "/returns", icon: RotateCcw },
    { name: "سجل الطباعة", href: "/print-log", icon: FileText },
    { name: "الإعدادات", href: "/settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-l border-sidebar-border">
        <div className="h-16 flex items-center justify-center border-b border-sidebar-border px-4">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-sidebar-primary-foreground" />
            <h1 className="text-xl font-bold text-sidebar-primary-foreground">إتقان سوفت</h1>
          </div>
        </div>
        
        <div className="flex-1 py-4 overflow-y-auto">
          <nav className="space-y-1 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.startsWith(item.href);
              
              return (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer",
                    isActive 
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                      : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground"
                  )}>
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold">
              {user?.name.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{user?.role === 'admin' ? 'مدير' : 'كاشير'}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-muted/30">
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
