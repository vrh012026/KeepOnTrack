import {
    addDays,
    differenceInCalendarDays,
    format,
    getWeek,
    isSameDay,
    isWithinInterval,
    parseISO,
    startOfWeek,
} from "date-fns";

const dateCards = document.querySelector("#dateCards");
const weekGrid = document.querySelector("#weekGrid");
const weekLabel = document.querySelector("#weekLabel");
const checkinList = document.querySelector("#checkinList");
const routineList = document.querySelector("#routineList");
const formPanel = document.querySelector("#formPanel");
const itemForm = document.querySelector("#itemForm");
const titleInput = document.querySelector("#itemTitle");
const dateInput = document.querySelector("#itemDate");
const timeInput = document.querySelector("#itemTime");
const endDateInput = document.querySelector("#itemEndDate");
const routineIntervalInput = document.querySelector("#routineInterval");
const routineCountInput = document.querySelector("#routineCount");
const dateLabel = document.querySelector("#dateLabel");
const timeLabel = document.querySelector("#timeLabel");
const endDateLabel = document.querySelector("#endDateLabel");
const intervalLabel = document.querySelector("#intervalLabel");
const routineCountLabel = document.querySelector("#routineCountLabel");

const today = new Date();
let weekStart = startOfWeek(today, { weekStartsOn: 1 });
let selectedType = "";
let selectedRoutineId = "";
let editMode = false;
let showMyRoutines = false;

let items = JSON.parse(localStorage.getItem("stayOnTrackItems")) || [
    { id: 1, type: "event", title: "Birthday visit", date: "2026-06-07", time: "18:00" },
    { id: 2, type: "countdown", title: "Summer vacation", date: "2026-06-20", time: "" },
    { id: 3, type: "commitment", title: "Drink 3 glasses of water", date: "2026-06-01", endDate: "2026-07-01", checked: [] },
    { id: 4, type: "routine", title: "Workout", date: "", interval: "week", checked: [] },
    { id: 5, type: "routine", title: "Workout", date: "", interval: "week", checked: [] },
    { id: 6, type: "routine", title: "Workout", date: "", interval: "week", checked: [] },
];

function save() {
    localStorage.setItem("stayOnTrackItems", JSON.stringify(items));
}

function dateKey(date) {
    return format(date, "yyyy-MM-dd");
}

function weekDays() {
    return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

function daysLeft(date) {
    return Math.max(0, differenceInCalendarDays(parseISO(date), today));
}

function deleteButton(id) {
    return editMode ? `<button class="delete-button" data-delete="${id}">Delete</button>` : "";
}

function renderDates() {
    dateCards.innerHTML = items
        .filter((item) => item.type === "event" || item.type === "countdown")
        .map((item) => {
            if (item.type === "event") {
                return `
                    <article class="card">
                        <strong>${item.title}</strong>
                        <span>${format(parseISO(item.date), "dd MMMM")}</span>
                        <p>${item.time || ""}</p>
                        ${deleteButton(item.id)}
                    </article>
                `;
            }

            return `
                <article class="card">
                    <strong>${item.title}</strong>
                    <span>${daysLeft(item.date)}</span>
                    <p>days until</p>
                    <p>${format(parseISO(item.date), "dd MMMM")}</p>
                    ${deleteButton(item.id)}
                </article>
            `;
        })
        .join("");
}

function itemsForDay(day) {
    return items.filter((item) => {
        if (item.type === "routine" && item.interval === "day") {
            return isWithinInterval(day, {
                start: parseISO(item.startDate || dateKey(today)),
                end: addDays(parseISO(item.startDate || dateKey(today)), 365),
            });
        }

        if ((item.type === "event" || item.type === "countdown" || item.type === "routine") && item.date) {
            return isSameDay(parseISO(item.date), day);
        }

        if (item.type === "commitment") {
            const startDate = item.date || item.startDate;

            if (!startDate || !item.endDate) {
                return false;
            }

            return isWithinInterval(day, {
                start: parseISO(startDate),
                end: parseISO(item.endDate),
            });
        }

        return false;
    });
}

function renderWeek() {
    weekLabel.textContent = `Week ${getWeek(weekStart, { weekStartsOn: 1 })}`;

    weekGrid.innerHTML = weekDays()
        .map((day) => `
            <article class="day" data-date="${dateKey(day)}">
                <div class="day-title">
                    <p>${format(day, "EEEE")}</p>
                    <p>${format(day, "dd MMMM")}</p>
                </div>
                ${itemsForDay(day).map((item) => `
                    <div class="mini-card">
                        ${item.title}
                        ${deleteButton(item.id)}
                    </div>
                `).join("")}
            </article>
        `)
        .join("");

    document.querySelectorAll(".day").forEach((day) => {
        day.addEventListener("dragover", (event) => event.preventDefault());
        day.addEventListener("drop", () => placeRoutine(day.dataset.date));
    });
}

function renderCheckins() {
    const todaysItems = itemsForDay(today).filter((item) => {
        return (item.type === "commitment" || item.type === "routine") && !item.checked?.includes(dateKey(today));
    });

    checkinList.innerHTML = todaysItems.length
        ? todaysItems.map((item) => `
            <article class="small-card">
                ${item.title}
                <button data-check="${item.id}">Check</button>
                ${deleteButton(item.id)}
            </article>
        `).join("")
        : `<p>Nothing to check today.</p>`;
}

function renderRoutines() {
    const routines = items.filter((item) => {
        return item.type === "routine" && item.interval !== "day" && (showMyRoutines || !item.date);
    });

    routineList.innerHTML = routines.length
        ? routines.map((item) => `
            <button class="routine" draggable="true" data-id="${item.id}">
                ${item.title} / every ${item.interval || "week"}${item.date ? ` - ${format(parseISO(item.date), "EEEE")}` : ""}
                ${deleteButton(item.id)}
            </button>
        `).join("")
        : `<p>All routines are planned.</p>`;

    document.querySelectorAll(".routine").forEach((button) => {
        button.addEventListener("dragstart", () => {
            selectedRoutineId = Number(button.dataset.id);
        });
    });
}

function renderAll() {
    save();
    renderDates();
    renderWeek();
    renderCheckins();
    renderRoutines();
    addDeleteEvents();
    addCheckEvents();
}

function placeRoutine(date) {
    const routine = items.find((item) => item.id === selectedRoutineId);

    if (routine) {
        routine.date = date;
        renderAll();
    }
}

function addDeleteEvents() {
    document.querySelectorAll("[data-delete]").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            items = items.filter((item) => item.id !== Number(button.dataset.delete));
            renderAll();
        });
    });
}

