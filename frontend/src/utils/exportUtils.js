import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Constants
const DEFAULT_FILENAME = 'export';
const MAX_ROWS_PER_SHEET = 1000000; // Excel 2007+ limit
const CHUNK_SIZE = 1000; // Process 1000 rows at a time

// Make sure jspdf-autotable is properly loaded
if (typeof jsPDF.prototype.autoTable !== 'function') {
  console.error('jspdf-autotable is not properly loaded. PDF exports may not work correctly.');
}

/**
 * Export utilities for generating PDF and Excel exports with progress tracking
 */
const ExportUtils = {
  /**
   * Generate a filename with timestamp
   * @param {String} prefix - Prefix for the filename
   * @param {String} extension - File extension (pdf/xlsx/csv)
   * @returns {String} Formatted filename
   */
  generateFilename: (prefix = DEFAULT_FILENAME, extension) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${prefix}_${timestamp}.${extension}`;
  },

  /**
   * Export data to PDF with progress tracking
   * @param {Object} options - Export options
   * @param {Array} options.data - Array of data objects to export
   * @param {String} options.title - Title for the PDF
   * @param {Array} options.columns - Column definitions
   * @param {Function} options.onProgress - Progress callback
   * @param {String} options.filename - Optional filename
   * @returns {Promise<Blob>} PDF blob
   */
  exportToPDF: async ({
    data,
    title,
    columns,
    onProgress = () => {},
    filename = DEFAULT_FILENAME
  }) => {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text(title || 'Export Report', 14, 22);
      
      // Add metadata
      doc.setFontSize(11);
      const generatedText = `Generated: ${new Date().toLocaleString()}`;
      const recordsText = `Total Records: ${data.length}`;
      doc.text(generatedText, 14, 30);
      doc.text(recordsText, 14, 36);

      // Process data in chunks to avoid memory issues
      const chunks = [];
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        chunks.push(data.slice(i, i + CHUNK_SIZE));
      }

      let currentRow = 0;
      
      // Add table
      doc.autoTable({
        startY: 44,
        head: [columns.map(col => col.header)],
        body: data.map(item => columns.map(col => item[col.key])),
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        didDrawPage: () => {
          // Add page numbers
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(10);
          for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.text(
              `Page ${i} of ${pageCount}`,
              doc.internal.pageSize.width - 20,
              doc.internal.pageSize.height - 10
            );
          }
        }
      });

      const pdfBlob = doc.output('blob');
      const generatedFilename = ExportUtils.generateFilename(filename, 'pdf');
      saveAs(pdfBlob, generatedFilename);
      return pdfBlob;
    } catch (error) {
      console.error('PDF export failed:', error);
      throw new Error('Failed to generate PDF export. Please try again.');
    }
  },

  /**
   * Export data to Excel with progress tracking
   * @param {Object} options - Export options
   * @param {Array} options.data - Array of data objects to export
   * @param {String} options.sheetName - Name for the worksheet
   * @param {Array} options.columns - Column definitions
   * @param {Function} options.onProgress - Progress callback
   * @param {String} options.filename - Optional filename
   * @returns {Promise<Blob>} Excel blob
   */
  exportToExcel: async ({
    data,
    sheetName = 'Sheet1',
    columns,
    onProgress = () => {},
    filename = DEFAULT_FILENAME
  }) => {
    try {
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Process data in chunks
      const chunks = [];
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        chunks.push(data.slice(i, i + CHUNK_SIZE));
      }

      let currentRow = 0;
      let currentSheet = 1;
      let currentSheetData = [columns.map(col => col.header)];

      for (const chunk of chunks) {
        // Process each row in the chunk
        for (const item of chunk) {
          const row = columns.map(col => item[col.key]);
          currentSheetData.push(row);
          currentRow++;

          // Create new sheet if we hit the limit
          if (currentSheetData.length >= MAX_ROWS_PER_SHEET) {
            const ws = XLSX.utils.aoa_to_sheet(currentSheetData);
            XLSX.utils.book_append_sheet(wb, ws, `${sheetName}${currentSheet}`);
            currentSheetData = [columns.map(col => col.header)];
            currentSheet++;
          }

          onProgress((currentRow / data.length) * 100);
        }
      }

      // Add remaining data as final sheet
      if (currentSheetData.length > 1) {
        const ws = XLSX.utils.aoa_to_sheet(currentSheetData);
        XLSX.utils.book_append_sheet(wb, ws, `${sheetName}${currentSheet}`);
      }

      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const generatedFilename = ExportUtils.generateFilename(filename, 'xlsx');
      saveAs(blob, generatedFilename);
      return blob;
    } catch (error) {
      console.error('Excel export failed:', error);
      throw new Error('Failed to generate Excel export. Please try again.');
    }
  },

  /**
   * Export data to CSV with progress tracking
   * @param {Object} options - Export options
   * @param {Array} options.data - Array of data objects to export
   * @param {Array} options.columns - Column definitions
   * @param {Function} options.onProgress - Progress callback
   * @param {String} options.filename - Optional filename
   * @returns {Promise<Blob>} CSV blob
   */
  exportToCSV: async ({
    data,
    columns,
    onProgress = () => {},
    filename = DEFAULT_FILENAME
  }) => {
    try {
      const chunks = [];
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        chunks.push(data.slice(i, i + CHUNK_SIZE));
      }

      // Start with headers
      let csvContent = columns.map(col => `"${col.header}"`).join(',') + '\n';
      let currentRow = 0;

      // Process each chunk
      for (const chunk of chunks) {
        for (const item of chunk) {
          const row = columns.map(col => {
            const value = item[col.key];
            return `"${value !== undefined ? value : ''}"`;
          }).join(',');
          csvContent += row + '\n';
          currentRow++;
          onProgress((currentRow / data.length) * 100);
        }
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, this.generateFilename(filename, 'csv'));
      return blob;
    } catch (error) {
      console.error('CSV export failed:', error);
      throw new Error('Failed to generate CSV export. Please try again.');
    }
  },

  /**
   * Export test history to PDF
   * @param {Array} tests - Array of test objects
   * @param {String} username - User's name for the header
   */
  exportTestHistoryToPDF: (tests, username = 'User') => {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text('Test History Report', 14, 22);
      
      // Add date and user info
      doc.setFontSize(11);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
      doc.text(`User: ${username}`, 14, 36);
      
      // Create table data
      const tableColumn = ["Test Name", "Subject", "Date", "Score", "Time Taken"];
      const tableRows = [];
      
      tests.forEach(test => {
        const testData = [
          test.name,
          test.subject,
          test.date,
          `${test.score}%`,
          test.timeTaken
        ];
        tableRows.push(testData);
      });
      
      // Add table
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 240, 240] }
      });
      
      // Add summary
      const totalTests = tests.length;
      const averageScore = tests.length > 0 
        ? Math.round(tests.reduce((sum, test) => sum + test.score, 0) / tests.length) 
        : 0;
      
      const finalY = doc.lastAutoTable.finalY || 45;
      doc.setFontSize(11);
      doc.text(`Total Tests: ${totalTests}`, 14, finalY + 15);
      doc.text(`Average Score: ${averageScore}%`, 14, finalY + 22);
      
      // Save the PDF
      doc.save('test-history.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  },
  
  /**
   * Export performance data to PDF
   * @param {Object} performanceData - Performance data object
   * @param {String} username - User's name for the header
   */
  exportPerformanceToPDF: (performanceData, username = 'User') => {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text('Performance Report', 14, 22);
      
      // Add date and user info
      doc.setFontSize(11);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
      doc.text(`User: ${username}`, 14, 36);
      
      // Add summary
      doc.setFontSize(14);
      doc.text('Summary', 14, 45);
      
      doc.setFontSize(11);
      doc.text(`Total Tests: ${performanceData.totalTests}`, 14, 55);
      doc.text(`Average Score: ${performanceData.averageScore}%`, 14, 62);
      
      // Add subject performance
      doc.setFontSize(14);
      doc.text('Subject Performance', 14, 75);
      
      // Create subject performance table
      const subjectColumns = ["Subject", "Score"];
      const subjectRows = [];
      
      Object.entries(performanceData.subjectPerformance).forEach(([subject, score]) => {
        if (score > 0) {
          subjectRows.push([subject, `${score}%`]);
        }
      });
      
      // Add subject performance table
      doc.autoTable({
        head: [subjectColumns],
        body: subjectRows,
        startY: 80,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 240, 240] }
      });
      
      // Add recent test history
      const finalY1 = doc.lastAutoTable.finalY || 80;
      doc.setFontSize(14);
      doc.text('Recent Tests', 14, finalY1 + 15);
      
      // Create recent tests table
      const testColumns = ["Date", "Score", "Time Taken"];
      const testRows = [];
      
      performanceData.testHistory.forEach(test => {
        testRows.push([
          test.date,
          `${test.score}%`,
          typeof test.timeTaken === 'string' ? test.timeTaken : `${Math.floor(test.timeTaken / 60)}m ${test.timeTaken % 60}s`
        ]);
      });
      
      // Add recent tests table
      doc.autoTable({
        head: [testColumns],
        body: testRows,
        startY: finalY1 + 20,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 240, 240] }
      });
      
      // Save the PDF
      doc.save('performance-report.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  },
  
  /**
   * Export test history to Excel
   * @param {Array} tests - Array of test objects
   */
  exportTestHistoryToExcel: (tests) => {
    try {
      // Format the data for Excel
      const data = tests.map(test => ({
        'Test Name': test.name,
        'Subject': test.subject,
        'Date': test.date,
        'Score (%)': test.score,
        'Time Taken': test.timeTaken,
        'Total Questions': test.totalQuestions
      }));
      
      // Create a worksheet
      const worksheet = XLSX.utils.json_to_sheet(data);
      
      // Create a workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Test History');
      
      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Save the file
      saveAs(blob, 'test-history.xlsx');
    } catch (error) {
      console.error('Error generating Excel:', error);
      alert('Failed to generate Excel file. Please try again.');
    }
  },
  
  /**
   * Export performance data to Excel
   * @param {Object} performanceData - Performance data object
   */
  exportPerformanceToExcel: (performanceData) => {
    try {
      // Create summary worksheet
      const summaryData = [
        { 'Metric': 'Total Tests', 'Value': performanceData.totalTests },
        { 'Metric': 'Average Score (%)', 'Value': performanceData.averageScore }
      ];
      
      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      
      // Create subject performance worksheet
      const subjectData = Object.entries(performanceData.subjectPerformance).map(([subject, score]) => ({
        'Subject': subject,
        'Score (%)': score
      }));
      
      const subjectWorksheet = XLSX.utils.json_to_sheet(subjectData);
      
      // Create test history worksheet
      const testData = performanceData.testHistory.map(test => ({
        'Date': test.date,
        'Score (%)': test.score,
        'Correct Answers': test.correctAnswers,
        'Total Questions': test.totalQuestions,
        'Time Taken': typeof test.timeTaken === 'string' ? test.timeTaken : `${Math.floor(test.timeTaken / 60)}m ${test.timeTaken % 60}s`
      }));
      
      const testWorksheet = XLSX.utils.json_to_sheet(testData);
      
      // Create a workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');
      XLSX.utils.book_append_sheet(workbook, subjectWorksheet, 'Subject Performance');
      XLSX.utils.book_append_sheet(workbook, testWorksheet, 'Test History');
      
      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Save the file
      saveAs(blob, 'performance-report.xlsx');
    } catch (error) {
      console.error('Error generating Excel:', error);
      alert('Failed to generate Excel file. Please try again.');
    }
  }
};

export default ExportUtils;
