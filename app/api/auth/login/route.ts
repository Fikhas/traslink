import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { createSession, verifyPassword } from '@/lib/auth';

const input = z.object({ email:z.string().email(), password:z.string().min(8) });
export async function POST(request: Request) {
  try {
    const parsed=input.safeParse(await request.json()); if(!parsed.success) return NextResponse.json({error:'Email atau kata sandi tidak valid.'},{status:400});
    const [user]=await db().select().from(users).where(eq(users.email,parsed.data.email.toLowerCase())).limit(1);
    if(!user?.active || !(await verifyPassword(parsed.data.password,user.passwordHash))) return NextResponse.json({error:'Email atau kata sandi salah.'},{status:401});
    await createSession(user.id); return NextResponse.json({user:{id:user.id,name:user.name,email:user.email,role:user.role}});
  } catch (error) { return NextResponse.json({error:error instanceof Error?error.message:'Gagal masuk'},{status:500}); }
}

