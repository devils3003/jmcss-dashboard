import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';

export default function StipendTracker() {
    // Core Data State
    const [employees, setEmployees] = useState([]);
    const [activeEmployees, setActiveEmployees] = useState([]);
    const [stipendTypes, setStipendTypes] = useState([]);
    const [stipendsList, setStipendsList] = useState([]);
    const [hourlyList, setHourlyList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Entry Mode & Form State
    const [entryMode, setEntryMode] = useState('stipend'); // 'stipend' | 'hourly'
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [effectiveDate, setEffectiveDate] = useState('');
    const [stipendRows, setStipendRows] = useState([{ stipendTypeId: '', quantity: 1, customRate: 18 }]);
    const [hourlyRows, setHourlyRows] = useState([{ hoursWorked: '', hourlyRate: '', notes: '' }]);

    // Audit Modal State
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
    const [auditStartDate, setAuditStartDate] = useState('');
    const [auditEndDate, setAuditEndDate] = useState('');

    // Report Filters
    const [reportStaffId, setReportStaffId] = useState('ALL');
    const [reportStipendTypeId, setReportStipendTypeId] = useState('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const [empRes, typeRes, stipendRes, hourlyRes] = await Promise.all([
                supabase.from('staff').select('*'),
                supabase.from('stipend_types').select('*').order('id', { ascending: true }),
                supabase
                    .from('employee_stipends')
                    .select('*')
                    .order('effective_date', { ascending: false })
                    .order('id', { ascending: false }),
                supabase
                    .from('hourly_entries')
                    .select('*')
                    .order('effective_date', { ascending: false })
                    .order('id', { ascending: false }),
            ]);

            if (empRes.error) console.error('Staff fetch error:', empRes.error);
            if (typeRes.error) console.error('Stipend types fetch error:', typeRes.error);
            if (stipendRes.error) console.error('Employee stipends fetch error:', stipendRes.error);
            if (hourlyRes.error) console.error('Hourly entries fetch error:', hourlyRes.error);

            if (empRes.data) {
                const sorted = [...empRes.data].sort((a, b) => {
                    const lA = String(a['Last Name'] || '').toLowerCase();
                    const lB = String(b['Last Name'] || '').toLowerCase();
                    return lA.localeCompare(lB);
                });
                setEmployees(sorted);
                setActiveEmployees(
                    sorted.filter((e) => String(e['Active'] || '').trim().toLowerCase() === 'yes')
                );
            }

            if (typeRes.data) setStipendTypes(typeRes.data);
            if (stipendRes.data) setStipendsList(stipendRes.data);
            if (hourlyRes.data) setHourlyList(hourlyRes.data);
        } catch (err) {
            console.error('Supabase fetch error:', err);
        } finally {
            setLoading(false);
        }
    }

    // Fast lookup maps for staff & stipend types
    const staffById = useMemo(() => {
        const map = {};
        employees.forEach((emp) => {
            map[String(emp['Staff ID'])] = emp;
        });
        return map;
    }, [employees]);

    const typeById = useMemo(() => {
        const map = {};
        stipendTypes.forEach((t) => {
            map[String(t.id)] = t;
        });
        return map;
    }, [stipendTypes]);

    const handleRowChange = (index, field, value) => {
        const updated = [...stipendRows];
        if (field === 'stipendTypeId') {
            const selectedType = stipendTypes.find((t) => String(t.id) === String(value));
            const initialRate =
                selectedType &&
                    selectedType.default_rate !== null &&
                    selectedType.default_rate !== undefined &&
                    parseFloat(selectedType.default_rate) > 0
                    ? selectedType.default_rate
                    : '';

            updated[index] = {
                ...updated[index],
                stipendTypeId: value,
                customRate: initialRate,
            };
        } else {
            updated[index] = { ...updated[index], [field]: value };
        }
        setStipendRows(updated);
    };

    async function handleSubmit(e) {
        e.preventDefault();
        if (!selectedStaffId || !effectiveDate) return alert('Select an employee and date.');

        const valid = stipendRows.filter((r) => r.stipendTypeId !== '');
        if (valid.length === 0) return alert('Please select at least one stipend type.');

        const insertData = valid.map((r) => {
            const typeObj = typeById[String(r.stipendTypeId)];
            const defaultRate = typeObj ? parseFloat(typeObj.default_rate) : 18;
            return {
                staff_id: parseInt(selectedStaffId, 10),
                stipend_type_id: parseInt(r.stipendTypeId, 10),
                quantity: parseInt(r.quantity, 10) || 1,
                custom_rate: r.customRate !== '' ? parseFloat(r.customRate) : defaultRate,
                effective_date: effectiveDate,
            };
        });

        const { error } = await supabase.from('employee_stipends').insert(insertData);
        if (error) {
            alert(`Database storage failed: ${error.message}`);
        } else {
            setStipendRows([{ stipendTypeId: '', quantity: 1, customRate: 18 }]);
            setEffectiveDate('');
            fetchData();
        }
    }

    async function handleHourlySubmit(e) {
        e.preventDefault();
        if (!selectedStaffId || !effectiveDate) return alert('Select an employee and date.');

        const row = hourlyRows[0];
        if (!row.hoursWorked || row.hourlyRate === '') {
            return alert('Please enter hours worked and hourly rate.');
        }

        const payload = {
            staff_id: parseInt(selectedStaffId, 10),
            hours_worked: parseFloat(row.hoursWorked),
            hourly_rate: parseFloat(row.hourlyRate),
            effective_date: effectiveDate,
            notes: row.notes || '',
        };

        const { error } = await supabase.from('hourly_entries').insert([payload]);
        if (error) {
            alert(`Database error saving hourly entry: ${error.message}`);
        } else {
            setHourlyRows([{ hoursWorked: '', hourlyRate: '', notes: '' }]);
            setEffectiveDate('');
            fetchData();
        }
    }

    function getEffectiveRate(item) {
        if (item.custom_rate !== null && item.custom_rate !== undefined && item.custom_rate !== '') {
            return parseFloat(item.custom_rate);
        }
        const typeObj = typeById[String(item.stipend_type_id)];
        return typeObj ? parseFloat(typeObj.default_rate || 0) : 18;
    }

    async function handleDeleteStipend(item) {
        const total = ((item.quantity || 0) * getEffectiveRate(item)).toFixed(2);
        if (!window.confirm(`Delete stipend for Staff ID ${item.staff_id}?`)) return;
        if (window.prompt(`SECURITY CHECK: Confirm total ($${total}):`) !== total) {
            return alert('Verification failed!');
        }
        const { error } = await supabase.from('employee_stipends').delete().eq('id', item.id);
        if (error) {
            alert(`Delete failed: ${error.message}`);
        } else {
            fetchData();
        }
    }

    async function handleDeleteHourly(item) {
        const total = ((item.hours_worked || 0) * (item.hourly_rate || 0)).toFixed(2);
        if (!window.confirm(`Delete hourly entry for Staff ID ${item.staff_id}?`)) return;
        if (window.prompt(`SECURITY CHECK: Confirm total ($${total}):`) !== total) {
            return alert('Verification failed!');
        }
        const { error } = await supabase.from('hourly_entries').delete().eq('id', item.id);
        if (error) {
            alert(`Delete failed: ${error.message}`);
        } else {
            fetchData();
        }
    }

    const handleAuditStartDateChange = (newStart) => {
        setAuditStartDate(newStart);
        if (!newStart) {
            setAuditEndDate('');
            return;
        }
        // Parse YYYY-MM-DD in local time and add 13 days for a 14-day (2-week) inclusive pay period
        const [year, month, day] = newStart.split('-').map(Number);
        const endObj = new Date(year, month - 1, day + 13);
        const yyyy = endObj.getFullYear();
        const mm = String(endObj.getMonth() + 1).padStart(2, '0');
        const dd = String(endObj.getDate()).padStart(2, '0');
        setAuditEndDate(`${yyyy}-${mm}-${dd}`);
    };

    // Payroll Audit Matrix Calculation
    const getAuditMatrixData = () => {
        const auditFiltered = stipendsList.filter((item) => {
            const d = item.effective_date ? String(item.effective_date).trim() : '';
            if (auditStartDate && d < auditStartDate) return false;
            if (auditEndDate && d > auditEndDate) return false;
            return true;
        });

        const staffMap = {};

        auditFiltered.forEach((item) => {
            const id = String(item.staff_id);
            if (!staffMap[id]) {
                const emp = staffById[id];
                staffMap[id] = {
                    staffId: id,
                    lastName: emp ? emp['Last Name'] : '',
                    firstName: emp ? emp['First Name'] : '',
                    stipends: {},
                    totalCount: 0,
                    hourlyHours: 0,
                };
            }

            const typeId = item.stipend_type_id;
            const qty = parseInt(item.quantity, 10) || 0;

            staffMap[id].stipends[typeId] = (staffMap[id].stipends[typeId] || 0) + qty;
            staffMap[id].totalCount += qty;
        });

        const hourlyFiltered = hourlyList.filter((item) => {
            const d = item.effective_date ? String(item.effective_date).trim() : '';
            if (auditStartDate && d < auditStartDate) return false;
            if (auditEndDate && d > auditEndDate) return false;
            return true;
        });

        hourlyFiltered.forEach((item) => {
            const id = String(item.staff_id);
            if (!staffMap[id]) {
                const emp = staffById[id];
                staffMap[id] = {
                    staffId: id,
                    lastName: emp ? emp['Last Name'] : '',
                    firstName: emp ? emp['First Name'] : '',
                    stipends: {},
                    totalCount: 0,
                    hourlyHours: 0,
                };
            }

            const hrs = parseFloat(item.hours_worked) || 0;
            staffMap[id].hourlyHours += hrs;
        });

        return Object.values(staffMap).sort((a, b) =>
            String(a.lastName).localeCompare(String(b.lastName))
        );
    };

    const exportMatrixToExcel = () => {
        const matrixRows = getAuditMatrixData();

        const stipendTotalsByType = {};
        stipendTypes.forEach((t) => {
            stipendTotalsByType[t.id] = 0;
        });
        let grandTotalStipends = 0;
        let grandTotalHours = 0;

        matrixRows.forEach((row) => {
            stipendTypes.forEach((t) => {
                stipendTotalsByType[t.id] += row.stipends[t.id] || 0;
            });
            grandTotalStipends += row.totalCount || 0;
            grandTotalHours += row.hourlyHours || 0;
        });

        const escapeXml = (val) =>
            String(val ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');

        const periodLabel =
            auditStartDate && auditEndDate
                ? `Pay Period: ${auditStartDate} through ${auditEndDate}`
                : 'Pay Period: All Dates';

        const fileSuffix =
            auditStartDate && auditEndDate
                ? `${auditStartDate}_to_${auditEndDate}`
                : new Date().toISOString().split('T')[0];

        const totalCols = stipendTypes.length + 4;

        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<?mso-application progid="Excel.Sheet"?>\n`;
        xml += `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n`;
        xml += ` xmlns:o="urn:schemas-microsoft-com:office:office"\n`;
        xml += ` xmlns:x="urn:schemas-microsoft-com:office:excel"\n`;
        xml += ` xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n`;

        // Cell Styles
        xml += ` <Styles>\n`;
        xml += `  <Style ss:ID="Default" ss:Name="Normal"><Font ss:FontName="Calibri" ss:Size="10"/></Style>\n`;
        xml += `  <Style ss:ID="Banner"><Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0F172A" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>\n`;
        xml += `  <Style ss:ID="Header"><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>\n`;
        xml += `  <Style ss:ID="HeaderLeft"><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/><Alignment ss:Horizontal="Left" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>\n`;
        xml += `  <Style ss:ID="CellLeft"><Alignment ss:Horizontal="Left" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/></Borders></Style>\n`;
        xml += `  <Style ss:ID="CellCenter"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/></Borders></Style>\n`;
        xml += `  <Style ss:ID="CellDecimal"><NumberFormat ss:Format="0.00"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/></Borders></Style>\n`;
        xml += `  <Style ss:ID="TotalLeft"><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1"/><Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/><Alignment ss:Horizontal="Left" ss:Vertical="Center"/><Borders><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>\n`;
        xml += `  <Style ss:ID="TotalCenter"><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1"/><Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>\n`;
        xml += `  <Style ss:ID="TotalDecimal"><NumberFormat ss:Format="0.00"/><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1"/><Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>\n`;
        xml += ` </Styles>\n`;

        xml += ` <Worksheet ss:Name="Payroll Audit">\n`;
        xml += `  <Table>\n`;

        // Explicit compact column widths so everything fits cleanly on 1 Landscape Letter page
        xml += `   <Column ss:Width="58"/>\n`;  // Staff ID
        xml += `   <Column ss:Width="145"/>\n`; // Employee Name
        stipendTypes.forEach(() => {
            xml += `   <Column ss:Width="68"/>\n`; // Each Stipend Type column
        });
        xml += `   <Column ss:Width="72"/>\n`;  // Total Stipends
        xml += `   <Column ss:Width="62"/>\n`;  // Total Hrs

        // Row 1: Title Banner
        xml += `   <Row ss:Height="24">\n`;
        xml += `    <Cell ss:MergeAcross="${totalCols - 1}" ss:StyleID="Banner"><Data ss:Type="String">${escapeXml(`JMCSS Transportation Payroll Audit Matrix — ${periodLabel}`)}</Data></Cell>\n`;
        xml += `   </Row>\n`;

        // Row 2: Column Headers
        xml += `   <Row ss:Height="26">\n`;
        xml += `    <Cell ss:StyleID="HeaderLeft"><Data ss:Type="String">Staff ID</Data></Cell>\n`;
        xml += `    <Cell ss:StyleID="HeaderLeft"><Data ss:Type="String">Employee Name</Data></Cell>\n`;
        stipendTypes.forEach((type) => {
            xml += `    <Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(type.name)}</Data></Cell>\n`;
        });
        xml += `    <Cell ss:StyleID="Header"><Data ss:Type="String">Total Stipends</Data></Cell>\n`;
        xml += `    <Cell ss:StyleID="Header"><Data ss:Type="String">Total Hrs</Data></Cell>\n`;
        xml += `   </Row>\n`;

        // Staff Data Rows
        matrixRows.forEach((row) => {
            const empName = `${row.lastName || ''}, ${row.firstName || ''}`.trim();
            const displayName = empName === ',' ? `Staff #${row.staffId}` : empName;

            xml += `   <Row ss:Height="19">\n`;
            xml += `    <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${escapeXml(row.staffId || '')}</Data></Cell>\n`;
            xml += `    <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${escapeXml(displayName)}</Data></Cell>\n`;
            stipendTypes.forEach((type) => {
                const count = row.stipends[type.id] || 0;
                if (count > 0) {
                    xml += `    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${count}</Data></Cell>\n`;
                } else {
                    xml += `    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">-</Data></Cell>\n`;
                }
            });
            xml += `    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${row.totalCount || 0}</Data></Cell>\n`;
            xml += `    <Cell ss:StyleID="CellDecimal"><Data ss:Type="Number">${(row.hourlyHours || 0).toFixed(2)}</Data></Cell>\n`;
            xml += `   </Row>\n`;
        });

        // Grand Totals Row
        xml += `   <Row ss:Height="22">\n`;
        xml += `    <Cell ss:MergeAcross="1" ss:StyleID="TotalLeft"><Data ss:Type="String">${escapeXml(`GRAND TOTALS (${matrixRows.length} Staff)`)}</Data></Cell>\n`;
        stipendTypes.forEach((type) => {
            const colTotal = stipendTotalsByType[type.id] || 0;
            if (colTotal > 0) {
                xml += `    <Cell ss:StyleID="TotalCenter"><Data ss:Type="Number">${colTotal}</Data></Cell>\n`;
            } else {
                xml += `    <Cell ss:StyleID="TotalCenter"><Data ss:Type="String">-</Data></Cell>\n`;
            }
        });
        xml += `    <Cell ss:StyleID="TotalCenter"><Data ss:Type="Number">${grandTotalStipends}</Data></Cell>\n`;
        xml += `    <Cell ss:StyleID="TotalDecimal"><Data ss:Type="Number">${grandTotalHours.toFixed(2)}</Data></Cell>\n`;
        xml += `   </Row>\n`;

        xml += `  </Table>\n`;

        // Print & Page Setup: Landscape, Letter Paper, 0.25" Left/Right Margins, Fit to 1 Page Wide
        xml += `  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">\n`;
        xml += `   <PageSetup>\n`;
        xml += `    <Layout x:Orientation="Landscape"/>\n`;
        xml += `    <Header x:Margin="0.2"/>\n`;
        xml += `    <Footer x:Margin="0.2"/>\n`;
        xml += `    <PageMargins x:Bottom="0.35" x:Left="0.25" x:Right="0.25" x:Top="0.35"/>\n`;
        xml += `   </PageSetup>\n`;
        xml += `   <FitToPage/>\n`;
        xml += `   <Print>\n`;
        xml += `    <ValidPrinterInfo/>\n`;
        xml += `    <PaperSizeIndex>1</PaperSizeIndex>\n`;
        xml += `    <FitWidth>1</FitWidth>\n`;
        xml += `    <FitHeight>0</FitHeight>\n`;
        xml += `   </Print>\n`;
        xml += `  </WorksheetOptions>\n`;

        xml += ` </Worksheet>\n`;
        xml += `</Workbook>`;

        const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `JMCSS_Payroll_Audit_${fileSuffix}.xml`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="py-12 text-center text-slate-400 text-sm">
                Loading stipend & hourly payroll records...
            </div>
        );
    }

    // Filtered Logs
    const filteredStipends = stipendsList.filter((item) => {
        if (reportStaffId !== 'ALL' && String(item.staff_id).trim() !== String(reportStaffId).trim()) {
            return false;
        }
        if (
            reportStipendTypeId !== 'ALL' &&
            String(item.stipend_type_id).trim() !== String(reportStipendTypeId).trim()
        ) {
            return false;
        }
        const d = item.effective_date ? String(item.effective_date).trim() : '';
        return (!startDate || d >= startDate) && (!endDate || d <= endDate);
    });

    const filteredHourly = hourlyList.filter((item) => {
        if (reportStaffId !== 'ALL' && String(item.staff_id).trim() !== String(reportStaffId).trim()) {
            return false;
        }
        const d = item.effective_date ? String(item.effective_date).trim() : '';
        return (!startDate || d >= startDate) && (!endDate || d <= endDate);
    });

    const totalEntries = filteredStipends.length + filteredHourly.length;
    const stipendDollarTotal = filteredStipends.reduce((sum, item) => {
        const qty = parseInt(item.quantity, 10) || 0;
        const rate = getEffectiveRate(item) || 0;
        return sum + qty * rate;
    }, 0);

    const hourlyDollarTotal = filteredHourly.reduce((sum, item) => {
        const hrs = parseFloat(item.hours_worked) || 0;
        const rate = parseFloat(item.hourly_rate) || 0;
        return sum + hrs * rate;
    }, 0);

    const totalDollarAmount = stipendDollarTotal + hourlyDollarTotal;
    const auditMatrixRows = getAuditMatrixData();

    return (
        <div className="text-slate-100">
            <style>{`
        @media print {
          @page { margin: 0.5in; }
          body, html { background-color: #ffffff !important; color: #000000 !important; }
          header, .no-print, button, input, select { display: none !important; }
          table { background-color: #ffffff !important; border: 1px solid #000000 !important; width: 100% !important; border-collapse: collapse !important; }
          th { background-color: #f2f2f2 !important; color: #000000 !important; border-bottom: 2px solid #000000 !important; padding: 6px !important; }
          td { color: #000000 !important; border-bottom: 1px solid #dddddd !important; padding: 6px !important; }
        }
      `}</style>

            {/* Top Action Bar */}
            <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white">Employee Stipend & Hourly Tracker</h2>
                    <p className="text-xs text-slate-400">
                        Log route stipends, field trips, and hourly coverage with payroll matrix audit export.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setIsAuditModalOpen(true)}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
                >
                    Payroll Audit Matrix
                </button>
            </div>

            {/* Payroll Audit Matrix Modal */}
            {isAuditModalOpen && (
                <div
                    id="audit-modal"
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                >
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-white">
                                Payroll Audit Summary Matrix (All Staff)
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsAuditModalOpen(false)}
                                className="text-slate-400 hover:text-white text-xl cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mb-5">
                            <label className="text-xs font-semibold text-slate-300">
                                Pay Period Start Date:
                            </label>
                            <input
                                type="date"
                                value={auditStartDate}
                                onChange={(e) => handleAuditStartDateChange(e.target.value)}
                                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                            />
                            {auditStartDate && auditEndDate && (
                                <span className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-amber-400">
                                    2-Week Window: {auditStartDate} → {auditEndDate}
                                </span>
                            )}
                            {auditStartDate && (
                                <button
                                    type="button"
                                    onClick={() => handleAuditStartDateChange('')}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
                                >
                                    Clear
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={exportMatrixToExcel}
                                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg cursor-pointer ml-auto"
                            >
                                Export to Excel (.xls)
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-800 text-slate-200 border-b border-slate-700">
                                        <th className="p-2.5">Staff ID</th>
                                        <th className="p-2.5">Employee Name</th>
                                        {stipendTypes.map((t) => (
                                            <th key={t.id} className="p-2.5 text-center">
                                                {t.name}
                                            </th>
                                        ))}
                                        <th className="p-2.5 text-center">Total Stipends</th>
                                        <th className="p-2.5 text-center">Total Hrs</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800 text-slate-100">
                                    {auditMatrixRows.map((row) => {
                                        const empName = `${row.lastName || ''}, ${row.firstName || ''}`.trim();
                                        const formattedName =
                                            empName === '' || empName === ',' ? `Staff #${row.staffId}` : empName;

                                        return (
                                            <tr key={row.staffId} className="hover:bg-slate-800/40">
                                                <td className="p-2.5 font-mono font-bold text-slate-300">{row.staffId}</td>
                                                <td className="p-2.5 text-white">{formattedName}</td>
                                                {stipendTypes.map((t) => {
                                                    const count = row.stipends[t.id] || 0;
                                                    return (
                                                        <td key={t.id} className="p-2.5 text-center text-slate-300">
                                                            {count > 0 ? count : '-'}
                                                        </td>
                                                    );
                                                })}
                                                <td className="p-2.5 text-center font-bold">{row.totalCount || 0}</td>
                                                <td className="p-2.5 text-center font-semibold text-sky-400">
                                                    {(row.hourlyHours || 0).toFixed(2)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Entry Form Card */}
            <div className="no-print bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
                <div className="flex gap-2 mb-4">
                    <button
                        type="button"
                        onClick={() => setEntryMode('stipend')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${entryMode === 'stipend'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                    >
                        Stipend Entry
                    </button>
                    <button
                        type="button"
                        onClick={() => setEntryMode('hourly')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${entryMode === 'hourly'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                    >
                        Hourly Entry
                    </button>
                </div>

                <h3 className="text-base font-bold text-white mb-4">
                    {entryMode === 'stipend' ? 'Log Stipends for Employee' : 'Log Hourly Pay for Employee'}
                </h3>

                {entryMode === 'stipend' ? (
                    <form onSubmit={handleSubmit}>
                        <div className="flex flex-wrap gap-3 mb-4">
                            <select
                                value={selectedStaffId}
                                onChange={(e) => setSelectedStaffId(e.target.value)}
                                required
                                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white min-w-62.5"
                            >
                                <option value="">Select Employee</option>
                                {activeEmployees.map((emp) => (
                                    <option key={emp['Staff ID']} value={emp['Staff ID']}>
                                        {emp['Last Name']}, {emp['First Name']} (#{emp['Staff ID']})
                                    </option>
                                ))}
                            </select>
                            <input
                                type="date"
                                value={effectiveDate}
                                onChange={(e) => setEffectiveDate(e.target.value)}
                                required
                                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                            />
                        </div>

                        {stipendRows.map((row, index) => (
                            <div key={index} className="flex flex-wrap gap-3 mb-3 items-center">
                                <select
                                    value={row.stipendTypeId}
                                    onChange={(e) => handleRowChange(index, 'stipendTypeId', e.target.value)}
                                    required
                                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white min-w-50"
                                >
                                    <option value="">Select Stipend</option>
                                    {stipendTypes.map((type) => (
                                        <option key={type.id} value={type.id}>
                                            {type.name}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    min="1"
                                    value={row.quantity}
                                    onChange={(e) => handleRowChange(index, 'quantity', e.target.value)}
                                    placeholder="Qty"
                                    className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                                />
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Rate ($)"
                                    value={row.customRate}
                                    onChange={(e) => handleRowChange(index, 'customRate', e.target.value)}
                                    className="w-32 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                                />
                                {stipendRows.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setStipendRows(stipendRows.filter((_, i) => i !== index))}
                                        className="text-xs text-red-400 hover:text-red-300 px-2 py-1 cursor-pointer"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}

                        <div className="flex flex-wrap gap-3 mt-4">
                            <button
                                type="button"
                                onClick={() =>
                                    setStipendRows([...stipendRows, { stipendTypeId: '', quantity: 1, customRate: 18 }])
                                }
                                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg cursor-pointer"
                            >
                                + Add Row
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg cursor-pointer"
                            >
                                Save All Stipends
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleHourlySubmit}>
                        <div className="flex flex-wrap gap-3 mb-4">
                            <select
                                value={selectedStaffId}
                                onChange={(e) => setSelectedStaffId(e.target.value)}
                                required
                                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white min-w-62.5"
                            >
                                <option value="">Select Employee</option>
                                {activeEmployees.map((emp) => (
                                    <option key={emp['Staff ID']} value={emp['Staff ID']}>
                                        {emp['Last Name']}, {emp['First Name']} (#{emp['Staff ID']})
                                    </option>
                                ))}
                            </select>
                            <input
                                type="date"
                                value={effectiveDate}
                                onChange={(e) => setEffectiveDate(e.target.value)}
                                required
                                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                            />
                        </div>

                        {hourlyRows.map((row, index) => (
                            <div key={index} className="flex flex-wrap gap-3 mb-4">
                                <input
                                    type="number"
                                    step="0.25"
                                    placeholder="Hours Worked"
                                    value={row.hoursWorked}
                                    onChange={(e) => {
                                        const updated = [...hourlyRows];
                                        updated[index].hoursWorked = e.target.value;
                                        setHourlyRows(updated);
                                    }}
                                    required
                                    className="w-36 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                                />
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Hourly Rate ($)"
                                    value={row.hourlyRate}
                                    onChange={(e) => {
                                        const updated = [...hourlyRows];
                                        updated[index].hourlyRate = e.target.value;
                                        setHourlyRows(updated);
                                    }}
                                    required
                                    className="w-36 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                                />
                                <input
                                    type="text"
                                    placeholder="Notes (optional)"
                                    value={row.notes}
                                    onChange={(e) => {
                                        const updated = [...hourlyRows];
                                        updated[index].notes = e.target.value;
                                        setHourlyRows(updated);
                                    }}
                                    className="flex-1 min-w-50 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                                />
                            </div>
                        ))}

                        <button
                            type="submit"
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg cursor-pointer"
                        >
                            Save Hourly Entry
                        </button>
                    </form>
                )}
            </div>

            {/* Summary KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Filtered Entries
                    </span>
                    <p className="text-2xl font-bold text-white mt-1">{totalEntries}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Total Payout
                    </span>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">
                        ${totalDollarAmount.toFixed(2)}
                    </p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="no-print bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6 flex flex-wrap items-center gap-3">
                <select
                    value={reportStaffId}
                    onChange={(e) => setReportStaffId(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                >
                    <option value="ALL">All Staff</option>
                    {employees.map((e) => (
                        <option key={e['Staff ID']} value={e['Staff ID']}>
                            {e['Last Name']}, {e['First Name']}
                        </option>
                    ))}
                </select>
                <select
                    value={reportStipendTypeId}
                    onChange={(e) => setReportStipendTypeId(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                >
                    <option value="ALL">All Stipend Types</option>
                    {stipendTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                            {t.name}
                        </option>
                    ))}
                </select>
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                />
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                />
                <button
                    type="button"
                    onClick={() => {
                        setReportStaffId('ALL');
                        setReportStipendTypeId('ALL');
                        setStartDate('');
                        setEndDate('');
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
                >
                    Reset
                </button>
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                    Print Logs to PDF
                </button>
            </div>

            {/* Stipend Work Logs */}
            {entryMode === 'stipend' && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <h3 className="text-base font-bold text-white mb-4">
                        Stipend Work Logs ({filteredStipends.length})
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="border-b border-slate-800 text-xs uppercase text-slate-400">
                                    <th className="py-2.5 px-3">Staff ID</th>
                                    <th className="py-2.5 px-3">Employee Name</th>
                                    <th className="py-2.5 px-3">Stipend Type</th>
                                    <th className="py-2.5 px-3">Date</th>
                                    <th className="py-2.5 px-3 text-center">Qty</th>
                                    <th className="py-2.5 px-3 text-right">Total Pay</th>
                                    <th className="no-print py-2.5 px-3 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {filteredStipends.map((item) => {
                                    const emp = staffById[String(item.staff_id)];
                                    const typeObj = typeById[String(item.stipend_type_id)];
                                    const rate = getEffectiveRate(item);
                                    const totalPay = ((item.quantity || 0) * rate).toFixed(2);

                                    return (
                                        <tr key={item.id} className="hover:bg-slate-800/40">
                                            <td className="py-2.5 px-3 font-mono text-xs text-slate-400">
                                                {item.staff_id}
                                            </td>
                                            <td className="py-2.5 px-3 font-medium text-white">
                                                {emp ? `${emp['First Name']} ${emp['Last Name']}` : `Staff #${item.staff_id}`}
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-300">
                                                {typeObj ? typeObj.name : `Type #${item.stipend_type_id}`}
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-300">{item.effective_date}</td>
                                            <td className="py-2.5 px-3 text-center">{item.quantity}</td>
                                            <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                                                ${totalPay}
                                            </td>
                                            <td className="no-print py-2.5 px-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteStipend(item)}
                                                    className="px-2.5 py-1 bg-red-600/80 hover:bg-red-600 text-white text-xs rounded cursor-pointer"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Hourly Work Logs */}
            {entryMode === 'hourly' && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <h3 className="text-base font-bold text-white mb-4">
                        Hourly Work Logs ({filteredHourly.length})
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="border-b border-slate-800 text-xs uppercase text-slate-400">
                                    <th className="py-2.5 px-3">Staff ID</th>
                                    <th className="py-2.5 px-3">Employee Name</th>
                                    <th className="py-2.5 px-3">Date</th>
                                    <th className="py-2.5 px-3 text-center">Hours</th>
                                    <th className="py-2.5 px-3 text-center">Rate</th>
                                    <th className="py-2.5 px-3 text-right">Total Pay</th>
                                    <th className="py-2.5 px-3">Notes</th>
                                    <th className="no-print py-2.5 px-3 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {filteredHourly.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="py-6 text-center text-slate-400">
                                            No hourly entries found for the selected filters.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredHourly.map((item) => {
                                        const emp = staffById[String(item.staff_id)];
                                        const totalPay = ((item.hours_worked || 0) * (item.hourly_rate || 0)).toFixed(2);
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-800/40">
                                                <td className="py-2.5 px-3 font-mono text-xs text-slate-400">
                                                    {item.staff_id}
                                                </td>
                                                <td className="py-2.5 px-3 font-medium text-white">
                                                    {emp
                                                        ? `${emp['First Name']} ${emp['Last Name']}`
                                                        : `Staff #${item.staff_id}`}
                                                </td>
                                                <td className="py-2.5 px-3 text-slate-300">{item.effective_date}</td>
                                                <td className="py-2.5 px-3 text-center">{item.hours_worked}</td>
                                                <td className="py-2.5 px-3 text-center">
                                                    ${parseFloat(item.hourly_rate || 0).toFixed(2)}
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                                                    ${totalPay}
                                                </td>
                                                <td className="py-2.5 px-3 text-xs text-slate-400">{item.notes || '-'}</td>
                                                <td className="no-print py-2.5 px-3 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteHourly(item)}
                                                        className="px-2.5 py-1 bg-red-600/80 hover:bg-red-600 text-white text-xs rounded cursor-pointer"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}