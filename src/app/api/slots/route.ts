import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get('placeId');

  if (!placeId) {
    return NextResponse.json({ error: 'placeId is required' }, { status: 400 });
  }

  const place = db.parkingPlaces.find(p => p.id === placeId);
  if (!place) {
    return NextResponse.json({ error: 'Parking place not found' }, { status: 404 });
  }

  return NextResponse.json(place.slots);
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { placeId, slotId, status, vehicleId } = body;

    const place = db.parkingPlaces.find(p => p.id === placeId);
    if (!place) return NextResponse.json({ error: 'Place not found' }, { status: 404 });

    const slot = place.slots.find(s => s.id === slotId);
    if (!slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 });

    slot.status = status;
    if (status === 'occupied') {
      slot.vehicleId = vehicleId;
      slot.entryTime = new Date().toISOString();
      if (vehicleId) {
        db.vehicles.push({
          vehicleId,
          parkingPlaceId: placeId,
          slotId,
          entryTime: slot.entryTime
        });
      }
    } else if (status === 'available') {
      slot.vehicleId = undefined;
      slot.entryTime = undefined;
      // remove from vehicles array
      db.vehicles = db.vehicles.filter(v => v.slotId !== slotId);
    }

    return NextResponse.json(slot);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
