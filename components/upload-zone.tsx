'use client'

import { useCallback, useRef, useState } from 'react'

interface UploadZoneProps {
  onFileSelect: (file: File) => void
  isLoading: boolean
}

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

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
        setValidationError('Файл занадто великий. Максимальний розмір — 10 МБ.')
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

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      // Only clear drag state when leaving the zone itself, not child elements
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setIsDragging(false)
      }
    },
    []
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
      // Reset input so the same file can be re-selected
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
        className={[
          'flex flex-col items-center justify-center gap-4',
          'rounded-xl border-2 border-dashed px-8 py-20',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          isDragging
            ? 'border-slate-400 bg-slate-100'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
          isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        ].join(' ')}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-lg text-slate-600">
            Перетягніть PDF-файл сюди
          </p>
          <p className="text-sm text-slate-400">або натисніть для вибору</p>
        </div>
        <p className="text-xs text-slate-300">Максимальний розмір: 10 МБ</p>
      </div>

      {validationError && (
        <p className="mt-3 text-sm text-red-600">{validationError}</p>
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
