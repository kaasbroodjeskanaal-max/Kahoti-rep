import React from "react";

export interface AvatarItem {
  id: string;
  name: string;
  emoji: string;
  yOffset: number;
  size: number;
  category?: "animals" | "food" | "gaming" | "magic";
}

export interface GradientOption {
  id: string;
  name: string;
  stops: string[];
}

export const AVATAR_BASES: AvatarItem[] = [
  // Animals (Originals + New)
  { id: "earth", name: "Aarde 🌍", emoji: "🌍", yOffset: 52, size: 52, category: "gaming" },
  { id: "robot", name: "Robot 🤖", emoji: "🤖", yOffset: 52, size: 50, category: "gaming" },
  { id: "ghost", name: "Geest 👻", emoji: "👻", yOffset: 52, size: 50, category: "magic" },
  { id: "alien", name: "Alien 👽", emoji: "👽", yOffset: 52, size: 50, category: "magic" },
  { id: "cat", name: "Kat 🐱", emoji: "🐱", yOffset: 54, size: 50, category: "animals" },
  { id: "lion", name: "Leeuw 🦁", emoji: "🦁", yOffset: 54, size: 52, category: "animals" },
  { id: "unicorn", name: "Eenhoorn 🦄", emoji: "🦄", yOffset: 52, size: 50, category: "magic" },
  { id: "star", name: "Ster ⭐", emoji: "⭐", yOffset: 50, size: 54, category: "magic" },
  { id: "heart", name: "Hart 💖", emoji: "💖", yOffset: 52, size: 50, category: "magic" },
  { id: "dino", name: "Dino 🦖", emoji: "🦖", yOffset: 54, size: 52, category: "animals" },
  { id: "dragon", name: "Draak 🐲", emoji: "🐲", yOffset: 52, size: 52, category: "animals" },
  { id: "panda", name: "Panda 🐼", emoji: "🐼", yOffset: 54, size: 50, category: "animals" },
  { id: "poop", name: "Keutel 💩", emoji: "💩", yOffset: 56, size: 50, category: "magic" },
  { id: "monkey", name: "Aap 🐵", emoji: "🐵", yOffset: 54, size: 50, category: "animals" },
  { id: "penguin", name: "Pinguïn 🐧", emoji: "🐧", yOffset: 52, size: 52, category: "animals" },
  { id: "pizza", name: "Pizza 🍕", emoji: "🍕", yOffset: 52, size: 50, category: "food" },
  { id: "donut", name: "Donut 🍩", emoji: "🍩", yOffset: 52, size: 50, category: "food" },
  { id: "cookie", name: "Koekje 🍪", emoji: "🍪", yOffset: 52, size: 50, category: "food" },
  { id: "avocado", name: "Avocado 🥑", emoji: "🥑", yOffset: 52, size: 50, category: "food" },
  { id: "soccer", name: "Voetbal ⚽", emoji: "⚽", yOffset: 50, size: 52, category: "gaming" },
  { id: "moneybag", name: "Geldzak 💰", emoji: "💰", yOffset: 54, size: 50, category: "gaming" },
  { id: "lightning", name: "Bliksem ⚡", emoji: "⚡", yOffset: 50, size: 52, category: "gaming" },
  { id: "hamburger", name: "Burger 🍔", emoji: "🍔", yOffset: 52, size: 50, category: "food" },
  { id: "rose", name: "Roos 🌹", emoji: "🌹", yOffset: 50, size: 50, category: "magic" },
  { id: "turtle", name: "Schildpad 🐢", emoji: "🐢", yOffset: 54, size: 52, category: "animals" },
  { id: "cheese", name: "Kaasje 🧀", emoji: "🧀", yOffset: 52, size: 50, category: "food" },
  { id: "fox", name: "Vos 🦊", emoji: "🦊", yOffset: 54, size: 50, category: "animals" },
  { id: "bear", name: "Beer 🐻", emoji: "🐻", yOffset: 54, size: 50, category: "animals" },
  { id: "bunny", name: "Haas 🐰", emoji: "🐰", yOffset: 54, size: 50, category: "animals" },
  { id: "tiger", name: "Tijger 🐯", emoji: "🐯", yOffset: 54, size: 50, category: "animals" },
  { id: "dog", name: "Hond 🐶", emoji: "🐶", yOffset: 54, size: 50, category: "animals" },
  // Extra Animals
  { id: "wolf", name: "Wolf 🐺", emoji: "🐺", yOffset: 54, size: 50, category: "animals" },
  { id: "koala", name: "Koala 🐨", emoji: "🐨", yOffset: 54, size: 50, category: "animals" },
  { id: "frog", name: "Kikker 🐸", emoji: "🐸", yOffset: 54, size: 50, category: "animals" },
  { id: "octopus", name: "Octopus 🐙", emoji: "🐙", yOffset: 52, size: 50, category: "animals" },
  { id: "dolphin", name: "Dolfijn 🐬", emoji: "🐬", yOffset: 52, size: 50, category: "animals" },
  { id: "shark", name: "Haai 🦈", emoji: "🦈", yOffset: 52, size: 50, category: "animals" },
  { id: "owl", name: "Uil 🦉", emoji: "🦉", yOffset: 54, size: 50, category: "animals" },
  { id: "butterfly", name: "Vlinder 🦋", emoji: "🦋", yOffset: 52, size: 50, category: "animals" },
  { id: "bee", name: "Bij 🐝", emoji: "🐝", yOffset: 52, size: 50, category: "animals" },
  { id: "flamingo", name: "Flamingo 🦩", emoji: "🦩", yOffset: 52, size: 50, category: "animals" },
  { id: "hedgehog", name: "Egel 🦔", emoji: "🦔", yOffset: 54, size: 50, category: "animals" },
  { id: "giraffe", name: "Giraffe 🦒", emoji: "🦒", yOffset: 52, size: 52, category: "animals" },
  { id: "duck", name: "Eend 🦆", emoji: "🦆", yOffset: 52, size: 50, category: "animals" },
  { id: "crab", name: "Krab 🦀", emoji: "🦀", yOffset: 54, size: 50, category: "animals" },
  { id: "peacock", name: "Pauw 🦚", emoji: "🦚", yOffset: 52, size: 50, category: "animals" },
  // Extra Food
  { id: "fries", name: "Frietjes 🍟", emoji: "🍟", yOffset: 52, size: 50, category: "food" },
  { id: "taco", name: "Taco 🌮", emoji: "🌮", yOffset: 52, size: 50, category: "food" },
  { id: "popcorn", name: "Popcorn 🍿", emoji: "🍿", yOffset: 52, size: 50, category: "food" },
  { id: "icecream", name: "IJsje 🍦", emoji: "🍦", yOffset: 52, size: 50, category: "food" },
  { id: "watermelon", name: "Watermeloen 🍉", emoji: "🍉", yOffset: 52, size: 50, category: "food" },
  { id: "strawberry", name: "Aardbei 🍓", emoji: "🍓", yOffset: 52, size: 50, category: "food" },
  { id: "chocolate", name: "Chocolade 🍫", emoji: "🍫", yOffset: 52, size: 50, category: "food" },
  { id: "pancake", name: "Pannenkoek 🥞", emoji: "🥞", yOffset: 54, size: 50, category: "food" },
  { id: "sushi", name: "Sushi 🍣", emoji: "🍣", yOffset: 54, size: 50, category: "food" },
  { id: "pretzel", name: "Pretzel 🥨", emoji: "🥨", yOffset: 52, size: 50, category: "food" },
  { id: "cupcake", name: "Cupcake 🧁", emoji: "🧁", yOffset: 52, size: 50, category: "food" },
  { id: "hotdog", name: "Hotdog 🌭", emoji: "🌭", yOffset: 52, size: 50, category: "food" },
  { id: "pineapple", name: "Ananas 🍍", emoji: "🍍", yOffset: 52, size: 50, category: "food" },
  { id: "croissant", name: "Croissant 🥐", emoji: "🥐", yOffset: 52, size: 50, category: "food" },
  // Extra Gaming, Sport & Tech
  { id: "gamepad", name: "Gamepad 🎮", emoji: "🎮", yOffset: 52, size: 50, category: "gaming" },
  { id: "joystick", name: "Joystick 🕹️", emoji: "🕹️", yOffset: 52, size: 50, category: "gaming" },
  { id: "basketball", name: "Basketbal 🏀", emoji: "🏀", yOffset: 50, size: 52, category: "gaming" },
  { id: "tennis", name: "Tennis 🎾", emoji: "🎾", yOffset: 50, size: 52, category: "gaming" },
  { id: "skateboard", name: "Skateboard 🛹", emoji: "🛹", yOffset: 52, size: 50, category: "gaming" },
  { id: "racecar", name: "Raceauto 🏎️", emoji: "🏎️", yOffset: 52, size: 50, category: "gaming" },
  { id: "rocket", name: "Raket 🚀", emoji: "🚀", yOffset: 50, size: 52, category: "gaming" },
  { id: "trophy_base", name: "Beker 🏆", emoji: "🏆", yOffset: 52, size: 50, category: "gaming" },
  { id: "boxing", name: "Bokshandschoen 🥊", emoji: "🥊", yOffset: 52, size: 50, category: "gaming" },
  { id: "target", name: "Dartbord 🎯", emoji: "🎯", yOffset: 52, size: 50, category: "gaming" },
  { id: "dice_base", name: "Dobbelsteen 🎲", emoji: "🎲", yOffset: 52, size: 50, category: "gaming" },
  { id: "guitar", name: "Gitaar 🎸", emoji: "🎸", yOffset: 52, size: 50, category: "gaming" },
  { id: "ufo", name: "UFO 🛸", emoji: "🛸", yOffset: 52, size: 50, category: "gaming" },
  // Extra Magic, Fun & Symbols
  { id: "fire_base", name: "Vuur 🔥", emoji: "🔥", yOffset: 52, size: 50, category: "magic" },
  { id: "diamond_base", name: "Diamant 💎", emoji: "💎", yOffset: 52, size: 50, category: "magic" },
  { id: "crystal_ball", name: "Kristallen Bol 🔮", emoji: "🔮", yOffset: 52, size: 50, category: "magic" },
  { id: "rainbow", name: "Regenboog 🌈", emoji: "🌈", yOffset: 52, size: 50, category: "magic" },
  { id: "clover", name: "Klavertje 🍀", emoji: "🍀", yOffset: 52, size: 50, category: "magic" },
  { id: "crown_base", name: "Kroon 👑", emoji: "👑", yOffset: 52, size: 50, category: "magic" },
  { id: "boom", name: "Explosie 💥", emoji: "💥", yOffset: 52, size: 50, category: "magic" },
  { id: "sun", name: "Zon ☀️", emoji: "☀️", yOffset: 50, size: 52, category: "magic" },
  { id: "moon", name: "Maan 🌙", emoji: "🌙", yOffset: 52, size: 50, category: "magic" },
  { id: "palette", name: "Verf 🎨", emoji: "🎨", yOffset: 52, size: 50, category: "magic" },
  { id: "wand_base", name: "Toverstaf 🪄", emoji: "🪄", yOffset: 52, size: 50, category: "magic" },
  { id: "pumpkin", name: "Pompoen 🎃", emoji: "🎃", yOffset: 52, size: 50, category: "magic" },
  { id: "skull", name: "Schedel 💀", emoji: "💀", yOffset: 52, size: 50, category: "magic" },
  { id: "pixel_monster", name: "Pixel Monster 👾", emoji: "👾", yOffset: 52, size: 50, category: "magic" },
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
  // Extra Hats
  { id: "cowboy", name: "Cowboyhoed 🤠", emoji: "🤠", yOffset: 20, size: 34 },
  { id: "party", name: "Feestmuts 🥳", emoji: "🥳", yOffset: 20, size: 34 },
  { id: "santa", name: "Kerstmuts 🎅", emoji: "🎅", yOffset: 18, size: 34 },
  { id: "sunhat", name: "Zonnehoed 👒", emoji: "👒", yOffset: 20, size: 34 },
  { id: "flower", name: "Bloem 🌸", emoji: "🌸", yOffset: 18, size: 30 },
  { id: "mushroom", name: "Paddenstoel 🍄", emoji: "🍄", yOffset: 18, size: 32 },
  { id: "ninja", name: "Ninja 🥷", emoji: "🥷", yOffset: 20, size: 34 },
  { id: "sunflower", name: "Zonnebloem 🌻", emoji: "🌻", yOffset: 18, size: 32 },
  { id: "star_hat", name: "Glansster 🌟", emoji: "🌟", yOffset: 16, size: 32 },
  { id: "snorkel", name: "Duikbril 🤿", emoji: "🤿", yOffset: 22, size: 32 },
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
  // Extra Accessories
  { id: "diamond_acc", name: "Diamant 💎", emoji: "💎", yOffset: 54, size: 26 },
  { id: "lollipop", name: "Lolly 🍭", emoji: "🍭", yOffset: 54, size: 28 },
  { id: "wand_acc", name: "Toverstaf 🪄", emoji: "🪄", yOffset: 52, size: 28 },
  { id: "trophy_acc", name: "Trofee 🏆", emoji: "🏆", yOffset: 54, size: 28 },
  { id: "shield", name: "Schild 🛡️", emoji: "🛡️", yOffset: 54, size: 28 },
  { id: "popcorn_acc", name: "Popcorn 🍿", emoji: "🍿", yOffset: 54, size: 28 },
  { id: "boba", name: "Boba Thee 🧋", emoji: "🧋", yOffset: 54, size: 28 },
  { id: "coin", name: "Gouden Munt 🪙", emoji: "🪙", yOffset: 54, size: 26 },
  { id: "lightning_acc", name: "Energie ⚡", emoji: "⚡", yOffset: 52, size: 28 },
  { id: "gamepad_acc", name: "Gamer Pad 🎮", emoji: "🎮", yOffset: 54, size: 28 },
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
  { id: "gold", name: "Warm Goud", stops: ["#fde047", "#eab308"] },
  { id: "slate", name: "Cool Metal", stops: ["#64748b", "#334155"] },
];

