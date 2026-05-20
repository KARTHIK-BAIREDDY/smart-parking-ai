import { NextResponse } from 'next/server';

// Server-side in-memory state for cross-device sync
let globalState: any = null;

const createInitialData = () => {
  const generateSlots = (prefix: string) =>
    Array.from({ length: 40 }, (_, i) => ({
      id: `${prefix}-${i + 1}`,
      status: Math.random() > 0.8 ? "occupied" : (Math.random() > 0.9 ? "reserved" : "available"),
    }));

  return [
    {
      id: "loc-1",
      name: "Central Mall Parking",
      code: "CMP-01",
      country: "India",
      state: "Karnataka",
      district: "Bengaluru",
      area: "Whitefield",
      institutionName: "Central Mall Enterprises",
      rows: [
        {
          id: "A",
          subRows: [
            { id: "A1", slots: generateSlots("A1") },
            { id: "A2", slots: generateSlots("A2") },
          ],
        },
        {
          id: "B",
          subRows: [
            { id: "B1", slots: generateSlots("B1") },
            { id: "B2", slots: generateSlots("B2") },
          ],
        },
      ],
    }
  ];
};

export async function GET() {
  if (!globalState) {
    globalState = {
      locations: createInitialData(),
      lastParkedVehicle: null,
      securityLogs: [],
    };
  }
  return NextResponse.json(globalState);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Completely overwrite global state with the incoming state (since this is a simple mock DB)
    globalState = {
      locations: body.locations || [],
      lastParkedVehicle: body.lastParkedVehicle || null,
      securityLogs: body.securityLogs || [],
    };

    return NextResponse.json({ success: true, state: globalState });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
