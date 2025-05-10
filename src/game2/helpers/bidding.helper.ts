import { CompanyPricing, SharesBid, BiddingOutput } from '../db';
import { Transaction } from 'sequelize';
import { upsertInvestorAllocation } from './allocation.helper';

/**
 * Calculate bidding output for a company
 */
export const calculateBiddingOutput = async (
  sessionId: string,
  companyName: string,
  transaction?: Transaction
): Promise<BiddingOutput> => {
  // Get company pricing data
  const companyPricing = await CompanyPricing.findOne({
    where: { sessionId, companyName },
    transaction
  });

  if (!companyPricing) {
    throw new Error(`Company ${companyName} not found in pricing data`);
  }

  // Get all bids for this company
  const bids = await SharesBid.findAll({
    where: { sessionId, companyName },
    transaction
  });

  // Calculate total shares bid for
  const sharesBidFor = bids.reduce((sum, bid) => sum + bid.bids, 0);

  // Calculate capital raised and subscription status
  let capitalRaised = 0;
  let subscription: 'Under' | 'Over' = 'Under';

  if (sharesBidFor <= companyPricing.shares) {
    // Under or equal subscription - allocate all bids
    capitalRaised = sharesBidFor * companyPricing.price;
    subscription = sharesBidFor === companyPricing.shares ? 'Over' : 'Under';

    // Create allocations for each bid
    for (const bid of bids) {
      await upsertInvestorAllocation(sessionId, {
        investorName: bid.investorName,
        companyName: bid.companyName,
        bidAmount: bid.bids,
        allocatedAmount: bid.bids,
        allocationRatio: 1.0
      }, transaction);
    }
  } else {
    // Over subscription - allocate proportionally
    subscription = 'Over';
    const allocationRatio = companyPricing.shares / sharesBidFor;

    // Create allocations for each bid
    for (const bid of bids) {
      const allocatedAmount = Math.floor(bid.bids * allocationRatio);
      await upsertInvestorAllocation(sessionId, {
        investorName: bid.investorName,
        companyName: bid.companyName,
        bidAmount: bid.bids,
        allocatedAmount,
        allocationRatio
      }, transaction);
      capitalRaised += allocatedAmount * companyPricing.price;
    }
  }

  // Create or update bidding output
  const [biddingOutput] = await BiddingOutput.findOrCreate({
    where: { sessionId, companyName },
    defaults: {
      sessionId,
      companyName,
      sharesBidFor,
      capitalRaised,
      subscription
    },
    transaction
  });

  if (biddingOutput) {
    await biddingOutput.update({
      sharesBidFor,
      capitalRaised,
      subscription
    }, { transaction });
  }

  return biddingOutput;
};

/**
 * Calculate bidding outputs for all companies in a session
 */
export const calculateAllBiddingOutputs = async (
  sessionId: string,
  transaction?: Transaction
): Promise<BiddingOutput[]> => {
  // Get all companies from pricing data
  const companies = await CompanyPricing.findAll({
    where: { sessionId },
    attributes: ['companyName'],
    transaction
  });

  // Calculate output for each company
  const outputs = await Promise.all(
    companies.map(company => 
      calculateBiddingOutput(sessionId, company.companyName, transaction)
    )
  );

  return outputs;
}; 