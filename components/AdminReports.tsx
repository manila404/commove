import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx-js-style';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { EventType, User } from '../types';

// Cross-platform Excel download — Android WebView + desktop browsers
const downloadExcel = async (buffer: ArrayBuffer, filename: string) => {
    const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const blob = new Blob([buffer], { type: mimeType });

    // 1. Web Share API — most reliable on Android (opens native share/save sheet)
    if (typeof navigator !== 'undefined' && navigator.share) {
        try {
            const file = new File([blob], filename, { type: mimeType });
            const canShare = navigator.canShare ? navigator.canShare({ files: [file] }) : true;
            if (canShare) {
                await navigator.share({ files: [file], title: filename });
                return;
            }
        } catch (e: any) {
            // AbortError = user dismissed share sheet (not a failure)
            if (e?.name === 'AbortError') return;
            // Otherwise fall through to next method
        }
    }

    // 2. Blob URL — works on desktop browsers + Android Chrome
    if (window.URL && window.URL.createObjectURL) {
        try {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.setAttribute('download', filename);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => window.URL.revokeObjectURL(url), 300);
            return;
        } catch { /* fall through */ }
    }

    // 3. Base64 data URI — last resort for restrictive WebViews
    const reader = new FileReader();
    reader.onload = () => {
        const a = document.createElement('a');
        a.href = reader.result as string;
        a.setAttribute('download', filename);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };
    reader.readAsDataURL(blob);
};

const ALL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ALL_QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const CURRENT_YEAR = new Date().getFullYear();
const ALL_YEARS = Array.from({ length: 16 }, (_, i) => (CURRENT_YEAR - 6 + i).toString());

interface AdminReportsProps {
    events: EventType[];
    users: User[];
}

