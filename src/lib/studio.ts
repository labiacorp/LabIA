import { z } from "zod";

// Prompt values stay in English; labels belong to the PT-BR interface.
const group = (id: string, label: string, choices: string[]) => ({
  id, label, options: choices.map((choice) => {
    const [value, text] = choice.split("|");
    return { value, label: text ?? value };
  }),
});

export const STUDIO_GROUPS = [
  group("character", "Tipo de personagem", ["Natural|Natural", "Bold|Marcante", "Extreme|Extremo"]),
  group("gender", "Gênero", ["Female|Mulher", "Male|Homem", "Trans man|Homem trans", "Trans woman|Mulher trans", "Non-binary|Não binário"]),
  group("build", "Corpo", ["Slim|Magro", "Athletic|Atlético", "Muscular|Musculoso", "Curvy|Curvilíneo", "Heavy|Robusto", "Very muscular|Muito musculoso"]),
  group("hairstyle", "Corte de cabelo", ["Bob|Chanel", "Bald|Sem cabelo", "Buzz cut|Raspado", "Bowl cut|Tigelinha", "Mullet|Mullet", "Braids|Tranças", "Pigtails|Maria-chiquinha", "Afro|Afro", "Mohawk|Moicano", "Waves|Ondulado", "Beehive|Colmeia", "Perm|Permanente", "Long hair|Longo", "Short hair|Curto", "Hair horns|Chifres de cabelo", "Swirl|Espiral", "Curl sphere|Esfera de cachos", "Round puffs|Coques redondos", "Hair wings|Asas", "Spikes|Espetado", "Side tufts|Mechas laterais", "Steps|Escalonado", "Geometric bob|Chanel geométrico", "Twin corkscrews|Duas espirais", "Side coil|Espiral lateral", "Mushroom|Cogumelo"]),
  group("hairColor", "Cor do cabelo", ["Black|Preto", "Dark brown|Castanho escuro", "Chestnut|Castanho", "Ginger|Ruivo", "Red|Vermelho", "Blonde|Loiro", "Platinum|Platinado", "Grey|Grisalho", "White|Branco", "Pink|Rosa", "Lilac|Lilás", "Blue|Azul", "Green|Verde"]),
  group("style", "Estilo", ["Retro|Retrô", "Sporty|Esportivo", "Y2K|Anos 2000", "Theatrical|Teatral", "Goth|Gótico", "Suits|Alfaiataria", "Streetwear|Urbano", "Casual|Casual"]),
  group("ethnicity", "Origem / aparência", ["African|Africana", "Asian|Asiática", "European|Europeia", "Indian|Indiana", "Middle Eastern|Oriente Médio", "Mixed|Mista"]),
  group("age", "Idade", ["Adult|Adulto", "Mature adult|Maduro", "Senior|Sênior"]),
  group("skin", "Tom de pele", ["Porcelain|Porcelana", "Fair|Muito claro", "Light|Claro", "Olive|Oliva", "Tan|Bronzeado", "Brown|Marrom", "Deep brown|Marrom escuro", "Ebony|Ébano"]),
  group("height", "Altura", ["Average height|Média", "Tall|Alto", "Very tall|Muito alto"]),
  group("proportions", "Proporções", ["Long limbs|Membros longos", "Short legs|Pernas curtas", "Broad shoulders|Ombros largos", "Narrow waist|Cintura fina", "Round body|Corpo arredondado", "Pot belly|Barriga saliente"]),
  group("head", "Formato da cabeça", ["Standard head|Padrão", "Long head|Alongada", "Small head|Pequena", "High forehead|Testa alta", "Heavy brow|Sobrancelha saliente", "Strong jaw|Mandíbula marcada", "Oversized jaw|Mandíbula grande", "Round face|Redonda", "Square face|Quadrada", "Heart-shaped face|Coração"]),
  group("neck", "Pescoço", ["Standard neck|Padrão", "Thick neck|Largo", "Long neck|Longo", "Short neck|Curto"]),
  group("eyes", "Formato dos olhos", ["Almond eyes|Amendoados", "Round eyes|Redondos", "Monolid|Monopálpebra", "Close-set eyes|Próximos", "Wide-set eyes|Afastados", "Uneven eyes|Assimétricos", "Large eyes|Grandes", "Huge eyes|Muito grandes", "Hooded eyes|Pálpebra caída", "Upturned eyes|Elevados", "Downturned eyes|Caídos"]),
  group("eyeColor", "Cor dos olhos", ["Black eyes|Pretos", "Brown eyes|Castanhos", "Hazel eyes|Avelã", "Green eyes|Verdes", "Blue eyes|Azuis", "Ice blue eyes|Azul claro", "Amber eyes|Âmbar", "Grey eyes|Cinza"]),
  group("features", "Traços do rosto", ["Freckles|Sardas", "Dimples|Covinhas", "Eye bags|Olheiras", "Rosy cheeks|Bochechas rosadas", "High cheekbones|Maçãs altas", "Full lips|Lábios cheios", "Thick brows|Sobrancelhas grossas", "Beauty mark|Pinta", "Wide nose|Nariz largo", "Button nose|Nariz pequeno", "Pointed nose|Nariz pontudo", "Tiny nose|Nariz delicado", "Pouty lips|Lábios projetados", "Small mouth|Boca pequena", "Wide mouth|Boca larga", "Unibrow|Monocelha", "Arched brows|Sobrancelhas arqueadas", "Brush brows|Sobrancelhas cheias", "Large ears|Orelhas grandes", "Uneven ears|Orelhas assimétricas", "Gap teeth|Dentes separados", "Prominent teeth|Dentes salientes", "Pointed chin|Queixo pontudo", "Small chin|Queixo pequeno", "Big forehead|Testa larga"]),
  group("facialHair", "Barba e bigode", ["Clean-shaven|Sem barba", "Stubble|Barba curta", "Full beard|Barba cheia", "Goatee|Cavanhaque", "Moustache|Bigode", "Thin moustache|Bigode fino", "Thick moustache|Bigode cheio", "Braided beard|Barba trançada"]),
  group("distinctive", "Marcas pessoais", ["Different eye colors|Heterocromia", "Face tattoo|Tatuagem no rosto", "Piercing|Piercing", "Ear piercings|Piercings na orelha", "Brow slits|Corte na sobrancelha", "Bleached brows|Sobrancelhas claras", "No brows|Sem sobrancelhas", "Gold teeth|Dentes dourados", "Braces|Aparelho", "Brow scar|Cicatriz na sobrancelha", "Face gems|Pedras no rosto", "Pointed ears|Orelhas pontudas", "Long lashes|Cílios longos", "Nose tape|Fita no nariz"]),
  group("accessories", "Acessórios", ["No accessories|Nenhum", "Glasses|Óculos", "Headphones|Fones", "Jewelry|Joias", "Hat|Chapéu", "Bag|Bolsa"]),
];

