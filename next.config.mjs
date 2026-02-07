/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    basePath: '/ALIET-ATTENDANCE',
    trailingSlash: true,
    images: {
        unoptimized: true,
        domains: ['firebasestorage.googleapis.com'],
    },
};

export default nextConfig;
