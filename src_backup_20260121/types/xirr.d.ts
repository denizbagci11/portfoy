declare module 'xirr' {
    interface Cashflow {
        amount: number;
        when: Date;
    }
    // xirr function accepts an array of Cashflow objects and returns the rate as a number (0.1 = 10%)
    export function xirr(calculate: Cashflow[], options?: { guess?: number }): number;
}
