export const sections = {
  painel: "Visão geral",
  agenda: "Agenda",
  clientes: "Clientes",
  servicos: "Serviços",
  profissionais: "Profissionais",
  configuracoes: "Configurações",
};

export type Section = keyof typeof sections;

export function isSection(value: string): value is Section {
  return Object.hasOwn(sections, value);
}
