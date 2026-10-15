"use client";

import { useEffect, useId, useRef, useState } from "react";

import { anchor, sectionIds } from "@/config/navigation";
import { calculator, type CalculatorField, type CalculatorFieldId } from "@/content/homepage";
import { cn } from "@/lib/cn";

import { ActionArrow, actionClasses, Lines } from "./ui";

type Values = Record<CalculatorFieldId, string>;

const initialValues = Object.fromEntries(calculator.fields.map((field) => [field.id, String(field.value)])) as Values;

const whole = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

/** Digits and one decimal point, at most six characters. */
function sanitize(raw: string) {
  const digits = raw.replace(/[^\d.]/g, "");
  const dot = digits.indexOf(".");
  const single = dot === -1 ? digits : digits.slice(0, dot + 1) + digits.slice(dot + 1).replace(/\./g, "");
  return single.slice(0, 6);
}

function estimate(values: Values) {
  const numbers = {} as Record<CalculatorFieldId, number>;
  let invalid: CalculatorField | null = null;
  for (const field of calculator.fields) {
    const raw = values[field.id].trim();
    const value = Number(raw);
    if (raw === "" || raw === "." || !Number.isFinite(value) || value < field.min || value > field.max) {
      invalid ??= field;
    }
    numbers[field.id] = value;
  }
  if (invalid) return { invalid, result: null };
  const panels = Math.floor(numbers.area / numbers.footprint);
  const kw = (panels * numbers.watts) / 1000;
  const daily = (kw * numbers.sun * numbers.efficiency) / 100;
  return { invalid: null, result: { ...numbers, panels, kw, daily } };
}

