import React from "react";
import { FolderOpen } from "lucide-react";

export default function EmptyState({ icon: Icon = FolderOpen, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
      <div className="w-12 h-12 mb-4 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
        <Icon size={24} />
      </div>
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 max-w-sm">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

