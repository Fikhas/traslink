import { NextResponse } from 'next/server'; import { sql } from 'drizzle-orm'; import { db } from '@/lib/db';
export async function GET(){try{await db().execute(sql`select 1`);return NextResponse.json({status:'ok',database:'connected',time:new Date().toISOString()});}catch(error){return NextResponse.json({status:'error',database:'disconnected',error:error instanceof Error?error.message:'unknown'},{status:503})}}

