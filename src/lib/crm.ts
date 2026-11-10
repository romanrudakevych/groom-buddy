import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

/* ---------- picklists ---------- */
export const LANGUAGES = ["ENG", "RUS", "UKR", "CZE"] as const;
export const CONTACTS = ["SMS", "Phone", "Email", "WhatsApp", "Instagram"] as const;
export const SIZES = ["Malý", "Střední", "Velký", "Obří"] as const;
export const COATS = ["Krátká", "Dlouhá", "Dvojitá", "Kudrnatá", "Drátovitá"] as const;
export const BEHAVIORS = [
  "Klidný",
  "Hravý",
  "Úzkostný",
  "Agresivní",
  "Potřebuje přestávky",
] as const;
export const SEXES = ["Samec", "Samice"] as const;
export const STATUSES = ["Naplánováno", "Potvrzeno", "Dokončeno", "Zrušeno", "Nedostavil se"] as const;
/** Planned or confirmed: the visit is still expected to happen. */
export const isUpcomingStatus = (s: string) => s === "Naplánováno" || s === "Potvrzeno";
export const SPECIALTIES = [
  "Stříhání a trimování",
  "Koupání a fénování",
  "Stripping",
  "Kompletní péče",
  "Stříhání drápků",
  "Čištění uší",
] as const;
export const SHIFT_VALUES = [
  "Volno",
  "10:00–14:30",
  "14:30–19:00",
  "10:00–19:00",
  "Celý den",
] as const;
export type ShiftValue = (typeof SHIFT_VALUES)[number];
export const DAY_LABELS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

/* ---------- types ---------- */
export type Salon = { id: string; name: string };
export type Client = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  language: string;
  preferred_contact: string;
  preferred_salon_id: string | null;
  review_taken: boolean;
  notes: string | null;
  additional_contacts: FamilyContact[];
  dogIds: string[];
};
/** Extra family member/helper who may bring or pick up the owner's dogs. */
export type FamilyContact = { id: string; name: string; role: string; phone: string };
export type Dog = {
  id: string;
  name: string;
  breed: string | null;
  size: string;
  coat: string;
  behavior: string;
  age: number | null;
  sex: string | null;
  health_status: string | null;
  coat_status: string | null;
  notes: string | null;
  is_healthy: boolean;
  brushes_teeth: boolean;
  toothbrush_number: string | null;
  extra_notes: string[];
  photo_url: string | null;
  photo_path: string | null;
  height: number | null;
  weight: number | null;
  pinned_groomer_id: string | null;
  grooming_instructions: string | null;
  preferred_additional_services: string[];
  /** Main owner (the only owner). */
  owner_id: string | null;
  /** Derived: [owner_id] when set. */
  clientIds: string[];
};
export type Groomer = {
  id: string;
  name: string;
  phone: string | null;
  specialties: string[];
  salon_id: string;
  color: string | null;
};
export type Service = {
  id: string;
  name: string;
  category: string | null;
  duration_minutes: number;
  price: number;
};
export type Appointment = {
  id: string;
  dog_id: string;
  groomer_id: string;
  date: string;
  time: string;
  planned_duration: number;
  price: number;
  status: string;
  actual_duration: number | null;
  behavior_during_visit: string | null;
  haircut_notes: string | null;
  notes: string | null;
  paid_by_card: boolean;
  serviceIds: string[];
};

export const CASH_OP_TYPES = ["Vklad", "Výdaj", "Inkaso"] as const;
export type CashOperation = {
  id: string;
  salon_id: string;
  type: string;
  amount: number;
  date: string;
  note: string | null;
  created_at: string;
};
/** Signed cash effect: deposits add, expenses and collections subtract. */
export const cashOpSign = (type: string) => (type === "Vklad" ? 1 : -1);
export const CONTACT_RESULTS = ["Objednal se", "Kontaktován", "Nedovolal se", "Ztracený"] as const;
export const ABSENCE_REASONS = ["Stěhování", "Drahé", "Kvalita služeb", "Jiný salon", "Stříhají sami", "Jiné"] as const;
export type ReactivationContact = {
  id: string;
  dog_id: string;
  contacted_at: string;
  result: string;
  reason: string | null;
  note: string | null;
  remind_on: string | null;
  created_at: string;
};
export type Shift = {
  id: string;
  groomer_id: string;
  week_start: string;
  day_of_week: number;
  value: string;
};

