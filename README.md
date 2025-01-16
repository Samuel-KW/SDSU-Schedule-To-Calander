# SDSU-Schedule-To-Calendar
 SDSU Class schedule to Google Calendar importer/exporter

# Usage
Run the script/bookmarklet in the SDSU "View my Classes" page.

The ICS calendar file should be immediately downloaded as `calendar.ics`.

In Google Calendar, navigate to `Settings` > `Import` > `Select file from your computer`, selecting the `calendar.ics` file.

If you import multiple calendar, duplicate classes will be updated. However, old classes will not be removed.

For example, switching class times or rooms will be updated correctly (when reimporting), but dropping a course will not remove it from your calendar.