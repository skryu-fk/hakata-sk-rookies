"use client";

import { useEffect, useState } from "react";

const FORMSPREE_ID = process.env.NEXT_PUBLIC_FORMSPREE_ID ?? "";
const ENDPOINT = FORMSPREE_ID ? `https://formspree.io/f/${FORMSPREE_ID}` : "";

type Status = "idle" | "submitting" | "success" | "error";

const inp: React.CSSProperties = {
  width: "100%", border: "1px solid #d8d4cb", background: "#faf9f7",
  padding: "12px 16px", fontSize: 15, color: "#131922", outline: "none",
  fontFamily: "var(--font-zen), sans-serif", display: "block",
  boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s",
};

function FLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#0b1e3f", marginBottom: 8, letterSpacing: "0.05em" }}>
      {children} {required && <span style={{ color: "#d10024" }}>*</span>}
    </label>
  );
}

function FField({ label, name, type = "text", required, placeholder, min, max }:
  { label: string; name: string; type?: string; required?: boolean; placeholder?: string; min?: number; max?: number }) {
  const [foc, setFoc] = useState(false);
  return (
    <div>
      <FLabel required={required}>{label}</FLabel>
      <input id={name} name={name} type={type} required={required}
        placeholder={placeholder} min={min} max={max}
        style={{ ...inp, borderColor: foc ? "#d10024" : "#d8d4cb", boxShadow: foc ? "0 0 0 3px rgba(209,0,36,0.1)" : "none" }}
        onFocus={() => setFoc(true)} onBlur={() => setFoc(false)} />
    </div>
  );
}

