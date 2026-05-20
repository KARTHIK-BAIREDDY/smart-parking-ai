/**
 * Automated ngrok tunnel deployment script
 * Programmatically starts ngrok, resolves active HTTPS tunnel URLs,
 * and updates NEXTAUTH_URL inside .env.local on the fly.
 */

const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ENV_PATH = path.join(__dirname, "..", ".env.local");

// Poll the ngrok local API to extract the forwarding URL
function getNgrokUrl() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "127.0.0.1",
      port: 4040,
      path: "/api/tunnels",
      method: "GET",
      timeout: 1000,
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          const activeTunnel = parsed.tunnels.find((t) => t.proto === "https");
          if (activeTunnel) {
            resolve(activeTunnel.public_url);
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
    req.end();
  });
}

// Update NEXTAUTH_URL inside .env.local dynamically
function updateEnvFile(newUrl) {
  if (!fs.existsSync(ENV_PATH)) {
    console.log(`[Env Loader] .env.local not found. Creating a new one...`);
    fs.writeFileSync(ENV_PATH, `NEXTAUTH_URL=${newUrl}\n`);
    return;
  }

  let content = fs.readFileSync(ENV_PATH, "utf8");
  const regex = /^NEXTAUTH_URL=.*$/m;

  if (regex.test(content)) {
    content = content.replace(regex, `NEXTAUTH_URL=${newUrl}`);
  } else {
    content += `\nNEXTAUTH_URL=${newUrl}\n`;
  }

  fs.writeFileSync(ENV_PATH, content, "utf8");
  console.log(`[Env Loader] ✅ Successfully updated NEXTAUTH_URL to: ${newUrl} inside .env.local`);
}

async function start() {
  console.log("==================================================");
  console.log("🚀 Starting Automated Smart Parking ngrok Forwarding...");
  console.log("==================================================");

  // Check if .env.local exists, create backup
  if (fs.existsSync(ENV_PATH)) {
    fs.copyFileSync(ENV_PATH, `${ENV_PATH}.backup`);
    console.log(`[Backup] Created backup file .env.local.backup`);
  }

  console.log(`[ngrok] Spawning 'ngrok http 3000' in the background...`);
  const ngrokProcess = spawn("ngrok", ["http", "3000"], { shell: true });

  ngrokProcess.stdout.on("data", (data) => {
    // Suppress verbose output but capture issues
  });

  ngrokProcess.stderr.on("data", (data) => {
    console.error(`[ngrok Error]:`, data.toString());
  });

  ngrokProcess.on("close", (code) => {
    console.log(`[ngrok] Process exited with status code: ${code}`);
    console.log(`💡 Make sure 'ngrok' is installed and added to your system PATH environment variable.`);
  });

  // Poll local tunnels API until up
  let attempts = 0;
  const maxAttempts = 15;
  let ngrokUrl = null;

  console.log(`[ngrok] Polling client API to extract active HTTPS tunnel...`);

  while (attempts < maxAttempts) {
    attempts++;
    ngrokUrl = await getNgrokUrl();
    if (ngrokUrl) {
      break;
    }
    // Wait 1.5 seconds before retrying
    await new Promise((res) => setTimeout(res, 1500));
  }

  if (!ngrokUrl) {
    console.error(`\n❌ Error: Could not resolve public ngrok tunnel URL.`);
    console.log(`💡 Verification checklist:`);
    console.log(`  1. Is ngrok installed? Run 'ngrok --version' manually.`);
    console.log(`  2. Do you have a valid ngrok authtoken? Run 'ngrok config add-authtoken <token>'.`);
    console.log(`  3. Try starting ngrok in a separate terminal: 'ngrok http 3000' and restart this tool.`);
    process.exit(1);
  }

  console.log(`\n==================================================`);
  console.log(`🎉 HTTPS TUNNEL ESTABLISHED!`);
  console.log(`==================================================`);
  console.log(`🌐 Public URL: ${ngrokUrl}`);
  
  // Update .env.local
  updateEnvFile(ngrokUrl);

  console.log(`\n==================================================`);
  console.log(`⚙️  GOOGLE CLOUD CONSOLE ACTION REQUIRED:`);
  console.log(`==================================================`);
  console.log(`To enable Google login on your mobile browser, you MUST add`);
  console.log(`the following details to your OAuth Client credentials:`);
  console.log(`\nAuthorized JavaScript Origin:`);
  console.log(`  http://localhost:3000`);
  console.log(`  ${ngrokUrl}`);
  console.log(`\nAuthorized Redirect URI:`);
  console.log(`  ${ngrokUrl}/api/auth/callback/google`);
  console.log(`\n==================================================`);
  console.log(`📱 MOBILE TESTING STEPS:`);
  console.log(`  1. Make sure your local Next.js dev server is running on port 3000 ('npm run dev').`);
  console.log(`  2. Open the Public URL on your phone's Chrome or Safari browser.`);
  console.log(`  3. Log in with Google and enjoy automated vehicle scanning!`);
  console.log(`==================================================\n`);
}

start();
