import Button from "./Button";

export default function EmptyState({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="centerBox">
      <b>{title}</b>
      {subtitle ? <div style={{ marginBottom: 12 }}>{subtitle}</div> : null}
      {actionLabel && onAction ? <Button onClick={onAction}>{actionLabel}</Button> : null}
    </div>
  );
}
