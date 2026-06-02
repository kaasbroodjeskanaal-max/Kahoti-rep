import React from "react";

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
  { id: "glasses", name: "Nerdbril 👓", emoji: "👓", yOffset: 54, size: 28 },
  { id: "vr", name: "VR-Bril 🥽", emoji: "🥽", yOffset: 54, size: 28 },
  { id: "headphones", name: "Koptelefoon 🎧", emoji: "🎧", yOffset: 54, size: 28 },
  { id: "bandage", name: "Pleister 🩹", emoji: "🩹", yOffset: 60, size: 22 },
  { id: "disguise", name: "Glitter 🌟", emoji: "🌟", yOffset: 56, size: 28 },
  { id: "sparkles", name: "Sterretjes ✨", emoji: "✨", yOffset: 52, size: 28 },
  { id: "hearts", name: "Hartjes 💕", emoji: "💕", yOffset: 48, size: 28 },
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

export function getAvatarAdjustments(baseId: string) {
  const adjs: Record<string, { hatX?: number; hatY?: number; hatSize?: number; accX?: number; accY?: number; accSize?: number }> = {
    robot: { accY: 51 },
    ghost: { hatY: 18, accY: 46 },
    alien: { hatY: 18, accY: 48, accSize: 32 },
    cat: { hatY: 18, hatSize: 26, accY: 52, accSize: 26 },
    lion: { hatY: 18, hatSize: 26, accY: 52 },
    unicorn: { hatX: 58, hatY: 22, hatSize: 24, accX: 42, accY: 48, accSize: 26 },
    star: { hatY: 15, hatSize: 24, accY: 50 },
    heart: { hatY: 16, hatSize: 24, accY: 48 },
    dino: { hatX: 44, hatY: 26, hatSize: 24, accX: 38, accY: 42, accSize: 24 },
    dragon: { hatY: 16, hatSize: 26, accY: 54 },
    panda: { hatY: 19, hatSize: 26, accY: 54, accSize: 26 },
    poop: { hatY: 22, hatSize: 24, accY: 62, accSize: 26 },
    monkey: { hatY: 20, accY: 50 },
    penguin: { hatY: 20, accY: 46, accSize: 26 },
    pizza: { hatY: 14, hatSize: 22, accY: 54 },
    donut: { hatY: 20, accY: 48 },
    cookie: { hatY: 20, accY: 48 },
    avocado: { hatY: 16, hatSize: 24, accY: 44, accSize: 26 },
    soccer: { hatY: 18, accY: 48 },
    lightning: { hatY: 14, hatSize: 24, accY: 48 },
    hamburger: { hatY: 20, accY: 48 },
    rose: { hatY: 14, hatSize: 24, accY: 48 },
    turtle: { hatX: 36, hatY: 22, hatSize: 24, accX: 32, accY: 40, accSize: 24 },
  };
  return adjs[baseId] || {};
}

export function getAvatarUrl(
  name: string,
  baseIdx: number,
  hatIdx: number,
  accIdx: number,
  gradIdx: number = 0,
  customHatXOffset: number = 0,
  customHatYOffset: number = 0,
  customHatSizeDelta: number = 0,
  customAccXOffset: number = 0,
  customAccYOffset: number = 0,
  customAccSizeDelta: number = 0
) {
  const base = AVATAR_BASES[baseIdx] || AVATAR_BASES[0];
  const hat = AVATAR_HATS[hatIdx] || AVATAR_HATS[0];
  const acc = AVATAR_ACCESSORIES[accIdx] || AVATAR_ACCESSORIES[0];
  const grad = AVATAR_GRADIENTS[gradIdx] || AVATAR_GRADIENTS[0];

  const stops = grad.stops;
  
  const adj = getAvatarAdjustments(base.id);
  const hatX = (adj.hatX !== undefined ? adj.hatX : 50) + customHatXOffset;
  const hatY = (adj.hatY !== undefined ? adj.hatY : hat.yOffset) + customHatYOffset;
  const hatSize = Math.max(5, (adj.hatSize !== undefined ? adj.hatSize : hat.size) + customHatSizeDelta);
  const accX = (adj.accX !== undefined ? adj.accX : 50) + customAccXOffset;
  const accY = (adj.accY !== undefined ? adj.accY : acc.yOffset) + customAccYOffset;
  const accSize = Math.max(5, (adj.accSize !== undefined ? adj.accSize : acc.size) + customAccSizeDelta);
  
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
    ${acc.emoji ? `<text x="${accX}" y="${accY}" font-size="${accSize}" text-anchor="middle" dominant-baseline="middle" style="user-select: none;">${acc.emoji}</text>` : ""}
    
    <!-- Hat Overlay -->
    ${hat.emoji ? `<text x="${hatX}" y="${hatY}" font-size="${hatSize}" text-anchor="middle" dominant-baseline="middle" style="user-select: none;">${hat.emoji}</text>` : ""}
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
  const parts = avatarCode ? avatarCode.split("|").map(Number) : [];
  const baseIdx = !parts[0] || isNaN(parts[0]) ? 0 : parts[0];
  const hatIdx = !parts[1] || isNaN(parts[1]) ? 0 : parts[1];
  const accIdx = !parts[2] || isNaN(parts[2]) ? 0 : parts[2];
  const gradIdx = !parts[3] || isNaN(parts[3]) ? 0 : parts[3];

  const hX = isNaN(parts[4]) ? 0 : parts[4];
  const hY = isNaN(parts[5]) ? 0 : parts[5];
  const hS = isNaN(parts[6]) ? 0 : parts[6];
  const aX = isNaN(parts[7]) ? 0 : parts[7];
  const aY = isNaN(parts[8]) ? 0 : parts[8];
  const aS = isNaN(parts[9]) ? 0 : parts[9];

  return {
    displayName: name,
    avatarUrl: getAvatarUrl(name, baseIdx, hatIdx, accIdx, gradIdx, hX, hY, hS, aX, aY, aS)
  };
}

export function ShapeIcon({ idx, className = "w-6 h-6 shrink-0 fill-current" }: { idx: number; className?: string }) {
  if (idx === 0) {
    return React.createElement(
      "svg",
      { className, viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg" },
      React.createElement("polygon", { points: "12,3 2,21 22,21" })
    );
  }
  if (idx === 1) {
    return React.createElement(
      "svg",
      { className, viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg" },
      React.createElement("polygon", { points: "12,2 22,12 12,22 2,12" })
    );
  }
  if (idx === 2) {
    return React.createElement(
      "svg",
      { className, viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg" },
      React.createElement("circle", { cx: "12", cy: "12", r: "10" })
    );
  }
  return React.createElement(
    "svg",
    { className, viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg" },
    React.createElement("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" })
  );
}
