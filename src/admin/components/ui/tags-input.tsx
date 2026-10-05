"use client";

import { X } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";

import { cn } from "@/lib/cn";

import { controlClass } from "./form-controls";

interface TagsInputProps {
  /** Hidden input name; the value is a JSON array of strings. */
  name: string;
  defaultValue?: string[];
  suggestions?: string[];
  placeholder?: string;
  max?: number;
  maxLength?: number;
  id?: string;
  invalid?: boolean;
  onChange?: () => void;
}

/** Chips input: Enter or comma adds, Backspace on empty removes the last one, suggestions via datalist. */
export function TagsInput({
  name,
  defaultValue = [],
  suggestions = [],
  placeholder = "Type and press Enter",
  max = 20,
  maxLength = 40,
  id,
  invalid,
  onChange,
}: TagsInputProps) {
  const [tags, setTags] = useState(defaultValue);
  const [draft, setDraft] = useState("");
  const listId = useId();

  const update = (next: string[]) => {
    setTags(next);
    onChange?.();
  };

  const add = (raw: string) => {
    const values = raw
      .split(",")
      .map((value) => value.trim().slice(0, maxLength))
      .filter(Boolean);
    const next = [...tags];
    for (const value of values) {
      if (next.length >= max) break;
      if (!next.some((tag) => tag.toLowerCase() === value.toLowerCase())) next.push(value);
    }
    if (next.length !== tags.length) update(next);
    setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if ((event.key === "Enter" || event.key === ",") && draft.trim()) {
      event.preventDefault();
      add(draft);
    } else if (event.key === "Enter") {
      event.preventDefault();
    } else if (event.key === "Backspace" && !draft && tags.length) {
      update(tags.slice(0, -1));
    }
  };

  return (
    <div
      className={cn(
        controlClass,
        "flex min-h-10 flex-wrap items-center gap-1.5 px-2 py-1.5 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15",
      )}
      aria-invalid={invalid || undefined}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-md bg-navy-800/8 py-0.5 pr-1 pl-2 text-xs font-semibold text-navy-900"
        >
          {tag}
          <button
            type="button"
            onClick={() => update(tags.filter((item) => item !== tag))}
            className="rounded p-0.5 text-navy-900/60 hover:bg-navy-800/10 hover:text-navy-900"
            aria-label={`Remove ${tag}`}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        list={suggestions.length ? listId : undefined}
        onChange={(event) => {
          const value = event.target.value;
          if (value.endsWith(",")) add(value);
          else setDraft(value);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => draft.trim() && add(draft)}
        placeholder={tags.length >= max ? "" : placeholder}
        disabled={tags.length >= max}
        maxLength={maxLength}
        className="h-7 min-w-32 flex-1 border-0 bg-transparent px-1 text-sm outline-none placeholder:text-slate-400"
      />
      {suggestions.length ? (
        <datalist id={listId}>
          {suggestions
            .filter((item) => !tags.includes(item))
            .map((item) => (
              <option key={item} value={item} />
            ))}
        </datalist>
      ) : null}
      <input type="hidden" name={name} value={JSON.stringify(tags)} />
    </div>
  );
}
