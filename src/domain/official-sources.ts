export interface OfficialSource {
  label: string;
  url: string;
}

/** Official US consumer resources. Linked, never paraphrased into universal rules. */
export const OFFICIAL_SOURCES = {
  ftcReturns: {
    label: 'FTC — Returns, refunds and other resolutions',
    url: 'https://consumer.ftc.gov/articles/solving-problems-business-returns-refunds-and-other-resolutions',
  },
  cfpbRefund: {
    label: 'CFPB — Getting a refund on a credit card purchase',
    url: 'https://www.consumerfinance.gov/ask-cfpb/how-can-i-get-a-refund-on-a-product-or-service-i-purchased-with-my-credit-card-en-1969/',
  },
  cfpbDispute: {
    label: 'CFPB — Disputing a charge on your credit card bill',
    url: 'https://www.consumerfinance.gov/ask-cfpb/how-do-i-dispute-a-charge-on-my-credit-card-bill-en-61/',
  },
} as const satisfies Record<string, OfficialSource>;
