import { createContext, useContext, useState, type ReactNode } from 'react';
import { TEMPLATES, type Template } from '@/state/templates';
import type { AccentId } from '@/theme/colors';
import type { Schedule } from '@/state/types';

/** The starter templates use every colour but coral, so a custom habit gets that. */
export const CUSTOM_COLOR: AccentId = 'coral';

/** Picks and per-habit rhythm chosen across onboarding steps 02–03. */
export type Draft = {
  picked: Record<string, boolean>;
  custom: boolean;
  /** Named inline on the rhythm step. */
  customName: string;
  customDays: boolean[];
  schedules: Record<string, Schedule>;
  reminders: Record<string, number | null>;
};

type Ctx = { draft: Draft; setDraft: (fn: (d: Draft) => Draft) => void; chosen: Template[] };

const DraftContext = createContext<Ctx | null>(null);

export function OnboardingDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>(() => ({
    picked: { water: true, gym: true, read: true },
    custom: false,
    customName: '',
    customDays: Array(7).fill(true),
    schedules: Object.fromEntries(TEMPLATES.map(t => [t.id, t.schedule])),
    reminders: Object.fromEntries(TEMPLATES.map(t => [t.id, t.reminder])),
  }));
  const chosen = TEMPLATES.filter(t => draft.picked[t.id]);
  return <DraftContext.Provider value={{ draft, setDraft, chosen }}>{children}</DraftContext.Provider>;
}

export function useDraft() {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error('useDraft outside onboarding');
  return ctx;
}
