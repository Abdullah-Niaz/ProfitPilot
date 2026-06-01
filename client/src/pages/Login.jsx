import React from "react";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../services/api";
import { setCredentials } from "../app/store";
export default function Login() {
  const [email, setEmail] = useState("owner@agencycrm.com"),
    [password, setPassword] = useState("Password123!"),
    [error, setError] = useState("");
  const dispatch = useDispatch(),
    nav = useNavigate();
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      dispatch(setCredentials(data.data));
      nav("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-950">
      <div className="hidden lg:flex p-12 text-white flex-col justify-between bg-[radial-gradient(circle_at_top_left,#2563eb,transparent_35%),#020617]">
        <div>
          <h1 className="text-5xl font-black leading-tight">
            Know which clients actually make money.
          </h1>
          <p className="mt-5 text-slate-300 text-lg">
            A polished financial CRM dashboard for modern agencies.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="card bg-white/10 border-white/10 p-4">
            <b>$36k</b>
            <p className="text-slate-300 text-sm">Revenue</p>
          </div>
          <div className="card bg-white/10 border-white/10 p-4">
            <b>42%</b>
            <p className="text-slate-300 text-sm">Margin</p>
          </div>
          <div className="card bg-white/10 border-white/10 p-4">
            <b>4</b>
            <p className="text-slate-300 text-sm">At risk</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="card w-full max-w-md p-8">
          <h2 className="text-3xl font-black">Welcome back</h2>
          <p className="text-slate-500 mt-2">
            Demo credentials are pre-filled.
          </p>
          {error && <p className="mt-4 text-red-600 text-sm">{error}</p>}
          <div className="mt-6 space-y-4">
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
            />
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
            <button className="btn w-full">Login</button>
          </div>
          <p className="mt-5 text-sm text-slate-500">
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
