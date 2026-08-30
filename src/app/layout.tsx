import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RevivePay — AI Revenue Recovery Platform",
  description: "Autonomous multi-agent payment recovery layer with deterministic guardrails and realtime merchant visibility."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="w-full min-h-screen">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen w-full m-0 p-0 text-[#191c1e]">
        {children}
      </body>
    </html>
  );
}
