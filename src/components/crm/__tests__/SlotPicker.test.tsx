// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { SlotPicker } from "../SlotPicker";
import { I18nProvider, strings } from "@/lib/i18n";
import { addDays, mondayOf, toISO, type CrmData } from "@/lib/crm";
import { crmData, shift } from "@/lib/__tests__/fixtures";

const cs = strings.cs;
// Tomorrow, so the test does not depend on how late in the day it runs.
const tomorrow = addDays(new Date(), 1);
const TOMORROW = toISO(tomorrow);
const worksTomorrow = shift({
  groomer_id: "g1",
  week_start: toISO(mondayOf(tomorrow)),
  day_of_week: ((tomorrow.getDay() + 6) % 7) + 1,
});

function Harness({ data, onChange }: { data: CrmData; onChange: (d: string, t: string) => void }) {
  const [value, setValue] = useState({ date: "", time: "" });
  return (
    <SlotPicker
      data={data}
      groomerId="g1"
      duration={60}
      date={value.date}
      time={value.time}
      onChange={(date, time) => {
        onChange(date, time);
        setValue({ date, time });
      }}
    />
  );
}

const renderPicker = (data: CrmData) => {
  const onChange = vi.fn();
  render(
    <I18nProvider>
      <Harness data={data} onChange={onChange} />
    </I18nProvider>,
  );
  return { onChange, user: userEvent.setup() };
};

describe("SlotPicker", () => {
  it("preselects the first working day and lists its slots", async () => {
    const { onChange } = renderPicker(crmData({ shifts: [worksTomorrow] }));
    expect(onChange).toHaveBeenCalledWith(TOMORROW, "");
    expect(await screen.findByRole("button", { name: /09:00/ })).toBeInTheDocument();
    expect(screen.getAllByText(cs.dayOff)).toHaveLength(2); // today and the day after
  });

  it("picks a time slot", async () => {
    const { onChange, user } = renderPicker(crmData({ shifts: [worksTomorrow] }));
    await user.click(await screen.findByRole("button", { name: /10:30/ }));
    expect(onChange).toHaveBeenLastCalledWith(TOMORROW, "10:30");
  });

  it("explains when there are no free slots", () => {
    renderPicker(crmData());
    expect(screen.getByText(cs.noSlotsHint)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /09:00/ })).not.toBeInTheDocument();
  });
});
