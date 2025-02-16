import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function PATCH(request, context) {
  try {
    const { id: sectionId, itemId } =  await context.params;
    const { count } = await request.json();

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsedItemId = parseInt(itemId, 10);
    const parsedCount = parseInt(count, 10);
    const parsedSectionId = parseInt(sectionId, 10);

    if (isNaN(parsedCount) || parsedCount < 0) {
      return NextResponse.json(
        { error: 'Invalid count value' },
        { status: 400 }
      );
    }

    // Combine all database operations in a single transaction
    const updatedItem = await prisma.$transaction(async (tx) => {
      // Get current item for audit log
      const currentItem = await tx.item.findUnique({
        where: { 
          id: parsedItemId,
        },
        select: { count: true }
      });

      if (!currentItem) {
        throw new Error('Item not found');
      }

      // Update item and create audit log in parallel
      const [updated] = await Promise.all([
        tx.item.update({
          where: { 
            id: parsedItemId,
            sectionId: parsedSectionId
          },
          data: { count: parsedCount },
          select: {
            id: true,
            count: true,
            name: true,
            sectionId: true
          }
        }),
        tx.auditLog.create({
          data: {
            itemId: parsedItemId,
            userId: parseInt(session.user.id, 10),
            oldCount: currentItem.count,
            newCount: parsedCount,
            timestamp: new Date(),
          }
        })
      ]);

      return updated;
    });

    // Handle SSE notification asynchronously
    if (global.sseClients?.get(sectionId)?.size > 0) {
      const message = `event: itemUpdate\ndata: ${JSON.stringify(updatedItem)}\n\n`;
      const encodedMessage = new TextEncoder().encode(message);
      queueMicrotask(() => {
        global.sseClients.get(sectionId)?.forEach(controller => {
          controller.enqueue(encodedMessage);
        });
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

    await prisma.$transaction([
      prisma.auditLog.deleteMany({
        where: { itemId: id },
      }),
      prisma.item.delete({
        where: { id },
      })
    ]);

    return NextResponse.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json(
      { error: 'Error deleting item', message: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}