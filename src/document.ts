import type { PersonalWishesState } from './types.js';

// ─── Document Generation ─────────────────────────────────────
// Generates a human-readable draft Personal Wishes Document
// from the structured state.

/**
 * Generates a plain-text draft of the Personal Wishes Document.
 * Only includes fields that have been confirmed.
 * Always includes a disclaimer that this is fictional and not legal advice.
 */
export function generateDocument(state: PersonalWishesState): string {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('  Fictional Personal Wishes Document — Not Legal Advice');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');
  lines.push('⚠️  DISCLAIMER: This is a FICTIONAL document generated for');
  lines.push('   demonstration purposes only. It does NOT constitute');
  lines.push('   legal advice, has no legal standing, and should NOT be');
  lines.push('   used as a substitute for proper legal counsel. Consult a');
  lines.push('   qualified solicitor for actual estate planning.');
  lines.push('');
  lines.push('───────────────────────────────────────────────────────────');

  // Personal details
  lines.push('');
  lines.push('SECTION 1: PERSONAL DETAILS');
  lines.push('');

  if (state.full_name.status === 'confirmed' && state.full_name.value) {
    lines.push(`  Full Name:      ${state.full_name.value}`);
  } else {
    lines.push('  Full Name:      [Not yet provided]');
  }

  if (state.home_address.status === 'confirmed' && state.home_address.value) {
    lines.push(`  Home Address:   ${state.home_address.value}`);
  } else {
    lines.push('  Home Address:   [Not yet provided]');
  }

  // Scope
  lines.push('');
  lines.push('SECTION 2: SCOPE');
  lines.push('');

  if (state.covers_worldwide_assets.status === 'confirmed' && state.covers_worldwide_assets.value !== null) {
    lines.push(
      `  Worldwide Assets: ${state.covers_worldwide_assets.value ? 'Yes — this document covers worldwide assets' : 'No — this document covers domestic assets only'}`
    );
  } else {
    lines.push('  Worldwide Assets: [Not yet confirmed]');
  }

  // Children
  lines.push('');
  lines.push('SECTION 3: CHILDREN');
  lines.push('');

  if (state.has_children.status === 'confirmed' && state.has_children.value !== null) {
    if (state.has_children.value) {
      lines.push('  Has Children: Yes');

      if (state.children.status === 'confirmed' && state.children.value && state.children.value.length > 0) {
        lines.push('');
        for (const child of state.children.value) {
          const agePart = child.age !== undefined ? `, age ${child.age}` : '';
          lines.push(`    • ${child.name}${agePart}`);
        }
      } else {
        lines.push('  Children Details: [Not yet provided]');
      }
    } else {
      lines.push('  Has Children: No');
    }
  } else {
    lines.push('  Has Children: [Not yet confirmed]');
  }

  // Executor
  lines.push('');
  lines.push('SECTION 4: EXECUTOR');
  lines.push('');

  if (state.executor.status === 'confirmed' && state.executor.value) {
    lines.push(`  Name:          ${state.executor.value.name}`);
    lines.push(`  Relationship:  ${state.executor.value.relationship}`);
  } else {
    lines.push('  Executor: [Not yet designated]');
  }

  // Specific Gifts
  lines.push('');
  lines.push('SECTION 5: SPECIFIC GIFTS');
  lines.push('');

  if (state.specific_gifts.status === 'confirmed' && state.specific_gifts.value && state.specific_gifts.value.length > 0) {
    for (const gift of state.specific_gifts.value) {
      lines.push(`    • ${gift.item} → ${gift.recipient}`);
    }
  } else {
    lines.push('  No specific gifts designated.');
  }

  // Additional Wishes
  lines.push('');
  lines.push('SECTION 6: ADDITIONAL WISHES');
  lines.push('');

  if (state.additional_wishes.status === 'confirmed' && state.additional_wishes.value) {
    lines.push(`  ${state.additional_wishes.value}`);
  } else {
    lines.push('  No additional wishes recorded.');
  }

  // Footer
  lines.push('');
  lines.push('───────────────────────────────────────────────────────────');
  lines.push('');
  lines.push('  Status: DRAFT — Not reviewed or finalised');
  lines.push('');
  lines.push('  This is a FICTIONAL document and for demonstration');
  lines.push('  purposes only. It is NOT legal advice.');
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════');

  return lines.join('\n');
}
