"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center">
          <h2 className="text-xl font-semibold">문제가 발생했습니다</h2>
          <button
            className="mt-4 rounded bg-blue-500 px-4 py-2 text-white"
            onClick={() => reset()}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
