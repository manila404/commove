import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import type { EventType, User } from '../types';

interface AdminReportsProps {
    events: EventType[];
    users: User[];
}

const AdminReports: React.FC<AdminReportsProps> = ({ events, users }) => {
    const [period, setPeriod] = useState<'this_month' | 'previous_month' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
    const [ageGroups, setAgeGroups] = useState<Record<string, boolean>>({
        'Child': true,
        'Teen': true,
        'Adult': true,
        'Middle Age': true,
        'Senior': true
    });
    const [sexFilter, setSexFilter] = useState<'All' | 'Female' | 'Male' | 'Others'>('All');

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
                    const hasParticipated = user.checkedInEventIds?.includes(event.id);
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

    const handleAgeGroupChange = (group: string) => {
        setAgeGroups(prev => ({ ...prev, [group]: !prev[group] }));
    };

    const handleDownload = () => {
        const worksheetData = reportData.flatMap(data => 
            data.events.flatMap(eventData => {
                if (eventData.participants.length === 0) {
                    return [{
                        Period: data.period,
                        Event: eventData.event.name,
                        Name: 'No Participants',
                        Email: '',
                        Age: null,
                        Sex: ''
                    }];
                }
                return eventData.participants.map(p => ({
                    Period: data.period,
                    Event: eventData.event.name,
                    Name: p.name,
                    Email: p.email,
                    Age: calculateAge(p.birthday),
                    Sex: p.sex
                }));
            })
        );

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        const cleanName = period.charAt(0).toUpperCase() + period.slice(1);
        link.setAttribute('download', `Commove_${cleanName}_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    const handleEventDownload = (eventData: any, periodKey: string) => {
        const worksheetData = eventData.participants.length === 0 ? [{
            Period: periodKey,
            Event: eventData.event.name,
            Name: 'No Participants',
            Email: '',
            Age: null,
            Sex: ''
        }] : eventData.participants.map((p: any) => ({
            Period: periodKey,
            Event: eventData.event.name,
            Name: p.name,
            Email: p.email,
            Age: calculateAge(p.birthday),
            Sex: p.sex
        }));

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Event Report");

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        const cleanName = eventData.event.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        link.setAttribute('download', `Commove_Event_${cleanName}_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
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
                    <div className="space-y-6">
                        {reportData.map(data => (
                            <div key={data.period} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-gray-800 dark:text-gray-200 text-lg">{data.period}</h4>
                                    <span className="bg-primary-100 text-primary-800 text-xs font-bold px-3 py-1 rounded-full">
                                        {data.participantCount} Participants
                                    </span>
                                </div>
                                
                                
                                <div className="space-y-3">
                                    {data.events.map(eventData => (
                                        <div key={eventData.event.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                            <h5 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                                                {eventData.event.name} <span className="text-gray-500 font-normal text-xs ml-2">({eventData.participants.length} Participants)</span>
                                            </h5>
                                            <button 
                                                onClick={() => handleEventDownload(eventData, data.period)}
                                                className="text-xs bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-900/50 px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0"
                                            >
                                                Download Excel
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminReports;
