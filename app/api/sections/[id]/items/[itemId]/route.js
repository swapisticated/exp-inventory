import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Pusher from 'pusher';

const logError = (context, error) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`Error ${context}:`, {
    message: errorMessage,
    code: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined
  });
  return errorMessage;
};

// Initialize Pusher
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
});

export async function PATCH(request, context) {
  try {
    const params = await context.params;
    const { id: sectionId, itemId } = params;
    const { count } = await request.json();
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate input
    const parsedCount = parseInt(count, 10);
    if (isNaN(parsedCount) || parsedCount < 0) {
      return NextResponse.json({ error: 'Invalid count value' }, { status: 400 });
    }

    const parsedSectionId = parseInt(sectionId, 10);
    const parsedItemId = parseInt(itemId, 10);

    const updatedItem = await prisma.$transaction(async (tx) => {
      const currentItem = await tx.item.findUnique({
        where: { id: parsedItemId },
        select: { count: true, version: true, maxQuantity: true }
      });

      if (!currentItem) {
        throw new Error('Item not found');
      }

      if (parsedCount > currentItem.maxQuantity) {
        throw new Error(`Count cannot exceed maximum quantity of ${currentItem.maxQuantity}`);
      }

      const [updated] = await Promise.all([
        tx.item.update({
          where: { 
            id: parsedItemId,
            sectionId: parsedSectionId,
            version: currentItem.version
          },
          data: { 
            count: parsedCount,
            version: { increment: 1 }
          },
          select: {
            id: true,
            count: true,
            name: true,
            sectionId: true,
            maxQuantity: true,
            description: true
          }
        }),
        tx.auditLog.create({
          data: {
            itemId: parsedItemId,
            userId: parseInt(session.user.id, 10),
            oldCount: currentItem.count,
            newCount: parsedCount,
            timestamp: new Date()
          }
        })
      ]);

      return updated;
    });

    // Broadcast the update via Pusher
    await pusher.trigger(
      `section-${sectionId}`,
      'itemUpdate',
      updatedItem
    );

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Error updating item:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update item' },
      { status: error.code === 'P2025' ? 404 : 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const { itemId } = await context.params;

    // Validate session
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate item ID
    const id = parseInt(itemId, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid item ID' },
        { status: 400 }
      );
    }

    // Perform deletion in a transaction
    await prisma.$transaction([
      prisma.auditLog.deleteMany({
        where: { itemId: id },
      }),
      prisma.item.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error.message, error.stack);
    return NextResponse.json(
      { error: 'Error deleting item', details: error.message },
      { status: 500 }
    );
  }
}