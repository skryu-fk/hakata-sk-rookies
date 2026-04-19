"use client";

import { useState } from "react";

// Formspree フォームID は環境変数から
// .env.local に NEXT_PUBLIC_FORMSPREE_ID="xxxxxxxx" を設定（Formspree でフォームを作って取得）
const FORMSPREE_ID = process.env.NEXT_PUBLIC_FORMSPREE_ID ?? "";
const ENDPOINT = FORMSPREE_ID
  ? `https://formspree.io/f/${FORMSPREE_ID}`
  : "";

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
          data?.errors?.[0]?.message ?? "送信に失敗しました。時間をおいて再度お試しください。"
        );
      }
    } catch {
      setStatus("error");
      setErrorMsg("ネットワークエラーが発生しました。");
    }
  }

  if (status === "success") {
    return (
      <div className="bg-navy text-cream p-10 text-center">
        <p className="font-display tracking-[0.3em] text-gold text-sm mb-3">
          THANK YOU
        </p>
        <h3 className="text-3xl md:text-4xl font-black mb-4">
          応募ありがとう！
        </h3>
        <p className="text-cream/80 leading-relaxed">
          内容を確認のうえ、3日以内にご返信します。<br />
          グラウンドで会いましょう。
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 md:p-10 border border-ink/10 shadow-sm">
      <Field label="お名前 / ニックネーム" name="name" required placeholder="例: 田中 太郎" />
      <Field label="メールアドレス" name="email" type="email" required placeholder="example@mail.com" />
      <Field label="年齢" name="age" type="number" required placeholder="例: 22" min={10} max={60} />

      <div>
        <label className="block text-sm font-bold text-navy mb-2 tracking-wide">
          野球経験 <span className="text-red">*</span>
        </label>
        <select
          name="experience"
          required
          defaultValue=""
          className="w-full border border-ink/20 px-4 py-3 bg-cream focus:outline-none focus:border-red focus:ring-2 focus:ring-red/20"
        >
          <option value="" disabled>選択してください</option>
          <option value="未経験">完全に未経験</option>
          <option value="少し">学生時代に少しだけ</option>
          <option value="経験あり">中学・高校で経験あり</option>
          <option value="ブランクあり">経験あるけどブランク長め</option>
          <option value="現役">今もどこかでプレー中</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-bold text-navy mb-2 tracking-wide">
          メッセージ・質問など
        </label>
        <textarea
          name="message"
          rows={5}
          placeholder="意気込み・聞きたいこと・自己紹介など、自由にどうぞ！"
          className="w-full border border-ink/20 px-4 py-3 bg-cream focus:outline-none focus:border-red focus:ring-2 focus:ring-red/20 resize-y"
        />
      </div>

      {/* Honeypot */}
      <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" className="hidden" />

      {status === "error" && (
        <p className="text-red bg-red/5 border border-red/20 px-4 py-3 text-sm">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full bg-red hover:bg-red-2 disabled:opacity-60 disabled:cursor-not-allowed transition px-6 py-4 text-white font-bold tracking-widest text-lg shadow-lg shadow-red/20"
      >
        {status === "submitting" ? "送信中…" : "▶ 応募を送信する"}
      </button>

      <p className="text-xs text-ink/50 text-center">
        送信内容はチーム代表者のみが確認します。3日以内に返信します。
      </p>
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
        className="w-full border border-ink/20 px-4 py-3 bg-cream focus:outline-none focus:border-red focus:ring-2 focus:ring-red/20"
      />
    </div>
  );
}
