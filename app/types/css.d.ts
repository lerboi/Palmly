// Type declarations for CSS imports used by Expo's web target (global.css, *.module.css).
// Native (iOS/Android) ignores these at runtime; this only satisfies the TypeScript checker.
declare module '*.css';

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
