import axios from "axios";
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api" });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  const workspaceId = localStorage.getItem("workspaceId");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (workspaceId) config.headers["x-workspace-id"] = workspaceId;
  return config;
});
