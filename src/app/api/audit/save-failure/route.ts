import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { reason, category, telemetry } = data;

    const auditDir = path.join(process.cwd(), 'public', 'audit-reports', 'failures');
    
    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const failureId = `fail_${timestamp}`;
    
    // Save metadata
    const metadataPath = path.join(auditDir, `${failureId}.json`);
    fs.writeFileSync(metadataPath, JSON.stringify({
      id: failureId,
      timestamp,
      reason,
      category,
      telemetry: {
        ocrConfidence: telemetry.ocrConfidence,
        plateNumber: telemetry.plateNumber,
        vehicleType: telemetry.vehicleType,
        boxes: telemetry.boxes
      }
    }, null, 2));

    // Save images if provided
    if (telemetry.previews && telemetry.previews.length > 0) {
      telemetry.previews.forEach((preview: any, i: number) => {
        if (preview.src && preview.src.startsWith('data:image')) {
          const base64Data = preview.src.split(';base64,').pop();
          if (base64Data) {
            const imagePath = path.join(auditDir, `${failureId}_${i}_${preview.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`);
            fs.writeFileSync(imagePath, base64Data, { encoding: 'base64' });
          }
        }
      });
    }

    return NextResponse.json({ success: true, id: failureId });
  } catch (error) {
    console.error('Failed to save audit failure:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
