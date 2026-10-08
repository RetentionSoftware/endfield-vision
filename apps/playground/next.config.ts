import type { NextConfig } from 'next'

/*
 * Плейграунд берёт библиотеку из исходников (paths в tsconfig.json):
 * правки в packages/vision видны сразу, без сборки dist.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['endfield-vision'],
}

export default nextConfig
