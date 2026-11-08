"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SignaturePad from "@/components/SignaturePad";
import TermsReader from "@/components/TermsReader";
import { TERMS } from "@/data/terms";
import {
  AGE_BANDS, INSURANCE_CHOICES, NAME_CHOICES, PHOTO_CHOICES,
  CONSENT_POINTS, CONSENT_INTRO, CONSENT_ELECTRONIC, CONSENT_CHANGEABLE,
  labelOf, type AgeBand, type Insurance, type NameDisclosure, type Photo,
} from "@/data/consent";

/**
 * マイページの「チーム規約への同意」
 *
 * 紙の同意書と同じ内容を、タップと手書き署名で出せるようにしたもの。
 * 選択肢は src/data/consent.ts が唯一の出どころで、紙・アプリ・管理画面で共通。
 *
 * 氏名・写真の公開はあとから変えられる（規約第21条5項）ので、
 * 同意済みでも「選び直す」から再提出できる。提出のたびに新しい記録が残る。
 */

type Current = {
  docVersion: string; agreedAt: string; ageBand: string; insurance: string;
  nameDisclosure: string; registeredName: string; photo: string;
  guardianName: string; guardianRelation: string; hasSignature: boolean;
};

const card: React.CSSProperties = { background: "#2C2C2E", border: "1px solid #38383A", borderRadius: 16, padding: 20 };
const h: React.CSSProperties = { fontFamily: "var(--font-zen),sans-serif", fontWeight: 800, fontSize: 16, color: "#fff", margin: 0 };
const sub: React.CSSProperties = { fontSize: 12, color: "rgba(235,235,245,0.60)", lineHeight: 1.8 };
const legend: React.CSSProperties = { display: "block", fontSize: 11, color: "#E5B84B", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 8 };

