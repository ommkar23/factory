import type { ReactNode, SelectHTMLAttributes } from "react";
import { Field } from "./field";

export type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "id"
> & {
  children: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  id?: string;
  label: ReactNode;
  placeholder?: string;
};

export function Select({
  children,
  className,
  description,
  error,
  id,
  label,
  placeholder,
  required,
  ...props
}: SelectProps) {
  return (
    <Field
      description={description}
      error={error}
      id={id}
      label={label}
      required={required}
    >
      {({ descriptionId, errorId, inputId }) => (
        <select
          {...props}
          aria-describedby={
            [descriptionId, errorId].filter(Boolean).join(" ") || undefined
          }
          aria-invalid={error ? true : undefined}
          className={["factory-select", className].filter(Boolean).join(" ")}
          id={inputId}
          required={required}
        >
          {placeholder ? (
            <option disabled value="">
              {placeholder}
            </option>
          ) : null}
          {children}
        </select>
      )}
    </Field>
  );
}
