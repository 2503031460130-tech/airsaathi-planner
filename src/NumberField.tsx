export type NumberFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

export function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: NumberFieldProps) {
  const invalid = !Number.isFinite(value) || value < min || value > max;
  return (
    <label className="air-field">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step={1}
        value={Number.isFinite(value) ? value : ""}
        aria-invalid={invalid}
        aria-describedby={invalid ? "plan-error" : undefined}
        onChange={(e) =>
          onChange(e.target.value === "" ? NaN : Number(e.target.value))
        }
      />
    </label>
  );
}
