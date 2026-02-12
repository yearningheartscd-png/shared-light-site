"use client";

import { useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    if (!isSupabaseConfigured()) {
      setStatus("error");
      setErrorMsg("Authentication is not configured yet. Supabase environment variables are missing.");
      return;
    }

    setStatus("sending");
    setErrorMsg("");

    try {
      const { createClient } = await import("@/lib/supabase");
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        setStatus("error");
        setErrorMsg(error.message);
      } else {
        setStatus("sent");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  };

  if (status === "sent") {
    return (
      <div className="bg-slate-900/50 border border-emerald-500/30 rounded-xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Check your email</h3>
        <p className="text-sm text-slate-400">
          We sent a sign-in link to <span className="text-white font-mono">{email}</span>.
          Click it to continue.
        </p>
        <button
          onClick={() => { setStatus("idle"); setEmail(""); }}
          className="mt-4 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleMagicLink} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm text-slate-400 mb-1.5">
          Email address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 min-h-[44px]"
        />
      </div>

      {status === "error" && (
        <div className="bg-red-950/50 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-300">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "sending" || !email.trim()}
        className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-lg px-4 py-3 text-sm transition-colors min-h-[44px]"
      >
        {status === "sending" ? "Sending link..." : "Sign in with email"}
      </button>

      <p className="text-xs text-slate-600 text-center">
        No password needed. We&apos;ll send you a secure sign-in link.
      </p>
    </form>
  );
}
