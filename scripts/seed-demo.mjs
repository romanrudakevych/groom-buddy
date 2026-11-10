// Fills the linked Supabase project with demo data: groomers, shifts, clients, dogs,
// visits (past and upcoming), cash operations and reactivation contacts.
//
//   npm run db:seed            # add demo data (refuses if demo data already exists)
//   npm run db:seed -- --clean # remove demo data only
//
// Needs SUPABASE_URL and SUPABASE_SECRET_KEY in .env (the secret key bypasses RLS).
// Demo rows are recognisable: clients use @example.com emails, groomers use the names
// below, cash operations carry the "(demo)" note suffix.
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set (see .env)");
const db = createClient(url, key, { auth: { persistSession: false } });

const DEMO_EMAIL = "%@example.com";
const DEMO_NOTE = "(demo)";

/* ---------- helpers ---------- */
let seed = 20261110;
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));

const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const mondayOf = (d) => addDays(d, -((d.getDay() + 6) % 7));
const today = new Date();
today.setHours(0, 0, 0, 0);
const todayISO = toISO(today);

const must = async (label, promise) => {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};
const insertChunked = async (table, rows, select = "*") => {
  const out = [];
  for (let i = 0; i < rows.length; i += 200) {
    out.push(
      ...(await must(
        table,
        db
          .from(table)
          .insert(rows.slice(i, i + 200))
          .select(select),
      )),
    );
  }
  return out;
};

/* ---------- demo content ---------- */
const GROOMERS = [
  {
    name: "Kateřina Nováková",
    phone: "+420 721 334 112",
    salon: "Sokolovská",
    color: "#7c3aed",
    specialties: ["Stříhání a trimování", "Kompletní péče", "Stříhání drápků"],
  },
  {
    name: "Tereza Dvořáková",
    phone: "+420 732 118 905",
    salon: "Sokolovská",
    color: "#d97706",
    specialties: ["Koupání a fénování", "Čištění uší", "Stříhání drápků"],
  },
  {
    name: "Olena Kovalenko",
    phone: "+420 776 450 221",
    salon: "Tuklatská",
    color: "#e11d48",
    specialties: ["Stripping", "Stříhání a trimování", "Kompletní péče"],
  },
  {
    name: "Markéta Svobodová",
    phone: "+420 604 982 337",
    salon: "Tuklatská",
    color: "#0284c7",
    specialties: ["Koupání a fénování", "Kompletní péče"],
  },
];

// [name, language, preferred contact, salon, instagram?, family contacts?]
const CLIENTS = [
  ["Jana Procházková", "CZE", "Phone", "Sokolovská"],
  ["Petr Černý", "CZE", "SMS", "Sokolovská"],
  ["Lucie Veselá", "CZE", "Instagram", "Tuklatská", "lucie.vesela"],
  ["Martin Horák", "CZE", "Phone", "Tuklatská"],
  ["Eva Marková", "CZE", "Email", "Sokolovská"],
  ["Tomáš Kučera", "CZE", "WhatsApp", "Tuklatská"],
  ["Hana Pokorná", "CZE", "SMS", "Sokolovská", null, [["Karel Pokorný", "Manžel"]]],
  ["Jakub Němec", "CZE", "Phone", "Tuklatská"],
  ["Barbora Králová", "CZE", "Instagram", "Sokolovská", "bara.kralova"],
  ["Ondřej Beneš", "CZE", "Email", "Tuklatská"],
  ["Анна Смирнова", "RUS", "WhatsApp", "Sokolovská"],
  ["Дмитрий Иванов", "RUS", "Phone", "Tuklatská", null, [["Ольга Иванова", "Жена"]]],
  ["Екатерина Волкова", "RUS", "Instagram", "Sokolovská", "katya.volkova.dogs"],
  ["Сергей Попов", "RUS", "WhatsApp", "Tuklatská"],
  ["Мария Кузнецова", "RUS", "SMS", "Sokolovská"],
  ["Оксана Шевченко", "UKR", "WhatsApp", "Sokolovská"],
  ["Андрій Бондаренко", "UKR", "Phone", "Tuklatská"],
  ["Юлія Ткаченко", "UKR", "Instagram", "Tuklatská", "yulia.tk", [["Максим Ткаченко", "Син"]]],
  ["Ірина Мельник", "UKR", "WhatsApp", "Sokolovská"],
  ["Emily Carter", "ENG", "Email", "Sokolovská"],
  ["James Wilson", "ENG", "WhatsApp", "Tuklatská"],
  ["Sophie Müller", "ENG", "Email", "Sokolovská"],
  ["Lukas Schneider", "ENG", "Phone", "Tuklatská"],
  ["Zuzana Fialová", "CZE", "Phone", "Sokolovská"],
];

