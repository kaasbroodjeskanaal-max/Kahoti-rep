import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { createServer as createViteServer } from "vite";

dotenv.config();

const LOG_FILE = path.join(process.cwd(), "proxy_logs.txt");

// Securely redact sensitive fields (passwords, tokens, cookies, auth keys) from logs
function redactSensitiveData(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") {
    if (typeof obj === "string") {
      // Mask any JSON strings, JWT tokens or long auth strings
      if (obj.startsWith("Bearer ") || obj.length > 100 || /eyJh|eyJp/i.test(obj)) {
        return `${obj.substring(0, 15)}...[REDACTED JWT/TOKEN]...`;
      }
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveData(item));
  }
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes("password") ||
      lowerKey.includes("secret") ||
      lowerKey === "apikey" ||
      lowerKey === "authorization" ||
      lowerKey === "cookie" ||
      lowerKey === "set-cookie" ||
      lowerKey === "token" ||
      lowerKey === "access_token" ||
      lowerKey === "refresh_token"
    ) {
      if (typeof val === "string") {
        result[key] = `${val.substring(0, Math.min(8, val.length))}... [REDACTED]`;
      } else {
        result[key] = "[REDACTED]";
      }
    } else {
      result[key] = redactSensitiveData(val);
    }
  }
  return result;
}

// Check and clean JSON response bodies to block personal or access credential leaks
function sanitizeResponseBody(text: string): string {
  if (!text) return "";
  try {
    const parsed = JSON.parse(text);
    return JSON.stringify(redactSensitiveData(parsed), null, 2).substring(0, 500);
  } catch {
    if (/token|password|secret|apikey/i.test(text)) {
      return "[REDACTED due to sensitive keywords]";
    }
    return text.substring(0, 500);
  }
}

function writeLog(message: string, data?: any) {
  try {
    const timestamp = new Date().toISOString();
    const sanitizedData = data ? redactSensitiveData(data) : undefined;
    const logMsg = `[${timestamp}] ${message} ${sanitizedData ? JSON.stringify(sanitizedData, null, 2) : ""}\n`;
    fs.appendFileSync(LOG_FILE, logMsg, "utf8");
  } catch (err) {
    console.error("Fout bij schrijven naar logbestand:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory store for session music URLs
  const sessionMusicStore: Record<string, string> = {};

  app.get("/api/session-music/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    const musicUrl = sessionMusicStore[sessionId] || "https://www.image2url.com/r2/default/audio/1781202460294-d546fcf7-83a2-4b68-9824-82d64768dffb.mp3";
    res.json({ musicUrl });
  });

  app.post("/api/session-music/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    const { musicUrl } = req.body;
    if (musicUrl) {
      sessionMusicStore[sessionId] = musicUrl;
    }
    res.json({ success: true, musicUrl: sessionMusicStore[sessionId] || "https://www.image2url.com/r2/default/audio/1781202460294-d546fcf7-83a2-4b68-9824-82d64768dffb.mp3" });
  });

  // Clean log file on boot
  try {
    fs.writeFileSync(LOG_FILE, "=== PROXY LOGS STARTED ===\n", "utf8");
  } catch {}

  // Same-Origin Reverse Proxy for Supabase REST (Postgrest) and Authentication
  app.all("/api/supabase/*", async (req, res) => {
    // Extract the relative path and query string from req.url
    const relativePart = req.url.replace(/^\/api\/supabase/, "");
    
    // Security check 1: Ensure path begins with a slash to preserve relative URL scope
    if (relativePart && !relativePart.startsWith("/")) {
      return res.status(400).json({ error: "Invalid path format: must start with a slash" });
    }

    // Security check 2: Strict prevention of directory traversal attacks escaping the sub-path
    if (relativePart.includes("../") || relativePart.includes("..\\")) {
      return res.status(400).json({ error: "Path traversal attempt detected" });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://mmztdudyztfvvoobtcwx.supabase.co";
    const targetUrl = `${supabaseUrl}${relativePart}`;

    try {
      const headers: Record<string, string> = {};
      
      // Copy incoming request headers (skipping hop-by-hop & security/compression headers)
      for (const [key, val] of Object.entries(req.headers)) {
        if (!val) continue;
        const lowerKey = key.toLowerCase();
        if (
          lowerKey === "host" || 
          lowerKey === "origin" || 
          lowerKey === "referer" ||
          lowerKey === "connection" ||
          lowerKey === "upgrade" ||
          lowerKey === "keep-alive" ||
          lowerKey === "content-length" ||
          lowerKey === "accept-encoding" ||
          lowerKey === "sec-fetch-site" ||
          lowerKey === "sec-fetch-mode" ||
          lowerKey === "sec-fetch-dest" ||
          lowerKey.startsWith("sec-ch-")
        ) {
          continue;
        }
        headers[key] = Array.isArray(val) ? val.join(", ") : val;
      }

      writeLog(`PROXY-REQ: ${req.method} ${targetUrl}`, {
        incomingHeaders: req.headers,
        forwardedHeaders: headers
      });

      // Add fallback publishable key if client headers aren't explicitly sending them
      const apiKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_7Hqc3i7W1ClgfrY4PvEvCA_5_gB-idt";
      if (!headers["apikey"]) {
        headers["apikey"] = apiKey;
      }
      if (!headers["authorization"]) {
        headers["authorization"] = `Bearer ${apiKey}`;
      }

      // Reconstruct request body if express.json parsed it
      let requestBody: any = undefined;
      if (!["GET", "HEAD"].includes(req.method)) {
        requestBody = typeof req.body === "object" ? JSON.stringify(req.body) : req.body;
      }

      // Execute request with Server-Side Fetch API (native in modern Node versions)
      const response = await fetch(targetUrl, {
        method: req.method,
        headers: headers,
        body: requestBody,
      });

      // Send response body content and keep track of status
      const text = await response.text();

      writeLog(`PROXY-RES: status=${response.status} from ${targetUrl}`, {
        responseHeaders: Object.fromEntries(response.headers.entries()),
        responseBodySnippet: sanitizeResponseBody(text)
      });
      res.status(response.status);

      // Forward response headers (excluding hop-by-hop headers and compression headers)
      response.headers.forEach((value, name) => {
        const lowerName = name.toLowerCase();
        if (
          lowerName === "transfer-encoding" || 
          lowerName === "content-encoding" || 
          lowerName === "content-length" || 
          lowerName === "connection"
        ) {
          return;
        }
        res.setHeader(name, value);
      });

      // Send the body content
      res.send(text);
    } catch (err: any) {
      console.error("[SUPABASE-PROXY-ERROR] Proxy target failed:", err);
      res.status(500).json({ error: "Supabase Proxy Failed", details: err.message });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fout bij opstarten server:", err);
});
