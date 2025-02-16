import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function PATCH(request, context) {
  try {
    // Await params first
    const params = await context.params;
    const { id: sectionId, itemId } = params;
    const { count } = await request.json();

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse values once
    const parsedValues = {
      itemId: parseInt(itemId, 10),
      count: parseInt(count, 10),
      userId: parseInt(session.user.id, 10),
      sectionId: parseInt(sectionId, 10)
    };

    if (isNaN(parsedValues.count) || parsedValues.count < 0) {
      return NextResponse.json(
        { error: 'Invalid count value' },
        { status: 400 }
      );
    }

    // Single transaction with both operations
    const updatedItem = await prisma.$transaction(async (tx) => {
      const [item] = await Promise.all([
        tx.item.update({
          where: { 
            id: parsedValues.itemId,
            sectionId: parsedValues.sectionId
          },
          data: { count: parsedValues.count },
          select: {
            id: true,
            count: true,
            name: true,
            description: true,
            maxQuantity: true,
            sectionId: true
          }
        }),
        tx.auditLog.create({
          data: {
            itemId: parsedValues.itemId,
            userId: parsedValues.userId,
            oldCount: count,
            newCount: parsedValues.count,
            timestamp: new Date(),
          }
        })
      ]);

      return item;
    });

    // Optimize SSE notification by moving it outside the transaction
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