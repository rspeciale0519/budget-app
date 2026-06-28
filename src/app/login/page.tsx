import { LoginForm } from "@/components/auth/login-form";
import { LoginHero } from "@/components/three/login-hero";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      <LoginHero />
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <div className="relative z-10 w-full max-w-sm space-y-6 rounded-card border border-line bg-card/80 p-8 shadow-pop backdrop-blur-xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-ink">Ledger</h1>
          <p className="mt-1 text-sm text-muted">Sign in to your workspace</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
