import { LoginForm } from "@/components/auth/LoginForm";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar flex items-center justify-center">
      <div className="w-full max-w-sm mx-auto px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Sign in</h1>
          <p className="text-sm text-slate-400">
            Access contributor tools and session history
          </p>
        </div>

        {/* Login form */}
        <LoginForm />

        {/* Back link */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            &larr; Back to Atlas
          </Link>
        </div>
      </div>
    </div>
  );
}
