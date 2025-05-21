"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
// Define default settings
const DEFAULT_SETTINGS = {
    calendarFolderPath: 'Calendar', // Default folder for weekly notes
    weeklyTemplatePath: 'Templates/Weekly Template.md', // Default path to the template
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
    // Determines how items are filtered. By default, it uses fuzzy matching on the item's text.
    // We can override this if more complex filtering is needed.
    // getSuggestions(query: string): FuzzyMatch<T>[] {
    //     return super.getSuggestions(query);
    // }
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
     * Determines the week of the month for a given date.
     * Week 1 starts on the first day of the month.
     * @param date The date to calculate the week of the month for.
     * @returns The week number (1-indexed).
     */
    getWeekOfMonth(date) {
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-indexed month
        // Get the first day of the current month
        const firstDayOfMonth = new Date(year, month, 1);
        // Get the day of the week for the first day (0 = Sunday, 6 = Saturday)
        const firstDayOfMonthWeekday = firstDayOfMonth.getDay();
        // Get the day of the month for the given date (1-indexed)
        const dayOfMonth = date.getDate();
        // Calculate the week of the month.
        // We add the weekday of the first day to shift the days so that
        // the first day of the month aligns with a "virtual" Sunday,
        // then divide by 7 and ceil to get the week number.
        return Math.ceil((dayOfMonth + firstDayOfMonthWeekday) / 7);
    }
    /**
     * Core logic to create or open the weekly note.
     */
    async processWeeklyNote() {
        const now = new Date();
        const weekOfMonth = this.getWeekOfMonth(now);
        // Construct the file name based on the week of the month
        const fileName = `WO${weekOfMonth}.md`;
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
                templateContent = `# Weekly Note WO${weekOfMonth}\n\n`;
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
