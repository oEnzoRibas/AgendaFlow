import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AgendaFlow · Agendamentos online", template: "%s · AgendaFlow" },
  description: "Agendamento online e gestão da agenda de pequenos negócios. Explore a demonstração do Studio Bloom.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
