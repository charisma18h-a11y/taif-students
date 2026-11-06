import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export async function GET() { return NextResponse.json({enabled: false, publicKey: ''},{headers:{'Cache-Control':'no-store'}}) }
export async function POST() { return NextResponse.json({error: 'تم إيقاف إشعارات الدفع في المنصة'}, {status: 410}) }
export async function DELETE() { return NextResponse.json({error: 'تم إيقاف إشعارات الدفع في المنصة'}, {status: 410}) }
