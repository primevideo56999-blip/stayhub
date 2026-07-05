/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "http",  hostname: "localhost" },
      { protocol: "http",  hostname: "api" },
    ],
  },
}

module.exports = nextConfig