export const STUDIO_MULTI_GROUPS = new Set(["proportions", "features", "distinctive", "accessories"]);
export type StudioSelection = Record<string, string | string[]>;
export const selectionValues = (value: string | string[] | undefined): string[] => value === undefined ? [] : Array.isArray(value) ? value : [value];

export function parseStudioSelection(raw: string): StudioSelection {
  const selections = z.record(z.string(), z.union([z.string(), z.array(z.string()).max(25)])).parse(JSON.parse(raw));
  for (const [key, value] of Object.entries(selections)) {
    const category = STUDIO_GROUPS.find((item) => item.id === key);
    const values = selectionValues(value);
    if (!category || (Array.isArray(value) && !STUDIO_MULTI_GROUPS.has(key)) || new Set(values).size !== values.length || values.some((choice) => !category.options.some((item) => item.value === choice))) throw new Error("Invalid studio selection");
  }
  return selections;
}

export function studioPersona(selections: StudioSelection, description: string) {
  const traits = STUDIO_GROUPS.flatMap((category) => selectionValues(selections[category.id]));
  return [description.trim(), traits.length ? `Character appearance: ${traits.join(", ")}.` : ""].filter(Boolean).join("\n");
}

export type StudioPreset = { id: string; name: string; niche: string; tone: string; signature: string; image: string; selection: StudioSelection };
export const STUDIO_PRESETS: StudioPreset[] = [
  { id: "editorial", name: "Theo", niche: "Moda e cultura", tone: "Elegante e direto", signature: "Alfaiataria escura, bigode fino e gravata borboleta", image: "535fc0f43427de7da65832cd12d5c4cf4ae1a7373edfc4162783e74939b5ab71.webp", selection: { character: "Extreme", gender: "Trans man", ethnicity: "European", age: "Adult", skin: "Porcelain", height: "Tall", build: "Athletic", proportions: "Broad shoulders", style: "Suits" } },
  { id: "urban", name: "Luna", niche: "Lifestyle urbano", tone: "Espontâneo e divertido", signature: "Fones grandes em laranja, cabelo grisalho e roupa urbana", image: "a50801ab9f8c7466f30c9d1da6b7f1a6c3070143f1fd1b1ce17d07d4079f7266.webp", selection: { character: "Extreme", gender: "Trans woman", ethnicity: "Mixed", age: "Senior", skin: "Deep brown", height: "Very tall", build: "Muscular", proportions: "Broad shoulders", accessories: "Headphones" } },
  { id: "creative", name: "Max", niche: "Arte e criatividade", tone: "Irreverente e curioso", signature: "Chapéu roxo, alfaiataria bege e barba cheia", image: "74d0701fef4fbbab6de02e3047939632679c67089929b3343d533f99ba2b6c8a.webp", selection: { character: "Extreme", gender: "Trans man", ethnicity: "African", age: "Mature adult", skin: "Porcelain", height: "Average height", build: "Heavy", proportions: "Short legs", accessories: "Hat" } },
  { id: "wellness", name: "Noah", niche: "Rotina e bem-estar", tone: "Acolhedor e prático", signature: "Cabelo expressivo, textura natural e roupa casual", image: "71141a86f8c3d205f549a42c9324464b6b1ccf242644137d22913e5276e11101.webp", selection: { character: "Extreme", gender: "Trans man", ethnicity: "African", age: "Senior", skin: "Tan", height: "Average height", build: "Athletic", proportions: "Broad shoulders" } },
  { id: "sport", name: "Alex", niche: "Esporte e hábitos", tone: "Motivador e objetivo", signature: "Postura confiante e silhueta marcante", image: "5d7a2e41f276626b1ce58dbf58f2d539e7d94c6e4343d7cdaf3fb466cebcc4ee.webp", selection: { character: "Extreme", gender: "Male", ethnicity: "European", age: "Senior", skin: "Fair", height: "Average height", build: "Muscular", proportions: ["Short legs", "Broad shoulders"] } },
  { id: "retro", name: "Íris", niche: "Moda retrô", tone: "Bem-humorado e expressivo", signature: "Alfaiataria retrô, cabelo volumoso e joias", image: "082e19204e0b0d157fd18beb5247d85c328e8b1bfcad85cb03bbad25b571e29f.webp", selection: { character: "Extreme", gender: "Non-binary", ethnicity: "European", age: "Mature adult", skin: "Porcelain", height: "Very tall", build: "Slim", proportions: "Narrow waist", style: "Retro" } },
];

// Reference previews, not LabIA outputs. Generation uses the configured kit models.
export const presetImage = (file: string) => `https://static-public-media.higgsfield.ai/ai-influencer-explore-presets/${file}`;

export const MOTION_PRESETS = [
  { id: "talk", label: "Falando com a câmera", description: "Olhar para a câmera, gestos suaves e postura natural. Sem áudio nesta etapa." },
  { id: "walk", label: "Em movimento", description: "Caminhada tranquila, câmera acompanhando e movimento natural." },
  { id: "product", label: "Apresentando um produto", description: "Mostrar o produto em primeiro plano, com gestos claros e câmera estável." },
  { id: "editorial", label: "Editorial", description: "Movimento de câmera lento, pose expressiva e luz cinematográfica." },
];
