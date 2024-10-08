import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/dbConnect';
import { User } from '@/lib/mongodb/schema';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import mongoose from 'mongoose';

export async function GET(_req: Request) {
    try {
        await connectDB();
        const session = await getServerSession(authOptions);

        if (!session || !session.user?.name) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await User.findOne({ username: session.user.name });
        return NextResponse.json({ notes: user?.notes || [] });
    } catch (error) {
        console.error('Error fetching notes:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        await connectDB();
        const session = await getServerSession(authOptions);

        if (!session || !session.user?.name) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { content, title } = await req.json();
        const updateData: { content?: string; title?: string } = {};
        if (content !== undefined) updateData.content = content;
        if (title !== undefined) updateData.title = title;

        const user = await User.findOneAndUpdate(
            { username: session.user.name, 'notes._id': params.id },
            { $set: { 'notes.$.title': title, 'notes.$.content': content } },
            { new: true }
        );

        const updatedNote = user.notes.find((note: any) => note._id.toString() === params.id);
        return NextResponse.json({ success: true, note: updatedNote });
    } catch (error) {
        console.error('Error updating note:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
    try {
        await connectDB();
        const session = await getServerSession(authOptions);

        if (!session || !session.user?.name) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const noteId = new mongoose.Types.ObjectId(params.id);

        const result = await User.findOneAndUpdate(
            { username: session.user.name },
            { $pull: { notes: { _id: noteId } } },
            { new: true }
        );

        if (!result) {
            return NextResponse.json({ error: 'Note not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Error deleting note:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}