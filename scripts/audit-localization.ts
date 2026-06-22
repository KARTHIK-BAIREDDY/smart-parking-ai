import fs from 'fs';
import path from 'path';

// PHASE 7: Measure localization success rate
// Run this via: npx ts-node scripts/audit-localization.ts

const failuresDir = path.join(process.cwd(), 'public', 'audit-reports', 'failures');

if (!fs.existsSync(failuresDir)) {
    console.log("No failures found. Localization success is 100% or no tests have been run.");
    process.exit(0);
}

const files = fs.readdirSync(failuresDir).filter(f => f.endsWith('.json'));

let totalAudits = 0; // Assume we log all attempts somewhere, or we just classify failures
let categoryCounts = {
    A: 0, // No Plate Candidate found (Plate outside ROI)
    B: 0, // Wrong Candidate selected
    C: 0, // OCR failed on correct plate
    D: 0, // Vehicle Detection failed
    UNKNOWN: 0
};

for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(failuresDir, file), 'utf8'));
    
    // Automatically classify based on heuristics for the report if category isn't set
    let category = data.category;
    if (!category) {
        if (!data.telemetry?.boxes?.candidateROIs || data.telemetry.boxes.candidateROIs.length === 0) {
            category = "A"; 
        } else if (data.telemetry.ocrConfidence < 30) {
            category = "C"; 
        } else {
            category = "B";
        }
    }

    if (categoryCounts.hasOwnProperty(category)) {
        categoryCounts[category as keyof typeof categoryCounts]++;
    } else {
        categoryCounts.UNKNOWN++;
    }
}

console.log("--- LOCALIZATION AUDIT REPORT ---");
console.log(`Total Failures Logged: ${files.length}`);
console.log(`\nFailure Categories:`);
console.log(`A (No Plate Candidate Found): ${categoryCounts.A}`);
console.log(`B (Wrong Candidate Selected): ${categoryCounts.B}`);
console.log(`C (OCR Failed on Correct Plate): ${categoryCounts.C}`);
console.log(`D (Vehicle Detection Failed): ${categoryCounts.D}`);

console.log(`\nIMPORTANT: Only after localization exceeds 95% should OCR tuning continue.`);