export interface AvatarPreset {
  id: string;
  name: string;
  category: "all" | "christmas" | "animals" | "scifi" | "food" | "heroes";
  emojiBadge: string;
  baseIdx: number;
  hatIdx: number;
  accIdx: number;
  gradIdx: number;
  suggestedName: string;
  tagline: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  // 🎄 Kerstmis Event Presets
  { id: "santa_claus", name: "Kerstman", category: "christmas", emojiBadge: "🎅✨", baseIdx: 27, hatIdx: 15, accIdx: 7, gradIdx: 5, suggestedName: "Kerstman", tagline: "Brengt cadeautjes en de hoogste scores!" },
  { id: "rudolf_reindeer", name: "Rudolf Rendier", category: "christmas", emojiBadge: "🦌🔴", baseIdx: 26, hatIdx: 17, accIdx: 14, gradIdx: 2, suggestedName: "RudolfRendier", tagline: "Leidt de groep met een felrode neus!" },
  { id: "christmas_tree", name: "Kerstboom", category: "christmas", emojiBadge: "🎄⭐", baseIdx: 43, hatIdx: 7, accIdx: 7, gradIdx: 2, suggestedName: "Kerstboom", tagline: "Schittert met duizend gouden lichtjes" },
  { id: "frosty_snowman", name: "Frosty Sneeuwpop", category: "christmas", emojiBadge: "⛄🎩", baseIdx: 34, hatIdx: 2, accIdx: 1, gradIdx: 0, suggestedName: "FrostySneeuw", tagline: "Houdt het hoofd ijskoud en gefocust" },
  { id: "christmas_elf", name: "Vrolijke Kerstelf", category: "christmas", emojiBadge: "🧝🎁", baseIdx: 13, hatIdx: 14, accIdx: 10, gradIdx: 2, suggestedName: "KerstElf", tagline: "Maakt razendsnel de juiste antwoorden klaar" },
  { id: "gingerbread_champ", name: "Kerstkoekje", category: "christmas", emojiBadge: "🍪🎅", baseIdx: 17, hatIdx: 15, accIdx: 11, gradIdx: 8, suggestedName: "GemberKoek", tagline: "Knapperig, feestelijk en niet te stoppen" },

