import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Same-Origin Reverse Proxy for Supabase REST (Postgrest) and Authentication
  app.all("/api/supabase/*", async (req, res) => {
    // Extract the relative path and query string from req.url
    const relativePart = req.url.replace(/^\/api\/supabase/, "");
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://mmztdudyztfvvoobtcwx.supabase.co";
    const targetUrl = `${supabaseUrl}${relativePart}`;

    try {
      const headers: Record<string, string> = {};
      
      // Copy incoming request headers (skipping hop-by-hop & host headers to avoid connection failure)
      for (const [key, val] of Object.entries(req.headers)) {
        if (!val) continue;
        const lowerKey = key.toLowerCase();
        if (
          lowerKey === "host" || 
          lowerKey === "origin" || 
          lowerKey === "referer" ||
          lowerKey === "connection" ||
          lowerKey === "content-length"
        ) {
          continue;
        }
        headers[key] = Array.isArray(val) ? val.join(", ") : val;
      }

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

      // Forward response status
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
      const text = await response.text();
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
