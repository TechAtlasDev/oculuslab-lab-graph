# Frontend - Plataforma de Gestión y Navegación de Grafos

Este proyecto corresponde al frontend de la plataforma interactiva para la creación, gestión, análisis y navegación de grafos (Laboratorio 3).

---

## Sistema de Diseño Estricto (shadcn/ui)

Para garantizar consistencia visual, mantenibilidad y rapidez en el desarrollo, la interfaz debe regirse **estrictamente** por las siguientes directrices de diseño:

### 1. Basado Exclusivamente en `shadcn/ui` e Instalación de Componentes
* **Auditoría e Identificación Previa**: Antes de crear o implementar cualquier componente visual o elemento UI, es obligatorio verificar si ya existe en el proyecto (`src/components/ui/`) o en el catálogo oficial de **shadcn/ui** (Button, Dialog, Card, Sheet, Select, Dropdown, Table, Input, Tooltip, etc.).
* **Instalación Oficial via CLI**: Si se requiere un componente que aún no está presente en el proyecto, **debe instalarse utilizando la CLI oficial de shadcn/ui**:
  ```bash
  npx shadcn@latest add <component-name>
  ```
* **Prohibición de Componentes Ad-Hoc**: Queda strictly prohibido crear componentes visuales genéricos desde cero si `shadcn/ui` provee una solución.

### 2. Respeto a los Componentes Base de `shadcn/ui`
* **No Modificar los Componentes Base**: Los componentes de `shadcn/ui` instalados en `src/components/ui/` **no se deben modificar internamente** alterando sus paddings, margins, gaps o tamaños predeterminados salvo que sea parte de una variante global del sistema de diseño.
* **Consistencia de Variante**: Utilizar las props oficiales del componente (`variant="outline"`, `size="lg"`, etc.) en lugar de sobreescribir estilos con clases CSS inline o utilidades conflictivas.

### 3. Prohibición de Emojis e Integración de Iconos (Phosphor Icons)
* **Emojis Prohibidos**: Queda **estrictamente prohibido el uso de emojis** en la interfaz de usuario, textos del sistema o componentes visuales.
* **Iconografía Oficial con Phosphor Icons**: En su lugar, se deben utilizar **única y exclusivamente** los iconos de **Phosphor Icons** (`@phosphor-icons/react`).

### 4. Prohibición de Tamaños Pequeños (text-xs, text-sm, gap-xs, gap-sm)
* **Tamaños Mínimos Permitidos**: Queda **completamente prohibido el uso de tamaños pequeños o reducidos** como `text-xs`, `text-sm`, `gap-xs`, `gap-sm`, `p-1`, `gap-1`, etc.
* **Legibilidad y Dimensión Estándar**: Todo texto y elemento debe partir de al menos `text-base` en adelante (`text-base`, `text-lg`, `text-xl`, etc.) y utilizar espaciados cómodos (`gap-4`, `p-4`, `m-4`, etc.) para asegurar máxima legibilidad y presencia visual.

### 5. Prohibición Absoluta de Colores Hardcodeados y Valores Arbitrarios
* **Colores Semánticos del Tema**: Utilizar **únicamente las clases de color semánticas** de `shadcn/ui` (`bg-background`, `text-foreground`, `bg-primary`, `text-primary-foreground`, `bg-muted`, `text-muted-foreground`, `border-border`, etc.).
* **Prohibidos Colores Hex/RGB Hardcodeados**: Queda **estrictamente prohibido el uso de colores hardcodeados** en clases Tailwind o estilos inline:
  * ❌ `bg-[#1a1a1a]`, `text-[#ff0000]`, `border-[#cccccc]`
  * ❌ `style={{ color: '#fff' }}`, `style={{ backgroundColor: 'rgb(0,0,0)' }}`
* **Prohibido el Hardcodeo Arbitrario (`[...]`)**: Queda **estrictamente prohibido** el uso de clases con valores arbitrarios entre corchetes:
  * ❌ `text-[10px]`, `text-[13px]`
  * ❌ `gap-[10px]`, `gap-[7px]`
  * ❌ `p-[14px]`, `m-[9px]`
  * ❌ `w-[327px]`, `h-[45px]`

---

## Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Agregar un nuevo componente de shadcn/ui
npx shadcn@latest add <component-name>

# Iniciar servidor de desarrollo
npm run dev

# Ejecutar verificación de tipos y build de producción
npm run build

# Ejecutar Linter
npm run lint

# Auditando cumplimiento del Sistema de Diseño (shadcn/ui)
npm run check:design-system
```
