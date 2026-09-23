/**
 * 投票の選択肢の入れ物。
 *
 * 選択肢は polls.options 列に JSON で入れる（画像を持たせるため）。
 * ただし画像対応より前に作られた投票は「1行1選択肢のただの文字列」で
 * 入っているので、JSON として読めなければ改行区切りとして読む。
 * これで古い投票もそのまま表示・集計できる。
 */
export type PollOption = { label: string; image?: string };

export function parseOptions(raw: string): PollOption[] {
  const text = (raw ?? "").trim();
  if (!text) return [];
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .map(o => {
            if (typeof o === "string") return { label: o.trim() };
            const rec = o as { label?: unknown; image?: unknown };
            return { label: String(rec.label ?? "").trim(), image: rec.image ? String(rec.image) : undefined };
          })
          .filter(o => o.label);
      }
    } catch {
      // JSON として壊れている場合は、下の改行区切りとして読む
    }
  }
  return text.split(/\r?\n/).map(s => ({ label: s.trim() })).filter(o => o.label);
}

export function serializeOptions(options: PollOption[]): string {
  return JSON.stringify(
    options
      .map(o => ({ label: o.label.trim(), ...(o.image ? { image: o.image } : {}) }))
      .filter(o => o.label)
  );
}

/** 投票できる状態か（締め切られていない・締切日を過ぎていない） */
export function isPollLive(
  p: { status: string; deadline: string },
  today = new Date().toISOString().slice(0, 10),
): boolean {
  return p.status === "open" && (!p.deadline || p.deadline >= today);
}
