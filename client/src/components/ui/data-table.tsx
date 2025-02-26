import React, { useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "./table";
import { Input } from "./input";
import { Button } from "./button";
import { ChevronUp, ChevronDown } from "lucide-react";

interface DataTableProps<T> {
  data: T[];
  columns: {
    key: string;
    header: string;
    render?: (item: T) => React.ReactNode;
  }[];
  searchable?: boolean;
  searchField?: string;
  searchFunction?: (item: T, searchTerm: string) => boolean;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchable = true,
  searchField,
  searchFunction,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction:
        current?.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const filteredData = data.filter((item) => {
    if (!searchTerm) return true;

    if (searchFunction) {
      return searchFunction(item, searchTerm);
    }

    if (searchField) {
      const value = item[searchField];
      return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
    }

    return columns.some((column) => {
      const value = column.render ? column.render(item) : item[column.key];
      if (!value) return false;

      // Fix the TypeScript error by properly type checking React elements
      if (React.isValidElement(value)) {
        const children = value.props.children;
        return typeof children === 'string' ? 
          children.toLowerCase().includes(searchTerm.toLowerCase()) : false;
      }

      return value.toString().toLowerCase().includes(searchTerm.toLowerCase());
    });
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0;

    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];

    if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <div>
      {searchable && (
        <div className="mb-4 relative z-10">
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
          />
        </div>
      )}
      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort(column.key)}
                    className="flex items-center gap-1"
                  >
                    {column.header}
                    {sortConfig?.key === column.key && (
                      sortConfig.direction === "asc" ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )
                    )}
                  </Button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((item, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    {column.render
                      ? column.render(item)
                      : item[column.key]?.toString()}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}