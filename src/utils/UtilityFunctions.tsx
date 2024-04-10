type YearWeekFormat = `${number}-W${number}`;


export function formatDateToWeek(date: Date): YearWeekFormat {
    const year = date.getFullYear();
    const weekNumber = getWeekNumber(date);
    let returnable = `${year}-W`;
    if (weekNumber < 10) {
        returnable += `0${weekNumber}`;
    } else {
        returnable += weekNumber;
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return returnable;
}

export function getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const millisecondsInDay = 86400000;
    const currentDayOfYear = Math.ceil(
        (date.getTime() - firstDayOfYear.getTime()) / millisecondsInDay
    );
    return Math.ceil(currentDayOfYear / 7);
}