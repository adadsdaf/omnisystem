import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { data: { username, password } },
      {
        onSuccess: (data) => {
          localStorage.setItem("pos_token", data.token);
          if (data.user.role === "admin") {
            setLocation("/dashboard");
          } else {
            setLocation("/pos");
          }
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "خطأ في تسجيل الدخول",
            description: "تأكد من اسم المستخدم وكلمة المرور.",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0f1e3c] p-4">
      <Card className="w-full max-w-sm shadow-2xl border-0">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-24 h-24 rounded-full overflow-hidden shadow-lg ring-4 ring-blue-500/30">
            <img src="/omnisystem-logo.png" alt="OmniSystem" className="w-full h-full object-cover" />
          </div>
          <div>
            <CardTitle className="text-2xl font-extrabold text-[#0f1e3c] tracking-wide">OmniSystem</CardTitle>
            <CardDescription className="text-sm font-medium text-blue-600">نظام نقطة المبيعات — by UniSoft</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">اسم المستخدم</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loginMutation.isPending}
                dir="ltr"
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loginMutation.isPending}
                dir="ltr"
                className="text-right"
              />
            </div>
            <Button type="submit" className="w-full bg-[#0f1e3c] hover:bg-blue-900" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "تسجيل الدخول"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
