import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { transitRoutes } from '@/db/schema';
import { requireRole } from '@/lib/auth';
const point=z.object({lng:z.number(),lat:z.number()});
const routeInput=z.object({code:z.string().min(1).max(8),name:z.string().min(3),origin:z.string().min(2),destination:z.string().min(2),via:z.string().min(2),color:z.string().regex(/^#[0-9a-f]{6}$/i),pathA:z.array(point).min(2),pathB:z.array(point).min(2),fare:z.number().int().positive().optional()});
export async function GET(){ try{return NextResponse.json({routes:await db().select().from(transitRoutes).where(eq(transitRoutes.active,true))});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Gagal memuat trayek'},{status:500})} }
export async function POST(request:Request){ try{await requireRole(['ADMIN']);const parsed=routeInput.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:parsed.error.flatten()},{status:400});const [route]=await db().insert(transitRoutes).values(parsed.data).returning();return NextResponse.json({route},{status:201});}catch(error){if(error instanceof Response)return error;return NextResponse.json({error:'Gagal menambah trayek'},{status:500})} }

