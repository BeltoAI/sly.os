import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Waitlist from '@/models/Waitlist';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, audience, organization } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    if (!audience || !['company', 'app'].includes(audience)) {
      return NextResponse.json(
        { error: 'Valid audience type is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const existingEntry = await Waitlist.findOne({ email: email.toLowerCase() });
    
    if (existingEntry) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    const waitlistEntry = await Waitlist.create({
      email: email.toLowerCase(),
      audience,
      organization: organization || '',
    });

    return NextResponse.json(
      { 
        success: true, 
        message: 'Successfully joined waitlist!',
        data: waitlistEntry 
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Waitlist API Error:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to join waitlist. Please try again.' },
      { status: 500 }
    );
  }
}
