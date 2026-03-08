'use client';

import React from 'react';
import Image from 'next/image';

interface LogoProps {
    variant?: 'horizontal' | 'vertical' | 'icon';
    className?: string;
    size?: number;
    showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
    variant = 'horizontal',
    className = '',
    size = 40,
    showText = true
}) => {
    // Determine the source based on variant
    let src = "/logos/Gemini_Generated_Image_le6fsble6fsble6f.png"; // Default wide
    let aspectRatio = "4/1";

    if (variant === 'vertical') {
        src = "/logos/Screenshot 2026-03-04 111551.png";
        aspectRatio = "1/1.2";
    } else if (variant === 'icon') {
        src = "/logos/Screenshot 2026-03-04 111559.png";
        aspectRatio = "1/1";
    }

    // Horizontal and Vertical images ALREADY have text
    const imageHasText = variant === 'horizontal' || variant === 'vertical';

    return (
        <div className={`${className}`}>
            <div
                className={`relative overflow-hidden`}
                style={{
                    width: variant === 'icon' ? size : variant === 'vertical' ? size * 0.83 : size * 4,
                    height: size,
                }}
            >
                <Image
                    src={src}
                    alt="Ovira AI"
                    fill
                    className="object-cover w-full h-full"
                    priority
                />
            </div>
            {showText && !imageHasText && (
                <span className="text-xl font-bold gradient-text ml-2">Ovira AI</span>
            )}
        </div>
    );
};
