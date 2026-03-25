export const metadata = {
  metadataBase: new URL("https://transplant-care-v2.vercel.app"),
  title: "TransplantCare",
  description: "A dynamic post-transplant immunosuppression monitor that connects lab values to daily behavioral protocols — for patients and the partners who support them.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "TransplantCare — Post-Transplant Recovery, Guided",
    description: "A dynamic immunosuppression monitor that connects lab values to daily behavioral protocols — for patients and the partners who support them.",
    url: "https://transplant-care-v2.vercel.app",
    siteName: "TransplantCare",
    images: [
      {
        url: "/patient-view.png",
        width: 1200,
        height: 630,
        alt: "TransplantCare patient dashboard showing ALC recovery tracking",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TransplantCare — Post-Transplant Recovery, Guided",
    description: "A dynamic immunosuppression monitor for transplant patients and their partners.",
    images: ["/patient-view.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
