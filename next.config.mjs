/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    basePath: '/ALIETake',
    images: {
        unoptimized: true,
        domains: ['firebasestorage.googleapis.com'],
    },
};

export default nextConfig;
