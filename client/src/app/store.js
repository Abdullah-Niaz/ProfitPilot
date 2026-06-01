import { configureStore, createSlice } from "@reduxjs/toolkit";
const initialState = { accessToken: localStorage.getItem("accessToken"), user: JSON.parse(localStorage.getItem("user") || "null"), workspaceId: localStorage.getItem("workspaceId") };
const authSlice = createSlice({ name: "auth", initialState, reducers: { setCredentials: (state, action) => { Object.assign(state, action.payload); localStorage.setItem("accessToken", action.payload.accessToken); localStorage.setItem("workspaceId", action.payload.workspaceId); localStorage.setItem("user", JSON.stringify(action.payload.user)); }, logout: (state) => { state.accessToken=null; state.user=null; state.workspaceId=null; localStorage.clear(); } } });
export const { setCredentials, logout } = authSlice.actions;
export const store = configureStore({ reducer: { auth: authSlice.reducer } });
