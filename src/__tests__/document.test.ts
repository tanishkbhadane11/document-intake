import { describe, it, expect } from 'vitest';
import { generateDocument } from '../document.js';
import { createEmptyState } from '../state.js';
import type { PersonalWishesState } from '../types.js';

describe('generateDocument', () => {
  it('generates a document from empty state', () => {
    const state = createEmptyState();
    const doc = generateDocument(state);

    expect(doc).toContain('Fictional Personal Wishes Document');
    expect(doc).toContain('Not Legal Advice');
    expect(doc).toContain('FICTIONAL');
    expect(doc).toContain('[Not yet provided]');
  });

  it('generates a document with fully confirmed state', () => {
    const state: PersonalWishesState = {
      full_name: { value: 'Jane Doe', status: 'confirmed' },
      home_address: { value: '42 Elm Street, London', status: 'confirmed' },
      covers_worldwide_assets: { value: true, status: 'confirmed' },
      has_children: { value: true, status: 'confirmed' },
      children: {
        value: [
          { name: 'Tom', age: 12 },
          { name: 'Lisa' },
        ],
        status: 'confirmed',
      },
      executor: {
        value: { name: 'John Smith', relationship: 'brother' },
        status: 'confirmed',
      },
      specific_gifts: {
        value: [
          { item: 'Piano', recipient: 'Tom' },
          { item: 'Grandmother\'s ring', recipient: 'Lisa' },
        ],
        status: 'confirmed',
      },
      additional_wishes: {
        value: 'I want my ashes scattered at sea.',
        status: 'confirmed',
      },
    };

    const doc = generateDocument(state);

    // Check personal details
    expect(doc).toContain('Jane Doe');
    expect(doc).toContain('42 Elm Street, London');

    // Check scope
    expect(doc).toContain('worldwide assets');

    // Check children
    expect(doc).toContain('Tom');
    expect(doc).toContain('age 12');
    expect(doc).toContain('Lisa');

    // Check executor
    expect(doc).toContain('John Smith');
    expect(doc).toContain('brother');

    // Check gifts
    expect(doc).toContain('Piano');
    expect(doc).toContain('Grandmother\'s ring');

    // Check additional wishes
    expect(doc).toContain('ashes scattered at sea');

    // Check disclaimers
    expect(doc).toContain('FICTIONAL');
    expect(doc).toContain('NOT legal advice');
    expect(doc).toContain('DRAFT');
  });

  it('handles has_children=false correctly', () => {
    const state = createEmptyState();
    state.has_children = { value: false, status: 'confirmed' };

    const doc = generateDocument(state);
    expect(doc).toContain('Has Children: No');
  });

  it('handles covers_worldwide_assets=false correctly', () => {
    const state = createEmptyState();
    state.covers_worldwide_assets = { value: false, status: 'confirmed' };

    const doc = generateDocument(state);
    expect(doc).toContain('domestic assets only');
  });

  it('shows placeholder for unknown executor', () => {
    const state = createEmptyState();
    const doc = generateDocument(state);
    expect(doc).toContain('[Not yet designated]');
  });

  it('shows no specific gifts when none are set', () => {
    const state = createEmptyState();
    const doc = generateDocument(state);
    expect(doc).toContain('No specific gifts designated');
  });

  it('always includes the fictional disclaimer', () => {
    const state = createEmptyState();
    const doc = generateDocument(state);

    // Must appear in both header and footer
    expect(doc).toContain('Fictional Personal Wishes Document');
    expect(doc).toContain('Not Legal Advice');
    const ficMatches = doc.match(/FICTIONAL/gi);
    expect(ficMatches).toBeTruthy();
    expect(ficMatches!.length).toBeGreaterThanOrEqual(2);
  });

  it('generates partial document with only some fields confirmed', () => {
    const state = createEmptyState();
    state.full_name = { value: 'Jane Doe', status: 'confirmed' };
    state.executor = { value: { name: 'John', relationship: 'brother' }, status: 'confirmed' };

    const doc = generateDocument(state);

    expect(doc).toContain('Jane Doe');
    expect(doc).toContain('John');
    expect(doc).toContain('brother');
    expect(doc).toContain('[Not yet provided]'); // missing address
    expect(doc).toContain('[Not yet confirmed]'); // missing worldwide assets
  });

  it('document from corrected state shows only new values', () => {
    const state: PersonalWishesState = {
      full_name: { value: 'Jane Smith', status: 'confirmed' },
      home_address: { value: '20 New Road', status: 'confirmed' },
      covers_worldwide_assets: { value: false, status: 'confirmed' },
      has_children: { value: false, status: 'confirmed' },
      children: { value: null, status: 'unknown' },
      executor: { value: { name: 'James', relationship: 'son' }, status: 'confirmed' },
      specific_gifts: { value: [], status: 'confirmed' },
      additional_wishes: { value: 'Cremation.', status: 'confirmed' },
    };

    const doc = generateDocument(state);

    expect(doc).toContain('Jane Smith');
    expect(doc).toContain('20 New Road');
    expect(doc).toContain('domestic assets only');
    expect(doc).toContain('Has Children: No');
    expect(doc).toContain('James');
    expect(doc).toContain('son');
    expect(doc).toContain('Cremation.');
  });
});
