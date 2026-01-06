/**
 * Date utility functions
 */

/**
 * Gets today's date in ISO format (YYYY-MM-DD)
 */
export function getTodayDate(): string {
    return new Date().toISOString().split("T")[0];
}

/**
 * Gets a date N years ago in ISO format
 */
export function getDateYearsAgo(years: number): string {
    const date = new Date();
    date.setFullYear(date.getFullYear() - years);
    return date.toISOString().split("T")[0];
}

/**
 * Calculates years between two dates
 */
export function calculateYears(startDate: string, endDate: string): number {
    return (new Date(endDate).getTime() - new Date(startDate).getTime()) / (365.25 * 86400000);
}

/**
 * Gets the date one year from today (same date next year)
 */
export function getDateOneYearFromToday(): string {
    const today = new Date();
    const nextYear = new Date(today);
    nextYear.setFullYear(today.getFullYear() + 1);
    return nextYear.toISOString().split("T")[0];
}

/**
 * Calculates the number of trading days between two dates
 * Excludes weekends (Saturday and Sunday)
 * Approximates trading days (doesn't account for holidays, but gives a good estimate)
 */
export function calculateTradingDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let tradingDays = 0;
    const current = new Date(start);
    
    while (current <= end) {
        const dayOfWeek = current.getDay();
        // Count only weekdays (Monday = 1, Friday = 5)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            tradingDays++;
        }
        current.setDate(current.getDate() + 1);
    }
    
    return tradingDays;
}

/**
 * Calculates trading days from today to the same date next year
 */
export function getTradingDaysForNextYear(): number {
    const today = getTodayDate();
    const nextYear = getDateOneYearFromToday();
    return calculateTradingDays(today, nextYear);
}

/**
 * Gets yesterday's date (previous trading day) in ISO format
 */
export function getYesterdayDate(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    // If yesterday is weekend, go back to Friday
    while (yesterday.getDay() === 0 || yesterday.getDay() === 6) {
        yesterday.setDate(yesterday.getDate() - 1);
    }
    return yesterday.toISOString().split("T")[0];
}

