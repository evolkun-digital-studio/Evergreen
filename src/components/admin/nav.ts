import {
  FileText,
  FolderTree,
  Image,
  LayoutDashboard,
  Link2Off,
  ListTree,
  Radar,
  Settings,
  Shuffle,
  Tags,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/auth/session";

type NavItem = { title: string; href: string; icon: LucideIcon; permission?: Permission };
type NavGroup = { label: string; items: NavItem[] };

export const ADMIN_NAV: NavGroup[] = [
  {
    label: "Content",
    items: [
      { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { title: "Posts", href: "/admin/posts", icon: FileText },
      { title: "Categories", href: "/admin/categories", icon: FolderTree, permission: "manageTaxonomy" },
      { title: "Tags", href: "/admin/tags", icon: Tags, permission: "manageTaxonomy" },
      { title: "Media", href: "/admin/media", icon: Image, permission: "manageMedia" },
      { title: "Authors", href: "/admin/authors", icon: UserRound, permission: "manageAuthors" },
    ],
  },
  {
    label: "SEO Tools",
    items: [
      { title: "Broken Links", href: "/admin/seo/broken-links", icon: Link2Off, permission: "manageSeoTools" },
      { title: "Redirects", href: "/admin/seo/redirects", icon: Shuffle, permission: "manageSeoTools" },
      { title: "Robots.txt", href: "/admin/seo/robots", icon: ListTree, permission: "manageSettings" },
      { title: "Indexing Log", href: "/admin/seo/indexing", icon: Radar, permission: "manageSeoTools" },
    ],
  },
  {
    label: "Admin",
    items: [
      { title: "Settings", href: "/admin/settings", icon: Settings, permission: "manageSettings" },
      { title: "Users", href: "/admin/users", icon: Users, permission: "manageUsers" },
    ],
  },
];
