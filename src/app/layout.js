export const metadata = {
  title: "TransplantCare",
  description: "Post-transplant immunosuppression monitor for patients and caregivers",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}