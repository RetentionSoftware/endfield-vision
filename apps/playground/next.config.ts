import type { NextConfig } from 'next'

/*
 * Плейграунд берёт библиотеку из исходников (paths в tsconfig.json):
 * правки в packages/vision видны сразу, без сборки dist.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['endfield-vision'],
  // Правила проекта - в корневом AGENTS.md; свой файл next dev не создаёт.
  agentRules: false,
  /*
   * next dev отдаёт скрипты и HMR только localhost. Открыть плейграунд с телефона
   * или другого ПК по адресу в сети - через EV_DEV_ORIGINS в apps/playground/.env.local
   * (список через запятую, например 192.168.*.*). На production-сборку не влияет.
   */
  allowedDevOrigins: (process.env.EV_DEV_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
}

export default nextConfig
