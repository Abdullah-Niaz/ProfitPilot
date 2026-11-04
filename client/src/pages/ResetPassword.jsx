import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import { Lock, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

export default function ResetPassword() {
  const [queryParams] = useSearchParams();
  const searchParams = window.location.hash ? new URLSearchParams(window.location.hash.slice(1)) : queryParams;
  const navigate = useNavigate();

  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [token, setToken] = useState(searchParams.get("token") || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (newPassword.length < 12) {
      setError("Password must be at least 12 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await api.post("/auth/reset-password", { email, token, newPassword });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-100">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
        <div className="mb-6">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-4">
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Set New Password</h2>
          <p className="text-slate-500 text-sm mt-1">
            Choose a strong password to secure your agency account.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-3">
              <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
              <div>
                <div className="font-bold text-sm">Password Reset Successful!</div>
                <p className="mt-0.5">Your password has been updated. Redirecting to login...</p>
              </div>
            </div>
            <Link to="/login" className="btn w-full text-center">
              Sign In Now
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Account Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reset Token</label>
              <input
                type="text"
                required
                value={token}
                onChange={e => setToken(e.target.value)}
                className="input font-mono text-xs"
                placeholder="Paste token from reset email"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Password (min 12 characters)</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={12}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••••••"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={12}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••••••"
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn w-full">
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

