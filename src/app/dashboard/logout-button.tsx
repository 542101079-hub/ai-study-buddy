"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { signOut, type AuthActionResult } from "../(auth)/actions";

interface LogoutButtonProps {
  className?: string;
}

export function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    startTransition(async () => {
      const result: AuthActionResult = await signOut();

      if (!result.success) {
        setError(result.message);
        return;
      }

      setError(null);
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        variant="outline"
        className={className}
        disabled={pending}
        onClick={handleClick}
      >
        {pending ? "正在退出..." : "退出"}
      </Button>
      {error && (
        <p className="text-xs text-red-300">{error}</p>
      )}
    </div>
  );
}
