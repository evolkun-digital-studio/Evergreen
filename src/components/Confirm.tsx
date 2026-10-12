import { isSet } from "@/config/site";

/**
 * Internal verification notes never render on the public site, including local previews.
 * Keep the props so source-level review notes remain available to maintainers.
 */
export const ConfirmBadge: (props: {
  label?: string;
  className?: string;
}) => null = () => null;

/**
 * Renders confirmed values only; missing values never expose placeholder syntax.
 */
export function Confirm({
  value,
  label,
  children,
  className,
}: {
  value: string | undefined | null;
  label: string;
  children?: (value: string) => React.ReactNode;
  className?: string;
}) {
  if (isSet(value)) return <>{children ? children(value) : value}</>;
  return <ConfirmBadge label={label} className={className} />;
}