const AdminReports: React.FC<AdminReportsProps> = ({ events, users: allUsers }) => {
    // Exclude facilitators and admins — all participation metrics use residents only
    const users = allUsers.filter(u => u.role !== 'admin' && u.role !== 'facilitator' && !u.isAdmin);
    const [period, setPeriod] = useState<'this_month' | 'previous_month' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
    const [ageGroups, setAgeGroups] = useState<Record<string, boolean>>({
        'Child': true,
        'Teen': true,
        'Adult': true,
        'Middle Age': true,
        'Senior': true
    });
    const [sexFilter, setSexFilter] = useState<'All' | 'Female' | 'Male' | 'Others'>('All');
    const [selectedPart1, setSelectedPart1] = useState<string>('');
    const [selectedPart2, setSelectedPart2] = useState<string>('');

    // Splits a stored address "Blk 3, Lot 5, Tirona Hwy" into block/house and street parts
    const splitAddress = (addr: string) => {
        if (!addr) return { blockHouse: '', street: '' };
        const idx = addr.indexOf(', ');
        if (idx !== -1) {
            const first = addr.slice(0, idx);
            if (/\d/.test(first) || /^(blk|block|lot|house|room|unit|#|apt)/i.test(first.trim())) {
                return { blockHouse: first, street: addr.slice(idx + 2) };
            }
        }
        return { blockHouse: '', street: addr };
    };

    const calculateAge = (birthday?: string) => {
        if (!birthday) return null;
        const birthDate = new Date(birthday);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const getAgeGroup = (age: number | null) => {
        if (age === null) return 'Unknown';
        if (age < 13) return 'Child';
        if (age >= 13 && age <= 19) return 'Teen';
        if (age >= 20 && age <= 39) return 'Adult';
        if (age >= 40 && age <= 59) return 'Middle Age';
        if (age >= 60) return 'Senior';
        return 'Unknown';
    };

    const getQuarter = (date: Date) => Math.floor(date.getMonth() / 3) + 1;

    const reportData = useMemo(() => {
        // Group events by period
        const periodGroups: Record<string, { events: EventType[], participants: User[] }> = {};

        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        let prevMonth = currentMonth - 1;
        let prevYear = currentYear;
        if (prevMonth < 0) {
            prevMonth = 11;
            prevYear--;
        }

        events.forEach(event => {
            const date = new Date(event.date);
            if (isNaN(date.getTime())) return;

            if (period === 'this_month') {
                if (date.getMonth() !== currentMonth || date.getFullYear() !== currentYear) return;
            } else if (period === 'previous_month') {
                if (date.getMonth() !== prevMonth || date.getFullYear() !== prevYear) return;
            }

            let periodKey = '';
            if (period === 'monthly' || period === 'this_month' || period === 'previous_month') {
                periodKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            } else if (period === 'quarterly') {
                periodKey = `Q${getQuarter(date)} ${date.getFullYear()}`;
            } else if (period === 'yearly') {
                periodKey = `${date.getFullYear()}`;
            }

            if (!periodGroups[periodKey]) {
                periodGroups[periodKey] = { events: [], participants: [] };
            }
            periodGroups[periodKey].events.push(event);
        });

        // For each period, find participants and events
        const results = Object.entries(periodGroups).map(([key, group]) => {
            const periodEvents = group.events.map(event => {
                const eventParticipants = users.filter(user => {
                    const hasParticipated =
                        user.checkedInEventIds?.includes(event.id) ||
                        user.interestedEventIds?.includes(event.id);
                    if (!hasParticipated) return false;

                    // Apply Age Filter
                    const age = calculateAge(user.birthday);
                    const groupName = getAgeGroup(age);
                    if (groupName !== 'Unknown' && !ageGroups[groupName]) return false;
                    if (groupName === 'Unknown' && (!ageGroups['Teen'] || !ageGroups['Adult'] || !ageGroups['Middle Age'] || !ageGroups['Senior'])) {
                        return false;
                    }

                    // Apply Sex Filter
                    if (sexFilter !== 'All') {
                        if (sexFilter === 'Male' && user.sex !== 'Male') return false;
                        if (sexFilter === 'Female' && user.sex !== 'Female') return false;
                        if (sexFilter === 'Others' && (user.sex === 'Male' || user.sex === 'Female' || !user.sex)) return false;
                    }

                    return true;
                });

                return {
                    event,
                    participants: eventParticipants
                };
            });

            // Total participants in this period (unique)
            const uniqueParticipants = new Set();
            periodEvents.forEach(e => e.participants.forEach(p => uniqueParticipants.add(p.uid)));

            return {
                period: key,
                participantCount: uniqueParticipants.size,
                events: periodEvents
            };
        }).sort((a, b) => b.period.localeCompare(a.period));

        return results;
    }, [events, users, period, ageGroups, sexFilter]);

    React.useEffect(() => {
        const today = new Date();
        const month = today.toLocaleDateString('en-US', { month: 'long' });
        const year = today.getFullYear().toString();
        const quarter = `Q${Math.floor(today.getMonth() / 3) + 1}`;
        
        if (period === 'monthly' || period === 'this_month' || period === 'previous_month') {
            setSelectedPart1(month);
            setSelectedPart2(year);
        } else if (period === 'quarterly') {
            setSelectedPart1(quarter);
            setSelectedPart2(year);
        } else if (period === 'yearly') {
            setSelectedPart1('');
            setSelectedPart2(year);
        }
    }, [period]);

    const handleAgeGroupChange = (group: string) => {
        setAgeGroups(prev => ({ ...prev, [group]: !prev[group] }));
    };

    const handleDownload = async () => {
        const activePeriodStr = selectedPart1 ? `${selectedPart1} ${selectedPart2}` : selectedPart2;
        const activeData = reportData.find(d => d.period === activePeriodStr);

        if (!activeData || activeData.events.length === 0) {
            window.alert('No data to download for the selected period.');
            return;
        }

        const wsData: any[][] = [];
        
        // Report Header
        wsData.push(["COMMOVE EVENT PARTICIPATION REPORT", "", "", "", "", "", "", ""]);
        wsData.push([`Generated on: ${new Date().toLocaleString()}`, "", "", "", "", "", "", ""]);
        wsData.push([]);
        
        // Parameters
        wsData.push(["REPORT PARAMETERS", "", "", "", "", "", "", ""]);
        wsData.push(["Time Period:", activePeriodStr, "", "", "", "", "", ""]);
        
        const selectedAges = Object.entries(ageGroups).filter(([_, v]) => v).map(([k]) => k).join(', ') || 'None';
        wsData.push(["Age Groups:", selectedAges, "", "", "", "", "", ""]);
        wsData.push(["Sex:", sexFilter, "", "", "", "", "", ""]);
        
        // Summary Metrics
        const totalEvents = activeData.events.length;
        const totalParticipants = activeData.participantCount;
        wsData.push(["Total Events:", totalEvents, "", "", "", "", "", "", ""]);
        wsData.push(["Total Participants:", totalParticipants, "", "", "", "", "", "", ""]);
        wsData.push([]);

        // Data Header
        wsData.push(["Period", "Event", "Name", "Email", "Age", "Sex", "Contact Number", "Block/House/Room No.", "Street Address"]);

        // Data Rows
        activeData.events.forEach(eventData => {
            if (eventData.participants.length === 0) {
                wsData.push([
                    activeData.period,
                    eventData.event.name,
                    'No Participants',
                    '', '', '', '', '', ''
                ]);
            } else {
                eventData.participants.forEach(p => {
                    const { blockHouse, street } = splitAddress(p.address || '');
                    wsData.push([
                        activeData.period,
                        eventData.event.name,
                        p.name,
                        p.email,
                        calculateAge(p.birthday),
                        p.sex,
                        p.contactNumber || '',
                        blockHouse,
                        street
                    ]);
                });
            }
        });

        // Create Worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(wsData);

        // Styling
        worksheet['!cols'] = [
            { wch: 15 }, // Period
            { wch: 30 }, // Event
            { wch: 25 }, // Name
            { wch: 35 }, // Email
            { wch: 10 }, // Age
            { wch: 10 }, // Sex
            { wch: 20 }, // Contact Number
            { wch: 25 }, // Block/House/Room No.
            { wch: 40 }  // Street Address
        ];

        worksheet['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, // Title
            { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }, // Generated on
            { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } }, // Parameters Title
        ];

        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:H1');
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const address = XLSX.utils.encode_cell({ r: R, c: C });
                if (!worksheet[address]) {
                    worksheet[address] = { t: 's', v: '' };
                }
                
                worksheet[address].s = {
                    font: { name: 'Arial', sz: 10, color: { rgb: "333333" } },
                    alignment: { vertical: "center", horizontal: "left" }
                };

                if (R === 0) {
                    worksheet[address].s = {
                        font: { name: 'Arial', sz: 16, bold: true, color: { rgb: "FFFFFF" } },
                        fill: { patternType: "solid", fgColor: { rgb: "6B21A8" } },
                        alignment: { horizontal: "center", vertical: "center" }
                    };
                } else if (R === 1) {
                    worksheet[address].s.font = { name: 'Arial', sz: 10, italic: true, color: { rgb: "666666" } };
                    worksheet[address].s.alignment = { horizontal: "center" };
                } else if (R >= 3 && R <= 8 && C === 0) {
                    if (R === 3) {
                         worksheet[address].s.font = { name: 'Arial', sz: 11, bold: true, color: { rgb: "6B21A8" } };
                    } else {
                         worksheet[address].s.font = { name: 'Arial', sz: 10, bold: true, color: { rgb: "333333" } };
                    }
                } else if (R >= 4 && R <= 8 && C === 1) {
                     worksheet[address].s.font = { name: 'Arial', sz: 10, bold: true, color: { rgb: "111827" } };
                } else if (R === 10) {
                    worksheet[address].s = {
                        fill: { patternType: 'solid', fgColor: { rgb: "F3E8FF" } },
                        font: { name: 'Arial', sz: 10, bold: true, color: { rgb: "6B21A8" } },
                        alignment: { vertical: "center", horizontal: "center" },
                        border: {
                            top: { style: 'thin', color: { rgb: "E9D5FF" } },
                            bottom: { style: 'thin', color: { rgb: "E9D5FF" } }
                        }
                    };
                } else if (R > 10) {
                    worksheet[address].s.border = {
                        bottom: { style: 'thin', color: { rgb: "F3F4F6" } }
                    };
                    if (C === 4 || C === 5) {
                        worksheet[address].s.alignment = { horizontal: "center" };
                    }
                }
            }
        }

        worksheet['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 11 }];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const cleanName = activePeriodStr.replace(/[^a-zA-Z0-9]/g, '_');
        await downloadExcel(excelBuffer, `Commove_Report_${cleanName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleEventDownload = async (eventData: any, periodKey: string) => {
        const wsData: any[][] = [];
        
        // Report Header
        wsData.push(["COMMOVE EVENT PARTICIPATION REPORT", "", "", "", "", "", "", ""]);
        wsData.push([`Generated on: ${new Date().toLocaleString()}`, "", "", "", "", "", "", ""]);
        wsData.push([]);
        
        // Parameters
        wsData.push(["EVENT DETAILS", "", "", "", "", "", "", ""]);
        wsData.push(["Event Name:", eventData.event.name, "", "", "", "", "", ""]);
        wsData.push(["Time Period:", periodKey, "", "", "", "", "", ""]);
        
        const selectedAges = Object.entries(ageGroups).filter(([_, v]) => v).map(([k]) => k).join(', ') || 'None';
        wsData.push(["Age Groups:", selectedAges, "", "", "", "", "", "", ""]);
        wsData.push(["Sex:", sexFilter, "", "", "", "", "", "", ""]);
        wsData.push(["Total Participants:", eventData.participants.length, "", "", "", "", "", "", ""]);
        wsData.push([]);

        // Data Header
        wsData.push(["Period", "Event", "Name", "Email", "Age", "Sex", "Contact Number", "Block/House/Room No.", "Street Address"]);

        // Data Rows
        if (eventData.participants.length === 0) {
            wsData.push([
                periodKey,
                eventData.event.name,
                'No Participants',
                '', '', '', '', '', ''
            ]);
        } else {
            eventData.participants.forEach((p: any) => {
                const { blockHouse, street } = splitAddress(p.address || '');
                wsData.push([
                    periodKey,
                    eventData.event.name,
                    p.name,
                    p.email,
                    calculateAge(p.birthday),
                    p.sex,
                    p.contactNumber || '',
                    blockHouse,
                    street
                ]);
            });
        }

        // Create Worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(wsData);

        // Styling
        worksheet['!cols'] = [
            { wch: 15 }, // Period
            { wch: 30 }, // Event
            { wch: 25 }, // Name
            { wch: 35 }, // Email
            { wch: 10 }, // Age
            { wch: 10 }, // Sex
            { wch: 20 }, // Contact Number
            { wch: 25 }, // Block/House/Room No.
            { wch: 40 }  // Street Address
        ];

        worksheet['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, // Title
            { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }, // Generated on
            { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } }, // Parameters Title
        ];

        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:H1');
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const address = XLSX.utils.encode_cell({ r: R, c: C });
                if (!worksheet[address]) {
                    worksheet[address] = { t: 's', v: '' };
                }
                
                worksheet[address].s = {
                    font: { name: 'Arial', sz: 10, color: { rgb: "333333" } },
                    alignment: { vertical: "center", horizontal: "left" }
                };

                if (R === 0) {
                    worksheet[address].s = {
                        font: { name: 'Arial', sz: 16, bold: true, color: { rgb: "FFFFFF" } },
                        fill: { patternType: "solid", fgColor: { rgb: "6B21A8" } },
                        alignment: { horizontal: "center", vertical: "center" }
                    };
                } else if (R === 1) {
                    worksheet[address].s.font = { name: 'Arial', sz: 10, italic: true, color: { rgb: "666666" } };
                    worksheet[address].s.alignment = { horizontal: "center" };
                } else if (R >= 3 && R <= 8 && C === 0) {
                    if (R === 3) {
                         worksheet[address].s.font = { name: 'Arial', sz: 11, bold: true, color: { rgb: "6B21A8" } };
                    } else {
                         worksheet[address].s.font = { name: 'Arial', sz: 10, bold: true, color: { rgb: "333333" } };
                    }
                } else if (R >= 4 && R <= 8 && C === 1) {
                     worksheet[address].s.font = { name: 'Arial', sz: 10, bold: true, color: { rgb: "111827" } };
                } else if (R === 10) {
                    worksheet[address].s = {
                        fill: { patternType: 'solid', fgColor: { rgb: "F3E8FF" } },
                        font: { name: 'Arial', sz: 10, bold: true, color: { rgb: "6B21A8" } },
                        alignment: { vertical: "center", horizontal: "center" },
                        border: {
                            top: { style: 'thin', color: { rgb: "E9D5FF" } },
                            bottom: { style: 'thin', color: { rgb: "E9D5FF" } }
                        }
                    };
                } else if (R > 10) {
                    worksheet[address].s.border = {
                        bottom: { style: 'thin', color: { rgb: "F3F4F6" } }
                    };
                    if (C === 4 || C === 5) {
                        worksheet[address].s.alignment = { horizontal: "center" };
                    }
                }
            }
        }

        worksheet['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 11 }];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Event Report");

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const cleanName = eventData.event.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        await downloadExcel(excelBuffer, `Commove_Event_${cleanName}_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mt-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Generate Reports</h2>
                <button 
                    onClick={handleDownload}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    Download Excel
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Period Selection */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Time Period</h3>
                    <div className="flex flex-col gap-2">
                        {['this_month', 'previous_month', 'monthly', 'quarterly', 'yearly'].map(p => (
                            <label key={p} className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="period" 
                                    value={p} 
                                    checked={period === p} 
                                    onChange={() => setPeriod(p as any)}
                                    className="text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{p.replace('_', ' ')}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Age Group Selection */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Age Group</h3>
                    <div className="flex flex-col gap-2">
                        {['Child', 'Teen', 'Adult', 'Middle Age', 'Senior'].map(group => (
                            <label key={group} className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={ageGroups[group]} 
                                    onChange={() => handleAgeGroupChange(group)}
                                    className="text-primary-600 focus:ring-primary-500 rounded"
                                />
                                <span className="text-sm text-gray-600 dark:text-gray-400">{group}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Sex Selection */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Sex</h3>
                    <div className="flex flex-col gap-2">
                        {['All', 'Female', 'Male', 'Others'].map(s => (
                            <label key={s} className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="sex" 
                                    value={s} 
                                    checked={sexFilter === s} 
                                    onChange={() => setSexFilter(s as any)}
                                    className="text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-sm text-gray-600 dark:text-gray-400">{s}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* Report Results */}
            <div className="mt-8">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Report Results</h3>
                
                {reportData.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No data available for the selected filters.</p>
                ) : (
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        {/* Custom Dropdown Header */}
                        <div className="flex flex-col gap-3 p-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 sm:flex-row sm:justify-between sm:items-center sm:gap-4">
                            <div className="flex items-center gap-2">
                                {period !== 'yearly' && (
                                    <select 
                                        value={selectedPart1}
                                        onChange={(e) => setSelectedPart1(e.target.value)}
                                        className="bg-white border border-gray-300 text-gray-700 text-sm rounded focus:ring-primary-500 focus:border-primary-500 block py-1.5 px-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                                    >
                                        {(period === 'quarterly' ? ALL_QUARTERS : ALL_MONTHS).map(p1 => (
                                            <option key={p1} value={p1}>{p1}</option>
                                        ))}
                                    </select>
                                )}
                                <select 
                                    value={selectedPart2}
                                    onChange={(e) => setSelectedPart2(e.target.value)}
                                    className="bg-white border border-gray-300 text-gray-700 text-sm rounded focus:ring-primary-500 focus:border-primary-500 block py-1.5 px-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                                >
                                    {ALL_YEARS.map(p2 => (
                                        <option key={p2} value={p2}>{p2}</option>
                                    ))}
                                </select>
                            </div>
                            
                            {(() => {
                                const activePeriodStr = selectedPart1 ? `${selectedPart1} ${selectedPart2}` : selectedPart2;
                                const activeData = reportData.find(d => d.period === activePeriodStr);
                                return (
                                    <span className="bg-primary-100 text-primary-800 text-sm font-bold px-4 py-2 rounded-full shrink-0">
                                        {activeData ? activeData.participantCount : 0} Participants
                                    </span>
                                );
                            })()}
                        </div>
                        
                        {/* Events List */}
                        <div className="p-4 space-y-3">
                            {(() => {
                                const activePeriodStr = selectedPart1 ? `${selectedPart1} ${selectedPart2}` : selectedPart2;
                                const activeData = reportData.find(d => d.period === activePeriodStr);
                                
                                if (!activeData || activeData.events.length === 0) {
                                    return <p className="text-gray-500 dark:text-gray-400 text-sm italic">No events found for this selected combination.</p>;
                                }

                                return activeData.events.map(eventData => (
                                    <div key={eventData.event.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-2 md:flex-row md:justify-between md:items-center">
                                        <div className="min-w-0">
                                            <h5 className="font-semibold text-gray-800 dark:text-gray-200 text-sm leading-snug">
                                                {eventData.event.name}
                                            </h5>
                                            <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
                                                {eventData.participants.length} Participant{eventData.participants.length !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEventDownload(eventData, activeData.period);
                                            }}
                                            className="w-full md:w-auto text-xs bg-primary-600 hover:bg-primary-700 text-white px-3 py-2 rounded-lg font-medium transition-colors shrink-0 active:scale-95"
                                        >
                                            Download Excel
                                        </button>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminReports;
