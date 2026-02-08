
import ExcelJS from 'exceljs';
import path from 'path';
import { excelService } from '../src/services/excel.service';
import prisma from '../src/config/database';

const FILE_PATH = path.join(__dirname, '../public/lichmau.xlsx');

async function verifyLayout() {
    try {
        console.log('--- Starting Excel Verification ---');

        // 1. Setup Dummy Data with isSupplementary = true
        console.log('1. Creating dummy supplementary schedule...');
        const today = new Date();

        const user = await prisma.user.findFirst();
        if (!user) {
            console.error('❌ No user found in database to assign as creator.');
            return;
        }

        const dummySchedule = await prisma.schedule.create({
            data: {
                date: today,
                dayOfWeek: 'Thứ ...', // Dummy
                startTime: new Date('1970-01-01T08:00:00Z'),
                content: 'KIỂM TRA LỊCH BỔ SUNG (MÀU VÀNG)',
                location: 'Phòng họp',
                leader: 'Leader',
                participants: '["A", "B"]',
                preparingUnit: 'Unit A',
                isSupplementary: true,
                createdBy: user.id
            }
        });

        // Re-fetch to ensure we have the ID for cleanup
        console.log('   Created schedule:', dummySchedule.id);

        // 2. Sync
        console.log('2. Syncing to Excel...');
        await excelService.syncWeekToExcel(today);

        // 3. Inspect File
        console.log('3. Inspecting generated file...');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(FILE_PATH);

        const sheetName = excelService.getSheetName(today);
        const sheet = workbook.getWorksheet(sheetName);

        if (!sheet) {
            console.error(`❌ Sheet ${sheetName} not found!`);
            return;
        }
        console.log(`✅ Sheet ${sheetName} exists.`);

        // Check Header (Row 5 - Date Range)
        const row5 = sheet.getRow(5);
        let hasDateRange = false;
        row5.eachCell((cell) => {
            if (cell.value && String(cell.value).includes('LỊCH CÔNG TÁC TUẦN')) {
                hasDateRange = true;
                console.log(`✅ Header found: ${cell.value}`);
                // Check Color
                if (cell.style.font?.color?.argb === 'FFFF0000') {
                    console.log('✅ Header text is RED (FFFF0000)');
                } else {
                    console.log('⚠️ Header text color might be incorrect:', cell.style.font?.color?.argb);
                }
            }
        });

        // Check Data Row
        let foundDummy = false;
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber < 7) return; // Skip header

            const contentCell = row.getCell(3); // Col 3 (C) is Content
            if (contentCell.value) {
                // rich text check
                let text = '';
                if (typeof contentCell.value === 'object' && 'richText' in contentCell.value) {
                    text = contentCell.value.richText.map(r => r.text).join('');
                } else {
                    text = String(contentCell.value);
                }

                if (text.includes('KIỂM TRA LỊCH BỔ SUNG')) {
                    foundDummy = true;
                    console.log(`✅ Found dummy data at Row ${rowNumber}`);

                    // Check Font - Cột C phải có size 11
                    const font = contentCell.style.font;
                    console.log(`   Font: ${font?.name}, Size: ${font?.size} (expected: 11)`);
                    if (font?.name === 'Times New Roman' && font?.size === 11) {
                        console.log('   ✅ Font chính xác!');
                    } else {
                        console.log('   ❌ Font KHÔNG đúng theo mẫu');
                    }

                    // Check Background Color (Yellow)
                    const fill = contentCell.style.fill;
                    if (fill?.type === 'pattern' && fill.fgColor?.argb === 'FFFFFF00') {
                        console.log('   ✅ Background is YELLOW (FFFFFF00)');
                    } else {
                        console.log('   ❌ Background color is NOT yellow:', JSON.stringify(fill));
                    }

                    // Check Border - cột đầu tiên phải có left double
                    const firstCellBorder = row.getCell(1).style.border;
                    if (firstCellBorder?.left?.style === 'double') {
                        console.log('   ✅ Cột A có border left DOUBLE');
                    } else {
                        console.log('   ⚠️ Cột A border left:', firstCellBorder?.left?.style);
                    }

                    // Check Border - cột cuối phải có right double
                    const lastCellBorder = row.getCell(8).style.border;
                    if (lastCellBorder?.right?.style === 'double') {
                        console.log('   ✅ Cột H có border right DOUBLE');
                    } else {
                        console.log('   ⚠️ Cột H border right:', lastCellBorder?.right?.style);
                    }

                    // Check row height
                    console.log(`   Row height: ${row.height} (expected: 30)`);
                }
            }
        });

        if (!foundDummy) {
            console.error('❌ Could not find dummy schedule in Excel file.');
        }

        // 4. Cleanup
        console.log('4. Cleaning up...');
        await prisma.schedule.delete({ where: { id: dummySchedule.id } });
        // Run sync again to remove it from excel? Optional.
        // await excelService.syncWeekToExcel(today);

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyLayout();