  // Animals
  { id: "king_lion", name: "Koning Leeuw", category: "animals", emojiBadge: "🦁👑", baseIdx: 5, hatIdx: 1, accIdx: 0, gradIdx: 8, suggestedName: "KoningLeeuw", tagline: "Onbetwiste heerser van het speelveld" },
  { id: "cool_dino", name: "Dino Baas", category: "animals", emojiBadge: "🦖🕶️", baseIdx: 9, hatIdx: 3, accIdx: 1, gradIdx: 2, suggestedName: "DinoBoss", tagline: "Oersterk en super relaxed" },
  { id: "gamer_cat", name: "Gamer Kat", category: "animals", emojiBadge: "🐱🎧", baseIdx: 4, hatIdx: 0, accIdx: 4, gradIdx: 4, suggestedName: "GamerKat", tagline: "Superscherpe reflexen en chille beats" },
  { id: "golden_monkey", name: "Goud Aapje", category: "animals", emojiBadge: "🐵🎩", baseIdx: 13, hatIdx: 2, accIdx: 0, gradIdx: 8, suggestedName: "GoudenAap", tagline: "Slingert direct door naar de top" },
  { id: "chill_panda", name: "Chille Panda", category: "animals", emojiBadge: "🐼🕶️", baseIdx: 11, hatIdx: 0, accIdx: 1, gradIdx: 6, suggestedName: "ChillePanda", tagline: "Helemaal zen op weg naar goud" },
  { id: "frosty_penguin", name: "Frosty Pinguïn", category: "animals", emojiBadge: "🐧🧢", baseIdx: 14, hatIdx: 3, accIdx: 0, gradIdx: 0, suggestedName: "Frosty", tagline: "Houdt altijd het hoofd koel" },
  { id: "ninja_fox", name: "Ninja Vos", category: "animals", emojiBadge: "🦊✨", baseIdx: 26, hatIdx: 0, accIdx: 7, gradIdx: 5, suggestedName: "NinjaVos", tagline: "Snel, sluw en altijd raak" },
  { id: "teddy_king", name: "Knuffel Beer", category: "animals", emojiBadge: "🐻👑", baseIdx: 27, hatIdx: 1, accIdx: 8, gradIdx: 4, suggestedName: "KnuffelBeer", tagline: "Zachtaardig maar onverslaanbaar" },
  { id: "turbo_bunny", name: "Turbo Haas", category: "animals", emojiBadge: "🐰🕶️", baseIdx: 28, hatIdx: 3, accIdx: 1, gradIdx: 2, suggestedName: "TurboHaas", tagline: "Reageert sneller dan het geluid" },
  { id: "koala_chill", name: "Chill Koala", category: "animals", emojiBadge: "🐨👑", baseIdx: 32, hatIdx: 1, accIdx: 1, gradIdx: 6, suggestedName: "KoalaKoning", tagline: "Vriendelijk en rustig naar de winst" },
  { id: "frog_party", name: "Party Kikker", category: "animals", emojiBadge: "🐸🥳", baseIdx: 33, hatIdx: 14, accIdx: 0, gradIdx: 2, suggestedName: "PartyFrog", tagline: "Springt feestend over alle scores heen" },
  { id: "wolf_leader", name: "Alfa Wolf", category: "animals", emojiBadge: "🐺🔥", baseIdx: 31, hatIdx: 11, accIdx: 17, gradIdx: 5, suggestedName: "AlfaWolf", tagline: "Leidt de troep met scherpe intelligentie" },

