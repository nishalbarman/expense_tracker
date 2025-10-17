import { themeColor } from "@/themeColors";
import LinearGradient from "react-native-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

function CusStatusBar() {
  const { isDarkMode } = useSelector((state) => state.darkModePref);
  const theme = useSelector((state) => state.theme);
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={
        isDarkMode
          ? ["#1c1c1c", "#303030"]
          : themeColor[`${theme}Theme`]?.headerBackground || "blue"
      }
      style={{
        height: insets.top,
      }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}></LinearGradient>
  );
}

export default CusStatusBar;
