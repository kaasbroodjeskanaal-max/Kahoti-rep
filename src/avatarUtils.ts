export interface AvatarItem {
  id: string;
  name: string;
  emoji: string;
  yOffset: number;
  size: number;
}

export interface GradientOption {
  id: string;
  name: string;
  stops: string[];
}

export const AVATAR_BASES: AvatarItem[] = [
  { id: "earth", name: "Aarde 🌍", emoji: "🌍", yOffset: 52, size: 52 },
  { id: "robot", name: "Robot 🤖", emoji: "🤖", yOffset: 52, size: 50 },
  { id: "ghost", name: "Geest 👻", emoji: "👻", yOffset: 52, size: 50 },
  { id: "alien", name: "Alien 👽", emoji: "👽", yOffset: 52, size: 50 },
  { id: "cat", name: "Kat 🐱", emoji: "🐱", yOffset: 54, size: 50 },
  { id: "lion", name: "Leeuw 🦁", emoji: "🦁", yOffset: 54, size: 52 },
  { id: "unicorn", name: "Eenhoorn 🦄", emoji: "🦄", yOffset: 52, size: 50 },
  { id: "star", name: "Ster ⭐", emoji: "⭐", yOffset: 50, size: 54 },
  { id: "heart", name: "Hart 💖", emoji: "💖", yOffset: 52, size: 50 },
  { id: "dino", name: "Dino 🦖", emoji: "🦖", yOffset: 54, size: 52 },
  { id: "dragon", name: "Draak 🐲", emoji: "🐲", yOffset: 52, size: 52 },
  { id: "panda", name: "Panda 🐼", emoji: "🐼", yOffset: 54, size: 50 },
  { id: "poop", name: "Keutel 💩", emoji: "💩", yOffset: 56, size: 50 },
  { id: "monkey", name: "Aap 🐵", emoji: "🐵", yOffset: 54, size: 50 },
  { id: "penguin", name: "Pinguïn 🐧", emoji: "🐧", yOffset: 52, size: 52 },
  { id: "pizza", name: "Pizza 🍕", emoji: "🍕", yOffset: 52, size: 50 },
  { id: "donut", name: "Donut 🍩", emoji: "🍩", yOffset: 52, size: 50 },
  { id: "cookie", name: "Koekje 🍪", emoji: "🍪", yOffset: 52, size: 50 },
  { id: "avocado", name: "Avocado 🥑", emoji: "🥑", yOffset: 52, size: 50 },
  { id: "soccer", name: "Voetbal ⚽", emoji: "⚽", yOffset: 50, size: 52 },
  { id: "moneybag", name: "Geldzak 💰", emoji: "💰", yOffset: 54, size: 50 },
  { id: "lightning", name: "Bliksem ⚡", emoji: "⚡", yOffset: 50, size: 52 },
  { id: "hamburger", name: "Burger 🍔", emoji: "🍔", yOffset: 52, size: 50 },
  { id: "rose", name: "Roos 🌹", emoji: "🌹", yOffset: 50, size: 50 },
  { id: "turtle", name: "Schildpad 🐢", emoji: "🐢", yOffset: 54, size: 52 },
];

export const AVATAR_HATS: AvatarItem[] = [
  { id: "none", name: "Geen Hoofddeksel", emoji: "", yOffset: 0, size: 0 },
  { id: "crown", name: "Kroon 👑", emoji: "👑", yOffset: 20, size: 34 },
  { id: "tophat", name: "Hoge Hoed 🎩", emoji: "🎩", yOffset: 20, size: 34 },
  { id: "cap", name: "Stoere Cap 🧢", emoji: "🧢", yOffset: 21, size: 32 },
  { id: "grad", name: "Studiehoed 🎓", emoji: "🎓", yOffset: 21, size: 34 },
  { id: "helmet", name: "Helm 🪖", emoji: "🪖", yOffset: 22, size: 32 },
  { id: "ribbon", name: "Roze Strik 🎀", emoji: "🎀", yOffset: 21, size: 32 },
  { id: "tree", name: "Kerstboom Muts 🎄", emoji: "🎄", yOffset: 16, size: 36 },
  { id: "music", name: "Muzieknoot 🎵", emoji: "🎵", yOffset: 18, size: 28 },
  { id: "bulb", name: "Gloeilamp Ideetje 💡", emoji: "💡", yOffset: 18, size: 30 },
  { id: "halo", name: "Aureool 💫", emoji: "💫", yOffset: 16, size: 32 },
  { id: "fire", name: "Vuurgloed 🔥", emoji: "🔥", yOffset: 16, size: 32 },
  { id: "balloon", name: "Ballon 🎈", emoji: "🎈", yOffset: 16, size: 32 },
];

