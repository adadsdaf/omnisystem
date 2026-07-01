import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, ProtectedRoute } from "@/components/auth-provider";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Pos from "@/pages/pos";
import Dashboard from "@/pages/dashboard";
import Products from "@/pages/products";
import Categories from "@/pages/categories";
import Orders from "@/pages/orders";
import Customers from "@/pages/customers";
import Users from "@/pages/users";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import PrintLog from "@/pages/print-log";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/pos">
        <ProtectedRoute><Pos /></ProtectedRoute>
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute requireAdmin><Dashboard /></ProtectedRoute>
      </Route>
      <Route path="/products">
        <ProtectedRoute requireAdmin><Products /></ProtectedRoute>
      </Route>
      <Route path="/categories">
        <ProtectedRoute requireAdmin><Categories /></ProtectedRoute>
      </Route>
      <Route path="/orders">
        <ProtectedRoute requireAdmin><Orders /></ProtectedRoute>
      </Route>
      <Route path="/customers">
        <ProtectedRoute requireAdmin><Customers /></ProtectedRoute>
      </Route>
      <Route path="/users">
        <ProtectedRoute requireAdmin><Users /></ProtectedRoute>
      </Route>
      <Route path="/reports">
        <ProtectedRoute requireAdmin><Reports /></ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute requireAdmin><Settings /></ProtectedRoute>
      </Route>
      <Route path="/print-log">
        <ProtectedRoute requireAdmin><PrintLog /></ProtectedRoute>
      </Route>
      <Route path="/">
        <ProtectedRoute><Pos /></ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
