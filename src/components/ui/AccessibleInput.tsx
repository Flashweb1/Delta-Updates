import { InputHTMLAttributes, ReactNode, useState } from 'react'
import { generateId } from '../../utils/accessibility'

interface AccessibleInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode
  error?: string
  helper?: string
  isRequired?: boolean
  isInvalid?: boolean
  ariaDescribedBy?: string
  iconLeft?: ReactNode
  iconRight?: ReactNode
}

/**
 * AccessibleInput - WCAG 2.1 AA compliant input component
 * Features:
 * - Proper label association
 * - Error messaging with aria-invalid
 * - Helper text
 * - Required field indication
 * - Focus management
 * - Touch target size (44px minimum)
 */
export function AccessibleInput({
  label,
  error,
  helper,
  isRequired = false,
  isInvalid = !!error,
  ariaDescribedBy,
  iconLeft,
  iconRight,
  id,
  className = '',
  disabled = false,
  ...props
}: AccessibleInputProps) {
  // Generate unique IDs if not provided
  const inputId = id || generateId('input')
  const errorId = generateId(`${inputId}-error`)
  const helperId = generateId(`${inputId}-helper`)

  // Build aria-describedby to include all helper/error text
  const describedByIds = [
    error ? errorId : null,
    helper ? helperId : null,
    ariaDescribedBy,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="form-group">
      {/* Label */}
      <label htmlFor={inputId} className="form-label">
        {label}
        {isRequired && <span aria-label="required">*</span>}
      </label>

      {/* Input wrapper with icons */}
      <div className="input-wrapper" style={{ position: 'relative' }}>
        {iconLeft && (
          <span
            className="input-icon-left"
            aria-hidden="true"
            style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
          >
            {iconLeft}
          </span>
        )}

        <input
          id={inputId}
          className={`input ${iconLeft ? 'pl-10' : ''} ${iconRight ? 'pr-10' : ''} ${className}`}
          disabled={disabled}
          required={isRequired}
          aria-required={isRequired}
          aria-invalid={isInvalid}
          aria-describedby={describedByIds || undefined}
          {...props}
        />

        {iconRight && (
          <span
            className="input-icon-right"
            aria-hidden="true"
            style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
          >
            {iconRight}
          </span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <span id={errorId} className="form-error" role="alert">
          {error}
        </span>
      )}

      {/* Helper text */}
      {helper && !error && (
        <span id={helperId} className="form-helper">
          {helper}
        </span>
      )}
    </div>
  )
}

/**
 * Accessible Textarea Component
 */
interface AccessibleTextareaProps extends InputHTMLAttributes<HTMLTextAreaElement> {
  label: ReactNode
  error?: string
  helper?: string
  isRequired?: boolean
  isInvalid?: boolean
  ariaDescribedBy?: string
  maxLength?: number
  showCharCount?: boolean
}

export function AccessibleTextarea({
  label,
  error,
  helper,
  isRequired = false,
  isInvalid = !!error,
  ariaDescribedBy,
  id,
  className = '',
  disabled = false,
  maxLength,
  showCharCount = false,
  value: controlledValue,
  onChange,
  ...props
}: AccessibleTextareaProps) {
  const textareaId = id || generateId('textarea')
  const errorId = generateId(`${textareaId}-error`)
  const helperId = generateId(`${textareaId}-helper`)
  const charCountId = generateId(`${textareaId}-charcount`)

  const [internalValue, setInternalValue] = useState('')
  const currentValue = controlledValue !== undefined ? String(controlledValue) : internalValue

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInternalValue(e.target.value)
    onChange?.(e)
  }

  const describedByIds = [
    error ? errorId : null,
    helper ? helperId : null,
    showCharCount ? charCountId : null,
    ariaDescribedBy,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="form-group">
      <label htmlFor={textareaId} className="form-label">
        {label}
        {isRequired && <span aria-label="required">*</span>}
      </label>

      <textarea
        id={textareaId}
        className={`textarea ${className}`}
        disabled={disabled}
        required={isRequired}
        aria-required={isRequired}
        aria-invalid={isInvalid}
        aria-describedby={describedByIds || undefined}
        maxLength={maxLength}
        value={controlledValue !== undefined ? controlledValue : undefined}
        onChange={controlledValue !== undefined ? onChange : handleChange}
        {...props}
      />

      {showCharCount && maxLength && (
        <span id={charCountId} className="form-helper" style={{ display: 'block', marginTop: '0.5rem' }}>
          {currentValue.length} / {maxLength} characters
        </span>
      )}

      {/* Error message */}
      {error && (
        <span id={errorId} className="form-error" role="alert">
          {error}
        </span>
      )}

      {/* Helper text */}
      {helper && !error && (
        <span id={helperId} className="form-helper">
          {helper}
        </span>
      )}
    </div>
  )
}

export default AccessibleInput
