import {
  EMPTY_CRM,
  type Appointment,
  type CashOperation,
  type Client,
  type CrmData,
  type Dog,
  type Groomer,
  type Service,
  type Shift,
} from "../crm";

let seq = 0;
const id = (prefix: string) => `${prefix}${++seq}`;

export const appt = (p: Partial<Appointment> = {}): Appointment => ({
  id: id("a"),
  dog_id: "d1",
  groomer_id: "g1",
  date: "2026-10-29",
  time: "09:00",
  planned_duration: 60,
  price: 1000,
  status: "Dokončeno",
  actual_duration: 60,
  behavior_during_visit: null,
  haircut_notes: null,
  notes: null,
  paid_by_card: false,
  serviceIds: [],
  ...p,
});

export const dog = (p: Partial<Dog> = {}): Dog => ({
  id: id("d"),
  name: "Rex",
  breed: null,
  size: "Střední",
  coat: "Dlouhá",
  behavior: "Klidný",
  age: null,
  sex: null,
  health_status: null,
  coat_status: null,
  notes: null,
  is_healthy: true,
  brushes_teeth: false,
  toothbrush_number: null,
  extra_notes: [],
  photo_url: null,
  photo_path: null,
  height: null,
  weight: null,
  pinned_groomer_id: null,
  grooming_instructions: null,
  preferred_additional_services: [],
  owner_id: null,
  clientIds: [],
  ...p,
});

export const client = (p: Partial<Client> = {}): Client => ({
  id: id("c"),
  name: "Jana Nováková",
  phone: null,
  email: null,
  instagram: null,
  language: "CZE",
  preferred_contact: "SMS",
  preferred_salon_id: null,
  review_taken: false,
  notes: null,
  additional_contacts: [],
  dogIds: [],
  ...p,
});

export const groomer = (p: Partial<Groomer> = {}): Groomer => ({
  id: id("g"),
  name: "Eva",
  phone: null,
  specialties: [],
  salon_id: "s1",
  color: null,
  ...p,
});

export const service = (p: Partial<Service> = {}): Service => ({
  id: id("sv"),
  name: "Koupání",
  category: null,
  duration_minutes: 60,
  price: 500,
  ...p,
});

export const shift = (p: Partial<Shift> = {}): Shift => ({
  id: id("sh"),
  groomer_id: "g1",
  week_start: "2026-10-26",
  day_of_week: 1,
  value: "Celý den",
  ...p,
});

export const cashOp = (p: Partial<CashOperation> = {}): CashOperation => ({
  id: id("o"),
  salon_id: "s1",
  type: "Vklad",
  amount: 0,
  date: "2026-10-29",
  note: null,
  created_at: "",
  ...p,
});

export const crmData = (p: Partial<CrmData> = {}): CrmData => ({ ...EMPTY_CRM, ...p });