/** "Estimate your solar potential": the design's calculator with the reference site's formula. */
export function SavingsCalculator() {
  const [values, setValues] = useState(initialValues);
  const [days, setDays] = useState(365);
  const [announcement, setAnnouncement] = useState("");
  const { invalid, result } = estimate(values);
  const statusId = useId();

  const energy = result ? result.daily * days : 0;
  const shown = result
    ? {
        value: `₹${whole.format(energy * result.rate)}`,
        energy: `${oneDecimal.format(energy)} kWh`,
        panels: whole.format(result.panels),
        summary: `${result.kw.toFixed(2)} kW system · ${result.daily.toFixed(1)} kWh / day`,
      }
    : null;
  const period = calculator.periods.find((item) => item.days === days)?.label.toLowerCase() ?? "";

  // One calm announcement once typing settles, instead of a live region firing on every key.
  const spoken = shown ? `${shown.value} ${period}, ${shown.energy}, ${shown.panels} panels.` : "";
  useEffect(() => {
    const timer = window.setTimeout(() => setAnnouncement(spoken), 700);
    return () => window.clearTimeout(timer);
  }, [spoken]);

  // The button carries the assumptions into the enquiry form (see EnquiryForm).
  const enquiry = result
    ? `I would like a site assessment. Calculator assumptions: ${result.area} m² usable roof, ${result.panels} panels at ${result.watts} W, ${result.kw.toFixed(2)} kW total; ${result.sun} peak sun hours and ${result.efficiency}% system efficiency. Please confirm a suitable system and quote.`
    : undefined;

  return (
    <section
      id={sectionIds.calculator}
      aria-labelledby="calculator-title"
      className="anchor-band bg-ish-deep text-white focus-on-dark"
    >
      <div className="band">
        <div className="grid gap-6 rounded-[40px] bg-ish-calc p-2 lg:grid-cols-2">
          <div className="flex flex-col gap-[22px] rounded-[32px] bg-ish-surface p-[26px]">
            <h2 id="calculator-title" className="type-calc-title">
              <Lines lines={calculator.titleLines} />
            </h2>
            <p className="text-[14px] leading-[1.5] text-ish-line">{calculator.lead}</p>
            {calculator.fields.map((field) => (
              <NumberField
                key={field.id}
                field={field}
                value={values[field.id]}
                invalid={invalid?.id === field.id}
                describedBy={invalid?.id === field.id ? statusId : undefined}
                onChange={(value) => setValues((current) => ({ ...current, [field.id]: value }))}
              />
            ))}
          </div>

          <div className="flex flex-col items-start gap-[18px] p-5">
            <div role="group" aria-label="Estimate period" className="flex gap-[3px] rounded-[13px] bg-[#20304b] p-1">
              {calculator.periods.map((item) => (
                <button
                  key={item.days}
                  type="button"
                  aria-pressed={item.days === days}
                  onClick={() => setDays(item.days)}
                  className="rounded-[10px] px-3 py-2 text-[12px] leading-[1.5] text-[#d7e5f8] transition-colors duration-200 hover:text-white aria-pressed:bg-ish-blue aria-pressed:text-white"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <dl className="flex w-full flex-col gap-[18px]">
              <Result label={calculator.results.value} value={shown?.value} />
              <Result label={calculator.results.energy} value={shown?.energy} />
              <Result label={calculator.results.panels} value={shown?.panels} />
            </dl>

            <div className="flex flex-col gap-1">
              <p className="text-[13px] leading-[1.5] text-ish-line">{shown?.summary ?? "— kW system · — kWh / day"}</p>
              <p id={statusId} role="status" className="text-[13px] leading-[1.5] text-[#ffd48a]">
                {invalid
                  ? `Enter ${invalid.label.toLowerCase()} between ${whole.format(invalid.min)} and ${whole.format(invalid.max)} (${invalid.unit}).`
                  : ""}
              </p>
            </div>
            <span className="sr-only" aria-live="polite">
              {announcement}
            </span>

            <a
              href={anchor(sectionIds.contact)}
              data-enquire={calculator.interest}
              data-enquire-message={enquiry}
              className={actionClasses("blue", "w-full")}
            >
              <span>{calculator.cta}</span>
              <ActionArrow />
            </a>
            <p className="text-[12px] leading-[1.5] text-ish-line">{calculator.note}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Result({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-[28px] bg-ish-surface p-5">
      <dt className="text-[12px] leading-[1.5] text-ish-line">{label}</dt>
      <dd className="type-result tabular-nums">{value ?? "—"}</dd>
    </div>
  );
}

/** A number typed straight into the design's value box ("30 m²"); the unit hugs the digits. */
function NumberField({
  field,
  value,
  invalid,
  describedBy,
  onChange,
}: {
  field: CalculatorField;
  value: string;
  invalid: boolean;
  describedBy?: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[12px] leading-[1.5] text-ish-line">
        {field.label}
        <span className="sr-only">, in {field.unit}</span>
      </label>
      {/* The whole box is the input's hit area; the unit text is only decoration. */}
      <div
        onPointerDown={(event) => {
          if (event.target !== input.current) {
            event.preventDefault();
            input.current?.focus();
          }
        }}
        className={cn(
          "flex cursor-text items-baseline rounded-[12px] bg-ish-input p-3 text-[20px] leading-[1.5] text-white outline-offset-2 transition-[outline-color] focus-within:outline-2 focus-within:outline-ish-lime",
          invalid && "outline-2 outline-[#ffd48a]",
        )}
      >
        {field.prefix ? <span aria-hidden="true">{field.prefix}</span> : null}
        <span className="inline-grid tabular-nums">
          <span aria-hidden="true" className="invisible col-start-1 row-start-1 pr-px whitespace-pre">
            {value || " "}
          </span>
          <input
            ref={input}
            id={id}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="done"
            maxLength={6}
            value={value}
            onChange={(event) => onChange(sanitize(event.target.value))}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className="col-start-1 row-start-1 w-0 min-w-full bg-transparent outline-none focus-visible:outline-none"
          />
        </span>
        <span aria-hidden="true" className="whitespace-pre text-white/90">
          {field.suffix}
        </span>
      </div>
    </div>
  );
}
