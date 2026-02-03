
const ExcelJS = require('exceljs');
const path = require('path');

async function analyze() {
    const workbook = new ExcelJS.Workbook();
    const filePath = path.join(__dirname, '../../public/lichmau.xlsx');

    try {
        await workbook.xlsx.readFile(filePath);
        console.log('File loaded:', filePath);

        workbook.eachSheet((sheet, id) => {
            console.log(`\n--- Sheet ${id}: ${sheet.name} ---`);

            // Read first 10 rows to understand header structure
            for (let i = 1; i <= 10; i++) {
                const row = sheet.getRow(i);
                if (row.values && row.values.length) {
                    // ExcelJS row.values is 1-based index, index 0 is empty usually.
                    // Let's filter out nulls/empty for cleaner output
                    const values = Array.isArray(row.values) ? row.values.map(v => v === null ? '[null]' : v) : row.values;
                    console.log(`Row ${i}:`, JSON.stringify(values));
                }
            }

            // Check merged cells to understand layout better
            /*
            if (sheet.hasMerges) {
                console.log('Merges:',  JSON.stringify(sheet.model.merges));
            } 
            */
        });

    } catch (err) {
        console.error('Error reading file:', err);
    }
}

analyze();
