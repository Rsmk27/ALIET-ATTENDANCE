'use client';
import { useRef, useEffect, HTMLAttributes } from 'react';

interface SpotlightConfig {
    radius?: number;
    brightness?: number;
    color?: string;
    smoothing?: number;
}

const useSpotlightEffect = (config: SpotlightConfig) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let mouseX = -1000;
        let mouseY = -1000;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const handleMouseMove = (event: MouseEvent) => {
            mouseX = event.clientX;
            mouseY = event.clientY;
        };

        const handleMouseLeave = () => {
            mouseX = -1000;
            mouseY = -1000;
        };

        const hexToRgb = (hex: string) => {
            // Remove hash if present
            hex = hex.replace(/^#/, '');

            // Parse hex
            const bigint = parseInt(hex, 16);
            const r = (bigint >> 16) & 255;
            const g = (bigint >> 8) & 255;
            const b = bigint & 255;
            return `${r},${g},${b}`;
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (mouseX !== -1000 && mouseY !== -1000) {
                // Create gradient centered at mouse
                const gradient = ctx.createRadialGradient(
                    mouseX, mouseY, 0,
                    mouseX, mouseY, config.radius || 200
                );

                const rgbColor = hexToRgb(config.color || '#ffffff');
                const brightness = config.brightness || 0.15;

                gradient.addColorStop(0, `rgba(${rgbColor}, ${brightness})`);
                gradient.addColorStop(1, 'rgba(0,0,0,0)');

                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            animationFrameId = requestAnimationFrame(draw);
        };

        // Initial setup
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);

        // Start animation loop
        animationFrameId = requestAnimationFrame(draw);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
            cancelAnimationFrame(animationFrameId);
        };
    }, [config.radius, config.brightness, config.color]);

    return canvasRef;
};

interface ComponentProps extends HTMLAttributes<HTMLCanvasElement> {
    config?: SpotlightConfig;
}

const SpotlightCursor = ({
    config = {},
    className = '',
    ...rest
}: ComponentProps) => {
    const spotlightConfig = {
        radius: 400, // Increased radius for better visibility
        brightness: 0.15,
        color: '#ffffff',
        smoothing: 0.1,
        ...config,
    };

    const canvasRef = useSpotlightEffect(spotlightConfig);

    return (
        <canvas
            ref={canvasRef}
            className={`fixed top-0 left-0 pointer-events-none z-[9999] w-full h-full ${className}`}
            {...rest}
        />
    );
};

export default SpotlightCursor;
