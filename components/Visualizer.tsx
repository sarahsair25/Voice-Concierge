import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
    isActive: boolean;
    isSpeaking: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ isActive, isSpeaking }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let time = 0;
        
        const render = () => {
            const width = canvas.width;
            const height = canvas.height;
            
            ctx.clearRect(0, 0, width, height);
            
            if (!isActive) {
                // Idle line
                ctx.beginPath();
                ctx.moveTo(0, height / 2);
                ctx.lineTo(width, height / 2);
                ctx.strokeStyle = '#d4af37'; // Gold
                ctx.globalAlpha = 0.3;
                ctx.lineWidth = 2;
                ctx.stroke();
                return;
            }

            ctx.lineWidth = 3;
            ctx.strokeStyle = '#d4af37'; // Gold
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#d4af37';
            ctx.globalAlpha = 1;
            
            ctx.beginPath();
            
            const amplitude = isSpeaking ? 30 : 10; // Higher amplitude when agent speaks
            const frequency = isSpeaking ? 0.05 : 0.02;
            const speed = isSpeaking ? 0.2 : 0.05;

            for (let x = 0; x < width; x++) {
                const y = height / 2 + 
                          Math.sin(x * frequency + time) * amplitude * Math.sin(x / width * Math.PI) +
                          (isSpeaking ? Math.sin(x * 0.1 + time * 2) * 5 : 0); // Add jitter if speaking
                if (x === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            
            ctx.stroke();
            time += speed;
            animationRef.current = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationRef.current);
        };
    }, [isActive, isSpeaking]);

    return (
        <canvas 
            ref={canvasRef} 
            width={300} 
            height={100} 
            className="w-full h-full"
        />
    );
};

export default Visualizer;