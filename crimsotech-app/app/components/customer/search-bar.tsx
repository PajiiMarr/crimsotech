"use client"

import { useState } from "react"
import { Input } from "~/components/ui/input"
import { Button } from "~/components/ui/button"
import { Slider } from "~/components/ui/slider"
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover"
import { Search, ArrowUp, ArrowDown } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"

export default function SearchForm() {
  const [formData, setFormData] = useState({
    search: "",
    alphabetical: "az" as "az" | "za",
    priceRange: [0, 1000],
    condition: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePriceChange = (value: number[]) => {
    setFormData((prev) => ({ ...prev, priceRange: value }))
  }

  const toggleAlphabetical = () => {
    setFormData((prev) => ({
      ...prev,
      alphabetical: prev.alphabetical === "az" ? "za" : "az",
    }))
  }

  const handleReset = () => {
    setFormData({
      search: "",
      alphabetical: "az",
      priceRange: [0, 1000],
      condition: "",
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Search data:", formData)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white p-4"
    >
      {/* Search input */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          name="search"
          placeholder="Search products..."
          value={formData.search}
          onChange={handleChange}
          className="pl-9"
        />
      </div>

      {/* Alphabetical toggle (icon only) */}
      <div className="flex flex-col min-w-[40px]">
        <Button
          variant="outline"
          className="w-full flex items-center justify-center"
          onClick={toggleAlphabetical}
          title={`Sort ${formData.alphabetical === "az" ? "A–Z" : "Z–A"}`}
        >
          {formData.alphabetical === "az" ? (
            <ArrowUp className="w-4 h-4" />
          ) : (
            <ArrowDown className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Condition filter */}
      <div className="flex flex-col min-w-[150px]">
        <Select
          onValueChange={(value) => handleSelectChange("condition", value)}
          value={formData.condition}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="used">Used</SelectItem>
            <SelectItem value="refurbished">Refurbished</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Price Range Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[240px] justify-between">
            ₱{formData.priceRange[0]} - ₱{formData.priceRange[1]}
          </Button>
        </PopoverTrigger>
        <PopoverContent side="bottom" className="w-64 p-4">
          <div className="flex justify-between text-xs text-gray-600 mb-2">
            <span>Min: ₱{formData.priceRange[0]}</span>
            <span>Max: ₱{formData.priceRange[1]}</span>
          </div>
          <Slider
            value={formData.priceRange}
            onValueChange={handlePriceChange}
            min={0}
            max={5000}
            step={50}
            className="w-full"
          />
        </PopoverContent>
      </Popover>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button type="submit" variant="default">
          Search
        </Button>
        <Button type="button" variant="outline" onClick={handleReset}>
          Reset
        </Button>
      </div>
    </form>
  )
}
