"use client";

import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import {
  FileText,
  Image,
  Music,
  Video,
  Archive,
  Star,
  CheckSquare,
  Square,
} from 'lucide-react';
import FileActionMenu from './FileActionMenu';

export interface FileItem {
  id: string;
  name: string;
  type: "file";
  fileType: "document" | "image" | "audio" | "video" | "archive";
  size: string;
  modified: string;
  starred?: boolean;
  thumbnailUrl?: string;
}

interface FileTableProps {
  files: FileItem[];
  selectedFiles: Set<string>;
  onFileSelect: (fileId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDownload: (fileId: string) => void;
  onDelete: (fileId: string) => void;
  onStar: (fileId: string, starred: boolean) => void;
  onRename: (fileId: string, newName: string) => void;
  onShare: (fileId: string) => void;
}

const columnHelper = createColumnHelper<FileItem>();

const getFileIcon = (fileType: string) => {
  switch (fileType) {
    case "image":
      return Image;
    case "audio":
      return Music;
    case "video":
      return Video;
    case "archive":
      return Archive;
    default:
      return FileText;
  }
};

export default function FileTable({
  files,
  selectedFiles,
  onFileSelect,
  onSelectAll,
  onClearSelection,
  onDownload,
  onDelete,
  onStar,
  onRename,
  onShare,
}: FileTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        header: () => (
          <div className="flex items-center">
            <button
              onClick={() => {
                const isAllSelected = selectedFiles.size === files.length && files.length > 0;
                if (isAllSelected) {
                  onClearSelection();
                } else {
                  onSelectAll();
                }
              }}
              className="text-gray-400 hover:text-blue-600 transition-colors"
            >
              {selectedFiles.size === files.length && files.length > 0 ? (
                <CheckSquare className="h-4 w-4 text-blue-600" />
              ) : (
                <Square className="h-4 w-4" />
              )}
            </button>
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFileSelect(row.original.id);
              }}
              className="text-gray-400 hover:text-blue-600 transition-colors"
            >
              {selectedFiles.has(row.original.id) ? (
                <CheckSquare className="h-4 w-4 text-blue-600" />
              ) : (
                <Square className="h-4 w-4" />
              )}
            </button>
          </div>
        ),
        size: 50,
        enableSorting: false,
      }),
      columnHelper.accessor('name', {
        header: 'Name',
        cell: ({ row }) => {
          const file = row.original;
          const FileIcon = getFileIcon(file.fileType);
          
          return (
            <div className="flex items-center gap-3">
              {file.fileType === "video" && file.thumbnailUrl ? (
                <div className="relative flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={file.thumbnailUrl}
                    alt={`${file.name} thumbnail`}
                    className="h-8 w-8 object-cover rounded"
                    onError={(e) => {
                      console.log('Thumbnail failed to load:', file.thumbnailUrl);
                      // Replace with video icon
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.parentElement?.querySelector('.fallback-icon');
                      if (fallback) {
                        (fallback as HTMLElement).style.display = 'flex';
                      }
                    }}
                  />
                  <div className="fallback-icon absolute inset-0 hidden items-center justify-center bg-gray-100 rounded">
                    <Video className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded">
                    <Video className="h-2 w-2 text-white" />
                  </div>
                </div>
              ) : (
                <FileIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.name}
                </p>
              </div>
              {file.starred && (
                <Star className="h-3 w-3 text-yellow-500 fill-current flex-shrink-0" />
              )}
            </div>
          );
        },
        size: 300,
      }),
      columnHelper.accessor('fileType', {
        header: 'Type',
        cell: ({ getValue }) => (
          <span className="text-sm text-gray-500 capitalize">
            {getValue()}
          </span>
        ),
        size: 120,
      }),
      columnHelper.accessor('size', {
        header: 'Size',
        cell: ({ getValue }) => (
          <span className="text-sm text-gray-500">
            {getValue()}
          </span>
        ),
        size: 100,
      }),
      columnHelper.accessor('modified', {
        header: 'Modified',
        cell: ({ getValue }) => (
          <span className="text-sm text-gray-500">
            {getValue()}
          </span>
        ),
        size: 120,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex justify-end">
            <FileActionMenu
              file={row.original}
              onDownload={onDownload}
              onDelete={onDelete}
              onStar={onStar}
              onRename={onRename}
              onShare={onShare}
            />
          </div>
        ),
        size: 80,
        enableSorting: false,
      }),
    ],
    [files.length, selectedFiles, onFileSelect, onSelectAll, onClearSelection, onDownload, onDelete, onStar, onRename, onShare]
  );

  const table = useReactTable({
    data: files,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No files yet</h3>
        <p className="text-gray-500 mb-4">
          Upload files to this folder to get started
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={
                          header.column.getCanSort()
                            ? 'cursor-pointer select-none flex items-center gap-2 hover:text-gray-700'
                            : ''
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getCanSort() && (
                          <span className="text-gray-400">
                            {{
                              asc: '↑',
                              desc: '↓',
                            }[header.column.getIsSorted() as string] ?? '↕'}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-gray-50 transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-3 whitespace-nowrap"
                    style={{ width: cell.column.getSize() }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
