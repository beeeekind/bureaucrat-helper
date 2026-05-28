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
  const [isHovering, setIsHovering] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      if (file.type !== 'application/pdf') {
        setValidationError('Тільки PDF.')
        return
      }
      if (file.size > MAX_SIZE_BYTES) {
        setValidationError('Максимум 10 МБ.')
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

  const copy = isDragging
    ? 'Відпустіть — розберемося'
    : isHovering
    ? 'Натисніть або перетягніть PDF'
    : 'Що цей документ від вас хоче?'

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
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className={cn(
          'flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl',
          'border border-dashed transition-all duration-300',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2',
          isDragging
            ? 'border-stone-400 bg-stone-100 dark:border-stone-600 dark:bg-stone-800/40'
            : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50 dark:border-stone-800 dark:hover:border-stone-700 dark:hover:bg-stone-900/30',
          isLoading ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'
        )}
      >
        <p
          className={cn(
            'text-center text-base transition-all duration-300',
            isDragging || isHovering
              ? 'text-stone-600 dark:text-stone-300'
              : 'text-stone-400 dark:text-stone-500'
          )}
        >
          {copy}
        </p>
        {!isDragging && !isHovering && (
          <p className="text-xs text-stone-300 dark:text-stone-700 transition-opacity duration-300">
            до 10 МБ
          </p>
        )}
      </div>

      {validationError && (
        <p className="mt-3 text-center text-sm text-red-500 dark:text-red-400">
          {validationError}
        </p>
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
