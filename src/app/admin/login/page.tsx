import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Painel", robots: { index: false } };

export default function LoginPage() {
  return (
    <main className="mx-auto w-full max-w-sm px-4 py-24">
      <h1 className="font-display text-3xl text-forest">Painel do proprietário</h1>
      <LoginForm />
    </main>
  );
}