// [name, breed, size, coat, sex, age, weight kg, height cm, behavior]
const DOGS = [
  ["Bella", "Maltézský psík", "Malý", "Dlouhá", "Samice", 4, 3.5, 23, "Klidný"],
  ["Max", "Zlatý retrívr", "Velký", "Dvojitá", "Samec", 6, 32, 58, "Hravý"],
  ["Luna", "Pudl toy", "Malý", "Kudrnatá", "Samice", 3, 3, 26, "Hravý"],
  ["Rocky", "Jorkšírský teriér", "Malý", "Dlouhá", "Samec", 8, 2.8, 21, "Úzkostný"],
  ["Daisy", "Cavalier King Charles španěl", "Malý", "Dlouhá", "Samice", 5, 7.5, 32, "Klidný"],
  ["Charlie", "Bišonek", "Malý", "Kudrnatá", "Samec", 2, 5, 27, "Hravý"],
  ["Molly", "Shih-tzu", "Malý", "Dlouhá", "Samice", 7, 6, 25, "Klidný"],
  ["Rex", "Německý ovčák", "Velký", "Dvojitá", "Samec", 5, 36, 62, "Potřebuje přestávky"],
  ["Lucy", "Bígl", "Střední", "Krátká", "Samice", 4, 12, 38, "Hravý"],
  ["Oskar", "Knírač malý", "Malý", "Drátovitá", "Samec", 6, 7, 34, "Klidný"],
  ["Nela", "Westík", "Malý", "Drátovitá", "Samice", 9, 8, 28, "Úzkostný"],
  ["Bady", "Labradorský retrívr", "Velký", "Krátká", "Samec", 3, 30, 56, "Hravý"],
  ["Ciri", "Samojed", "Velký", "Dvojitá", "Samice", 2, 22, 52, "Hravý"],
  ["Archie", "Kokršpaněl", "Střední", "Dlouhá", "Samec", 5, 13, 40, "Klidný"],
  ["Fifi", "Pomeranian", "Malý", "Dvojitá", "Samice", 4, 2.5, 20, "Úzkostný"],
  ["Bruno", "Bernský salašnický pes", "Obří", "Dvojitá", "Samec", 4, 48, 68, "Klidný"],
  ["Mia", "Lhasa apso", "Malý", "Dlouhá", "Samice", 10, 6.5, 26, "Potřebuje přestávky"],
  ["Teddy", "Goldendoodle", "Střední", "Kudrnatá", "Samec", 3, 18, 48, "Hravý"],
  ["Kira", "Sibiřský husky", "Velký", "Dvojitá", "Samice", 6, 23, 55, "Hravý"],
  ["Simba", "Čivava", "Malý", "Krátká", "Samec", 7, 2.2, 18, "Agresivní"],
  ["Nora", "Border kolie", "Střední", "Dlouhá", "Samice", 5, 17, 51, "Hravý"],
  ["Ben", "Jack Russell teriér", "Malý", "Drátovitá", "Samec", 8, 6, 29, "Hravý"],
  ["Lola", "Pudl střední", "Střední", "Kudrnatá", "Samice", 4, 12, 42, "Klidný"],
  ["Gizmo", "Mops", "Malý", "Krátká", "Samec", 6, 8, 30, "Klidný"],
  ["Sára", "Novofundlanďan", "Obří", "Dvojitá", "Samice", 5, 55, 66, "Potřebuje přestávky"],
  ["Ozzy", "Australský ovčák", "Střední", "Dlouhá", "Samec", 3, 20, 52, "Hravý"],
  ["Bonnie", "Havanský psík", "Malý", "Dlouhá", "Samice", 2, 4.5, 25, "Hravý"],
  ["Ares", "Kerry blue teriér", "Střední", "Kudrnatá", "Samec", 6, 16, 47, "Agresivní"],
  ["Zara", "Afghánský chrt", "Velký", "Dlouhá", "Samice", 7, 26, 68, "Úzkostný"],
  ["Hugo", "Bostonský teriér", "Malý", "Krátká", "Samec", 4, 9, 38, "Klidný"],
  ["Pepa", "Kříženec", "Střední", "Dlouhá", "Samec", 9, 14, 44, "Klidný"],
  ["Ella", "Malý knírač", "Malý", "Drátovitá", "Samice", 3, 6.5, 33, "Hravý"],
];

