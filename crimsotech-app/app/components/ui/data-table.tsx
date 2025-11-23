// components/ui/data-table.tsx
import React from 'react'
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { Settings2, ChevronDown, ArrowUpDown } from "lucide-react"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchConfig?: {
    column: string
    placeholder: string
  }
  filterConfig?: {
    [key: string]: {
      options: string[]
      placeholder: string
    }
  }
  defaultSorting?: SortingState
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchConfig,
  filterConfig,
  defaultSorting = [],
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>(defaultSorting)
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  })

  // Get unique values for filter options from data
  const getFilterOptions = (columnId: string): string[] => {
    const uniqueValues = new Set<string>()
    data.forEach(item => {
      const value = (item as any)[columnId]
      if (value !== undefined && value !== null) {
        uniqueValues.add(String(value))
      }
    })
    return Array.from(uniqueValues).sort()
  }

  return (
    <div className="w-full">
      {/* Filters and Controls */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Global Search */}
          {searchConfig && (
            <Input
              placeholder={searchConfig.placeholder}
              value={(table.getColumn(searchConfig.column)?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn(searchConfig.column)?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
            />
          )}

          {/* Dynamic Filters from filterConfig */}
          {filterConfig && Object.entries(filterConfig).map(([columnId, config]) => {
            const column = table.getColumn(columnId)
            if (!column) return null

            const options = config.options.length > 0 ? config.options : getFilterOptions(columnId)
            
            return (
              <Select
                key={columnId}
                value={(column.getFilterValue() as string) ?? "all"}
                onValueChange={(value) => {
                  if (value === "all") {
                    column.setFilterValue(undefined)
                  } else {
                    column.setFilterValue(value)
                  }
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={config.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All {config.placeholder}</SelectItem>
                  {options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          })}

          {/* Stock Status Filter (Special case for quantity) */}
          {/* {table.getColumn("quantity") && (
            <Select
              value={(table.getColumn("quantity")?.getFilterValue() as string) ?? "all"}
              onValueChange={(value) => {
                if (value === "all") {
                  table.getColumn("quantity")?.setFilterValue(undefined)
                } else {
                  table.getColumn("quantity")?.setFilterValue(value)
                }
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Stock status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
              </SelectContent>
            </Select>
          )} */}
        </div>

        {/* Column Visibility */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              <Settings2 className="mr-2 h-4 w-4" />
              Columns
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id === "actions" ? "Actions" : 
                     column.id === "boostPlan" ? "Boost Plan" :
                     column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active Filters Summary */}
      {columnFilters.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {columnFilters.map((filter, index) => (
            <div key={index} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs">
              <span className="font-medium">{filter.id}:</span>
              <span>
                {Array.isArray(filter.value)
                  ? (filter.value as any[]).join(", ")
                  : String(filter.value ?? "")}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-primary/20"
                onClick={() => {
                  const newFilters = columnFilters.filter((_, i) => i !== index)
                  setColumnFilters(newFilters)
                }}
              >
                ×
              </Button>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => setColumnFilters([])}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-muted-foreground mb-4">
        Showing {table.getFilteredRowModel().rows.length} of{" "}
        {data.length} item(s)
        {table.getFilteredRowModel().rows.length !== data.length && " (filtered)"}
      </div>

      {/* Table */}
      <div className="rounded-md">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}