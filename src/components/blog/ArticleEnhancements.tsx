"use client";

import { useEffect } from "react";

/**
 * The article's only client JS (~1 KB): copy-code buttons, the YouTube facade, copy-link, and
 * the active-section highlight in the table of contents. Renders nothing.
 */
export function ArticleEnhancements() {
  useEffect(() => {
    const onClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      const copyBtn = target.closest<HTMLButtonElement>("[data-copy-code]");
      if (copyBtn) {
        const code = copyBtn.parentElement?.querySelector("pre")?.innerText ?? "";
        await navigator.clipboard.writeText(code);
        copyBtn.textContent = "Copied";
        setTimeout(() => (copyBtn.textContent = "Copy"), 1600);
        return;
      }

      const facade = target.closest<HTMLAnchorElement>("a.yt-facade[data-youtube-id]");
      if (facade && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const iframe = document.createElement("iframe");
        iframe.src = `https://www.youtube-nocookie.com/embed/${facade.dataset.youtubeId}?autoplay=1&rel=0`;
        iframe.title = facade.dataset.title || "YouTube video";
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        iframe.allowFullscreen = true;
        facade.replaceWith(iframe);
        iframe.focus();
        return;
      }

      const copyLink = target.closest<HTMLButtonElement>("[data-copy-link]");
      if (copyLink) {
        await navigator.clipboard.writeText(window.location.href.split("#")[0]);
        const label = copyLink.querySelector("[data-label]");
        if (label) {
          label.textContent = "Link copied";
          setTimeout(() => (label.textContent = "Copy link"), 1600);
        }
      }
    };
    document.addEventListener("click", onClick);

    // Highlight the TOC entry of the section currently being read.
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("[data-toc] a[href^='#']"));
    const ids = [...new Set(links.map((a) => decodeURIComponent(a.hash.slice(1))))];
    const headings = ids.map((id) => document.getElementById(id)).filter((h): h is HTMLElement => Boolean(h));
    let observer: IntersectionObserver | null = null;
    if (headings.length) {
      const visible = new Set<string>();
      const setActive = (id: string) =>
        links.forEach((a) => {
          if (decodeURIComponent(a.hash.slice(1)) === id) a.setAttribute("aria-current", "location");
          else a.removeAttribute("aria-current");
        });
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) visible.add(entry.target.id);
            else visible.delete(entry.target.id);
          }
          const first = headings.find((h) => visible.has(h.id));
          if (first) setActive(first.id);
        },
        { rootMargin: "-90px 0px -65% 0px" },
      );
      headings.forEach((h) => observer!.observe(h));
    }

    return () => {
      document.removeEventListener("click", onClick);
      observer?.disconnect();
    };
  }, []);

  return null;
}
