import { industries } from "@/content/company";

export function Industries() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-4">
      {industries.map(({ name, icon: Icon }) => (
        <li key={name} className="flex items-center gap-2.5 text-ink">
          <Icon aria-hidden="true" className="h-5 w-5 text-evergreen-700" />
          {name}
        </li>
      ))}
    </ul>
  );
}
