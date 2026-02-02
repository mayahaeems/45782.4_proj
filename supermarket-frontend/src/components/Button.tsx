type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

export default function Button({ variant = "primary", className = "", ...rest }: Props) {
  const v = variant === "primary" ? "btn" : variant === "secondary" ? "btn secondary" : "btn danger";
  return <button className={`${v} ${className}`.trim()} {...rest} />;
}
