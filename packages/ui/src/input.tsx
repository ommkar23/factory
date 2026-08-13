import type { InputHTMLAttributes, ReactNode } from "react";
import { Field } from "./field";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  description?: ReactNode;
  error?: ReactNode;
  id?: string;
  label: ReactNode;
};

export function Input({
  className,
  description,
  error,
  id,
  label,
  required,
  ...props
}: InputProps) {
  return (
    <Field
      description={description}
      error={error}
      id={id}
      label={label}
      required={required}
    >
      {({ descriptionId, errorId, inputId }) => (
        <input
          {...props}
          aria-describedby={
            [descriptionId, errorId].filter(Boolean).join(" ") || undefined
          }
          aria-invalid={error ? true : undefined}
          className={["factory-input", className].filter(Boolean).join(" ")}
          id={inputId}
          required={required}
        />
      )}
    </Field>
  );
}
