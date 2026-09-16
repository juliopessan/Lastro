"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button type="button" className="btn btn-ghost" style={{ border: "1px solid var(--rule)" }} onClick={sair}>
      Sair
    </button>
  );
}
