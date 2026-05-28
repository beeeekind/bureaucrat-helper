'use client'

import { useCallback, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface UploadZoneProps {
  onFileSelect: (file: File) => void
  isLoading: boolean
}

const MAX_SIZE_BYTES = 10 * 1024 * 1024

export function UploadZone({ onFileSelect, isLoading }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      if (file.type !== 'application/pdf') {
        setValidationError('Підтримуються лише PDF-файли.')
        return
      }
      if (file.size > MAX_SIZE_BYTES) {
        setValidationError('Файл занадто великий. Максимум - 10 МБ.')
        return
      }
      setValidationError(null)
      onFileSelect(file)
    },
    [onFileSelect]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
      e.target.value = ''
    },
    [handleFile]
  )

  const handleClick = useCallback(() => {
    if (!isLoading) inputRef.current?.click()
  }, [isLoading])

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Завантажити PDF-файл"
        onClick={handleClick}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'group relative flex min-h-[260px] flex-col items-center justify-center gap-5',
          'rounded-2xl border border-dashed transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2',
          isDragging
            ? 'border-stone-400 bg-stone-100 dark:border-stone-500 dark:bg-stone-800/30'
            : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50 dark:border-stone-800 dark:hover:border-stone-700 dark:hover:bg-stone-900/40',
          isLoading ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-200',
            'bg-stone-100 dark:bg-stone-800',
            !isLoading && 'group-hover:scale-110'
          )}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            className="text-stone-500 dark:text-stone-400"
          >
            <path
              d="M9 12V3M9 3L5.5 6.5M9 3L12.5 6.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 13V15C2 15.5523 2.44772 16 3 16H15C15.5523 16 16 15.5523 16 15V13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Text */}
        <div className="text-center">
          <p className="text-sm font-medium text-stone-600 dark:text-stone-300">
            Перетягніть PDF сюди
          </p>
          <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
            або{' '}
            <span className="underline underline-offset-2">оберіть файл</span>
          </p>
        </div>

        <p className="text-xs text-stone-300 dark:text-stone-600">до 10 МБ</p>
      </div>

      {validationError && (
        <p className="mt-3 text-sm text-red-500 dark:text-red-400">{validationError}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleInputChange}
        disabled={isLoading}
        aria-hidden="true"
      />
    </div>
  )
}
