"use client";

import { Row } from "@/lib/context/ParkingContext";
import { cn } from "@/lib/utils";

export default function SlotVisualizer({ rows }: { rows: Row[] }) {
  const getSlotStyle = (status: string) => {
    switch (status) {
      case "available":
        return "bg-[var(--color-slot-available)] text-white border-transparent";
      case "occupied":
        return "bg-[var(--color-slot-occupied)] text-white border-transparent";
      case "reserved":
        return "bg-[var(--color-slot-reserved)] text-white border-transparent";
      case "maintenance":
        return "bg-[var(--color-slot-maintenance)] text-white border-transparent";
      case "ev":
        return "bg-[var(--color-slot-ev)] text-white border-transparent";
      case "accessible":
        return "bg-[var(--color-slot-accessible)] text-white border-transparent";
      default:
        return "bg-[var(--color-border)] text-[var(--color-primary)] border-transparent";
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[var(--color-slot-available)]"></div><span className="text-sm font-medium text-[var(--color-secondary)]">Available</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[var(--color-slot-occupied)]"></div><span className="text-sm font-medium text-[var(--color-secondary)]">Occupied</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[var(--color-slot-reserved)]"></div><span className="text-sm font-medium text-[var(--color-secondary)]">Reserved</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[var(--color-slot-maintenance)]"></div><span className="text-sm font-medium text-[var(--color-secondary)]">Maintenance</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[var(--color-slot-ev)]"></div><span className="text-sm font-medium text-[var(--color-secondary)]">EV Charging</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[var(--color-slot-accessible)]"></div><span className="text-sm font-medium text-[var(--color-secondary)]">Accessible</span></div>
      </div>

      {/* Grid */}
      {rows.map(row => (
        <div key={row.id} className="bg-[var(--color-card)] p-6 rounded-2xl border border-[var(--color-border)] shadow-sm">
          <h3 className="text-lg font-bold text-[var(--color-primary)] mb-4 tracking-tight">Row {row.id}</h3>
          <div className="flex flex-col gap-6">
            {row.subRows.map(subRow => (
              <div key={subRow.id} className="flex flex-col sm:flex-row gap-4 sm:items-center bg-[var(--color-background)] p-4 rounded-xl border border-[var(--color-border)]">
                <span className="font-bold text-[var(--color-secondary)] w-12 shrink-0">{subRow.id}</span>
                <div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-3 w-full">
                  {subRow.slots.map(slot => (
                    <div
                      key={slot.id}
                      className={cn(
                        "relative flex flex-col items-center justify-center w-full sm:w-16 h-20 rounded-lg border-2 text-xs font-bold transition-all cursor-pointer",
                        "hover:scale-105 hover:ring-2 hover:ring-white hover:z-10 shadow-sm",
                        getSlotStyle(slot.status)
                      )}
                      title={`Slot ${slot.id} - ${slot.status}`}
                    >
                      <span className="text-sm">{slot.id.split('-').pop()}</span>
                      {slot.vehicleId && (
                        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 w-11/12 truncate text-[9px] font-medium bg-black/40 px-1 py-0.5 rounded text-center">
                          {slot.vehicleId}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
