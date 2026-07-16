# Architecture guardrails

Current stack: React, Vite, Tailwind CSS, GSAP, Lucide React.

Preferred source layout:

```text
src/
  assets/
  components/
    layout/
    sections/
    ui/
  config/
  hooks/
  services/
  utils/
  styles/
  App.jsx
  main.jsx
```

Content should be separated from JSX. Repeated UI may become reusable components, but avoid fragmentation into trivial files. Preserve section IDs and public behavior. Refactor only when it reduces real maintenance risk.