function Choice<T extends string>({ set, value, onChange }: {
  set: { value: T; label: string; note?: string }[]; value: T | ""; onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {set.map(c => {
        const on = value === c.value;
        return (
          <button key={c.value} type="button" onClick={() => onChange(c.value)}
            style={{
              textAlign: "left", display: "flex", gap: 10, alignItems: "flex-start",
              padding: "12px 14px", borderRadius: 10, cursor: "pointer",
              background: on ? "rgba(229,184,75,0.12)" : "#1C1C1E",
              border: `1px solid ${on ? "#E5B84B" : "#38383A"}`,
            }}>
            <span aria-hidden style={{
              flexShrink: 0, width: 19, height: 19, borderRadius: "50%", marginTop: 1,
              border: `2px solid ${on ? "#E5B84B" : "#5A5A5E"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {on && <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#E5B84B" }} />}
            </span>
            <span>
              <span style={{ display: "block", fontSize: 14, color: "#fff", lineHeight: 1.5 }}>{c.label}</span>
              {c.note && <span style={{ display: "block", fontSize: 11.5, color: "rgba(235,235,245,0.55)", marginTop: 3, lineHeight: 1.6 }}>{c.note}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function ConsentCard({ memberName }: { memberName: string }) {
  const [current, setCurrent] = useState<Current | null>(null);
  const [docVersion, setDocVersion] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const [confirmed, setConfirmed] = useState(false);
  const [electronic, setElectronic] = useState(false);
  const [ageBand, setAgeBand] = useState<AgeBand | "">("");
  const [insurance, setInsurance] = useState<Insurance | "">("");
  const [nameDisclosure, setNameDisclosure] = useState<NameDisclosure | "">("");
  const [registeredName, setRegisteredName] = useState("");
  const [photo, setPhoto] = useState<Photo | "">("");
  const [signature, setSignature] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianRelation, setGuardianRelation] = useState("");
  const [guardianContact, setGuardianContact] = useState("");
  const [guardianSignature, setGuardianSignature] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // 規約はアプリの中で開く。外部のページやPDFに飛ばすと、戻ってきたときに
  // 入力が消えてしまい、同意が途中で止まる
  const [reading, setReading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/member/consent");
      const d = await res.json().catch(() => ({}));
      if (d?.ok) { setCurrent(d.current ?? null); setDocVersion(d.docVersion ?? ""); }
    } catch { /* 通信できないときは未取得のまま。再読み込みで直る */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  /** 選び直すときは、いまの内容を初期値にする */
  function start() {
    if (current) {
      setAgeBand((current.ageBand as AgeBand) || "");
      setInsurance((current.insurance as Insurance) || "");
      setNameDisclosure((current.nameDisclosure as NameDisclosure) || "");
      setRegisteredName(current.registeredName || "");
      setPhoto((current.photo as Photo) || "");
      setGuardianName(current.guardianName || "");
      setGuardianRelation(current.guardianRelation || "");
    }
    setConfirmed(false); setElectronic(false);
    setSignature(""); setGuardianSignature(""); setGuardianContact("");
    setMsg(null);
    setOpen(true);
  }

  const minor = ageBand === "minor";
  const ready = confirmed && electronic && ageBand && insurance && nameDisclosure && photo && signature
    && (nameDisclosure !== "alias" || registeredName.trim())
    && (!minor || (guardianName.trim() && guardianContact.trim() && guardianSignature));

  async function submit() {
    if (busy || !ready) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/member/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmed, electronic, ageBand, insurance, nameDisclosure,
          registeredName: registeredName.trim(), photo, signature,
          guardianName: guardianName.trim(), guardianRelation: guardianRelation.trim(),
          guardianContact: guardianContact.trim(), guardianSignature,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d?.ok) {
        setCurrent(d.current ?? null);
        setOpen(false);
        setMsg({ ok: true, text: "同意を受け付けました。ありがとうございます。" });
      } else {
        setMsg({ ok: false, text: d?.error || "送信に失敗しました。" });
      }
    } catch { setMsg({ ok: false, text: "ネットワークエラーが発生しました。" }); }
    finally { setBusy(false); }
  }

  const signed = !!current;
  const outdated = signed && docVersion && current.docVersion !== docVersion;

  /* ── まとめ表示（未展開） ───────────────────────────── */
  if (!open) {
    return (
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <h3 style={h}>チーム規約への同意</h3>
          {!loading && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
              background: signed && !outdated ? "rgba(48,209,88,0.15)" : "rgba(255,69,58,0.15)",
              color: signed && !outdated ? "#30D158" : "#FF453A",
            }}>{signed && !outdated ? "同意済み" : outdated ? "再同意が必要" : "未同意"}</span>
          )}
        </div>

        {loading ? (
          <p style={sub}>読み込み中…</p>
        ) : signed ? (
          <>
            <dl style={{ margin: "0 0 14px", display: "grid", gridTemplateColumns: "auto 1fr", gap: "7px 14px", fontSize: 13 }}>
              <dt style={{ color: "rgba(235,235,245,0.55)" }}>同意日</dt>
              <dd style={{ margin: 0, color: "#fff" }}>{(current.agreedAt || "").replace("T", " ").slice(0, 16)}</dd>
              <dt style={{ color: "rgba(235,235,245,0.55)" }}>保険</dt>
              <dd style={{ margin: 0, color: "#fff" }}>{labelOf(INSURANCE_CHOICES, current.insurance)}</dd>
              <dt style={{ color: "rgba(235,235,245,0.55)" }}>氏名の公開</dt>
              <dd style={{ margin: 0, color: "#fff" }}>
                {labelOf(NAME_CHOICES, current.nameDisclosure)}
                {current.registeredName && `（${current.registeredName}）`}
              </dd>
              <dt style={{ color: "rgba(235,235,245,0.55)" }}>写真・動画</dt>
              <dd style={{ margin: 0, color: "#fff" }}>{labelOf(PHOTO_CHOICES, current.photo)}</dd>
            </dl>
            <p style={{ ...sub, marginBottom: 14 }}>{CONSENT_CHANGEABLE}</p>
          </>
        ) : (
          <p style={{ ...sub, marginBottom: 14 }}>
            紙の同意書のかわりに、この画面から同意できます。規約を読んでから、保険と氏名の公開について選び、
            最後に指で署名してください。<strong style={{ color: "#fff" }}>5分ほどで終わります。</strong>
          </p>
        )}

        {msg && (
          <p style={{ fontSize: 13, color: msg.ok ? "#30D158" : "#FF453A", marginBottom: 12 }}>{msg.text}</p>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={start} disabled={loading}
            style={{
              padding: "12px 20px", borderRadius: 10, border: "none", cursor: "pointer",
              background: signed && !outdated ? "#38383A" : "#E5B84B",
              color: signed && !outdated ? "#fff" : "#10131C",
              fontWeight: 800, fontSize: 14,
            }}>
            {signed ? (outdated ? "新しい規約に同意する" : "選び直す") : "同意する"}
          </button>
          <button type="button" onClick={() => setReading(true)}
            style={{ padding: "12px 20px", borderRadius: 10, border: "1px solid #48484A", background: "transparent", color: "rgba(235,235,245,0.85)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            規約を読む
          </button>
        </div>
        {reading && <TermsReader onClose={() => setReading(false)} />}
      </div>
    );
  }

  /* ── 同意フォーム ─────────────────────────────────── */
  return (
    <div style={card}>
      <h3 style={{ ...h, marginBottom: 10 }}>チーム規約への同意</h3>
      <p style={{ ...sub, marginBottom: 12 }}>{CONSENT_INTRO}</p>
      <button type="button" onClick={() => setReading(true)}
        style={{
          display: "block", width: "100%", marginBottom: 20, cursor: "pointer",
          padding: "13px 16px", borderRadius: 10, textAlign: "left",
          background: "rgba(229,184,75,0.10)", border: "1px solid #E5B84B", color: "#E5B84B",
          fontSize: 14, fontWeight: 800,
        }}>
        📄 規約の全文を読む（この画面のまま開きます）
      </button>
      {reading && <TermsReader onClose={() => setReading(false)} />}

      {/* 1. 確認 */}
      <div style={{ marginBottom: 22 }}>
        <span style={legend}>1. 確認</span>
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          {CONSENT_POINTS.map((p, i) => (
            <li key={i} style={{ display: "flex", gap: 8, fontSize: 12.5, color: "rgba(235,235,245,0.75)", lineHeight: 1.7 }}>
              <span style={{ color: "#E5B84B", flexShrink: 0 }}>・</span>
              <span>{p.text}<span style={{ color: "rgba(235,235,245,0.45)" }}>（{p.article}）</span></span>
            </li>
          ))}
        </ul>
        {([
          [confirmed, setConfirmed, "上のすべてを読み、理解しました"],
          [electronic, setElectronic, CONSENT_ELECTRONIC],
        ] as [boolean, (v: boolean) => void, string][]).map(([on, set, text], i) => (
          <button key={i} type="button" onClick={() => set(!on)}
            style={{
              width: "100%", textAlign: "left", display: "flex", gap: 10, alignItems: "flex-start",
              padding: "12px 14px", borderRadius: 10, marginTop: 8, cursor: "pointer",
              background: on ? "rgba(229,184,75,0.12)" : "#1C1C1E",
              border: `1px solid ${on ? "#E5B84B" : "#38383A"}`,
            }}>
            <span aria-hidden style={{
              flexShrink: 0, width: 19, height: 19, borderRadius: 5, marginTop: 1,
              border: `2px solid ${on ? "#E5B84B" : "#5A5A5E"}`, background: on ? "#E5B84B" : "transparent",
              color: "#10131C", fontSize: 13, fontWeight: 900, lineHeight: "15px", textAlign: "center",
            }}>{on ? "✓" : ""}</span>
            <span style={{ fontSize: 13.5, color: "#fff", lineHeight: 1.6 }}>{text}</span>
          </button>
        ))}
      </div>

      {/* 2. 年齢区分 */}
      <div style={{ marginBottom: 22 }}>
        <span style={legend}>2. 年齢区分</span>
        <Choice set={AGE_BANDS} value={ageBand} onChange={setAgeBand} />
      </div>

      {/* 3. 保険 */}
      <div style={{ marginBottom: 22 }}>
        <span style={legend}>3. 保険について（ひとつ選ぶ）</span>
        <Choice set={INSURANCE_CHOICES} value={insurance} onChange={setInsurance} />
      </div>

      {/* 4. 氏名の公開 */}
      <div style={{ marginBottom: 22 }}>
        <span style={legend}>4. 氏名の公開（ひとつ選ぶ）</span>
        <p style={{ ...sub, marginBottom: 8 }}>
          公式サイトおよび博多ルーキーリーグ公式サイトに、氏名・背番号・ポジション・成績を掲載することがあります（第21条）。
          公開しなくてもリーグ戦には出場できます。
        </p>
        <Choice set={NAME_CHOICES} value={nameDisclosure} onChange={setNameDisclosure} />
        {nameDisclosure === "alias" && (
          <input
            value={registeredName}
            onChange={e => setRegisteredName(e.target.value)}
            placeholder="公開してよい登録名（例：カシワギ / K.K）"
            maxLength={20}
            style={{ width: "100%", marginTop: 10, padding: 13, background: "#1C1C1E", border: "1px solid #48484A", color: "#fff", fontSize: 15, borderRadius: 8 }}
          />
        )}
      </div>

      {/* 5. 写真・動画 */}
      <div style={{ marginBottom: 22 }}>
        <span style={legend}>5. 写真・動画（ひとつ選ぶ）</span>
        <Choice set={PHOTO_CHOICES} value={photo} onChange={setPhoto} />
      </div>

      {/* 6. 署名 */}
      <div style={{ marginBottom: 22 }}>
        <span style={legend}>6. 署名</span>
        <p style={{ ...sub, marginBottom: 8 }}>
          {memberName ? <>ご本人（{memberName}）の署名をお願いします。</> : "ご本人の署名をお願いします。"}
        </p>
        <SignaturePad value={signature} onChange={setSignature} />
      </div>

      {/* 7. 保護者（18歳未満のみ） */}
      {minor && (
        <div style={{ marginBottom: 22, padding: 16, borderRadius: 12, background: "#1C1C1E", border: "1px solid #48484A" }}>
          <span style={legend}>7. 保護者の同意（18歳未満の方）</span>
          <p style={{ ...sub, marginBottom: 12 }}>
            保護者の方にこの画面を見せて、ご記入・ご署名をお願いします。とくに
            <strong style={{ color: "#fff" }}>保険が任意で未加入の場合にチームが責任を負わないこと（第9条）</strong>、
            <strong style={{ color: "#fff" }}>氏名・写真の公開（第21条）</strong>、
            <strong style={{ color: "#fff" }}>未成年メンバーの保護（第17条）</strong>をご確認ください。
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
            <input value={guardianName} onChange={e => setGuardianName(e.target.value)} placeholder="保護者の氏名" maxLength={40}
              style={{ width: "100%", padding: 13, background: "#2C2C2E", border: "1px solid #48484A", color: "#fff", fontSize: 15, borderRadius: 8 }} />
            <input value={guardianRelation} onChange={e => setGuardianRelation(e.target.value)} placeholder="続柄（例：父 / 母）" maxLength={20}
              style={{ width: "100%", padding: 13, background: "#2C2C2E", border: "1px solid #48484A", color: "#fff", fontSize: 15, borderRadius: 8 }} />
            <input value={guardianContact} onChange={e => setGuardianContact(e.target.value)} placeholder="連絡先（電話番号）" inputMode="tel" maxLength={20}
              style={{ width: "100%", padding: 13, background: "#2C2C2E", border: "1px solid #48484A", color: "#fff", fontSize: 15, borderRadius: 8 }} />
          </div>
          <SignaturePad value={guardianSignature} onChange={setGuardianSignature} placeholder="保護者の方がここに署名してください" />
        </div>
      )}

      {msg && !msg.ok && (
        <p style={{ fontSize: 13, color: "#FF453A", marginBottom: 12 }}>{msg.text}</p>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" onClick={submit} disabled={!ready || busy}
          style={{
            flex: 1, padding: "15px 20px", borderRadius: 10, border: "none",
            background: ready && !busy ? "#E5B84B" : "#38383A",
            color: ready && !busy ? "#10131C" : "rgba(235,235,245,0.45)",
            fontWeight: 800, fontSize: 15, cursor: ready && !busy ? "pointer" : "not-allowed",
          }}>
          {busy ? "送信中…" : "この内容で同意する"}
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={busy}
          style={{ padding: "15px 18px", borderRadius: 10, border: "1px solid #48484A", background: "transparent", color: "rgba(235,235,245,0.75)", fontSize: 14, cursor: "pointer" }}>
          やめる
        </button>
      </div>
      <p style={{ ...sub, marginTop: 10 }}>
        送信すると、同意した日時・選んだ内容・署名がチームの記録に残ります。
        紙の同意書（<Link href={TERMS.consentPdf} target="_blank" style={{ color: "#E5B84B" }}>PDF</Link>）で出していただいても構いません。
      </p>
    </div>
  );
}