const HAIRCUT_NOTES = [
  "Tělo 6 mm, hlava nůžkami do kulata.",
  "Jen zkrátit o 2 cm, uši nechat dlouhé.",
  "Medvídkový střih, tlapky vystříhat.",
  "Vyčesat podsadu, ocas nestříhat.",
  "Tělo 9 mm, tvář krátce kolem očí.",
  "Trimování dle standardu plemene.",
];
const VISIT_NOTES = [
  "Klient spokojen.",
  "Zacuchaná srst na břiše.",
  "Majitel prosí o krátké drápky.",
  "Pes byl unavený, dělali jsme pauzy.",
  null,
  null,
  null,
];
const HEALTH = [
  null,
  null,
  "Alergie na kuřecí",
  "Citlivá kůže – hypoalergenní šampon",
  "Po operaci kolene, opatrně se zadníma nohama",
];
const INSTRUCTIONS = [
  null,
  "Nesnáší fén na hlavu.",
  "Na stříhání drápků potřebuje dva lidi.",
  "Majitel chce fotku po střihu.",
  null,
];

/* ---------- clean ---------- */
async function clean() {
  const clients = await must("clients", db.from("clients").select("id").like("email", DEMO_EMAIL));
  const clientIds = clients.map((c) => c.id);
  if (clientIds.length) {
    // Appointments and reactivation contacts cascade from dogs.
    await must("dogs", db.from("dogs").delete().in("owner_id", clientIds));
    await must("clients", db.from("clients").delete().in("id", clientIds));
  }
  // Shifts cascade from groomers.
  await must(
    "groomers",
    db
      .from("groomers")
      .delete()
      .in(
        "name",
        GROOMERS.map((g) => g.name),
      ),
  );
  await must("cash", db.from("cash_operations").delete().like("note", `%${DEMO_NOTE}`));
  console.log(`Removed demo data (${clientIds.length} clients).`);
}

