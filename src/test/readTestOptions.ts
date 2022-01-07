import fs from "fs";
import assert from "assert";
import { yearsDiff } from "../util/yearsDiff";
import { TestOption } from "./TestOption";

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
  assert(!!x, "Failed to parse date:" + x);
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
    trade_volume: parseFloat,
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
    trade_volume: number;
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
        trade_volume: tradeVolume,
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
        tradeVolume,
        days: Math.floor(yearsDiff(quoteDate, expiration) * 365),
      };
    }
  );
}

export function readTestOptions(): TestOption[] {
  const options = loadUnderlyingOptionsEODCalc().filter(
    (o) =>
      o.bid > 0 &&
      o.ask > 0 &&
      o.open > 0 &&
      o.high > 0 &&
      o.iv < 1.5 &&
      yearsDiff(o.quoteDate, o.expiration) > 5 / 365 &&
      o.delta < 0.95 &&
      o.delta > -0.95 &&
      o.tradeVolume > 50
  );

  return options;
}
