const CourseStatus = Object.freeze({
    UNKNOWN: -1,
    ENROLLED: 0,
    WAITLIST: 1
});

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

    toString () {
        return `${this.title} (${this.room})
    Days: ${this.days?.join(", ")}
    Times: ${this.times?.join(", ")}
    Start: ${this.start}
    End: ${this.end}
    Status: ${Object.keys(CourseStatus).find(key => CourseStatus[key] === this.status)}`;
    
    }
}

const elemCourses = document.querySelectorAll("div.ps_box-group > div.ps_box-scrollarea > div.ps_box-scrollarea-row[id^=win11divSSR_SBJCT_LVL1_row]");
for (const elem of elemCourses) {
    const course = new Course(elem);
    console.log(course.toEvent());
}