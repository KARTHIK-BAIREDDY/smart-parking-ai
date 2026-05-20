export interface ParkingSlot {
  id: string; // e.g., A1-1
  row: string; // e.g., A
  subrow: string; // e.g., A1
  number: number; // e.g., 1
  status: 'available' | 'occupied' | 'reserved' | 'inactive' | 'ai-recommended';
  vehicleId?: string;
  entryTime?: string;
}

export interface ParkingPlace {
  id: string;
  name: string;
  code: string;
  country: string;
  state: string;
  district: string;
  area: string;
  rows: number;
  subrows: number;
  slotsPerSubrow: number;
  slots: ParkingSlot[];
}

export interface Vehicle {
  vehicleId: string;
  parkingPlaceId: string;
  slotId: string;
  entryTime: string;
}

// In-memory Database Singleton
class Database {
  private static instance: Database;
  public parkingPlaces: ParkingPlace[] = [];
  public vehicles: Vehicle[] = [];

  private constructor() {
    // Initialize with a default demo parking place
    this.createDemoParkingPlace();
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private createDemoParkingPlace() {
    const demoPlace: ParkingPlace = {
      id: 'demo-parking-1',
      name: 'Whitefield Mall Parking',
      code: 'WMP-01',
      country: 'India',
      state: 'Karnataka',
      district: 'Bengaluru',
      area: 'Whitefield',
      rows: 3,
      subrows: 2,
      slotsPerSubrow: 40,
      slots: [],
    };

    // Generate slots
    const rowsList = ['A', 'B', 'C'];
    for (let r = 0; r < demoPlace.rows; r++) {
      const rowName = rowsList[r] || `R${r}`;
      for (let s = 1; s <= demoPlace.subrows; s++) {
        const subrowName = `${rowName}${s}`;
        for (let num = 1; num <= demoPlace.slotsPerSubrow; num++) {
          // Randomly occupy some slots for demonstration
          const isOccupied = Math.random() < 0.2; // 20% occupied
          const isReserved = !isOccupied && Math.random() < 0.05; // 5% reserved

          demoPlace.slots.push({
            id: `${subrowName}-${num}`,
            row: rowName,
            subrow: subrowName,
            number: num,
            status: isOccupied ? 'occupied' : isReserved ? 'reserved' : 'available',
            vehicleId: isOccupied ? `KA01AB${Math.floor(1000 + Math.random() * 9000)}` : undefined,
            entryTime: isOccupied ? new Date().toISOString() : undefined,
          });
        }
      }
    }

    this.parkingPlaces.push(demoPlace);
  }
}

export const db = Database.getInstance();
