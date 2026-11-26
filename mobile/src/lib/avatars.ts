import type { ImageSourcePropType } from "react-native";

export const AVATAR_SOURCES: Record<string, ImageSourcePropType> = {
  avatar_01: require("../../assets/avatars/avatar_01.png"),
  avatar_02: require("../../assets/avatars/avatar_02.png"),
  avatar_03: require("../../assets/avatars/avatar_03.png"),
  avatar_04: require("../../assets/avatars/avatar_04.png"),
  avatar_05: require("../../assets/avatars/avatar_05.png"),
  avatar_06: require("../../assets/avatars/avatar_06.png"),
  avatar_07: require("../../assets/avatars/avatar_07.png"),
  avatar_08: require("../../assets/avatars/avatar_08.png"),
  avatar_09: require("../../assets/avatars/avatar_09.png"),
  avatar_10: require("../../assets/avatars/avatar_10.png"),
};

export const AVATAR_KEYS = Object.keys(AVATAR_SOURCES);
