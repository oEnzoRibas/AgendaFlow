"use client";

import { Dialog as Primitive } from "radix-ui";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";

export function Dialog({ title, description, close, children }: {
  title: string; description: string; close: () => void; children: ReactNode;
}) {
  return <Primitive.Root open onOpenChange={(open) => { if (!open) close(); }}>
    <Primitive.Portal>
      <Primitive.Overlay className="dialog-overlay" />
      <Primitive.Content className="dialog-content">
        <div className="dialog-heading">
          <div><Primitive.Title>{title}</Primitive.Title><Primitive.Description>{description}</Primitive.Description></div>
          <Primitive.Close asChild><Button variant="ghost" size="icon" aria-label="Fechar"><X size={18} /></Button></Primitive.Close>
        </div>
        {children}
      </Primitive.Content>
    </Primitive.Portal>
  </Primitive.Root>;
}
