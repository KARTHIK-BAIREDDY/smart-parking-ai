import { NextResponse } from 'next/server';
import { db, ParkingPlace } from '@/lib/db';

export async function GET() {
  return NextResponse.json(db.parkingPlaces);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Basic validation
    if (!body.name || !body.code || !body.rows || !body.subrows || !body.slotsPerSubrow) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newPlace: ParkingPlace = {
      id: `parking-${Date.now()}`,
      name: body.name,
      code: body.code,
      country: body.country || 'Unknown',
      state: body.state || 'Unknown',
      district: body.district || 'Unknown',
      area: body.area || 'Unknown',
      rows: parseInt(body.rows),
      subrows: parseInt(body.subrows),
      slotsPerSubrow: parseInt(body.slotsPerSubrow),
      slots: [],
    };

    // Generate slots
    const rowsList = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    for (let r = 0; r < newPlace.rows; r++) {
      const rowName = rowsList[r] || `R${r}`;
      for (let s = 1; s <= newPlace.subrows; s++) {
        const subrowName = `${rowName}${s}`;
        for (let num = 1; num <= newPlace.slotsPerSubrow; num++) {
          newPlace.slots.push({
            id: `${subrowName}-${num}`,
            row: rowName,
            subrow: subrowName,
            number: num,
            status: 'available',
          });
        }
      }
    }

    db.parkingPlaces.push(newPlace);
    return NextResponse.json(newPlace, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
