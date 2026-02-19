import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSlotUrl } from "@/hooks/useWebsiteImageSlots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowUpRight, Eye, EyeOff } from "lucide-react";
import Noise from "@/components/Noise";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const { signIn, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? "/admin";
  const loginBgUrl = useSlotUrl(
    "hero_admin_login",
    "https://images.pexels.com/photos/7683887/pexels-photo-7683887.jpeg?auto=compress&cs=tinysrgb&w=1920"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lockUntil && Date.now() < lockUntil) {
      const remainingMs = lockUntil - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
      setError(
        `Too many failed attempts. Please try again in ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}.`
      );
      return;
    }

    setError(null);
    const result = await signIn(email, password);
    if ("error" in result) {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);

      if (nextAttempts >= 3) {
        const tenMinutesFromNow = Date.now() + 10 * 60 * 1000;
        setLockUntil(tenMinutesFromNow);

        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            "admin-login-lock",
            JSON.stringify({ attempts: nextAttempts, lockUntil: tenMinutesFromNow })
          );
        }

        setError("Too many failed attempts. Please try again in 10 minutes.");
      } else {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            "admin-login-lock",
            JSON.stringify({ attempts: nextAttempts, lockUntil: null })
          );
        }
        setError(result.error ?? "Invalid email or password.");
      }
      return;
    }

    setFailedAttempts(0);
    setLockUntil(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("admin-login-lock");
    }

    navigate(from, { replace: true });
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-4 bg-cover bg-center"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.5) 100%), url('${loginBgUrl}')`,
      }}
    >
      <div className="absolute inset-0 z-[1] pointer-events-none">
        <Noise patternAlpha={12} />
      </div>
      <Card className="relative z-10 w-full max-w-md border-0 bg-white shadow-xl rounded-2xl mx-auto">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <img src="/favicon.png" alt="" className="h-14 w-14 md:h-16 md:w-16 object-contain" aria-hidden />
          </div>
          <CardTitle className="text-4xl md:text-5xl font-display font-black uppercase tracking-wide">
            Sign in
          </CardTitle>
          <CardDescription className="text-center">Sign in to Urban Hub website backend</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <Input
              id="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
              className="rounded-xl border-border/80 bg-white focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <div className="relative w-full">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loading}
                className="rounded-xl border-border/80 bg-white pr-10 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && (
              <p className="text-sm text-destructive text-center" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full rounded-xl" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
          <div className="mt-4 w-full">
            <Link
              to="/"
              className="flex w-full items-center justify-between rounded-xl bg-black px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-black/90"
            >
              <span>Back to website</span>
              <ArrowUpRight className="h-4 w-4 shrink-0" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
