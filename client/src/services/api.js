import axios from 'axios';
import {store,logout,setAccessToken} from '../app/store';
export const api=axios.create({baseURL:import.meta.env.VITE_API_URL || 'http://localhost:5000/api',withCredentials:true});
let refreshPromise=null;
const pendingFinancialWrites = new Map();
let financialEpoch = store.getState().auth.epoch;
function clearPendingWrite(config) {
  if (config?.financialFingerprint &&
      pendingFinancialWrites.get(config.financialFingerprint) === config.headers?.['Idempotency-Key']) {
    pendingFinancialWrites.delete(config.financialFingerprint);
  }
}
api.interceptors.request.use(config=>{
  const {accessToken,workspaceId,epoch}=store.getState().auth;
  config.sessionEpoch=epoch;
  if (financialEpoch !== epoch) {
    pendingFinancialWrites.clear();
    financialEpoch = epoch;
  }
  if (config.method?.toLowerCase() === 'post' &&
      /^\/(payments|invoices|revenue|expenses)(\/|$)/.test(config.url)) {
    const body = typeof config.data === 'string' ? config.data : JSON.stringify(config.data ?? {});
    const fingerprint = JSON.stringify([epoch, workspaceId, config.url, body]);
    config.financialFingerprint = fingerprint;
    if (!config.headers['Idempotency-Key']) {
      const key = pendingFinancialWrites.get(fingerprint) || globalThis.crypto.randomUUID();
      config.headers['Idempotency-Key'] = key;
      pendingFinancialWrites.set(fingerprint, key);
    }
  }
  if(accessToken) config.headers.Authorization=`Bearer ${accessToken}`;
  if(workspaceId) config.headers['x-workspace-id']=workspaceId;
  return config;
});
api.interceptors.response.use(response=>{
  if(response.config.sessionEpoch!==store.getState().auth.epoch) return Promise.reject(new Error('Account changed during request'));
  clearPendingWrite(response.config);
  return response;
},async error=>{
  const request=error.config;
  const status = error.response?.status;
  // Keep the same key after an uncertain network/server response or auth refresh.
  if (status >= 400 && status < 500 && ![401,408,409,429].includes(status)) clearPendingWrite(request);
  if(!request || error.response?.status!==401 || request.retried || request.url.startsWith('/auth/')) return Promise.reject(error);
  const epoch=store.getState().auth.epoch;
  if(request.sessionEpoch!==epoch) return Promise.reject(error);
  request.retried=true;
  try {
    if(!refreshPromise) refreshPromise=api.post('/auth/refresh-token').then(response=>{
      if(store.getState().auth.epoch!==epoch) throw new Error('Account changed');
      store.dispatch(setAccessToken(response.data.data.accessToken));
    }).finally(()=>{refreshPromise=null;});
    await refreshPromise;
    if(store.getState().auth.epoch!==epoch) throw new Error('Account changed');
    return api(request);
  } catch(refreshError) {
    if(store.getState().auth.epoch===epoch && [401,403].includes(refreshError.response?.status)) store.dispatch(logout());
    return Promise.reject(refreshError);
  }
});
