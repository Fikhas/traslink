import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { requireRole } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    await requireRole(['ADMIN']);
    const role = new URL(request.url).searchParams.get('role');
    if (role && !['ADMIN', 'DRIVER', 'PASSENGER'].includes(role)) {
      return NextResponse.json({ error: 'Peran tidak valid' }, { status: 400 });
    }
    const rows = await db()
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
      })
      .from(users)
      .where(
        role
          ? and(
              eq(users.active, true),
              eq(users.role, role as 'ADMIN' | 'DRIVER' | 'PASSENGER'),
            )
          : eq(users.active, true),
      );
    return NextResponse.json({ users: rows });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Gagal memuat pengguna' },
      { status: 500 },
    );
  }
}
