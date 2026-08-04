import type { Metadata } from "next";
import { Chakra_Petch, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "next-themes";

import { SiteHeader } from "@/components/site-header";
import "./globals.css";

// Stackdrop type roles (see docs/wiki/webapp-design-system.md):
// Chakra Petch = display, Space Grotesk = body, JetBrains Mono = labels.
const chakraPetch = Chakra_Petch({
  variable: "--font-chakra-petch",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Claude Developer Course",
  description: "Internal Claude developer course for the Stackdrop team",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: next-themes stamps the `dark` class on <html> before hydration.
    <html
      lang="en"
      className={`${chakraPetch.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <SiteHeader />
          <main className="mx-auto w-full max-w-(--shell-max) flex-1 px-6 py-10">{children}</main>
          <footer className="border-t border-border py-6">
            <div className="mx-auto max-w-(--shell-max) px-6">
              <span className="mono-label">Stackdrop · Internal</span>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
