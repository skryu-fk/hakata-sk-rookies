"use client";

/**
 * /staff — 首脳陣コンソールを単独のページとして開く入口。
 *
 * 中身は src/components/StaffConsole.tsx にある。メンバーアプリ（/stats）からも
 * 同じものを全画面で開くため、ページとコンポーネントを分けてある。
 */
import StaffConsole from "@/components/StaffConsole";

export default function StaffPage() {
  return <StaffConsole />;
}
