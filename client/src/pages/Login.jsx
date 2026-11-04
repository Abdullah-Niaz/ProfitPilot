import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../services/api";
import { setCredentials } from "../app/store";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const dispatch = useDispatch();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      dispatch(setCredentials(data.data));
      nav("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-950">
      <div className="hidden lg:flex p-12 text-white flex-col justify-between bg-[radial-gradient(circle_at_top_left,#2563eb,transparent_35%),#020617]">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-xl">
              P
            </div>
            <div className="text-xl font-black">ProfitPilot</div>
          </div>
          <h1 className="text-5xl font-black leading-tight">
            Know which clients actually make money.
          </h1>
          <p className="mt-5 text-slate-300 text-lg">
            A polished financial CRM dashboard for modern agencies.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="card bg-white/10 border-white/10 p-4">
            <b className="text-xl">$36k</b>
            <p className="text-slate-300 text-sm">Revenue</p>
          </div>
          <div className="card bg-white/10 border-white/10 p-4">
            <b className="text-xl">42%</b>
            <p className="text-slate-300 text-sm">Margin</p>
          </div>
          <div className="card bg-white/10 border-white/10 p-4">
            <b className="text-xl">4</b>
            <p className="text-slate-300 text-sm">At risk</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="card w-full max-w-md p-8">
          <h2 className="text-3xl font-black">Welcome back</h2>
          <p className="text-slate-500 mt-2">
            Sign in to your agency workspace.
          </p>
          {error && <p className="mt-4 text-red-600 text-sm">{error}</p>}
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                aria-label="Email address"
                autoComplete="email"
                required
                placeholder="name@agency.com"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                <Link to="/forgot-password" className="text-xs font-semibold text-blue-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-label="Password"
                autoComplete="current-password"
                required
                placeholder="••••••••••••"
              />
            </div>
            <button className="btn w-full" disabled={busy}>
              {busy ? "Signing in..." : "Login"}
            </button>
          </div>
          <p className="mt-5 text-sm text-slate-500 text-center">
            No account?{" "}
            <Link className="text-blue-600 font-semibold" to="/register">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
