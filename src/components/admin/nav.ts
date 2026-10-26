import {
  FileText,
  FilePenLine,
  FileLock2,
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
  Inbox,
  KeyRound,
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
    ],
  },
  {
    label: "Library",
    items: [
      { title: "Media", href: "/admin/media", icon: Image, permission: "manageMedia" },
      { title: "Categories", href: "/admin/categories", icon: FolderTree, permission: "manageTaxonomy" },
      { title: "Tags", href: "/admin/tags", icon: Tags, permission: "manageTaxonomy" },
      { title: "Documents", href: "/admin/documents", icon: FileLock2, permission: "manageDocuments" },
      { title: "Access Requests", href: "/admin/document-requests", icon: KeyRound, permission: "manageDocuments" },
    ],
  },
  {
    label: "Tools",
    items: [
      { title: "Letterhead Editor", href: "/admin/letterhead", icon: FilePenLine, permission: "manageLetterheads" },
    ],
  },
  {
    label: "People",
    items: [
      { title: "Authors", href: "/admin/authors", icon: UserRound, permission: "manageAuthors" },
      { title: "Users", href: "/admin/users", icon: Users, permission: "manageUsers" },
    ],
  },
  {
    label: "Leads",
    items: [
      { title: "Enquiries", href: "/admin/enquiries", icon: Inbox, permission: "manageLeads" },
    ],
  },
  {
    label: "SEO",
    items: [
      { title: "Broken Links", href: "/admin/seo/broken-links", icon: Link2Off, permission: "manageSeoTools" },
      { title: "Redirects", href: "/admin/seo/redirects", icon: Shuffle, permission: "manageSeoTools" },
      { title: "Robots.txt", href: "/admin/seo/robots", icon: ListTree, permission: "manageSettings" },
      { title: "Indexing Log", href: "/admin/seo/indexing", icon: Radar, permission: "manageSeoTools" },
    ],
  },
  {
    label: "Site",
    items: [
      { title: "Settings", href: "/admin/settings", icon: Settings, permission: "manageSettings" },
    ],
  },
];
