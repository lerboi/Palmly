import type { ViewStyle } from 'react-native';
import { Logomark } from './Logomark';

export interface SealBadgeProps {
  /** @deprecated The CJK glyph is gone — the mark is now the traced-palm Logomark. Ignored. */
  glyph?: string;
  /** Square edge length in px. Default 40. */
  size?: number;
  /** `filled` = inked stamp tile; `outline` = tile outline only. */
  variant?: 'filled' | 'outline';
  style?: ViewStyle;
}

/**
 * @deprecated Back-compat shim. The cinnabar chop + Noto Serif TC glyph is retired (redesign
 * §2); this now renders the CJK-free {@link Logomark} `stamp`. Call sites migrate to `Logomark`
 * (brand mark) or `Icon` (functional glyphs) in the screen tasks (R11/R15/R19); this keeps them
 * compiling and CJK-free in the meantime.
 */
export function SealBadge({ size = 40, variant = 'filled', style }: SealBadgeProps) {
  return (
    <Logomark
      size={size}
      variant="stamp"
      tone="heritage"
      filled={variant === 'filled'}
      style={style}
    />
  );
}
