import type { PersonalWishesState } from '../types/api';

/** Creates a blank state matching the backend's initial state. */
export function createEmptyState(): PersonalWishesState {
  return {
    full_name: { value: null, status: 'unknown' },
    home_address: { value: null, status: 'unknown' },
    covers_worldwide_assets: { value: null, status: 'unknown' },
    has_children: { value: null, status: 'unknown' },
    children: { value: null, status: 'unknown' },
    executor: { value: null, status: 'unknown' },
    specific_gifts: { value: null, status: 'unknown' },
    additional_wishes: { value: null, status: 'unknown' },
  };
}
