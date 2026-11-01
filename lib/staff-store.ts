import {db} from '@/lib/db'
let ready:Promise<void>|undefined
export function initStaff(){
 if(!ready)ready=db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS public.portal_staff_permissions (
  student_id TEXT PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  can_publish BOOLEAN NOT NULL DEFAULT FALSE,
  can_review_students BOOLEAN NOT NULL DEFAULT FALSE
 )`).then(()=>{}).catch(e=>{ready=undefined;throw e})
 return ready
}
export async function staffPermissions(id:string){
 await initStaff()
 const rows=await db.$queryRaw<{can_publish:boolean;can_review_students:boolean}[]>`SELECT can_publish,can_review_students FROM public.portal_staff_permissions WHERE student_id=${id}`
 return rows[0]||{can_publish:false,can_review_students:false}
}
