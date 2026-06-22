const fs = require('fs');

// Revert ParkingContext unknown to any, but disable lint
let f = 'src/lib/context/ParkingContext.tsx';
if (fs.existsSync(f)) {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/: unknown/g, ': any');
  fs.writeFileSync(f, content);
}

// Revert auth.ts unknown to any
f = 'src/lib/auth.ts';
if (fs.existsSync(f)) {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/: unknown/g, ': any');
  fs.writeFileSync(f, content);
}

// Fix msg91-provider.ts { phone, msg } -> { _phone, _msg }
f = 'src/lib/sms/msg91-provider.ts';
if (fs.existsSync(f)) {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/\{ phone, msg \}/g, '{ phone: _phone, msg: _msg }');
  fs.writeFileSync(f, content);
}

// Fix sms-service.ts returning boolean instead of SmsResult
f = 'src/lib/sms/sms-service.ts';
if (fs.existsSync(f)) {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/return provider\.sendOtp\(payload\);/g, 'return (await provider.sendOtp?.(payload))?.success || false;');
  content = content.replace(/return provider\.sendEntry\(payload\);/g, 'return (await provider.sendEntry?.(payload))?.success || false;');
  content = content.replace(/return provider\.sendExit\(payload\);/g, 'return (await provider.sendExit?.(payload))?.success || false;');
  content = content.replace(/return provider\.sendApproval\(payload\);/g, 'return (await provider.sendApproval?.(payload))?.success || false;');
  fs.writeFileSync(f, content);
}

// Fix exit/route.ts exitTime: new Date()
f = 'src/app/api/parking/exit/route.ts';
if (fs.existsSync(f)) {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/exitTime:\s*new Date\(\)/g, 'exitTime: new Date().toISOString()');
  fs.writeFileSync(f, content);
}

console.log("Types reverted/fixed.");
