import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // v1.9: dev-индикатор Next.js перекрывал кнопку «Персонаж» в HUD
  // (нижний левый угол, полноэкранный игровой UI). Ошибки по-прежнему
  // видны в консоли браузера и dev.log — E2E проверяет их напрямую.
  devIndicators: false,
};

export default nextConfig;
