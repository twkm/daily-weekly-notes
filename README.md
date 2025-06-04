# Daily/Weekly Notes

An Obsidian plugin that creates or opens daily and weekly notes based on customizable templates and ISO week calculations.

> **Recent Update**: Fixed timezone inconsistency bug where week start dates could be incorrect. Week calculations now use UTC consistently for accurate ISO week determination.

## Features

- **Create Daily Notes**: Generate daily notes with customizable file naming and date formatting
- **Create Weekly Notes**: Generate weekly notes based on ISO week of year
- **Template Support**: Use custom templates for both daily and weekly notes
- **Flexible Configuration**: Configurable folder paths, file naming formats, and date formats
- **Week Properties & Tags**: Automatically add week numbers as frontmatter properties or tags
- **Browse Integration**: Easy folder and template selection through the settings interface
- **Tomorrow Note Support**: Create notes for tomorrow's date with proper week handling

## Installation

### From Release (Recommended)
1. Download the latest release from the [Releases page](https://github.com/twkm/daily-weekly-notes/releases)
2. Extract the files to your vault's `.obsidian/plugins/daily-weekly-notes/` folder
3. Enable the plugin in Obsidian Settings → Community Plugins

### Manual Installation
1. Clone this repository to your vault's `.obsidian/plugins/` folder:
   ```bash
   cd /path/to/your/vault/.obsidian/plugins/
   git clone https://github.com/twkm/daily-weekly-notes.git
   ```
2. Compile TypeScript to JavaScript (see [Development](#development) section)
3. Enable the plugin in Obsidian Settings → Community Plugins

## Usage

### Commands
The plugin adds three commands to Obsidian:
- **Create or Open Daily Note**: Creates a new daily note for today or opens it if it already exists
- **Create or Open Daily Note for Tomorrow**: Creates a new daily note for tomorrow or opens it if it already exists
- **Create or Open Weekly Note**: Creates a new weekly note for the current week or opens it if it already exists

### Configuration
Access plugin settings through Settings → Community Plugins → Daily/Weekly Notes

#### Main Settings
- **Calendar Folder Path**: Where daily and weekly notes will be stored (default: `Calendar`)
- **Weekly Template Path**: Template file for weekly notes (default: `Templates/Weekly Template.md`)
- **Daily Template Path**: Template file for daily notes (default: `Templates/Daily Template.md`)

#### File Naming
- **Daily File Name Format**: Format for daily note filenames (default: `YYYY-MM-DD.md`)
- **Weekly File Name Format**: Format for weekly note filenames (default: `WO{{woy}}.md`)

#### Date Formatting
- **Daily Date Format**: Date format used in daily note content (default: `YYYY-MM-DD`)
- **Week Start Date Format**: Format for week start dates (default: `YYYY-MM-DD`)

#### Week Integration
- **Add Week Tag**: Automatically add week tags to notes (e.g., `#week-42`)
- **Week Tag Prefix**: Prefix for week tags (default: `week-`)
- **Add Week Property**: Add week number as frontmatter property
- **Week Property Name**: Name of the week property (default: `week`)

### Template Variables
Use these placeholders in your templates:

- `{{woy}}` or `{{week_of_year}}`: Current ISO week number (1-53)
- `{{wsd}}` or `{{week_start_date}}`: Week start date (always Monday, formatted according to settings)
- `{{date}}`: Current date (for daily notes, formatted according to Daily Date Format setting)

**Note**: All date calculations use UTC to ensure consistent results regardless of your local timezone.

### Tomorrow Note Feature

The "Create or Open Daily Note for Tomorrow" command works exactly like the daily note command but creates a note for tomorrow's date. Key features:

- **Same Template**: Uses the daily template with tomorrow's date
- **Same Week Tags/Properties**: Automatically calculates the correct week number for tomorrow (handles week transitions correctly)
- **Consistent Naming**: Uses the same file naming format but with tomorrow's date
- **Smart Week Handling**: If tomorrow is in a different week, it will use the correct week number for tags and properties

This is particularly useful for:
- End-of-day planning for the next day
- Setting up tomorrow's agenda before leaving work
- Preparing next-day templates in advance

### Example Templates

#### Weekly Template
```markdown
---
week: {{woy}}
---

# Week {{woy}} - {{wsd}}

## Goals for this week

## Daily Notes
- [[{{wsd}}]]

## Accomplishments

## Next Week
```

#### Daily Template
```markdown
---
date: {{date}}
week: {{woy}}
---

# {{date}}

## Today's Goals

## Notes

## Tomorrow's Prep
```

## Development

### Prerequisites
- Node.js and npm
- TypeScript compiler

### Compilation
To compile the TypeScript source to JavaScript:

```bash
# Install dependencies (first time only)
npm install

# Build the plugin
npm run build

# Or watch for changes during development
npm run dev
```

The compilation will generate `dist/main.js` from `main.ts` using the configuration specified in `tsconfig.json`. For production use, copy the generated `dist/main.js` to replace the root `main.js` file.

### File Structure
```
daily-weekly-notes/
├── main.ts          # TypeScript source code
├── main.js          # Compiled JavaScript (production)
├── dist/            # Build output directory
│   └── main.js      # Compiled JavaScript (development)
├── manifest.json    # Plugin manifest
├── tsconfig.json    # TypeScript configuration
├── package.json     # npm configuration and dependencies
└── README.md        # This file
```

### Making Changes
1. Edit `main.ts` with your changes
2. Run `npm run build` to compile, or `npm run dev` for watch mode
3. Copy `dist/main.js` to replace the root `main.js` file (for production)
4. Reload the plugin in Obsidian to test changes

## Technical Details

### Week Calculation
The plugin uses ISO 8601 week calculation where:
- Week 1 is the first week with at least 4 days in the new year
- Weeks start on Monday (always)
- Week numbers range from 1-53
- All calculations use UTC to ensure consistency across timezones

### Date Handling
- **UTC-based calculations**: Week start dates and week numbers are calculated using UTC to prevent timezone-related inconsistencies
- **Consistent formatting**: All date formatting uses UTC methods to match the calculation logic
- **ISO compliance**: Follows ISO 8601 standard for week numbering and week start determination

### File Handling
- Automatically creates the calendar folder if it doesn't exist
- Opens existing notes instead of creating duplicates
- Handles missing templates gracefully with fallback content
- Supports both daily and weekly note workflows with shared settings

### Recent Improvements
- **Fixed timezone inconsistency**: Resolved issue where week start dates could be incorrect due to local/UTC time mismatch
- **Enhanced date accuracy**: All date calculations now use UTC methods for consistency
- **Improved reliability**: Week start dates now correctly show Monday regardless of local timezone

## Configuration Examples

### Academic Year Setup
```
Calendar Folder: Academic/2024
Weekly Template: Templates/Academic Weekly.md
Daily Template: Templates/Study Log.md
Daily Format: YYYY-MM-DD - dddd
Weekly Format: Week-{{woy}}-{{wsd}}.md
```

### Business Setup
```
Calendar Folder: Work/Planning
Weekly Template: Templates/Weekly Sprint.md
Daily Template: Templates/Daily Standup.md
Add Week Property: enabled
Week Property Name: sprint_week
```

## License

This plugin is released under the MIT License.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Compile and test
5. Submit a pull request

## Support

If you encounter issues or have feature requests, please [open an issue](https://github.com/twkm/daily-weekly-notes/issues) on GitHub.

## Author

**Troy Meier**
- GitHub: [@twkm](https://github.com/twkm) 