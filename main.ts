import { App, Plugin, TFile, TFolder, Setting, PluginSettingTab, FuzzySuggestModal, FuzzyMatch, TAbstractFile } from 'obsidian';

// Define the structure for plugin settings
interface WeeklyNotePluginSettings {
    calendarFolderPath: string;
    weeklyTemplatePath: string;
    dailyTemplatePath: string;
    dailyFileNameFormat: string;
    dailyDateFormat: string; // Setting for Daily Date Format
    addWeekTag: boolean;
    weekTagPrefix: string;
    addWeekProperty: boolean;
    weekPropertyName: string;
    fileNameFormat: string;
    weekStartDateFormat: string;
}

// Define default settings
const DEFAULT_SETTINGS: WeeklyNotePluginSettings = {
    calendarFolderPath: 'Calendar',
    weeklyTemplatePath: 'Templates/Weekly Template.md',
    dailyTemplatePath: 'Templates/Daily Template.md',
    dailyFileNameFormat: 'YYYY-MM-DD.md',
    dailyDateFormat: 'YYYY-MM-DD',
    addWeekTag: false,
    weekTagPrefix: 'week-',
    addWeekProperty: false,
    weekPropertyName: 'week',
    fileNameFormat: 'WO{{woy}}.md',
    weekStartDateFormat: 'YYYY-MM-DD',
};

// ====================================================================================================
// Abstract Base Suggester for Paths
// This class provides common functionality for both folder and file suggesters.
// ====================================================================================================
abstract class AbstractPathSuggester<T extends TAbstractFile> extends FuzzySuggestModal<T> {
    // These promises allow us to await the user's selection from the modal.
    private resolve!: (value: string | PromiseLike<string>) => void;
    private reject!: (reason?: any) => void;

    constructor(app: App) {
        super(app);
        this.setPlaceholder("Select a path...");
    }

    // Abstract method to be implemented by concrete suggesters to provide items.
    abstract getItems(): T[];

    // Returns the text to display for each item in the suggestion list.
    getItemText(item: T): string {
        return item.path;
    }

    // Called when an item is chosen by the user.
    onChooseItem(item: T, evt: MouseEvent | KeyboardEvent): void {
        this.resolve(item.path); // Resolve the promise with the chosen item's path.
    }

