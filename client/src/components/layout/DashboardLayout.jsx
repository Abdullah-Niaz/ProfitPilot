import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../../app/store";
import { api } from "../../services/api";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  BarChart3,
  Brain,
  Briefcase,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  UserPlus,
  Users,
  X
} from "lucide-react";

const navigationItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/revenue", label: "Revenue", icon: Briefcase },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/analytics", label: "Reports & Analytics", icon: BarChart3 },
  { to: "/ai-advisor", label: "AI Advisor", icon: Brain },
  { to: "/team", label: "Team & Settings", icon: UserPlus },
];

export default function DashboardLayout() {
  const nav = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const user = useSelector((state) => state.auth.user);
  const role = useSelector((state) => state.auth.role);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError("");
    try {
      await api.post("/auth/logout");
      dispatch(logout());
      nav("/login");
    } catch {
      setLogoutError("Could not sign out. Please retry.");
    } finally {
      setLoggingOut(false);
    }
  }

  const userInitial = user?.name ? user.name[0].toUpperCase() : "U";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-slate-950 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-base">
            P
          </div>
          <div>
            <div className="text-base font-black tracking-tight leading-none">ProfitPilot</div>
            <div className="text-[10px] text-slate-400 font-medium">Financial CRM</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Mobile Slide-out Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-30 pt-16 bg-slate-950/95 backdrop-blur-md flex flex-col p-6 overflow-y-auto">
          <div className="flex items-center gap-3 pb-6 border-b border-slate-800 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white text-base">
              {userInitial}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-bold text-white truncate">{user?.name || "Team Member"}</div>
              <div className="text-xs text-slate-400 truncate">{user?.email}</div>
              <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded-full border border-blue-800">
                {role || "Member"}
              </span>
            </div>
          </div>

          <nav className="space-y-1 flex-1">
            {navigationItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20"
                      : "text-slate-300 hover:bg-slate-900 hover:text-white"
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="pt-6 border-t border-slate-800 mt-6">
            <button
              disabled={loggingOut}
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold text-rose-300 bg-rose-950/40 border border-rose-900/60 hover:bg-rose-900/50 transition"
            >
              <LogOut size={16} />
              {loggingOut ? "Signing out..." : "Log Out"}
            </button>
            {logoutError && <p className="mt-2 text-xs text-rose-400 text-center" role="alert">{logoutError}</p>}
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 bg-slate-950 text-white p-6 flex-col justify-between shrink-0 min-h-screen sticky top-0 border-r border-slate-900 shadow-xl">
        <div>
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-xl shadow-md shadow-blue-600/30">
              P
            </div>
            <div>
              <div className="text-xl font-black tracking-tight leading-tight">ProfitPilot</div>
              <p className="text-slate-400 text-xs">Financial CRM for Agencies</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {navigationItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20"
                      : "text-slate-300 hover:bg-slate-900 hover:text-white"
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* User Profile & Logout */}
        <div className="pt-6 border-t border-slate-900">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400 text-sm">
              {userInitial}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-semibold text-white truncate">{user?.name || "User"}</div>
              <div className="text-[11px] text-slate-400 font-medium capitalize">{role || "Member"}</div>
            </div>
          </div>

          <button
            disabled={loggingOut}
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition"
          >
            <LogOut size={14} />
            {loggingOut ? "Signing out..." : "Log Out"}
          </button>
          {logoutError && <p className="mt-2 text-xs text-rose-400 text-center" role="alert">{logoutError}</p>}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-5 md:p-8 lg:p-10 max-w-7xl mx-auto w-full overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
