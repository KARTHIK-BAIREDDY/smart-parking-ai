import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { originalFrame, vehicleCrop, roiCrop, localizedCrop, text, confidence, vehicleType, reason } = body;

    const timestamp = Date.now();
    const safeText = text ? text.replace(/[^a-zA-Z0-9]/g, "") : "unknown";
    const dirName = `${timestamp}-${safeText}`;
    const dirPath = path.join(process.cwd(), "public", "audit-reports", "failures", dirName);

    // Create directory
    fs.mkdirSync(dirPath, { recursive: true });

    // Save metadata
    const metadata = {
      timestamp,
      text,
      confidence,
      vehicleType,
      reason,
      date: new Date(timestamp).toISOString()
    };
    fs.writeFileSync(path.join(dirPath, "metadata.json"), JSON.stringify(metadata, null, 2));

    // Save images function
    const saveBase64Image = (base64Str: string, filename: string) => {
      if (!base64Str) return;
      const base64Data = base64Str.replace(/^data:image\/\w+;base64,/, "");
      fs.writeFileSync(path.join(dirPath, filename), base64Data, 'base64');
    };

    saveBase64Image(originalFrame, "1_original_frame.jpg");
    saveBase64Image(vehicleCrop, "2_vehicle_crop.jpg");
    saveBase64Image(roiCrop, "3_roi_crop.jpg");
    saveBase64Image(localizedCrop, "4_localized_crop.jpg");

    return NextResponse.json({ success: true, path: dirPath });
  } catch (error) {
    console.error("Failed to save failure report:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
