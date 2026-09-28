import { memo } from 'react';

/** Reusable button component */
export const Button = memo(function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className = '',
  ...props
}) {
  const classes = [
    'btn',
    `btn-${variant}`,
    fullWidth ? 'btn-full' : '',
    size === 'sm' ? 'btn-sm' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={classes} disabled={loading || props.disabled} {...props}>
      {loading && (
        <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} aria-hidden />
      )}
      {children}
    </button>
  );
});

/** Spinner / Loader */
export const Loader = memo(function Loader({ size = 18, className = '' }) {
  return (
    <div
      className={`spinner ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
});
