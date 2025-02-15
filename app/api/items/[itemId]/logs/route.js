import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

export async function GET(request, context) {
  try {
    // Access the dynamic route parameter
    const { itemId } = await context.params;
    
    // Require an authenticated session.
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch audit logs for the item.
    // Including user details (id and name) so that everyone sees who made the change.
    const logs = await prisma.auditLog.findMany({
      where: { itemId: parseInt(itemId, 10) },
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      {
        error: 'Error fetching audit logs',
        message: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
} 