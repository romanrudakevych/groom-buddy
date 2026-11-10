import type React from "react";
import { createContext, useContext, useState, type ReactNode } from "react";
import { ClientDialog } from "./ClientDialog";
import { DogDialog } from "./DogDialog";
import { GroomerDialog } from "./GroomerDialog";
import { QuickBookingDialog } from "./QuickBookingDialog";
import { AppointmentDialog, type AppointmentPreset } from "./AppointmentDialog";
import type { Appointment, Client, Dog, Groomer } from "@/lib/crm";

type Ctx = {
  openClient: (client?: Client | null) => void;
  openDog: (dog?: Dog | null) => void;
  openGroomer: (groomer?: Groomer | null) => void;
  openAppointment: (appointment?: Appointment | null, preset?: AppointmentPreset) => void;
  openQuickBooking: () => void;
};

// Keep a single context instance across hot reloads so consumers and provider always match.
const g = globalThis as unknown as { __crmDialogsCtx?: React.Context<Ctx | null> };
const DialogsContext = (g.__crmDialogsCtx ??= createContext<Ctx | null>(null));

export function useDialogs() {
  const ctx = useContext(DialogsContext);
  if (!ctx) throw new Error("useDialogs must be used inside CrmDialogs");
  return ctx;
}

export function CrmDialogs({ children }: { children: ReactNode }) {
  const [clientOpen, setClientOpen] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [dogOpen, setDogOpen] = useState(false);
  const [dog, setDog] = useState<Dog | null>(null);
  const [groomerOpen, setGroomerOpen] = useState(false);
  const [groomer, setGroomer] = useState<Groomer | null>(null);
  const [apptOpen, setApptOpen] = useState(false);
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [preset, setPreset] = useState<AppointmentPreset | undefined>(undefined);

  const [quickOpen, setQuickOpen] = useState(false);
  const value: Ctx = {
    openQuickBooking: () => setQuickOpen(true),
    openClient: (c) => {
      setClient(c ?? null);
      setClientOpen(true);
    },
    openDog: (d) => {
      setDog(d ?? null);
      setDogOpen(true);
    },
    openGroomer: (g) => {
      setGroomer(g ?? null);
      setGroomerOpen(true);
    },
    openAppointment: (a, p) => {
      setAppt(a ?? null);
      setPreset(p);
      setApptOpen(true);
    },
  };

  return (
    <DialogsContext.Provider value={value}>
      {children}
      <ClientDialog open={clientOpen} onOpenChange={setClientOpen} client={client} />
      <DogDialog open={dogOpen} onOpenChange={setDogOpen} dog={dog} />
      <GroomerDialog open={groomerOpen} onOpenChange={setGroomerOpen} groomer={groomer} />
      <QuickBookingDialog open={quickOpen} onOpenChange={setQuickOpen} />
      <AppointmentDialog
        open={apptOpen}
        onOpenChange={setApptOpen}
        appointment={appt}
        preset={preset}
      />
    </DialogsContext.Provider>
  );
}
