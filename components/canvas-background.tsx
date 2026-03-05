"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export function CanvasBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const particles: Particle[] = [];
    const particleCount = 80;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1,
      });
    }

    const animate = () => {
      const isDark = resolvedTheme === "dark";
      
      // Clear with theme-appropriate background
      if (isDark) {
        ctx.fillStyle = "rgba(15, 23, 42, 0.05)"; // slate-900
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particles.forEach((particle, i) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Bounce off edges
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        // Draw particle with theme-appropriate color
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        if (isDark) {
          ctx.fillStyle = "rgba(96, 165, 250, 0.6)"; // blue-400
        } else {
          ctx.fillStyle = "rgba(59, 130, 246, 0.5)"; // blue-500
        }
        ctx.fill();

        // Draw connections
        particles.slice(i + 1).forEach((otherParticle) => {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            if (isDark) {
              ctx.strokeStyle = `rgba(96, 165, 250, ${0.25 * (1 - distance / 150)})`; // blue-400
            } else {
              ctx.strokeStyle = `rgba(59, 130, 246, ${0.2 * (1 - distance / 150)})`; // blue-500
            }
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [resolvedTheme]);

  const isDark = resolvedTheme === "dark";

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ 
        background: isDark 
          ? "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" // slate-900 to slate-800
          : "linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%)" 
      }}
    />
  );
}
