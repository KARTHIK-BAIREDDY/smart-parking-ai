import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-cpu';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as jpeg from 'jpeg-js';

// Pre-load the model to avoid loading it on every request
let modelPromise: Promise<cocoSsd.ObjectDetection> | null = null;

const VALID_CLASSES = ["car", "motorcycle", "truck", "bus", "auto-rickshaw", "van", "suv", "pickup truck"];

export async function verifyVehicleInImage(base64Image: string): Promise<{ success: boolean; detectedClass?: string; confidence?: number; error?: string }> {
  try {
    if (!modelPromise) {
      modelPromise = cocoSsd.load({ modelUrl: 'http://localhost:3000/models/coco-ssd/model.json' });
    }
    const model = await modelPromise;

    // Remove data URI prefix if present
    const base64Data = base64Image.replace(/^data:image\/jpeg;base64,/, "");
    
    if (!base64Data) {
       return { success: false, error: "Empty frame provided." };
    }

    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Decode JPEG
    const rawImageData = jpeg.decode(imageBuffer, { useTArray: true });
    
    // tfjs expects RGB channels, jpeg-js outputs RGBA (4 channels)
    const numPixels = rawImageData.width * rawImageData.height;
    const rgbData = new Uint8Array(numPixels * 3);
    for (let i = 0; i < numPixels; i++) {
      rgbData[i * 3] = rawImageData.data[i * 4];     // R
      rgbData[i * 3 + 1] = rawImageData.data[i * 4 + 1]; // G
      rgbData[i * 3 + 2] = rawImageData.data[i * 4 + 2]; // B
    }

    const tensor = tf.tensor3d(rgbData, [rawImageData.height, rawImageData.width, 3], 'int32');

    const predictions = await model.detect(tensor as any);
    
    tensor.dispose();

    const vehicle = predictions.find(p => VALID_CLASSES.includes(p.class));

    if (vehicle) {
      return { 
        success: true, 
        detectedClass: vehicle.class,
        confidence: vehicle.score
      };
    } else {
      return { success: false, error: "No vehicle detected" };
    }
  } catch (error: any) {
    console.error("[ServerDetection] Error processing image:", error);
    return { success: false, error: "Image processing failed." };
  }
}
