import { useId } from "react";
import type { ReactNode } from "react";

type FieldProps = {
  children: (ids: {
    descriptionId?: string;
    errorId?: string;
    inputId: string;
  }) => ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  id?: string;
  label: ReactNode;
  required?: boolean;
};

export function Field({
  children,
  description,
  error,
  id,
  label,
  required,
}: FieldProps) {
  const generatedId = useId();
  const inputId = id ?? `factory-field-${generatedId.replace(/:/g, "")}`;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="factory-field">
      <label className="factory-field__label" htmlFor={inputId}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children({ descriptionId, errorId, inputId })}
      {description ? (
        <div className="factory-field__description" id={descriptionId}>
          {description}
        </div>
      ) : null}
      {error ? (
        <div className="factory-field__error" id={errorId}>
          {error}
        </div>
      ) : null}
    </div>
  );
}
