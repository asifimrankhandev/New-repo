import type { EvidenceType } from './enums';
import type { EvidenceAttachment, RefundCase } from './models';

export interface ReadinessItem {
  id: 'purchase' | 'return-documents' | 'hand-over' | 'delivery' | 'retailer';
  label: string;
  /** Evidence type to preselect when the user adds the missing item. */
  suggestedType: EvidenceType;
  satisfied: boolean;
  fileCount: number;
}

export interface Readiness {
  items: ReadinessItem[];
  satisfiedCount: number;
  total: number;
  firstMissing: ReadinessItem | null;
}

interface ItemDefinition {
  id: ReadinessItem['id'];
  label: string;
  types: readonly EvidenceType[];
  applies: (refundCase: Pick<RefundCase, 'returnMethod'>) => boolean;
}

const physicalReturn = ({ returnMethod }: Pick<RefundCase, 'returnMethod'>) =>
  returnMethod !== 'cancellation';
const shippedReturn = ({ returnMethod }: Pick<RefundCase, 'returnMethod'>) =>
  returnMethod !== 'in-store' && returnMethod !== 'cancellation';

const DEFINITIONS: readonly ItemDefinition[] = [
  { id: 'purchase', label: 'Purchase receipt', types: ['purchase-receipt'], applies: () => true },
  {
    id: 'return-documents',
    label: 'Return label or authorization',
    types: ['return-label', 'return-authorization'],
    applies: shippedReturn,
  },
  {
    id: 'hand-over',
    label: 'Drop-off or return receipt',
    types: ['drop-off-receipt'],
    applies: physicalReturn,
  },
  {
    id: 'delivery',
    label: 'Delivery confirmation',
    types: ['delivery-confirmation', 'tracking'],
    applies: shippedReturn,
  },
  {
    id: 'retailer',
    label: 'Retailer messages',
    types: ['retailer-message', 'refund-confirmation'],
    applies: () => true,
  },
];

/**
 * Case-readiness checklist: which kinds of evidence the user has gathered before contacting
 * a retailer. It describes completeness of the record, never the strength of a legal claim.
 */
export function getReadiness(
  refundCase: Pick<RefundCase, 'returnMethod'>,
  evidence: readonly Pick<EvidenceAttachment, 'evidenceType'>[],
): Readiness {
  const items = DEFINITIONS.filter((definition) => definition.applies(refundCase)).map(
    (definition): ReadinessItem => {
      const fileCount = evidence.filter((item) =>
        definition.types.includes(item.evidenceType),
      ).length;
      return {
        id: definition.id,
        label: definition.label,
        suggestedType: definition.types[0] ?? 'other',
        satisfied: fileCount > 0,
        fileCount,
      };
    },
  );
  const satisfiedCount = items.filter((item) => item.satisfied).length;
  return {
    items,
    satisfiedCount,
    total: items.length,
    firstMissing: items.find((item) => !item.satisfied) ?? null,
  };
}
