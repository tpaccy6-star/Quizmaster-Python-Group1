import { toast } from 'sonner@2.0.3';

/**
 * Utility functions for exporting data to CSV and printing
 */

/**
 * Converts an array of data rows to CSV format and triggers download
 * @param csvData Array of arrays representing rows and columns
 * @param filename Name for the downloaded file
 */
export function exportToCSV(csvData: string[][], filename: string) {
  const csvContent = csvData.map(row => 
    row.map(cell => {
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(',')
  ).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
  
  toast.success('Data exported as CSV');
}

/**
 * Triggers the browser's print dialog
 */
export function printPage() {
  window.print();
  toast.success('Print dialog opened');
}

/**
 * Generates a standardized filename with current date
 * @param prefix Prefix for the filename
 * @param extension File extension (default: 'csv')
 */
export function generateFilename(prefix: string, extension: string = 'csv'): string {
  const date = new Date().toISOString().split('T')[0];
  return `${prefix}-${date}.${extension}`;
}

/**
 * Creates a CSV header section with metadata
 * @param title Report title
 * @param metadata Object containing metadata key-value pairs
 */
export function createCSVHeader(title: string, metadata: Record<string, string>): string[][] {
  return [
    [title],
    ...Object.entries(metadata).map(([key, value]) => [key, value]),
    [''], // Empty row for spacing
  ];
}

/**
 * Formats a percentage value
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Formats a date for display
 */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleString();
}
