/**
 * Image upload utility for Kahoot quiz app
 * Uploads images and returns the direct image URL.
 * Supports server-side uploads to /uploads/ with automatic fallback.
 */

/**
 * Converts a File or Blob into base64 data URL
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Kon bestand niet converteren naar base64"));
      }
    };
    reader.onerror = () => reject(reader.error || new Error("Bestandsleesfout"));
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an image in the browser using HTML5 Canvas for optimal loading speed.
 */
function compressImage(file: File, maxDim = 1600, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    // If SVG or GIF, don't re-encode via canvas to preserve animation/vector quality
    if (file.type === "image/svg+xml" || file.type === "image/gif") {
      fileToBase64(file).then(resolve).catch(() => resolve(""));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string || "");
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Use JPEG for photographic formats, preserve PNG transparency if PNG
        const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve(dataUrl);
      };
      img.onerror = () => {
        resolve(e.target?.result as string || "");
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads an image file to the server and returns the direct public URL.
 * Automatically tries:
 * 1. Server route /api/upload-image
 * 2. Alternative server route /upload-image
 * 3. Client-side compressed Data URL fallback
 */
export async function uploadImageToImgbb(file: File): Promise<string> {
  // Validate file type
  if (!file.type.startsWith("image/")) {
    throw new Error("Ongeldig bestand. Selecteer een afbeeldingsbestand (JPG, PNG, GIF, WebP, SVG).");
  }

  // 32MB file size ceiling
  const MAX_SIZE = 32 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error("Bestand is te groot. De maximale grootte is 32 MB.");
  }

  const fileName = file.name ? file.name.replace(/\.[^/.]+$/, "") : "uploaded_image";
  const optimizedDataUrl = await compressImage(file);
  const base64Payload = optimizedDataUrl || (await fileToBase64(file));

  // Step 1: Attempt primary server route (/api/upload-image)
  try {
    const serverRes = await fetch("/api/upload-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: base64Payload,
        name: fileName,
      }),
    });

    if (serverRes.ok) {
      const serverJson = await serverRes.json();
      if (serverJson.url) {
        return serverJson.url;
      }
    }
  } catch {
    // Continue to next endpoint fallback
  }

  // Step 2: Attempt alternative server route (/upload-image)
  try {
    const altRes = await fetch("/upload-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: base64Payload,
        name: fileName,
      }),
    });

    if (altRes.ok) {
      const altJson = await altRes.json();
      if (altJson.url) {
        return altJson.url;
      }
    }
  } catch {
    // Continue to final fallback
  }

  // Step 3: Self-contained Data URL fallback (guarantees image display even if offline/proxy issue)
  if (base64Payload) {
    return base64Payload;
  }

  throw new Error("Afbeelding kon niet worden verwerkt. Probeer een ander bestand.");
}
