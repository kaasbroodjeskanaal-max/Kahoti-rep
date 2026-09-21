/**
 * Image upload utility for ImgBB API
 * Uploads images and returns the direct image URL.
 */

const IMGBB_CLIENT_KEY = "696dd307262986c0058019dd5f7906a5";

/**
 * Converts a File or Blob into base64 string
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
 * Uploads an image file to ImgBB and returns the direct public URL.
 * Automatically handles base64 encoding and dual-route fallback:
 * 1. Attempts server-side proxy route (/api/upload-image)
 * 2. Falls back to direct client-side browser upload if server encounters datacenter IP blocks
 */
export async function uploadImageToImgbb(file: File): Promise<string> {
  // Validate file type
  if (!file.type.startsWith("image/")) {
    throw new Error("Ongeldig bestand. Selecteer een afbeeldingsbestand (JPG, PNG, GIF, WebP, etc.).");
  }

  // 32MB file size ceiling for ImgBB
  const MAX_SIZE = 32 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error("Bestand is te groot. De maximale grootte voor ImgBB is 32 MB.");
  }

  const base64DataUrl = await fileToBase64(file);
  const cleanBase64 = base64DataUrl.replace(/^data:image\/\w+;base64,/, "");
  const fileName = file.name ? file.name.replace(/\.[^/.]+$/, "") : "uploaded_image";

  // Step 1: Attempt server proxy route first
  try {
    const serverRes = await fetch("/api/upload-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: cleanBase64,
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
    // Proceed to client fallback seamlessly
  }

  // Step 2: Direct client-side ImgBB upload
  // ImgBB API supports CORS (access-control-allow-origin: *) so browser can post directly with FormData
  const formData = new FormData();
  formData.append("image", cleanBase64);
  formData.append("name", fileName);

  const clientRes = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_CLIENT_KEY}`, {
    method: "POST",
    body: formData,
  });

  const clientJson = await clientRes.json();
  if (!clientRes.ok || !clientJson.success) {
    const errMsg = clientJson?.error?.message || clientJson?.status_txt || "Upload naar ImgBB mislukt.";
    throw new Error(errMsg);
  }

  return clientJson.data.url;
}
