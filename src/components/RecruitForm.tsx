"use client";

import { useState } from "react";

const FORMSPREE_ID = process.env.NEXT_PUBLIC_FORMSPREE_ID ?? "";
const ENDPOINT = FORMSPREE_ID ? `https://formspree.io/f/${FORMSPREE_ID}` : "";

type Status = "idle" | "submitting" | "success" | "error";

export default function RecruitForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!ENDPOINT) {
      setStatus("error");
      setErrorMsg(
        "フォーム送信先が未設定です。.env.local に NEXT_PUBLIC_FORMSPREE_ID を設定してください。"
      );
      return;
    }

    setStatus("submitting");
    setErrorMsg("");

    const formEl = event.currentTarget;
    const formData = new FormData(formEl);

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        setStatus("success");
        formEl.reset();
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus("error");
        setErrorMsg(
          data?.errors?.[0]?.message ??
            "送信に失敗しました。時間をおいて再度お試しください。"
        );
      }
    } catch {
      setStatus("error");
      setErrorMsg("ネットワークエラーが発生しました。");
    }
  }

  if (status === "success") {
    return (
      <div className="bg-navy text-white p-10 md:p-14 text-center">
        <p className="font-display text-xs tracking-[0.3em] text-gold mb-3">THANK YOU</p>
        <p className="text-3xl md:text-4xl font-black leading-tight mb-4">
          ご応募ありがとうございました。
        </p>
        <p className="text-white/80 leading-relaxed text-[15px]">
          内容を確認のうえ、3日以内にご返信します。<br />
          グラウンドでお会いしましょう。
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-base-2 border border-line">
      {/* Header bar */}
      <div className="bg-navy text-white px-5 md:px-6 py-3 flex items-center justify-between">
        <p className="font-bold tracking-wider text-sm">応募・お問い合わせフォーム</p>
        <p className="font-display text-xs tracking-widest text-white/60">FORM</p>
      </div>

      <div className="p-5 md:p-8 space-y-5">
        <Field label="お名前 / ニックネーム" name="name" required placeholder="例: 田中 太郎" />
        <Field label="メールアドレス" name="email" type="email" required placeholder="example@mail.com" />
        <Field label="年齢" name="age" type="number" required placeholder="例: 22" min={10} max={60} />

        <SelectField
          label="野球経験"
          name="experience"
          required
          options={[
            { value: "未経験", label: "完全に未経験" },
            { value: "少し", label: "学生時代に少しだけ" },
            { value: "経験あり", label: "中学・高校で経験あり" },
            { value: "ブランクあり", label: "経験あるけどブランク長め" },
            { value: "現役", label: "今もどこかでプレー中" },
          ]}
        />

        <SelectField
          label="ご相談内容"
          name="inquiry_type"
          defaultValue="メンバー応募"
          options={[
            { value: "メンバー応募", label: "メンバーとして応募したい" },
            { value: "対戦相談", label: "対戦相手として連絡したい" },
            { value: "質問", label: "質問・その他" },
          ]}
        />

        <div>
          <label className="block text-sm font-bold text-navy mb-2 tracking-wide">
            メッセージ
          </label>
          <textarea
            name="message"
            rows={5}
            placeholder="意気込み・聞きたいこと・自己紹介など、自由にどうぞ。"
            className="w-full border border-line bg-base px-4 py-3 text-base text-ink placeholder:text-muted/60 focus:outline-none focus:border-red focus:ring-2 focus:ring-red/15 resize-y"
          />
        </div>

        {/* Honeypot */}
        <input
          type="text"
          name="_gotcha"
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
        />

        {status === "error" && (
          <p className="border border-red/30 bg-red/5 text-red px-4 py-3 text-sm">
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full bg-red hover:bg-red-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-white py-4 font-bold tracking-widest text-lg shadow-lg shadow-red/20 inline-flex items-center justify-center gap-2"
        >
          {status === "submitting" ? "送信中…" : (
            <>
              <span>送信する</span>
              <span className="text-xl">→</span>
            </>
          )}
        </button>

        <p className="text-xs text-muted text-center">
          送信内容はチーム代表者のみが確認します。3日以内に返信します。
        </p>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  min,
  max,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-bold text-navy mb-2 tracking-wide">
        {label} {required && <span className="text-red">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
        className="w-full border border-line bg-base px-4 py-3 text-base text-ink placeholder:text-muted/60 focus:outline-none focus:border-red focus:ring-2 focus:ring-red/15"
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  required,
  defaultValue = "",
  options,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-bold text-navy mb-2 tracking-wide">
        {label} {required && <span className="text-red">*</span>}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="w-full border border-line bg-base px-4 py-3 text-base text-ink focus:outline-none focus:border-red focus:ring-2 focus:ring-red/15 cursor-pointer"
      >
        {!defaultValue && (
          <option value="" disabled>
            選択してください
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
