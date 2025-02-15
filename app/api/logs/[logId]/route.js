import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function PATCH(request, context) {
  try {
    const params = await context.params;
    const { logId } = params;
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in with a valid user ID' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { remarks } = body;

    if (typeof remarks !== 'string') {
      return NextResponse.json(
        { error: 'Invalid input', message: 'Remarks must be a string' },
        { status: 400 }
      );
    }

    // Verify the user owns this log
    const existingLog = await prisma.auditLog.findUnique({
      where: { id: parseInt(logId, 10) },
      include: { user: true },
    });

    if (!existingLog) {
      return NextResponse.json(
        { error: 'Not found', message: 'Log entry not found' },
        { status: 404 }
      );
    }

    // Debug log to see the values we're comparing
    console.log('Comparing user IDs:', {
      sessionUserId: session.user.id,
      logUserId: existingLog.userId,
      areEqual: String(session.user.id) === String(existingLog.userId)
    });

    // Convert both IDs to strings for comparison
    if (String(existingLog.userId) !== String(session.user.id)) {
      return NextResponse.json(
        { 
          error: 'Forbidden', 
          message: 'You can only edit your own remarks',
          debug: {
            sessionUserId: session.user.id,
            logUserId: existingLog.userId
          }
        },
        { status: 403 }
      );
    }

    // Update the remark
    const updatedLog = await prisma.auditLog.update({
      where: { id: parseInt(logId, 10) },
      data: { remarks },
      include: { user: true },
    });

    return NextResponse.json(updatedLog);
  } catch (error) {
    console.error('Error updating log remark:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to update remark. Please try again.',
        details: error?.message
      },
      { status: 500 }
    );
  }
} 