import fs from 'fs';
import path from 'path';

async function runBenchmark() {
  const imagesDir = path.join(process.cwd(), 'public', 'audit-reports', 'failures');
  
  if (!fs.existsSync(imagesDir)) {
    console.error(`Directory not found: ${imagesDir}`);
    console.error("Please place test images in this directory to run the benchmark.");
    process.exit(1);
  }

  const files = fs.readdirSync(imagesDir).filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png'));
  
  if (files.length === 0) {
    console.error(`No images found in ${imagesDir}. Please add test images.`);
    process.exit(1);
  }

  console.log(`Found ${files.length} images for benchmarking. Loading...`);

  const base64Images: string[] = [];
  for (const file of files) {
    const filePath = path.join(imagesDir, file);
    const buffer = fs.readFileSync(filePath);
    base64Images.push(buffer.toString('base64'));
  }

  console.log(`Hitting http://127.0.0.1:8000/benchmark with ${base64Images.length} images...`);

  try {
    const res = await fetch("http://127.0.0.1:8000/benchmark", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: base64Images })
    });

    if (!res.ok) {
      console.error(`Benchmark failed with status ${res.status}:`, await res.text());
      return;
    }

    const data = await res.json();
    console.log("\n=================================");
    console.log("      BENCHMARK RESULTS          ");
    console.log("=================================");
    console.log(`Total Images Evaluated: ${files.length}`);
    console.log(`Success Rate (Conf >= 40%): ${(data.successRate * 100).toFixed(1)}%`);
    console.log(`Average Confidence: ${(data.avgConfidence * 100).toFixed(1)}%`);
    console.log(`Average Inference Time: ${data.avgInferenceMs.toFixed(2)} ms`);
    console.log("=================================\n");
  } catch (err: any) {
    console.error("Error connecting to ML service:", err.message);
    console.error("Is the Python FastAPI service running on port 8000?");
  }
}

runBenchmark();
