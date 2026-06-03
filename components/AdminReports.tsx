import React, { useState, useMemo, useEffect, useRef } from 'react';
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
const ALL_YEARS = Array.from({ length: 5 }, (_, i) => (CURRENT_YEAR - 2 + i).toString());

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
    const [openDropdown, setOpenDropdown] = useState<'part1' | 'part2' | null>(null);
    const [reportPage, setReportPage] = useState(1);
    const REPORTS_PER_PAGE = 10;
    const dropdownRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

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
                    className="text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ background: '#0052A3' }}
                >
                    Download Excel
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Period Selection */}
                <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">Time Period</h3>
                    <p className="text-xs text-gray-400 mb-3">Select the reporting window</p>
                    <div className="flex flex-col gap-3">
                        {[
                            { value: 'this_month',     label: 'This Month',     desc: 'Events in the current calendar month' },
                            { value: 'previous_month', label: 'Previous Month', desc: 'Events in the month just passed' },
                            { value: 'monthly',        label: 'Monthly',        desc: 'Browse any specific month & year' },
                            { value: 'quarterly',      label: 'Quarterly',      desc: 'Q1 (Jan–Mar) · Q2 (Apr–Jun) · Q3 (Jul–Sep) · Q4 (Oct–Dec)' },
                            { value: 'yearly',         label: 'Yearly',         desc: 'All events within a full year' },
                        ].map(p => (
                            <label key={p.value} className="flex items-start gap-2.5 cursor-pointer group">
                                <input
                                    type="radio"
                                    name="period"
                                    value={p.value}
                                    checked={period === p.value}
                                    onChange={() => setPeriod(p.value as any)}
                                    className="mt-0.5 accent-[#0052A3]"
                                />
                                <div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-[#0052A3] transition-colors">{p.label}</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 leading-snug">{p.desc}</p>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Age Group Selection */}
                <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">Age Group</h3>
                    <p className="text-xs text-gray-400 mb-3">Filter participants by age range</p>
                    <div className="flex flex-col gap-3">
                        {[
                            { key: 'Child',      label: 'Child',       range: '0 – 12 years old' },
                            { key: 'Teen',       label: 'Teen',        range: '13 – 19 years old' },
                            { key: 'Adult',      label: 'Adult',       range: '20 – 39 years old' },
                            { key: 'Middle Age', label: 'Middle Age',  range: '40 – 59 years old' },
                            { key: 'Senior',     label: 'Senior',      range: '60 years old and above' },
                        ].map(group => (
                            <label key={group.key} className="flex items-start gap-2.5 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={ageGroups[group.key]}
                                    onChange={() => handleAgeGroupChange(group.key)}
                                    className="mt-0.5 rounded accent-[#0052A3]"
                                />
                                <div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-[#0052A3] transition-colors">{group.label}</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">{group.range}</p>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Sex Selection */}
                <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">Sex</h3>
                    <p className="text-xs text-gray-400 mb-3">Filter participants by biological sex</p>
                    <div className="flex flex-col gap-3">
                        {[
                            { value: 'All',    label: 'All',    desc: 'Include all sexes' },
                            { value: 'Female', label: 'Female', desc: 'Female participants only' },
                            { value: 'Male',   label: 'Male',   desc: 'Male participants only' },
                            { value: 'Others', label: 'Others', desc: 'Non-binary / prefer not to say' },
                        ].map(s => (
                            <label key={s.value} className="flex items-start gap-2.5 cursor-pointer group">
                                <input
                                    type="radio"
                                    name="sex"
                                    value={s.value}
                                    checked={sexFilter === s.value}
                                    onChange={() => setSexFilter(s.value as any)}
                                    className="mt-0.5 accent-[#0052A3]"
                                />
                                <div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-[#0052A3] transition-colors">{s.label}</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">{s.desc}</p>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

            </div>

            {/* Report Results */}
            <div className="mt-8">
                {/* Toolbar */}
                <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Report Results</h3>
                    <div className="flex items-center gap-2 ml-auto" ref={dropdownRef}>
                        {period !== 'yearly' && (
                            <div className="relative">
                                <button
                                    onClick={() => setOpenDropdown(openDropdown === 'part1' ? null : 'part1')}
                                    className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-lg py-1.5 px-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    {selectedPart1 || '—'}
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                </button>
                                {openDropdown === 'part1' && (
                                    <div className="absolute left-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-[500] overflow-hidden min-w-[130px] max-h-48 overflow-y-auto">
                                        {(period === 'quarterly' ? ALL_QUARTERS : ALL_MONTHS).map(p1 => (
                                            <button
                                                key={p1}
                                                onClick={() => { setSelectedPart1(p1); setOpenDropdown(null); setReportPage(1); }}
                                                className={`w-full text-left px-3 py-2 text-sm transition-colors ${selectedPart1 === p1 ? 'bg-[#8b5cf6] text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                            >
                                                {p1}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="relative">
                            <button
                                onClick={() => setOpenDropdown(openDropdown === 'part2' ? null : 'part2')}
                                className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-lg py-1.5 px-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                {selectedPart2 || '—'}
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            {openDropdown === 'part2' && (
                                <div className="absolute left-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-[500] overflow-hidden min-w-[90px] max-h-48 overflow-y-auto">
                                    {ALL_YEARS.map(p2 => (
                                        <button
                                            key={p2}
                                            onClick={() => { setSelectedPart2(p2); setOpenDropdown(null); setReportPage(1); }}
                                            className={`w-full text-left px-3 py-2 text-sm transition-colors ${selectedPart2 === p2 ? 'bg-[#8b5cf6] text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                        >
                                            {p2}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {(() => {
                            const activePeriodStr = selectedPart1 ? `${selectedPart1} ${selectedPart2}` : selectedPart2;
                            const activeData = reportData.find(d => d.period === activePeriodStr);
                            return (
                                <span className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0" style={{ background: '#EBF2FF', color: '#0052A3', border: '1px solid #0052A3' }}>
                                    {activeData ? activeData.participantCount : 0} Participants
                                </span>
                            );
                        })()}
                    </div>
                </div>

                {reportData.length === 0 ? (
                    <p className="text-gray-400 dark:text-gray-500 text-sm">No data available for the selected filters.</p>
                ) : (
                    <div className="bg-white dark:bg-[#111827] overflow-hidden">
                        {(() => {
                            const activePeriodStr = selectedPart1 ? `${selectedPart1} ${selectedPart2}` : selectedPart2;
                            const activeData = reportData.find(d => d.period === activePeriodStr);

                            return (
                                <>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-100 dark:bg-gray-800/60">
                                            <th className="py-3.5 px-4 text-left text-sm font-semibold text-gray-500 dark:text-gray-400">Event Name</th>
                                            <th className="py-3.5 px-4 text-left text-sm font-semibold text-gray-500 dark:text-gray-400">Date</th>
                                            <th className="py-3.5 px-4 text-left text-sm font-semibold text-gray-500 dark:text-gray-400">Participants</th>
                                            <th className="py-3.5 px-4 text-right text-sm font-semibold text-gray-500 dark:text-gray-400">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                        {!activeData || activeData.events.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="text-center text-gray-400 dark:text-gray-500 py-12 text-sm italic">No events found for this period.</td>
                                            </tr>
                                        ) : (
                                            (() => {
                                                const totalPages = Math.max(1, Math.ceil(activeData.events.length / REPORTS_PER_PAGE));
                                                const safePage = Math.min(reportPage, totalPages);
                                                const paged = activeData.events.slice((safePage - 1) * REPORTS_PER_PAGE, safePage * REPORTS_PER_PAGE);
                                                return paged.map(eventData => {
                                                    const eventDate = new Date(eventData.event.date);
                                                    const formattedDate = isNaN(eventDate.getTime()) ? '—' : eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                                    return (
                                                        <tr key={eventData.event.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                                            <td className="py-3.5 px-4">
                                                                <p className="font-semibold text-gray-900 dark:text-white">{eventData.event.name}</p>
                                                            </td>
                                                            <td className="py-3.5 px-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                                {formattedDate}
                                                            </td>
                                                            <td className="py-3.5 px-4">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold" style={{ background: '#EBF2FF', color: '#0052A3', border: '1px solid #0052A3' }}>
                                                                    {eventData.participants.length} {eventData.participants.length === 1 ? 'Participant' : 'Participants'}
                                                                </span>
                                                            </td>
                                                            <td className="py-3.5 px-4 text-right">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleEventDownload(eventData, activeData.period); }}
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors active:scale-95"
                                                                    style={{ background: '#0052A3' }}
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                                    Download Excel
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                });
                                            })()
                                        )}
                                    </tbody>
                                </table>
                                {/* Pagination */}
                                {activeData && activeData.events.length > REPORTS_PER_PAGE && (() => {
                                    const totalPages = Math.ceil(activeData.events.length / REPORTS_PER_PAGE);
                                    const safePage = Math.min(reportPage, totalPages);
                                    return (
                                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Showing {((safePage - 1) * REPORTS_PER_PAGE) + 1}–{Math.min(safePage * REPORTS_PER_PAGE, activeData.events.length)} of {activeData.events.length} events
                                            </p>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => setReportPage(p => Math.max(1, p - 1))}
                                                    disabled={safePage === 1}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                                >← Prev</button>
                                                <span className="text-xs text-gray-500 px-2">{safePage} / {totalPages}</span>
                                                <button
                                                    onClick={() => setReportPage(p => Math.min(totalPages, p + 1))}
                                                    disabled={safePage === totalPages}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                                >Next →</button>
                                            </div>
                                        </div>
                                    );
                                })()}
                                </>
                            );
                        })()}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminReports;
