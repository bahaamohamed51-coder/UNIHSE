import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function matchIncidentId(incidentId: string | undefined | null, query: string | undefined | null): boolean {
  if (!incidentId || !query) return false;
  
  const cleanId = incidentId.trim().toLowerCase();
  const cleanQuery = query.trim().toLowerCase();
  
  // 1. Direct exact match
  if (cleanId === cleanQuery) return true;
  
  // 2. Remove standard prefix e.g. "uni-inc-", "uni-", "inc-", "uniinc-"
  const regexPrefix = /^(uni-inc-|uni_inc-|uni-|inc-|uniinc)/;
  const idRef = cleanId.replace(regexPrefix, "");
  const queryRef = cleanQuery.replace(regexPrefix, "");
  
  if (idRef === queryRef) return true;
  
  // 3. For backward compatibility if ID is "UNI-INC-1005" and they search "1005"
  if (idRef === cleanQuery) return true;
  
  return false;
}
