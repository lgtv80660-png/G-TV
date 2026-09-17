"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { normalizeBaseUrl } from "@/lib/xtream/urls";
import { cn } from "@/lib/utils";

// ⚠️ DEVISSEZ VOTRE SERVEUR XTREAM ICI :
const HARDCODED_HOST = "https://gmztv.vercel.app";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const url = normalizeBaseUrl(HARDCODED_HOST);
      await api.login(url, username, password);
      router.replace("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connexion échouée");
      setBusy(false);
    }
  }

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-5 py-12">
      {/* backdrop synthétique */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/3 h-[60vh] w-[60vh] -translate-x-1/2 rounded-full bg-iris-400/12 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[40vh] w-[40vh] rounded-full bg-indigo-500/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="G-Player" className="mb-4 h-16 w-16 rounded-2xl shadow-xl glow-iris" />
          <h1 className="text-3xl font-bold tracking-tight">G-Player</h1>
          <p className="mt-1.5 text-sm text-fog-400">
            Connectez-vous avec vos identifiants Xtream.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 rounded-3xl glass p-6">
          <Field label="Nom d'utilisateur" placeholder="username" value={username} onChange={setUsername} autoFocus />
          <Field label="Mot de passe" placeholder="••••••••" type="password" value={password} onChange={setPassword} />

          {error && (
            <p className="rounded-xl bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-iris-300 to-iris-500 py-3 font-semibold text-ink-950 transition-all hover:brightness-110 disabled:opacity-60",
            )}
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Se connecter <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-fog-500">
          Les identifiants sont stockés en sécurité uniquement sur cet appareil.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-fog-400">{label}</span>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/8 bg-ink-900/80 px-3.5 py-2.5 text-sm text-foreground placeholder:text-fog-600 transition-colors focus:border-iris-400/60 focus:outline-none"
      />
    </label>
  );
}
