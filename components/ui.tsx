'use client';

import { useEffect } from 'react';
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react';

type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export function Button({
  className,
  variant = 'solid',
  size = 'md',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={cx('ui-button', `ui-button--${variant}`, `ui-button--${size}`, className)}
      {...props}
    />
  );
}

export function Panel({
  className,
  as,
  ...props
}: HTMLAttributes<HTMLElement> & { as?: 'section' | 'article' | 'div' }) {
  const Tag = (as ?? 'section') as 'section' | 'article' | 'div';

  return <Tag className={cx('panel', className)} {...props} />;
}

export function Badge({
  children,
  className,
  tone = 'neutral',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'neutral' | 'pro' | 'con' | 'warn' | 'success' | 'hot';
}) {
  return <span className={cx('badge', `badge--${tone}`, className)}>{children}</span>;
}

export function TextField({
  label,
  hint,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}) {
  return (
    <label className={cx('field', className)}>
      <span className="field__label">{label}</span>
      <input className={cx('field__control', error ? 'field__control--error' : false)} {...props} />
      {hint ? <span className="field__hint">{hint}</span> : null}
      {error ? <span className="field__error">{error}</span> : null}
    </label>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}) {
  return (
    <label className={cx('field', className)}>
      <span className="field__label">{label}</span>
      <textarea
        className={cx(
          'field__control',
          'field__control--textarea',
          error ? 'field__control--error' : false,
        )}
        {...props}
      />
      {hint ? <span className="field__hint">{hint}</span> : null}
      {error ? <span className="field__error">{error}</span> : null}
    </label>
  );
}

export function Dialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = '取消',
  tone = 'neutral',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'neutral' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onCancel, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="dialog" role="presentation" onMouseDown={onCancel}>
      <div
        className="dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dialog__icon" aria-hidden="true">
          !
        </div>
        <h2 className="dialog__title" id="dialog-title">
          {title}
        </h2>
        <p className="dialog__description" id="dialog-description">
          {description}
        </p>
        <div className="dialog__actions">
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'solid'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
