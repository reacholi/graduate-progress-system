import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "研究生论文进度协同管理系统",
  description: "研究生论文任务、风险、阶段成果与修改记录管理原型",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
