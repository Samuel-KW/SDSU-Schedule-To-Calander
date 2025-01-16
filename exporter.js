const CourseStatus = Object.freeze({
    UNKNOWN: -1,
    ENROLLED: 0,
    WAITLIST: 1
});

const Timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Converts a UTC date into the proper format for ICS calendar files for DTSTAMP, DTSTART and DTEND
 * @param {Date} date, e.g. new Date()
 * @returns {String} formatted as UTC date for ICS files, e.g. 20220511T170000Z
 */
const toICS = date => date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

/**
 * Downloads a calander (ICS format) with the given text as its contents
 * @param {String} text - The contents of the file to be downloaded
 */
const download = (text) => {
    const blob = new Blob([text], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "calendar";

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Converts a string representing a time into a Date object
 * @param {String} timeString - The time string to be parsed, e.g. '2:19AM'
 * @returns {Date} A Date object representing the given time in the same day as the current date
 * @throws {Error} If the given time string is invalid
 */
function getDateFromTimeString(timeString, date=new Date()) {

    // Parse the time string
    const timePattern = /^(\d{1,2}):(\d{2})(AM|PM)$/i;
    const match = timeString.match(timePattern);

    if (!match) {
        throw new Error("Invalid time format. Must be formatted HH:mmAM/PM.");
    }

    let [_, hours, minutes, period] = match;
    let hour = parseInt(hours, 10);
    const minute = parseInt(minutes, 10);

    // Adjust hour based on AM/PM
    if (period.toUpperCase() === "PM" && hour !== 12) {
        hour += 12;
    } else if (period.toUpperCase() === "AM" && hour === 12) {
        hour = 0;
    }

    date.setHours(hour, minute, 0, 0);
    return date;
}

class Course {

    elemContainer;
    elemCourse;
    elemStartEnd;
    elemDays;
    elemTimes;
    elemRoom;
    elemStatus;

    constructor (elem) {

        this.elemContainer = elem;

        this.elemCourse = elem.querySelector("a[id^=DERIVED_SSR_FL_SSR_SCRTAB_DTLS]");
        this.elemStartEnd = elem.querySelector("span[id^=DERIVED_SSR_FL_SSR_ST_END_DT]");
        this.elemDays = elem.querySelector("span[id^=DERIVED_SSR_FL_SSR_DAYS]");
        this.elemTimes = elem.querySelector("span[id^=DERIVED_SSR_FL_SSR_DAYSTIMES]");
        this.elemRoom = elem.querySelector("span[id^=DERIVED_SSR_FL_SSR_DRV_ROOM]");
        this.elemStatus = elem.querySelector("span[id^=DERIVED_SSR_FL_SSR_DRV_STAT]");
    }

    /**
     * @return {string} The title of the course.
     */
    get title () {
        return this.elemCourse.textContent.trim().replace(/\s{2,}/g, " ");
    }

    /**
     * @return {{start: Date, end: Date}} The start and end dates of the course.
     */
    get startEnd () {
        const [start, end] = this.elemStartEnd.textContent.split(" - ");

        return {
            start: new Date(start),
            end: new Date(end)
        }
    }

    /**
     * @return {Date} The start date of the course.
     */
    get start () {
        return this.startEnd.start;
    }

    /**
     * @return {Date} The end date of the course.
     */
    get end () {
        return this.startEnd.end;
    }

    /**
     * @return {Array<string|null>} The days of the week that the course takes place, or null if the course is online/unknown.
     */
    get days () {
        const content = this.elemDays.textContent.trim().slice(6).toUpperCase();
        if (content === "TO BE ANNOUNCED") return null;

        return content.split(" ");
    }

    /**
     * @return {Array<string|null>} The start and end times of the course, or null if the course is online/unknown.
     */
    get times () {
        const content = this.elemTimes.textContent.trim().slice(7).toUpperCase()
        if (content === "TO BE ANNOUNCED") return null;

        return content.split(" TO ");
    }

    /**
     * @return {string|null} The room that the course is held in, or null if the course is online.
     */
    get room () {
        const room = this.elemRoom.textContent.replace(/\s/g, "").toUpperCase();
        return room === "ONLINE" ? null : room;
    }

    /**
     * @return {CourseStatus} The current enrollment status of the course, or -1 if it is unknown.
     */
    get status () {
        switch (this.elemStatus.textContent.replace(/\s/g, "").toUpperCase()) {
            case "ENROLLED":
                return CourseStatus.ENROLLED;
            case "WAITING":
                return CourseStatus.WAITLIST;
            default:
                return -1;
        }
    }

    /**
     * @return {Event} Create a Google Calander event from the course data.
     */
    toEvent () {
        if (this.room === null) return null;

        return {
            summary: `${this.room} (${this.title})`,
            location: this.room,
            description: this.toString(),
            start: { dateTime: this.start.toISOString() },
            end: { dateTime: this.end.toISOString() },
            recurrence: [
                // Recurrence component properties
                "RRULE:FREQ=WEEKLY;BYDAY=" + this.days.map(e => e.slice(0, 2)).join(",")
            ],
            reminders: {
                useDefault: false,
                overrides: [
                    { method: "popup", minutes: 15 },
                    { method: "popup", minutes: 90 }
                ]
            }
        }
    }

    toICS () {
        const start = toICS(this.start);
        const end = toICS(this.end);
        const rrule = `FREQ=WEEKLY;BYDAY=${this.days.map(e => e.slice(0, 2)).join(",")};UNTIL=${end}Z`;
        const times = this.times;

        return `BEGIN:VEVENT
UID:${this.title.replace(/[^a-zA-Z0-9]/g, "")}@samuel-kw
SUMMARY:${this.title}
DESCRIPTION:${this.elemTimes.textContent.trim().slice(7)} on ${this.elemDays.textContent.trim().slice(6)}
LOCATION:${this.room}
DTSTART:${toICS(getDateFromTimeString(times[0], this.start))}
DTEND:${toICS(getDateFromTimeString(times[1], this.start))}
DTSTAMP:${start}
RRULE:${rrule}
CREATED:${toICS(new Date())}
PRIORITY:0
STATUS:CONFIRMED
END:VEVENT
`;
    }

    toString () {
        return `${this.title} (${this.room})
    Days: ${this.days?.join(", ")}
    Times: ${this.times?.join(", ")}
    Start: ${this.start}
    End: ${this.end}
    Status: ${Object.keys(CourseStatus).find(key => CourseStatus[key] === this.status)}`;
    
    }
}

let str = `BEGIN:VCALENDAR
PRODID:-//Samuel KW//SDSU Class Exporter 0.0.1
VERSION:2.0
CALSCALE:GREGORIAN
X-WR-CALNAME:SDSU School Schedule
X-WR-TIMEZONE:${Timezone}
BEGIN:VTIMEZONE
TZID:${Timezone}
X-LIC-LOCATION:${Timezone}
BEGIN:DAYLIGHT
TZOFFSETFROM:-0800
TZOFFSETTO:-0700
TZNAME:PDT
DTSTART:19700308T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:-0700
TZOFFSETTO:-0800
TZNAME:PST
DTSTART:19701101T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
END:STANDARD
END:VTIMEZONE
`;

const elemCourses = document.querySelectorAll("div.ps_box-group > div.ps_box-scrollarea.psc_border-bottomonly > div.ps_box-scrollarea-row");
for (const elem of elemCourses) {
    const course = new Course(elem);

    if (course.room)
        str += course.toICS();
    else
        console.log("Skipping online course:", course.toEvent());
}

download(str + "END:VCALENDAR")
