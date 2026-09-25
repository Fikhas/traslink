import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { transitRoutes } from '@/db/schema';
import { requireRole } from '@/lib/auth';
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{await requireRole(['ADMIN']);const {id}=await params;const body=await request.json();const allowed=Object.fromEntries(Object.entries(body).filter(([k])=>['name','origin','destination','via','color','pathA','pathB','fare','active'].includes(k)));const [route]=await db().update(transitRoutes).set({...allowed,updatedAt:new Date()}).where(eq(transitRoutes.id,id)).returning();return NextResponse.json({route});}catch(error){if(error instanceof Response)return error;return NextResponse.json({error:'Gagal memperbarui trayek'},{status:500})}}
export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){try{await requireRole(['ADMIN']);const {id}=await params;await db().update(transitRoutes).set({active:false,updatedAt:new Date()}).where(eq(transitRoutes.id,id));return NextResponse.json({ok:true});}catch(error){if(error instanceof Response)return error;return NextResponse.json({error:'Gagal menghapus trayek'},{status:500})}}

