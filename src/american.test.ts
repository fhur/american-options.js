import fs from "fs";
import assert from "assert";
import * as binomial from "./binomial/american";
import { createDividends, dividends, HistoricalDividend } from "./dividends";
import { yearsDiff } from "./util/yearsDiff";
import { TestOption } from "./test/TestOption";
import { readTestOptions } from "./test/readTestOptions";
import {
  pricingMethodBinomial,
  pricingMethodAverageOfTwoBinomials,
} from "./test/PricingMethod";

/**
 * @returns true iff the given option is ATM, defined as the strike having difference of < 2% from underlying's midpoint.
 */
function isOptionAtm(option: TestOption): boolean {
  const ulPrice = (option.ulBid + option.ulAsk) / 2;
  return Math.abs(option.strike - ulPrice) / ulPrice < 0.02;
}

/* Randomize array in-place using Durstenfeld shuffle algorithm */
function shuffleInPlace<T>(array: Array<T>): void {
  let seed = 1234;
  function random() {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  for (var i = array.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

describe("american", () => {
  const options = readTestOptions();
  shuffleInPlace(options);

  test("setup", () => {
    // just to verify that some options are being read
    expect(options.length).toEqual(6226);
  });

  describe(`pricing methods`, () => {
    const pricingMethods = [
      pricingMethodBinomial({ periods: 11 }),
      pricingMethodAverageOfTwoBinomials({ periods: 12 }),
      pricingMethodAverageOfTwoBinomials({ periods: 12, interestRate: 0.015 }),
      pricingMethodAverageOfTwoBinomials({ periods: 12, interestRate: 0.01 }),
    ];

    const results: Array<
      TestOption & {
        pricingMethod: string;
        predictedPrice: number;
        absError: number;
        relError: number;
        relStrike: number;
      }
    > = [];

    const optionsSubset = options.slice(0, 1000);

    for (const pricingMethod of pricingMethods) {
      test(pricingMethod.name, () => {
        for (const option of optionsSubset) {
          const price = pricingMethod.price(option);
          const midpoint = (option.bid + option.ask) / 2;
          results.push({
            ...option,
            predictedPrice: price.predictedPrice,
            pricingMethod: pricingMethod.name,
            absError: price.predictedPrice - midpoint,
            relError: Math.abs(
              (2 * (price.predictedPrice - midpoint)) /
                (Math.abs(midpoint) + Math.abs(price.predictedPrice))
            ),
            relStrike: option.strike / option.ulAsk - 1,
          });
        }
      });
    }

    afterAll(() => {
      fs.writeFileSync("docs/results.json", JSON.stringify(results));
    });
  });
});
