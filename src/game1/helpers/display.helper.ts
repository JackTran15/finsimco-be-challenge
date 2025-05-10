import chalk from 'chalk';
import { Input } from '../db/models/Input';

// Global configuration for display formatting
export const DISPLAY_CONFIG = {
    widths: {
        index: 3,
        field: 15,
        value: 10,  // Increased to accommodate longer values
        unit: 8,    // Increased for better spacing
        status: 6
    },
    padding: {
        top: 1,     // Lines before the table
        bottom: 1   // Lines after the table
    },
    separatorChar: '-'
};

/**
 * Displays a nicely formatted table of inputs and their approval status
 * @param inputs Array of objects with fieldName and value properties
 * @param approvals Array of objects with fieldName and isApproved properties
 * @param showMessage Whether to show the message at the bottom (default: true)
 * @returns The formatted table as a string
 */
export const displayInputTable = (
    inputs: Array<{ fieldName: string; value: any }>,
    approvals: Array<{ fieldName: string; isApproved: boolean }>,
) => {
    const { widths, separatorChar } = DISPLAY_CONFIG;

    // Create header
    const header = [
        '#'.padEnd(widths.index),
        'Field'.padEnd(widths.field),
        'Value'.padEnd(widths.value),
        'Unit'.padEnd(widths.unit),
        'Status'.padEnd(widths.status)
    ].join(' | ');

    // Create separator
    const separator = separatorChar.repeat(header.length);

    // Create rows
    const rows = Input.FIELDS.map((field, index) => {
        const input = inputs.find((i) => i.fieldName === field);
        const approval = approvals.find((a) => a.fieldName === field);
        const status = approval?.isApproved ? 'OK' : 'TBD';
        const value = input?.value ?? 'N/A';
        const unit = Input.UNITS[index];

        const coloredStatus = approval?.isApproved ? chalk.green(status) : chalk.yellow(status);
        
        // Format numeric values
        let formattedValue;
        if (input && !isNaN(Number(input.value))) {
            // Format numeric values with thousands separators and at most 2 decimal places
            formattedValue = Number(input.value).toLocaleString('en-US', {
                maximumFractionDigits: 2
            });
        } else {
            formattedValue = input ? input.value.toString() : 'N/A';
        }
        
        const coloredValue = input ? chalk.cyan(formattedValue) : chalk.gray('N/A');

        return [
            String(index + 1).padEnd(widths.index),
            field.padEnd(widths.field),
            coloredValue.padEnd(widths.value + (coloredValue.length - formattedValue.length)), // Account for ANSI color codes
            (unit ? `(${unit})` : '').padEnd(widths.unit),
            coloredStatus.padEnd(widths.status + (coloredStatus.length - status.length)) // Account for ANSI color codes
        ].join(' | ');
    });

    // Build table output with consistent padding
    let output = '\n'.repeat(DISPLAY_CONFIG.padding.top);
    output += chalk.blueBright('** Current Inputs and Approval Status **\n') + '\n';
    output += header + '\n';
    output += separator + '\n';
    output += rows.join('\n') + '\n';
    output += separator + '\n';
    output += '\n'.repeat(DISPLAY_CONFIG.padding.bottom);
    
    return output;
}; 