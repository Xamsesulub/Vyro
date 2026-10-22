export const brand = {
  route: "#356618",
  competition: "#7353C6",
  navy: "#11182C",
  lime: "#B2FF78",
  lavender: "#B7A4FF",
  coral: "#FF8D79",
};
export const palettes = {
  dark: {
    bg: "#0B1120",
    surface: "#11182C",
    raised: "#1B243A",
    text: "#F4F5FA",
    muted: "#A6B0C7",
    border: "#2B354C",
    accent: brand.lime,
    onAccent: brand.navy,
  },
  light: {
    bg: "#FFFFFF",
    surface: "#FFFFFF",
    raised: "#F3F4F2",
    text: "#11182C",
    muted: "#59647A",
    border: "#E4E7E2",
    accent: "#356618",
    onAccent: "#FFFFFF",
  },
};
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export type Palette = typeof palettes.dark;