export const AVATAR_ACCESSORIES: AvatarItem[] = [
  { id: "none", name: "Geen Accessoire", emoji: "", yOffset: 0, size: 0 },
  { id: "sunglasses", name: "Zonnebril 🕶️", emoji: "🕶️", yOffset: 54, size: 28 },
  { id: "glasses", name: "Nerdbril ⛑️", emoji: "👓", yOffset: 54, size: 28 },
  { id: "vr", name: "VR-Bril 🥽", emoji: "🥽", yOffset: 54, size: 28 },
  { id: "bandage", name: "Pleister 🩹", emoji: "🩹", yOffset: 60, size: 22 },
  { id: "disguise", name: "Snor & Bril 🥸", emoji: "🥸", yOffset: 56, size: 36 },
  { id: "sparkles", name: "Sterretjes ✨", emoji: "✨", yOffset: 52, size: 28 },
  { id: "hearts", name: "Hartjes 💕", emoji: "💕", yOffset: 48, size: 28 },
  { id: "catwhisker", name: "Snorrebaard 〰️", emoji: "〰️", yOffset: 62, size: 24 },
];

export const AVATAR_GRADIENTS: GradientOption[] = [
  { id: "indigo", name: "Koningsblauw", stops: ["#818cf8", "#4f46e5"] },
  { id: "sunset", name: "Zonsondergang", stops: ["#f43f5e", "#fb923c"] },
  { id: "emerald", name: "Smaragdgroen", stops: ["#2dd4bf", "#0d9488"] },
  { id: "cosmic", name: "Kosmisch Paars", stops: ["#ec4899", "#8b5cf6"] },
  { id: "lavender", name: "Lavendel", stops: ["#a78bfa", "#6d28d9"] },
  { id: "flame", name: "Vurige Gloed", stops: ["#f59e0b", "#dc2626"] },
  { id: "mint", name: "Frisse Munt", stops: ["#34d399", "#059669"] },
  { id: "cyberpunk", name: "Cyberpunk", stops: ["#06b6d4", "#d946ef"] },
  { id: "slate", name: "Cool Metal", stops: ["#64748b", "#334155"] },
];

export function getAvatarUrl(name: string, baseIdx: number, hatIdx: number, accIdx: number, gradIdx: number = 0) {
  const base = AVATAR_BASES[baseIdx] || AVATAR_BASES[0];
  const hat = AVATAR_HATS[hatIdx] || AVATAR_HATS[0];
  const acc = AVATAR_ACCESSORIES[accIdx] || AVATAR_ACCESSORIES[0];
  const grad = AVATAR_GRADIENTS[gradIdx] || AVATAR_GRADIENTS[0];

  const stops = grad.stops;
  
  // Custom SVG outputted inline as a fast, premium SVG Data URI with clean emoji stacking
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
    <defs>
      <linearGradient id="avatarGrad-${gradIdx}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${stops[0]}" />
        <stop offset="100%" stop-color="${stops[1]}" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="46" fill="url(#avatarGrad-${gradIdx})" stroke="#ffffff" stroke-width="3" />
    
    <!-- Base Emoji Object -->
    ${base.emoji ? `<text x="50" y="${base.yOffset}" font-size="${base.size}" text-anchor="middle" dominant-baseline="middle" style="user-select: none;">${base.emoji}</text>` : ""}
    
    <!-- Accessories Overlay -->
    ${acc.emoji ? `<text x="50" y="${acc.yOffset}" font-size="${acc.size}" text-anchor="middle" dominant-baseline="middle" style="user-select: none;">${acc.emoji}</text>` : ""}
    
    <!-- Hat Overlay -->
    ${hat.emoji ? `<text x="50" y="${hat.yOffset}" font-size="${hat.size}" text-anchor="middle" dominant-baseline="middle" style="user-select: none;">${hat.emoji}</text>` : ""}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Decodes a combined rawNickname like: "KaasKoning:::3|4|1|2" or falls back
export function parseNicknameAndAvatar(rawNickname: string) {
  if (!rawNickname || !rawNickname.includes(":::")) {
    const name = rawNickname || "Speler";
    return {
      displayName: name,
      avatarUrl: getAvatarUrl(name, 0, 0, 0, 0)
    };
  }

  const [name, avatarCode] = rawNickname.split(":::", 2);
  const parts = avatarCode.split("|").map(Number);
  const baseIdx = parts[0] || 0;
  const hatIdx = parts[1] || 0;
  const accIdx = parts[2] || 0;
  const gradIdx = parts[3] || 0;

  return {
    displayName: name,
    avatarUrl: getAvatarUrl(name, baseIdx, hatIdx, accIdx, gradIdx)
  };
}
