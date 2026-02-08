import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
    dest: "public",
    disable: false,
    register: true,
    skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {

    images: {
        unoptimized: true,
        domains: ['firebasestorage.googleapis.com'],
    },
};

export default withPWA(nextConfig);
