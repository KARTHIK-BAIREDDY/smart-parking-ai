export const mockUsers = [
  {
    id: "usr_001",
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+1 555-0101",
    registeredVehicles: 2,
    activeSessions: 1,
    status: "Active",
    joined: "2023-01-15T08:30:00Z"
  },
  {
    id: "usr_002",
    name: "Jane Smith",
    email: "jane.smith@example.com",
    phone: "+1 555-0102",
    registeredVehicles: 1,
    activeSessions: 0,
    status: "Active",
    joined: "2023-02-20T10:15:00Z"
  },
  {
    id: "usr_003",
    name: "Robert Johnson",
    email: "robert.j@example.com",
    phone: "+1 555-0103",
    registeredVehicles: 3,
    activeSessions: 0,
    status: "Suspended",
    joined: "2023-03-05T14:45:00Z"
  },
  {
    id: "usr_004",
    name: "Emily Davis",
    email: "emily.d@example.com",
    phone: "+1 555-0104",
    registeredVehicles: 1,
    activeSessions: 1,
    status: "Active",
    joined: "2023-05-12T09:20:00Z"
  },
  {
    id: "usr_005",
    name: "Michael Wilson",
    email: "m.wilson@example.com",
    phone: "+1 555-0105",
    registeredVehicles: 0,
    activeSessions: 0,
    status: "Pending",
    joined: "2023-06-01T11:10:00Z"
  }
];

export const mockVehicles = [
  {
    id: "veh_001",
    number: "MH12TR6518",
    type: "CAR",
    ownerName: "John Doe",
    ownerEmail: "john.doe@example.com",
    ownerId: "usr_001",
    status: "Parked",
    assignedSlot: "A1-5",
    entryTime: "2026-06-23T08:15:00Z",
    location: "Main Entrance Campus",
    registrationDate: "2023-01-16T10:00:00Z"
  },
  {
    id: "veh_002",
    number: "KA03MX4821",
    type: "MOTORCYCLE",
    ownerName: "John Doe",
    ownerEmail: "john.doe@example.com",
    ownerId: "usr_001",
    status: "Available",
    assignedSlot: null,
    entryTime: null,
    location: null,
    registrationDate: "2023-01-20T11:30:00Z"
  },
  {
    id: "veh_003",
    number: "TN28CV9475",
    type: "TRUCK",
    ownerName: "Jane Smith",
    ownerEmail: "jane.smith@example.com",
    ownerId: "usr_002",
    status: "Available",
    assignedSlot: null,
    entryTime: null,
    location: null,
    registrationDate: "2023-02-21T09:45:00Z"
  },
  {
    id: "veh_004",
    number: "DL04CA1122",
    type: "CAR",
    ownerName: "Emily Davis",
    ownerEmail: "emily.d@example.com",
    ownerId: "usr_004",
    status: "Parked",
    assignedSlot: "B2-10",
    entryTime: "2026-06-23T10:30:00Z",
    location: "North Wing Deck",
    registrationDate: "2023-05-13T14:20:00Z"
  },
  {
    id: "veh_005",
    number: "RJ14CX9876",
    type: "CAR",
    ownerName: "Robert Johnson",
    ownerEmail: "robert.j@example.com",
    ownerId: "usr_003",
    status: "Available",
    assignedSlot: null,
    entryTime: null,
    location: null,
    registrationDate: "2023-03-06T16:00:00Z"
  }
];

export const mockSettings = {
  system: {
    systemName: "AutoPark AI Smart Campus",
    orgName: "Acme Corp Logistics",
    timeZone: "Asia/Kolkata",
    contactEmail: "admin@autopark.ai",
    supportPhone: "+1 800-PARK-AI"
  },
  parking: {
    defaultGracePeriodMins: 15,
    maxDurationHours: 24,
    enableOvernight: false,
    requireAdminApproval: true,
    displayCurrency: "USD"
  },
  profile: {
    name: "Admin User",
    email: "admin@autopark.ai",
    notificationsEnabled: true
  }
};
