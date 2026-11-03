import "./globals.css";

export const metadata = {
  title: "MyAI V2 Streaming",
  description: "Groq-powered streaming chatbot demo",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
