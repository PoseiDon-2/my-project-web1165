"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown } from "lucide-react"

type ComboboxProps = {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function Combobox({ options, value, onChange, placeholder, disabled }: ComboboxProps) {
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const filteredOptions =
    query === ""
      ? options
      : options.filter((option) =>
          option.label.toLowerCase().includes(query.toLowerCase())
        )

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          className={`w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 ${
            disabled ? "bg-gray-100 cursor-not-allowed" : ""
          }`}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
        />
        <button
          type="button"
          className="absolute right-0 top-0 h-full px-3 flex items-center"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </button>
      </div>
      {isOpen && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
          {filteredOptions.length === 0 ? (
            <li className="relative cursor-default select-none py-2 px-4 text-gray-700">
              ไม่พบองค์กร
            </li>
          ) : (
            filteredOptions.map((option) => (
              <li
                key={option.value}
                className={`relative cursor-pointer select-none py-2 px-4 ${
                  value === option.value ? "bg-pink-100 text-pink-900" : "text-gray-900 hover:bg-pink-100 hover:text-pink-900"
                }`}
                onClick={() => {
                  onChange(option.value)
                  setQuery("")
                  setIsOpen(false)
                }}
              >
                {option.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}