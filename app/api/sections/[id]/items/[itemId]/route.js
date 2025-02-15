import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function PATCH(request, context) {
  try {
    // Get and validate all params first
    const params = await context.params;
    const { id: sectionId, itemId } = params;
    const { count } = await request.json();

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse all numeric values at once
    const parsedItemId = parseInt(itemId, 10);
    const parsedCount = parseInt(count, 10);
    const parsedUserId = parseInt(session.user.id, 10);

    if (isNaN(parsedCount) || parsedCount < 0) {
      return NextResponse.json(
        { error: 'Invalid count value' },
        { status: 400 }
      );
    }

    // Optimize transaction by including only necessary fields
    const [updatedItem] = await prisma.$transaction([
      prisma.item.update({
        where: { 
          id: parsedItemId,
          sectionId: parseInt(sectionId, 10)
        },
        data: { count: parsedCount },
        select: {
          id: true,
          count: true,
          name: true,
          description: true,
          maxQuantity: true,
          sectionId: true
        }
      }),
      prisma.auditLog.create({
        data: {
          itemId: parsedItemId,
          userId: parsedUserId,
          oldCount: count,
          newCount: parsedCount,
          timestamp: new Date(),
        },
        select: { id: true }
      })
    ], {
      timeout: 5000
    });

    // Optimize SSE handling
    const sseClients = global.sseClients?.get(sectionId);
    if (sseClients?.size > 0) {
      const message = `event: itemUpdate\ndata: ${JSON.stringify(updatedItem)}\n\n`;
      const encodedMessage = new TextEncoder().encode(message);
      sseClients.forEach(controller => {
        controller.enqueue(encodedMessage);
      });
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Error updating item count:', error);
    return NextResponse.json(
      { error: 'Failed to update item count' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const { itemId } = await context.params;
    
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = parseInt(itemId, 10);

    await prisma.auditLog.deleteMany({
      where: { itemId: id },
    });

    await prisma.item.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json(
      { error: 'Error deleting item', message: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}