  // Sci-Fi & Fantasie
  { id: "cyber_robot", name: "Cyber Bot", category: "scifi", emojiBadge: "🤖🥽", baseIdx: 1, hatIdx: 0, accIdx: 3, gradIdx: 7, suggestedName: "CyberBot", tagline: "Bliksemsnelle computerberekeningen" },
  { id: "magic_unicorn", name: "Sterren Eenhoorn", category: "scifi", emojiBadge: "🦄💫", baseIdx: 6, hatIdx: 10, accIdx: 7, gradIdx: 3, suggestedName: "MagieEenhoorn", tagline: "Glinstert naar de eerste plek" },
  { id: "professor_alien", name: "Alien Prof", category: "scifi", emojiBadge: "👽🎓", baseIdx: 3, hatIdx: 4, accIdx: 2, gradIdx: 6, suggestedName: "AlienBrein", tagline: "Weet antwoorden uit andere dimensies" },
  { id: "fire_dragon", name: "Vuurdraak", category: "scifi", emojiBadge: "🐲🔥", baseIdx: 10, hatIdx: 11, accIdx: 0, gradIdx: 5, suggestedName: "DrakenVuur", tagline: "Verbrandt elke moeilijke vraag" },
  { id: "lucky_ghost", name: "Spookje", category: "scifi", emojiBadge: "👻💫", baseIdx: 2, hatIdx: 10, accIdx: 7, gradIdx: 3, suggestedName: "SpookKoning", tagline: "Zweeft geruisloos naar de zege" },
  { id: "diamond_spark", name: "Diamant Magie", category: "scifi", emojiBadge: "💎✨", baseIdx: 74, hatIdx: 21, accIdx: 9, gradIdx: 3, suggestedName: "DiamantBrein", tagline: "Fonkelend meesterbrein van het spel" },
  { id: "ufo_pilot", name: "UFO Piloot", category: "scifi", emojiBadge: "🛸👾", baseIdx: 72, hatIdx: 0, accIdx: 3, gradIdx: 7, suggestedName: "UFOPiloot", tagline: "Komt uit het heelal om te domineren" },

