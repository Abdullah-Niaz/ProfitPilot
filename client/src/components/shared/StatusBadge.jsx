import React from "react";

const STYLES = {
  // Common active / paid / positive
  Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Posted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Profitable: "bg-emerald-50 text-emerald-700 border-emerald-200",

  // Progress / draft / info
  Sent: "bg-blue-50 text-blue-700 border-blue-200",
  "Partially Paid": "bg-indigo-50 text-indigo-700 border-indigo-200",
  Planning: "bg-sky-50 text-sky-700 border-sky-200",
  Draft: "bg-slate-100 text-slate-700 border-slate-200",
  "On Hold": "bg-amber-50 text-amber-700 border-amber-200",
  "Low Margin": "bg-amber-50 text-amber-700 border-amber-200",
  Pending: "bg-amber-50 text-amber-700 border-amber-200",

  // Danger / alerts
  Overdue: "bg-rose-50 text-rose-700 border-rose-200",
  "At Risk": "bg-rose-50 text-rose-700 border-rose-200",
  "Loss Making": "bg-rose-50 text-rose-700 border-rose-200",
  Cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  Void: "bg-slate-200 text-slate-600 border-slate-300",
  Reversed: "bg-rose-100 text-rose-800 border-rose-300",
  Archived: "bg-slate-100 text-slate-500 border-slate-200"
};

export default function StatusBadge({ status }) {
  if (!status) return null;
  const style = STYLES[status] || "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style}`}>
      {status}
    </span>
  );
}

