// Central catalog of the 30 fonts bundled with the app (see backend/fonts/*.ttf).
// "key" is stored in the database and doubles as both the filename (key.ttf)
// and the font-family name registered with fontconfig at startup (see
// config/fonts.js's registerFonts()) - keep these three in sync if you ever
// add/remove a font.
const FONT_CATALOG = [
  { key: "Poppins", label: "Poppins", category: "Sans-serif" },
  { key: "Montserrat", label: "Montserrat", category: "Sans-serif" },
  { key: "Raleway", label: "Raleway", category: "Sans-serif" },
  { key: "Oswald", label: "Oswald", category: "Sans-serif" },
  { key: "Josefin Sans", label: "Josefin Sans", category: "Sans-serif" },
  { key: "Quicksand", label: "Quicksand", category: "Sans-serif" },
  { key: "Nunito", label: "Nunito", category: "Sans-serif" },
  { key: "Playfair Display", label: "Playfair Display", category: "Serif" },
  { key: "Merriweather", label: "Merriweather", category: "Serif" },
  { key: "Cinzel", label: "Cinzel", category: "Serif" },
  { key: "Cormorant Garamond", label: "Cormorant Garamond", category: "Serif" },
  { key: "EB Garamond", label: "EB Garamond", category: "Serif" },
  { key: "Crimson Text", label: "Crimson Text", category: "Serif" },
  { key: "Libre Baskerville", label: "Libre Baskerville", category: "Serif" },
  { key: "Roboto Slab", label: "Roboto Slab", category: "Serif" },
  { key: "Abril Fatface", label: "Abril Fatface", category: "Display" },
  { key: "Bebas Neue", label: "Bebas Neue", category: "Display" },
  { key: "Lobster", label: "Lobster", category: "Display" },
  { key: "Great Vibes", label: "Great Vibes", category: "Script" },
  { key: "Dancing Script", label: "Dancing Script", category: "Script" },
  { key: "Pacifico", label: "Pacifico", category: "Script" },
  { key: "Sacramento", label: "Sacramento", category: "Script" },
  { key: "Alex Brush", label: "Alex Brush", category: "Script" },
  { key: "Tangerine", label: "Tangerine", category: "Script" },
  { key: "Allura", label: "Allura", category: "Script" },
  { key: "Parisienne", label: "Parisienne", category: "Script" },
  { key: "Satisfy", label: "Satisfy", category: "Script" },
  { key: "Kaushan Script", label: "Kaushan Script", category: "Script" },
  { key: "Marck Script", label: "Marck Script", category: "Script" },
  { key: "Yellowtail", label: "Yellowtail", category: "Script" },
];

const DEFAULT_FONT_KEY = "Poppins";
const VALID_KEYS = new Set(FONT_CATALOG.map((f) => f.key));

function isValidFontKey(key) {
  return VALID_KEYS.has(key);
}

module.exports = { FONT_CATALOG, DEFAULT_FONT_KEY, isValidFontKey };
