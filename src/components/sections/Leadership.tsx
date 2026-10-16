import Image from "next/image";
import { Linkedin, Phone } from "lucide-react";
import { ConfirmBadge } from "@/components/Confirm";
import { leadership, type Leader } from "@/content/company";
import { isSet, telHref } from "@/config/site";

export function Leadership({ children }: { children?: React.ReactNode }) {
  return (
    <section
      aria-labelledby="leadership-heading"
      className="bg-paper py-16 md:pb-[90px] md:pt-20"
    >
      <div className="container">
        <div className="mx-auto max-w-[1054px]">
          <div className="max-w-[520px]">
            <h2
              id="leadership-heading"
              className="text-[36px] font-medium leading-[1.1] tracking-[-0.035em] text-ink md:text-[44px]"
            >
              Leadership
            </h2>
            <p className="mt-4 text-[16px] leading-[1.6] text-ink-muted md:text-[17px]">
              The people responsible for Evergreen&rsquo;s operations,
              compliance and client relationships.
            </p>
          </div>
          <ul className="mx-auto mt-10 grid justify-items-center gap-x-8 gap-y-12 sm:grid-cols-2 md:mt-12 lg:grid-cols-4">
            {leadership.map(l => (
              <LeaderProfile key={l.id} leader={l} />
            ))}
          </ul>
          {children}
        </div>
      </div>
    </section>
  );
}

function LeaderProfile({ leader: l }: { leader: Leader }) {
  const hasBio = isSet(l.bio);
  return (
    <li
      id={l.id}
      className="group flex w-full min-w-0 max-w-[340px] scroll-mt-24 flex-col"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-[4px] bg-paper-2">
        {l.portrait ? (
          <Image
            src={l.portrait.src}
            alt={l.portrait.alt}
            width={l.portrait.src.width}
            height={l.portrait.src.height}
            sizes="(min-width: 1024px) 240px, (min-width: 640px) 340px, calc(100vw - 40px)"
            placeholder="blur"
            loading="lazy"
            className="h-full w-full object-cover object-top transition-transform duration-700 ease-out md:motion-safe:group-hover:scale-[1.015] motion-reduce:transition-none"
          />
        ) : (
          <div
            className="flex h-full items-center justify-center bg-evergreen-950 text-4xl font-semibold tracking-[-0.04em] text-white"
            aria-hidden="true"
          >
            {l.name
              .split(" ")
              .map(part => part[0])
              .slice(0, 2)
              .join("")}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col pt-4 text-center">
        <div className="flex items-baseline justify-center gap-4 border-b border-line pb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-evergreen-700">
          <p>{l.role}</p>
        </div>
        <h3 className="mt-2 font-display text-[25px] font-medium leading-tight tracking-[-0.025em] text-ink lg:text-[25px]">
          {l.honorific} {l.name}
        </h3>
        {hasBio ? (
          <p className="mt-3 max-w-[460px] text-[16px] leading-[1.6] text-ink-muted">
            {l.bio}
          </p>
        ) : (
          <ConfirmBadge
            label={`bio for ${l.name} (src/content/company.ts)`}
            className="mt-3 self-center"
          />
        )}
        <p className="mt-4 text-[12px] font-medium leading-relaxed text-evergreen-700">
          {l.founder
            ? "Leadership · Strategy · Operations"
            : "Operations · Compliance · Client Relations"}
        </p>
        {(l.phone || l.linkedin) && (
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4">
            {l.phone && (
              <a
                href={telHref(l.phone)}
                className="inline-flex min-h-11 items-center gap-2 text-[15px] tabular-nums text-evergreen-700 hover:underline"
              >
                <Phone aria-hidden="true" className="h-4 w-4" />
                {l.phone}
              </a>
            )}
            {l.linkedin && (
              <a
                href={l.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${l.name} on LinkedIn`}
                className="inline-flex min-h-11 min-w-11 items-center justify-center text-evergreen-700 hover:text-evergreen-950"
              >
                <Linkedin aria-hidden="true" className="h-5 w-5" />
              </a>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
