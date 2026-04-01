import localFont from "next/font/local";

export const eUkraine = localFont({
  src: [
    { path: "../../public/fonts/e-Ukraine-Thin.otf", weight: "100", style: "normal" },
    { path: "../../public/fonts/e-Ukraine-UltraLight.otf", weight: "200", style: "normal" },
    { path: "../../public/fonts/e-Ukraine-Light.otf", weight: "300", style: "normal" },
    { path: "../../public/fonts/e-Ukraine-Regular.otf", weight: "400", style: "normal" },
    { path: "../../public/fonts/e-Ukraine-Medium.otf", weight: "500", style: "normal" },
    { path: "../../public/fonts/e-Ukraine-Bold.otf", weight: "700", style: "normal" },
  ],
  variable: "--font-e-ukraine",
});

export const eUkraineHead = localFont({
  src: [
    { path: "../../public/fonts/e-UkraineHead-Thin.otf", weight: "100", style: "normal" },
    { path: "../../public/fonts/e-UkraineHead-UltraLight.otf", weight: "200", style: "normal" },
    { path: "../../public/fonts/e-UkraineHead-Light.otf", weight: "300", style: "normal" },
    { path: "../../public/fonts/e-UkraineHead-Regular.otf", weight: "400", style: "normal" },
    { path: "../../public/fonts/e-UkraineHead-Medium.otf", weight: "500", style: "normal" },
    { path: "../../public/fonts/e-UkraineHead-Bold.otf", weight: "700", style: "normal" },
    { path: "../../public/fonts/e-UkraineHead-LOGO.otf", weight: "900", style: "normal" },
  ],
  variable: "--font-e-ukraine-head",
});