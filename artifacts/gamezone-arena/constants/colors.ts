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
    background: '#070A13',
    foreground: '#F4F7FF',
    card: '#111629',
    cardForeground: '#F4F7FF',
    primary: '#5DE6FF',
    primaryForeground: '#07101C',
    secondary: '#192139',
    secondaryForeground: '#D8E1FF',
    muted: '#161D32',
    mutedForeground: '#8E99B8',
    accent: '#C66BFF',
    accentForeground: '#FFFFFF',
    destructive: '#FF6D8A',
    destructiveForeground: '#FFFFFF',
    border: '#28314C',
    input: '#1A2138',
  },

  dark: {
    text: '#F4F7FF',
    tint: '#5DE6FF',
    background: '#070A13',
    foreground: '#F4F7FF',
    card: '#111629',
    cardForeground: '#F4F7FF',
    primary: '#5DE6FF',
    primaryForeground: '#07101C',
    secondary: '#192139',
    secondaryForeground: '#D8E1FF',
    muted: '#161D32',
    mutedForeground: '#8E99B8',
    accent: '#C66BFF',
    accentForeground: '#FFFFFF',
    destructive: '#FF6D8A',
    destructiveForeground: '#FFFFFF',
    border: '#28314C',
    input: '#1A2138',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