  // Eten & Fun
  { id: "cheese_boss", name: "Kaasbaas", category: "food", emojiBadge: "🧀👑", baseIdx: 25, hatIdx: 1, accIdx: 0, gradIdx: 8, suggestedName: "Kaasbaas", tagline: "De lekkerste en slimste quizbaas" },
  { id: "party_pizza", name: "Feest Pizza", category: "food", emojiBadge: "🍕🎈", baseIdx: 15, hatIdx: 12, accIdx: 0, gradIdx: 1, suggestedName: "PizzaParty", tagline: "Altijd in voor een feestelijke winst" },
  { id: "avocado_pro", name: "Turbo Avocado", category: "food", emojiBadge: "🥑🕶️", baseIdx: 18, hatIdx: 3, accIdx: 1, gradIdx: 2, suggestedName: "TurboAvocado", tagline: "Boordevol gezonde quizenergie" },
  { id: "donut_king", name: "Donut Koning", category: "food", emojiBadge: "🍩👑", baseIdx: 16, hatIdx: 1, accIdx: 0, gradIdx: 1, suggestedName: "DonutKoning", tagline: "Geen enkel gaatje in de kennis" },
  { id: "burger_hero", name: "Burger Baas", category: "food", emojiBadge: "🍔🧢", baseIdx: 22, hatIdx: 3, accIdx: 1, gradIdx: 5, suggestedName: "BurgerBaas", tagline: "Smult van hoge scores" },
  { id: "taco_champ", name: "Taco Maestro", category: "food", emojiBadge: "🌮🤠", baseIdx: 47, hatIdx: 13, accIdx: 1, gradIdx: 1, suggestedName: "TacoMaestro", tagline: "Knapperige antwoorden, pittige score" },
  { id: "popcorn_star", name: "Popcorn Star", category: "food", emojiBadge: "🍿🕶️", baseIdx: 48, hatIdx: 3, accIdx: 1, gradIdx: 8, suggestedName: "PopcornStar", tagline: "Popt meteen door naar de eerste plaats" },

  // Helden, Sport & Gaming
  { id: "blitz_star", name: "Flits Ster", category: "heroes", emojiBadge: "⭐⚡", baseIdx: 7, hatIdx: 0, accIdx: 7, gradIdx: 8, suggestedName: "FlitsSter", tagline: "Scoort in minder dan een seconde" },
  { id: "soccer_champ", name: "Voetbal Held", category: "heroes", emojiBadge: "⚽👑", baseIdx: 19, hatIdx: 1, accIdx: 1, gradIdx: 2, suggestedName: "VoetbalHeld", tagline: "Scoort altijd in de slotminuten" },
  { id: "astro_earth", name: "Wereld Reiziger", category: "heroes", emojiBadge: "🌍🎓", baseIdx: 0, hatIdx: 4, accIdx: 1, gradIdx: 0, suggestedName: "WereldWijze", tagline: "Kennis over alle uithoeken van de aarde" },
  { id: "pro_gamer", name: "Pro Gamer", category: "heroes", emojiBadge: "🎮🎧", baseIdx: 60, hatIdx: 3, accIdx: 4, gradIdx: 7, suggestedName: "ProGamer", tagline: "Ongeëvenaarde reflexen en focus" },
  { id: "rocket_speed", name: "Raket Piloot", category: "heroes", emojiBadge: "🚀🌟", baseIdx: 66, hatIdx: 21, accIdx: 7, gradIdx: 0, suggestedName: "RaketPiloot", tagline: "Schiet regelrecht naar de sterren" },
];

const FUN_NAME_PREFIXES = [
  "Kerst", "Sneeuw", "Jingle", "Frosty", "Rudolf", "Noel", "Winter", "Feest",
  "Turbo", "Super", "Koning", "Mega", "Kapitein", "Dokter", "Professor",
  "Flits", "Snelle", "Gouden", "Kosmische", "Machtige", "Ninja", "Chille",
  "Dappere", "Slimme", "Vrolijke", "Koele", "Wonder", "Vliegende",
  "Vurige", "Ultra", "Epic", "Meester", "Sterren"
];

const FUN_NAME_NOUNS = [
  "Kerstman", "Rendier", "Sneeuwpop", "Kerstelf", "Kerstboom", "Cadeau",
  "Tijger", "Panda", "Dino", "Robot", "Kat", "Leeuw", "Alien", "Koekje",
  "Kaasbaas", "Brein", "Raket", "Kampioen", "Held", "Vos", "Tovenaar",
  "Ster", "Vogel", "Dolfijn", "Draak", "Ninja", "Cheetah", "Koning",
  "Wolf", "Koala", "Kikker", "Taco", "Popcorn", "Gamer", "Diamant"
];

