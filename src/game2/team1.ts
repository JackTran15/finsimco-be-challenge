import inquirer from "inquirer";
import chalk from "chalk";
import { initDb, closeDb } from "./db";
import dotenv from "dotenv";
import { upsertCompanyPricing, getAllCompanyPricing } from "./helpers/company.helper";
import { calculateAllBiddingOutputs } from "./helpers/bidding.helper";
import { BiddingOutput } from "./db/models/BiddingOutput";
import { sequelize } from "./db/sequelize";
import { displayCompanyPricing, displayBiddingResults } from "./helpers/displays.helper";

dotenv.config();

const SESSION_ID = process.env.DEFAULT_SESSION_ID || "default_session";
const TEAM_ID = 1;
const POLLING_INTERVAL = 1500;

let isEditing = false;
let pollingInterval: NodeJS.Timeout | null = null;
let keypressListenerActive = false;

const editCompanyPricing = async (): Promise<boolean> => {
  const { companyName, price, shares } = await inquirer.prompt([
    {
      type: "input",
      name: "companyName",
      message: "Enter company name:",
      validate: (input) => {
        const trimmed = input.trim();
        if (trimmed === "") return "Company name is required";
        if (trimmed.toUpperCase().includes('Q')) return "Company name cannot contain the letter 'Q'";
        return true;
      }
    },
    {
      type: "input",
      name: "price",
      message: "Enter share price ($):",
      validate: (input) => {
        const num = Number(input);
        return !isNaN(num) && num > 0 || "Price must be a positive number";
      }
    },
    {
      type: "input",
      name: "shares",
      message: "Enter number of shares:",
      validate: (input) => {
        const num = Number(input);
        return !isNaN(num) && num > 0 || "Shares must be a positive number";
      }
    }
  ]);

  const transaction = await sequelize.transaction();

  try {
    await upsertCompanyPricing(SESSION_ID, {
      companyName,
      price: Number(price),
      shares: Number(shares)
    }, transaction);

    await calculateAllBiddingOutputs(SESSION_ID, transaction);

    await transaction.commit();
    console.log(chalk.green("\n => Company pricing updated successfully.\n"));
    return true;
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating company pricing:", error);
    return false;
  }
};

const startPolling = async () => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }

  pollingInterval = setInterval(async () => {
    if (!isEditing) {
      try {
        const companies = await getAllCompanyPricing(SESSION_ID);
        const outputs = await BiddingOutput.findAll({
          where: { sessionId: SESSION_ID },
          order: [['companyName', 'ASC']]
        });

        console.clear();
        displayCompanyPricing(companies, "Company Pricing (Team 1)");
        displayBiddingResults(outputs);

        console.log(chalk.blueBright("\nPress 'e' to edit company pricing, 'ESC' to quit"));
        console.log(chalk.gray('(Auto-refreshing data every 1.5 seconds)'));
        
        if (!keypressListenerActive) {
          keypressListenerActive = true;
          
          const handleKeypress = async (data: Buffer) => {
            const key = data.toString().toLowerCase();
            
            if (key === 'e') {
              process.stdin.setRawMode(false);
              process.stdin.pause();
              process.stdin.removeListener('data', handleKeypress);
              keypressListenerActive = false;
              
              isEditing = true;
              try {
                await editCompanyPricing();
              } catch (error) {
                console.error("Error during editing:", error);
              } finally {
                isEditing = false;
                process.stdin.setRawMode(true);
                process.stdin.resume();
                keypressListenerActive = false;
              }
            } else if (key === '\u001b') {
              console.clear();
              console.log("\nThank you for using the Bidding System!\n");
              if (pollingInterval) clearInterval(pollingInterval);
              process.stdin.setRawMode(false);
              process.stdin.pause();
              process.stdin.removeListener('data', handleKeypress);
              keypressListenerActive = false;
              await closeDb();
              process.exit(0);
            }
          };
          
          process.stdin.setRawMode(true);
          process.stdin.resume();
          process.stdin.on('data', handleKeypress);
        }
      } catch (error) {
        console.error("Error during polling:", error);
      }
    }
  }, POLLING_INTERVAL);
};

const main = async () => {
  try {
    const dbInitialized = await initDb();
    if (!dbInitialized) {
      console.error("Failed to initialize database");
      process.exit(1);
    }

    await startPolling();
  } catch (error) {
    console.error("Error in main:", error);
    process.exit(1);
  }
};

main(); 