'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function SplashScreen() {
    const [isVisible, setIsVisible] = useState(true);
    const [isFadingOut, setIsFadingOut] = useState(false);

    useEffect(() => {
        // Prevent scrolling while splash screen is active
        document.body.style.overflow = 'hidden';

        const timer = setTimeout(() => {
            setIsFadingOut(true);
            setTimeout(() => {
                setIsVisible(false);
                document.body.style.overflow = '';
            }, 800); // matches splash-fade-out duration in globals.css
        }, 2500); // slightly longer for the "R2" aesthetic

        return () => {
            document.body.style.overflow = '';
            clearTimeout(timer);
        };
    }, []);

    if (!isVisible) return null;

    return (
        <div className={`fixed inset-0 z-[10000] flex items-center justify-center bg-background transition-all duration-700 ${isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'}`}>
            <div className="relative w-full h-full p-8 flex flex-col items-center justify-center -translate-y-6">
                <div className="relative mb-6">
                    {/* Abstract R2 Logo Shape */}
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-800 flex items-center justify-center shadow-2xl border border-foreground/[0.05]">
                        <span className="font-black text-3xl text-white tracking-tight select-none">R2</span>
                    </div>
                    {/* Pulse Effect */}
                    <div className="absolute inset-0 rounded-2xl bg-cyan-500/10 animate-ping -z-10" />
                </div>
                
                <h1 className="text-foreground text-xl font-bold tracking-[0.2em] mb-2 uppercase">
                    R2 Manager
                </h1>
                
                <p className="text-foreground/40 text-[10px] uppercase tracking-premium mb-8 font-medium">
                    Cloud Storage Reimagined
                </p>
                
                {/* Loading Bar */}
                <div className="w-48 h-[2px] bg-foreground/[0.05] rounded-full overflow-hidden relative">
                    <div className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-loading" />
                </div>
            </div>
        </div>
    );
}
