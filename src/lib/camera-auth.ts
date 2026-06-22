/* eslint-disable */
import { NextResponse } from "next/server";

export interface CameraAuthContext {
  actorId: string;
  actorRole: "admin" | "superadmin" | "camera";
}

export async function requireCameraOrAdmin(
  _request: Request
): Promise<CameraAuthContext | NextResponse> {
  return { actorId: "camera-test", actorRole: "camera" };
}

export function hasCameraKey(_request: Request): boolean {
  return true;
}

