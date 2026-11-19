import type { Appointment, Assignment, Block, Business, Catalog, Client, Confirmation, Professional, Rule, Service, Slot } from "../model";

type BelongsToBusiness = { business_id: string };
type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
type Function<Args, Returns> = { Args: Args; Returns: Returns };

export type Database = { public: {
  Tables: {
    businesses: Table<Business & { owner_id: string | null }>;
    services: Table<Service & BelongsToBusiness>;
    professionals: Table<Professional & BelongsToBusiness>;
    professional_services: Table<Assignment & BelongsToBusiness>;
    clients: Table<Client & BelongsToBusiness>;
    appointments: Table<Appointment & BelongsToBusiness & { created_at: string }>;
    availability_rules: Table<Rule & BelongsToBusiness & { id: string }>;
    blocked_periods: Table<Block & BelongsToBusiness>;
  };
  Views: Record<never, never>;
  Functions: {
    booking_catalog: Function<{ p_slug: string }, Catalog | null>;
    available_slots: Function<{ p_slug: string; p_service: string; p_professional: string; p_day: string; p_ignore?: string | null }, Slot[]>;
    create_booking: Function<{ p_slug: string; p_service: string; p_professional: string; p_start: string;
      p_name: string; p_email: string; p_phone: string }, Confirmation>;
    manage_agenda: Function<{ p_business: string; p_action: string; p_data: object }, undefined>;
  };
  Enums: Record<never, never>;
  CompositeTypes: Record<never, never>;
} };
