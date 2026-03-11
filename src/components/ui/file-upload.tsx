'use client';

import React from 'react';
import {
  formatBytes,
  useFileUpload,
} from '@/hooks/use-file-upload';
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from '@/components/ui/alert';
import { KeenIcon } from '@/components/keenicons';
import {
  FileArchiveIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  HeadphonesIcon,
  ImageIcon,
  TriangleAlert,
  UploadIcon,
  VideoIcon,
  XIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FileUploadProps {
  maxFiles?: number;
  maxSize?: number;
  accept?: string;
  multiple?: boolean;
  className?: string;
  onFilesChange?: (files: File[]) => void;
  initialFiles?: any[];
  showFileList?: boolean;
  compress?: boolean;
  compressionOptions?: {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    useWebWorker?: boolean;
  };
}

export function FileUpload({
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB
  accept = '*',
  multiple = true,
  className,
  onFilesChange,
  showFileList = true,
  compress = false,
  compressionOptions,
}: FileUploadProps) {
  const [
    { isDragging, errors, files },
    {
      removeFile,
      clearFiles,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      getInputProps,
    },
  ] = useFileUpload({
    maxFiles,
    maxSize,
    accept,
    multiple,
    compress,
    compressionOptions,
    onFilesChange: (newFiles) => {
      // Extract the actual File objects
      const actualFiles = newFiles
        .map((f) => f.file)
        .filter((f) => f instanceof File) as File[];
      onFilesChange?.(actualFiles);
    },
  });

  const getFileIcon = (file: File | any) => {
    const type = file.type || '';
    if (type.startsWith('image/')) return <ImageIcon className="size-4" />;
    if (type.startsWith('video/')) return <VideoIcon className="size-4" />;
    if (type.startsWith('audio/')) return <HeadphonesIcon className="size-4" />;
    if (type.includes('pdf')) return <FileTextIcon className="size-4" />;
    if (type.includes('word') || type.includes('doc')) return <FileTextIcon className="size-4" />;
    if (type.includes('excel') || type.includes('sheet')) return <FileSpreadsheetIcon className="size-4" />;
    if (type.includes('zip') || type.includes('rar')) return <FileArchiveIcon className="size-4" />;
    return <FileTextIcon className="size-4" />;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* File List (Moved Above) */}
      {showFileList && files.length > 0 && (
        <div className="space-y-2 mb-4 animate-fade-in">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
              <KeenIcon icon="files" className="text-xs" />
              New Files ({files.length})
            </h4>
            <button
              type="button"
              onClick={clearFiles}
              className="text-[10px] font-bold text-danger uppercase hover:underline"
            >
              Clear all
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {files.map((fileItem) => (
              <div
                key={fileItem.id}
                className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl shadow-sm group relative"
              >
                <div className="size-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary flex-shrink-0">
                  {fileItem.preview && fileItem.file.type.startsWith('image/') ? (
                    <img
                      src={fileItem.preview}
                      alt={fileItem.file.name}
                      className="size-full rounded-lg object-cover"
                    />
                  ) : (
                    getFileIcon(fileItem.file)
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-900 truncate">
                    {fileItem.file.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase font-black">
                    {formatBytes(fileItem.file.size)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(fileItem.id);
                  }}
                  className="size-7 flex items-center justify-center rounded-lg hover:bg-danger/5 text-gray-300 hover:text-danger transition-colors"
                >
                  <XIcon className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={cn(
          'relative rounded-2xl border-2 border-dashed py-2 px-4 text-center transition-all group cursor-pointer',
          isDragging 
            ? 'border-primary bg-primary/[0.02]' 
            : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-300',
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input {...getInputProps()} className="sr-only" />

        <div className="flex flex-col items-center gap-2">
          <div
            className={cn(
              'size-10 rounded-full bg-white flex items-center justify-center border border-gray-100 shadow-sm group-hover:scale-110 transition-transform',
              isDragging && 'scale-110 border-primary/20',
            )}
          >
            <UploadIcon className={cn('size-5', isDragging ? 'text-primary' : 'text-gray-400')} />
          </div>

          <div className="space-y-0.5">
            <h3 className="text-xs font-bold text-gray-900">
              {isDragging ? 'Drop here' : 'Click or drag to upload'}
            </h3>
            <p className="text-[10px] text-muted-foreground">
              Images, PDFs up to {formatBytes(maxSize)}
            </p>
          </div>
        </div>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <Alert variant="destructive" appearance="light" className="rounded-xl">
          <AlertIcon>
            <TriangleAlert className="size-4" />
          </AlertIcon>
          <AlertContent>
            <AlertTitle className="text-xs font-bold">Upload Error</AlertTitle>
            <AlertDescription className="text-[10px]">
              {errors.map((error, index) => (
                <p key={index}>{error}</p>
              ))}
            </AlertDescription>
          </AlertContent>
        </Alert>
      )}
    </div>
  );
}