export function getRandomFunNickname(): string {
  const p = FUN_NAME_PREFIXES[Math.floor(Math.random() * FUN_NAME_PREFIXES.length)];
  const n = FUN_NAME_NOUNS[Math.floor(Math.random() * FUN_NAME_NOUNS.length)];
  const num = Math.floor(Math.random() * 89 + 10);
  return `${p}${n}${num}`;
}

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
    cheese: { hatY: 16, hatSize: 24, accY: 52, accSize: 26 },
    fox: { hatY: 18, hatSize: 24, accY: 52, accSize: 26 },
    bear: { hatY: 18, hatSize: 26, accY: 52, accSize: 26 },
    bunny: { hatY: 16, hatSize: 24, accY: 54, accSize: 26 },
    tiger: { hatY: 18, hatSize: 26, accY: 52, accSize: 26 },
    dog: { hatY: 18, hatSize: 26, accY: 52, accSize: 26 },
    wolf: { hatY: 18, hatSize: 26, accY: 52, accSize: 26 },
    koala: { hatY: 18, hatSize: 26, accY: 52, accSize: 26 },
    frog: { hatY: 18, hatSize: 26, accY: 52, accSize: 26 },
    octopus: { hatY: 16, hatSize: 26, accY: 50, accSize: 26 },
    dolphin: { hatY: 16, hatSize: 26, accY: 50, accSize: 26 },
    shark: { hatY: 16, hatSize: 26, accY: 50, accSize: 26 },
    owl: { hatY: 18, hatSize: 26, accY: 52, accSize: 26 },
    butterfly: { hatY: 16, hatSize: 24, accY: 50, accSize: 26 },
    bee: { hatY: 16, hatSize: 24, accY: 50, accSize: 26 },
    flamingo: { hatY: 16, hatSize: 24, accY: 50, accSize: 24 },
    hedgehog: { hatY: 18, hatSize: 24, accY: 52, accSize: 26 },
    giraffe: { hatY: 16, hatSize: 24, accY: 50, accSize: 24 },
    duck: { hatY: 18, hatSize: 24, accY: 50, accSize: 24 },
    crab: { hatY: 18, hatSize: 24, accY: 52, accSize: 24 },
    fries: { hatY: 16, hatSize: 24, accY: 52, accSize: 26 },
    taco: { hatY: 16, hatSize: 24, accY: 52, accSize: 26 },
    popcorn: { hatY: 16, hatSize: 24, accY: 52, accSize: 26 },
    icecream: { hatY: 16, hatSize: 24, accY: 52, accSize: 26 },
    gamepad: { hatY: 16, hatSize: 24, accY: 52, accSize: 26 },
    joystick: { hatY: 16, hatSize: 24, accY: 52, accSize: 26 },
    rocket: { hatY: 16, hatSize: 24, accY: 52, accSize: 26 },
    ufo: { hatY: 16, hatSize: 24, accY: 52, accSize: 26 },
    diamond_base: { hatY: 16, hatSize: 24, accY: 52, accSize: 26 },
  };
  return adjs[baseId] || {};
}

// DiceBear Avatar Integration
export interface DiceBearStyleOption {
  id: string;
  name: string;
  emoji: string;
  description: string;
  defaultBg: string;
}

export interface DiceBearBgOption {
  id: string;
  name: string;
  hex: string;
  colorClass: string;
}

export const DICEBEAR_STYLES: DiceBearStyleOption[] = [
  { id: "bottts", name: "Robots", emoji: "🤖", description: "Stoere en futuristische robots", defaultBg: "b6e3f4" },
  { id: "adventurer", name: "Avonturiers", emoji: "🧙", description: "Heldhaftige RPG personages", defaultBg: "c0aede" },
  { id: "fun-emoji", name: "Expressieve Emojis", emoji: "😜", description: "Super vrolijke en grappige gezichtjes", defaultBg: "ffd5dc" },
  { id: "avataaars", name: "Karakters", emoji: "🧑‍🎨", description: "Geïllustreerde mensen met eigen stijl", defaultBg: "d1fae5" },
  { id: "pixel-art", name: "Pixel Art", emoji: "👾", description: "Retro 8-bit game helden", defaultBg: "d1d4f9" },
  { id: "lorelei", name: "Lorelei", emoji: "🌸", description: "Moderne artistieke portretten", defaultBg: "ffdfbf" },
  { id: "notionists", name: "Notionists", emoji: "✏️", description: "Stijlvolle handgetekende figuren", defaultBg: "e2e8f0" },
  { id: "thumbs", name: "Duimpjes", emoji: "👍", description: "Schattige kleine duimhelden", defaultBg: "b6e3f4" },
  { id: "big-smile", name: "Lachebekjes", emoji: "😄", description: "Enthousiaste brede glimlach", defaultBg: "ffd5dc" },
];

export const DICEBEAR_BACKGROUNDS: DiceBearBgOption[] = [
  { id: "transparent", name: "Geen", hex: "", colorClass: "bg-white/20 border-dashed" },
  { id: "b91c1c", name: "Kerstrood 🎄", hex: "b91c1c", colorClass: "bg-[#b91c1c]" },
  { id: "15803d", name: "Denneboom 🌲", hex: "15803d", colorClass: "bg-[#15803d]" },
  { id: "eab308", name: "Glinstergoud ⭐", hex: "eab308", colorClass: "bg-[#eab308]" },
  { id: "38bdf8", name: "Wintervorst ❄️", hex: "38bdf8", colorClass: "bg-[#38bdf8]" },
  { id: "b6e3f4", name: "Hemelsblauw", hex: "b6e3f4", colorClass: "bg-[#b6e3f4]" },
  { id: "c0aede", name: "Zacht Paars", hex: "c0aede", colorClass: "bg-[#c0aede]" },
  { id: "ffd5dc", name: "Bloesemroze", hex: "ffd5dc", colorClass: "bg-[#ffd5dc]" },
  { id: "d1fae5", name: "Frisse Munt", hex: "d1fae5", colorClass: "bg-[#d1fae5]" },
  { id: "ffdfbf", name: "Zon Oranje", hex: "ffdfbf", colorClass: "bg-[#ffdfbf]" },
  { id: "d1d4f9", name: "Lavendel", hex: "d1d4f9", colorClass: "bg-[#d1d4f9]" },
  { id: "e2e8f0", name: "Cool Grijs", hex: "e2e8f0", colorClass: "bg-[#e2e8f0]" },
];

