export interface TestOption {
  ask: number;
  bid: number;
  /**
   * The number of days remaining to expiration
   */
  days: number;
  delta: number;
  expiration: Date;
  high: number;
  iv: number;
  open: number;
  quoteDate: Date;
  strike: number;
  type: "put" | "call";
  ul: string;
  ulAsk: number;
  ulBid: number;
  tradeVolume: number;
}