function addCheckEvents() {
    document.querySelectorAll("[data-check]").forEach((button) => {
        button.addEventListener("click", () => {
            const item = items.find((item) => item.id === Number(button.dataset.check));
            item.checked ||= [];
            item.checked.push(dateKey(today));
            renderAll();
        });
    });
}

function showForm(type) {
    selectedType = type;
    itemForm.classList.remove("hidden");
    titleInput.value = "";
    dateInput.value = "";
    timeInput.value = "";
    endDateInput.value = "";
    routineIntervalInput.value = "week";
    routineCountInput.value = 3;

    dateLabel.firstChild.textContent = type === "commitment" || type === "routine" ? "Start-date" : "Date";
    dateLabel.style.display = "block";
    timeLabel.style.display = type === "event" || type === "countdown" ? "block" : "none";
    endDateLabel.style.display = type === "commitment" ? "block" : "none";
    intervalLabel.style.display = type === "routine" ? "block" : "none";
    routineCountLabel.style.display = type === "routine" ? "block" : "none";
}

function addItem(event) {
    event.preventDefault();

    if (selectedType === "routine") {
        for (let i = 0; i < Number(routineCountInput.value); i++) {
            items.push({
                id: Date.now() + i,
                type: "routine",
                title: titleInput.value,
                date: "",
                startDate: dateInput.value,
                interval: routineIntervalInput.value,
                checked: [],
            });
        }
    } else {
        items.push({
            id: Date.now(),
            type: selectedType,
            title: titleInput.value,
            date: dateInput.value,
            time: timeInput.value,
            endDate: endDateInput.value,
            checked: [],
        });
    }

    formPanel.classList.add("hidden");
    itemForm.classList.add("hidden");
    renderAll();
}

document.querySelector("#addButton").addEventListener("click", () => {
    formPanel.classList.toggle("hidden");
});

document.querySelector("#editButton").addEventListener("click", () => {
    editMode = !editMode;
    renderAll();
});

document.querySelector("#myRoutinesButton").addEventListener("click", () => {
    showMyRoutines = !showMyRoutines;
    renderAll();
});

document.querySelectorAll("[data-type]").forEach((button) => {
    button.addEventListener("click", () => showForm(button.dataset.type));
});

document.querySelector("#previousWeek").addEventListener("click", () => {
    weekStart = addDays(weekStart, -7);
    renderAll();
});

document.querySelector("#nextWeek").addEventListener("click", () => {
    weekStart = addDays(weekStart, 7);
    renderAll();
});

itemForm.addEventListener("submit", addItem);
renderAll();
