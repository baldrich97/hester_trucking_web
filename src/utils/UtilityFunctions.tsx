type YearWeekFormat = `${number}-W${number}`;

// Correctly formats a date into ISO week string
export function formatDateToWeek(date: Date): YearWeekFormat {
    const year = getISOWeekYear(date);
    const weekNumber = getISOWeekNumber(date);
    const paddedWeek = weekNumber.toString().padStart(2, '0');
    console.log('year', year, 'weeknumber', weekNumber, 'padded', paddedWeek)
    return `${year}-W${paddedWeek}` as YearWeekFormat;
}

// Get ISO Week Number
export function getISOWeekNumber(date: Date): number {
    const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    tempDate.setUTCDate(tempDate.getUTCDate() + 4 - (tempDate.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
    return Math.ceil(((tempDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// Get ISO Year (for edge cases where Jan 1 belongs to the previous year's week 52/53)
function getISOWeekYear(date: Date): number {
    const tempDate = new Date(date.getTime());
    tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
    return tempDate.getFullYear();
}
