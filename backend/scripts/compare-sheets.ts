import ExcelJS from 'exceljs';
import path from 'path';

const FILE_PATH = path.join(__dirname, '../public/lichmau.xlsx');

async function compareSheets() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(FILE_PATH);

    console.log('=== SO SÁNH CHI TIẾT GIỮA SHEET MẪU VÀ SHEET TEST ===\n');
    
    // Sheet mẫu có dữ liệu thực
    const templateSheet = workbook.getWorksheet('26_01-01_02');
    // Sheet test mới tạo
    const testSheet = workbook.getWorksheet('02_02-08_02');

    if (!templateSheet || !testSheet) {
        console.log('Không tìm thấy sheet cần so sánh');
        return;
    }

    // 1. So sánh độ rộng cột
    console.log('--- 1. ĐỘ RỘNG CỘT ---');
    for (let c = 1; c <= 8; c++) {
        const colName = String.fromCharCode(64 + c);
        const templateWidth = templateSheet.getColumn(c).width;
        const testWidth = testSheet.getColumn(c).width;
        const match = Math.abs((templateWidth || 0) - (testWidth || 0)) < 0.1 ? '✅' : '❌';
        console.log(`  Cột ${colName}: Mẫu=${templateWidth?.toFixed(2)}, Test=${testWidth?.toFixed(2)} ${match}`);
    }

    // 2. So sánh một dòng dữ liệu có màu vàng trong file MẪU
    console.log('\n--- 2. PHÂN TÍCH DÒNG CÓ MÀU VÀNG TRONG FILE MẪU ---');
    let yellowRowsInTemplate: number[] = [];
    
    templateSheet.eachRow((row, rowNum) => {
        if (rowNum < 7) return;
        
        let hasYellow = false;
        let yellowCols: number[] = [];
        
        for (let c = 1; c <= 8; c++) {
            const cell = row.getCell(c);
            const fill = cell.style.fill;
            if (fill && fill.type === 'pattern' && fill.fgColor?.argb === 'FFFFFF00') {
                hasYellow = true;
                yellowCols.push(c);
            }
        }
        
        if (hasYellow && yellowRowsInTemplate.length < 5) {
            yellowRowsInTemplate.push(rowNum);
            console.log(`  Row ${rowNum}: Màu vàng ở cột ${yellowCols.map(c => String.fromCharCode(64 + c)).join(', ')}`);
            
            // Chi tiết nội dung
            const content = row.getCell(3).value;
            if (content) {
                let text = typeof content === 'object' && 'richText' in content
                    ? (content as any).richText.map((r: any) => r.text).join('')
                    : String(content);
                console.log(`    Nội dung: "${text.substring(0, 50)}..."`);
            }
        }
    });

    // 3. So sánh dòng test có màu vàng
    console.log('\n--- 3. PHÂN TÍCH DÒNG CÓ MÀU VÀNG TRONG FILE TEST ---');
    testSheet.eachRow((row, rowNum) => {
        if (rowNum < 7) return;
        
        let yellowCols: number[] = [];
        
        for (let c = 1; c <= 8; c++) {
            const cell = row.getCell(c);
            const fill = cell.style.fill;
            if (fill && fill.type === 'pattern' && fill.fgColor?.argb === 'FFFFFF00') {
                yellowCols.push(c);
            }
        }
        
        if (yellowCols.length > 0) {
            console.log(`  Row ${rowNum}: Màu vàng ở cột ${yellowCols.map(c => String.fromCharCode(64 + c)).join(', ')}`);
            
            const content = row.getCell(3).value;
            if (content) {
                let text = typeof content === 'object' && 'richText' in content
                    ? (content as any).richText.map((r: any) => r.text).join('')
                    : String(content);
                console.log(`    Nội dung: "${text.substring(0, 50)}..."`);
            }
        }
    });

    // 4. So sánh chi tiết style của dòng dữ liệu
    console.log('\n--- 4. SO SÁNH STYLE CỦA DÒNG DỮ LIỆU ---');
    
    // Lấy dòng 7 của sheet mẫu (có dữ liệu)
    const templateRow7 = templateSheet.getRow(7);
    console.log('  [MẪU] Row 7:');
    for (let c = 1; c <= 8; c++) {
        const cell = templateRow7.getCell(c);
        const font = cell.style.font;
        const border = cell.style.border;
        console.log(`    Col ${String.fromCharCode(64 + c)}: Font=${font?.name}/${font?.size}, BorderL=${border?.left?.style}, BorderR=${border?.right?.style}`);
    }

    // Lấy dòng 7 của sheet test
    const testRow7 = testSheet.getRow(7);
    console.log('\n  [TEST] Row 7:');
    for (let c = 1; c <= 8; c++) {
        const cell = testRow7.getCell(c);
        const font = cell.style.font;
        const border = cell.style.border;
        console.log(`    Col ${String.fromCharCode(64 + c)}: Font=${font?.name}/${font?.size}, BorderL=${border?.left?.style}, BorderR=${border?.right?.style}`);
    }

    // 5. Kiểm tra merge cells
    console.log('\n--- 5. KIỂM TRA MERGE CELLS ---');
    console.log('  [MẪU] Merges (data):');
    if (templateSheet.model.merges) {
        templateSheet.model.merges.forEach(merge => {
            const row = parseInt(merge.split(':')[0].replace(/[A-Z]/g, ''));
            if (row >= 7 && row <= 20) {
                console.log(`    ${merge}`);
            }
        });
    }

    console.log('\n  [TEST] Merges (data):');
    if (testSheet.model.merges) {
        testSheet.model.merges.forEach(merge => {
            const row = parseInt(merge.split(':')[0].replace(/[A-Z]/g, ''));
            if (row >= 7) {
                console.log(`    ${merge}`);
            }
        });
    }

    // 6. So sánh chiều cao dòng
    console.log('\n--- 6. CHIỀU CAO DÒNG ---');
    for (let r = 7; r <= 15; r++) {
        const templateHeight = templateSheet.getRow(r).height;
        const testHeight = testSheet.getRow(r).height;
        console.log(`  Row ${r}: Mẫu=${templateHeight}, Test=${testHeight}`);
    }

    console.log('\n=== KẾT THÚC SO SÁNH ===');
}

compareSheets().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
