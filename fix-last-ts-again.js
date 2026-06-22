const fs = require('fs');

// Fix sms-service.ts
let f = 'src/lib/sms/sms-service.ts';
if (fs.existsSync(f)) {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/return await provider\.sendOtp\(([^)]+)\);/g, 'return (await provider.sendOtp($1)).success;');
  content = content.replace(/return await provider\.sendEntry\(([^)]+)\);/g, 'return (await provider.sendEntry($1)).success;');
  content = content.replace(/return await provider\.sendExit\(([^)]+)\);/g, 'return (await provider.sendExit($1)).success;');
  content = content.replace(/return await provider\.sendApproval\(([^)]+)\);/g, 'return (await provider.sendApproval($1)).success;');
  fs.writeFileSync(f, content);
}

// Fix exit/route.ts exitTime
f = 'src/app/api/parking/exit/route.ts';
if (fs.existsSync(f)) {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/exitTime,/g, 'exitTime: exitTime instanceof Date ? exitTime.toISOString() : exitTime,');
  fs.writeFileSync(f, content);
}
console.log("Fixed last missing typescript issues.");
