import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const sectionId = parseInt(id);
    
    const { name, description, maxQuantity } = await request.json();

    // Validate input
    if (!name || !maxQuantity) {
      return NextResponse.json(
        { error: 'Name and maximum quantity are required' },
        { status: 400 }
      );
    }

    // Create item with version field
    const item = await prisma.item.create({
      data: {
        name,
        description,
        maxQuantity,
        count: 0,
        version: 0, // Adding version for optimistic concurrency control
        sectionId,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error creating item:', error);
    return NextResponse.json(
      { error: 'Error creating item', message: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
} 