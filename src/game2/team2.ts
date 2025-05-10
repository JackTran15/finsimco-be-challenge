import inquirer from "inquirer";
import chalk from "chalk";
import { initDb, closeDb } from "./db";
import { sequelize } from "./db/sequelize";
import dotenv from "dotenv";
import { upsertSharesBid, getAllBids } from "./helpers/shares.helper";
import { calculateAllBiddingOutputs } from "./helpers/bidding.helper";
import { BiddingOutput } from "./db/models/BiddingOutput";
import { getAllCompanyPricing } from "./helpers/company.helper";
import {
  displayCompanyPricing,
  displayShareBids,
  displayBiddingResults,
} from "./helpers/displays.helper";

dotenv.config();

const SESSION_ID = process.env.DEFAULT_SESSION_ID || "default_session";
const TEAM_ID = 2;
const POLLING_INTERVAL = 1500; // 1.5 seconds

// Global variables for polling control
let isEditing = false;
let pollingInterval: NodeJS.Timeout | null = null;
let keypressListenerActive = false;

/**
 * Edit share bid data
 */
const editShareBid = async (): Promise<boolean> => {
  // Get available companies first
  const companies = await getAllCompanyPricing(SESSION_ID);
  if (companies.length === 0) {
    console.log(chalk.yellow("\nNo companies available for bidding yet."));
    return false;
  }

  const { investorName, companyName, bids } = await inquirer.prompt([
    {
      type: "input",
      name: "investorName",
      message: "Enter investor name:",
      validate: (input) => input.trim() !== "" || "Investor name is required",
    },
    {
      type: "list",
      name: "companyName",
      message: "Select company to bid for:",
      choices: companies
        .map((c) => c.companyName)
        .filter((name) => !name.toUpperCase().includes("Q")),
    },
    {
      type: "input",
      name: "bids",
      message: "Enter number of shares to bid:",
      validate: (input) => {
        const num = Number(input);
        return (!isNaN(num) && num > 0) || "Bids must be a positive number";
      },
    },
  ]);

  // Start a transaction
  const transaction = await sequelize.transaction();

  try {
    // Update share bid
    await upsertSharesBid(
      SESSION_ID,
      {
        investorName,
        companyName,
        bids: Number(bids),
      },
      transaction
    );

    // Recalculate all outputs
    await calculateAllBiddingOutputs(SESSION_ID, transaction);

    await transaction.commit();
    console.log(chalk.green("\n => Share bid updated successfully.\n"));
    return true;
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating share bid:", error);
    return false;
  }
};

/**
 * Setup the polling to refresh data periodically
 */
const startPolling = async () => {
  // Clear any existing interval
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }

  pollingInterval = setInterval(async () => {
    // Only update the display when not in editing mode
    if (!isEditing) {
      try {
        // Get all share bids
        const bids = await getAllBids(SESSION_ID);

        // Get all bidding outputs
        const outputs = await BiddingOutput.findAll({
          where: { sessionId: SESSION_ID },
          order: [["companyName", "ASC"]],
        });

        // Get company pricing
        const companies = await getAllCompanyPricing(SESSION_ID);

        // Clear screen
        console.clear();

        // Display company pricing
        displayCompanyPricing(companies, "Current Company Pricing");

        // Display share bids
        displayShareBids(bids, "Share Bids (Team 2)");

        // Display bidding results
        displayBiddingResults(outputs);

        console.log(chalk.blueBright("\nPress 'e' to place a bid, 'ESC' to quit"));
        console.log(chalk.gray("(Auto-refreshing data every 1.5 seconds)"));

        // Setup keyboard listener if not already set
        if (!keypressListenerActive) {
          keypressListenerActive = true;

          const handleKeypress = async (data: Buffer) => {
            const key = data.toString().toLowerCase();

            if (key === "e") {
              // Stop listening
              process.stdin.setRawMode(false);
              process.stdin.pause();
              process.stdin.removeListener("data", handleKeypress);
              keypressListenerActive = false;

              // Start editing
              isEditing = true;
              try {
                await editShareBid();
              } catch (error) {
                console.error("Error during editing:", error);
              } finally {
                isEditing = false;
                // Return to polling after editing
                process.stdin.setRawMode(true);
                process.stdin.resume();
                keypressListenerActive = false;
              }
            } else if (key === "\u001b") {
              // ESC key
              // Quit application
              console.clear();
              console.log("\nThank you for using the Bidding System!\n");
              if (pollingInterval) clearInterval(pollingInterval);
              process.stdin.setRawMode(false);
              process.stdin.pause();
              process.stdin.removeListener("data", handleKeypress);
              keypressListenerActive = false;
              await closeDb();
              process.exit(0);
            }
          };

          process.stdin.setRawMode(true);
          process.stdin.resume();
          process.stdin.on("data", handleKeypress);
        }
      } catch (error) {
        console.error("Error during polling:", error);
      }
    }
  }, POLLING_INTERVAL);
};

/**
 * Main function
 */
const main = async () => {
  try {
    // Initialize database
    const dbInitialized = await initDb();
    if (!dbInitialized) {
      console.error("Failed to initialize database");
      process.exit(1);
    }

    // Start polling
    await startPolling();
  } catch (error) {
    console.error("Error in main:", error);
    process.exit(1);
  }
};

// Start the application
main();