    // Allows the modal to be used in an async/await pattern.
    openAndGetValue(): Promise<string> {
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
class FolderSuggester extends AbstractPathSuggester<TFolder> {
    constructor(app: App) {
        super(app);
        this.setPlaceholder("Select a folder...");
    }

    // Returns all folders in the vault.
    getItems(): TFolder[] {
        return this.app.vault.getAllLoadedFiles().filter(f => f instanceof TFolder) as TFolder[];
    }
}

// ====================================================================================================
// File Suggester
// Allows users to select a Markdown file from the vault.
// ====================================================================================================
class FileSuggester extends AbstractPathSuggester<TFile> {
    constructor(app: App) {
        super(app);
        this.setPlaceholder("Select a template file (Markdown only)...");
    }

    // Returns all Markdown files in the vault.
    getItems(): TFile[] {
        return this.app.vault.getMarkdownFiles();
    }
}

// ====================================================================================================
// Plugin Settings Tab Class
// This class extends PluginSettingTab to create the UI for the plugin settings.
// ====================================================================================================
class WeeklyNoteSettingTab extends PluginSettingTab {
    plugin: WeeklyNotePlugin;

    constructor(app: App, plugin: WeeklyNotePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    // This method is responsible for rendering the settings UI.
    display(): void {
        const { containerEl } = this;

        containerEl.empty(); // Clear existing contents

        containerEl.createEl('h2', { text: 'Daily/Weekly Note Creator Settings' });

        // Setting for Calendar Folder Path
        let calendarFolderSetting = new Setting(containerEl)
            .setName('Calendar Folder Path')
            .setDesc('The path to the folder where daily and weekly notes will be stored (e.g., Calendar).');

        let calendarFolderTextInput: HTMLInputElement; // Store reference to the input element

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
                    } catch (error) {
                        // User cancelled the selection (e.g., pressed Esc)
                        console.log('Folder selection cancelled.');
                    }
                });
        });


        // Setting for Weekly Template Path
        let weeklyTemplateSetting = new Setting(containerEl)
            .setName('Weekly Template Path')
            .setDesc('The path to the template file for new weekly notes (e.g., Templates/Weekly Template.md).');

        let weeklyTemplateTextInput: HTMLInputElement; // Store reference to the input element

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
                    } catch (error) {
                        // User cancelled the selection (e.g., pressed Esc)
                        console.log('File selection cancelled.');
                    }
                });
        });

        // NEW SETTING: Daily Template Path
        let dailyTemplateSetting = new Setting(containerEl)
            .setName('Daily Template Path')
            .setDesc('The path to the template file for new daily notes (e.g., Templates/Daily Template.md).');

        let dailyTemplateTextInput: HTMLInputElement;

        dailyTemplateSetting.addText(text => {
            dailyTemplateTextInput = text.inputEl;
            text.setPlaceholder('Enter template path')
                .setValue(this.plugin.settings.dailyTemplatePath)
                .onChange(async (value) => {
                    this.plugin.settings.dailyTemplatePath = value;
                    await this.plugin.saveSettings();
                });
        });

        dailyTemplateSetting.addButton(button => {
            button.setButtonText('Browse')
                .setCta()
                .onClick(async () => {
                    const fileSuggester = new FileSuggester(this.app);
                    try {
                        const selectedFile = await fileSuggester.openAndGetValue();
                        this.plugin.settings.dailyTemplatePath = selectedFile;
                        dailyTemplateTextInput.value = selectedFile;
                        await this.plugin.saveSettings();
                    } catch (error) {
                        console.log('Daily template file selection cancelled.');
                    }
                });
        });

        // NEW SETTING: Daily Filename Format
        new Setting(containerEl)
            .setName('Daily Filename Format')
            .setDesc('Format string for the daily note filename. Placeholder: {{date}}.')
            .addText(text => text
                .setPlaceholder('e.g., {{date}}.md or Daily-{{date}}.md')
                .setValue(this.plugin.settings.dailyFileNameFormat)
                .onChange(async (value) => {
                    this.plugin.settings.dailyFileNameFormat = value;
                    await this.plugin.saveSettings();
                }));

        // NEW SETTING: Daily Date Format
        new Setting(containerEl)
            .setName('Daily Date Format')
            .setDesc('Date format string for {{date}} placeholder in daily filename and content. Use YYYY, MM, DD, dddd (full weekday), MMMM (full month).')
            .addText(text => text
                .setPlaceholder('e.g., YYYY-MM-DD or YYYY/MM/DD dddd')
                .setValue(this.plugin.settings.dailyDateFormat)
                .onChange(async (value) => {
                    this.plugin.settings.dailyDateFormat = value;
                    await this.plugin.saveSettings();
                }));


        // Weekly Note Settings below this point (retained existing labels)

        // NEW SETTING: Filename Format (for weekly notes)
        new Setting(containerEl)
            .setName('Weekly Filename Format') // Renamed for clarity
            .setDesc('Format string for the weekly note filename. Placeholders: {{woy}} or {{week_of_year}} for week number, {{wsd}} or {{week_start_date}} for week start date.')
            .addText(text => text
                .setPlaceholder('e.g., WO{{woy}}.md or Weekly-{{wsd}}.md')
                .setValue(this.plugin.settings.fileNameFormat)
                .onChange(async (value) => {
                    this.plugin.settings.fileNameFormat = value;
                    await this.plugin.saveSettings();
                }));

        // NEW SETTING: Week Start Date Format
        new Setting(containerEl)
            .setName('Week Start Date Format')
            .setDesc('Date format string for {{wsd}} or {{week_start_date}} placeholder in weekly filename. Use YYYY, MM, DD.')
            .addText(text => text
                .setPlaceholder('e.g., YYYY-MM-DD')
                .setValue(this.plugin.settings.weekStartDateFormat)
                .onChange(async (value) => {
                    this.plugin.settings.weekStartDateFormat = value;
                    await this.plugin.saveSettings();
                }));

        // Renamed Setting: Toggle for adding week number tag
        new Setting(containerEl)
            .setName('Add Week Number Tag to Note') // Renamed for clarity (applies to both daily and weekly)
            .setDesc('Toggle to automatically add a tag (e.g., #week-3) to the new note. Applies to both daily and weekly notes.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.addWeekTag)
                .onChange(async (value) => {
                    this.plugin.settings.addWeekTag = value;
                    await this.plugin.saveSettings();
                    this.display(); // Re-render settings to show/hide tag prefix option
                }));

        // New Setting: Week Tag Prefix (only visible if Add Week Tag is enabled)
        if (this.plugin.settings.addWeekTag) {
            new Setting(containerEl)
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
        new Setting(containerEl)
            .setName('Add Week Property to Note Frontmatter') // Renamed for clarity (applies to both daily and weekly)
            .setDesc('Toggle to automatically add a property (e.g., "week: <number>") to the YAML frontmatter of the new note. Applies to both daily and weekly notes.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.addWeekProperty)
                .onChange(async (value) => {
                    this.plugin.settings.addWeekProperty = value;
                    await this.plugin.saveSettings();
                    this.display(); // Re-render settings to show/hide property name option
                }));

        // NEW SETTING: Week Property Name (only visible if Add Week Property is enabled)
        if (this.plugin.settings.addWeekProperty) {
            new Setting(containerEl)
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
export default class WeeklyNotePlugin extends Plugin {
    settings!: WeeklyNotePluginSettings;

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

        // Register a custom command that will create or open the daily note
        this.addCommand({
            id: 'create-or-open-daily-note',
            name: 'Create or Open Daily Note for Today',
            callback: async () => {
                await this.processDailyNote();
            },
        });

        // Register a custom command that will create or open tomorrow's note
        this.addCommand({
            id: 'create-or-open-tomorrow-note',
            name: 'Create or Open Daily Note for Tomorrow',
            callback: async () => {
                await this.processTomorrowNote();
            },
        });

        // Add the settings tab to Obsidian's settings pane
        this.addSettingTab(new WeeklyNoteSettingTab(this.app, this));

        console.log('Daily/Weekly Note Plugin loaded.');
    }

    /**
     * This method is called when the plugin is unloaded.
     * Any cleanup can be done here.
     */
    onunload() {
        console.log('Daily/Weekly Note Plugin unloaded.');
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
    getWeekOfYear(date: Date): number {
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
    getISOWeekStartDate(date: Date): Date {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        // Set to nearest Thursday (as ISO week calculation uses Thursday as reference)
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); // (d.getUTCDay() || 7) converts Sunday (0) to 7
        // Now d is a Thursday in the target week. Subtract 3 days to get Monday.
        d.setUTCDate(d.getUTCDate() - 3);
        return d;
    }

    /**
     * Formats a Date object into a string based on a simple format string.
     * Supports YYYY, MM, DD, dddd (full weekday name), MMMM (full month name), etc.
     * @param date The Date object to format.
     * @param format The format string (e.g., "YYYY-MM-DD", "dddd, MMMM DD, YYYY").
     * @returns The formatted date string.
     */
    formatDate(date: Date, format: string): string {
        // Use UTC methods to be consistent with getISOWeekStartDate which uses UTC
        const year = date.getUTCFullYear();
        const month = (date.getUTCMonth() + 1); // Months are 0-indexed
        const day = date.getUTCDate();
        const dayOfWeek = date.getUTCDay(); // 0 for Sunday, 1 for Monday, etc.

        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"];
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

        let formattedString = format;

        // Replace year
        formattedString = formattedString.replace(/YYYY/g, year.toString());
        formattedString = formattedString.replace(/YY/g, year.toString().slice(-2));

        // Replace month
        formattedString = formattedString.replace(/MMMM/g, monthNames[month - 1]); // Full month name
        formattedString = formattedString.replace(/MMM/g, monthNames[month - 1].substring(0, 3)); // Short month name
        formattedString = formattedString.replace(/MM/g, month.toString().padStart(2, '0')); // Padded month
        formattedString = formattedString.replace(/M/g, month.toString()); // Unpadded month

        // Replace day
        formattedString = formattedString.replace(/DD/g, day.toString().padStart(2, '0')); // Padded day
        formattedString = formattedString.replace(/D/g, day.toString()); // Unpadded day

        // Replace weekday
        formattedString = formattedString.replace(/dddd/g, dayNames[dayOfWeek]); // Full weekday name
        formattedString = formattedString.replace(/ddd/g, dayNames[dayOfWeek].substring(0, 3)); // Short weekday name

        return formattedString;
    }

    /**
     * Core logic to create or open a note.
     * @param noteType 'daily' or 'weekly'
     * @param targetDate Optional date to use instead of current date
     */
    private async processNote(noteType: 'daily' | 'weekly', targetDate?: Date) {
        const now = targetDate || new Date();
        const folderPath = this.settings.calendarFolderPath;
        let fileName: string;
        let templatePath: string;
        let templateContent: string = '';
        let replacements: { [key: string]: string } = {};

        // Calculate week-related data always, as it might be used for daily notes too (e.g., week property/tag)
        const weekOfYear = this.getWeekOfYear(now);
        const weekStartDate = this.getISOWeekStartDate(now);
        const formattedWeekStartDate = this.formatDate(weekStartDate, this.settings.weekStartDateFormat);

        // Populate common replacements for both note types
        replacements = {
            '{{woy}}': weekOfYear.toString(),
            '{{week_of_year}}': weekOfYear.toString(),
            '{{wsd}}': formattedWeekStartDate,
            '{{week_start_date}}': formattedWeekStartDate,
            // Daily specific placeholder (always available, but only used if dailyDateFormat is set)
            '{{date}}': this.formatDate(now, this.settings.dailyDateFormat),
        };

        if (noteType === 'weekly') {
            fileName = this.settings.fileNameFormat;
            templatePath = this.settings.weeklyTemplatePath;
        } else { // noteType === 'daily'
            fileName = this.settings.dailyFileNameFormat;
            templatePath = this.settings.dailyTemplatePath;
        }

        // Apply replacements to filename string
        for (const placeholder in replacements) {
            fileName = fileName.replace(new RegExp(placeholder, 'g'), replacements[placeholder as keyof typeof replacements]);
        }

        // Ensure the filename ends with .md if not already present
        if (!fileName.endsWith('.md')) {
            fileName += '.md';
        }

        const fullPath = `${folderPath}/${fileName}`;

        // 1. Ensure the target folder exists
        let folder = this.app.vault.getAbstractFileByPath(folderPath);
        if (!folder || !(folder instanceof TFolder)) {
            console.log(`Folder '${folderPath}' does not exist. Creating it.`);
            await this.app.vault.createFolder(folderPath);
        }

        // 2. Check if the note file already exists
        let file = this.app.vault.getAbstractFileByPath(fullPath);

        if (file instanceof TFile) {
            // File exists, open it
            console.log(`File '${fullPath}' already exists. Opening it.`);
            this.app.workspace.openLinkText(fullPath, fullPath);
        } else {
            // File does not exist, create it from the template
            console.log(`File '${fullPath}' does not exist. Creating it from template.`);
            const templateFile = this.app.vault.getAbstractFileByPath(templatePath);

            if (templateFile instanceof TFile) {
                templateContent = await this.app.vault.read(templateFile);
                console.log(`Template '${templatePath}' read successfully.`);
            } else {
                console.warn(`Template file not found at: ${templatePath}. Creating an empty file.`);
                // Fallback: if template is not found, create a basic note
                if (noteType === 'weekly') {
                    templateContent = `# Weekly Note WO${weekOfYear}\n\n`;
                } else { // Daily note fallback
                    templateContent = `# Daily Note ${replacements['{{date}']}\n\n`;
                }
            }

            // Replace all placeholders in template content
            for (const placeholder in replacements) {
                templateContent = templateContent.replace(new RegExp(placeholder, 'g'), replacements[placeholder as keyof typeof replacements]);
            }

            // --- Apply Week Property to frontmatter (applies to both daily and weekly if enabled) ---
            if (this.settings.addWeekProperty) {
                const weekPropertyLine = `${this.settings.weekPropertyName}: ${weekOfYear}`;
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
                    } else {
                        // No closing '---' found, append after the opening one
                        // This case handles malformed templates or templates without a closing '---'
                        lines.splice(1, 0, weekPropertyLine);
                        templateContent = lines.join('\n');
                    }
                } else {
                    // No frontmatter found, prepend a new block
                    templateContent = `---\n${weekPropertyLine}\n---\n\n` + templateContent;
                }
            }

            // --- Apply Week Tag (applies to both daily and weekly if enabled) ---
            if (this.settings.addWeekTag) {
                const weekTag = `#${this.settings.weekTagPrefix}${weekOfYear}`;
                templateContent += `\n\n${weekTag}`;
            }

            // Create the new file
            const newFile = await this.app.vault.create(fullPath, templateContent);
            console.log(`New file '${fullPath}' created.`);

            // Open the newly created file
            this.app.workspace.openLinkText(newFile.path, newFile.path);
        }
    }

    /**
     * Public method to process weekly notes.
     */
    async processWeeklyNote() {
        await this.processNote('weekly');
    }

    /**
     * Public method to process daily notes.
     */
    async processDailyNote() {
        await this.processNote('daily');
    }

    /**
     * Public method to process tomorrow's note.
     */
    async processTomorrowNote() {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        await this.processNote('daily', tomorrow);
    }
}
