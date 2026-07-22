import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPost } from "@/lib/blog";
import { PostBody } from "@/components/marketing/blog/post-body";
import { primaryCta } from "@/lib/site-config";
import { Cta } from "@/components/marketing/cta";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Post not found" };
  return { title: post.title, description: post.description };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-2xl px-5 py-20 sm:px-8">
      <Link href="/blog" className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted hover:text-ink">
        ← Blog
      </Link>
      <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.12em] text-dim">
        {post.dateLabel} · {post.readMins} min read
      </p>
      <h1 className="mt-3 font-serif text-4xl font-medium leading-[1.08] tracking-[-0.02em] text-ink sm:text-[2.75rem]">
        {post.title}
      </h1>
      <div className="mt-8">
        <PostBody blocks={post.blocks} />
      </div>
      <div className="mt-12 rounded-card border border-rule bg-surface p-6 text-center">
        <p className="font-serif text-lg text-ink">See it on your own numbers.</p>
        <div className="mt-4 flex justify-center">
          <Cta href={primaryCta.href} variant="primary" size="md">
            {primaryCta.label}
          </Cta>
        </div>
      </div>
    </article>
  );
}
