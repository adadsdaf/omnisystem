import { createContext, useContext, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import type { User } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const token = localStorage.getItem("pos_token");

  const { data: user, isLoading, error } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
      queryKey: getGetMeQueryKey(),
    },
  });

  useEffect(() => {
    if (!token || error) {
      localStorage.removeItem("pos_token");
      setLocation("/login");
    }
  }, [token, error, setLocation]);

  const logout = () => {
    localStorage.removeItem("pos_token");
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading: !!token && isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    } else if (!isLoading && user && requireAdmin && user.role !== "admin") {
      setLocation("/pos");
    }
  }, [user, isLoading, requireAdmin, setLocation]);

  if (isLoading || !user || (requireAdmin && user.role !== "admin")) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
