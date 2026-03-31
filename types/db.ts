import type { Database } from "./database";

type Public = Database["public"];

export type DayRow = Public["Tables"]["days"]["Row"];
export type DayInsert = Public["Tables"]["days"]["Insert"];
export type DayUpdate = Public["Tables"]["days"]["Update"];

export type EntryRow = Public["Tables"]["entries"]["Row"];
export type EntryInsert = Public["Tables"]["entries"]["Insert"];
export type EntryUpdate = Public["Tables"]["entries"]["Update"];

export type DipendenteRow = Public["Tables"]["dipendenti"]["Row"];

export type CommessaRow = Public["Tables"]["commesse"]["Row"];
export type AttivitaRow = Public["Tables"]["attivita"]["Row"];

// Se day_summaries è una VIEW, sta sotto Views
export type DaySummaryRow = Public["Views"]["day_summaries"]["Row"];
export type Entriesdesc = Public["Views"]["entriesdesc"]["Row"];

export type TimeOffRequestRow = Public["Tables"]["time_off_requests"]["Row"];
export type TimeOffRequestInsert = Public["Tables"]["time_off_requests"]["Insert"];
export type TimeOffRequestUpdate = Public["Tables"]["time_off_requests"]["Update"];