export type CrmData = {
  salons: Salon[];
  clients: Client[];
  dogs: Dog[];
  groomers: Groomer[];
  services: Service[];
  appointments: Appointment[];
  shifts: Shift[];
  cashOps: CashOperation[];
  contacts: ReactivationContact[];
  closings: CashClosing[];
};
export type CashClosing = { id: string; salon_id: string; date: string; expected: number; counted: number; note: string | null; created_at: string };

/* ---------- loading ---------- */
async function fetchAll(): Promise<CrmData> {
  const [salons, clients, dogs, groomers, services, appointments, links, apptServices, shifts, cashOps, contacts, closings] =
    await Promise.all([
      supabase.from("salons").select("*").order("name"),
      supabase.from("clients").select("*").order("name"),
      supabase.from("dogs").select("*").order("name"),
      supabase.from("groomers").select("*").order("name"),
      supabase.from("services").select("*").order("sort_order"),
      supabase.from("appointments").select("*").order("date"),
      Promise.resolve({ data: [], error: null }),
      supabase.from("appointment_services").select("*"),
      supabase.from("shifts").select("*"),
      supabase.from("cash_operations").select("*").order("date"),
      supabase.from("reactivation_contacts").select("*").order("created_at"),
      supabase.from("cash_closings").select("*"),
    ]);

  const err = [
    salons,
    clients,
    dogs,
    groomers,
    services,
    appointments,
    links,
    apptServices,
    shifts,
    cashOps,
    contacts,
    closings,
  ].find((r) => r.error);
  if (err?.error) throw new Error(err.error.message);

  void links;
  const dogRows = (dogs.data ?? []) as unknown as Dog[];
  const svcRows = (apptServices.data ?? []) as { appointment_id: string; service_id: string }[];

  return {
    salons: (salons.data ?? []) as Salon[],
    clients: ((clients.data ?? []) as unknown as Client[]).map((c) => ({
      ...c,
      additional_contacts: Array.isArray(c.additional_contacts) ? c.additional_contacts : [],
      dogIds: dogRows.filter((d) => d.owner_id === c.id).map((d) => d.id),
    })),
    dogs: dogRows.map((d) => ({
      ...d,
      clientIds: d.owner_id ? [d.owner_id] : [],
    })),
    groomers: (groomers.data ?? []) as Groomer[],
    services: (services.data ?? []) as Service[],
    appointments: ((appointments.data ?? []) as unknown as Appointment[]).map((a) => ({
      ...a,
      time: a.time.slice(0, 5),
      serviceIds: svcRows.filter((s) => s.appointment_id === a.id).map((s) => s.service_id),
    })),
    shifts: (shifts.data ?? []) as Shift[],
    cashOps: (cashOps.data ?? []) as CashOperation[],
    contacts: (contacts.data ?? []) as ReactivationContact[],
    closings: (closings.data ?? []) as CashClosing[],
  };
}

export const EMPTY_CRM: CrmData = {
  salons: [],
  clients: [],
  dogs: [],
  groomers: [],
  services: [],
  appointments: [],
  shifts: [],
  cashOps: [],
  contacts: [],
  closings: [],
};

export function useCrm() {
  const q = useQuery({ queryKey: ["crm"], queryFn: fetchAll });
  return { ...q, data: q.data ?? EMPTY_CRM, ready: !!q.data };
}

export function useCrmMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm"] }),
  });
}

/* ---------- writes ---------- */
export type ClientInput = {
  id?: string;
  name: string;
  phone: string;
  email: string;
  instagram: string;
  language: string;
  preferred_contact: string;
  preferred_salon_id: string | null;
  review_taken: boolean;
  notes: string;
  additional_contacts: FamilyContact[];
};

export type DogInput = {
  id?: string;
  name: string;
  breed: string;
  size: string;
  coat: string;
  behavior: string;
  age: number | null;
  sex: string | null;
  health_status: string;
  coat_status: string;
  notes: string;
  is_healthy: boolean;
  brushes_teeth: boolean;
  toothbrush_number: string;
  extra_notes: string[];
  photo_url: string | null;
  photo_path: string | null;
  height: number | null;
  weight: number | null;
  pinned_groomer_id: string | null;
  grooming_instructions: string;
  preferred_additional_services: string[];
};

