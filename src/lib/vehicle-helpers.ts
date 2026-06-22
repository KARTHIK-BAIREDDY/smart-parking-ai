export const INDIAN_PLATE_REGEX = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$/;

export function normalizeVehicleNumber(plate: string): string {
  if (!plate) return "";
  return plate.toUpperCase().replace(/\s+/g, "");
}
