import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Archivo, Public_Sans } from "next/font/google";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import "./globals.css";

const bodyFont = Public_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const displayFont = Archivo({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MUniverse",
  description: "MUniverse portal built with Next.js App Router and TypeScript.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable} bg-black text-zinc-100`}>
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#ffffff",
              colorBackground: "#0a0a0b",
            },
            elements: {
              card: "border border-white/15 bg-zinc-950 text-zinc-100 shadow-xl",
              headerTitle: "text-zinc-100",
              headerSubtitle: "text-zinc-400",
              socialButtonsBlockButton:
                "border border-white/25 bg-white/5 text-zinc-100 hover:bg-white/10 active:bg-white/16",
              dividerLine: "bg-white/15",
              dividerText: "text-zinc-400",
              formFieldInput:
                "border border-white/20 bg-white/5 text-zinc-100 placeholder:text-zinc-500 focus:border-white/40 focus:ring-white/25",
              formButtonPrimary:
                "border border-white/30 bg-white/18 text-zinc-100 hover:bg-white/24 active:bg-white/30",
              footerActionText: "text-zinc-400",
              footerActionLink: "text-zinc-100 hover:text-white",
            },
          }}
        >
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