function FSelect({ label, name, required, defaultValue = "", options, value, onChange }:
  { label: string; name: string; required?: boolean; defaultValue?: string; options: { value: string; label: string }[];
    value?: string; onChange?: (v: string) => void }) {
  const [foc, setFoc] = useState(false);
  // value を渡された時は親が値を管理する（controlled）。それ以外は従来どおり defaultValue。
  const valueProps = value !== undefined
    ? { value, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange?.(e.target.value) }
    : { defaultValue };
  return (
    <div>
      <FLabel required={required}>{label}</FLabel>
      <select name={name} required={required} {...valueProps}
        style={{
          ...inp, cursor: "pointer",
          borderColor: foc ? "#d10024" : "#d8d4cb",
          boxShadow: foc ? "0 0 0 3px rgba(209,0,36,0.1)" : "none",
          appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%230b1e3f' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center",
        }}
        onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}>
        {!defaultValue && <option value="" disabled>選択してください</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function FSubmit({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button type="submit" disabled={disabled}
      style={{
        width: "100%", background: disabled ? "#ccc" : (hov ? "#a80019" : "#d10024"),
        color: "#fff", border: "none", padding: "16px",
        fontSize: 15, fontWeight: 700, letterSpacing: "0.15em",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.2s", fontFamily: "var(--font-zen), sans-serif",
        transform: hov && !disabled ? "translateY(-2px)" : "none",
        boxShadow: hov && !disabled ? "0 8px 28px rgba(209,0,36,0.3)" : "none",
      }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      {children}
    </button>
  );
}

export default function RecruitForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  // ご相談内容。これによって表示する入力項目を切り替える。
  const [inquiry, setInquiry] = useState("メンバー応募");

  // スポンサー募集ページなどから「?inquiry=sponsor」付きで来た場合は、
  // ご相談内容をあらかじめ選択しておく（毎回選び直す手間をなくす）。
  // 初期描画はサーバーと同じ既定値にし、表示後に切り替えることで表示ズレを防ぐ。
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("inquiry");
    const map: Record<string, string> = { sponsor: "スポンサー", match: "対戦・リーグ" };
    const value = q ? map[q] : undefined;
    if (value) setInquiry(value);
  }, []);

  // 年齢・野球経験はメンバー応募のときだけ聞く（お店の方などには不要なため）
  const isMember = inquiry === "メンバー応募";
  const isSponsor = inquiry === "スポンサー";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ENDPOINT) {
      setStatus("error");
      setErrorMsg("フォーム送信先が未設定です。.env.local に NEXT_PUBLIC_FORMSPREE_ID を設定してください。");
      return;
    }
    setStatus("submitting"); setErrorMsg("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      const res = await fetch(ENDPOINT, { method: "POST", body: formData, headers: { Accept: "application/json" } });
      if (res.ok) {
        setStatus("success");
        form.reset();
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus("error");
        setErrorMsg(data?.errors?.[0]?.message ?? "送信に失敗しました。時間をおいて再度お試しください。");
      }
    } catch {
      setStatus("error");
      setErrorMsg("ネットワークエラーが発生しました。時間をおいて再度お試しください。");
    }
  }

  if (status === "success") return (
    <div style={{ background: "#0b1e3f", padding: "64px 48px", textAlign: "center" }}>
      <div style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: 11, color: "#d4a82a", letterSpacing: "0.4em", marginBottom: 16 }}>THANK YOU</div>
      <p style={{ fontFamily: "var(--font-zen), sans-serif", fontSize: 26, fontWeight: 900, color: "#fff", marginBottom: 12 }}>
        {isMember ? "ご応募ありがとうございました。" : "お問い合わせありがとうございました。"}
      </p>
      <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 1.85 }}>
        内容を確認のうえ、3日以内にご返信します。<br />
        {isMember ? "グラウンドでお会いしましょう。" : isSponsor ? "チームへのご支援のご相談、心より感謝いたします。" : "今しばらくお待ちください。"}
      </p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} style={{ background: "#fff", border: "1px solid #e0dcd4" }}>
      {/* Header */}
      <div style={{ background: "#0b1e3f", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-zen), sans-serif", fontWeight: 700, color: "#fff", fontSize: 13, letterSpacing: "0.1em" }}>応募・お問い合わせフォーム</span>
        <span style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.3em" }}>FORM</span>
      </div>

      <div style={{ padding: "32px", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* まず相談内容を選んでもらい、それに合わせて下の項目を出し分ける */}
        <FSelect label="ご相談内容" name="inquiry_type" value={inquiry} onChange={setInquiry} options={[
          { value: "メンバー応募",     label: "メンバーとして応募したい" },
          { value: "対戦・リーグ",     label: "練習試合・リーグのご相談" },
          { value: "スポンサー",       label: "スポンサーの相談をしたい" },
          { value: "道具支援",         label: "道具を譲りたい・支援したい" },
          { value: "質問",             label: "質問・その他" },
        ]} />
        {isSponsor && (
          <FField label="会社名・店舗名" name="company" placeholder="例：〇〇商店（個人の方は空欄でOK）" />
        )}
        <FField
          label={isSponsor ? "ご担当者名" : "お名前 / ニックネーム"}
          name="name" required placeholder="例：田中 太郎"
        />
        <FField label="メールアドレス" name="email" type="email" required placeholder="example@mail.com" />
        {isMember && (
          <>
            <FField label="年齢" name="age" type="number" required placeholder="例：22" min={10} max={60} />
            <FSelect label="野球経験" name="experience" required options={[
              { value: "未経験",      label: "完全に未経験" },
              { value: "少し",        label: "学生時代に少しだけ" },
              { value: "経験あり",    label: "中学・高校で経験あり" },
              { value: "ブランクあり",label: "経験あるけどブランク長め" },
              { value: "現役",        label: "今もどこかでプレー中" },
            ]} />
          </>
        )}
        <div>
          <FLabel>メッセージ</FLabel>
          <textarea name="message" rows={5}
            placeholder={isSponsor
              ? "ご希望のプラン（個人応援・サポーター・パートナー・公式パートナー）や、ご質問などをご記入ください。"
              : "意気込み・聞きたいこと・自己紹介など、自由にどうぞ。"}
            style={{ ...inp, resize: "vertical", height: 120 }} />
        </div>
        <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" style={{ display: "none" }} />
        {status === "error" && (
          <div style={{ background: "rgba(209,0,36,0.06)", border: "1px solid rgba(209,0,36,0.25)", padding: "12px 16px", color: "#d10024", fontSize: 13 }}>
            {errorMsg}
          </div>
        )}
        <FSubmit disabled={status === "submitting"}>{status === "submitting" ? "送信中…" : "送信する →"}</FSubmit>
        <p style={{ fontSize: 12, color: "#aaa", textAlign: "center" }}>送信内容はチーム代表者のみが確認します。3日以内に返信します。</p>
      </div>
    </form>
  );
}
