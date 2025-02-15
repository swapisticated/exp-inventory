import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const section = await prisma.section.create({
      data: {
        name: data.name,
        description: data.description,
        deltaValue: data.deltaValue || 1
      }
    });

    return NextResponse.json(section);
  } catch (error) {
    console.error('Section creation error:', error);
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Section with this name already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error creating section', message: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sections = await prisma.section.findMany({
      include: {
        _count: {
          select: { items: true }
        }
      }
    });

    return NextResponse.json(sections);
  } catch (error) {
    console.error('Error fetching sections:', error);
    return NextResponse.json(
      { error: 'Error fetching sections', message: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
} 