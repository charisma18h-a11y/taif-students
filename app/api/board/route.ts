import { NextResponse } from 'next/server'
import { initialize, readBoard, boardPublic } from '@/lib/university-group-store'
export const dynamic = 'force-dynamic'
export async function GET() {
  try { await initialize(); return NextResponse.json({board:boardPublic(await readBoard())},{headers:{'Cache-Control':'no-store'}}) }
  catch (e) {console.error('board get',e);return NextResponse.json({error:'تعذر تحميل مجلس الإدارة'},{status:503})}
}
