const fs = require('fs');

const filesToFix = [
  'src/app/api/admin/slots/[id]/release/route.ts',
  'src/app/api/admin/slots/[id]/reassign/route.ts',
  'src/app/api/admin/sessions/[id]/force-close/route.ts',
  'src/app/api/vehicles/route.ts',
  'src/app/api/slots/exit/route.ts',
  'src/app/api/parking/exit/route.ts',
  'src/app/api/vehicles/verify/vahan/route.ts'
];

for (const f of filesToFix) {
  if (!fs.existsSync(f)) continue;
  let content = fs.readFileSync(f, 'utf8');
  let changed = false;
  
  if (!content.includes('ObjectId')) {
    content = content.replace('import { NextResponse } from "next/server";', 'import { NextResponse } from "next/server";\nimport { ObjectId } from "mongodb";');
    changed = true;
  }
  
  const idRegex = /\{\s*id\s*:\s*([a-zA-Z0-9_.]+(?:userId|id))\s*\}/g;
  if (idRegex.test(content)) {
    content = content.replace(idRegex, '{ _id: new ObjectId($1) }');
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(f, content);
    console.log('Fixed', f);
  }
}
