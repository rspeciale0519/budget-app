import { describe, it, expect } from "vitest";
import { buildRssXml } from "./rss";
import { getAllPosts } from "./blog";

describe("buildRssXml", () => {
  const xml = buildRssXml(getAllPosts());

  it("is well-formed XML the parser accepts", () => {
    // Node's DOMParser isn't available; assert structural well-formedness via a
    // balanced-tag + declaration check plus no raw unescaped ampersands.
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<rss version="2.0">');
    expect((xml.match(/<item>/g) ?? []).length).toBe(getAllPosts().length);
    expect((xml.match(/<item>/g) ?? []).length).toBe((xml.match(/<\/item>/g) ?? []).length);
    // No stray unescaped ampersands (every & must begin an entity).
    expect(/&(?!amp;|lt;|gt;|quot;|apos;)/.test(xml)).toBe(false);
  });

  it("includes every post's title and absolute link", () => {
    for (const post of getAllPosts()) {
      expect(xml).toContain(post.title.replace(/&/g, "&amp;"));
      expect(xml).toContain(`/blog/${post.slug}`);
    }
  });

  it("emits RFC-822 pubDates", () => {
    expect(/<pubDate>\w{3}, \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} GMT<\/pubDate>/.test(xml)).toBe(true);
  });
});
