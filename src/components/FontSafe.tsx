import { splitFranie } from "@/lib/franie";

// Puts characters the trial Franie lacks into Manrope spans (stats, official names, CMS titles).
export function FontSafe({ children }: { children: string }) {
  const runs = splitFranie(children);
  if (runs.every(r => r.supported)) return <>{children}</>;
  return (
    <>
      {runs.map((r, i) =>
        r.supported ? (
          r.text
        ) : (
          <span key={i} className="font-sans">
            {r.text}
          </span>
        ),
      )}
    </>
  );
}
