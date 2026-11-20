import { describe, expect, it } from "vitest";
import {
  ABSENCE_REASONS,
  BEHAVIORS,
  CASH_OP_TYPES,
  COATS,
  CONTACT_RESULTS,
  SEXES,
  SHIFT_VALUES,
  SIZES,
  SPECIALTIES,
  STATUSES,
} from "../crm";
import { localizedOptions, strings, translatedServiceNames, valueTranslations } from "../i18n";

describe("UI dictionaries", () => {
  it("have the same keys in Russian and Czech", () => {
    expect(Object.keys(strings.cs).sort()).toEqual(Object.keys(strings.ru).sort());
  });
  it("have no empty strings", () => {
    for (const lang of ["ru", "cs"] as const) {
      const empty = Object.entries(strings[lang])
        .filter(([, v]) => !v.trim())
        .map(([k]) => k);
      expect(empty, lang).toEqual([]);
    }
  });
});

describe("stored value translations", () => {
  const stored = {
    ABSENCE_REASONS,
    BEHAVIORS,
    CASH_OP_TYPES,
    COATS,
    CONTACT_RESULTS,
    SEXES,
    SHIFT_VALUES,
    SIZES,
    SPECIALTIES,
    STATUSES,
  };
  // Values without letters (shift hours such as "10:00–14:30") read the same in every language.
  const needsWords = (v: string) => /\p{L}/u.test(v);
  it.each(Object.entries(stored))("translate every value of %s", (_, values) => {
    const missing = values.filter(
      (v) => needsWords(v) && (!valueTranslations[v]?.ru || !valueTranslations[v]?.cs),
    );
    expect(missing).toEqual([]);
  });
});

describe("value helpers", () => {
  const tr = (v: string) => valueTranslations[v]?.ru ?? v;
  it("keeps the stored value and translates only the label", () => {
    const [first] = localizedOptions(STATUSES, tr);
    expect(first?.value).toBe("Naplánováno");
    expect(first?.label).toBe(valueTranslations["Naplánováno"]?.ru);
  });
  it("translates service names in order and skips unknown ids", () => {
    const data = {
      services: [
        { id: "a", name: "Kompletní péče" },
        { id: "b", name: "Custom service" },
      ],
    };
    expect(translatedServiceNames(data, ["b", "x", "a"], tr)).toBe(
      `Custom service, ${tr("Kompletní péče")}`,
    );
  });
});
