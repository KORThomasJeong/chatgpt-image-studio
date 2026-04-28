import React, { useRef } from 'react'
import { motion } from 'framer-motion'

interface PromptComposerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
  className?: string
}

const PRESETS = [
  'A serene mountain landscape at golden hour',
  'Futuristic cityscape at night with neon lights',
  'Cute cartoon character in a magical forest',
  'Abstract fluid art with vibrant colors',
  'Cozy coffee shop interior with warm lighting',
  'Underwater world with bioluminescent creatures',
  'Ancient temple ruins overgrown with jungle vines',
  'Minimalist geometric art in pastel tones',
]

export default function PromptComposer({
  value,
  onChange,
  placeholder = 'Describe the image you want to create...',
  maxLength = 4000,
  className = '',
}: PromptComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= maxLength) {
      onChange(e.target.value)
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text')
    const combined = value + text
    if (combined.length <= maxLength) {
      e.preventDefault()
      onChange(combined)
    }
  }

  const handlePreset = (preset: string) => {
    onChange(preset)
    textareaRef.current?.focus()
  }

  const charCount = value.length
  const isNearLimit = charCount > maxLength * 0.85
  const isAtLimit = charCount >= maxLength

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onPaste={handlePaste}
          placeholder={placeholder}
          rows={5}
          style={{
            width: '100%',
            resize: 'vertical',
            background: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            border: '1.5px solid var(--color-border)',
            borderRadius: '12px',
            padding: '14px 16px 36px 16px',
            fontSize: '15px',
            lineHeight: '1.6',
            outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            fontFamily: 'inherit',
            minHeight: '120px',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--color-primary)'
            e.target.style.boxShadow = '0 0 0 3px var(--color-primary-alpha, rgba(99,102,241,0.15))'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--color-border)'
            e.target.style.boxShadow = 'none'
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '12px',
            fontSize: '12px',
            color: isAtLimit
              ? 'var(--color-error, #ef4444)'
              : isNearLimit
              ? 'var(--color-warning, #f59e0b)'
              : 'var(--color-text-tertiary)',
            fontVariantNumeric: 'tabular-nums',
            transition: 'color 0.2s',
          }}
        >
          {charCount.toLocaleString()} / {maxLength.toLocaleString()}
        </div>
      </div>

      <div>
        <p
          style={{
            fontSize: '12px',
            color: 'var(--color-text-tertiary)',
            marginBottom: '8px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Quick Prompts
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <motion.button
              key={preset}
              onClick={() => handlePreset(preset)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: '5px 12px',
                borderRadius: '999px',
                fontSize: '12px',
                border: '1px solid var(--color-border)',
                background:
                  value === preset
                    ? 'var(--color-primary)'
                    : 'var(--color-surface-raised)',
                color:
                  value === preset
                    ? '#ffffff'
                    : 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '220px',
              }}
              title={preset}
            >
              {preset.length > 35 ? preset.slice(0, 35) + '…' : preset}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}
