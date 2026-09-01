// src/components/PharmientaPro.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Globe, ExternalLink, ArrowRight, MessageCircle, Mail, Phone } from 'lucide-react';

interface PharmientaProProps {
    theme?: 'dark' | 'light';
    className?: string;
}

const IMAGES = [
    '/pharmienta01.jpg',
    '/pharmienta02.jpg',
    '/pharmienta03.jpg',
];

export const PharmientaPro: React.FC<PharmientaProProps> = ({
    theme = 'dark',
    className = '',
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [touchStartX, setTouchStartX] = useState<number | null>(null);

    const goToNext = useCallback(() => {
        setCurrentIndex((prev) => (prev === IMAGES.length - 1 ? 0 : prev + 1));
    }, []);

    // Auto-slide every 4 seconds
    useEffect(() => {
        const interval = setInterval(goToNext, 4000);
        return () => clearInterval(interval);
    }, [goToNext]);

    // Touch handlers for swipe
    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStartX(e.touches[0].clientX);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX === null) return;
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                goToNext();
            } else {
                setCurrentIndex((prev) => (prev === 0 ? IMAGES.length - 1 : prev - 1));
            }
        }
        setTouchStartX(null);
    };

    const handleVisitWebsite = () => {
        window.open('https://pharmientapro.vercel.app/', '_blank');
    };

    const handleWhatsApp = () => {
        window.open('https://wa.me/254717517371', '_blank');
    };

    const handleEmail = () => {
        window.location.href = 'mailto:pharmienta@gmail.com';
    };

    return (
        <div
            className={`relative rounded-xl overflow-hidden shadow-lg ${className}`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Image Container */}
            <div className="relative w-full aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/9] overflow-hidden bg-black/40">
                {IMAGES.map((image, index) => (
                    <div
                        key={image}
                        className={`absolute inset-0 transition-all duration-700 ease-in-out ${index === currentIndex
                            ? 'opacity-100 scale-100'
                            : 'opacity-0 scale-105'
                            }`}
                        style={{
                            backgroundImage: `url(${image})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    />
                ))}

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 sm:bg-gradient-to-r sm:from-black/80 sm:via-black/50 sm:to-black/30" />

                {/* Content */}
                <div className="absolute inset-0 z-10 flex flex-col justify-end p-5 sm:p-7">
                    <div className="flex flex-col gap-3">
                        {/* Top row: Badges + Visit Website button */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>


                                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
                                    Stay Updated; Visit Our Website
                                </h3>
                                <p className="text-sm sm:text-base text-white/80 font-normal">
                                    Explore our platform, features, and services
                                </p>
                            </div>

                            {/* Visit Website Button */}
                            <button
                                onClick={handleVisitWebsite}
                                className="cursor-pointer px-5 sm:px-7 py-3 sm:py-3.5 rounded-xl font-bold text-sm sm:text-base transition-all bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 flex items-center gap-2.5 active:scale-95 whitespace-nowrap self-start sm:self-auto"
                            >
                                <span>Visit Website</span>
                                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                        </div>

                        {/* Bottom row: Contact details */}
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-1">
                            <span className="text-[11px] sm:text-xs text-white/60 font-medium">Or contact us through:</span>

                            <button
                                onClick={handleWhatsApp}
                                className="flex items-center gap-1.5 text-[11px] sm:text-xs text-white/80 hover:text-white transition-colors bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full"
                            >
                                <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                                <span>WhatsApp</span>
                            </button>

                            <span className="text-white/20">|</span>

                            <button
                                onClick={handleEmail}
                                className="flex items-center gap-1.5 text-[11px] sm:text-xs text-white/80 hover:text-white transition-colors bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full"
                            >
                                <Mail className="w-3.5 h-3.5 text-[#ea4335]" />
                                <span>Email</span>
                            </button>

                            <span className="text-[10px] sm:text-[11px] text-white/40 flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                +254 717 517 371
                            </span>
                        </div>
                    </div>

                    {/* Carousel Dots */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
                        {IMAGES.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentIndex(index)}
                                className={`transition-all duration-300 rounded-full ${index === currentIndex
                                    ? 'w-7 h-1.5 bg-white'
                                    : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/60'
                                    }`}
                                aria-label={`Go to slide ${index + 1}`}
                            />
                        ))}
                    </div>

                    {/* Slide counter */}
                    <div className="absolute top-3 left-3 z-20 px-2.5 py-0.5 rounded-full bg-black/50 text-white/60 text-[10px] font-medium backdrop-blur-sm">
                        {currentIndex + 1} / {IMAGES.length}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PharmientaPro;