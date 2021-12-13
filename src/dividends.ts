import { Dividend } from "./binomial/american";
import { yearsDiff } from "./util/yearsDiff";

export interface HistoricalDividend {
  /**
   * The Ex/EFF date
   */
  date: Date;
  /**
   * The absolute dividend amount.
   */
  dividend: number;
}

export function createDividends(
  dividends: HistoricalDividend[],
  date: Date
): Dividend[] {
  return dividends.map((d) => {
    return {
      time: yearsDiff(date, d.date),
      dividend: d.dividend,
    };
  });
}

export const dividends: HistoricalDividend[] = [
  { date: new Date("2021-09-17"), dividend: 1.428 }, // ul: 441.40
  { date: new Date("2021-06-18"), dividend: 1.376 },
  { date: new Date("2021-03-19"), dividend: 1.278 },
  { date: new Date("2020-12-18"), dividend: 1.58 },
  { date: new Date("2020-09-18"), dividend: 1.339 },
  { date: new Date("2020-06-19"), dividend: 1.366 },
  { date: new Date("2020-03-20"), dividend: 1.406 },
  { date: new Date("2019-12-20"), dividend: 1.57 },
  { date: new Date("2019-09-20"), dividend: 1.384 },
  { date: new Date("2019-06-21"), dividend: 1.432 },
  { date: new Date("2019-03-15"), dividend: 1.233 },
  { date: new Date("2018-12-21"), dividend: 1.435 },
  { date: new Date("2018-09-21"), dividend: 1.323 },
  { date: new Date("2018-06-15"), dividend: 1.246 },
  { date: new Date("2018-03-16"), dividend: 1.097 },
  { date: new Date("2017-12-15"), dividend: 1.351 },
  { date: new Date("2017-09-15"), dividend: 1.235 },
  { date: new Date("2017-06-16"), dividend: 1.183 },
  { date: new Date("2017-03-17"), dividend: 1.033 },
  { date: new Date("2016-12-16"), dividend: 1.329 },
  { date: new Date("2016-09-16"), dividend: 1.082 },
  { date: new Date("2016-06-17"), dividend: 1.078 },
  { date: new Date("2016-03-18"), dividend: 1.05 },
  { date: new Date("2015-12-18"), dividend: 1.212 },
  { date: new Date("2015-09-18"), dividend: 1.033 },
  { date: new Date("2015-06-19"), dividend: 1.03 },
  { date: new Date("2015-03-20"), dividend: 0.931 },
  { date: new Date("2014-12-19"), dividend: 1.135 },
  { date: new Date("2014-09-19"), dividend: 0.939 },
  { date: new Date("2014-06-20"), dividend: 0.937 },
  { date: new Date("2014-03-21"), dividend: 0.825 },
  { date: new Date("2013-12-20"), dividend: 0.98 },
  { date: new Date("2013-09-20"), dividend: 0.838 },
  { date: new Date("2013-06-21"), dividend: 0.839 },
];
