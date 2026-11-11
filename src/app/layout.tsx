import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  icons: { icon: "/keizu-icon.svg" },
  title: "ケイズクリーン | 清掃予約ポータル DEMO",
  description: "歯科医院向けの清掃予約・作業予定管理デモ",
};
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="ja"><body>{children}</body></html>;
}
