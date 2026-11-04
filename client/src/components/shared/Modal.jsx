import React,{useEffect,useId,useRef} from 'react';
import {X} from 'lucide-react';
export default function Modal({isOpen,onClose,title,subtitle,children,maxWidth='max-w-lg'}){
  const dialog=useRef(null),close=useRef(onClose),titleId=useId();
  close.current=onClose;
  useEffect(()=>{
    if(!isOpen)return;
    const previous=document.activeElement;
    const element=dialog.current;
    const overflow=document.body.style.overflow;
    element.showModal();
    document.body.style.overflow='hidden';
    return ()=>{element.close();document.body.style.overflow=overflow;previous?.focus?.();};
  },[isOpen]);
  return <dialog ref={dialog} aria-labelledby={titleId} onCancel={e=>{e.preventDefault();close.current();}}
    onClick={e=>{if(e.target===e.currentTarget)close.current();}}
    className={'w-[calc(100%-2rem)] '+maxWidth+' p-0 rounded-2xl border border-slate-200 shadow-2xl backdrop:bg-slate-900/60'}>
    <div className="bg-white" onClick={e=>e.stopPropagation()}>
      <header className="px-6 py-5 border-b flex items-start justify-between gap-4">
        <div><h2 id={titleId} className="text-lg font-bold text-slate-900">{title}</h2>{subtitle&&<p className="text-sm text-slate-500 mt-1">{subtitle}</p>}</div>
        <button type="button" aria-label="Close dialog" onClick={()=>close.current()} className="p-2 rounded-lg hover:bg-slate-100"><X size={18}/></button>
      </header>
      <div className="p-6 max-h-[75vh] overflow-y-auto">{isOpen&&children}</div>
    </div>
  </dialog>;
}
