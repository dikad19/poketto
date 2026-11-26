import { Image, Text, View } from "react-native";
import { Avatar } from "./Avatar";
import {
  BORDER_HOLE,
  BORDER_HOLE_DEFAULT,
  BORDER_IMAGES,
  levelColor,
} from "../lib/levelAssets";

type Props = {
  avatarKey?: string | null;
  avatarUrl?: string | null;
  name?: string | null;
  level: number; // 1..9, border ditentukan otomatis dari level
  size?: number; // diameter AVATAR (bukan total dengan border)
  showLevel?: boolean;
};

export function AvatarWithBorder({
  avatarKey,
  avatarUrl,
  name,
  level,
  size = 64,
  showLevel = false,
}: Props) {
  const color = levelColor(level);
  const image = BORDER_IMAGES[level];
  const hole = BORDER_HOLE[level] ?? BORDER_HOLE_DEFAULT;

  // Mode gambar: kotak total = avatar / lubang. Mode cadangan: ring tipis.
  const ring = Math.max(2, Math.round(size * 0.05));
  const total = image ? size / hole : size + ring * 2 + 4;
  const chip = Math.round(total * 0.28);

  return (
    <View
      style={{
        width: total,
        height: total,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {image ? (
        <>
          <Avatar
            avatarKey={avatarKey}
            avatarUrl={avatarUrl}
            name={name}
            size={size}
          />
          <Image
            source={image}
            resizeMode="contain"
            pointerEvents="none"
            style={{ position: "absolute", width: total, height: total }}
          />
        </>
      ) : (
        <View
          style={{
            width: total,
            height: total,
            borderRadius: total / 2,
            borderWidth: ring,
            borderColor: color,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Avatar
            avatarKey={avatarKey}
            avatarUrl={avatarUrl}
            name={name}
            size={size}
          />
        </View>
      )}

      {showLevel && (
        <View
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            minWidth: chip,
            height: chip,
            borderRadius: chip / 2,
            backgroundColor: color,
            borderWidth: 2,
            borderColor: "#fff",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 2,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: Math.max(9, chip * 0.5),
              fontWeight: "800",
            }}
          >
            {level}
          </Text>
        </View>
      )}
    </View>
  );
}
