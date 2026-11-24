import { ComponentProps } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

type Props = {
  name?: string | null;
  color?: string | null;
  size?: number;
};

export function CategoryIcon({ name, color, size = 24 }: Props) {
  return (
    <MaterialCommunityIcons
      name={(name ?? "help-circle-outline") as IconName}
      size={size}
      color={color ?? "#6B7280"}
    />
  );
}