/* ---------- seed ---------- */
async function seedAll() {
  const existing = await must("clients", db.from("clients").select("id").like("email", DEMO_EMAIL));
  if (existing.length) throw new Error("Demo data already exists. Run with --clean first.");

  const salons = Object.fromEntries(
    (await must("salons", db.from("salons").select("id,name"))).map((s) => [s.name, s.id]),
  );
  const services = Object.fromEntries(
    (await must("services", db.from("services").select("*"))).map((s) => [s.name, s]),
  );
  for (const s of new Set(GROOMERS.map((g) => g.salon)))
    if (!salons[s]) throw new Error(`Salon "${s}" not found`);

  // Groomers
  const groomers = await insertChunked(
    "groomers",
    GROOMERS.map(({ salon, ...g }) => ({ ...g, salon_id: salons[salon] })),
  );

  // Shifts: 10 weeks back to 3 weeks ahead. Sundays off, one weekday off per groomer.
  const shifts = [];
  const firstMonday = addDays(mondayOf(today), -70);
  groomers.forEach((g, gi) => {
    for (let w = 0; w < 14; w++) {
      const week_start = toISO(addDays(firstMonday, w * 7));
      for (let day = 1; day <= 7; day++) {
        let value;
        if (day === 7 || day === ((gi * 2) % 6) + 1) value = "Volno";
        else if (day === 6) value = gi % 2 ? "10:00–14:30" : "Volno";
        else value = pick(["10:00–19:00", "10:00–19:00", "Celý den", "10:00–14:30", "14:30–19:00"]);
        shifts.push({ groomer_id: g.id, week_start, day_of_week: day, value });
      }
    }
  });
  await insertChunked("shifts", shifts, "id");

  // Clients
  const clients = await insertChunked(
    "clients",
    CLIENTS.map(([name, language, preferred_contact, salon, instagram, family], i) => ({
      name,
      language,
      preferred_contact,
      preferred_salon_id: salons[salon],
      phone: `+420 ${pick(["602", "603", "608", "721", "732", "775", "777"])} ${int(100, 999)} ${int(100, 999)}`,
      email: `client${String(i + 1).padStart(2, "0")}@example.com`,
      instagram: instagram ?? null,
      review_taken: chance(0.4),
      notes: chance(0.25)
        ? pick([
            "Preferuje ranní termíny.",
            "Platí vždy kartou.",
            "VIP klient, doporučila nás přátelům.",
            "Volat až po 17:00.",
          ])
        : null,
      additional_contacts: (family ?? []).map(([fname, role], j) => ({
        id: `demo-${i}-${j}`,
        name: fname,
        role,
        phone: `+420 ${int(600, 799)} ${int(100, 999)} ${int(100, 999)}`,
      })),
    })),
  );

  // Dogs: first pass one dog per client, the rest go to random clients (some own 2–3).
  const salonGroomers = (salonId) => groomers.filter((g) => g.salon_id === salonId);
  const dogs = await insertChunked(
    "dogs",
    DOGS.map(([name, breed, size, coat, sex, age, weight, height, behavior], i) => {
      const owner = i < clients.length ? clients[i] : pick(clients);
      return {
        name,
        breed,
        size,
        coat,
        sex,
        age,
        weight,
        height,
        behavior,
        owner_id: owner.id,
        is_healthy: chance(0.85),
        health_status: pick(HEALTH),
        coat_status: pick([null, "Dobrý", "Mírně zacuchaná", "Zplstnatělá na tlapkách"]),
        brushes_teeth: chance(0.3),
        toothbrush_number: null,
        grooming_instructions: pick(INSTRUCTIONS),
        notes: chance(0.2) ? "Oblíbený pamlsek: sýr." : null,
        extra_notes: [],
        preferred_additional_services: chance(0.4)
          ? [services[pick(["Stříhání drápků", "Čištění uší"])].id]
          : [],
        pinned_groomer_id: chance(0.6) ? pick(salonGroomers(owner.preferred_salon_id)).id : null,
      };
    }),
  );
  const ownerOf = new Map(dogs.map((d) => [d.id, clients.find((c) => c.id === d.owner_id)]));

  // Visits
  const SIZE_TIERS = [
    { maxKg: 5, maxCm: 28, prices: [1200, 1200, 1400] },
    { maxKg: 10, maxCm: 40, prices: [1400, 1500, 1600] },
    { maxKg: 20, maxCm: 50, prices: [1700, 1800, 2000] },
    { maxKg: 40, maxCm: 65, prices: [2000, 2500, 2700] },
  ];
  const sizePrice = (d) => {
    const col = d.coat === "Krátká" ? 0 : d.coat === "Kudrnatá" ? 2 : 1;
    const tier = SIZE_TIERS.find((t) => d.weight <= t.maxKg && d.height <= t.maxCm);
    return tier ? tier.prices[col] : 3000;
  };
  const mainServiceFor = (d) => {
    if (d.coat === "Drátovitá") return pick(["Stripping", "Kompletní péče"]);
    if (d.coat === "Krátká")
      return pick(["Koupání a fénování", "Koupání a fénování", "Vyčesávání srsti"]);
    if (d.coat === "Dvojitá")
      return pick(["Vyčesávání srsti", "Koupání a fénování", "Kompletní péče"]);
    return pick(["Kompletní péče", "Stříhání a trimování", "Kompletní péče"]);
  };

  const busy = new Map(); // `${groomerId}|${date}` -> [[start, end]] in minutes
  const free = (gid, date, start, len) =>
    (busy.get(`${gid}|${date}`) ?? []).every(([s, e]) => start + len <= s || start >= e);
  const book = (gid, date, start, len) => {
    const k = `${gid}|${date}`;
    busy.set(k, [...(busy.get(k) ?? []), [start, start + len]]);
  };

  const visits = [];
  dogs.forEach((dog, i) => {
    const owner = ownerOf.get(dog.id);
    const interval = int(4, 8) * 7;
    // Some dogs stopped coming (they show up in reactivation), the rest are regulars.
    const lapsed = i % 7 === 3;
    let day = addDays(today, -int(70, 84) + int(0, interval));
    const end = lapsed ? addDays(today, -50) : addDays(today, 21);
    while (day <= end) {
      if (day.getDay() === 0) day = addDays(day, 1);
      const date = toISO(day);
      const candidates = dog.pinned_groomer_id
        ? groomers.filter((g) => g.id === dog.pinned_groomer_id)
        : salonGroomers(owner.preferred_salon_id);
      const groomer = pick(candidates);

      const main = services[mainServiceFor(dog)];
      const extras = [
        ...new Set([
          ...dog.preferred_additional_services,
          ...(chance(0.3) ? [services["Stříhání drápků"].id] : []),
        ]),
      ]
        .map((id) => Object.values(services).find((s) => s.id === id))
        .filter((s) => s && s.id !== main.id);
      const list = [main, ...extras];
      const duration = list.reduce((s, x) => s + x.duration_minutes, 0);
      const price = list.reduce(
        (s, x) => s + (x.name === "Kompletní péče" ? sizePrice(dog) : x.price),
        0,
      );

      let start = null;
      for (let tries = 0; tries < 12 && start === null; tries++) {
        const t = int(20, 34) * 30; // 10:00–17:00
        if (t + duration <= 19 * 60 && free(groomer.id, date, t, duration)) start = t;
      }
      if (start !== null) {
        book(groomer.id, date, start, duration);
        const past = date < todayISO;
        const status = past
          ? pick([
              "Dokončeno",
              "Dokončeno",
              "Dokončeno",
              "Dokončeno",
              "Dokončeno",
              "Dokončeno",
              "Zrušeno",
              "Nedostavil se",
            ])
          : date <= toISO(addDays(today, 3))
            ? pick(["Potvrzeno", "Potvrzeno", "Naplánováno"])
            : "Naplánováno";
        const done = status === "Dokončeno";
        visits.push({
          row: {
            dog_id: dog.id,
            groomer_id: groomer.id,
            date,
            time: `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`,
            planned_duration: duration,
            price,
            // Completed visits lock their services, so they are inserted planned and completed afterwards.
            status: done ? "Naplánováno" : status,
            actual_duration: done ? duration + pick([-15, 0, 0, 15, 30]) : null,
            behavior_during_visit: done
              ? chance(0.7)
                ? dog.behavior
                : pick(["Klidný", "Hravý", "Úzkostný", "Potřebuje přestávky"])
              : null,
            haircut_notes: list.some((s) => s.category === "Střih" || s.category === "Komplet")
              ? pick(HAIRCUT_NOTES)
              : null,
            notes: pick(VISIT_NOTES),
            paid_by_card: done && chance(0.55),
          },
          serviceIds: list.map((s) => s.id),
          done,
        });
      }
      day = addDays(day, interval + int(-5, 5));
    }
  });
  const inserted = await insertChunked(
    "appointments",
    visits.map((v) => v.row),
    "id",
  );
  await insertChunked(
    "appointment_services",
    inserted.flatMap((a, i) =>
      visits[i].serviceIds.map((service_id) => ({ appointment_id: a.id, service_id })),
    ),
    "appointment_id",
  );
  const doneIds = inserted.filter((_, i) => visits[i].done).map((a) => a.id);
  for (let i = 0; i < doneIds.length; i += 200)
    await must(
      "complete",
      db
        .from("appointments")
        .update({ status: "Dokončeno" })
        .in("id", doneIds.slice(i, i + 200)),
    );

  // Cash: weekly float deposit, small expenses and a weekly collection per salon.
  const cash = [];
  for (const salonId of Object.values(salons)) {
    for (let w = 10; w >= 0; w--) {
      const monday = addDays(mondayOf(today), -w * 7);
      if (toISO(monday) > todayISO) continue;
      cash.push({
        salon_id: salonId,
        type: "Vklad",
        amount: 2000,
        date: toISO(monday),
        note: `Drobné do pokladny ${DEMO_NOTE}`,
      });
      const exp = addDays(monday, int(1, 4));
      if (toISO(exp) <= todayISO)
        cash.push({
          salon_id: salonId,
          type: "Výdaj",
          amount: int(3, 25) * 50,
          date: toISO(exp),
          note: `${pick(["Šampony", "Ručníky", "Káva a voda", "Čisticí prostředky", "Pamlsky"])} ${DEMO_NOTE}`,
        });
      const fri = addDays(monday, 5);
      if (toISO(fri) < todayISO)
        cash.push({
          salon_id: salonId,
          type: "Inkaso",
          amount: int(30, 70) * 100,
          date: toISO(fri),
          note: `Odvod tržby ${DEMO_NOTE}`,
        });
    }
  }
  await insertChunked("cash_operations", cash, "id");

  // Reactivation contacts for some of the lapsed dogs.
  const lapsedDogs = dogs.filter((_, i) => i % 7 === 3);
  const contacts = lapsedDogs.slice(0, 2).map((d, i) => ({
    dog_id: d.id,
    contacted_at: toISO(addDays(today, -int(3, 10))),
    result: i === 0 ? "Nedovolal se" : "Kontaktován",
    reason: i === 0 ? null : pick(["Drahé", "Stříhají sami"]),
    note: i === 0 ? "Zkusit znovu příští týden." : "Ozve se sama.",
    remind_on: toISO(addDays(today, i === 0 ? -1 : 14)),
  }));
  await insertChunked("reactivation_contacts", contacts, "id");

  console.log(
    `Seeded ${groomers.length} groomers, ${shifts.length} shifts, ${clients.length} clients, ${dogs.length} dogs, ` +
      `${inserted.length} visits (${doneIds.length} completed), ${cash.length} cash operations, ${contacts.length} reactivation contacts.`,
  );
}

await (process.argv.includes("--clean") ? clean() : seedAll());
