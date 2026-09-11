/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#F4F7FF',
    tint: '#5DE6FF',
    background: '#0B1230',
    foreground: '#F4F7FF',
    card: '#18264A',
    cardForeground: '#F4F7FF',
    primary: '#5DE6FF',
    primaryForeground: '#07101C',
    secondary: '#24365F',
    secondaryForeground: '#D8E1FF',
    muted: '#202F55',
    mutedForeground: '#AEBCE0',
    accent: '#C66BFF',
    accentForeground: '#FFFFFF',
    destructive: '#FF6D8A',
    destructiveForeground: '#FFFFFF',
    border: '#45618F',
    input: '#21345D',
  },

  dark: {
    text: '#F4F7FF',
    tint: '#5DE6FF',
    background: '#0B1230',
    foreground: '#F4F7FF',
    card: '#18264A',
    cardForeground: '#F4F7FF',
    primary: '#5DE6FF',
    primaryForeground: '#07101C',
    secondary: '#24365F',
    secondaryForeground: '#D8E1FF',
    muted: '#202F55',
    mutedForeground: '#AEBCE0',
    accent: '#C66BFF',
    accentForeground: '#FFFFFF',
    destructive: '#FF6D8A',
    destructiveForeground: '#FFFFFF',
    border: '#45618F',
    input: '#21345D',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
