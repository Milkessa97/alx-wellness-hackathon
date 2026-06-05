// Simulation of next/font/google to support standard layouts in Vite SPA environments
export function Lora(options?: any) {
  return {
    variable: 'font-display',
    className: 'font-display',
    style: {
      fontFamily: "'Lora', Georgia, serif",
    },
  };
}

export function DM_Sans(options?: any) {
  return {
    variable: 'font-body',
    className: 'font-body',
    style: {
      fontFamily: "'DM Sans', system-ui, sans-serif",
    },
  };
}
