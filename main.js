"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
// Define default settings
const DEFAULT_SETTINGS = {
    calendarFolderPath: 'Calendar', // Default folder for weekly notes
    weeklyTemplatePath: 'Templates/Weekly Template.md', // Default path to the template
    addWeekTag: false, // Default: don't add week tag
    weekTagPrefix: 'week-', // Default prefix for the tag
    addWeekProperty: false, // Default: don't add week property
    weekPropertyName: 'week', // Default property name
    fileNameFormat: 'WO{{woy}}.md', // NEW: Default filename format
    weekStartDateFormat: 'YYYY-MM-DD', // NEW: Default format for week start date
};
// ====================================================================================================
// Abstract Base Suggester for Paths
// This class provides common functionality for both folder and file suggesters.
// ====================================================================================================
class AbstractPathSuggester extends obsidian_1.FuzzySuggestModal {
    // These promises allow us to await the user's selection from the modal.
    resolve;
    reject;
    constructor(app) {
        super(app);
        this.setPlaceholder("Select a path...");
    }
    // Returns the text to display for each item in the suggestion list.
    getItemText(item) {
        return item.path;
    }
    // Called when an item is chosen by the user.
    onChooseItem(item, evt) {
        this.resolve(item.path); // Resolve the promise with the chosen item's path.
    }
    // Allows the modal to be used in an async/await pattern.
    openAndGetValue() {
        return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
            this.open();
        });
    }
}
// ====================================================================================================
// Folder Suggester
// Allows users to select a folder from the vault.
// ====================================================================================================
class FolderSuggester extends AbstractPathSuggester {
    constructor(app) {
        super(app);
        this.setPlaceholder("Select a folder...");
    }
    // Returns all folders in the vault.
    getItems() {
        return this.app.vault.getAllLoadedFiles().filter(f => f instanceof obsidian_1.TFolder);
    }
}
// ====================================================================================================
// File Suggester
// Allows users to select a Markdown file from the vault.
// ====================================================================================================
class FileSuggester extends AbstractPathSuggester {
    constructor(app) {
        super(app);
        this.setPlaceholder("Select a template file (Markdown only)...");
    }
    // Returns all Markdown files in the vault.
    getItems() {
        return this.app.vault.getMarkdownFiles();
    }
}
// ====================================================================================================
// Plugin Settings Tab Class
// This class extends PluginSettingTab to create the UI for the plugin settings.
// ====================================================================================================
class WeeklyNoteSettingTab extends obsidian_1.PluginSettingTab {
    plugin;
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    // This method is responsible for rendering the settings UI.
    display() {
        const { containerEl } = this;
        containerEl.empty(); // Clear existing contents
        containerEl.createEl('h2', { text: 'Weekly Note Creator Settings' });
        // Setting for Calendar Folder Path
        let calendarFolderSetting = new obsidian_1.Setting(containerEl)
            .setName('Calendar Folder Path')
            .setDesc('The path to the folder where weekly notes will be stored (e.g., Calendar).');
        let calendarFolderTextInput; // Store reference to the input element
        calendarFolderSetting.addText(text => {
            calendarFolderTextInput = text.inputEl; // Get reference to the actual input element
            text.setPlaceholder('Enter folder path')
                .setValue(this.plugin.settings.calendarFolderPath)
                .onChange(async (value) => {
                this.plugin.settings.calendarFolderPath = value;
                await this.plugin.saveSettings();
            });
        });
        calendarFolderSetting.addButton(button => {
            button.setButtonText('Browse')
                .setCta() // Makes the button visually prominent
                .onClick(async () => {
                const folderSuggester = new FolderSuggester(this.app);
                try {
                    const selectedFolder = await folderSuggester.openAndGetValue();
                    this.plugin.settings.calendarFolderPath = selectedFolder;
                    calendarFolderTextInput.value = selectedFolder; // Update the input field
                    await this.plugin.saveSettings();
                }
                catch (error) {
                    // User cancelled the selection (e.g., pressed Esc)
                    console.log('Folder selection cancelled.');
                }
            });
        });
        // Setting for Weekly Template Path
        let weeklyTemplateSetting = new obsidian_1.Setting(containerEl)
            .setName('Weekly Template Path')
            .setDesc('The path to the template file for new weekly notes (e.g., Templates/Weekly Template.md).');
        let weeklyTemplateTextInput; // Store reference to the input element
        weeklyTemplateSetting.addText(text => {
            weeklyTemplateTextInput = text.inputEl; // Get reference to the actual input element
            text.setPlaceholder('Enter template path')
                .setValue(this.plugin.settings.weeklyTemplatePath)
                .onChange(async (value) => {
                this.plugin.settings.weeklyTemplatePath = value;
                await this.plugin.saveSettings();
            });
        });
        weeklyTemplateSetting.addButton(button => {
            button.setButtonText('Browse')
                .setCta() // Makes the button visually prominent
                .onClick(async () => {
                const fileSuggester = new FileSuggester(this.app);
                try {
                    const selectedFile = await fileSuggester.openAndGetValue();
                    this.plugin.settings.weeklyTemplatePath = selectedFile;
                    weeklyTemplateTextInput.value = selectedFile; // Update the input field
                    await this.plugin.saveSettings();
                }
                catch (error) {
                    // User cancelled the selection (e.g., pressed Esc)
                    console.log('File selection cancelled.');
                }
            });
        });
        // NEW SETTING: Filename Format
        new obsidian_1.Setting(containerEl)
            .setName('Filename Format')
            .setDesc('Format string for the weekly note filename. Placeholders: {{woy}} or {{week_of_year}} for week number, {{wsd}} or {{week_start_date}} for week start date.')
            .addText(text => text
            .setPlaceholder('e.g., WO{{woy}}.md or Weekly-{{wsd}}.md')
            .setValue(this.plugin.settings.fileNameFormat)
            .onChange(async (value) => {
            this.plugin.settings.fileNameFormat = value;
            await this.plugin.saveSettings();
        }));
        // NEW SETTING: Week Start Date Format
        new obsidian_1.Setting(containerEl)
            .setName('Week Start Date Format')
            .setDesc('Date format string for {{wsd}} or {{week_start_date}} placeholder in filename. Use YYYY, MM, DD.')
            .addText(text => text
            .setPlaceholder('e.g., YYYY-MM-DD')
            .setValue(this.plugin.settings.weekStartDateFormat)
            .onChange(async (value) => {
            this.plugin.settings.weekStartDateFormat = value;
            await this.plugin.saveSettings();
        }));
        // Renamed Setting: Toggle for adding week number tag
        new obsidian_1.Setting(containerEl)
            .setName('Add Week Number Tag') // Renamed
            .setDesc('Toggle to automatically add a tag (e.g., #week-3) to the new weekly note.')
            .addToggle(toggle => toggle
            .setValue(this.plugin.settings.addWeekTag)
            .onChange(async (value) => {
            this.plugin.settings.addWeekTag = value;
            await this.plugin.saveSettings();
            this.display(); // Re-render settings to show/hide tag prefix option
        }));
        // New Setting: Week Tag Prefix (only visible if Add Week Tag is enabled)
        if (this.plugin.settings.addWeekTag) {
            new obsidian_1.Setting(containerEl)
                .setName('Week Tag Prefix')
                .setDesc('The prefix for the week tag (e.g., "week-" will result in #week-3).')
                .addText(text => text
                .setPlaceholder('e.g., week-')
                .setValue(this.plugin.settings.weekTagPrefix)
                .onChange(async (value) => {
                this.plugin.settings.weekTagPrefix = value;
                await this.plugin.saveSettings();
            }));
        }
        // NEW SETTING: Toggle for adding 'week' property to frontmatter
        new obsidian_1.Setting(containerEl)
            .setName('Add Week Property to Frontmatter')
            .setDesc('Toggle to automatically add a property (e.g., "week: <number>") to the YAML frontmatter of the new weekly note.')
            .addToggle(toggle => toggle
            .setValue(this.plugin.settings.addWeekProperty)
            .onChange(async (value) => {
            this.plugin.settings.addWeekProperty = value;
            await this.plugin.saveSettings();
            this.display(); // Re-render settings to show/hide property name option
        }));
        // NEW SETTING: Week Property Name (only visible if Add Week Property is enabled)
        if (this.plugin.settings.addWeekProperty) {
            new obsidian_1.Setting(containerEl)
                .setName('Week Property Name')
                .setDesc('The name of the frontmatter property (e.g., "week" or "currentWeek").')
                .addText(text => text
                .setPlaceholder('e.g., week')
                .setValue(this.plugin.settings.weekPropertyName)
                .onChange(async (value) => {
                this.plugin.settings.weekPropertyName = value;
                await this.plugin.saveSettings();
            }));
        }
    }
}
// ====================================================================================================
// Main Plugin Class
// ====================================================================================================
class WeeklyNotePlugin extends obsidian_1.Plugin {
    settings;
    /**
     * This method is called when the plugin is loaded.
     * It initializes settings, registers the custom command, and adds the settings tab.
     */
    async onload() {
        // Load settings, or use defaults if no settings exist
        await this.loadSettings();
        // Register a custom command that will create or open the weekly note
        this.addCommand({
            id: 'create-or-open-weekly-note',
            name: 'Create or Open Weekly Note for Current Week',
            callback: async () => {
                await this.processWeeklyNote();
            },
        });
        // Add the settings tab to Obsidian's settings pane
        this.addSettingTab(new WeeklyNoteSettingTab(this.app, this));
        console.log('Weekly Note Plugin loaded.');
    }
    /**
     * This method is called when the plugin is unloaded.
     * Any cleanup can be done here.
     */
    onunload() {
        console.log('Weekly Note Plugin unloaded.');
    }
    /**
     * Loads plugin settings from storage.
     */
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }
    /**
     * Saves plugin settings to storage.
     */
    async saveSettings() {
        await this.saveData(this.settings);
    }
    /**
     * Calculates the ISO week number of the year for a given date.
     * Week 1 is the first week with at least 4 days in the new year, and it starts on a Monday.
     * @param date The date to calculate the week of the year for.
     * @returns The ISO week number (1-indexed).
     */
    getWeekOfYear(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        // Set to nearest Thursday: current date + 4 - current day number
        // (Sunday is 0, Monday is 1 etc. - Thursday is 4)
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        // Get first day of year
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        // Calculate full weeks to nearest Thursday
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return weekNo;
    }
    /**
     * Calculates the start date (Monday) of the ISO week for a given date.
     * @param date The date to calculate the week start for.
     * @returns The Date object representing the Monday of that ISO week.
     */
    getISOWeekStartDate(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        // Set to nearest Thursday (as ISO week calculation uses Thursday as reference)
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); // (d.getUTCDay() || 7) converts Sunday (0) to 7
        // Now d is a Thursday in the target week. Subtract 3 days to get Monday.
        d.setUTCDate(d.getUTCDate() - 3);
        return d;
    }
    /**
     * Formats a Date object into a string based on a simple format string.
     * Supports YYYY, MM, DD.
     * @param date The Date object to format.
     * @param format The format string (e.g., "YYYY-MM-DD").
     * @returns The formatted date string.
     */
    formatDate(date, format) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed
        const day = date.getDate().toString().padStart(2, '0');
        let formattedString = format;
        formattedString = formattedString.replace(/YYYY/g, year.toString());
        formattedString = formattedString.replace(/MM/g, month);
        formattedString = formattedString.replace(/DD/g, day);
        return formattedString;
    }
    /**
     * Core logic to create or open the weekly note.
     */
    async processWeeklyNote() {
        const now = new Date();
        const weekOfYear = this.getWeekOfYear(now);
        const weekStartDate = this.getISOWeekStartDate(now);
        const formattedWeekStartDate = this.formatDate(weekStartDate, this.settings.weekStartDateFormat);
        // Define replacements for both filename and content
        const replacements = {
            '{{woy}}': weekOfYear.toString(),
            '{{week_of_year}}': weekOfYear.toString(),
            '{{wsd}}': formattedWeekStartDate,
            '{{week_start_date}}': formattedWeekStartDate,
        };
        // Construct the file name based on the user's format string and placeholders
        let fileName = this.settings.fileNameFormat;
        for (const placeholder in replacements) {
            fileName = fileName.replace(new RegExp(placeholder, 'g'), replacements[placeholder]);
        }
        // Ensure the filename ends with .md if not already present
        if (!fileName.endsWith('.md')) {
            fileName += '.md';
        }
        const folderPath = this.settings.calendarFolderPath; // Get path from settings
        const templatePath = this.settings.weeklyTemplatePath; // Get path from settings
        const fullPath = `${folderPath}/${fileName}`;
        // 1. Ensure the target folder exists
        let folder = this.app.vault.getAbstractFileByPath(folderPath);
        if (!folder || !(folder instanceof obsidian_1.TFolder)) {
            console.log(`Folder '${folderPath}' does not exist. Creating it.`);
            await this.app.vault.createFolder(folderPath);
        }
        // 2. Check if the weekly note file already exists
        let file = this.app.vault.getAbstractFileByPath(fullPath);
        if (file instanceof obsidian_1.TFile) {
            // File exists, open it
            console.log(`File '${fullPath}' already exists. Opening it.`);
            this.app.workspace.openLinkText(fullPath, fullPath);
        }
        else {
            // File does not exist, create it from the template
            console.log(`File '${fullPath}' does not exist. Creating it from template.`);
            let templateContent = '';
            const templateFile = this.app.vault.getAbstractFileByPath(templatePath);
            if (templateFile instanceof obsidian_1.TFile) {
                templateContent = await this.app.vault.read(templateFile);
                console.log(`Template '${templatePath}' read successfully.`);
            }
            else {
                console.warn(`Template file not found at: ${templatePath}. Creating an empty file.`);
                // Fallback: if template is not found, create a basic note
                templateContent = `# Weekly Note WO${weekOfYear}\n\n`;
            }
            // NEW: Replace placeholders in template content
            for (const placeholder in replacements) {
                templateContent = templateContent.replace(new RegExp(placeholder, 'g'), replacements[placeholder]);
            }
            // Add the week property to frontmatter if enabled in settings
            if (this.settings.addWeekProperty) {
                const weekPropertyLine = `${this.settings.weekPropertyName}: ${weekOfYear}`; // Use customizable property name
                const lines = templateContent.split('\n');
                if (lines.length > 0 && lines[0].trim() === '---') {
                    // Check if there's a closing '---'
                    let closingDashIndex = -1;
                    for (let i = 1; i < lines.length; i++) {
                        if (lines[i].trim() === '---') {
                            closingDashIndex = i;
                            break;
                        }
                    }
                    if (closingDashIndex !== -1) {
                        // Insert property before the closing '---'
                        lines.splice(closingDashIndex, 0, weekPropertyLine);
                        templateContent = lines.join('\n');
                    }
                    else {
                        // No closing '---' found, just append after the opening one
                        // This case is less common for valid frontmatter, but handles malformed templates
                        lines.splice(1, 0, weekPropertyLine);
                        templateContent = lines.join('\n');
                    }
                }
                else {
                    // No frontmatter, prepend a new block
                    templateContent = `---\n${weekPropertyLine}\n---\n\n` + templateContent;
                }
            }
            // Add the week tag if enabled in settings (existing logic)
            if (this.settings.addWeekTag) {
                const weekTag = `#${this.settings.weekTagPrefix}${weekOfYear}`; // Use weekOfYear
                templateContent += `\n\n${weekTag}`;
            }
            // Create the new file
            const newFile = await this.app.vault.create(fullPath, templateContent);
            console.log(`New file '${fullPath}' created.`);
            // Open the newly created file
            this.app.workspace.openLinkText(newFile.path, newFile.path);
        }
    }
}
exports.default = WeeklyNotePlugin;
