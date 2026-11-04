import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessData(null);
    try {
      const res = await api.post("/auth/forgot-password", { email });
      setSuccessData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to initiate password reset");
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
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Reset Password</h2>
          <p className="text-slate-500 text-sm mt-1">
            Enter your account email to receive instructions for recovering access.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successData ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs">
              <div className="flex items-center gap-2 font-bold text-sm mb-1">
                <CheckCircle2 size={16} /> Recovery Link Generated
              </div>
              <p>
                If an account matches <strong>{email}</strong>, instructions to reset your password have been issued.
              </p>
              {successData.resetToken && (
                <div className="mt-3 pt-3 border-t border-emerald-200">
                  <div className="text-[11px] text-emerald-700 font-semibold mb-1">Development / Testing Link:</div>
                  <Link
                    to={`/reset-password?email=${encodeURIComponent(email)}&token=${successData.resetToken}`}
                    className="inline-block px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700 transition"
                  >
                    Click to Reset Password Now &rarr;
                  </Link>
                </div>
              )}
            </div>
            <Link to="/login" className="btn-outline w-full text-center">
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Account Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="name@agency.com"
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn w-full">
              {loading ? "Sending..." : "Send Reset Instructions"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

