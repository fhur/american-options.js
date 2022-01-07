import { binomial } from "..";
import { createDividends, dividends } from "../dividends";
import { yearsDiff } from "../util/yearsDiff";
import { TestOption } from "./TestOption";

interface PricingMethod {
  name: string;
  price(option: TestOption): { predictedPrice: number };
}

export const pricingMethodAverageOfTwoBinomials = ({
  periods = 11,
  interestRate = 0.012,
}: {
  periods?: number;
  interestRate?: number;
}): PricingMethod => {
  const pricingFunction1 = pricingMethodBinomial({ periods, interestRate });
  const pricingFunction2 = pricingMethodBinomial({
    periods: periods + 1,
    interestRate,
  });
  return {
    name: `avg 2 binomials (p=${periods}, i=${interestRate})`,
    price: (option) => {
      const price1 = pricingFunction1.price(option);
      const price2 = pricingFunction2.price(option);
      return {
        predictedPrice: (price1.predictedPrice + price2.predictedPrice) / 2,
      };
    },
  };
};

export const pricingMethodBinomial = ({
  periods = 11,
  interestRate = 0.012,
}: {
  periods?: number;
  interestRate?: number;
}): PricingMethod => {
  return {
    name: `binomial (periods: ${periods})`,
    price: (option) => {
      const spotPrice = (option.ulBid + option.ulAsk) / 2;
      const expiration = yearsDiff(option.quoteDate, option.expiration);

      const price = binomial.american(
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

      return {
        predictedPrice: price,
      };
    },
  };
};
