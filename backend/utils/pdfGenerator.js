const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

class PDFGenerator {
  static async generateTestReport(testData, outputPath) {
    try {
      const doc = new PDFDocument();
      const stream = fs.createWriteStream(outputPath);

      // Set up the document
      doc.pipe(stream);
      
      // Add header
      doc.fontSize(20)
         .text('Test Performance Report', { align: 'center' })
         .moveDown();

      // Add test information
      doc.fontSize(12)
         .text(`Test Title: ${testData.title}`)
         .text(`Category: ${testData.category}`)
         .text(`Difficulty: ${testData.difficulty}`)
         .text(`Date: ${new Date().toLocaleDateString()}`)
         .moveDown();

      // Add performance summary
      doc.fontSize(14)
         .text('Performance Summary', { underline: true })
         .moveDown()
         .fontSize(12)
         .text(`Total Questions: ${testData.totalQuestions}`)
         .text(`Correct Answers: ${testData.correctAnswers}`)
         .text(`Score: ${testData.score}%`)
         .text(`Time Taken: ${Math.floor(testData.timeTaken / 60)}m ${testData.timeTaken % 60}s`)
         .moveDown();

      // Add question analysis if available
      if (testData.answers && testData.answers.length > 0) {
        doc.fontSize(14)
           .text('Question Analysis', { underline: true })
           .moveDown();

        testData.answers.forEach((answer, index) => {
          doc.fontSize(12)
             .text(`Question ${index + 1}:`)
             .text(`Result: ${answer.isCorrect ? 'Correct' : 'Incorrect'}`)
             .text(`Time Spent: ${answer.timeSpent}s`)
             .moveDown(0.5);
        });
      }

      // Finalize the PDF
      doc.end();

      return new Promise((resolve, reject) => {
        stream.on('finish', () => resolve(outputPath));
        stream.on('error', reject);
      });
    } catch (error) {
      logger.error('Error generating PDF report:', error);
      throw error;
    }
  }

  static async generateCertificate(userData, courseData, outputPath) {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape'
      });
      const stream = fs.createWriteStream(outputPath);

      // Set up the document
      doc.pipe(stream);

      // Add certificate border
      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
         .stroke();

      // Add header
      doc.fontSize(30)
         .text('Certificate of Completion', {
           align: 'center',
           y: 100
         })
         .moveDown();

      // Add certificate text
      doc.fontSize(16)
         .text('This is to certify that', {
           align: 'center'
         })
         .moveDown();

      doc.fontSize(24)
         .text(userData.name, {
           align: 'center'
         })
         .moveDown();

      doc.fontSize(16)
         .text(`has successfully completed the ${courseData.title}`, {
           align: 'center'
         })
         .moveDown()
         .text(`with a score of ${courseData.score}%`, {
           align: 'center'
         })
         .moveDown(2);

      // Add date
      doc.fontSize(14)
         .text(`Awarded on ${new Date().toLocaleDateString()}`, {
           align: 'center'
         });

      // Add signature line
      doc.moveTo(doc.page.width / 2 - 100, doc.page.height - 100)
         .lineTo(doc.page.width / 2 + 100, doc.page.height - 100)
         .stroke()
         .fontSize(12)
         .text('Authorized Signature', {
           align: 'center',
           y: doc.page.height - 90
         });

      // Finalize the PDF
      doc.end();

      return new Promise((resolve, reject) => {
        stream.on('finish', () => resolve(outputPath));
        stream.on('error', reject);
      });
    } catch (error) {
      logger.error('Error generating certificate:', error);
      throw error;
    }
  }
}

module.exports = PDFGenerator; 