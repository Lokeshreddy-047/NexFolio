import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/toast-provider";
import { CommandPalette } from "@/components/command-palette";

export const metadata: Metadata = {
  title: "NexFolio | AI Risk & Portfolio Intelligence",
  description:
    "Explainable AI-powered portfolio risk profiling and investment intelligence platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased selection:bg-emerald-500/20 selection:text-emerald-300 relative min-h-screen bg-[#030712] text-slate-100 overflow-x-hidden"
        suppressHydrationWarning
      >
        {/* Ambient Aurora Glow Spheres (Fixed in Background) */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
          {/* Top Left Iris Glow */}
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] animate-pulse-glow" />
          {/* Top Right Cyan Glow */}
          <div className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[130px]" />
          {/* Center-Bottom Emerald Glow */}
          <div className="absolute bottom-10 left-1/3 w-[600px] h-[500px] bg-emerald-500/[0.07] rounded-full blur-[160px]" />
          {/* Micro Grid Overlay */}
          <div className="absolute inset-0 bg-grid-cyber opacity-70" />
        </div>

        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <div className="relative z-10">
                {children}
                <CommandPalette />
              </div>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}