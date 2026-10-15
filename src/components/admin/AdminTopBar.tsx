"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ExternalLink, LogOut, Search, Settings2, UserRound } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ADMIN_NAV } from "./nav";
import { can, type Role } from "@/lib/cms/constants";

export function AdminTopBar({ user, signOutAction }: { user: { name: string; email: string; role: Role }; signOutAction: () => Promise<void> }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const items = useMemo(() => ADMIN_NAV.flatMap((group) => group.items).filter((item) => !item.permission || can[item.permission](user.role)), [user.role]);
  const current = items.filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)).sort((a, b) => b.href.length - a.href.length)[0];
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen((value) => !value); } }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, []);
  return <><header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/95 px-4 backdrop-blur md:px-6"><SidebarTrigger className="text-evergreen-700" /><div className="min-w-0 flex-1"><p className="truncate text-xs text-muted-foreground">Evergreen CMS / {current?.title ?? "Admin"}</p><p className="truncate font-display text-base font-semibold text-evergreen-950">{current?.title ?? "Admin"}</p></div><Button variant="outline" size="sm" className="hidden md:flex" onClick={() => setOpen(true)}><Search className="size-4" /> Search <kbd className="ml-2 text-xs text-muted-foreground">⌘K</kbd></Button><Button asChild variant="ghost" size="sm" className="hidden sm:flex"><a href="/" target="_blank" rel="noopener"><ExternalLink className="size-4" /> View site</a></Button><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label="User menu"><UserRound className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-64"><DropdownMenuLabel><span className="block truncate">{user.name}</span><span className="block truncate text-xs font-normal text-muted-foreground">{user.email}</span></DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem asChild><Link href="/admin/change-password"><Settings2 className="size-4" /> Change password</Link></DropdownMenuItem><DropdownMenuItem asChild><form action={signOutAction} className="w-full"><button type="submit" className="flex w-full items-center gap-2"><LogOut className="size-4" /> Sign out</button></form></DropdownMenuItem></DropdownMenuContent></DropdownMenu></header><CommandDialog open={open} onOpenChange={setOpen}><Command><CommandInput placeholder="Go to an admin page…" /><CommandList><CommandEmpty>No matching page.</CommandEmpty>{ADMIN_NAV.map((group) => { const allowed = group.items.filter((item) => !item.permission || can[item.permission](user.role)); return allowed.length ? <CommandGroup key={group.label} heading={group.label}>{allowed.map((item) => <CommandItem key={item.href} onSelect={() => { setOpen(false); router.push(item.href); }}><item.icon className="size-4" /> {item.title}</CommandItem>)}</CommandGroup> : null; })}</CommandList></Command></CommandDialog></>;
}
