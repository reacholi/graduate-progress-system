"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("App render error", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 text-slate-950">
      <section className="w-full max-w-md rounded-md border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-950">
          系统加载出现错误
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          请刷新页面或联系管理员
        </p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="mt-5 min-h-10 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          刷新页面
        </button>
      </section>
    </main>
  );
}
