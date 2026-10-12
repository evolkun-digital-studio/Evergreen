import { FileCheck2 } from "lucide-react";
import { ConfirmBadge } from "@/components/Confirm";
import { registrations } from "@/content/company";

export function Registrations() {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {registrations
        .filter(r => !r.verify)
        .map(r => (
          <li
            key={r.title}
            className="grid gap-2 py-6 sm:grid-cols-[2rem_1fr_1fr] sm:gap-6"
          >
            <FileCheck2
              aria-hidden="true"
              className="h-5 w-5 text-evergreen-700 sm:mt-1"
            />
            <div>
              <h3>{r.title}</h3>
              <p className="meta mt-1 text-copper-ink">{r.detail}</p>
            </div>
            <p className="text-ink-muted">
              {r.body}
              {r.verify && (
                <ConfirmBadge label="registration number" className="ml-2" />
              )}
            </p>
          </li>
        ))}
    </ul>
  );
}