export const DICEBEAR_POPULAR_SEEDS: Record<string, { seed: string; name: string }[]> = {
  bottts: [
    { seed: "RoboSanta", name: "RoboSint" },
    { seed: "FrostBot", name: "FrostBot" },
    { seed: "JingleBot", name: "JingleBot" },
    { seed: "Sparky", name: "Sparky" },
    { seed: "Gizmo", name: "Gizmo" },
    { seed: "Cyber", name: "Cyber" },
    { seed: "Volt", name: "Volt" },
    { seed: "Byte", name: "Byte" },
    { seed: "Nano", name: "Nano" },
    { seed: "Pixel", name: "Pixel" },
    { seed: "Turbo", name: "Turbo" },
    { seed: "Glitch", name: "Glitch" },
  ],
  adventurer: [
    { seed: "Santa", name: "Kerstman" },
    { seed: "Noel", name: "Noel" },
    { seed: "Holly", name: "Holly" },
    { seed: "Nicholas", name: "Nicolaas" },
    { seed: "Aria", name: "Aria" },
    { seed: "Leo", name: "Leo" },
    { seed: "Finn", name: "Finn" },
    { seed: "Kael", name: "Kael" },
    { seed: "Mira", name: "Mira" },
    { seed: "Luna", name: "Luna" },
    { seed: "Rowan", name: "Rowan" },
    { seed: "Jasper", name: "Jasper" },
    { seed: "Nova", name: "Nova" },
    { seed: "Sage", name: "Sage" },
  ],
  "fun-emoji": [
    { seed: "Happy", name: "Happy" },
    { seed: "Wink", name: "Winky" },
    { seed: "Star", name: "Star" },
    { seed: "Party", name: "Party" },
    { seed: "Giggle", name: "Giggle" },
    { seed: "Cool", name: "Cool" },
    { seed: "Cheeky", name: "Cheeky" },
    { seed: "Silly", name: "Silly" },
    { seed: "Joy", name: "Joy" },
    { seed: "Sunny", name: "Sunny" },
    { seed: "Blink", name: "Blinky" },
    { seed: "Dizzy", name: "Dizzy" },
  ],
  avataaars: [
    { seed: "Alex", name: "Alex" },
    { seed: "Sam", name: "Sam" },
    { seed: "Robin", name: "Robin" },
    { seed: "Max", name: "Max" },
    { seed: "Charlie", name: "Charlie" },
    { seed: "Jordan", name: "Jordan" },
    { seed: "Taylor", name: "Taylor" },
    { seed: "Casey", name: "Casey" },
    { seed: "Morgan", name: "Morgan" },
    { seed: "Riley", name: "Riley" },
    { seed: "Jamie", name: "Jamie" },
    { seed: "Dakota", name: "Dakota" },
  ],
  "pixel-art": [
    { seed: "Hero", name: "Hero" },
    { seed: "Knight", name: "Knight" },
    { seed: "Mage", name: "Mage" },
    { seed: "Rogue", name: "Rogue" },
    { seed: "Pixel", name: "Pixel" },
    { seed: "Ninja", name: "Ninja" },
    { seed: "Boss", name: "Boss" },
    { seed: "Arcade", name: "Arcade" },
    { seed: "Chrono", name: "Chrono" },
    { seed: "Retro", name: "Retro" },
    { seed: "Quest", name: "Quest" },
    { seed: "Level", name: "Level" },
  ],
  lorelei: [
    { seed: "Chloe", name: "Chloe" },
    { seed: "Zoe", name: "Zoe" },
    { seed: "Emma", name: "Emma" },
    { seed: "Mia", name: "Mia" },
    { seed: "Lilly", name: "Lilly" },
    { seed: "Sophie", name: "Sophie" },
    { seed: "Amber", name: "Amber" },
    { seed: "Flora", name: "Flora" },
    { seed: "Iris", name: "Iris" },
    { seed: "Ruby", name: "Ruby" },
    { seed: "Daisy", name: "Daisy" },
    { seed: "Bella", name: "Bella" },
  ],
  notionists: [
    { seed: "Oliver", name: "Oliver" },
    { seed: "Liam", name: "Liam" },
    { seed: "Noah", name: "Noah" },
    { seed: "Lucas", name: "Lucas" },
    { seed: "Mason", name: "Mason" },
    { seed: "Ethan", name: "Ethan" },
    { seed: "Aiden", name: "Aiden" },
    { seed: "Henry", name: "Henry" },
    { seed: "Leo", name: "Leo" },
    { seed: "Jack", name: "Jack" },
    { seed: "Wyatt", name: "Wyatt" },
    { seed: "Levi", name: "Levi" },
  ],
  thumbs: [
    { seed: "Thumb1", name: "Duimpje" },
    { seed: "Thumb2", name: "Kampioen" },
    { seed: "Thumb3", name: "Ready" },
    { seed: "Thumb4", name: "Topper" },
    { seed: "Thumb5", name: "Snelle" },
    { seed: "Thumb6", name: "Geluk" },
    { seed: "Thumb7", name: "Flits" },
    { seed: "Thumb8", name: "Baas" },
  ],
  "big-smile": [
    { seed: "Smile1", name: "Glimlach" },
    { seed: "Smile2", name: "Stralend" },
    { seed: "Smile3", name: "Feest" },
    { seed: "Smile4", name: "Grappig" },
    { seed: "Smile5", name: "Koning" },
    { seed: "Smile6", name: "Vrolijk" },
    { seed: "Smile7", name: "Zonnig" },
    { seed: "Smile8", name: "Blij" },
  ]
};

