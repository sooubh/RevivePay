/** @type {import("next").NextConfig} */
const nextConfig = {
  experimental: {
    useWasmBinary: true
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }]
  }
};
export default nextConfig;
