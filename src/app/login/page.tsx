import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Ledger</h1>
          <p className="text-sm text-slate-500">Sign in to your workspace</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
