import inquirer from 'inquirer';
import chalk from 'chalk';
import { Input } from '../db/models/Input';
import { Approval } from '../db/models/Approval';
import { Output } from '../db/models/Output';
import { initDb, closeDb } from '../db';
import dotenv from 'dotenv';

dotenv.config();

const SESSION_ID = process.env.DEFAULT_SESSION_ID || 'default_session';
const TEAM_ID = 1;
const fields = ['EBITDA', 'Interest Rate', 'Multiple', 'Factor Score'];
const units = ['M$', '%', 'x', ''];
const pollingRefreshRateInMs = 1500;

const displayTable = (inputs: Input[], approvals: Approval[]) => {
    // Define column widths
    const widths = {
        index: 3,
        field: 15,
        value: 8,
        unit: 6,
        status: 6
    };

    // Create header
    const header = [
        '#'.padEnd(widths.index),
        'Field'.padEnd(widths.field),
        'Value'.padEnd(widths.value),
        'Unit'.padEnd(widths.unit),
        'Status'.padEnd(widths.status)
    ].join(' | ');

    // Create separator
    const separator = '-'.repeat(header.length);

    // Create rows
    const rows = fields.map((field, index) => {
        const input = inputs.find((i) => i.fieldName === field);
        const approval = approvals.find((a) => a.fieldName === field);
        const status = approval?.status ? 'OK' : 'TBD';
        const value = input?.value ?? 'N/A';
        const unit = units[index];

        const coloredStatus = approval?.status ? chalk.green(status) : chalk.yellow(status);
        const coloredValue = input ? chalk.cyan(value.toString()) : 'N/A';

        return [
            String(index + 1).padEnd(widths.index),
            field.padEnd(widths.field),
            coloredValue.padEnd(widths.value),
            (unit ? `(${unit})` : '').padEnd(widths.unit),
            coloredStatus.padEnd(widths.status)
        ].join(' | ');
    });

    // Display table
    console.log(chalk.blueBright('\n** Current Inputs and Approval Status **\n'));
    console.log(header);
    console.log(separator);
    rows.forEach(row => console.log(row));
    console.log(separator);
    console.log(chalk.gray('\nPress "A" to toggle approval, "ESC" to exit...\n'));
};

const pollAndDisplay = async () => {
    return new Promise<void>((resolve) => {
        const interval = setInterval(async () => {
            try {
                const inputs = await Input.findAll({
                    where: {
                        teamId: TEAM_ID,
                        sessionId: SESSION_ID
                    },
                    order: [['updatedAt', 'DESC']],
                });

                const approvals = await Approval.findAll({
                    where: {
                        teamId: TEAM_ID,
                        sessionId: SESSION_ID
                    },
                    order: [['updatedAt', 'DESC']],
                });

                const output = await Output.findOne({
                    where: {
                        inputTeamId: TEAM_ID,
                        sessionId: SESSION_ID
                    },
                    raw: true,
                });

                console.clear();
                displayTable(inputs, approvals);

                // Check if all approvals are true
                const allApproved = approvals.length === fields.length && approvals.every(a => a.status === true);

                if (output?.isApproved || allApproved) {
                    clearInterval(interval);
                    console.log(chalk.green('\n => All fields have been approved. Exiting...\n'));
                    const updatedOutput = await Output.update({
                        isApproved: true,
                    }, {
                        where: { sessionId: SESSION_ID },
                    });
                    closeDb().then(() => process.exit(0));
                    return;
                } else {
                    console.log(chalk.blueBright(`\n => Output is not approved. Waiting for your approvals...\n`));
                }

                // Check for user input
                process.stdin.setRawMode(true);
                process.stdin.resume();
                process.stdin.once('data', (data) => {
                    const key = data.toString();
                    if (key === 'a' || key === 'A') {
                        clearInterval(interval);
                        process.stdin.setRawMode(false);
                        resolve();
                    } else if (key === '\u001b') { // ESC key
                        clearInterval(interval);
                        process.stdin.setRawMode(false);
                        console.log(chalk.blueBright('\n => Exiting application...\n'));
                        closeDb();
                        process.exit(0);
                    }
                });
            } catch (error) {
                console.error('Error in polling:', error);
                clearInterval(interval);
                closeDb().then(() => process.exit(1));
            }
        }, pollingRefreshRateInMs);
    });
};

const showAndToggle = async () => {
    const approvals = await Approval.findAll({
        where: { 
            teamId: TEAM_ID,
            sessionId: SESSION_ID 
        },
        order: [['updatedAt', 'DESC']],
        raw: true,
    });

    const { field } = await inquirer.prompt([
        {
            type: 'list',
            name: 'field',
            message: 'Select field to toggle approval:',
            choices: fields,
        },
    ]);

    const approval = approvals.find(a => a.fieldName === field);
    const newStatus = !approval?.status;

    // If switching from OK to TBD, ask for confirmation
    if (approval?.status) {
        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: `Are you sure you want to change ${field} from OK to TBD?`,
                default: false,
            },
        ]);

        if (!confirm) {
            console.log(chalk.blueBright(`\n => ${field} remains approved.\n`));
            return;
        }
    }

    const existingApproval = await Approval.findOne({
        where: { 
            teamId: TEAM_ID, 
            fieldName: field,
            sessionId: SESSION_ID 
        },
    });

    if (existingApproval) {
        await Approval.update({
            status: newStatus,
        }, {
            where: { id: existingApproval.id },
        });
    } else {
        await Approval.create({
            teamId: TEAM_ID,
            fieldName: field,
            status: newStatus,
            sessionId: SESSION_ID
        });
    }

    console.log(chalk.blueBright(`\n => ${field} is now ${newStatus ? 'approved' : 'pending'}.\n`));
};

const main = async () => {
    try {
        await initDb();
        console.log('\n** TEAM 2 CLI – Review and Approve Financial Terms **\n');
        console.log(chalk.blueBright(`Session ID: ${SESSION_ID}\n`));

        while (true) {
            await pollAndDisplay();
            await showAndToggle();
        }
    } catch (error) {
        console.error('Error in Team 2:', error);
    } finally {
        await closeDb();
    }
};

main();