const PHOTO_BUCKET = "dog-photos";

/** Upload the full-size original to the private photo bucket; returns its storage path. */
export async function uploadDogPhoto(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

/** Short-lived signed link to the private original. */
export async function dogPhotoSignedUrl(path: string) {
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}

/** Upload a new full-size photo and attach it to the dog record. */
export async function setDogPhoto(dogId: string, file: File) {
  const photo_path = await uploadDogPhoto(file);
  const photo_url = await fileToDataUrl(file);
  const { error } = await supabase.from("dogs").update({ photo_path, photo_url }).eq("id", dogId);
  if (error) throw error;
}

export const ADDITIONAL_CATEGORY = "Doplňková péče";
export const additionalServices = (data: CrmData) =>
  data.services.filter((s) => s.category === ADDITIONAL_CATEGORY);

/** Last completed visit of a dog, or null. */
export function lastGrooming(data: CrmData, dogId: string) {
  return (
    data.appointments
      .filter((a) => a.dog_id === dogId && a.status === "Dokončeno")
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))[0] ?? null
  );
}

/** Resize an image file to a compact JPEG data URL for storing on the dog record. */
export function fileToDataUrl(file: File, max = 480): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export async function saveClient(input: ClientInput, dogIds: string[], newDog?: DogInput) {
  let clientId = input.id;
  const payload = {
    ...input,
    additional_contacts: input.additional_contacts.filter((c) => c.name.trim() || c.phone.trim()) as unknown as Json,
  };
  delete payload.id;
  if (clientId) {
    const { error } = await supabase.from("clients").update(payload).eq("id", clientId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from("clients").insert(payload).select("id").single();
    if (error) throw error;
    clientId = data.id;
  }
  if (newDog) {
    const dp = { ...newDog, owner_id: clientId! };
    delete dp.id;
    const { error } = await supabase.from("dogs").insert(dp);
    if (error) throw error;
  }
  if (dogIds.length) {
    const { error } = await supabase.from("dogs").update({ owner_id: clientId! }).in("id", dogIds);
    if (error) throw error;
  }
  return clientId!;
}

export async function saveDog(input: DogInput, ownerId: string | null, newClient?: ClientInput) {
  let owner = ownerId;
  if (newClient) {
    const cp = { ...newClient, additional_contacts: newClient.additional_contacts as unknown as Json };
    delete cp.id;
    const { data, error } = await supabase.from("clients").insert(cp).select("id").single();
    if (error) throw error;
    owner = data.id;
  }
  let dogId = input.id;
  const payload = {
    ...input,
    owner_id: owner,
    health_status: input.is_healthy ? null : input.health_status || null,
    toothbrush_number: input.brushes_teeth ? input.toothbrush_number || null : null,
    extra_notes: input.extra_notes.map((n) => n.trim()).filter(Boolean),
  };
  delete payload.id;
  if (dogId) {
    const { error } = await supabase.from("dogs").update(payload).eq("id", dogId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from("dogs").insert(payload).select("id").single();
    if (error) throw error;
    dogId = data.id;
  }
  return dogId!;
}

export type GroomerInput = {
  id?: string;
  name: string;
  phone: string;
  specialties: string[];
  salon_id: string;
  color: string;
};

export const GROOMER_PALETTE = [
  "#0d9488", "#7c3aed", "#d97706", "#059669", "#e11d48", "#4f46e5", "#0284c7", "#c026d3",
];

/** Persisted color, or a stable palette color derived from the groomer's position. */
export function groomerColor(groomers: Groomer[], id: string): string {
  const g = groomers.find((x) => x.id === id);
  if (g?.color) return g.color;
  const i = Math.max(0, groomers.findIndex((x) => x.id === id));
  return GROOMER_PALETTE[i % GROOMER_PALETTE.length]!;
}

/** First palette color not used yet (for new groomers). */
export function nextGroomerColor(groomers: Groomer[]): string {
  const used = new Set(groomers.map((g) => g.color));
  return GROOMER_PALETTE.find((c) => !used.has(c)) ?? GROOMER_PALETTE[groomers.length % GROOMER_PALETTE.length]!;
}

export async function saveGroomer(input: GroomerInput) {
  const payload = { ...input };
  delete payload.id;
  if (input.id) {
    const { error } = await supabase.from("groomers").update(payload).eq("id", input.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("groomers").insert(payload);
    if (error) throw error;
  }
}

export type AppointmentInput = {
  id?: string;
  dog_id: string;
  groomer_id: string;
  date: string;
  time: string;
  status: string;
  actual_duration: number | null;
  behavior_during_visit: string | null;
  haircut_notes?: string;
  notes: string;
  paid_by_card: boolean;
  serviceIds: string[];
  price?: number | null;
  /** Override for planned length (quick booking reuses previous visit length). */
  planned_duration?: number | null;
};

// Size/coat price grid from the website price list ("od" = lowest price).
// Columns: short coat, long coat (incl. double/wire), curly coat.
export const SIZE_PRICED_SERVICE = "Kompletní péče";
const SIZE_TIERS: { maxKg: number; maxCm: number; prices: [number, number, number] }[] = [
  { maxKg: 5, maxCm: 28, prices: [1200, 1200, 1400] },
  { maxKg: 10, maxCm: 40, prices: [1400, 1500, 1600] },
  { maxKg: 20, maxCm: 50, prices: [1700, 1800, 2000] },
  { maxKg: 40, maxCm: 65, prices: [2000, 2500, 2700] },
];
const XL_PRICE = 3000;
export function sizePrice(
  weight: number | null | undefined,
  height: number | null | undefined,
  coat: string | null | undefined,
): number | null {
  if (weight == null && height == null) return null;
  const col = coat === "Krátká" ? 0 : coat === "Kudrnatá" ? 2 : 1;
  const tier = SIZE_TIERS.find(
    (t) => (weight == null || weight <= t.maxKg) && (height == null || height <= t.maxCm),
  );
  return tier ? tier.prices[col] : XL_PRICE;
}
export function servicePriceForDog(
  s: Service,
  dog?: { weight?: number | null; height?: number | null; coat?: string | null } | null,
) {
  if (s.name !== SIZE_PRICED_SERVICE || !dog) return s.price;
  return sizePrice(dog.weight, dog.height, dog.coat) ?? s.price;
}

export async function saveAppointment(input: AppointmentInput, services: Service[]) {
  const chosen = services.filter((s) => input.serviceIds.includes(s.id));
  const payload = {
    dog_id: input.dog_id,
    groomer_id: input.groomer_id,
    date: input.date,
    time: input.time,
    status: input.status,
    planned_duration: chosen.reduce((a, s) => a + s.duration_minutes, 0),
    price: input.price ?? chosen.reduce((a, s) => a + s.price, 0),
    actual_duration: input.status === "Dokončeno" ? input.actual_duration : null,
    behavior_during_visit: input.status === "Dokončeno" ? input.behavior_during_visit : null,
    haircut_notes: input.status === "Dokončeno" ? input.haircut_notes?.trim() || null : null,
    notes: input.notes || null,
    paid_by_card: input.paid_by_card,
  };
  // Completed visits are locked in the database (only notes may change), so
  // services are written first and the "Dokončeno" status is set last.
  const finalStatus = payload.status;
  const staged = { ...payload, status: finalStatus === "Dokončeno" ? "Naplánováno" : finalStatus };
  let id = input.id;
  if (id) {
    const { error } = await supabase.from("appointments").update(staged).eq("id", id);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("appointments")
      .insert(staged)
      .select("id")
      .single();
    if (error) throw error;
    id = data.id;
  }
  await supabase.from("appointment_services").delete().eq("appointment_id", id!);
  if (input.serviceIds.length) {
    const { error } = await supabase
      .from("appointment_services")
      .insert(input.serviceIds.map((service_id) => ({ appointment_id: id!, service_id })));
    if (error) throw error;
  }
  if (finalStatus !== staged.status) {
    const { error } = await supabase.from("appointments").update({ status: finalStatus }).eq("id", id!);
    if (error) throw error;
  }
}

/** A completed visit is locked: only general and haircut notes can be edited. */
export function isAppointmentLocked(a: Pick<Appointment, "status"> | null | undefined) {
  return a?.status === "Dokončeno";
}

export async function saveLockedAppointmentNotes(id: string, notes: string, haircutNotes: string) {
  const { error } = await supabase
    .from("appointments")
    .update({ notes: notes || null, haircut_notes: haircutNotes.trim() || null })
    .eq("id", id);
  if (error) throw error;
}

export async function setShift(
  groomer_id: string,
  week_start: string,
  day_of_week: number,
  value: ShiftValue,
) {
  if (!(SHIFT_VALUES as readonly string[]).includes(value)) {
    throw new Error(`Neplatná hodnota směny: ${value}`);
  }
  const { error } = await supabase
    .from("shifts")
    .upsert({ groomer_id, week_start, day_of_week, value }, { onConflict: "groomer_id,week_start,day_of_week" });
  if (error) throw error;
}

/* ---------- derived helpers ---------- */
export const todayISO = () => toISO(new Date());

export function toISO(d: Date) {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function fromISO(s: string) {
  const parts = s.split("-").map(Number);
  return new Date(parts[0] ?? 1970, (parts[1] ?? 1) - 1, parts[2] ?? 1);
}

export function formatDate(iso: string) {
  const d = fromISO(iso);
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
}

export function czk(n: number) {
  return `${n.toLocaleString("cs-CZ")} Kč`;
}

export function mondayOf(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function salonOfAppointment(data: CrmData, a: Appointment) {
  return data.groomers.find((g) => g.id === a.groomer_id)?.salon_id ?? null;
}

export function serviceNames(data: CrmData, ids: string[]) {
  return ids
    .map((id) => data.services.find((s) => s.id === id)?.name)
    .filter(Boolean)
    .join(", ");
}

export function dogOwners(data: CrmData, dogId: string) {
  return data.clients.filter((c) => c.dogIds.includes(dogId));
}

export function clientDogs(data: CrmData, clientId: string) {
  return data.dogs.filter((d) => d.clientIds.includes(clientId));
}

export function monthRange(offset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { from: toISO(start), to: toISO(end) };
}

export function retentionRate(appointments: Appointment[]) {
  const counts = new Map<string, number>();
  appointments
    .filter((a) => a.status === "Dokončeno")
    .forEach((a) => counts.set(a.dog_id, (counts.get(a.dog_id) ?? 0) + 1));
  const total = counts.size;
  if (!total) return 0;
  const repeat = [...counts.values()].filter((v) => v > 1).length;
  return Math.round((repeat / total) * 100);
}

export type CashOpInput = { salon_id: string; type: string; amount: number; date: string; note: string };
export async function saveCashOp(input: CashOpInput) {
  const { error } = await supabase.from("cash_operations").insert({ ...input, note: input.note || null });
  if (error) throw error;
}

/** Completed visits only; split into cash and card totals. */
export function paymentSplit(appointments: Appointment[]) {
  const done = appointments.filter((a) => a.status === "Dokončeno");
  const card = done.filter((a) => a.paid_by_card).reduce((s, a) => s + a.price, 0);
  const cash = done.filter((a) => !a.paid_by_card).reduce((s, a) => s + a.price, 0);
  return { cash, card };
}

export function groomerRetention(appointments: Appointment[], groomerId: string) {
  return retentionRate(appointments.filter((a) => a.groomer_id === groomerId));
}

export function groomerDogCount(dogs: ReadonlyArray<Pick<Dog, "pinned_groomer_id">>, groomerId: string) {
  return dogs.filter((dog) => dog.pinned_groomer_id === groomerId).length;
}

// Future: restrict to owner/admin roles (also enforce server-side).
export const canDeleteAppointment = () => true;

export async function deleteAppointment(id: string) {
  const { error: e1 } = await supabase.from("appointment_services").delete().eq("appointment_id", id);
  if (e1) throw e1;
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteGroomer(id: string) {
  const { data: appts, error: e1 } = await supabase.from("appointments").select("id").eq("groomer_id", id);
  if (e1) throw e1;
  const ids = (appts ?? []).map((a) => a.id);
  if (ids.length) {
    const { error } = await supabase.from("appointment_services").delete().in("appointment_id", ids);
    if (error) throw error;
    const { error: e2 } = await supabase.from("appointments").delete().in("id", ids);
    if (e2) throw e2;
  }
  for (const q of [
    supabase.from("shifts").delete().eq("groomer_id", id),
    supabase.from("dogs").update({ pinned_groomer_id: null }).eq("pinned_groomer_id", id),
  ]) {
    const { error } = await q;
    if (error) throw error;
  }
  const { error } = await supabase.from("groomers").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- reactivation ---------- */
const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86400000);

export type InactiveDog = { dog: Dog; lastVisit: string; days: number; lastContact: ReactivationContact | null };

/**
 * Dogs whose last completed visit is older than `thresholdDays`, with no upcoming
 * planned visit, and not contacted since that last visit (unless a reminder date has passed).
 * "Ztracený" (lost) dogs are excluded.
 */
export function inactiveDogs(
  data: Pick<CrmData, "dogs" | "appointments" | "contacts">,
  thresholdDays: number,
  today: string,
): InactiveDog[] {
  const out: InactiveDog[] = [];
  for (const dog of data.dogs) {
    const appts = data.appointments.filter((a) => a.dog_id === dog.id);
    if (appts.some((a) => isUpcomingStatus(a.status) && a.date >= today)) continue;
    const done = appts.filter((a) => a.status === "Dokončeno" && a.date <= today).map((a) => a.date).sort();
    const lastVisit = done[done.length - 1];
    if (!lastVisit) continue;
    const days = daysBetween(lastVisit, today);
    if (days <= thresholdDays) continue;
    const contacts = (data.contacts ?? [])
      .filter((c) => c.dog_id === dog.id && c.contacted_at >= lastVisit)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    const lastContact = contacts[contacts.length - 1] ?? null;
    if (lastContact) {
      if (lastContact.result === "Ztracený" || lastContact.result === "Objednal se") continue;
      if (!lastContact.remind_on || lastContact.remind_on > today) continue;
    }
    out.push({ dog, lastVisit, days, lastContact });
  }
  return out.sort((a, b) => b.days - a.days);
}

export async function saveReactivationContact(input: {
  dog_id: string;
  result: string;
  reason: string | null;
  note: string | null;
  remind_on: string | null;
}) {
  const { error } = await supabase
    .from("reactivation_contacts")
    .insert({ ...input, contacted_at: todayISO() });
  if (error) throw error;
}

/* ---------- admin dashboard ---------- */
export async function setAppointmentStatus(id: string, status: string) {
  const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
  if (error) throw error;
}

/** Cash movements for one salon and one day: cash from completed visits plus manual operations. */
export function dayCash(
  data: Pick<CrmData, "appointments" | "groomers" | "cashOps">,
  salonId: string,
  date: string,
) {
  const inSalon = (gid: string) => data.groomers.find((g) => g.id === gid)?.salon_id === salonId;
  const done = (data.appointments ?? []).filter(
    (a) => a.status === "Dokončeno" && a.date === date && inSalon(a.groomer_id),
  );
  const visitsCash = done.filter((a) => !a.paid_by_card).reduce((s, a) => s + a.price, 0);
  const card = done.filter((a) => a.paid_by_card).reduce((s, a) => s + a.price, 0);
  const ops = (data.cashOps ?? []).filter((o) => o.salon_id === salonId && o.date === date);
  const deposits = ops.filter((o) => o.type === "Vklad").reduce((s, o) => s + o.amount, 0);
  const outflows = ops.filter((o) => o.type !== "Vklad").reduce((s, o) => s + o.amount, 0);
  return { visitsCash, card, deposits, outflows, net: visitsCash + deposits - outflows };
}

/** Cash balance in a salon's drawer at the end of a day (all history up to and including that day). */
export function drawerBalance(
  data: Pick<CrmData, "appointments" | "groomers" | "cashOps">,
  salonId: string,
  date: string,
) {
  const inSalon = (gid: string) => data.groomers.find((g) => g.id === gid)?.salon_id === salonId;
  const visits = (data.appointments ?? [])
    .filter((a) => a.status === "Dokončeno" && !a.paid_by_card && a.date <= date && inSalon(a.groomer_id))
    .reduce((s, a) => s + a.price, 0);
  const ops = (data.cashOps ?? [])
    .filter((o) => o.salon_id === salonId && o.date <= date)
    .reduce((s, o) => s + cashOpSign(o.type) * o.amount, 0);
  return visits + ops;
}

export async function saveCashClosing(input: { salon_id: string; date: string; expected: number; counted: number; note: string }) {
  const { error } = await supabase
    .from("cash_closings")
    .upsert({ ...input, note: input.note || null }, { onConflict: "salon_id,date" });
  if (error) throw error;
}
