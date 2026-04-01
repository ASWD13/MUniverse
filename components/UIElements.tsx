import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";

function cx(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function PrimaryButton({
  className,
  type = "button",
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "rounded-xl bg-rose-600 px-6 py-2 font-bold text-white transition-all hover:bg-rose-700 active:scale-95",
        className,
      )}
      {...props}
    />
  );
}

type FormInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export function FormInput({ label, className, ...props }: FormInputProps) {
  return (
    <div className="flex w-full flex-col space-y-1">
      {label ? (
        <label className="text-xs font-bold uppercase text-slate-500">{label}</label>
      ) : null}
      <input
        {...props}
        className={cx(
          "rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition-all focus:ring-2 focus:ring-rose-500",
          className,
        )}
      />
    </div>
  );
}

type CardTone = "rose" | "blue" | "slate";

const titleTone: Record<CardTone, string> = {
  rose: "text-rose-600",
  blue: "text-blue-600",
  slate: "text-slate-800",
};

type DashboardCardProps = {
  title: string;
  children: ReactNode;
  tone?: CardTone;
};

export function DashboardCard({
  title,
  children,
  tone = "rose",
}: DashboardCardProps) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <h3
        className={cx(
          "mb-4 text-sm font-bold uppercase tracking-widest",
          titleTone[tone],
        )}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}
