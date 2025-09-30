import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Waitlist from '@/models/Waitlist';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, audience, organization } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    if (!audience || !['company', 'app'].includes(audience)) {
      return NextResponse.json({ error: 'Valid audience type is required' }, { status: 400 });
    }

    await dbConnect();

    const existingEntry = await Waitlist.findOne({ email: email.toLowerCase() });
    
    if (existingEntry) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const waitlistEntry = await Waitlist.create({
      email: email.toLowerCase(),
      audience,
      organization: organization || '',
    });

    // Send welcome email
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/waitlist/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, audience, organization }),
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Don't fail the signup if email fails
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully joined waitlist!',
      data: waitlistEntry 
    }, { status: 201 });

  } catch (error: any) {
    console.error('Waitlist API Error:', error);
    
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    return NextResponse.json({ error: 'Failed to join waitlist. Please try again.' }, { status: 500 });
  }
}

export async function GET() {
  try {
    await dbConnect();
    const count = await Waitlist.countDocuments();
    return NextResponse.json({ count });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get count' }, { status: 500 });
  }
}
