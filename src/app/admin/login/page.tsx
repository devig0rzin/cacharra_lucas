import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Painel", robots: { index: false } };

export default function LoginPage() {
  return (
    <main id="conteudo" className="login-page">
      <section className="login-card">
        <p className="section-kicker">Acesso restrito</p>
        <h1 className="font-display text-3xl text-forest">Painel do proprietário</h1>
        <LoginForm />
      </section>
    </main>
  );
}
