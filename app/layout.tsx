import type { Metadata, Viewport } from "next";
import { Cairo, Tajawal } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
});

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
});

export const viewport: Viewport = { themeColor: "#101821", width: "device-width", initialScale: 1 };

export const metadata: Metadata = {
  title: "وش علينا؟ | Wosh Alina",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "وش علينا" },
  description: "منصة المتابعة الدراسية - الطلاب يشوفون وش عليهم من اختبارات وواجبات - تسجيل بالاسم ورقم الجوال فقط",
  keywords: ["جامعة", "طلاب", "تعليم", "واجبات", "وش علينا"],
  authors: [{ name: "Code Hub" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${cairo.variable} ${tajawal.variable} antialiased bg-background text-foreground font-sans`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
