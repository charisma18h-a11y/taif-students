 'use client'
import {useEffect,useState} from 'react'
import {Crown,ShieldCheck} from 'lucide-react'
type Member={id:string;name:string;title:string;description:string;display_order:number}
export default function HomeBoard(){
 const [members,setMembers]=useState<Member[]>([])
 useEffect(()=>{let mounted=true;fetch('/api/board',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(d=>{if(mounted)setMembers(Array.isArray(d.board)?d.board:[])}).catch(()=>{});return()=>{mounted=false}},[])
 if(!members.length)return null
 return <section className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-emerald-950/20 to-background p-5 sm:p-7 space-y-4" aria-label="مجلس الإدارة">
 <div className="flex items-center gap-3"><Crown className="text-amber-400"/><div><h2 className="text-xl font-bold">مجلس الإدارة</h2><p className="text-sm text-muted-foreground">أعضاء مجلس إدارة المنصة</p></div></div>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{members.map(m=><article key={m.id} className="rounded-xl border border-amber-500/20 bg-background/50 p-4"><div className="flex items-center gap-2 text-amber-500 text-sm"><ShieldCheck className="size-4"/>{m.title}</div><h3 className="font-bold mt-2">{m.name}</h3>{m.description&&<p className="text-xs text-muted-foreground mt-2">{m.description}</p>}</article>)}</div></section>
}
