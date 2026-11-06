import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Bus,
  MapPin,
  Zap,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [
      { title: "Sign In / Sign Up — payana.ai" },
      {
        name: "description",
        content:
          "Sign in or create your payana.ai account — AI-powered Bengaluru transit companion.",
      },
    ],
  }),
  component: AuthPage,
});

/* ── floating decorations ────────────────────────────── */
const floatingBuses: { top: string; left?: string; right?: string; delay: number }[] = [
  { top: "12%", left: "7%", delay: 0 },
  { top: "72%", left: "5%", delay: 1.3 },
  { top: "24%", right: "6%", delay: 0.7 },
  { top: "82%", right: "9%", delay: 1.9 },
];

/* ── input field component ────────────────────────────── */
function InputField({
  id,
  label,
  type = "text",
  placeholder,
  icon: Icon,
  value,
  onChange,
  extra,
  autoComplete,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder: string;
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  extra?: React.ReactNode;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  const isPw = type === "password";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
        {extra}
      </div>
      <div className="relative flex items-center">
        <Icon size={16} className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
        <input
          id={id}
          type={isPw ? (show ? "text" : "password") : type}
          placeholder={placeholder}
          {...({ autoComplete: autoComplete || "off" } as any)}
          className={`w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 rounded-xl py-2.5 pl-10 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo/30 focus:border-indigo transition-all ${
            isPw ? "pr-10" : "pr-3.5"
          }`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {isPw && (
          <button
            type="button"
            className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 transition-colors cursor-pointer"
            onClick={() => setShow(!show)}
            tabIndex={-1}
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── main page component ──────────────────────────────── */
function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  /* sign-in state */
  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");

  /* sign-up state */
  const [suName, setSuName] = useState("");
  const [suPhone, setSuPhone] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suConfirm, setSuConfirm] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ── handlers ─────────────────── */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!siEmail || !siPassword) {
      setError("Please fill in all fields.");
      return;
    }
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    localStorage.setItem("payana_auth", "true");
    setIsLoading(false);
    navigate({ to: "/" });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!suName || !suEmail || !suPassword || !suConfirm) {
      setError("Please fill in all required fields.");
      return;
    }
    if (suPassword !== suConfirm) {
      setError("Passwords do not match.");
      return;
    }
    if (suPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1100));
    localStorage.setItem("payana_auth", "true");
    setIsLoading(false);
    setSuccess("Account created! Redirecting to dashboard…");
    await new Promise((r) => setTimeout(r, 800));
    navigate({ to: "/" });
  };

  const switchTab = (t: "signin" | "signup") => {
    setTab(t);
    setError("");
    setSuccess("");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-slate-50/70 dark:bg-slate-950 px-4 py-12 transition-colors">
      {/* Ambient background glow elements matching Payana design system */}
      <div className="absolute top-[-10%] left-[-10%] w-[520px] h-[520px] bg-[#4F46E5]/10 dark:bg-[#4F46E5]/20 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[520px] h-[520px] bg-[#7C3AED]/10 dark:bg-[#7C3AED]/15 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute top-[35%] right-[10%] w-[350px] h-[350px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Floating subtle transit buses */}
      {floatingBuses.map((b, i) => (
        <motion.div
          key={i}
          className="absolute text-indigo/15 dark:text-indigo/25 pointer-events-none"
          style={{
            top: b.top,
            left: b.left,
            right: b.right,
          }}
          animate={{ y: [0, -18, 0], opacity: [0.15, 0.3, 0.15] }}
          transition={{
            duration: 5 + i * 0.8,
            delay: b.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Bus size={28} />
        </motion.div>
      ))}

      {/* Back to Home Link */}
      <div className="relative z-10 w-full max-w-[430px] mb-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo dark:hover:text-indigo transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Main Glass Card */}
      <motion.div
        className="relative z-10 w-full max-w-[430px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-2xl dark:shadow-black/50"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <Link to="/" className="group flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#4F46E5] to-[#7C3AED] flex items-center justify-center shadow-lg shadow-indigo/25 group-hover:scale-105 transition-transform duration-300">
              <MapPin size={24} className="text-white fill-white/20" />
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="font-heading text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                payana<span className="text-indigo">.</span>ai
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </Link>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            Intelligent Transit Decisions for Bengaluru
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 relative mb-6">
          {(["signin", "signup"] as const).map((t) => {
            const isSelected = tab === t;
            return (
              <button
                key={t}
                role="tab"
                id={`tab-${t}`}
                aria-selected={isSelected}
                onClick={() => switchTab(t)}
                className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer relative z-10 ${
                  isSelected
                    ? "text-white"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {t === "signin" ? "Sign In" : "Sign Up"}
              </button>
            );
          })}
          <motion.div
            className="absolute top-1 bottom-1 bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] rounded-xl shadow-md shadow-indigo/25 pointer-events-none"
            animate={{
              left: tab === "signin" ? "4px" : "calc(50% + 2px)",
              width: "calc(50% - 6px)",
            }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
          />
        </div>

        {/* Auth Forms */}
        <AnimatePresence mode="wait">
          {tab === "signin" ? (
            <motion.form
              key="signin"
              id="signin-form"
              onSubmit={handleSignIn}
              className="space-y-4"
              noValidate
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
            >
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Welcome back 👋
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Sign in to access your routes, passes, and transit perks
                </p>
              </div>

              <InputField
                id="si-email"
                label="Email address"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                icon={Mail}
                value={siEmail}
                onChange={setSiEmail}
              />

              <InputField
                id="si-password"
                label="Password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                icon={Lock}
                value={siPassword}
                onChange={setSiPassword}
                extra={
                  <a
                    href="#"
                    className="text-xs font-semibold text-indigo hover:text-indigo/80 transition-colors"
                  >
                    Forgot password?
                  </a>
                }
              />

              {error && <ErrorMsg msg={error} />}
              {success && <SuccessMsg msg={success} />}

              <SubmitBtn loading={isLoading} label="Sign In" />

              <SocialRow />

              <p className="text-center text-xs text-slate-500 dark:text-slate-400 pt-1">
                Don't have an account?{" "}
                <button
                  type="button"
                  className="font-bold text-indigo hover:underline cursor-pointer"
                  onClick={() => switchTab("signup")}
                >
                  Create one free
                </button>
              </p>
            </motion.form>
          ) : (
            <motion.form
              key="signup"
              id="signup-form"
              onSubmit={handleSignUp}
              className="space-y-3.5"
              noValidate
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Create account 🚌
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Join thousands commuting smarter across Bengaluru
                </p>
              </div>

              <InputField
                id="su-name"
                label="Full name"
                autoComplete="name"
                placeholder="Rahul Kumar"
                icon={User}
                value={suName}
                onChange={setSuName}
              />

              <InputField
                id="su-phone"
                label="Phone number (optional)"
                type="tel"
                autoComplete="tel"
                placeholder="+91 98765 43210"
                icon={Phone}
                value={suPhone}
                onChange={setSuPhone}
              />

              <InputField
                id="su-email"
                label="Email address"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                icon={Mail}
                value={suEmail}
                onChange={setSuEmail}
              />

              <InputField
                id="su-password"
                label="Password"
                type="password"
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                icon={Lock}
                value={suPassword}
                onChange={setSuPassword}
              />

              <InputField
                id="su-confirm"
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat password"
                icon={Lock}
                value={suConfirm}
                onChange={setSuConfirm}
              />

              {/* Password strength */}
              {suPassword.length > 0 && <PasswordStrength password={suPassword} />}

              {error && <ErrorMsg msg={error} />}
              {success && <SuccessMsg msg={success} />}

              <SubmitBtn loading={isLoading} label="Create Account" />

              <SocialRow signUp />

              <p className="text-center text-xs text-slate-500 dark:text-slate-400 pt-1">
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-bold text-indigo hover:underline cursor-pointer"
                  onClick={() => switchTab("signin")}
                >
                  Sign in
                </button>
              </p>

              <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
                By signing up you agree to our{" "}
                <a href="#" className="underline hover:text-slate-600 dark:hover:text-slate-300">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="underline hover:text-slate-600 dark:hover:text-slate-300">
                  Privacy Policy
                </a>
                .
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Bottom status badge */}
      <motion.div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400 shadow-sm whitespace-nowrap"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>Live transit data active · Bengaluru</span>
      </motion.div>
    </div>
  );
}

/* ── sub-components ──────────────────────────────────── */
function ErrorMsg({ msg }: { msg: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl p-3 flex items-center gap-2"
    >
      <AlertCircle size={15} className="shrink-0" />
      <span>{msg}</span>
    </motion.div>
  );
}

function SuccessMsg({ msg }: { msg: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl p-3 flex items-center gap-2"
    >
      <CheckCircle2 size={15} className="shrink-0" />
      <span>{msg}</span>
    </motion.div>
  );
}

function SubmitBtn({ loading, label }: { loading: boolean; label: string }) {
  return (
    <motion.button
      id={`auth-submit-${label.replace(/\s+/g, "-").toLowerCase()}`}
      type="submit"
      disabled={loading}
      whileTap={{ scale: 0.98 }}
      className="w-full py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9] shadow-md shadow-indigo/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <>
          <span>{label}</span>
          <ArrowRight size={16} />
        </>
      )}
    </motion.button>
  );
}

function SocialRow({ signUp }: { signUp?: boolean }) {
  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          or {signUp ? "sign up" : "continue"} with
        </span>
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          id={`social-google-${signUp ? "signup" : "signin"}`}
          type="button"
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
        >
          <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
            <path
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
              fill="#4285F4"
            />
            <path
              d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
              fill="#34A853"
            />
            <path
              d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"
              fill="#FBBC05"
            />
            <path
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z"
              fill="#EA4335"
            />
          </svg>
          <span>Google</span>
        </button>

        <button
          id={`social-otp-${signUp ? "signup" : "signin"}`}
          type="button"
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
        >
          <Zap size={14} className="text-amber-500 fill-amber-500/20" />
          <span>OTP Login</span>
        </button>
      </div>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const score =
    (password.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 1 : 0);

  const level = score <= 1 ? "weak" : score <= 3 ? "medium" : "strong";
  const label = { weak: "Weak", medium: "Good", strong: "Strong" };
  const labelColors = {
    weak: "text-rose-500 dark:text-rose-400",
    medium: "text-amber-500 dark:text-amber-400",
    strong: "text-emerald-500 dark:text-emerald-400",
  };
  const barColors = {
    weak: "bg-rose-500",
    medium: "bg-amber-400",
    strong: "bg-emerald-500",
  };

  return (
    <div className="space-y-1.5 pt-0.5">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={`flex-1 h-1 rounded-full transition-colors ${
              score >= n ? barColors[level] : "bg-slate-200 dark:bg-slate-700/60"
            }`}
          />
        ))}
      </div>
      <p className={`text-[11px] font-mono font-medium ${labelColors[level]}`}>
        {label[level]} password
      </p>
    </div>
  );
}
