import chalk from "chalk";
import { BiddingOutput } from "../db/models/BiddingOutput";
import { CompanyPricing } from "../db/models/CompanyPricing";
import { SharesBid } from "../db/models/SharesBid";

// Column width constants
export const COL_WIDTH = {
  COMPANY: 20,
  PRICE: 20,
  SHARES: 20,
  INVESTOR: 20,
  CAPITAL: 20,
  STATUS: 10
};

/**
 * Display company pricing table
 */
export const displayCompanyPricing = (companies: CompanyPricing[], title: string) => {
  console.log(chalk.blueBright(`\n${title}:`));
  console.log(chalk.blueBright("=".repeat(title.length + 1)));
  if (companies.length === 0) {
    console.log(chalk.yellow("No companies available yet."));
  } else {
    // Create table header
    const header = [
      "Company Name".padEnd(COL_WIDTH.COMPANY),
      "Price/Share".padEnd(COL_WIDTH.PRICE),
      "Total Shares".padEnd(COL_WIDTH.SHARES)
    ];
    console.log(chalk.cyan(
      `┌${"─".repeat(COL_WIDTH.COMPANY)}┬${"─".repeat(COL_WIDTH.PRICE)}┬${"─".repeat(COL_WIDTH.SHARES)}┐\n` +
      `│${header[0]}│${header[1]}│${header[2]}│\n` +
      `├${"─".repeat(COL_WIDTH.COMPANY)}┼${"─".repeat(COL_WIDTH.PRICE)}┼${"─".repeat(COL_WIDTH.SHARES)}┤`
    ));

    // Add rows
    companies.forEach(company => {
      const priceStr = `$${company.price.toLocaleString()}`;
      const sharesStr = company.shares.toLocaleString();
      console.log(chalk.white(
        `│${company.companyName.padEnd(COL_WIDTH.COMPANY)}│${priceStr.padEnd(COL_WIDTH.PRICE)}│${sharesStr.padEnd(COL_WIDTH.SHARES)}│`
      ));
    });

    // Close table
    console.log(chalk.cyan(
      `└${"─".repeat(COL_WIDTH.COMPANY)}┴${"─".repeat(COL_WIDTH.PRICE)}┴${"─".repeat(COL_WIDTH.SHARES)}┘`
    ));
  }
};

/**
 * Display share bids table
 */
export const displayShareBids = (bids: SharesBid[], title: string) => {
  console.log(chalk.blueBright(`\n${title}:`));
  console.log(chalk.blueBright("=".repeat(title.length + 1)));
  if (bids.length === 0) {
    console.log(chalk.yellow("No bids placed yet."));
  } else {
    // Create table header
    const header = [
      "Investor".padEnd(COL_WIDTH.INVESTOR),
      "Company Name".padEnd(COL_WIDTH.COMPANY),
      "Shares Bids".padEnd(COL_WIDTH.SHARES)
    ];
    console.log(chalk.cyan(
      `┌${"─".repeat(COL_WIDTH.INVESTOR)}┬${"─".repeat(COL_WIDTH.COMPANY)}┬${"─".repeat(COL_WIDTH.SHARES)}┐\n` +
      `│${header[0]}│${header[1]}│${header[2]}│\n` +
      `├${"─".repeat(COL_WIDTH.INVESTOR)}┼${"─".repeat(COL_WIDTH.COMPANY)}┼${"─".repeat(COL_WIDTH.SHARES)}┤`
    ));

    // Add rows
    bids.forEach(bid => {
      const sharesStr = bid.bids.toLocaleString();
      console.log(chalk.white(
        `│${bid.investorName.padEnd(COL_WIDTH.INVESTOR)}│${bid.companyName.padEnd(COL_WIDTH.COMPANY)}│${sharesStr.padEnd(COL_WIDTH.SHARES)}│`
      ));
    });

    // Close table
    console.log(chalk.cyan(
      `└${"─".repeat(COL_WIDTH.INVESTOR)}┴${"─".repeat(COL_WIDTH.COMPANY)}┴${"─".repeat(COL_WIDTH.SHARES)}┘`
    ));
  }
};

/**
 * Display bidding results table
 */
export const displayBiddingResults = (outputs: BiddingOutput[]) => {
  console.log(chalk.blueBright("\nBidding Results:"));
  console.log(chalk.blueBright("================"));
  if (outputs.length === 0) {
    console.log(chalk.yellow("No bidding results yet."));
  } else {
    // Sort outputs by shares bid for in descending order
    const sortedOutputs = [...outputs].sort((a, b) => b.sharesBidFor - a.sharesBidFor);

    // Create table header
    const header = [
      "Bids Rank".padEnd(10),
      "Company Name".padEnd(COL_WIDTH.COMPANY),
      "Shares Bid For".padEnd(COL_WIDTH.SHARES),
      "Capital Raised".padEnd(COL_WIDTH.CAPITAL),
      "Status".padEnd(COL_WIDTH.STATUS)
    ];
    console.log(chalk.cyan(
      `┌${"─".repeat(10)}┬${"─".repeat(COL_WIDTH.COMPANY)}┬${"─".repeat(COL_WIDTH.SHARES)}┬${"─".repeat(COL_WIDTH.CAPITAL)}┬${"─".repeat(COL_WIDTH.STATUS)}┐\n` +
      `│${header[0]}│${header[1]}│${header[2]}│${header[3]}│${header[4]}│\n` +
      `├${"─".repeat(10)}┼${"─".repeat(COL_WIDTH.COMPANY)}┼${"─".repeat(COL_WIDTH.SHARES)}┼${"─".repeat(COL_WIDTH.CAPITAL)}┼${"─".repeat(COL_WIDTH.STATUS)}┤`
    ));

    // Add rows
    sortedOutputs.forEach((output, index) => {
      const sharesStr = output.sharesBidFor.toLocaleString();
      const isAllocated = output.subscription === 'Over';
      const capitalDisplay = isAllocated ? 'Allocated' : `$${output.capitalRaised.toLocaleString()}`;
      const rank = (index + 1).toString().padEnd(10);
      console.log(chalk.white(
        `│${rank}│${output.companyName.padEnd(COL_WIDTH.COMPANY)}│${sharesStr.padEnd(COL_WIDTH.SHARES)}│${capitalDisplay.padEnd(COL_WIDTH.CAPITAL)}│${output.subscription.padEnd(COL_WIDTH.STATUS)}│`
      ));
    });

    // Close table
    console.log(chalk.cyan(
      `└${"─".repeat(10)}┴${"─".repeat(COL_WIDTH.COMPANY)}┴${"─".repeat(COL_WIDTH.SHARES)}┴${"─".repeat(COL_WIDTH.CAPITAL)}┴${"─".repeat(COL_WIDTH.STATUS)}┘`
    ));
  }
}; 