// Componente fino sobre ICON_D/svgIcon (index.html:1048-1051) — mesmo
// viewBox, stroke e classe (`icon-svg`), pra reaproveitar as regras de
// tamanho/cor já definidas em app.css.
import { ICON_D, type IconName } from "../lib/icons";

interface IconProps {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 19 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      width={size}
      height={size}
      className="icon-svg"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={ICON_D[name]} />
    </svg>
  );
}
