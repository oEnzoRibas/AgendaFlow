import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Footer } from "@/components/footer";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AgendaFlow · Agendamentos online", template: "%s · AgendaFlow" },
  authors: [{ name: "oEnzoRibas", url: "https://github.com/oEnzoRibas" }],
  description: "Agendamento online e gestão da agenda de pequenos negócios. Explore a demonstração do Studio Bloom.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="pt-BR"><body><div className="app-content">{children}</div><Footer /></body></html>;
}