export function getDiceBearAvatarUrl(
  style: string = "bottts",
  seed: string = "player",
  bg: string = ""
): string {
  const cleanStyle = DICEBEAR_STYLES.some(s => s.id === style) ? style : "bottts";
  const cleanSeed = encodeURIComponent((seed || "player").trim());
  const cleanBg = bg ? bg.replace("#", "") : "";
  const bgParam = cleanBg && cleanBg !== "transparent" ? `&backgroundColor=${cleanBg}` : "";
  return `https://api.dicebear.com/9.x/${cleanStyle}/svg?seed=${cleanSeed}${bgParam}&radius=50`;
}

export function getRandomDiceBearConfig(): { style: string; seed: string; bg: string; suggestedName: string } {
  const styleObj = DICEBEAR_STYLES[Math.floor(Math.random() * DICEBEAR_STYLES.length)];
  const style = styleObj.id;
  const popular = DICEBEAR_POPULAR_SEEDS[style] || [{ seed: "Player", name: "Speler" }];
  const preset = popular[Math.floor(Math.random() * popular.length)];
  const bg = DICEBEAR_BACKGROUNDS[Math.floor(Math.random() * (DICEBEAR_BACKGROUNDS.length - 1)) + 1].hex;
  const num = Math.floor(Math.random() * 89 + 10);
  const nickname = `${preset.name}${num}`;
  const seed = `${preset.seed}_${num}`;
  return { style, seed, bg, suggestedName: nickname };
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

// Decodes a combined rawNickname like: "KaasKoning:::db:bottts:Sparky:b6e3f4" or "KaasKoning:::3|4|1|2" or falls back
export function parseNicknameAndAvatar(rawNickname: string) {
  let isVerified = false;
  let cleanRaw = rawNickname || "";
  
  if (cleanRaw.includes("__verified__")) {
    isVerified = true;
    cleanRaw = cleanRaw.replace("__verified__", "");
  }

  if (!cleanRaw || !cleanRaw.includes(":::")) {
    const name = cleanRaw || "Speler";
    return {
      displayName: name,
      avatarUrl: getDiceBearAvatarUrl("bottts", name, "b6e3f4"),
      isVerified,
      isDiceBear: true,
      diceBearStyle: "bottts",
      diceBearSeed: name,
      diceBearBg: "b6e3f4",
    };
  }

  const [name, avatarCode] = cleanRaw.split(":::", 2);

  // Check if this is a DiceBear avatar code!
  // e.g. "db:bottts:Sparky:b6e3f4" or "dicebear:adventurer:Leo:c0aede"
  if (avatarCode && (avatarCode.startsWith("db:") || avatarCode.startsWith("dicebear:"))) {
    const parts = avatarCode.split(":");
    const style = parts[1] || "bottts";
    const seed = parts[2] || name || "player";
    const bg = parts[3] || "";
    return {
      displayName: name,
      avatarUrl: getDiceBearAvatarUrl(style, seed, bg),
      isVerified,
      isDiceBear: true,
      diceBearStyle: style,
      diceBearSeed: seed,
      diceBearBg: bg,
    };
  }

  // Classic emoji avatar decoding
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
    avatarUrl: getAvatarUrl(name, baseIdx, hatIdx, accIdx, gradIdx, hX, hY, hS, aX, aY, aS),
    isVerified,
    isDiceBear: false,
    baseIdx,
    hatIdx,
    accIdx,
    gradIdx
  };
}

// Parses a quiz name and returns whether it is created by a verified user
export function parseQuizTitle(rawTitle: string) {
  let isVerified = false;
  let isLocked = false;
  let cleanTitle = rawTitle || "";
  if (cleanTitle.includes("__locked__")) {
    isLocked = true;
    cleanTitle = cleanTitle.replace("__locked__", "");
  }
  if (cleanTitle.includes("__verified__")) {
    isVerified = true;
    cleanTitle = cleanTitle.replace("__verified__", "");
  }
  return { cleanTitle, isVerified, isLocked };
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
  if (idx === 3) {
    return React.createElement(
      "svg",
      { className, viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg" },
      React.createElement("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" })
    );
  }
  if (idx === 4) {
    return React.createElement(
      "svg",
      { className, viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg" },
      React.createElement("polygon", { points: "12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" })
    );
  }
  return React.createElement(
    "svg",
    { className, viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg" },
    React.createElement("polygon", { points: "12,2 21,7 21,17 12,22 3,17 3,7" })
  );
}
