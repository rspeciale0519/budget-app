import { Section } from "./section";
import { Reveal } from "./reveal";

const guarantees = [
  {
    title: "Money math that can't drift",
    body: "Every figure is computed from your transactions in exact decimal — never floating-point. Balances can't silently go wrong.",
  },
  {
    title: "Books that stay separate",
    body: "Grant a bookkeeper one business and that's all they see. Per-book access is enforced in the database itself, not just the screen.",
  },
  {
    title: "A record of every change",
    body: "An audit log tracks who changed what and when — so nothing moves without a trail you can read.",
  },
  {
    title: "Isolation at the database",
    body: "Row-level security means the database refuses data a user isn't entitled to, even if a bug ever slipped past the app.",
  },
];

export function Trust() {
  return (
    <Section
      eyebrow="Trust & safety"
      title="It's your money. We treat it that way."
    >
      <div className="grid gap-x-12 gap-y-10 sm:grid-cols-2">
        {guarantees.map((g, i) => (
          <Reveal key={g.title} delay={i * 70} className="border-t border-rule pt-5">
            <h3 className="font-serif text-lg text-ink">{g.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{g.body}</p>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
