# 🎨 Alchemy Design System

Este documento define as diretrizes de design, padrões visuais e regras de implementação para o projeto Alchemy.

---

## 📐 Fundamentos

### Filosofia de Design

O Alchemy segue uma estética **minimalista e elegante**, inspirada no [Bear App](https://bear.app/), priorizando:

- **Simplicidade** — Interface limpa sem distrações
- **Legibilidade** — Tipografia clara e espaçamento generoso
- **Consistência** — Padrões visuais uniformes em toda a aplicação
- **Performance** — CSS vanilla para máxima performance

---

## 🎨 Cores

### Tokens de Cor Base

```css
:root {
  /* Fundos */
  --color-bg: #fafafa;           /* Fundo principal */
  --color-sidebar: #f0f0f0;       /* Fundo da sidebar */

  /* Texto */
  --color-text: #1a1a1a;          /* Texto principal */
  --color-text-muted: #6b6b6b;    /* Texto secundário */

  /* Bordas e Estados */
  --color-border: #e0e0e0;        /* Bordas gerais */
  --color-accent: #e0e0e0;        /* Elementos de destaque */
  --color-hover: #e8e8e8;         /* Estado hover */
  --color-active: #dcdcdc;        /* Estado ativo/selecionado */

  /* Cor de Destaque (Mage Theme) */
  --color-accent-bg: #64448b;     /* Roxo padrão - cor principal */
  --color-accent-text: #ffffff;   /* Texto sobre accent */
}
```

### Dark Mode

Todas as cores adaptam automaticamente via `[data-theme='dark']`:

```css
[data-theme='dark'] {
  --color-bg: #1e1e1e;
  --color-sidebar: #252525;
  --color-text: #e5e5e5;
  --color-text-muted: #888888;
  --color-border: #3a3a3a;
  --color-hover: #333333;
  --color-active: #404040;
}
```

### Mage Themes (Temas de Cor)

O usuário pode escolher entre diferentes "magos" que alteram a cor de accent:

| Theme       | Cor        | CSS Variable Override      |
|------------|------------|---------------------------|
| `purple`   | `#64448b`  | Padrão (sem override)      |
| `red`      | `#e53935`  | `[data-mage-theme='red']`  |
| `orange`   | `#f57c00`  | `[data-mage-theme='orange']` |
| `dark_gray`| `#90a2aa`  | `[data-mage-theme='dark_gray']` |

---

## ✏️ Tipografia

### Fontes

```css
:root {
  /* Sans-serif (UI e texto geral) */
  --font-sans: "Avenir Next", "Avenir", -apple-system, BlinkMacSystemFont,
               "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

  /* Editor (igual à UI para consistência) */
  --font-editor: "Avenir Next", "Avenir", -apple-system, BlinkMacSystemFont,
                 "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

  /* Código */
  --font-mono: "SF Mono", "Fira Code", "Menlo", monospace;
}
```

### Escala Tipográfica

| Elemento   | Tamanho  | Peso  | Uso                        |
|-----------|---------|-------|----------------------------|
| H1        | 1.8em   | 700   | Títulos principais         |
| H2        | 1.4em   | 600   | Seções                     |
| H3        | 1.2em   | 600   | Subseções                  |
| H4        | 1.1em   | 600   | Sub-subseções              |
| H5        | 1em     | 600   | Menor, cor muted           |
| H6        | 0.9em   | 600   | Menor, uppercase, muted    |
| Body      | 20px    | 400   | Texto do editor            |
| Small     | 14px    | 400   | Previews, descrições       |
| XSmall    | 11-13px | 500   | Datas, labels              |

---

## 📏 Espaçamento

### Variáveis de Layout

```css
:root {
  --sidebar-width: 280px;
}
```

### Convenções de Padding/Margin

| Contexto           | Valor      |
|-------------------|-----------|
| Sidebar padding    | 8-16px    |
| Header height      | 52px      |
| Footer height      | 48px      |
| Editor padding     | 55px 60px 50px 60px |
| Max editor width   | 900px     |
| Border radius SM   | 4-6px     |
| Border radius MD   | 8px       |
| Border radius LG   | 12-16px   |
| Gap padrão         | 8-12px    |

---

## 🧩 Componentes

### Botões

#### Botão de Ícone (Footer/Header)
```css
.footer-btn, .new-note-btn {
  background: transparent;
  border: none;
  padding: 4-6px;
  cursor: pointer;
  color: var(--color-text-muted);
  border-radius: 6px;
  transition: background-color 0.15s ease, color 0.15s ease;
}

/* Hover */
.footer-btn:hover:not(:disabled) {
  background-color: var(--color-hover);
  color: var(--color-text);
}

/* Disabled */
.footer-btn:disabled {
  opacity: 0.3;
  cursor: default;
}
```

#### Botão Modal
```css
.btn-modal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  padding: 0 20px;
  font-size: 14px;
  font-weight: 600;
  height: 44px;
  cursor: pointer;
  transition: all 0.2s;
}

/* Variante Cancel */
.btn-cancel {
  background-color: transparent;
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
}

/* Variante Delete/Primary */
.btn-delete {
  background-color: var(--color-accent-bg);
  color: white;
  border: none;
}
```

#### Botão Especial (Copy Note)
```css
.copy-note-btn {
  background: var(--color-sidebar);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px;
  color: var(--color-text-muted);
  transition: all 0.2s;
}

.copy-note-btn:hover:not(:disabled) {
  background: var(--color-hover);
  color: var(--color-accent-bg);
  border-color: var(--color-accent-bg);
}
```

### Sidebar Item

```css
.sidebar-item {
  display: flex;
  padding: 14px;
  border-radius: 5px;
  cursor: pointer;
  margin-bottom: 6px;
  gap: 12px;
  align-items: stretch;
  transition: background-color 0.1s ease;
}

.sidebar-item:hover {
  background-color: var(--color-hover);
}

.sidebar-item.active {
  background-color: var(--color-active);
  border-right: 5px solid var(--color-accent-bg);
}
```

### Dialog (Modal)

Baseado no Radix UI Dialog:

```css
.DialogOverlay {
  background-color: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  animation: overlayShow 150ms cubic-bezier(0.16, 1, 0.3, 1);
}

.DialogContent {
  background-color: var(--color-bg);
  border-radius: 16px;
  box-shadow: 0 10px 38px -10px rgba(22, 23, 24, 0.35),
              0 10px 20px -15px rgba(22, 23, 24, 0.2);
  padding: 32px;
  max-width: 360px;
  border: 1px solid var(--color-border);
}
```

### Input de Título

```css
.editor-title {
  border: none;
  background: transparent;
  font-size: 20px;
  font-weight: 500;
  color: var(--color-accent-bg);
  opacity: 0.5;
  transition: opacity 0.2s;
}

.editor-title:focus,
.editor-title:hover {
  opacity: 1;
}
```

---

## 🎭 Animações

### Transições Padrão

| Tipo          | Duração | Easing                        | Uso              |
|--------------|---------|-------------------------------|------------------|
| Rápida       | 0.1s    | ease                          | Hover simples    |
| Normal       | 0.15s   | ease                          | Estados UI       |
| Suave        | 0.2s    | ease                          | Transições gerais |
| Sidebar      | 0.3s    | cubic-bezier(0.4, 0, 0.2, 1)  | Slide sidebar    |
| Modal        | 150ms   | cubic-bezier(0.16, 1, 0.3, 1) | Entrada modal    |
| Personalidade| 0.4-0.5s | ease                         | Logo hover       |

### Framer Motion (Sidebar Items)

```jsx
<motion.div
  layout
  initial={{ opacity: 0, y: -10 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, x: -10, transition: { duration: 0.15 } }}
/>
```

### Keyframes

```css
@keyframes overlayShow {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes contentShow {
  from {
    opacity: 0;
    transform: translate(-50%, -48%) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
```

---

## 📄 Editor (TipTap)

### Container

```css
.tiptap-editor .ProseMirror {
  outline: none;
  min-height: 100%;
  font-size: 20px;
  line-height: 1.7;
  color: var(--color-text);
  font-family: var(--font-editor);
}
```

### Elementos de Texto

| Elemento     | Estilo                                       |
|-------------|----------------------------------------------|
| Listas      | `padding-left: 1.5em`                        |
| Blockquote  | `border-left: 3px solid var(--color-accent-bg)` |
| Links       | `color: var(--color-accent-bg)`, underline   |
| HR          | `border-top: 1px solid var(--color-border)`  |

### Código

```css
/* Inline code */
code {
  background: var(--color-hover);
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 0.9em;
  color: var(--color-accent-bg);
}

/* Code block */
pre {
  background: var(--color-sidebar);
  padding: 1rem;
  border-radius: 8px;
  font-family: var(--font-mono);
  border: 1px solid var(--color-border);
}
```

### Syntax Highlighting (Lowlight)

Cores baseadas no One Light Theme:

| Token          | Cor        |
|---------------|-----------|
| Comment       | `#a0a1a7`  |
| Keyword       | `#a626a4`  |
| String        | `#50a14f`  |
| Number        | `#986801`  |
| Function      | `#4078f2`  |
| Class         | `#c18401`  |

---

## 🖼️ Ícones

**Biblioteca:** [Lucide React](https://lucide.dev/)

**Tamanhos padrão:**
- Botões pequenos: `16px`
- Botões normais: `20-22px`
- Grande/Destaque: `40px+`

**Ícones utilizados:**
- `Moon` / `Sun` — Toggle tema
- `SquarePen` — Nova nota
- `PanelLeftClose` — Fechar sidebar
- `Trash2` — Deletar nota
- `HelpCircle` — Ajuda
- `Copy` / `Check` — Copiar nota

---

## 🧱 Estrutura de Componentes

```
src/
├── App.jsx                 # Layout principal
├── App.css                 # Design system completo
├── components/
│   ├── Sidebar.jsx         # Navegação lateral
│   ├── ContentArea.jsx     # Área de conteúdo
│   ├── Editor.jsx          # Editor TipTap
│   ├── MageSwitcher.jsx    # Seletor de tema/mago
│   ├── CopyNoteButton.jsx  # Botão copiar nota
│   ├── DeleteNoteDialog.jsx # Modal de confirmação
│   └── MarkdownHelp.jsx    # Modal de ajuda
├── hooks/                  # Custom hooks
└── utils/                  # Utilitários
```

---

## 📱 Responsividade

### Regiões de Drag (Tauri)

```css
.drag-region {
  -webkit-app-region: drag;
}

.content-drag-region {
  position: absolute;
  top: 0;
  left: 0;
  right: 180px;  /* Espaço para botões */
  height: 50px;
  -webkit-app-region: drag;
}
```

### Scrollbars

Scrollbars são ocultas para uma aparência mais limpa:

```css
.tiptap-editor {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.tiptap-editor::-webkit-scrollbar {
  display: none;
}
```

---

## ⚡ Regras de Implementação

### CSS

1. **Use apenas CSS Variables** — Nunca hardcode cores
2. **Mobile-first não se aplica** — App é desktop-only (Tauri)
3. **BEM opcional** — Preferimos classes simples e descritivas
4. **Outline: none** — Sempre remover para elementos focáveis
5. **Transições** — Sempre incluir para estados interativos

### React

1. **Componentes funcionais** — Sempre usar hooks
2. **Lucide para ícones** — Consistência na iconografia
3. **Framer Motion** — Para animações de lista
4. **Radix UI** — Para componentes acessíveis (Dialog)

### Nomenclatura

| Tipo        | Padrão           | Exemplo                |
|------------|-----------------|------------------------|
| Componente  | PascalCase       | `ContentArea.jsx`      |
| CSS class   | kebab-case       | `.sidebar-item`        |
| CSS variant | BEM modifier     | `.sidebar-item.active` |
| Hook        | camelCase        | `useDocuments.js`      |

---

## 🎯 Checklist de Novo Componente

- [ ] Usa variáveis CSS para cores
- [ ] Transições em estados hover/focus
- [ ] Remove outline padrão do focus
- [ ] Segue espaçamento do sistema
- [ ] Ícones via Lucide
- [ ] Animações via Framer Motion (se lista)
- [ ] Compatível com dark mode
- [ ] Compatível com Mage themes

---

> **Nota:** Este design system é vivo e deve evoluir conforme o projeto cresce.
> Sempre consulte `App.css` como fonte de verdade para implementação.
