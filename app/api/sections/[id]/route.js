import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get ID from URL
        const id = request.url.split('/').pop();
        const sectionId = Number(id);
        
        if (isNaN(sectionId)) {
            return NextResponse.json({ error: 'Invalid section ID' }, { status: 400 });
        }

        const section = await prisma.section.findUnique({
            where: { id: sectionId },
            include: { items: true }
        });

        if (!section) {
            return NextResponse.json({ error: 'Section not found' }, { status: 404 });
        }

        return NextResponse.json(section);
    } catch (error) {
        console.error('Error fetching section:', error);
        return NextResponse.json(
            { error: 'Error fetching section', message: error.message },
            { status: 500 }
        );
    }
}

export async function DELETE(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const id = request.url.split('/').pop();
        const sectionId = Number(id);

        if (isNaN(sectionId)) {
            return NextResponse.json({ error: 'Invalid section ID' }, { status: 400 });
        }

        // Use a transaction to delete items first, then the section
        await prisma.$transaction(async (tx) => {
            // Delete all items in the section
            await tx.item.deleteMany({
                where: { sectionId: sectionId }
            });

            // Delete the section
            await tx.section.delete({
                where: { id: sectionId }
            });
        });

        return NextResponse.json({ message: 'Section and all its items deleted successfully' });
    } catch (error) {
        console.error('Error deleting section:', error?.message || 'Unknown error');
        
        return NextResponse.json(
            { error: 'Error deleting section', message: error?.message || 'Unknown error' },
            { status: 500 }
        );
    }
}