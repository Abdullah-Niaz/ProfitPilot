import { configureStore, createSlice } from '@reduxjs/toolkit';
import { queryClient } from './queryClient';
let cachedUser=null;
try { cachedUser=JSON.parse(localStorage.getItem('user') || 'null'); } catch { localStorage.removeItem('user'); }
const initialState={accessToken:localStorage.getItem('accessToken'),user:cachedUser,workspaceId:localStorage.getItem('workspaceId'),epoch:0,role:localStorage.getItem('role')};
const authSlice=createSlice({name:'auth',initialState,reducers:{
  credentials:(state,{payload})=>{
    state.role=payload.role; localStorage.setItem('role',payload.role || '');
    state.epoch++; state.accessToken=payload.accessToken; state.user=payload.user;
    state.workspaceId=payload.workspaceId || payload.workspace?._id;
    localStorage.setItem('accessToken',state.accessToken);
    localStorage.setItem('workspaceId',state.workspaceId);
    localStorage.setItem('user',JSON.stringify(state.user));
  },
  accessToken:(state,{payload})=>{state.accessToken=payload;localStorage.setItem('accessToken',payload);},
  cleared:state=>{
    state.epoch++;state.accessToken=null;state.user=null;state.workspaceId=null;state.role=null;
    for(const key of ['accessToken','workspaceId','user','refreshToken','role']) localStorage.removeItem(key);
  },
}});
export const setCredentials=payload=>dispatch=>{queryClient.clear();dispatch(authSlice.actions.credentials(payload));};
export const logout=()=>dispatch=>{queryClient.clear();dispatch(authSlice.actions.cleared());};
export const setAccessToken=authSlice.actions.accessToken;
export const store=configureStore({reducer:{auth:authSlice.reducer}});
