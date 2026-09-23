/**
 * 投票の中身（選択肢と添付画像）の入れ物。
 *
 * 選択肢も画像も、polls.options 列ひとつにまとめて JSON で入れる。
 * 列を増やさないのは、列を足すと Supabase で ALTER TABLE を実行しない限り
 * 投票の作成が失敗してしまうため。1列に収めておけば、テーブルさえあれば動く。
 *
 * これまでに保存された形も、そのまま読めるようにしてある:
 *   1. "赤\n白\n青"                     … いちばん最初の形（改行区切り）
 *   2. [{"label":"赤"}, ...]            … 選択肢だけJSONにした形
 *   3. {"image":"...","options":[...]}  … いまの形（質問の画像も入る）
 */
export type PollOption = { label: string; image?: string };
export type PollBody = { image: string; options: PollOption[] };

function toOption(o: unknown): PollOption {
  if (typeof o === "string") return { label: o.trim() };
  const rec = (o ?? {}) as { label?: unknown; image?: unknown };
  return {
    label: String(rec.label ?? "").trim(),
    image: rec.image ? String(rec.image) : undefined,
  };
}

/** options 列の文字列 → 選択肢と質問画像 */
export function parsePoll(raw: string): PollBody {
  const text = (raw ?? "").trim();
  if (!text) return { image: "", options: [] };

  if (text.startsWith("[") || text.startsWith("{")) {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (Array.isArray(parsed)) {
        return { image: "", options: parsed.map(toOption).filter(o => o.label) };
      }
      if (parsed && typeof parsed === "object") {
        const rec = parsed as { image?: unknown; options?: unknown };
        const list = Array.isArray(rec.options) ? rec.options : [];
        return {
          image: rec.image ? String(rec.image) : "",
          options: list.map(toOption).filter(o => o.label),
        };
      }
    } catch {
      // JSON として壊れている場合は、下の改行区切りとして読む
    }
  }
  return { image: "", options: text.split(/\r?\n/).map(s => ({ label: s.trim() })).filter(o => o.label) };
}

/** 選択肢だけが欲しいとき */
export function parseOptions(raw: string): PollOption[] {
  return parsePoll(raw).options;
}

/** 選択肢と質問画像 → options 列に入れる文字列 */
export function serializePoll(options: PollOption[], image = ""): string {
  const opts = options
    .map(o => ({ label: o.label.trim(), ...(o.image ? { image: o.image } : {}) }))
    .filter(o => o.label);
  return JSON.stringify({ ...(image ? { image } : {}), options: opts });
}

/** 投票できる状態か（締め切られていない・締切日を過ぎていない） */
export function isPollLive(
  p: { status: string; deadline: string },
  today = new Date().toISOString().slice(0, 10),
): boolean {
  return p.status === "open" && (!p.deadline || p.deadline >= today);
}
