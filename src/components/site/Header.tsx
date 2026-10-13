"use client";

import { Suspense, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator, ChevronDown, Menu, X } from "lucide-react";
import { eprNavLink, primaryNav, shortServiceLinks, type NavLink } from "@/config/nav";
import { site } from "@/config/site";
import { cn } from "@/lib/utils";
import { useHideOnScroll } from "@/hooks/useHideOnScroll";

const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";

/**
 * Keeps an element mounted for `ms` after `open` turns false so CSS can play the exit transition.
 * `shown` flips one frame after mounting so the enter transition runs too.
 */
function useMountTransition(open: boolean, ms: number) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(open);
  if (open && !mounted) setMounted(true);
  if (!open && shown) setShown(false);
  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(id);
    }
    const t = window.setTimeout(() => setMounted(false), ms);
    return () => window.clearTimeout(t);
  }, [open, ms]);
  return { mounted, shown };
}

function isActive(pathname: string | null, href: string) {
  if (pathname === null) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** `light`: white text, used while the header sits over the home video hero. */
const linkClass = (active: boolean, light: boolean) =>
  cn(
    "relative inline-flex h-14 items-center whitespace-nowrap font-display text-[12px] font-medium tracking-normal transition-colors",
    "after:absolute after:inset-x-0 after:bottom-[12px] after:h-0.5 after:rounded-full after:bg-moss after:transition-opacity",
    light
      ? active
        ? "text-white after:opacity-100"
        : "text-white/85 hover:text-white after:opacity-0"
      : active
        ? "text-evergreen-700 after:opacity-100"
        : "text-ink/80 hover:text-evergreen-700 after:opacity-0",
  );

/** EPR Calculator button: moss over the video hero, evergreen-700 on the white header; ring when active. */
const eprButtonClass = (light: boolean, active: boolean) =>
  cn(
    "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[8px] px-3.5 font-display text-[12px] font-semibold transition-colors",
    light ? "bg-moss text-evergreen-950 hover:bg-moss-soft" : "bg-evergreen-700 text-white hover:bg-evergreen-800",
    active && (light ? "ring-2 ring-moss ring-offset-2 ring-offset-evergreen-950" : "ring-2 ring-evergreen-700 ring-offset-2 ring-offset-white"),
  );

const CLOSE_DELAY = 150;

/**
 * Services dropdown: 340px off-white panel 14px below the trigger, aligned to its left edge (nudged to
 * stay inside the viewport). Opens on hover (closes 150ms after the pointer leaves) and on click/Enter;
 * closes on Esc, outside click and blur; ArrowDown/ArrowUp/Home/End move between items.
 */
function ServicesMenu({
  item,
  pathname,
  light,
  onOpenChange,
}: {
  item: NavLink & { children: NavLink[] };
  pathname: string | null;
  light: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  useEffect(() => onOpenChange(open), [open, onOpenChange]);
  const [openedOn, setOpenedOn] = useState(pathname);
  if (openedOn !== pathname) {
    setOpenedOn(pathname);
    setOpen(false);
  }
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const panelId = useId();

  const cancelClose = () => window.clearTimeout(closeTimer.current);
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY);
  };
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (!open) return;
    // Keep the panel inside the viewport (16px margin).
    const r = panelRef.current?.getBoundingClientRect();
    if (r) {
      const over = r.right - shift - (window.innerWidth - 16);
      const next = over > 0 ? -over : 0;
      if (next !== shift) setShift(next);
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open, shift]);

  const items = () => [...(panelRef.current?.querySelectorAll<HTMLAnchorElement>("a") ?? [])];
  const onPanelKey = (e: React.KeyboardEvent) => {
    const list = items();
    const i = list.indexOf(document.activeElement as HTMLAnchorElement);
    const go = (n: number) => {
      e.preventDefault();
      list[(n + list.length) % list.length]?.focus();
    };
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(list.length - 1);
  };

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
      onBlur={e => {
        if (!wrapRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            requestAnimationFrame(() => items()[0]?.focus());
          }
        }}
        className={cn(linkClass(isActive(pathname, item.href), light), "gap-1", open && (light ? "text-white" : "text-evergreen-700"))}
      >
        {item.label}
        <ChevronDown aria-hidden="true" className={cn("h-3 w-3 translate-y-px transition-transform duration-200", open && "rotate-180")} />
      </button>

      <div
        id={panelId}
        ref={panelRef}
        onKeyDown={onPanelKey}
        style={{ marginLeft: shift }}
        className={cn(
          "absolute left-0 top-[calc(100%+14px)] z-10 w-[340px] rounded-[24px] bg-[#f7f7f4] px-7 py-[30px] before:absolute before:inset-x-0 before:-top-[14px] before:h-[14px] before:content-[''] transition-[opacity,transform,visibility] duration-150 motion-reduce:transition-none",
          EASE,
          open ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible -translate-y-1 opacity-0",
        )}
      >
        <ul className="flex flex-col gap-4">
          {shortServiceLinks.map(child => (
            <li key={child.href}>
              <Link
                href={child.href}
                aria-current={pathname === child.href ? "page" : undefined}
                className="flex min-h-6 items-center rounded-[4px] font-display text-[16px] font-normal leading-[1.4] text-[#193a2b] transition-colors hover:text-evergreen-700 focus-visible:bg-paper-2"
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mb-[19px] mt-[22px] border-t border-line" />
        <Link
          href={item.href}
          className="flex min-h-6 items-center gap-2 rounded-[4px] text-[14px] font-normal leading-[1.4] text-evergreen-700 transition-colors hover:text-evergreen-800 focus-visible:bg-paper-2"
        >
          All services <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}

// usePathname() is request data on dynamic routes, so it sits under <Suspense>;
// the fallback renders without the active-link state.
export function Header() {
  return (
    <Suspense fallback={<HeaderBar pathname={null} />}>
      <HeaderWithPath />
    </Suspense>
  );
}

function HeaderWithPath() {
  return <HeaderBar pathname={usePathname()} />;
}

function HeaderBar({ pathname }: { pathname: string | null }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [focusInside, setFocusInside] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }
  const menu = useMountTransition(menuOpen, 280);

  useEffect(() => {
    if (!menuOpen) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    window.__lenis?.stop();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      html.style.overflow = prev;
      window.__lenis?.start();
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const { hidden, scrolled } = useHideOnScroll(menuOpen || dropdownOpen || focusInside);

  // Transparent with white text while the home video hero is under the header.
  const [overHero, setOverHero] = useState(false);
  useEffect(() => {
    const hero = document.getElementById("hero");
    if (!hero) return;
    const io = new IntersectionObserver(([e]) => setOverHero(e.isIntersecting), { rootMargin: "-56px 0px 0px 0px", threshold: 0 });
    io.observe(hero);
    return () => {
      io.disconnect();
      setOverHero(false); // leaving the home page
    };
  }, [pathname]);
  const light = overHero && !menuOpen;
  // Windows Chrome draws a light scrollbar track beside the page, which reads as a white strip next to
  // the dark video. While the hero is under the header, the root scrollbar is themed dark (globals.css).
  useEffect(() => {
    const html = document.documentElement;
    if (overHero) html.dataset.overHero = "";
    else delete html.dataset.overHero;
    return () => {
      delete html.dataset.overHero;
    };
  }, [overHero]);

  return (
    <header
      onFocus={() => setFocusInside(true)}
      onBlur={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocusInside(false);
      }}
      className={cn(
        "sticky inset-x-0 top-0 z-[100] transition-[transform,box-shadow,background-color] duration-200 ease-out motion-reduce:transition-none",
        light ? "bg-transparent" : "bg-paper/95 backdrop-blur-md",
        !light && scrolled && !hidden && "shadow-[0_1px_0_var(--color-line)]",
        hidden ? "-translate-y-full" : "translate-y-0",
      )}
    >
      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-[200] focus-visible:rounded-md focus-visible:bg-white focus-visible:px-4 focus-visible:py-2 focus-visible:text-evergreen-900"
      >
        Skip to content
      </a>
      <div className="container">
        <div className="flex h-14 items-center justify-between gap-6 lg:grid lg:grid-cols-[1fr_auto_1fr]">
          <Link href="/" aria-label={`${site.name} home`} className="flex min-h-11 shrink-0 items-center justify-self-start">
            {/* eslint-disable-next-line @next/next/no-img-element -- Brand artwork keeps its original aspect ratio */}
            <img src={site.logo} alt={site.name} width={1326} height={332} className="block h-[26px] w-auto max-w-[125px] object-contain md:h-7 md:max-w-[150px] lg:h-8" />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
            {primaryNav.map(item =>
              item.children ? (
                <ServicesMenu key={item.href} item={{ ...item, children: item.children }} pathname={pathname} light={light} onOpenChange={setDropdownOpen} />
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
                  className={linkClass(isActive(pathname, item.href), light)}
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>

          <Link
            href={eprNavLink.href}
            aria-current={isActive(pathname, eprNavLink.href) ? "page" : undefined}
            className={cn(eprButtonClass(light, isActive(pathname, eprNavLink.href)), "hidden justify-self-end lg:inline-flex")}
          >
            <Calculator aria-hidden="true" className="h-[15px] w-[15px]" />
            {eprNavLink.label}
          </Link>

          <button
            type="button"
            className={cn(
              "-mr-2 inline-flex h-11 w-11 items-center justify-center justify-self-end rounded-lg lg:hidden",
              light ? "text-white hover:bg-white/10" : "text-evergreen-900 hover:bg-evergreen-700/[0.06]",
            )}
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Portalled to <body>: the header's backdrop-filter would otherwise make `fixed` relative to the 56px header. */}
      {menu.mounted &&
        createPortal(
          <div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className={cn(
              "fixed inset-0 z-[150] transition-opacity duration-200 motion-reduce:transition-none lg:hidden",
              menu.shown ? "opacity-100" : "opacity-0",
            )}
          >
            <button
              type="button"
              aria-label="Close menu"
              tabIndex={-1}
              className="absolute inset-0 bg-evergreen-950/30"
              onClick={() => setMenuOpen(false)}
            />
            <div
              className={cn(
                "absolute inset-y-0 right-0 flex w-full max-w-sm flex-col overflow-y-auto bg-paper transition-transform duration-[280ms] motion-reduce:transition-none",
                EASE,
                menu.shown ? "translate-x-0" : "translate-x-full",
              )}
            >
              <div className="flex h-14 items-center justify-between border-b border-line px-5">
                {/* eslint-disable-next-line @next/next/no-img-element -- Brand artwork keeps its original aspect ratio */}
                <img src={site.logo} alt={site.name} width={1326} height={332} className="block h-[26px] w-auto max-w-[125px] object-contain md:h-7 md:max-w-[150px]" />
                <button
                  type="button"
                  autoFocus
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-evergreen-900 hover:bg-evergreen-700/[0.06]"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <nav aria-label="Mobile" className="flex flex-1 flex-col px-5 pb-8 pt-2">
                <ul className="divide-y divide-line">
                  {primaryNav.map(item => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={isActive(pathname, item.href) ? "page" : undefined}
                        className={cn(
                          "block py-3.5 font-display text-base font-medium",
                          isActive(pathname, item.href) ? "text-evergreen-700" : "text-evergreen-950",
                        )}
                      >
                        {item.label}
                      </Link>
                      {item.children && (
                        <ul className="-mt-1 pb-3">
                          {item.children.map(child => (
                            <li key={child.href}>
                              <Link href={child.href} className="flex min-h-11 items-center pl-4 text-[14px] text-ink-muted hover:text-evergreen-700">
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
                <Link
                  href={eprNavLink.href}
                  aria-current={isActive(pathname, eprNavLink.href) ? "page" : undefined}
                  className={cn(eprButtonClass(false, isActive(pathname, eprNavLink.href)), "mt-4 flex w-full justify-center")}
                >
                  <Calculator aria-hidden="true" className="h-[15px] w-[15px]" />
                  {eprNavLink.label}
                </Link>
              </nav>
            </div>
          </div>,
          document.body,
        )}
    </header>
  );
}
