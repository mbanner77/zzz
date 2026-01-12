"use client";

import {
  JSX,
  useEffect,
  useMemo,
  useState,
  DragEvent as ReactDragEvent,
} from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";

type View = "month" | "week" | "day";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  allDay?: boolean;
}

const STORAGE_KEY = "calendar-events-v1";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  return addDays(d, -diff);
}

function formatDateRangeForWeek(start: Date): string {
  const end = addDays(start, 6);
  const locale = "de-DE";
  const startStr = start.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
  });
  const endStr = end.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${startStr} – ${endStr}`;
}

function getEventsForDay(events: CalendarEvent[], date: Date): CalendarEvent[] {
  return events.filter((e) => isSameDay(new Date(e.start), date));
}

function getHours(): number[] {
  return Array.from({ length: 12 }, (_, i) => i + 8);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function durationMs(ev: CalendarEvent): number {
  return new Date(ev.end).getTime() - new Date(ev.start).getTime();
}

export function Calendar(): JSX.Element {
  const [currentDate, setCurrentDate] = useState<Date>(() =>
    startOfDay(new Date())
  );
  const [view, setView] = useState<View>("month");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const [formDate, setFormDate] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("10:00");
  const [formDescription, setFormDescription] = useState("");
  const [formAllDay, setFormAllDay] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw != null) {
      try {
        const parsed = JSON.parse(raw) as CalendarEvent[];
        setEvents(parsed);
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }, [events]);

  const today = useMemo<Date>(() => startOfDay(new Date()), []);
  const hours = useMemo<number[]>(() => getHours(), []);
  const weekStart = useMemo<Date>(() => startOfWeek(currentDate), [currentDate]);

  function openNewEventModal(date: Date): void {
    const isoDate = date.toISOString().slice(0, 10);
    setEditingEventId(null);
    setFormDate(isoDate);
    setFormTitle("");
    setFormDescription("");
    setFormAllDay(false);
    setFormStartTime("09:00");
    setFormEndTime("10:00");
    setIsModalOpen(true);
  }

  function openEditEventModal(ev: CalendarEvent): void {
    const start = new Date(ev.start);
    const end = new Date(ev.end);
    setEditingEventId(ev.id);
    setFormDate(ev.start.slice(0, 10));
    setFormTitle(ev.title);
    setFormDescription(ev.description ?? "");
    setFormAllDay(ev.allDay ?? false);
    setFormStartTime(start.toTimeString().slice(0, 5));
    setFormEndTime(end.toTimeString().slice(0, 5));
    setIsModalOpen(true);
  }

  function resetModal(): void {
    setIsModalOpen(false);
    setEditingEventId(null);
  }

  function handleSaveEvent(): void {
    if (!formTitle.trim() || !formDate) {
      return;
    }

    const baseDate = formDate;
    const startIso = formAllDay
      ? new Date(`${baseDate}T00:00:00`).toISOString()
      : new Date(`${baseDate}T${formStartTime}:00`).toISOString();
    const endIso = formAllDay
      ? new Date(`${baseDate}T23:59:00`).toISOString()
      : new Date(`${baseDate}T${formEndTime}:00`).toISOString();

    if (editingEventId != null) {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === editingEventId
            ? {
                ...e,
                title: formTitle.trim(),
                description: formDescription.trim() || undefined,
                start: startIso,
                end: endIso,
                allDay: formAllDay,
              }
            : e
        )
      );
    } else {
      setEvents((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          title: formTitle.trim(),
          description: formDescription.trim() || undefined,
          start: startIso,
          end: endIso,
          allDay: formAllDay,
        },
      ]);
    }

    resetModal();
  }

  function handleDeleteEvent(): void {
    if (editingEventId == null) return;
    setEvents((prev) => prev.filter((e) => e.id !== editingEventId));
    resetModal();
  }

  function handleEventDragStart(
    e: ReactDragEvent<HTMLDivElement>,
    eventId: string
  ): void {
    e.dataTransfer.setData("text/event-id", eventId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDayCellDragOver(e: ReactDragEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function moveEventToDate(eventId: string, targetDate: Date): void {
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== eventId) return ev;
        const oldStart = new Date(ev.start);
        const dur = durationMs(ev);
        const newStart = new Date(targetDate);
        newStart.setHours(
          oldStart.getHours(),
          oldStart.getMinutes(),
          0,
          0
        );
        const newEnd = new Date(newStart.getTime() + dur);
        return {
          ...ev,
          start: newStart.toISOString(),
          end: newEnd.toISOString(),
          allDay: ev.allDay,
        };
      })
    );
  }

  function moveEventToDateTime(
    eventId: string,
    targetDate: Date,
    hour: number
  ): void {
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== eventId) return ev;
        const dur = durationMs(ev);
        const newStart = new Date(targetDate);
        newStart.setHours(hour, 0, 0, 0);
        const newEnd = new Date(newStart.getTime() + dur);
        return {
          ...ev,
          start: newStart.toISOString(),
          end: newEnd.toISOString(),
          allDay: false,
        };
      })
    );
  }

  function handleDayCellDrop(
    date: Date,
    e: ReactDragEvent<HTMLDivElement>
  ): void {
    e.preventDefault();
    const eventId = e.dataTransfer.getData("text/event-id");
    if (!eventId) return;
    moveEventToDate(eventId, date);
  }

  function handleTimeSlotDrop(
    date: Date,
    hour: number,
    e: ReactDragEvent<HTMLDivElement>
  ): void {
    e.preventDefault();
    const eventId = e.dataTransfer.getData("text/event-id");
    if (!eventId) return;
    moveEventToDateTime(eventId, date, hour);
  }

  const monthView = useMemo<JSX.Element>(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: (firstDay + 6) % 7 }, (_, i) => i);

    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentDate(new Date(year, month - 1))}
              className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date(year, month + 1))}
              className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <Button
              variant="secondary"
              size="sm"
              className="ml-1"
              onClick={() => setCurrentDate(startOfDay(new Date()))}
            >
              Heute
            </Button>
          </div>
          <h2 className="text-xl font-bold text-center md:text-right">
            {currentDate.toLocaleDateString("de-DE", {
              month: "long",
              year: "numeric",
            })}
          </h2>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
            <div
              key={d}
              className="text-center text-xs text-zinc-500 py-2"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {blanks.map((i) => (
            <div key={`b${i}`} className="aspect-square" />
          ))}
          {days.map((day) => {
            const cellDate = new Date(year, month, day);
            const dayEvents = getEventsForDay(events, cellDate);
            const isTodayFlag = isSameDay(cellDate, today);

            return (
              <div
                key={day}
                className={`aspect-square p-2 rounded-xl border cursor-pointer flex flex-col transition-all ${
                  isTodayFlag
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-zinc-800 hover:bg-zinc-800/50 hover:border-zinc-700"
                }`}
                onClick={() => {
                  setCurrentDate(cellDate);
                  setView("day");
                }}
                onDoubleClick={(evt) => {
                  evt.stopPropagation();
                  openNewEventModal(cellDate);
                }}
                onDragOver={handleDayCellDragOver}
                onDrop={(evt) => handleDayCellDrop(cellDate, evt)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-sm font-medium ${
                      isTodayFlag ? "text-blue-400" : ""
                    }`}
                  >
                    {day}
                  </span>
                  {dayEvents.length > 0 ? (
                    <Badge variant="info">{dayEvents.length}</Badge>
                  ) : null}
                </div>
                <div className="space-y-0.5 overflow-hidden">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      draggable
                      onDragStart={(evt) =>
                        handleEventDragStart(evt, ev.id)
                      }
                      onClick={(evt) => {
                        evt.stopPropagation();
                        openEditEventModal(ev);
                      }}
                      className="text-[10px] bg-blue-500/20 text-blue-200 rounded px-1 py-0.5 truncate hover:bg-blue-500/30"
                    >
                      {ev.allDay
                        ? "Ganztägig"
                        : formatTime(new Date(ev.start))}{" "}
                      · {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 ? (
                    <div className="text-[10px] text-zinc-500">
                      +{dayEvents.length - 3} weitere
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }, [currentDate, events, today]);

  const weekView = useMemo<JSX.Element>(() => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentDate(addDays(currentDate, -7))}
              className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(addDays(currentDate, 7))}
              className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <Button
              variant="secondary"
              size="sm"
              className="ml-1"
              onClick={() => setCurrentDate(startOfDay(new Date()))}
            >
              Heute
            </Button>
          </div>
          <h2 className="text-lg font-semibold text-center md:text-right">
            Woche: {formatDateRangeForWeek(weekStart)}
          </h2>
        </div>

        <div className="grid grid-cols-8 gap-1 mb-1">
          <div className="text-xs text-zinc-500 py-2 text-right pr-2">
            Zeit
          </div>
          {days.map((d) => {
            const isTodayFlag = isSameDay(d, today);
            return (
              <div
                key={d.toISOString()}
                className={`text-center text-xs py-2 rounded-lg ${
                  isTodayFlag
                    ? "bg-blue-500/10 text-blue-300"
                    : "text-zinc-400"
                }`}
              >
                {d.toLocaleDateString("de-DE", {
                  weekday: "short",
                  day: "numeric",
                })}
              </div>
            );
          })}
        </div>

        <div className="flex">
          <div className="w-14 flex flex-col text-[11px] text-zinc-500">
            {hours.map((h) => (
              <div
                key={h}
                className="h-10 flex items-start justify-end pr-2"
              >
                {h.toString().padStart(2, "0")}:00
              </div>
            ))}
          </div>

          <div className="flex-1 grid grid-cols-7 gap-1">
            {days.map((day) => (
              <div key={day.toISOString()} className="flex flex-col">
                {hours.map((h) => {
                  const slotDate = new Date(day);
                  slotDate.setHours(h, 0, 0, 0);
                  const slotEvents = events.filter((ev) => {
                    const s = new Date(ev.start);
                    return (
                      s.getFullYear() === slotDate.getFullYear() &&
                      s.getMonth() === slotDate.getMonth() &&
                      s.getDate() === slotDate.getDate() &&
                      s.getHours() === slotDate.getHours()
                    );
                  });

                  return (
                    <div
                      key={`${day.toISOString()}-${h}`}
                      className="h-10 border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/40 rounded-md px-1 py-0.5 overflow-hidden cursor-pointer transition-colors"
                      onDoubleClick={() => openNewEventModal(slotDate)}
                      onDragOver={handleDayCellDragOver}
                      onDrop={(evt) => handleTimeSlotDrop(day, h, evt)}
                    >
                      {slotEvents.map((ev) => (
                        <div
                          key={ev.id}
                          draggable
                          onDragStart={(evt) =>
                            handleEventDragStart(evt, ev.id)
                          }
                          onClick={(evt) => {
                            evt.stopPropagation();
                            openEditEventModal(ev);
                          }}
                          className="text-[10px] bg-emerald-500/20 text-emerald-200 rounded px-1 py-0.5 truncate hover:bg-emerald-500/30"
                        >
                          {ev.title}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }, [currentDate, events, hours, today, weekStart]);

  const dayView = useMemo<JSX.Element>(() => {
    const day = currentDate;
    const dayEvents = getEventsForDay(events, day).sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentDate(addDays(currentDate, -1))}
              className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(addDays(currentDate, 1))}
              className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <Button
              variant="secondary"
              size="sm"
              className="ml-1"
              onClick={() => setCurrentDate(startOfDay(new Date()))}
            >
              Heute
            </Button>
          </div>
          <h2 className="text-lg font-semibold text-center md:text-right">
            {day.toLocaleDateString("de-DE", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-zinc-950/40 border border-zinc-800 rounded-2xl p-3">
            <div className="flex">
              <div className="w-14 flex flex-col text-[11px] text-zinc-500">
                {hours.map((h) => (
                  <div
                    key={h}
                    className="h-10 flex items-start justify-end pr-2"
                  >
                    {h.toString().padStart(2, "0")}:00
                  </div>
                ))}
              </div>
              <div className="flex-1 flex flex-col">
                {hours.map((h) => {
                  const slotDate = new Date(day);
                  slotDate.setHours(h, 0, 0, 0);
                  const slotEvents = events.filter((ev) => {
                    const s = new Date(ev.start);
                    return (
                      s.getFullYear() === slotDate.getFullYear() &&
                      s.getMonth() === slotDate.getMonth() &&
                      s.getDate() === slotDate.getDate() &&
                      s.getHours() === slotDate.getHours()
                    );
                  });

                  return (
                    <div
                      key={h}
                      className="h-10 border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/40 rounded-md px-1 py-0.5 overflow-hidden cursor-pointer transition-colors"
                      onDoubleClick={() => openNewEventModal(slotDate)}
                      onDragOver={handleDayCellDragOver}
                      onDrop={(evt) => handleTimeSlotDrop(day, h, evt)}
                    >
                      {slotEvents.map((ev) => (
                        <div
                          key={ev.id}
                          draggable
                          onDragStart={(evt) =>
                            handleEventDragStart(evt, ev.id)
                          }
                          onClick={(evt) => {
                            evt.stopPropagation();
                            openEditEventModal(ev);
                          }}
                          className="text-[10px] bg-purple-500/20 text-purple-200 rounded px-1 py-0.5 truncate hover:bg-purple-500/30"
                        >
                          {ev.title}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-zinc-950/40 border border-zinc-800 rounded-2xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-500" />
                <span className="text-sm font-medium text-zinc-300">
                  Termine des Tages
                </span>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => openNewEventModal(day)}
              >
                <Plus className="w-4 h-4 mr-1" /> Neu
              </Button>
            </div>
            {dayEvents.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-zinc-500 text-sm">
                Keine Termine für diesen Tag.
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-64 pr-1">
                {dayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors"
                    onClick={() => openEditEventModal(ev)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {ev.title}
                        </span>
                        {ev.allDay ? (
                          <Badge variant="info">Ganztägig</Badge>
                        ) : null}
                      </div>
                    </div>
                    {!ev.allDay ? (
                      <div className="text-xs text-zinc-400 mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(new Date(ev.start))} –{" "}
                        {formatTime(new Date(ev.end))}
                      </div>
                    ) : null}
                    {ev.description ? (
                      <div className="text-xs text-zinc-400 line-clamp-2">
                        {ev.description}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }, [currentDate, events, hours, today]);

  return (
    <>
      <Card className="w-full bg-zinc-900/60 border-zinc-800 shadow-xl">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-400" />
              Interaktiver Kalender
            </CardTitle>
            <CardDescription>
              Termine in Monats-, Wochen- oder Tagesansicht verwalten und per
              Drag-and-Drop verschieben.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={view === "month" ? "primary" : "secondary"}
              onClick={() => setView("month")}
            >
              Monat
            </Button>
            <Button
              size="sm"
              variant={view === "week" ? "primary" : "secondary"}
              onClick={() => setView("week")}
            >
              Woche
            </Button>
            <Button
              size="sm"
              variant={view === "day" ? "primary" : "secondary"}
              onClick={() => setView("day")}
            >
              Tag
            </Button>
            <Button
              size="sm"
              variant="primary"
              className="ml-2"
              onClick={() => openNewEventModal(currentDate)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Neuer Termin
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {view === "month" && monthView}
          {view === "week" && weekView}
          {view === "day" && dayView}
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={resetModal}
        title={editingEventId != null ? "Termin bearbeiten" : "Neuen Termin erstellen"}
      >
        <div className="space-y-3">
          <Input
            label="Titel"
            value={formTitle}
            onChange={setFormTitle}
            placeholder="z.B. Meeting mit Team"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Datum"
              type="date"
              value={formDate}
              onChange={setFormDate}
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-400">
                Ganztägig
              </label>
              <button
                type="button"
                onClick={() => setFormAllDay((v) => !v)}
                className={`w-full px-3 py-2 rounded-xl border text-sm transition-colors ${
                  formAllDay
                    ? "border-blue-500 bg-blue-500/10 text-blue-300"
                    : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                {formAllDay ? "Ja" : "Nein"}
              </button>
            </div>
          </div>
          {!formAllDay ? (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Beginn"
                type="time"
                value={formStartTime}
                onChange={setFormStartTime}
              />
              <Input
                label="Ende"
                type="time"
                value={formEndTime}
                onChange={setFormEndTime}
              />
            </div>
          ) : null}
          <Input
            label="Beschreibung"
            value={formDescription}
            onChange={setFormDescription}
            placeholder="Optional"
          />
          <div className="flex items-center justify-between pt-2">
            {editingEventId != null ? (
              <Button variant="danger" size="sm" onClick={handleDeleteEvent}>
                <Trash2 className="w-4 h-4 mr-1" />
                Löschen
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={resetModal}>
                Abbrechen
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveEvent}>
                Speichern
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}