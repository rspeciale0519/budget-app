import Link from "next/link";
import { Section } from "./section";
import { Reveal } from "./reveal";
import { FaqList } from "../faq-list";
import { faqs } from "@/lib/marketing-content";

export function FaqTeaser() {
  return (
    <Section eyebrow="Questions" title="The things worth knowing before you trust us with your money.">
      <Reveal>
        <FaqList items={faqs.slice(0, 4)} />
      </Reveal>
      <Reveal className="mt-8">
        <Link href="/faq" className="text-sm text-now underline underline-offset-4 hover:text-ink">
          Read the full FAQ →
        </Link>
      </Reveal>
    </Section>
  );
}
