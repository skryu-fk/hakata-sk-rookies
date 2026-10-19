/**
 * 首脳陣の本人確認と権限チェック（サーバー側）
 *
 * 画面の出し分けだけでは守りにならない。APIを直接叩かれれば素通りしてしまうので、
 * 首脳陣向けのAPIは必ずここを通してから処理すること。
 *
 * 確認の順番:
 *   1. 代表のCookie（管理サイトのログイン）があれば、無条件で最高権限
 *   2. メンバーのCookieから accounts を引き、role があれば首脳陣として扱う
 *   3. どちらでもなければ拒否
 */
import { readSession, readCookie, verifySession, MEMBER_COOKIE, ADMIN_COOKIE } from "@/lib/security";
import { callAppsScript } from "@/lib/admin-shared";
import {
  staffFromAccountRow,
  OWNER_USER,
  can,
  type Permission,
  type StaffUser,
} from "@/lib/staffRoles";

/**
 * ログインしている首脳陣を返す。首脳陣でなければ null。
 * 代表（管理サイトのCookie）は常に最高権限で通す。
 */
export async function currentStaff(headers: Headers): Promise<StaffUser | null> {
  // 1) 代表は管理サイトのCookieで入っている
  if (verifySession(readCookie(headers, ADMIN_COOKIE), "admin")) return OWNER_USER;

  // 2) メンバーのCookieからアカウントを引く
  const sess = readSession(readCookie(headers, MEMBER_COOKIE), "member");
  if (!sess?.sub) return null;

  const list = await callAppsScript({ op: "list", sheet: "accounts" });
  if (!list.ok) return null;
  const rows = (list.data as { rows?: { data: string[] }[] }).rows ?? [];
  const row = rows.find(r => (r.data[0] ?? "") === sess.sub);
  if (!row) return null;
  // 承認されていないアカウントは首脳陣にしない
  if ((row.data[5] ?? "").trim() !== "approved") return null;
  return staffFromAccountRow(row.data);
}

/**
 * 首脳陣であること＋その操作ができることを確かめる。
 * 通れば本人を、通らなければ返すべきエラー応答を返す。
 *
 * 使い方:
 *   const gate = await requireStaff(request.headers, "report.create");
 *   if ("error" in gate) return gate.error;
 *   const me = gate.user;
 */
export async function requireStaff(
  headers: Headers,
  perm: Permission,
): Promise<{ user: StaffUser } | { error: Response }> {
  const user = await currentStaff(headers);
  if (!user) {
    return {
      error: Response.json(
        { ok: false, error: "首脳陣としてログインしてください。" },
        { status: 401 },
      ),
    };
  }
  if (!can(user, perm)) {
    return {
      error: Response.json(
        { ok: false, error: "この操作を行う権限がありません。" },
        { status: 403 },
      ),
    };
  }
  return { user };
}

/**
 * 操作履歴を残す。
 * 誰が何をしたか後から辿れるようにするためのもので、
 * 失敗しても本来の処理は止めない（履歴が残らないより、操作が通るほうが大事）。
 */
export async function writeAudit(
  user: StaffUser,
  action: string,
  target: string,
  detail = "",
): Promise<void> {
  try {
    const now = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 19).replace("T", " ");
    await callAppsScript({
      op: "append",
      sheet: "staff_audit",
      row: [
        `au_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        now,
        user.accountId,
        user.name,
        action.slice(0, 80),
        target.slice(0, 120),
        detail.slice(0, 500),
      ],
    });
  } catch {
    // 履歴が残せなくても操作そのものは成立させる
  }
}

/** 一意なIDを作る（各表の id 列用） */
export function staffId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** 日本時間の「いま」を "YYYY-MM-DD HH:MM:SS" で */
export function nowJst(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 19).replace("T", " ");
}
