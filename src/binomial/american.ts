export type OptionParameters = {
  spotPrice: number;
  strikePrice: number;
  /**
   * Measured in years from the present
   */
  expiration: number;

  volatility: number;
  interestRate: number;
  type: "call" | "put";
};

export type AmericanOptionParameters = {
  dividends: Dividend[];
  periods: number;
};

export interface Dividend {
  /**
   * The time measured in years from today, where 0 is now and 1 is a year from now.
   */
  time: number;
  dividend: number;
}

function priceAmericanOption(
  tree: PricingTree,
  optionParams: OptionParameters,
  node: PricingNode = tree.root,
  cache: Map<PricingNode, number> = new Map()
): number {
  const { strikePrice } = optionParams;
  const { p, pvFactor } = tree;
  if (node.isLeaf()) {
    return optionParams.type === "call"
      ? Math.max(node.spotPrice - strikePrice, 0)
      : Math.max(strikePrice - node.spotPrice, 0);
  }

  let upPrice = cache.get(node.up!);
  if (upPrice === undefined) {
    upPrice = priceAmericanOption(tree, optionParams, node.up!, cache);
    cache.set(node.up!, upPrice);
  }

  let downPrice = cache.get(node.down!);
  if (downPrice === undefined) {
    downPrice = priceAmericanOption(tree, optionParams, node.down!, cache);
    cache.set(node.down!, downPrice);
  }

  return (p * upPrice + (1 - p) * downPrice) * pvFactor;
}

class PricingNode {
  readonly spotPrice: number;
  readonly depth: number;
  /**
   * The time is measured from 0 being today to 1 being a year from now.
   */
  readonly time: number;

  constructor(spotPrice: number, depth: number, time: number) {
    this.spotPrice = spotPrice;
    this.depth = depth;
    this.time = time;
  }

  up?: PricingNode;
  down?: PricingNode;

  isLeaf() {
    return this.up === undefined;
  }
}

interface PricingTree {
  readonly root: PricingNode;
  /**
   * The risk neutral probability of an up move in the tree
   */
  readonly p: number;
  readonly depth: number;
  /**
   * The present value factor.
   *
   * Essentially
   *
   * ```
   * exp(-r * Δt)
   * ```
   *
   * Cached to avoid repeating this calculation.
   */
  readonly pvFactor: number;
}

export function round(x: number) {
  return Math.floor(x * 100) / 100;
}

export function generateTree(
  {
    spotPrice,
    expiration: t,
    volatility: σ,
    interestRate: r,
  }: OptionParameters,
  { periods: n, dividends }: AmericanOptionParameters
): PricingTree {
  if (n <= 0) {
    throw new Error(`Periods must be >= 1 but was ${n}`);
  }

  const nodesIndex: Map<number, Map<number, PricingNode>> = new Map();
  function getNode(depth: number, spotPrice: number): PricingNode | undefined {
    return nodesIndex.get(depth)?.get(spotPrice);
  }
  function setNode(node: PricingNode) {
    if (!nodesIndex.has(node.depth)) {
      nodesIndex.set(node.depth, new Map());
    }
    nodesIndex.get(node.depth)!.set(node.spotPrice, node);
    return node;
  }

  /**
   * The factor by which the underlying grows on every iteration.
   * u stands for up and is a "well known variable" in most text books on option pricing.
   */
  const u = Math.exp(σ * Math.sqrt(t / n));
  /**
   * The factor by which the underlying drops on every iteration.
   * d stands for down and is a "well known variable" in most text books on option pricing.
   */
  const d = 1 / u;

  if (u === d) {
    throw new Error(`u === d: ${σ}, ${t}, ${n}. `);
  }

  const p = (1 + (r * t) / n - d) / (u - d);
  /**
   * The fraction of time that increments between each level of nodes in the tree
   *
   * e.g. if t = 1 and n = 365, then this value will be 1/365 years = 1 day
   */
  const Δt = t / n;
  const pvFactor = Math.exp(-r * Δt);

  function getOrCreateNode(node: PricingNode, spotChange: number) {
    const newDepth = node.depth + 1;
    const newTime = node.time + Δt;
    const possibleDividend =
      dividends.find((d) => node.time < d.time && d.time <= newTime)
        ?.dividend ?? 0;

    const newSpotPrice = round(
      (node.spotPrice - possibleDividend) * spotChange
    );
    const existingNode = getNode(newDepth, newSpotPrice);
    if (existingNode) {
      return existingNode;
    }
    const newNode = new PricingNode(newSpotPrice, newDepth, newTime);
    return setNode(newNode);
  }

  const root = new PricingNode(spotPrice, 0 /* depth */, 0 /* time */);
  setNode(root);

  const stack = [root];
  while (stack.length > 0) {
    const head = stack.pop()!;

    if (head.depth < n) {
      head.up = getOrCreateNode(head, u);
      head.down = getOrCreateNode(head, d);
      stack.push(head.up, head.down);
    }
  }

  return {
    root,
    p,
    depth: n,
    pvFactor,
  };
}

/**
 * Calculates the price of an american put or call
 */
export function american(
  optionParameters: OptionParameters,
  americanOptionParameters: AmericanOptionParameters
): number {
  const tree = generateTree(optionParameters, americanOptionParameters);

  return priceAmericanOption(tree, optionParameters);
}
