"use client";

import { useId } from "react";

interface MadgerLogoProps {
  size?: number;
  className?: string;
}

export default function MadgerLogo({ size = 32, className = "" }: MadgerLogoProps) {
  const uid = useId().replace(/:/g, "");
  const clipId = `mg-clip-${uid}`;
  const gradId = `mg-grad-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <clipPath id={clipId}>
          <path d="M512 0C256 0 192 0 128 32C64 64 32 128 16 192C0 256 0 320 0 512C0 704 0 768 16 832C32 896 64 960 128 992C192 1024 256 1024 512 1024C768 1024 832 1024 896 992C960 960 992 896 1008 832C1024 768 1024 704 1024 512C1024 320 1024 256 1008 192C992 128 960 64 896 32C832 0 768 0 512 0Z" />
        </clipPath>
        <linearGradient id={gradId} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#9DCC00" />
          <stop offset="100%" stopColor="#E8FF5C" />
        </linearGradient>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        <rect width="1024" height="1024" fill="#0A0A0A" />
        <path
          d="M 160 820 L 320 320 L 480 580 L 640 280 L 740 600 C 800 580 850 380 884 180"
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="80"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="884" cy="180" r="40" fill="#E8FF5C" />
      </g>
    </svg>
  );
}
