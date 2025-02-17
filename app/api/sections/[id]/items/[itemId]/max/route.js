import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
});

export async function PATCH(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const sectionId = parseInt(params.id, 10);
    const itemId = parseInt(params.itemId, 10);
    const { maxQuantity } = await request.json();

    if (isNaN(maxQuantity) || maxQuantity < 0) {
      return NextResponse.json(
        { error: 'Invalid maximum quantity' },
        { status: 400 }
      );
    }

    // Validate the new maximum quantity
    const currentItem = await prisma.item.findUnique({
      where: { id: itemId },
      select: { count: true }
    });

    if (!currentItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (maxQuantity < currentItem.count) {
      return NextResponse.json(
        { error: 'Maximum quantity cannot be less than current count' },
        { status: 400 }
      );
    }

    const updatedItem = await prisma.item.update({
      where: { 
        id: itemId,
        sectionId: sectionId
      },
      data: { maxQuantity },
      select: {
        id: true,
        count: true,
        name: true,
        sectionId: true,
        maxQuantity: true,
        description: true
      }
    });

    // Broadcast the update via Pusher
    await pusher.trigger(
      `section-${sectionId}`,
      'itemUpdate',
      updatedItem
    );

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Error updating maximum quantity:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update maximum quantity' },
      { status: 500 }
    );
  }
} 