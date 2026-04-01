import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
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
        "inline-flex cursor-pointer items-center justify-center rounded-lg border border-white/30 bg-white/18 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/24 active:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

type SecondaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function SecondaryButton({
  className,
  type = "button",
  ...props
}: SecondaryButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex cursor-pointer items-center justify-center rounded-lg border border-white/25 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/12 active:bg-white/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 disabled:cursor-not-allowed disabled:opacity-60",
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
        <label className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          {label}
        </label>
      ) : null}
      <input
        {...props}
        className={cx(
          "rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-zinc-400 outline-none transition-all focus:border-white/50 focus:ring-2 focus:ring-white/20",
          className,
        )}
      />
    </div>
  );
}
