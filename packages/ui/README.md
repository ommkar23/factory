# @factory/ui

Source-based, private Factory design-system primitives. Import the public stylesheet exactly once at an application root:

```ts
import "@factory/ui/styles.css";
```

Wrap the application root in `factory-ui-root`. Components never import or inject global CSS. They use collision-resistant `factory-*` classes and semantic `--factory-*` variables only.

## Theming

Override semantic variables at `:root` or an application wrapper; do not override component declarations:

```css
.product-shell {
  --factory-color-action-primary: #006f5f;
  --factory-color-action-primary-hover: #005c4f;
  --factory-color-focus-ring: #006f5f;
}
```

## Compatibility

`StatusMessage` remains exported as a deprecated compatibility wrapper around `Alert`; migrate new titled updates to `Alert`.

## Accessibility and review

Components use native controls and landmarks, visible `:focus-visible`, reduced-motion support, responsive breakpoints (base, 48rem, 64rem), and WCAG AA documented token pairs. Storybook contains token, component-state, theme-override, responsive-composite, and human-approval documentation.
