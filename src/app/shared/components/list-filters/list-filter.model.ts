import { StatusChipTone } from '../status-chip/status-chip';

export interface ListFilterOption {
  value: string;
  label: string;
  /** Si viene, la opción se pinta como chip de estado dentro del menú. */
  tone?: StatusChipTone;
}

export interface ListFilterConfig {
  key: string;
  label: string;
  options: ListFilterOption[];
  allLabel?: string;
}
