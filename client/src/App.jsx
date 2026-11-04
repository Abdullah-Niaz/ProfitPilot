import AccountAction from './pages/AccountAction.jsx';
import React from "react";
import { useSelector } from "react-redux";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import DashboardLayout from "./components/layout/DashboardLayout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Clients from "./pages/Clients.jsx";
import Projects from "./pages/Projects.jsx";
import Invoices from "./pages/Invoices.jsx";
import Revenue from "./pages/Revenue.jsx";
import Expenses from "./pages/Expenses.jsx";
import Analytics from "./pages/Analytics.jsx";
import AIAdvisor from "./pages/AIAdvisor.jsx";
import Team from "./pages/Team.jsx";

const Private = ({ children }) => {
  const token = useSelector((state) => state.auth.accessToken);
  return token ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <Routes>
      <Route path="/accept-invitation" element={<AccountAction kind="invite" />} />
      <Route path="/verify-email" element={<AccountAction kind="verify" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/"
        element={
          <Private>
            <DashboardLayout />
          </Private>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="clients" element={<Clients />} />
        <Route path="projects" element={<Projects />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="revenue" element={<Revenue />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="ai-advisor" element={<AIAdvisor />} />
        <Route path="team" element={<Team />} />
      </Route>
    </Routes>
  );
}
