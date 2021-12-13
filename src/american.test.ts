import fs from "fs";
import assert from "assert";
import { Dividend } from "./binomial/american";
import * as binomial from "./binomial/american";
import { createDividends, dividends, HistoricalDividend } from "./dividends";
import { yearsDiff } from "./util/yearsDiff";

interface Parser {
  parser: (cell: string) => any;
  column: string;
}

function loadCsv<T extends Record<string, (str: string) => any>>(
  path: string,
  columns: T
): { [k in keyof T]: any }[] {
  const file = fs.readFileSync(path).toString();

  const [header, ...rows] = file.split("\n").map((line) => {
    return line
      .trim()
      .split(",")
      .map((row) => row.trim());
  });

  function getParser(columnIndex: number): Parser | undefined {
    const column = header[columnIndex];
    assert(column !== undefined);
    const parser = columns[header[columnIndex]];
    if (!parser) {
      return undefined;
    }
    return {
      parser,
      column,
    };
  }

  const parsedRows: Record<string, any> = rows.map((row: string[]) => {
    const parsedRow: Record<string, any> = {};
    for (let i = 0; i < row.length; i++) {
      const p = getParser(i);
      if (!p) {
        continue;
      }
      const { parser, column } = p;
      parsedRow[column] = parser(row[i]);
    }
    return parsedRow;
  });

  return parsedRows as { [k in keyof T]: any }[];
}

function parseString(x: string) {
  return x;
}

function parseOptionType(x: string): string {
  if (x === "P") {
    return "put";
  } else if (x === "C") {
    return "call";
  }
  throw new Error(`Unable to parse ${x} into put or call`);
}

function parseDate(x: string): Date {
  return new Date(x);
}

function loadUnderlyingOptionsEODCalc() {
  const dirs = fs.readdirSync("./resources");
  const columns = {
    underlying_symbol: parseString,
    quote_date: parseDate,
    expiration: parseDate,
    strike: parseFloat,
    option_type: parseOptionType,
    underlying_bid_1545: parseFloat,
    underlying_ask_1545: parseFloat,
    delta_1545: parseFloat,
    open: parseFloat,
    high: parseFloat,
    bid_1545: parseFloat,
    ask_1545: parseFloat,
    implied_volatility_1545: parseFloat,
  };
  const rawLines: {
    underlying_symbol: string;
    quote_date: Date;
    expiration: Date;
    strike: number;
    option_type: "put" | "call";
    underlying_bid_1545: number;
    underlying_ask_1545: number;
    delta_1545: number;
    bid_1545: number;
    ask_1545: number;
    open: number;
    high: number;
    implied_volatility_1545: number;
  }[] = dirs.flatMap((file) => loadCsv(`./resources/${file}`, columns));

  return rawLines.map(
    (
      {
        underlying_symbol: ul,
        quote_date: quoteDate,
        expiration,
        strike,
        option_type: type,
        underlying_bid_1545: ulBid,
        underlying_ask_1545: ulAsk,
        delta_1545: delta,
        bid_1545: bid,
        ask_1545: ask,
        open,
        high,
        implied_volatility_1545: iv,
      },
      i
    ) => {
      return {
        ul,
        quoteDate,
        expiration,
        strike,
        type,
        ulBid,
        ulAsk,
        delta,
        bid,
        open,
        high,
        ask,
        iv,
      };
    }
  );
}

const options = loadUnderlyingOptionsEODCalc().filter(
  (o) =>
    o.bid > 0 &&
    o.ask > 0 &&
    o.open > 0 &&
    o.high > 0 &&
    o.iv < 1.5 &&
    yearsDiff(o.quoteDate, o.expiration) > 5 / 365 &&
    o.delta < 0.95 &&
    o.delta > -0.95
);

interface TestFn {
  name: string;
  errors: number;
  test(actualPrice: number, expectedBid: number, expectedAsk: number): boolean;
}

function runTests(opts: typeof options) {
  const tests: TestFn[] = [
    // {
    //   name: "Actual price is inside the bid/ask",
    //   test: (actualPrice, bid, ask) => bid < actualPrice && actualPrice < ask,
    //   errors: 0,
    // },
    {
      name: "Actual price is near the midpoint",
      test: (actualPrice, bid, ask) => {
        const midpoint = (bid + ask) / 2;

        const absDiff = Math.abs(actualPrice - midpoint);
        const relDiff = Math.abs(actualPrice / midpoint - 1);

        const res = absDiff < 0.05 || relDiff < 0.05;

        return res;
      },
      errors: 0,
    },
  ];

  for (const option of opts) {
    const spotPrice = (option.ulBid + option.ulAsk) / 2;
    const expiration = yearsDiff(option.quoteDate, option.expiration);
    const interestRate = 0.012;
    const periods = 11;
    const price1 = binomial.american(
      {
        type: option.type,
        expiration,
        interestRate,
        spotPrice,
        strikePrice: option.strike,
        volatility: option.iv,
      },
      {
        periods,
        dividends: createDividends(dividends, option.quoteDate),
      }
    );
    const price2 = binomial.american(
      {
        type: option.type,
        expiration,
        interestRate,
        spotPrice,
        strikePrice: option.strike,
        volatility: option.iv,
      },
      {
        periods: periods + 1,
        dividends: createDividends(dividends, option.quoteDate),
      }
    );
    if (isNaN(price1)) {
      throw new Error(JSON.stringify({ price1, option }));
    }
    expect(price1).not.toBeNaN();
    expect(price2).not.toBeNaN();
    const price = (price1 + price2) / 2;

    for (const test of tests) {
      if (!test.test(price, option.bid, option.ask)) {
        test.errors += 1;
      }
    }
  }

  for (const t of tests) {
    test(t.name, () => {
      expect(t.errors / opts.length).toEqual(0);
    });
  }
}

describe("american", () => {
  const longDatedOptions = options.filter((o) => {
    const years = yearsDiff(o.quoteDate, o.expiration);
    return years > 1;
  });

  const shortDatedOptions = options
    .filter((o) => {
      const years = yearsDiff(o.quoteDate, o.expiration);
      return years <= 1;
    })
    .filter((_, i) => i % 17 === 0);

  test("setup", () => {
    expect(options.length).toEqual(13937);
  });

  describe(`long dated calls: ${longDatedOptions.length}`, () => {
    runTests(longDatedOptions);
  });

  describe(`short dated calls: ${shortDatedOptions.length}`, () => {
    runTests(shortDatedOptions);
  });
});
