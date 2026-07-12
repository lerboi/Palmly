// Feature-schema utilities (Backend §6.2): derive a Gemini responseSchema (constrained decoding)
// from our JSON Schema, and server-side-validate extractor output (belt & suspenders on top of
// constrained decoding, which can still be broken by SAFETY/MAX_TOKENS finishes).
import AjvDefault from 'ajv';
import palmSchema from '../../../schemas/palm_features.v1.json' with { type: 'json' };
import faceSchema from '../../../schemas/face_features.v1.json' with { type: 'json' };

export { faceSchema, palmSchema };
export type FeatureKind = 'palm' | 'face';

const STRIP = new Set(['$schema', '$id', 'title', 'description', '$defs', 'definitions', 'additionalProperties']);

/**
 * Convert a JSON Schema (draft-07, with $defs/$ref) into the Gemini responseSchema subset:
 * inline every $ref and drop keywords Gemini's constrained decoder doesn't accept.
 */
export function toGeminiSchema(root: Record<string, unknown>): unknown {
  const defs = (root.$defs ?? root.definitions ?? {}) as Record<string, unknown>;
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === 'object') {
      const obj = node as Record<string, unknown>;
      if (typeof obj.$ref === 'string') {
        const name = obj.$ref.replace(/^#\/(\$defs|definitions)\//, '');
        return walk(defs[name]);
      }
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (STRIP.has(k)) continue;
        out[k] = walk(v);
      }
      return out;
    }
    return node;
  };
  return walk(root);
}

// Deno's npm type resolution surfaces ajv's CJS default export as a namespace, though it is the
// Ajv class at runtime; cast to a construct signature so `deno check` passes.
type ValidateFn = ((data: unknown) => boolean) & { errors?: unknown };
type AjvInstance = { compile(schema: unknown): ValidateFn; errorsText(errors?: unknown): string };
const Ajv = AjvDefault as unknown as new (opts?: Record<string, unknown>) => AjvInstance;

const ajv = new Ajv({ allErrors: true, strict: false });
const validators: Record<FeatureKind, ValidateFn> = {
  palm: ajv.compile(palmSchema),
  face: ajv.compile(faceSchema),
};

export function validateFeatures(kind: FeatureKind, features: unknown): { valid: boolean; errors?: string } {
  const validate = validators[kind];
  const valid = validate(features);
  return valid ? { valid: true } : { valid: false, errors: ajv.errorsText(validate.errors) };
}
