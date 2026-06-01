export default function PageHeader({ eyebrow, title, description, action }){
 return <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
  <div><p className="text-sm font-bold uppercase tracking-widest text-blue-600">{eyebrow}</p><h1 className="text-3xl md:text-4xl font-black tracking-tight">{title}</h1><p className="text-slate-500 mt-2 max-w-2xl">{description}</p></div>
  {action}
 </div>
}
