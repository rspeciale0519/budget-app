import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description: "Practical writing on separating business and personal finances, paying yourself, and cash-flow for owner-operators.",
};

export default function BlogPage() {
  const posts = getAllPosts();
  return (
    <section className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-24">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-credit">Blog</p>
      <h1 className="mt-4 font-serif text-4xl font-medium leading-[1.05] tracking-[-0.02em] text-ink sm:text-5xl">
        Field notes on money for people who run things.
      </h1>
      <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
        Practical, opinionated writing on keeping personal and business finances straight.
      </p>

      <div className="mt-12 divide-y divide-rule border-y border-rule">
        {posts.map((post) => (
          <article key={post.slug} className="py-7">
            <Link href={`/blog/${post.slug}`} className="group block">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-dim">
                {post.dateLabel} · {post.readMins} min read
              </p>
              <h2 className="mt-2 font-serif text-2xl leading-snug text-ink group-hover:text-credit">
                {post.title}
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{post.description}</p>
              <span className="mt-3 inline-block text-sm text-now underline underline-offset-4">Read →</span>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
