# Caryn Ops - Project Setup

## What's Included

This project has been initialized with the following stack:

### Core Technologies
- **Vite** - Fast build tool and development server
- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework

### UI & Styling
- **Shadcn UI** - Component system with theming support
- **Lucide React** - Beautiful & consistent icon library
- **clsx** - Utility for constructing className strings
- **tailwind-merge** - Merge Tailwind CSS classes without conflicts

## Project Structure

```
caryn-ops/
├── src/
│   ├── components/
│   │   └── ui/           # Shadcn UI components
│   │       └── button.tsx
│   ├── lib/
│   │   └── utils.ts      # Utility functions (cn helper)
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css         # Tailwind + theme variables
├── components.json       # Shadcn UI configuration
├── tailwind.config.js    # Tailwind configuration with theme
├── vite.config.ts        # Vite config with path aliases
└── tsconfig.app.json     # TypeScript config with @ alias
```

## Key Features

### Path Aliases
Import components using the `@/` alias:
```typescript
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
```

### Theme System
- CSS variables for colors (light/dark mode support)
- Customizable through [index.css](src/index.css)
- Based on HSL color space for easy theming

### Utility Function
The `cn()` helper combines `clsx` and `tailwind-merge`:
```typescript
import { cn } from '@/lib/utils'

<div className={cn("base-class", condition && "conditional-class")} />
```

## Getting Started

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Adding Shadcn UI Components

You can now add Shadcn UI components manually to the `src/components/ui/` directory or use the Shadcn CLI:

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
# etc.
```

The components will be automatically configured to work with your setup.

## Customization

### Colors
Edit CSS variables in [src/index.css](src/index.css) to change the theme colors.

### Tailwind Configuration
Modify [tailwind.config.js](tailwind.config.js) to add custom utilities, extend the theme, or add plugins.

### TypeScript Configuration
Path aliases and compiler options can be adjusted in [tsconfig.app.json](tsconfig.app.json).

## Resources

- [Vite Documentation](https://vite.dev)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Shadcn UI](https://ui.shadcn.com)
- [Lucide Icons](https://lucide.dev)
