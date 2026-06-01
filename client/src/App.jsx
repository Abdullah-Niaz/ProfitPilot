import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import DashboardLayout from "./components/layout/DashboardLayout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Clients from "./pages/Clients.jsx";
import Projects from "./pages/Projects.jsx";
import Revenue from "./pages/Revenue.jsx";
import Expenses from "./pages/Expenses.jsx";
import Analytics from "./pages/Analytics.jsx";
import AIAdvisor from "./pages/AIAdvisor.jsx";

const Private = ({ children }) =>
  localStorage.getItem("accessToken") ? (
    children
  ) : (
    <Navigate to="/login" replace />
  );
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
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
        <Route path="revenue" element={<Revenue />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="ai-advisor" element={<AIAdvisor />} />
      </Route>
    </Routes>
  );
}
